import test from 'node:test';
import assert from 'node:assert/strict';

import mongoose from 'mongoose';

import { getAuditLogs } from '../controllers/auditLog.controller.js';
import {
  bulkReorderCategories,
  bulkUpdateCategoryStatus,
  checkCategorySlug,
  createCategory,
  deleteCategory,
  exportCategories,
  getAllCategories,
  getCategories,
  getCategoryAuditLogs,
  getCategoryById,
  getDeletedCategories,
  getMyCategories,
  hardDeleteCategory,
  reorderCategories,
  restoreCategory,
  updateCategory,
  updateCategoryStatus
} from '../controllers/category.controller.js';
import {
  addMenuItems,
  createMenu,
  deleteMenu,
  deleteMenuItem,
  getDeletedMenus,
  getMenuAuditLogs,
  getMenuById,
  hardDeleteMenu,
  reorderMenuItems,
  restoreMenu,
  toggleItemAvailability,
  updateMenuItem,
  updateMenuStatus
} from '../controllers/menu.controller.js';
import {
  create,
  deleteRestaurant,
  getAdminRestaurantSummary,
  getAllRestaurants,
  getFeaturedRestaurants,
  getMyRestaurant,
  getNearByRestaurants,
  getRestaurantById,
  getRestaurantDetails,
  getTrendingRestaurants,
  listRestaurants,
  reassignRestaurantAdmin,
  restoreRestaurant,
  updateRestaurant,
  updateRestaurantStatus
} from '../controllers/restaurant.controller.js';
import AuditLog from '../models/auditLog.model.js';
import Category from '../models/category.model.js';
import Menu from '../models/menu.model.js';
import Restaurant from '../models/restaurant.model.js';
import Review from '../models/review.model.js';
import User from '../models/user.model.js';
import {
  __setRedisTestState,
  clear as clearRedisCache,
  getJson as getRedisJson,
  setJson as setRedisJson
} from '../utils/redisCache.js';

const restorers = [];

const patch = (target, key, value) => {
  const original = target[key];
  target[key] = value;
  restorers.push(() => {
    target[key] = original;
  });
};

const restoreAll = () => {
  while (restorers.length > 0) {
    const restore = restorers.pop();
    restore();
  }
};

const createMockResponse = () => {
  let statusCode = 200;
  let payload;
  const headers = {};
  let sentBody;

  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
    send(body) {
      sentBody = body;
      return this;
    },
    setHeader(key, value) {
      headers[key] = value;
    },
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
    },
    get sentBody() {
      return sentBody;
    },
    get headers() {
      return headers;
    }
  };
};

const query = (value) => ({
  session() {
    return this;
  },
  setOptions() {
    return this;
  },
  select() {
    return this;
  },
  populate() {
    return this;
  },
  sort() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return this;
  },
  async lean() {
    return value;
  },
  async distinct() {
    return value;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  }
});

const countQuery = (value) => ({
  setOptions() {
    return Promise.resolve(value);
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  }
});

const createSession = () => {
  let inTransaction = false;
  return {
    startTransaction() {
      inTransaction = true;
    },
    async commitTransaction() {
      inTransaction = false;
    },
    async abortTransaction() {
      inTransaction = false;
    },
    inTransaction() {
      return inTransaction;
    },
    endSession() {}
  };
};

const invoke = async (handler, req) => {
  const res = createMockResponse();
  let nextError = null;
  await handler(req, res, (error) => {
    nextError = error;
  });
  return { res, nextError };
};

const oid = () => new mongoose.Types.ObjectId().toString();

const makeCategoryDoc = (overrides = {}) => {
  const doc = {
    _id: oid(),
    name: 'Category',
    slug: 'category',
    isGeneric: false,
    restaurantId: oid(),
    isActive: true,
    status: 'draft',
    order: 0,
    async save() {},
    async softDelete() {
      this.isActive = false;
    },
    toObject() {
      return {
        _id: this._id,
        name: this.name,
        slug: this.slug,
        isGeneric: this.isGeneric,
        restaurantId: this.restaurantId,
        isActive: this.isActive,
        status: this.status,
        order: this.order
      };
    },
    ...overrides
  };
  return doc;
};

