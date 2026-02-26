import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcryptjs from "bcryptjs";
import app from "../app.js";
import User from "../models/user.model.js";
import { clearTestDb, setupTestDb, teardownTestDb, signTestToken } from "./helpers/testDb.js";

describe("RBAC contract (users + admin)", { concurrency: false }, () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("admin route should allow only superAdmin", async () => {
    const hashedPassword = bcryptjs.hashSync("Password1", 10);
    const superAdmin = await User.create({
      userName: "rbacsuper",
      email: "rbacsuper@example.com",
      password: hashedPassword,
      role: "superAdmin",
      isActive: true,
    });
    const admin = await User.create({
      userName: "rbacadmin",
      email: "rbacadmin@example.com",
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });

    const superToken = signTestToken({ id: superAdmin._id, role: "superAdmin" });
    const adminToken = signTestToken({ id: admin._id, role: "admin" });

    const denied = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userName: "badcreate",
        email: "badcreate@example.com",
        password: "Password1",
        role: "admin",
      });
    assert.equal(denied.status, 403);

    const allowed = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${superToken}`)
      .send({
        userName: "goodcreate",
        email: "goodcreate@example.com",
        password: "Password1",
        role: "admin",
      });
    assert.equal(allowed.status, 201);
  });

  it("users module permissions should be role-aware", async () => {
    const hashedPassword = bcryptjs.hashSync("Password1", 10);
    const superAdmin = await User.create({
      userName: "rbacsuper2",
      email: "rbacsuper2@example.com",
      password: hashedPassword,
      role: "superAdmin",
      isActive: true,
    });
    const admin = await User.create({
      userName: "rbacadmin2",
      email: "rbacadmin2@example.com",
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });
    const user = await User.create({
      userName: "rbacuser2",
      email: "rbacuser2@example.com",
      password: hashedPassword,
      role: "user",
      isActive: true,
    });

    const superToken = signTestToken({ id: superAdmin._id, role: "superAdmin" });
    const adminToken = signTestToken({ id: admin._id, role: "admin" });
    const userToken = signTestToken({ id: user._id, role: "user" });

    const superCanListUsers = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${superToken}`);
    assert.equal(superCanListUsers.status, 200);

    const adminDeniedAllUsers = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(adminDeniedAllUsers.status, 403);

    const adminDeniedAdminsList = await request(app)
      .get("/api/users/admins")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(adminDeniedAdminsList.status, 403);

    const userDeniedStoreManagers = await request(app)
      .get("/api/users/store-managers")
      .set("Authorization", `Bearer ${userToken}`);
    assert.equal(userDeniedStoreManagers.status, 403);

    const adminAllowedStoreManagers = await request(app)
      .get("/api/users/store-managers")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(adminAllowedStoreManagers.status, 200);
  });
});
