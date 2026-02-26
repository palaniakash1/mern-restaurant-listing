import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcryptjs from "bcryptjs";
import app from "../app.js";
import User from "../models/user.model.js";
import Restaurant from "../models/restaurant.model.js";
import Category from "../models/category.model.js";
import Menu from "../models/menu.model.js";
import {
  clearTestDb,
  setupTestDb,
  teardownTestDb,
  signTestToken,
} from "./helpers/testDb.js";

const passwordHash = bcryptjs.hashSync("Password1", 10);

const buildRestaurantPayload = (name = "Test Diner") => ({
  name,
  tagline: "Fresh food",
  description: "Simple test payload",
  address: {
    addressLine1: "Street 10",
    areaLocality: "Central",
    city: "London",
    postcode: "SW1A 1AA",
    country: "United Kingdom",
  },
  location: { lat: 51.5072, lng: -0.1276 },
  contactNumber: "+44-20-5555-5555",
  email: "owner@example.com",
});

const createBaseActors = async () => {
  const superAdmin = await User.create({
    userName: "supercore",
    email: "supercore@example.com",
    password: passwordHash,
    role: "superAdmin",
    isActive: true,
  });
  const adminA = await User.create({
    userName: "admincorea",
    email: "admincorea@example.com",
    password: passwordHash,
    role: "admin",
    isActive: true,
  });
  const adminB = await User.create({
    userName: "admincoreb",
    email: "admincoreb@example.com",
    password: passwordHash,
    role: "admin",
    isActive: true,
  });
  const user = await User.create({
    userName: "plaincore",
    email: "plaincore@example.com",
    password: passwordHash,
    role: "user",
    isActive: true,
  });

  return {
    superAdmin,
    adminA,
    adminB,
    user,
    tokens: {
      superAdmin: signTestToken({ id: superAdmin._id, role: "superAdmin" }),
      adminA: signTestToken({ id: adminA._id, role: "admin" }),
      adminB: signTestToken({ id: adminB._id, role: "admin" }),
      user: signTestToken({ id: user._id, role: "user" }),
    },
  };
};

