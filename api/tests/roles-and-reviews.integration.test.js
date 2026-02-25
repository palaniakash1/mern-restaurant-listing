import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcryptjs from "bcryptjs";
import app from "../app.js";
import User from "../models/user.model.js";
import Restaurant from "../models/restaurant.model.js";
import Review from "../models/review.model.js";
import {
  clearTestDb,
  setupTestDb,
  teardownTestDb,
  signTestToken,
} from "./helpers/testDb.js";

const createRestaurantPayload = (adminId) => ({
  name: "Test Bistro",
  slug: "test-bistro",
  address: {
    addressLine1: "Street 1",
    areaLocality: "Center",
    city: "London",
    postcode: "SW1A 1AA",
    country: "United Kingdom",
    location: {
      type: "Point",
      coordinates: [-0.1276, 51.5072],
    },
  },
  adminId,
  status: "published",
  isActive: true,
});

describe("Role access and review integration", () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("should enforce role guard on /api/users/store-managers", async () => {
    const hashedPassword = bcryptjs.hashSync("Password1", 10);
    const admin = await User.create({
      userName: "adminuser",
      email: "admin@example.com",
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });
    const user = await User.create({
      userName: "normaluser",
      email: "normal@example.com",
      password: hashedPassword,
      role: "user",
      isActive: true,
    });

    const adminToken = signTestToken({ id: admin._id, role: "admin" });
    const userToken = signTestToken({ id: user._id, role: "user" });

    const forbiddenRes = await request(app)
      .get("/api/users/store-managers")
      .set("Authorization", `Bearer ${userToken}`);
    assert.equal(forbiddenRes.status, 403);

    const allowedRes = await request(app)
      .get("/api/users/store-managers")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(allowedRes.status, 200);
    assert.equal(allowedRes.body.success, true);
  });

  it("public user can create/update own review and duplicate is blocked", async () => {
    const hashedPassword = bcryptjs.hashSync("Password1", 10);
    const admin = await User.create({
      userName: "adminreview",
      email: "adminreview@example.com",
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });
    const userA = await User.create({
      userName: "reviewera",
      email: "reviewera@example.com",
      password: hashedPassword,
      role: "user",
      isActive: true,
    });
    const userB = await User.create({
      userName: "reviewerb",
      email: "reviewerb@example.com",
      password: hashedPassword,
      role: "user",
      isActive: true,
    });
    const restaurant = await Restaurant.create(createRestaurantPayload(admin._id));

    const userAToken = signTestToken({ id: userA._id, role: "user" });
    const userBToken = signTestToken({ id: userB._id, role: "user" });
    const adminToken = signTestToken({ id: admin._id, role: "admin" });

    const createRes = await request(app)
      .post(`/api/reviews/restaurant/${restaurant._id}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ rating: 5, comment: "Great food" });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.success, true);

    const duplicateRes = await request(app)
      .post(`/api/reviews/restaurant/${restaurant._id}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ rating: 4, comment: "Second review" });
    assert.equal(duplicateRes.status, 409);

    const listRes = await request(app).get(
      `/api/reviews/restaurant/${restaurant._id}`,
    );
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.success, true);
    assert.equal(listRes.body.total, 1);

    const review = await Review.findOne({ restaurantId: restaurant._id, userId: userA._id });
    const updateOwnRes = await request(app)
      .patch(`/api/reviews/${review._id}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ rating: 4, comment: "Updated comment" });
    assert.equal(updateOwnRes.status, 200);

    const forbiddenUpdateRes = await request(app)
      .patch(`/api/reviews/${review._id}`)
      .set("Authorization", `Bearer ${userBToken}`)
      .send({ rating: 2 });
    assert.equal(forbiddenUpdateRes.status, 403);

    const forbiddenCreateByAdminRes = await request(app)
      .post(`/api/reviews/restaurant/${restaurant._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ rating: 5, comment: "Admin review attempt" });
    assert.equal(forbiddenCreateByAdminRes.status, 403);

    const refreshedRestaurant = await Restaurant.findById(restaurant._id).lean();
    assert.equal(refreshedRestaurant.reviewCount, 1);
    assert.equal(refreshedRestaurant.rating, 4);
  });
});
