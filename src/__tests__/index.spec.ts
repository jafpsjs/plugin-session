import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fastify from "fastify";
import plugin from "../index.js";

describe("@jafps/plugin-template", () => {
  describe("hello", () => {
    it("should return value", async () => {
      const value = "world";
      const app = await fastify();
      await app.register(plugin, { value });
      const result = app.hello();
      assert.equal(result, value);
    });
  });
});
