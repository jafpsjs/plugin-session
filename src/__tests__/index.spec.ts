import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import cookiePlugin from "@fastify/cookie";
import libCookie from "cookie";
import fastify from "fastify";
import setCookie from "set-cookie-parser";
import sodium from "sodium-native";
import { Type } from "typebox";
import plugin from "../index.js";
import type { FastifyInstance } from "fastify";

export const schema = Type.Object({ a: Type.Number({ default: 0 }) });

declare module "fastify" {
  interface FastifySessions {
    session: { a: number };
    session2: { b: string };
  }
}

const salt = Buffer.alloc(sodium.crypto_pwhash_SALTBYTES);

describe("@jafps/plugin-session", () => {
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
        salt,
        schema,
        secret: "a".repeat(32)
      },
      session2: {
        salt,
        schema: Type.Object({ b: Type.Options(Type.String(), { default: "a" }) }),
        secret: "a".repeat(32)
      }
    });
    app.post("/session", { }, async (req, res) => {
      req.sessions.session.set("a", 1);
      return res.send({ data: {}, success: true });
    });
    app.get("/session", { }, async (req, res) => {
      const data = req.sessions.session.data();
      return res.send({ data, success: true });
    });
    app.post("/invalid-session", { }, async (req, res) => {
      req.sessions.session.regenerate();
      return res.send({ data: {}, success: true });
    });
    app.delete("/session", { }, async (req, res) => {
      req.sessions.session.delete();
      return res.send({ data: {}, success: true });
    });
  });

  it("should return default session", async () => {
    const res = await app.inject({
      method: "get",
      path: "/session"
    });
    const json = await res.json();
    assert.equal(res.statusCode, 200);
    assert.equal(json.success, true);
    assert.equal(json.data.a, 0);
  });

  it("should return default session", async () => {
    const res = await app.inject({
      method: "post",
      path: "/session"
    });
    const json = await res.json();
    assert.equal(res.statusCode, 200);
    assert.equal(json.success, true);
    const cookieHeader = res.headers["set-cookie"];
    assert.ok(cookieHeader);
    const cookies = setCookie.parse(cookieHeader);
    const res2 = await app.inject({
      headers: { cookie: cookies.map(cookie => libCookie.serialize(cookie.name, cookie.value)) },
      method: "get",
      path: "/session"
    });
    const json2 = await res2.json();
    assert.equal(res2.statusCode, 200);
    assert.equal(json2.success, true);
    assert.equal(json2.data.a, 1);
  });

  it("should return default session", async () => {
    const res = await app.inject({
      method: "post",
      path: "/invalid-session"
    });
    const json = await res.json();
    assert.equal(res.statusCode, 200);
    assert.equal(json.success, true);
  });

  it("should return default session", async () => {
    const res = await app.inject({
      method: "delete",
      path: "/session"
    });
    const json = await res.json();
    assert.equal(res.statusCode, 200);
    assert.equal(json.success, true);
    const cookieHeader = res.headers["set-cookie"];
    assert.ok(cookieHeader);
    const cookies = setCookie.parse(cookieHeader);
    assert.equal(cookies.find(c => c.name === "session")?.maxAge, 0);
  });
});
