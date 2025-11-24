import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Session, timestampKey } from "../session.js";


describe("Session", () => {
  it("should create timestamp", async () => {
    const session = new Session<{ a: number }>({ a: 1 });
    assert.ok(session.lastUpdated());
  });

  it("should accept timestamp", async () => {
    const session = new Session<{ a: number }>({ a: 1 }, 1);
    assert.equal(session.lastUpdated(), 1);
  });

  it("should get data", async () => {
    const session = new Session<{ a: number }>({ a: 1 });
    assert.equal(Object.keys(session.data()).length, 1);
    assert.equal(session.data().a, 1);
  });

  it("should get value", async () => {
    const session = new Session<{ a: number }>({ a: 1 });
    assert.equal(session.get("a"), 1);
  });

  it("should set value", async () => {
    const session = new Session<{ a: number }>({ a: 1 });
    session.set("a", 2);
    assert.equal(session.get("a"), 2);
  });

  it("should change after set value", async () => {
    const session = new Session<{ a: number }>({ a: 1 });
    session.set("a", 2);
    assert.equal(session.changed, true);
  });

  it("should not change if not set value", async () => {
    const session = new Session<{ a: number }>({ a: 1 });
    const lastUpdated = session.lastUpdated();
    assert.equal(session.changed, false);
    assert.equal(session.lastUpdated() === lastUpdated, true);
  });

  it("should throw if set value key is timestampKey", async () => {
    const session = new Session<{ a: number }>({ a: 1 });
    assert.throws(() => {
      session.set(timestampKey as any, 2);
    });
  });

  it("should delete", async () => {
    const session = new Session<{ a: number }>({ a: 1 });
    session.delete();
    assert.equal(session.deleted, true);
  });

  it("should regenerate", async () => {
    const session = new Session<{ a: number }>({ a: 1 });
    session.regenerate();
    assert.equal(session.changed, true);
    assert.equal(session.get("a"), undefined);
  });

  it("should regenerate without ignoreFields", async () => {
    const session = new Session<{ a: number }>({ a: 1 });
    session.regenerate(["a"]);
    assert.equal(session.changed, true);
    assert.equal(session.get("a"), 1);
  });
});
