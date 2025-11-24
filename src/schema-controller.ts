import { ValidationError } from "@jafps/plugin-schema";
import { Compile } from "typebox/compile";
import { Clone } from "typebox/value";
import { timestampKey } from "#session";
import type { FastifyInstance } from "fastify";
import type { StaticDecode, TProperties, TSchema } from "typebox";

export type SchemaControllerOptions = {
  useDefault?: boolean;
  useReferences?: boolean;
};

export class SchemaController {
  private readonly app: FastifyInstance;
  private readonly useDefault: boolean;
  private readonly useReferences: boolean;

  public constructor(app: FastifyInstance, opts: SchemaControllerOptions = {}) {
    const { useDefault = true, useReferences = true } = opts;
    this.app = app;
    this.useDefault = useDefault;
    this.useReferences = useReferences;
  }

  public deserialize<T extends TSchema>(schema: T): (input: unknown) => { error: Error } | { value: StaticDecode<T> } {
    const ctx = (this.useReferences ? this.app.getSchemas() : {}) as TProperties;
    const compiledSchema = Compile(ctx, schema);
    return input => {
      const value = this.useDefault ? compiledSchema.Default(input) : input;
      this.app.log.debug({ input, schema, useDefault: this.useDefault, value }, "Validate request");
      try {
        if (!compiledSchema.Check(value)) {
          throw new Error("Invalid values");
        }
        return { value: compiledSchema.Clean(compiledSchema.Decode(value)) as StaticDecode<T> };
      } catch (_e) {
        const errors = [...compiledSchema.Errors(value)];
        return { error: new ValidationError(errors) };
      }
    };
  }

  public serialize<T extends TSchema>(schema: T): (data: StaticDecode<T>, timestamp: number) => string {
    const ctx = (this.useReferences ? this.app.getSchemas() : {}) as TProperties;
    const compiledSchema = Compile(ctx, schema);
    return (data, timestamp) => {
      let value: unknown;
      try {
        const cleaned = compiledSchema.Clean(Clone(data));
        const defaultData = this.useDefault ? compiledSchema.Default(cleaned) : cleaned;
        value = compiledSchema.Encode(defaultData);
      } catch (_err) {
        const errors = [...compiledSchema.Errors(value)];
        const err = new ValidationError(errors);
        this.app.log.error({ err }, "Cannot serialize response to match response schema");
        throw err;
      }
      this.app.log.debug({ input: data, schema, useDefault: this.useDefault, value }, "Serialize response");
      (value as any)[timestampKey] = timestamp;
      return JSON.stringify(value);
    };
  }
}
