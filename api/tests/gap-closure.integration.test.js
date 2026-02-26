import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcryptjs from "bcryptjs";
import app from "../app.js";
import User from "../models/user.model.js";
import Restaurant from "../models/restaurant.model.js";
import Category from "../models/category.model.js";
import Menu from "../models/menu.model.js";
import Review from "../models/review.model.js";
import {
  clearTestDb,
  setupTestDb,
  teardownTestDb,
  signTestToken,
} from "./helpers/testDb.js";

const hashedPassword = bcryptjs.hashSync("Password1", 10);

const restaurantPayload = (name, adminId, extras = {}) => ({
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  address: {
    addressLine1: "Main street",
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
  ...extras,
});

const createActors = async () => {
  const superAdmin = await User.create({
    userName: "gap_super",
    email: "gap_super@example.com",
    password: hashedPassword,
    role: "superAdmin",
    isActive: true,
  });
  const admin = await User.create({
    userName: "gap_admin",
    email: "gap_admin@example.com",
    password: hashedPassword,
    role: "admin",
    isActive: true,
  });
  const user = await User.create({
    userName: "gap_user",
    email: "gap_user@example.com",
    password: hashedPassword,
    role: "user",
    isActive: true,
  });

  return {
    superAdmin,
    admin,
    user,
    tokens: {
      superAdmin: signTestToken({ id: superAdmin._id, role: "superAdmin" }),
      admin: signTestToken({ id: admin._id, role: "admin" }),
      user: signTestToken({ id: user._id, role: "user" }),
    },
  };
};

describe("Gap closure integration", { concurrency: false }, () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("should cover auth google endpoint", async () => {
    const res = await request(app).post("/api/auth/google").send({
      name: "Google User",
      email: "gap_google@example.com",
      googlePhotoUrl: "https://example.com/photo.jpg",
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.email, "gap_google@example.com");
  });

  it("should cover remaining users endpoints", async () => {
    const { superAdmin, admin, tokens } = await createActors();
    const restaurant = await Restaurant.create(
      restaurantPayload("Gap User Restaurant", admin._id),
    );
    await User.findByIdAndUpdate(admin._id, { restaurantId: restaurant._id });

    const superToken = tokens.superAdmin;
    const adminToken = tokens.admin;

    const testRes = await request(app)
      .get("/api/users/test")
      .set("Authorization", `Bearer ${superToken}`);
    assert.equal(testRes.status, 200);

    const createStoreManagerRes = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userName: "gap_store_manager",
        email: "gap_store_manager@example.com",
        password: "Password1",
      });
    assert.equal(createStoreManagerRes.status, 201);
    const storeManagerId = createStoreManagerRes.body.data.id;

    const updateSelfRes = await request(app)
      .patch(`/api/users/${admin._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ profilePicture: "https://example.com/avatar.png" });
    assert.equal(updateSelfRes.status, 200);

    const targetUser = await User.create({
      userName: "gap_target_user",
      email: "gap_target_user@example.com",
      password: hashedPassword,
      role: "user",
      isActive: true,
    });
    const targetUserToken = signTestToken({ id: targetUser._id, role: "user" });

    const deactivateRes = await request(app)
      .patch(`/api/users/${targetUser._id}/deactivate`)
      .set("Authorization", `Bearer ${targetUserToken}`);
    assert.equal(deactivateRes.status, 200);

    const restoreRes = await request(app)
      .patch(`/api/users/${targetUser._id}/restore`)
      .set("Authorization", `Bearer ${superToken}`);
    assert.equal(restoreRes.status, 200);

    const assignRes = await request(app)
      .patch(`/api/users/${storeManagerId}/restaurant`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ restaurantId: restaurant._id.toString() });
    assert.equal(assignRes.status, 200);

    const unassignRes = await request(app)
      .delete(`/api/users/${storeManagerId}/restaurant`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(unassignRes.status, 200);

    const deleteRes = await request(app)
      .delete(`/api/users/${targetUser._id}`)
      .set("Authorization", `Bearer ${targetUserToken}`);
    assert.equal(deleteRes.status, 200);
  });

  it("should cover remaining restaurant endpoints", async () => {
    const { admin, tokens } = await createActors();

    const featured = await Restaurant.create(
      restaurantPayload("Gap Featured", admin._id, {
        isFeatured: true,
        isTrending: true,
      }),
    );
    await User.findByIdAndUpdate(admin._id, { restaurantId: featured._id });

    const category = await Category.create({
      name: "Gap Details Category",
      slug: "gap-details-category",
      isGeneric: false,
      restaurantId: featured._id,
      status: "published",
      isActive: true,
    });
    await Menu.create({
      restaurantId: featured._id,
      categoryId: category._id,
      status: "published",
      isActive: true,
      items: [{ name: "Pasta", price: 8.5, isAvailable: true, isActive: true }],
    });
    await User.create({
      userName: "gap_store_manager2",
      email: "gap_store_manager2@example.com",
      password: hashedPassword,
      role: "storeManager",
      restaurantId: featured._id,
      createdByAdminId: admin._id,
      isActive: true,
    });

    const nearbyRes = await request(app).get(
      "/api/restaurants/nearby?lat=51.5072&lng=-0.1276",
    );
    assert.equal(nearbyRes.status, 200);

    const featuredRes = await request(app).get("/api/restaurants/featured");
    assert.equal(featuredRes.status, 200);

    const trendingRes = await request(app).get("/api/restaurants/trending");
    assert.equal(trendingRes.status, 200);

    const detailsRes = await request(app).get(
      `/api/restaurants/slug/${featured.slug}/details`,
    );
    assert.equal(detailsRes.status, 200);

    const summaryRes = await request(app)
      .get("/api/restaurants/me/summary")
      .set("Authorization", `Bearer ${tokens.admin}`);
    assert.equal(summaryRes.status, 200);
    assert.equal(summaryRes.body.success, true);
  });

  it("should cover remaining category endpoints", async () => {
    const { admin, tokens } = await createActors();
    const restaurant = await Restaurant.create(
      restaurantPayload("Gap Category Restaurant", admin._id),
    );
    await User.findByIdAndUpdate(admin._id, { restaurantId: restaurant._id });

    const createRes = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${tokens.admin}`)
      .send({ name: "Gap Category", isGeneric: false, restaurantId: restaurant._id });
    assert.equal(createRes.status, 201);
    const categoryId = createRes.body.data._id;

    const myRes = await request(app)
      .get("/api/categories/my")
      .set("Authorization", `Bearer ${tokens.admin}`);
    assert.equal(myRes.status, 200);

    const reorderRes = await request(app)
      .patch("/api/categories/reorder")
      .set("Authorization", `Bearer ${tokens.admin}`)
      .send([{ id: categoryId, order: 1 }]);
    assert.equal(reorderRes.status, 200);

    const bulkReorderRes = await request(app)
      .patch("/api/categories/bulk-reorder")
      .set("Authorization", `Bearer ${tokens.admin}`)
      .set("x-idempotency-key", "gap-bulk-reorder-1")
      .send({ items: [{ id: categoryId, order: 1 }] });
    assert.equal(bulkReorderRes.status, 200);

    const statusRes = await request(app)
      .patch(`/api/categories/${categoryId}/status`)
      .set("Authorization", `Bearer ${tokens.admin}`)
      .send({ isActive: false });
    assert.equal(statusRes.status, 200);

    const restoreRes = await request(app)
      .patch(`/api/categories/${categoryId}/restore`)
      .set("Authorization", `Bearer ${tokens.superAdmin}`);
    assert.equal(restoreRes.status, 200);

    const auditRes = await request(app)
      .get(`/api/categories/${categoryId}/audit`)
      .set("Authorization", `Bearer ${tokens.admin}`);
    assert.equal(auditRes.status, 200);

    const getByIdRes = await request(app)
      .get(`/api/categories/${categoryId}`)
      .set("Authorization", `Bearer ${tokens.admin}`);
    assert.equal(getByIdRes.status, 200);

    const softDeleteRes = await request(app)
      .delete(`/api/categories/${categoryId}`)
      .set("Authorization", `Bearer ${tokens.admin}`);
    assert.equal(softDeleteRes.status, 200);

    const deletedRes = await request(app)
      .get("/api/categories/deleted")
      .set("Authorization", `Bearer ${tokens.superAdmin}`);
    assert.equal(deletedRes.status, 200);

    const exportRes = await request(app)
      .get("/api/categories/export?format=json")
      .set("Authorization", `Bearer ${tokens.superAdmin}`);
    assert.equal(exportRes.status, 200);
  });

  it("should cover remaining menu endpoints (restore + audit)", async () => {
    const { admin, tokens } = await createActors();
    const restaurant = await Restaurant.create(
      restaurantPayload("Gap Menu Restaurant", admin._id),
    );
    await User.findByIdAndUpdate(admin._id, { restaurantId: restaurant._id });

    const category = await Category.create({
      name: "Gap Menu Category",
      slug: "gap-menu-category",
      isGeneric: false,
      restaurantId: restaurant._id,
      status: "published",
      isActive: true,
    });

    const menuCreateRes = await request(app)
      .post("/api/menus")
      .set("Authorization", `Bearer ${tokens.admin}`)
      .send({ restaurantId: restaurant._id.toString(), categoryId: category._id.toString() });
    assert.equal(menuCreateRes.status, 201);
    const menuId = menuCreateRes.body.data._id;

    const softDeleteRes = await request(app)
      .delete(`/api/menus/${menuId}`)
      .set("Authorization", `Bearer ${tokens.admin}`);
    assert.equal(softDeleteRes.status, 200);

    const restoreRes = await request(app)
      .patch(`/api/menus/${menuId}/restore`)
      .set("Authorization", `Bearer ${tokens.admin}`);
    assert.equal(restoreRes.status, 200);

    const auditRes = await request(app)
      .get(`/api/menus/${menuId}/audit`)
      .set("Authorization", `Bearer ${tokens.admin}`);
    assert.equal(auditRes.status, 200);
  });

  it("should cover remaining review endpoints (/my and delete)", async () => {
    const { admin, user, tokens } = await createActors();
    const restaurant = await Restaurant.create(
      restaurantPayload("Gap Review Restaurant", admin._id),
    );

    const createReviewRes = await request(app)
      .post(`/api/reviews/restaurant/${restaurant._id}`)
      .set("Authorization", `Bearer ${tokens.user}`)
      .send({ rating: 5, comment: "Gap review" });
    assert.equal(createReviewRes.status, 201);
    const reviewId = createReviewRes.body.data._id;

    const myReviewsRes = await request(app)
      .get("/api/reviews/my")
      .set("Authorization", `Bearer ${tokens.user}`);
    assert.equal(myReviewsRes.status, 200);
    assert.equal(myReviewsRes.body.success, true);

    const deleteRes = await request(app)
      .delete(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${signTestToken({ id: user._id, role: "user" })}`);
    assert.equal(deleteRes.status, 200);

    const removed = await Review.findById(reviewId).lean();
    assert.equal(removed.isActive, false);
  });
});