const makeMenuDoc = (overrides = {}) => {
  const itemOneId = oid();
  const itemTwoId = oid();
  const items = [
    {
      _id: itemOneId,
      name: 'One',
      price: 10,
      order: 1,
      isActive: true,
      isAvailable: true,
      toObject() {
        return { ...this };
      }
    },
    {
      _id: itemTwoId,
      name: 'Two',
      price: 15,
      order: 2,
      isActive: true,
      isAvailable: true,
      toObject() {
        return { ...this };
      }
    }
  ];
  items.id = (id) =>
    items.find((item) => String(item._id) === String(id)) || null;

  return {
    _id: oid(),
    restaurantId: oid(),
    categoryId: oid(),
    status: 'draft',
    isActive: true,
    items,
    async save() {},
    async softDelete() {
      this.isActive = false;
    },
    ...overrides
  };
};

test.beforeEach(() => {
  patch(mongoose, 'startSession', async () => createSession());
  patch(AuditLog, 'create', async () => {});
  Category.collection = Category.collection || {};
  Menu.collection = Menu.collection || {};
  __setRedisTestState();
});

test.afterEach(() => {
  clearRedisCache();
  restoreAll();
});

test('audit log controller covers superAdmin, scoped admin, empty admin, and unauthorized flows', async () => {
  const adminRestaurantId = oid();
  const logEntries = [{ action: 'UPDATE' }];
  let capturedFilter = null;

  patch(AuditLog, 'countDocuments', async (filter) => {
    capturedFilter = filter;
    return 1;
  });
  patch(AuditLog, 'find', (filter) => {
    capturedFilter = filter;
    return query(logEntries);
  });
  patch(User, 'find', () => query([oid()]));
  patch(Menu, 'find', () => query([oid()]));
  patch(Category, 'find', () => query([oid()]));
  patch(Review, 'find', () => query([oid()]));

  let result = await invoke(getAuditLogs, {
    user: { role: 'superAdmin', id: oid() },
    query: {
      entityType: 'menu',
      entityId: oid(),
      action: 'DELETE',
      actorId: oid(),
      page: 2,
      limit: 5
    }
  });
  assert.equal(result.res.statusCode, 200);
  assert.equal(capturedFilter.entityType, 'menu');
  assert.equal(result.res.payload.data.length, 1);

  result = await invoke(getAuditLogs, {
    user: { role: 'admin', id: oid() },
    query: {}
  });
  assert.equal(result.res.statusCode, 200);
  assert.deepEqual(result.res.payload.data, []);

  result = await invoke(getAuditLogs, {
    user: { role: 'admin', id: oid(), restaurantId: adminRestaurantId },
    query: { entityType: 'category', action: 'UPDATE', actorId: oid() }
  });
  assert.equal(result.res.statusCode, 200);
  assert.equal(capturedFilter.entityType, 'category');
  assert.equal(capturedFilter.action, 'UPDATE');
  assert.equal(capturedFilter.actorId, undefined);
  assert.ok(Array.isArray(capturedFilter.$or));

  result = await invoke(getAuditLogs, {
    user: { role: 'customer', id: oid() },
    query: {}
  });
  assert.equal(result.nextError.statusCode, 403);
});