describe("Platform core integration", () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("admin route should enforce superAdmin-only user provisioning", async () => {
    const { tokens } = await createBaseActors();

    const forbiddenRes = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${tokens.user}`)
      .send({
        userName: "newadmin1",
        email: "newadmin1@example.com",
        password: "Password1",
        role: "admin",
      });
    assert.equal(forbiddenRes.status, 403);

    const invalidPayloadRes = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${tokens.superAdmin}`)
      .send({
        userName: "badrole",
        email: "badrole@example.com",
        password: "Password1",
        role: "user",
      });
    assert.equal(invalidPayloadRes.status, 400);

    const successRes = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${tokens.superAdmin}`)
      .send({
        userName: "newadmin2",
        email: "newadmin2@example.com",
        password: "Password1",
        role: "admin",
      });
    assert.equal(successRes.status, 201);
    assert.equal(successRes.body.user.role, "admin");
  });

  it("restaurant/category/menu flow should enforce auth, validation and ownership", async () => {
    const { adminA, tokens } = await createBaseActors();

    const unauthCreateRestaurantRes = await request(app)
      .post("/api/restaurants")
      .send(buildRestaurantPayload("No Auth Diner"));
    assert.equal(unauthCreateRestaurantRes.status, 401);

    const createRestaurantRes = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send(buildRestaurantPayload("Core Diner"));
    assert.equal(createRestaurantRes.status, 201);

    const restaurantId = createRestaurantRes.body.data._id;
    const restaurantSlug = createRestaurantRes.body.data.slug;

    const publishRestaurantRes = await request(app)
      .patch(`/api/restaurants/id/${restaurantId}/status`)
      .set("Authorization", `Bearer ${tokens.superAdmin}`)
      .send({ status: "published" });
    assert.equal(publishRestaurantRes.status, 200);

    const createCategoryRes = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ name: "Mains", isGeneric: false, restaurantId });
    assert.equal(createCategoryRes.status, 201);
    const categoryId = createCategoryRes.body.data._id;

    const ownershipViolationRes = await request(app)
      .patch(`/api/categories/${categoryId}`)
      .set("Authorization", `Bearer ${tokens.adminB}`)
      .send({ name: "Hacked Name" });
    assert.equal(ownershipViolationRes.status, 403);

    const createMenuRes = await request(app)
      .post("/api/menus")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ restaurantId, categoryId });
    assert.equal(createMenuRes.status, 201);
    const menuId = createMenuRes.body.data._id;

    const addItemRes = await request(app)
      .post(`/api/menus/${menuId}/items`)
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ name: "Burger", price: 9.99 });
    assert.equal(addItemRes.status, 201);

    const publicMenuRes = await request(app).get(
      `/api/menus/restaurant/${restaurantId}`,
    );
    assert.equal(publicMenuRes.status, 200);
    assert.equal(publicMenuRes.body.success, true);

    const softDeleteMenuRes = await request(app)
      .delete(`/api/menus/${menuId}`)
      .set("Authorization", `Bearer ${tokens.adminA}`);
    assert.equal(softDeleteMenuRes.status, 200);

    const deletedMenusRes = await request(app)
      .get("/api/menus/deleted")
      .set("Authorization", `Bearer ${tokens.adminA}`);
    assert.equal(deletedMenusRes.status, 200);
    assert.equal(deletedMenusRes.body.success, true);

    const hardDeleteAsAdminRes = await request(app)
      .delete(`/api/menus/${menuId}/hard`)
      .set("Authorization", `Bearer ${tokens.adminA}`);
    assert.equal(hardDeleteAsAdminRes.status, 403);

    const hardDeleteAsSuperAdminRes = await request(app)
      .delete(`/api/menus/${menuId}/hard`)
      .set("Authorization", `Bearer ${tokens.superAdmin}`);
    assert.equal(hardDeleteAsSuperAdminRes.status, 200);

    const publicRestaurantRes = await request(app).get(
      `/api/restaurants/slug/${restaurantSlug}`,
    );
    assert.equal(publicRestaurantRes.status, 200);

    const myRestaurantRes = await request(app)
      .get("/api/restaurants/me")
      .set("Authorization", `Bearer ${tokens.adminA}`);
    assert.equal(myRestaurantRes.status, 200);

    const adminRecord = await User.findById(adminA._id).lean();
    assert.equal(String(adminRecord.restaurantId), restaurantId);
  });

  it("category management endpoints should enforce role and payload validation", async () => {
    const { tokens } = await createBaseActors();

    const genericByAdminRes = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ name: "Global Specials", isGeneric: true });
    assert.equal(genericByAdminRes.status, 403);

    const genericBySuperAdminRes = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${tokens.superAdmin}`)
      .send({ name: "Global Specials", isGeneric: true });
    assert.equal(genericBySuperAdminRes.status, 201);

    const categoryId = genericBySuperAdminRes.body.data._id;

    const bulkStatusAsAdminRes = await request(app)
      .patch("/api/categories/bulk-status")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ ids: [categoryId], status: "published" });
    assert.equal(bulkStatusAsAdminRes.status, 403);

    const invalidBulkStatusRes = await request(app)
      .patch("/api/categories/bulk-status")
      .set("Authorization", `Bearer ${tokens.superAdmin}`)
      .send({ ids: ["bad-id"], status: "published" });
    assert.equal(invalidBulkStatusRes.status, 400);

    const allAsAdminRes = await request(app)
      .get("/api/categories/all")
      .set("Authorization", `Bearer ${tokens.adminA}`);
    assert.equal(allAsAdminRes.status, 403);

    const allAsSuperAdminRes = await request(app)
      .get("/api/categories/all")
      .set("Authorization", `Bearer ${tokens.superAdmin}`);
    assert.equal(allAsSuperAdminRes.status, 200);
  });

  it("audit logs should be role-scoped and forbidden for normal users", async () => {
    const { tokens } = await createBaseActors();

    const createRestaurantRes = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send(buildRestaurantPayload("Audit Diner"));
    assert.equal(createRestaurantRes.status, 201);

    const superAdminAuditRes = await request(app)
      .get("/api/auditlogs")
      .set("Authorization", `Bearer ${tokens.superAdmin}`);
    assert.equal(superAdminAuditRes.status, 200);
    assert.equal(superAdminAuditRes.body.success, true);

    const adminAuditRes = await request(app)
      .get("/api/auditlogs")
      .set("Authorization", `Bearer ${tokens.adminA}`);
    assert.equal(adminAuditRes.status, 200);
    assert.equal(adminAuditRes.body.success, true);

    const userAuditRes = await request(app)
      .get("/api/auditlogs")
      .set("Authorization", `Bearer ${tokens.user}`);
    assert.equal(userAuditRes.status, 403);
  });

  it("restaurant ownership should block cross-admin updates", async () => {
    const { tokens } = await createBaseActors();

    const createRestaurantRes = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send(buildRestaurantPayload("Ownership Diner"));
    assert.equal(createRestaurantRes.status, 201);

    const restaurantId = createRestaurantRes.body.data._id;

    const updateByOtherAdminRes = await request(app)
      .patch(`/api/restaurants/id/${restaurantId}`)
      .set("Authorization", `Bearer ${tokens.adminB}`)
      .send({ tagline: "Attempted takeover" });
    assert.equal(updateByOtherAdminRes.status, 403);

    const updateByOwnerRes = await request(app)
      .patch(`/api/restaurants/id/${restaurantId}`)
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ tagline: "Owner updated tagline" });
    assert.equal(updateByOwnerRes.status, 200);
  });

  it("public and protected listing endpoints should enforce auth boundaries", async () => {
    const { tokens } = await createBaseActors();

    const unauthMenuDeletedRes = await request(app).get("/api/menus/deleted");
    assert.equal(unauthMenuDeletedRes.status, 401);

    const unauthUsersRes = await request(app).get("/api/users");
    assert.equal(unauthUsersRes.status, 401);

    const superAdminUsersRes = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${tokens.superAdmin}`);
    assert.equal(superAdminUsersRes.status, 200);

    const publicCategoriesRes = await request(app).get("/api/categories");
    assert.equal(publicCategoriesRes.status, 200);
    assert.equal(publicCategoriesRes.body.success, true);

    const publicRestaurantsRes = await request(app).get("/api/restaurants");
    assert.equal(publicRestaurantsRes.status, 200);
    assert.equal(publicRestaurantsRes.body.success, true);
  });

  it("superAdmin should be able to restore a blocked restaurant", async () => {
    const { tokens } = await createBaseActors();

    const createRestaurantRes = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send(buildRestaurantPayload("Restore Diner"));
    assert.equal(createRestaurantRes.status, 201);
    const restaurantId = createRestaurantRes.body.data._id;

    const deleteRestaurantRes = await request(app)
      .delete(`/api/restaurants/id/${restaurantId}`)
      .set("Authorization", `Bearer ${tokens.adminA}`);
    assert.equal(deleteRestaurantRes.status, 200);

    const restoreAsAdminRes = await request(app)
      .patch(`/api/restaurants/id/${restaurantId}/restore`)
      .set("Authorization", `Bearer ${tokens.adminA}`);
    assert.equal(restoreAsAdminRes.status, 403);

    const restoreAsSuperAdminRes = await request(app)
      .patch(`/api/restaurants/id/${restaurantId}/restore`)
      .set("Authorization", `Bearer ${tokens.superAdmin}`);
    assert.equal(restoreAsSuperAdminRes.status, 200);
    assert.equal(restoreAsSuperAdminRes.body.data.status, "draft");
  });

  it("superAdmin should reassign restaurant ownership to another admin", async () => {
    const { adminB, tokens } = await createBaseActors();

    const createRestaurantRes = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send(buildRestaurantPayload("Reassign Diner"));
    assert.equal(createRestaurantRes.status, 201);

    const restaurantId = createRestaurantRes.body.data._id;

    const reassignRes = await request(app)
      .patch(`/api/restaurants/id/${restaurantId}/admin`)
      .set("Authorization", `Bearer ${tokens.superAdmin}`)
      .send({ newAdminId: String(adminB._id) });
    assert.equal(reassignRes.status, 200);

    const updatedRestaurant = await Restaurant.findById(restaurantId).lean();
    assert.equal(String(updatedRestaurant.adminId), String(adminB._id));
  });

  it("superAdmin can use hard-delete category endpoint when category is not linked", async () => {
    const { tokens } = await createBaseActors();

    const categoryRes = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${tokens.superAdmin}`)
      .send({ name: "Temp Generic", isGeneric: true });
    assert.equal(categoryRes.status, 201);

    const categoryId = categoryRes.body.data._id;

    const hardDeleteRes = await request(app)
      .delete(`/api/categories/${categoryId}/hard`)
      .set("Authorization", `Bearer ${tokens.superAdmin}`);
    assert.equal(hardDeleteRes.status, 200);

    const deleted = await Category.findById(categoryId).setOptions({
      includeInactive: true,
    });
    assert.equal(deleted, null);
  });

  it("menu item update should validate payload and ownership", async () => {
    const { tokens } = await createBaseActors();

    const restaurantRes = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send(buildRestaurantPayload("Menu Validation Diner"));
    assert.equal(restaurantRes.status, 201);
    const restaurantId = restaurantRes.body.data._id;

    await request(app)
      .patch(`/api/restaurants/id/${restaurantId}/status`)
      .set("Authorization", `Bearer ${tokens.superAdmin}`)
      .send({ status: "published" });

    const categoryRes = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ name: "Sides", isGeneric: false, restaurantId });
    assert.equal(categoryRes.status, 201);

    const menuRes = await request(app)
      .post("/api/menus")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ restaurantId, categoryId: categoryRes.body.data._id });
    assert.equal(menuRes.status, 201);
    const menuId = menuRes.body.data._id;

    const addItemRes = await request(app)
      .post(`/api/menus/${menuId}/items`)
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ name: "Fries", price: 4.5 });
    assert.equal(addItemRes.status, 201);

    const itemId = addItemRes.body.data[0]._id;

    const invalidUpdateRes = await request(app)
      .put(`/api/menus/${menuId}/items/${itemId}`)
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ price: -2 });
    assert.equal(invalidUpdateRes.status, 400);

    const crossOwnerUpdateRes = await request(app)
      .put(`/api/menus/${menuId}/items/${itemId}`)
      .set("Authorization", `Bearer ${tokens.adminB}`)
      .send({ name: "Bad Update" });
    assert.equal(crossOwnerUpdateRes.status, 403);
  });

  it("restaurant internal listing and id endpoint should enforce role and ownership", async () => {
    const { tokens } = await createBaseActors();

    const createRestaurantRes = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send(buildRestaurantPayload("Internal View Diner"));
    assert.equal(createRestaurantRes.status, 201);
    const restaurantId = createRestaurantRes.body.data._id;

    const allAsAdminRes = await request(app)
      .get("/api/restaurants/all")
      .set("Authorization", `Bearer ${tokens.adminA}`);
    assert.equal(allAsAdminRes.status, 403);

    const allAsSuperAdminRes = await request(app)
      .get("/api/restaurants/all")
      .set("Authorization", `Bearer ${tokens.superAdmin}`);
    assert.equal(allAsSuperAdminRes.status, 200);

    const idAsOwnerRes = await request(app)
      .get(`/api/restaurants/id/${restaurantId}`)
      .set("Authorization", `Bearer ${tokens.adminA}`);
    assert.equal(idAsOwnerRes.status, 200);

    const idAsOtherAdminRes = await request(app)
      .get(`/api/restaurants/id/${restaurantId}`)
      .set("Authorization", `Bearer ${tokens.adminB}`);
    assert.equal(idAsOtherAdminRes.status, 403);
  });

  it("category slug checks should enforce scope and ownership", async () => {
    const { tokens } = await createBaseActors();

    const createRestaurantRes = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send(buildRestaurantPayload("Slug Diner"));
    assert.equal(createRestaurantRes.status, 201);
    const restaurantId = createRestaurantRes.body.data._id;

    await request(app)
      .patch(`/api/restaurants/id/${restaurantId}/status`)
      .set("Authorization", `Bearer ${tokens.superAdmin}`)
      .send({ status: "published" });

    const ownRestaurantCheckRes = await request(app)
      .post("/api/categories/check-slug")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({
        name: "Shared Starters",
        isGeneric: false,
        restaurantId,
      });
    assert.equal(ownRestaurantCheckRes.status, 200);

    const foreignRestaurantCheckRes = await request(app)
      .post("/api/categories/check-slug")
      .set("Authorization", `Bearer ${tokens.adminB}`)
      .send({
        name: "Shared Starters",
        isGeneric: false,
        restaurantId,
      });
    assert.equal(foreignRestaurantCheckRes.status, 403);

    const genericCheckRes = await request(app)
      .post("/api/categories/check-slug")
      .set("Authorization", `Bearer ${tokens.superAdmin}`)
      .send({
        name: "Platform Beverages",
        isGeneric: true,
      });
    assert.equal(genericCheckRes.status, 200);
  });

  it("menu lifecycle endpoints should support status, read, reorder and availability", async () => {
    const { tokens } = await createBaseActors();

    const restaurantRes = await request(app)
      .post("/api/restaurants")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send(buildRestaurantPayload("Menu Lifecycle Diner"));
    assert.equal(restaurantRes.status, 201);
    const restaurantId = restaurantRes.body.data._id;

    await request(app)
      .patch(`/api/restaurants/id/${restaurantId}/status`)
      .set("Authorization", `Bearer ${tokens.superAdmin}`)
      .send({ status: "published" });

    const categoryRes = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ name: "Lunch", isGeneric: false, restaurantId });
    assert.equal(categoryRes.status, 201);
    const categoryId = categoryRes.body.data._id;

    await request(app)
      .patch("/api/categories/bulk-status")
      .set("Authorization", `Bearer ${tokens.superAdmin}`)
      .send({ ids: [categoryId], status: "published" });

    const menuRes = await request(app)
      .post("/api/menus")
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ restaurantId, categoryId });
    assert.equal(menuRes.status, 201);
    const menuId = menuRes.body.data._id;

    const itemRes = await request(app)
      .post(`/api/menus/${menuId}/items`)
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ name: "Chicken Wrap", price: 10 });
    assert.equal(itemRes.status, 201);
    const itemId = itemRes.body.data[0]._id;

    const publishMenuRes = await request(app)
      .patch(`/api/menus/${menuId}/status`)
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ status: "published" });
    assert.equal(publishMenuRes.status, 200);

    const getMenuRes = await request(app)
      .get(`/api/menus/${menuId}`)
      .set("Authorization", `Bearer ${tokens.adminA}`);
    assert.equal(getMenuRes.status, 200);

    const reorderRes = await request(app)
      .put(`/api/menus/${menuId}/reorder`)
      .set("Authorization", `Bearer ${tokens.adminA}`)
      .send({ order: [{ itemId, order: 1 }] });
    assert.equal(reorderRes.status, 200);

    const toggleAvailabilityRes = await request(app)
      .patch(`/api/menus/${menuId}/items/${itemId}/availability`)
      .set("Authorization", `Bearer ${tokens.adminA}`);
    assert.equal(toggleAvailabilityRes.status, 200);

    const deleteItemRes = await request(app)
      .delete(`/api/menus/${menuId}/items/${itemId}`)
      .set("Authorization", `Bearer ${tokens.adminA}`);
    assert.equal(deleteItemRes.status, 200);
  });
});
