import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcryptjs from "bcryptjs";
import app from "../app.js";
import User from "../models/user.model.js";
import { clearTestDb, setupTestDb, teardownTestDb } from "./helpers/testDb.js";

describe("Auth integration", { concurrency: false }, () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("signup, signin, session and change-password flow should work", async () => {
    const signupRes = await request(app).post("/api/auth/signup").send({
      userName: "testuser1",
      email: "testuser1@example.com",
      password: "Password1",
    });
    assert.equal(signupRes.status, 201);
    assert.equal(signupRes.body.success, true);

    const agent = request.agent(app);
    const signinRes = await agent.post("/api/auth/signin").send({
      email: "testuser1@example.com",
      password: "Password1",
    });
    assert.equal(signinRes.status, 200);
    assert.equal(signinRes.body.email, "testuser1@example.com");

    const sessionRes = await agent.get("/api/auth/session");
    assert.equal(sessionRes.status, 200);
    assert.equal(sessionRes.body.success, true);
    assert.equal(sessionRes.body.data.userName, "testuser1");

    const changePasswordRes = await agent.post("/api/auth/change-password").send({
      currentPassword: "Password1",
      newPassword: "Password2",
    });
    assert.equal(changePasswordRes.status, 200);
    assert.equal(changePasswordRes.body.success, true);

    await agent.post("/api/auth/signout").send({});
    const reloginRes = await request(app).post("/api/auth/signin").send({
      email: "testuser1@example.com",
      password: "Password2",
    });
    assert.equal(reloginRes.status, 200);
  });

  it("inactive user should be blocked at signin", async () => {
    const hashedPassword = bcryptjs.hashSync("Password1", 10);
    await User.create({
      userName: "inactiveuser",
      email: "inactive@example.com",
      password: hashedPassword,
      role: "user",
      isActive: false,
    });

    const signinRes = await request(app).post("/api/auth/signin").send({
      email: "inactive@example.com",
      password: "Password1",
    });

    assert.equal(signinRes.status, 403);
    assert.equal(signinRes.body.success, false);
  });
});
