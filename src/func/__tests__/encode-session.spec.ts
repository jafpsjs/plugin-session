import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import cookiePlugin from "@fastify/cookie";
import fastify from "fastify";
import sodium from "sodium-native";
import { Type } from "typebox";
import { Session } from "#session";
import plugin from "../../index.js";
import { encodeSession } from "../encode-session.js";
import type { FastifyInstance } from "fastify";

export const schema = Type.Object({ a: Type.Number({ default: 0 }) });

const salt = Buffer.alloc(sodium.crypto_pwhash_SALTBYTES);

describe("encodeSession", () => {
  let app: FastifyInstance;
  before(async () => {
    app = await fastify();
    await app.register(cookiePlugin, {
      parseOptions: {
        httpOnly: true,
        path: "/",
        sameSite: "strict",
        signed: true
      },
      secret: salt
    });
    await app.register(plugin, {
      session: {
        key: [],
        schema
      },
      session2: {
        key: [],
        schema: Type.Object({ b: Type.Options(Type.String(), { default: "a" }) })
      }
    });
  });

  it("should throw on unknown sessionName", async () => {
    assert.throws(() => {
      encodeSession(app, "a" as any, new Session({ a: 1 }));
    });
  });

  it("should throw on empty keys", async () => {
    assert.throws(() => {
      encodeSession(app, "session" as any, new Session({ a: 1 }));
    });
  });
});
