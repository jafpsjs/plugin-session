import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sodium from "sodium-native";
import { createSessionKeys } from "../create-session-keys.js";

describe("createSessionKeys", () => {
  it("should create keys from secret and salt", async () => {
    const keys = await createSessionKeys({
      salt: "a".repeat(sodium.crypto_pwhash_SALTBYTES),
      secret: "a".repeat(32)
    });
    assert.ok(Array.isArray(keys));
    assert.equal(keys.length, 1);
    assert.ok(Buffer.isBuffer(keys[0]));
  });

  it("should create keys from base64 key", async () => {
    const key = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES);
    sodium.randombytes_buf(key);
    const keys = await createSessionKeys({ key: key.toString("base64") });
    assert.ok(Array.isArray(keys));
    assert.equal(keys.length, 1);
    assert.ok(Buffer.isBuffer(keys[0]));
  });

  it("should create keys from base64 keys", async () => {
    const key = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES);
    sodium.randombytes_buf(key);
    const keys = await createSessionKeys({ key: [key.toString("base64")] });
    assert.ok(Array.isArray(keys));
    assert.equal(keys.length, 1);
    assert.ok(Buffer.isBuffer(keys[0]));
  });

  it("should create keys from buffer key", async () => {
    const key = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES);
    sodium.randombytes_buf(key);
    const keys = await createSessionKeys({ key });
    assert.ok(Array.isArray(keys));
    assert.equal(keys.length, 1);
    assert.ok(Buffer.isBuffer(keys[0]));
  });

  it("should create keys from buffer keys", async () => {
    const key = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES);
    sodium.randombytes_buf(key);
    const keys = await createSessionKeys({ key: [key] });
    assert.ok(Array.isArray(keys));
    assert.equal(keys.length, 1);
    assert.ok(Buffer.isBuffer(keys[0]));
  });


  it("should throw if secret length < 32", async () => {
    assert.rejects(async () => {
      await createSessionKeys({
        salt: "a".repeat(sodium.crypto_pwhash_SALTBYTES),
        secret: "a".repeat(30)
      });
    });
  });

  it(`should throw if salt length != ${sodium.crypto_pwhash_SALTBYTES}`, async () => {
    assert.rejects(async () => {
      await createSessionKeys({
        salt: "a".repeat(sodium.crypto_pwhash_SALTBYTES - 1),
        secret: "a".repeat(32)
      });
    });
  });

  it(`should throw if key length != ${sodium.crypto_secretbox_KEYBYTES}`, async () => {
    const key = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES - 1);
    sodium.randombytes_buf(key);
    assert.rejects(async () => {
      await createSessionKeys({ key: key.toString("base64") });
    });
  });

  it("should throw if key is not Buffer or string", async () => {
    assert.rejects(async () => {
      await createSessionKeys({ key: 1 as any });
    });
  });
});
