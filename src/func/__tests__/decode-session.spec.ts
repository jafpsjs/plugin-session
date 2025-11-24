import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import cookiePlugin from "@fastify/cookie";
import fastify from "fastify";
import sodium from "sodium-native";
import { Type } from "typebox";
import { decodeSession, encodeSession } from "#func";
import { Session, timestampKey } from "#session";
import { sessionOptionsSymbol } from "#symbol";
import plugin from "../../index.js";
import type { FastifyInstance } from "fastify";

export const schema = Type.Object({ a: Type.Number({ default: 0 }) });

const salt = Buffer.alloc(sodium.crypto_pwhash_SALTBYTES);

function genNonce(): Buffer {
  const buf = Buffer.allocUnsafe(sodium.crypto_secretbox_NONCEBYTES);
  sodium.randombytes_buf(buf);
  return buf;
}

describe("decodeSession", () => {
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
        schema: Type.Object({ b: Type.String() }),
        secret: "a".repeat(32)
      }
    });
  });

  it("should create session", async () => {
    const str = encodeSession(app, "session", new Session({ a: 1 }));
    const session = decodeSession(app, "session", str);
    const data = session.data();
    assert.equal(data.a, 1);
  });

  it("should throw on unknown sessionName", async () => {
    assert.throws(() => {
      decodeSession(app, "a" as any, "");
    });
  });

  it("should create default session if invalid cookie", async () => {
    const session = decodeSession(app, "session", "a;");
    const data = session.data();
    assert.equal(data.a, 0);
  });

  it("should create default session if invalid cipher", async () => {
    const cipher = Buffer.from("a").toString("base64");
    const nonce = genNonce().toString("base64");
    const session = decodeSession(app, "session", `${cipher};${nonce}`);
    const data = session.data();
    assert.equal(data.a, 0);
  });

  it("should create default session if invalid nonce", async () => {
    const cipher = Buffer.from("a").toString("base64");
    const nonce = genNonce().toString("base64");
    const session = decodeSession(app, "session", `${nonce};${cipher}`);
    const data = session.data();
    assert.equal(data.a, 0);
  });

  it("should create default session if decode fail", async () => {
    const nonce = genNonce().toString("base64");
    const session = decodeSession(app, "session", `${nonce};${nonce}`);
    const data = session.data();
    assert.equal(data.a, 0);
  });

  it("should create default session if missing timestamp", async () => {
    const session = new Session({ a: 1 });
    const nonce = genNonce();
    const jsonString = JSON.stringify(session.data());
    const msg = Buffer.from(jsonString);
    const cipher = Buffer.allocUnsafe(msg.length + sodium.crypto_secretbox_MACBYTES);
    assert.ok(app[sessionOptionsSymbol].session.keys[0]);
    sodium.crypto_secretbox_easy(cipher, msg, nonce, app[sessionOptionsSymbol].session.keys[0]);
    const session2 = decodeSession(app, "session", `${cipher.toString("base64")};${nonce.toString("base64")}`);
    const data = session2.data();
    assert.equal(data.a, 0);
  });

  it("should create default session if invalid session", async () => {
    const session = new Session({ a: "1" });
    const nonce = genNonce();
    const jsonString = JSON.stringify({ ...session.data(), [timestampKey]: Date.now() + 9999 });
    const msg = Buffer.from(jsonString);
    const cipher = Buffer.allocUnsafe(msg.length + sodium.crypto_secretbox_MACBYTES);
    assert.ok(app[sessionOptionsSymbol].session.keys[0]);
    sodium.crypto_secretbox_easy(cipher, msg, nonce, app[sessionOptionsSymbol].session.keys[0]);
    const session2 = decodeSession(app, "session", `${cipher.toString("base64")};${nonce.toString("base64")}`);
    const data = session2.data();
    assert.equal(data.a, 0);
  });

  it("should create default session if expired", async () => {
    const str = encodeSession(app, "session", new Session({ a: 1 }, 1));
    const session = decodeSession(app, "session", str);
    const data = session.data();
    assert.equal(data.a, 0);
  });

  it("should throw if cannot create default session", async () => {
    assert.throws(() => {
      decodeSession(app, "session2", "str");
    });
  });
});
