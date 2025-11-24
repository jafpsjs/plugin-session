import fp from "fastify-plugin";
import { objectEntries } from "ts-extras";
import { onRequest, onSend } from "#hook";
import { sessionOptionsSymbol, sessionSchemaSymbol } from "#symbol";
import { createSession } from "./create-session.js";
import { SchemaController } from "./schema-controller.js";
import type { CookieSerializeOptions } from "@fastify/cookie";
import type { FastifySessions } from "fastify";
import type { Duration } from "luxon";
import type { TSchema } from "typebox";
import type { CreateKeysOptions } from "./create-session-keys.js";
import type { SessionOptions } from "./create-session.js";
import type { Session } from "./session.js";

/* node:coverage disable */
export type SessionOption = {
  /**
   * Cookie options for creating session cookie.
   *
   * `httpOnly`,`signed` and `sameSite` are defaulted to true.
   */
  cookie?: CookieSerializeOptions;

  /**
   * Default to `sessionName`.
   */
  cookieName?: string;

  /**
   * Default to 1 day.
   */
  expiry?: Duration<true>;

  /**
   * JSON schema for session.
   */
  schema: TSchema;
} & CreateKeysOptions;

export type SessionPluginOptions = {
  [T in keyof FastifySessions]: SessionOption
};

/* node:coverage enable */

export const name = "@jafps/plugin-session";

export default fp<SessionPluginOptions>(
  async (app, opts) => {
    app.decorate(sessionOptionsSymbol, {} as any);
    app.decorate(sessionSchemaSymbol, new SchemaController(app));
    for (const [sessionName, opt] of objectEntries(opts)) {
      app[sessionOptionsSymbol][sessionName] = await createSession({ ...opt, sessionName });
    }
    app.decorateRequest("sessions");
    app.addHook("onRequest", onRequest);
    app.addHook("onSend", onSend);
  },
  {
    decorators: {},
    dependencies: ["@fastify/cookie"],
    fastify: "5.x",
    name
  }
);

/* node:coverage disable */
declare module "fastify" {
  interface FastifyInstance {
    [sessionOptionsSymbol]: Record<keyof FastifySessions, SessionOptions<keyof FastifySessions>>;
    [sessionSchemaSymbol]: SchemaController;
  }

  interface FastifyRequest {
    sessions: {
      [T in keyof FastifySessions]: Session<FastifySessions[T]>;
    };
  }

  interface FastifySessions {
  }
}

/* node:coverage enable */
