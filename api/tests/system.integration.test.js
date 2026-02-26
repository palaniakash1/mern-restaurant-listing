import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";

describe("System endpoints integration", () => {
  it("GET /api/health should return readiness status", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.status, "ok");
  });

  it("GET /api/live should return liveness status", async () => {
    const res = await request(app).get("/api/live");
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.status, "alive");
  });

  it("GET /api/docs should serve swagger ui", async () => {
    const res = await request(app).get("/api/docs/");
    assert.equal(res.status, 200);
    assert.match(res.text, /swagger/i);
  });
});
