import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "@jafps/plugin-schema";
import fastify from "fastify";
import { Type } from "typebox";
import { SchemaController } from "../schema-controller.js";

describe("SchemaSerializer", () => {
  it("should serialize", async () => {
    const app = await fastify();
    const serializer = new SchemaController(app);
    const schema = Type.Object({ success: Type.Literal(true) });
    const serializeFn = serializer.serialize(schema);
    const json = serializeFn({ success: true }, 0);
    const res = JSON.parse(json);
    assert.equal(res.success, true);
  });

  it("should serialize without additional values", async () => {
    const app = await fastify();
    const serializer = new SchemaController(app);
    const schema = Type.Object({ success: Type.Literal(true) });
    const serializeFn = serializer.serialize(schema);
    const json = serializeFn({ other: true, success: true } as any, 0);
    const res = JSON.parse(json);
    assert.ok(!res.other);
  });

  it("should serialize with default value", async () => {
    const app = await fastify();
    const serializer = new SchemaController(app);
    const schema = Type.Object({ success: Type.Boolean({ default: true }) });
    const serializeFn = serializer.serialize(schema);
    const json = serializeFn({ } as any, 0);
    const res = JSON.parse(json);
    assert.equal(res.success, true);
  });

  it("should not serialize without default value", async () => {
    const app = await fastify();
    const serializer = new SchemaController(app, { useDefault: false });
    const schema = Type.Object({ success: Type.Boolean() });
    const serializeFn = serializer.serialize(schema);
    assert.throws(() => serializeFn({ } as any, 0));
  });

  it("should serialize with references", async () => {
    const app = await fastify();
    const refSchema = Type.Object({ success: Type.Literal(true) }, { $id: "result" });
    app.addSchema(refSchema);
    const serializer = new SchemaController(app);
    const schema = Type.Ref("result");
    const serializeFn = serializer.serialize(schema);
    const json = serializeFn({ success: true }, 0);
    const res = JSON.parse(json);
    assert.equal(res.success, true);
  });

  it("should not serialize without references", async () => {
    const app = await fastify();
    const refSchema = Type.Object({ success: Type.Literal(true) }, { $id: "result" });
    app.addSchema(refSchema);
    const serializer = new SchemaController(app, { useReferences: false });
    const schema = Type.Ref("result");
    const serializeFn = serializer.serialize(schema);
    assert.throws(() => serializeFn({ success: true }, 0));
  });

  it("should serialize with typebox module", async () => {
    const app = await fastify();
    const serializer = new SchemaController(app);
    const module = Type.Module({
      a: Type.Object({ success: Type.Literal(true) }),
      b: Type.Ref("a")
    });
    const serializeFn = serializer.serialize(module.b);
    const json = serializeFn({ success: true }, 0);
    const res = JSON.parse(json);
    assert.equal(res.success, true);
  });

  it("should serialize with typebox codec", async () => {
    const app = await fastify();
    const serializer = new SchemaController(app);
    const schema = Type.Object({
      success: Type.Codec(Type.String())
        .Decode(v => v === "true")
        .Encode(v => `${v}`)
    });
    const serializeFn = serializer.serialize(schema);
    const json = serializeFn({ success: true }, 0);
    const res = JSON.parse(json);
    assert.equal(res.success, "true");
  });

  it("should deserialize", async () => {
    const app = await fastify();
    const serializer = new SchemaController(app);
    const schema = Type.Object({ success: Type.Literal(true) });
    const serializeFn = serializer.deserialize(schema);
    const json = serializeFn({ success: true });
    assert.ok("value" in json);
    const res = json.value as any;
    assert.equal(res.success, true);
  });

  it("should deserialize without additional values", async () => {
    const app = await fastify();
    const serializer = new SchemaController(app);
    const schema = Type.Object({ success: Type.Literal(true) });
    const serializeFn = serializer.deserialize(schema);
    const json = serializeFn({ other: true, success: true });
    assert.ok("value" in json);
    const res = json.value as any;
    assert.ok(!res.other);
  });

  it("should deserialize with default value", async () => {
    const app = await fastify();
    const serializer = new SchemaController(app);
    const schema = Type.Object({ success: Type.Boolean({ default: true }) });
    const serializeFn = serializer.deserialize(schema);
    const json = serializeFn({ });
    assert.ok("value" in json);
    const res = json.value as any;
    assert.equal(res.success, true);
  });

  it("should not deserialize without default value", async () => {
    const app = await fastify();
    const serializer = new SchemaController(app, { useDefault: false });
    const schema = Type.Object({ success: Type.Boolean() });
    const serializeFn = serializer.deserialize(schema);
    const json = serializeFn({ });
    assert.ok("error" in json);
    const res = json.error;
    assert.ok(res instanceof ValidationError);
  });

  it("should deserialize with references", async () => {
    const app = await fastify();
    const refSchema = Type.Object({ success: Type.Literal(true) }, { $id: "result" });
    app.addSchema(refSchema);
    const serializer = new SchemaController(app);
    const schema = Type.Ref("result");
    const serializeFn = serializer.deserialize(schema);
    const json = serializeFn({ success: true });
    assert.ok("value" in json);
    const res = json.value as any;
    assert.equal(res.success, true);
  });

  it("should not deserialize with references", async () => {
    const app = await fastify();
    const refSchema = Type.Object({ success: Type.Literal(true) }, { $id: "result" });
    app.addSchema(refSchema);
    const serializer = new SchemaController(app, { useReferences: false });
    const schema = Type.Ref("result");
    const serializeFn = serializer.deserialize(schema);
    const json = serializeFn({ success: true });
    assert.ok("error" in json);
    const res = json.error;
    assert.ok(res instanceof ValidationError);
  });

  it("should deserialize with typebox module", async () => {
    const app = await fastify();
    const serializer = new SchemaController(app);
    const module = Type.Module({
      a: Type.Object({ success: Type.Literal(true) }),
      b: Type.Ref("a")
    });
    const serializeFn = serializer.deserialize({ method: "GET", schema: module.b, url: "/" });
    const json = serializeFn({ success: true });
    assert.ok("value" in json);
    const res = json.value as any;
    assert.equal(res.success, true);
  });

  it("should deserialize with typebox codec", async () => {
    const app = await fastify();
    const serializer = new SchemaController(app);
    const schema = Type.Object({
      success: Type.Codec(Type.String())
        .Decode(v => v === "true")
        .Encode(v => `${v}`)
    });
    const serializeFn = serializer.deserialize(schema);
    const json = serializeFn({ success: "true" });
    assert.ok("value" in json);
    const res = json.value as any;
    assert.equal(res.success, true);
  });
});