test('category controller covers create, update, delete, reorder, restore, list, export, and hard-delete branches', async () => {
  const restaurantId = oid();
  const categoryId = oid();
  const userId = oid();
  const categoryDoc = makeCategoryDoc({ _id: categoryId, restaurantId });
  let savedIdempotency = null;

  patch(Restaurant, 'findById', () => query({ _id: restaurantId, status: 'published', isActive: true }));
  patch(Category, 'findOne', (filter) => {
    if (filter.slug) return query(null);
    return query(categoryDoc);
  });
  patch(Category, 'create', async ([payload]) => [
    makeCategoryDoc({ ...payload, _id: categoryId, toObject() { return { ...payload, _id: categoryId }; } })
  ]);
  patch(Menu, 'findOne', () => query(null));
  patch(Category, 'findById', (id) => {
    if (String(id) !== String(categoryId)) return query(null);
    return query(categoryDoc);
  });
  patch(Category, 'bulkWrite', async () => ({ matchedCount: 2, modifiedCount: 2 }));
  patch(Category, 'countDocuments', () => countQuery(1));
  patch(Category, 'find', () => query([categoryDoc]));
  patch(AuditLog, 'countDocuments', async () => 1);
  patch(AuditLog, 'find', () => query([{ action: 'UPDATE' }]));
  patch(Category, 'updateMany', async () => ({ matchedCount: 2, modifiedCount: 2 }));
  patch(Category, 'findByIdAndDelete', () => query(categoryDoc));
  Category.collection.findOne = async () => ({ _id: categoryId, isActive: false });
  Category.collection.updateOne = async () => ({ acknowledged: true });

  await setRedisJson(
    `idempotency:category_reorder:${userId}:replay-key`,
    {
      signature: JSON.stringify([{ id: categoryId, order: 1 }]),
      inFlight: false,
      response: { success: true, message: 'cached' }
    },
    60
  );

  let result = await invoke(createCategory, {
    user: null,
    body: {}
  });
  assert.equal(result.nextError.statusCode, 401);

  result = await invoke(createCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    body: { name: 'Generic', isGeneric: true }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(createCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    body: { name: 'Sides', isGeneric: false, restaurantId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(updateCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: 'bad-id' },
    body: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(updateCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    body: { name: 'Updated', isActive: false }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(deleteCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(reorderCategories, {
    user: { role: 'admin', id: userId, restaurantId },
    body: [{ id: categoryId, order: 1 }, { id: oid(), order: 2 }]
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(bulkReorderCategories, {
    user: { role: 'admin', id: userId, restaurantId },
    headers: { 'x-idempotency-key': 'replay-key' },
    body: { items: [{ id: categoryId, order: 1 }] }
  });
  assert.equal(result.res.statusCode, 200);
  assert.equal(result.res.payload.idempotentReplay, true);

  result = await invoke(bulkReorderCategories, {
    user: { role: 'admin', id: userId, restaurantId },
    headers: { 'x-idempotency-key': 'fresh-key' },
    body: { items: [{ id: categoryId, order: 1 }, { id: oid(), order: 2 }] }
  });
  assert.equal(result.res.statusCode, 200);
  assert.equal(result.res.payload.idempotentReplay, false);
  savedIdempotency = await getRedisJson(
    `idempotency:category_reorder:${userId}:fresh-key`
  );
  assert.ok(savedIdempotency);

  result = await invoke(checkCategorySlug, {
    user: { role: 'admin', id: userId, restaurantId },
    body: { slug: 'new-category', isGeneric: false, restaurantId }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getCategoryAuditLogs, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    query: { sort: 'asc' }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getDeletedCategories, {
    user: { role: 'superAdmin', id: userId },
    query: { restaurantId, search: 'cat' }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(exportCategories, {
    user: { role: 'superAdmin', id: userId },
    query: { format: 'csv', restaurantId, includeInactive: 'true' }
  });
  assert.equal(result.res.statusCode, 200);
  assert.match(result.res.sentBody, /name,slug/is);

  result = await invoke(getCategories, {
    query: { restaurantId, search: 'cat', sort: 'asc' }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getMyCategories, {
    user: { role: 'admin', restaurantId },
    query: {}
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getCategoryById, {
    user: { role: 'admin', restaurantId },
    params: { id: categoryId }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(updateCategoryStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    body: { isActive: false }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(restoreCategory, {
    user: { role: 'superAdmin', id: userId },
    params: { id: categoryId }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getAllCategories, {
    query: { search: 'cat' }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(bulkUpdateCategoryStatus, {
    user: { role: 'superAdmin', id: userId },
    body: { ids: [categoryId, oid()], status: 'published' }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(hardDeleteCategory, {
    user: { role: 'superAdmin', id: userId },
    params: { id: categoryId }
  });
  assert.equal(result.res.statusCode, 200);
});

test('menu controller covers create, item lifecycle, reorder, status, restore, audit, and delete branches', async () => {
  const restaurantId = oid();
  const categoryId = oid();
  const menuId = oid();
  const userId = oid();
  const menuDoc = makeMenuDoc({ _id: menuId, restaurantId, categoryId });

  patch(Restaurant, 'findById', (id) => query({ _id: id, status: 'published', isActive: true }));
  patch(Category, 'findById', (id) => query({ _id: id, restaurantId, isGeneric: false, isActive: true, status: 'published' }));
  patch(Menu, 'findOne', () => query(null));
  patch(Menu, 'findById', (id) => query(String(id) === String(menuId) ? menuDoc : null));
  patch(Menu, 'findByIdAndDelete', () => query(menuDoc));
  patch(Menu, 'find', () => query([menuDoc]));
  patch(Menu, 'countDocuments', () => countQuery(1));
  patch(AuditLog, 'countDocuments', async () => 1);
  patch(AuditLog, 'find', () => query([{ action: 'UPDATE' }]));
  patch(Menu.prototype, 'save', async function save() { return this; });
  patch(Menu.collection, 'findOne', async () => ({ _id: new mongoose.Types.ObjectId(menuId), isActive: false, restaurantId }));
  patch(Menu.collection, 'updateOne', async () => ({ acknowledged: true }));

  let result = await invoke(createMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    body: { restaurantId: 'bad-id', categoryId }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(addMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { name: 'Burger', price: -1 }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(updateMenuItem, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId, itemId: String(menuDoc.items[0]._id) },
    body: { price: 30, description: 'updated' }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(deleteMenuItem, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId, itemId: String(menuDoc.items[1]._id) }
  });
  assert.equal(result.res.statusCode, 200);

  menuDoc.items[0].isActive = true;
  result = await invoke(toggleItemAvailability, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId, itemId: String(menuDoc.items[0]._id) }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(reorderMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: {
      order: menuDoc.items
        .filter((item) => item.isActive)
        .map((item, index) => ({ itemId: String(item._id), order: index + 1 }))
    }
  });
  assert.equal(result.res.statusCode, 200);

  menuDoc.items.forEach((item) => {
    item.isActive = true;
    item.isAvailable = true;
  });
  result = await invoke(updateMenuStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { status: 'published' }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(deleteMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(restoreMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getMenuById, {
    user: { role: 'admin', restaurantId },
    params: { menuId }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getDeletedMenus, {
    user: { role: 'superAdmin', restaurantId },
    query: { restaurantId, search: 'one' }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getMenuAuditLogs, {
    user: { role: 'admin', restaurantId },
    params: { menuId },
    query: { actorId: 'bad-id', from: '2026-01-01', to: '2026-01-31' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getMenuAuditLogs, {
    user: { role: 'admin', restaurantId },
    params: { menuId },
    query: { sort: 'asc' }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(hardDeleteMenu, {
    user: { role: 'superAdmin', id: userId },
    params: { menuId }
  });
  assert.equal(result.res.statusCode, 200);
});

test('restaurant controller covers create, validation, lifecycle, listing, summary, and public branches', async () => {
  const restaurantId = oid();
  const adminId = oid();
  const newAdminId = oid();
  const userId = oid();
  const restaurant = {
    _id: restaurantId,
    name: 'Demo',
    slug: 'demo',
    adminId,
    status: 'draft',
    isActive: false,
    address: { city: 'City', areaLocality: 'Area' },
    openingHours: [],
    toString() {
      return restaurantId;
    }
  };

  patch(Restaurant, 'findOne', () => query(null));
  patch(Restaurant, 'create', async ([payload]) => [{ ...payload, _id: restaurantId }]);
  patch(User, 'findById', (id) => {
    if (String(id) === String(adminId)) return query({ _id: adminId, role: 'admin', restaurantId: null });
    if (String(id) === String(newAdminId)) return query({ _id: newAdminId, role: 'admin', restaurantId: null });
    return query({ _id: userId, role: 'admin', restaurantId: null });
  });
  patch(User, 'findByIdAndUpdate', async () => ({}));
  patch(Restaurant, 'countDocuments', async () => 1);
  patch(Restaurant, 'find', () => query([{ ...restaurant, openingHours: [] }]));
  patch(Restaurant, 'findById', (id) => query(String(id) === String(restaurantId) ? restaurant : null));
  patch(Restaurant, 'findByIdAndUpdate', () => query({ ...restaurant, status: 'published', isActive: true, _id: restaurantId }));
  patch(Category, 'countDocuments', async () => 1);
  patch(Restaurant, 'aggregate', async () => [{ ...restaurant, openingHours: [] }]);
  patch(Menu, 'countDocuments', async () => 2);
  patch(User, 'countDocuments', async () => 3);
  patch(Menu, 'find', () => query([{ restaurantId }]));

  let result = await invoke(create, {
    user: { role: 'admin', id: userId },
    body: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(create, {
    user: { role: 'admin', id: userId },
    body: {
      name: 'Demo',
      address: { city: 'City', addressLine1: 'Line' },
      contactNumber: '123',
      email: 'bad'
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(create, {
    user: { role: 'admin', id: userId },
    body: {
      name: 'Demo',
      address: { city: 'City', addressLine1: 'Line' },
      contactNumber: '123',
      email: 'demo@example.com',
      isFeatured: true,
      location: { lat: 1, lng: 2 }
    }
  });
  assert.equal(result.nextError.statusCode, 403);

  const badAdminId = oid();
  patch(User, 'findById', (id) => {
    if (String(id) === String(badAdminId)) {
      return query({ _id: badAdminId, role: 'customer', restaurantId: null });
    }
    if (String(id) === String(adminId)) {
      return query({ _id: adminId, role: 'admin', restaurantId: null });
    }
    if (String(id) === String(newAdminId)) {
      return query({ _id: newAdminId, role: 'admin', restaurantId: null });
    }
    return query({ _id: userId, role: 'admin', restaurantId: null });
  });
  result = await invoke(create, {
    user: { role: 'superAdmin', id: userId },
    body: {
      name: 'Demo',
      address: { city: 'City', addressLine1: 'Line' },
      contactNumber: '123',
      email: 'demo@example.com',
      adminId: badAdminId,
      location: { lat: 1, lng: 2 }
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getAllRestaurants, {
    query: { page: 0, limit: 10 }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getAllRestaurants, {
    query: { q: 'demo', page: 1, limit: 10 }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getRestaurantById, {
    params: { id: restaurantId }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(updateRestaurantStatus, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId },
    body: { status: 'invalid' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findById', () => query({ ...restaurant, status: 'draft' }));
  result = await invoke(updateRestaurantStatus, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId },
    body: { status: 'published' }
  });
  assert.equal(result.res.statusCode, 200);

  patch(Restaurant, 'findById', () => query(restaurant));
  result = await invoke(updateRestaurant, {
    user: { id: userId, role: 'admin' },
    params: { id: restaurantId },
    body: { slug: 'forbidden' }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(updateRestaurant, {
    user: { id: userId, role: 'admin' },
    params: { id: restaurantId },
    body: { name: 'Renamed', categories: [oid()] }
  });
  assert.equal(result.res.statusCode, 200);

  patch(Restaurant, 'findById', () => query({ ...restaurant, status: 'blocked', isActive: false }));
  result = await invoke(deleteRestaurant, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findById', () => query({ ...restaurant, status: 'draft', isActive: true }));
  result = await invoke(deleteRestaurant, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId }
  });
  assert.equal(result.res.statusCode, 200);

  patch(Restaurant, 'findById', () => ({
    setOptions() {
      return this;
    },
    session() {
      return this;
    },
    async lean() {
      return { ...restaurant, status: 'blocked', isActive: false };
    }
  }));
  result = await invoke(restoreRestaurant, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(reassignRestaurantAdmin, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId },
    body: { newAdminId }
  });
  assert.equal(result.res.statusCode, 200);

  patch(Restaurant, 'findById', () => query(restaurant));
  result = await invoke(getMyRestaurant, {
    user: { id: userId, restaurantId }
  });
  assert.equal(result.nextError.statusCode, 403);

  patch(Restaurant, 'findById', () => ({
    select() {
      return Promise.resolve({ ...restaurant, adminId: { toString: () => adminId } });
    }
  }));
  result = await invoke(getMyRestaurant, {
    user: { id: adminId, restaurantId }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getNearByRestaurants, {
    query: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getNearByRestaurants, {
    query: { lat: '12.9', lng: '77.5', radius: '1000' }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(listRestaurants, {
    query: { city: 'City', isFeatured: 'true', q: 'demo', page: 1, limit: 10 }
  });
  assert.equal(result.res.statusCode, 200);

  patch(Restaurant, 'findOne', () => ({
    populate() {
      return this;
    },
    async lean() {
      return restaurant;
    }
  }));
  result = await invoke(getRestaurantDetails, {
    params: { slug: 'demo' }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getFeaturedRestaurants, {
    query: { page: 1, limit: 10 }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getTrendingRestaurants, {
    query: { page: 1, limit: 10 }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getAdminRestaurantSummary, {
    user: { restaurantId }
  });
  assert.equal(result.res.statusCode, 200);
});
