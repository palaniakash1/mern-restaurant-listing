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
  openingHours: {
    monday: { open: "09:00", close: "22:00", isClosed: false },
    tuesday: { open: "09:00", close: "22:00", isClosed: false },
    wednesday: { open: "09:00", close: "22:00", isClosed: false },
    thursday: { open: "09:00", close: "22:00", isClosed: false },
    friday: { open: "09:00", close: "22:00", isClosed: false },
    saturday: { open: "09:00", close: "22:00", isClosed: false },
    sunday: { open: "09:00", close: "22:00", isClosed: false },
  },
  adminId,
  status: "published",
  isActive: true,
});

describe("Role access and review integration", { concurrency: false }, () => {
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

  it("review get-by-id and moderation flow should enforce access correctly", async () => {
    const hashedPassword = bcryptjs.hashSync("Password1", 10);
    const admin = await User.create({
      userName: "adminmod",
      email: "adminmod@example.com",
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });
    const superAdmin = await User.create({
      userName: "supmod",
      email: "supmod@example.com",
      password: hashedPassword,
      role: "superAdmin",
      isActive: true,
    });
    const userA = await User.create({
      userName: "reviewreadera",
      email: "reviewreadera@example.com",
      password: hashedPassword,
      role: "user",
      isActive: true,
    });
    const userB = await User.create({
      userName: "reviewreaderb",
      email: "reviewreaderb@example.com",
      password: hashedPassword,
      role: "user",
      isActive: true,
    });

    const restaurant = await Restaurant.create(createRestaurantPayload(admin._id));
    await User.findByIdAndUpdate(admin._id, { restaurantId: restaurant._id });

    const userAToken = signTestToken({ id: userA._id, role: "user" });
    const userBToken = signTestToken({ id: userB._id, role: "user" });
    const adminToken = signTestToken({ id: admin._id, role: "admin" });
    const superAdminToken = signTestToken({ id: superAdmin._id, role: "superAdmin" });

    const createRes = await request(app)
      .post(`/api/reviews/restaurant/${restaurant._id}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ rating: 5, comment: "Excellent" });
    assert.equal(createRes.status, 201);

    const reviewId = createRes.body.data._id;

    const ownReadRes = await request(app)
      .get(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    assert.equal(ownReadRes.status, 200);
    assert.equal(ownReadRes.body.success, true);

    const forbiddenReadRes = await request(app)
      .get(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${userBToken}`);
    assert.equal(forbiddenReadRes.status, 403);

    const adminReadRes = await request(app)
      .get(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(adminReadRes.status, 200);

    const moderateOffRes = await request(app)
      .patch(`/api/reviews/${reviewId}/moderate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isActive: false });
    assert.equal(moderateOffRes.status, 200);
    assert.equal(moderateOffRes.body.data.isActive, false);

    const hiddenRes = await request(app)
      .get(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);
    assert.equal(hiddenRes.status, 404);

    const summaryAfterHide = await request(app).get(
      `/api/reviews/restaurant/${restaurant._id}/summary`,
    );
    assert.equal(summaryAfterHide.status, 200);
    assert.equal(summaryAfterHide.body.data.totalReviews, 0);

    const moderateOnRes = await request(app)
      .patch(`/api/reviews/${reviewId}/moderate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isActive: true });
    assert.equal(moderateOnRes.status, 200);
    assert.equal(moderateOnRes.body.data.isActive, true);

    const superAdminReadRes = await request(app)
      .get(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);
    assert.equal(superAdminReadRes.status, 200);
  });

  it("superAdmin should list available admins and manage storeManager ownership", async () => {
    const hashedPassword = bcryptjs.hashSync("Password1", 10);
    const superAdmin = await User.create({
      userName: "superuser1",
      email: "superuser1@example.com",
      password: hashedPassword,
      role: "superAdmin",
      isActive: true,
    });
    const adminA = await User.create({
      userName: "admina",
      email: "admina@example.com",
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });
    const adminB = await User.create({
      userName: "adminb",
      email: "adminb@example.com",
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });

    const restaurant = await Restaurant.create(createRestaurantPayload(adminA._id));
    await User.findByIdAndUpdate(adminA._id, { restaurantId: restaurant._id });

    const storeManager = await User.create({
      userName: "storemgr1",
      email: "storemgr1@example.com",
      password: hashedPassword,
      role: "storeManager",
      isActive: true,
      createdByAdminId: adminA._id,
      restaurantId: restaurant._id,
    });

    const superAdminToken = signTestToken({ id: superAdmin._id, role: "superAdmin" });
    const adminAToken = signTestToken({ id: adminA._id, role: "admin" });

    const adminsRes = await request(app)
      .get("/api/users/admins")
      .set("Authorization", `Bearer ${superAdminToken}`);
    assert.equal(adminsRes.status, 200);
    assert.equal(adminsRes.body.success, true);
    assert.equal(
      adminsRes.body.data.some((entry) => entry._id === String(adminB._id)),
      true,
    );
    assert.equal(
      adminsRes.body.data.some((entry) => entry._id === String(adminA._id)),
      false,
    );

    const transferRes = await request(app)
      .patch(`/api/users/${storeManager._id}/owner`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ newAdminId: adminB._id.toString() });
    assert.equal(transferRes.status, 200);

    const adminAUnassignRes = await request(app)
      .delete(`/api/users/${storeManager._id}/restaurant`)
      .set("Authorization", `Bearer ${adminAToken}`);
    assert.equal(adminAUnassignRes.status, 403);

    const superAdminUnassignRes = await request(app)
      .delete(`/api/users/${storeManager._id}/restaurant`)
      .set("Authorization", `Bearer ${superAdminToken}`);
    assert.equal(superAdminUnassignRes.status, 200);
    assert.equal(superAdminUnassignRes.body.success, true);
  });
});
