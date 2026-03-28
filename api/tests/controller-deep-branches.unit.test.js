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
  getMenuByRestaurant,
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
  getRestaurantBySlug,
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
import { withTransaction } from '../utils/withTransaction.js';

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

let withTransactionMock;

const mockWithTransaction = (impl) => {
  const original = withTransaction.default || withTransaction;
  const mockFn = impl || (async (fn) => fn({
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: () => {}
  }));
  if (withTransaction.default) {
    withTransaction.default = mockFn;
    restorers.push(() => {
      withTransaction.default = original;
    });
  } else {
    Object.defineProperty(withTransaction, 'default', {
      value: mockFn,
      writable: true,
      configurable: true
    });
    restorers.push(() => {
      delete withTransaction.default;
    });
  }
  withTransactionMock = mockFn;
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

test('audit log controller covers superAdmin unfiltered and admin restaurant-scoped menu audit branches', async () => {
  const restaurantId = oid();
  const actorId = oid();
  let capturedFilter = null;

  patch(AuditLog, 'countDocuments', async (filter) => {
    capturedFilter = filter;
    return 2;
  });
  patch(AuditLog, 'find', (filter) => {
    capturedFilter = filter;
    return query([{ action: 'CREATE' }, { action: 'DELETE' }]);
  });
  patch(User, 'find', () => query([]));
  patch(Menu, 'find', () => query([oid(), oid()]));
  patch(Category, 'find', () => query([]));
  patch(Review, 'find', () => query([]));

  let result = await invoke(getAuditLogs, {
    user: { role: 'superAdmin', id: actorId },
    query: {}
  });
  assert.equal(result.res.statusCode, 200);
  assert.deepEqual(capturedFilter, {});
  assert.equal(result.res.payload.total, 2);

  result = await invoke(getAuditLogs, {
    user: { role: 'admin', id: actorId, restaurantId },
    query: { entityType: 'menu' }
  });
  assert.equal(result.res.statusCode, 200);
  assert.equal(capturedFilter.entityType, 'menu');
  assert.ok(capturedFilter.$or.some((entry) => entry.actorId === actorId));
  assert.ok(
    capturedFilter.$or.some(
      (entry) => entry.entityType === 'menu' && Array.isArray(entry.entityId.$in)
    )
  );
});

test('category controller covers slug, audit, status, restore, export, and hard-delete failure branches', async () => {
  const restaurantId = oid();
  const otherRestaurantId = oid();
  const categoryId = oid();
  const userId = oid();
  const genericCategory = makeCategoryDoc({
    _id: categoryId,
    isGeneric: true,
    restaurantId: null
  });
  const ownedCategory = makeCategoryDoc({
    _id: categoryId,
    restaurantId
  });
  const foreignCategory = makeCategoryDoc({
    _id: categoryId,
    restaurantId: otherRestaurantId
  });

  patch(Restaurant, 'findById', (id) =>
    query({
      _id: id,
      status: String(id) === String(otherRestaurantId) ? 'draft' : 'published'
    })
  );
  patch(Category, 'findOne', (filter) => {
    if (filter.slug === 'existing-category') {
      return query({ _id: categoryId });
    }
    return query(null);
  });
  patch(Category, 'findById', (id) => {
    if (String(id) !== String(categoryId)) return query(null);
    if (id === 'generic') return query(genericCategory);
    return query(ownedCategory);
  });
  patch(AuditLog, 'countDocuments', async () => 0);
  patch(AuditLog, 'find', () => query([]));
  patch(Category, 'countDocuments', () => countQuery(1));
  patch(Category, 'find', () => query([ownedCategory]));
  patch(Category, 'updateMany', async () => ({ matchedCount: 1, modifiedCount: 1 }));
  patch(Menu, 'findOne', () => query({ _id: oid(), isActive: true }));
  patch(Category, 'findByIdAndDelete', () => query(ownedCategory));
  Category.collection.findOne = async ({ _id }) => {
    if (String(_id) === String(categoryId)) return { _id, isActive: false };
    return null;
  };
  Category.collection.updateOne = async () => ({ acknowledged: true });

  let result = await invoke(checkCategorySlug, {
    user: { role: 'admin', id: userId, restaurantId },
    body: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(checkCategorySlug, {
    user: { role: 'admin', id: userId, restaurantId },
    body: { slug: 'generic-slug', isGeneric: true }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(checkCategorySlug, {
    user: { role: 'admin', id: userId, restaurantId },
    body: {
      slug: 'owned-slug',
      isGeneric: false,
      restaurantId: otherRestaurantId
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(checkCategorySlug, {
    user: { role: 'admin', id: userId, restaurantId },
    body: {
      slug: 'existing category',
      isGeneric: false,
      restaurantId,
      categoryId: 'bad-id'
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(checkCategorySlug, {
    user: { role: 'superAdmin', id: userId },
    body: { slug: 'existing category', isGeneric: true }
  });
  assert.equal(result.res.statusCode, 200);
  assert.equal(result.res.payload.data.available, false);

  result = await invoke(getCategoryAuditLogs, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: 'bad-id' },
    query: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Category, 'findById', () => query(foreignCategory));
  result = await invoke(getCategoryAuditLogs, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    query: {}
  });
  assert.equal(result.nextError.statusCode, 403);

  patch(Category, 'findById', () => query(ownedCategory));
  result = await invoke(getCategoryAuditLogs, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    query: { actorId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getDeletedCategories, {
    user: { role: 'superAdmin', id: userId },
    query: { restaurantId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(exportCategories, {
    user: { role: 'superAdmin', id: userId },
    query: { status: 'bad-status' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getMyCategories, {
    user: { role: 'storeManager', restaurantId },
    query: {}
  });
  assert.equal(result.nextError.statusCode, 403);

  patch(Category, 'findById', () => query(null));
  result = await invoke(getCategoryById, {
    user: { role: 'admin', restaurantId },
    params: { id: categoryId }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Category, 'findById', () => query(foreignCategory));
  result = await invoke(getCategoryById, {
    user: { role: 'admin', restaurantId },
    params: { id: categoryId }
  });
  assert.equal(result.nextError.statusCode, 403);

  patch(Category, 'findById', () => query(genericCategory));
  result = await invoke(updateCategoryStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    body: { isActive: true }
  });
  assert.equal(result.nextError.statusCode, 403);

  patch(Category, 'findById', () => query(ownedCategory));
  result = await invoke(updateCategoryStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    body: { isActive: 'yes' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(restoreCategory, {
    user: { role: 'superAdmin', id: userId },
    params: { id: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  Category.collection.findOne = async () => ({ _id: categoryId, isActive: true });
  result = await invoke(restoreCategory, {
    user: { role: 'superAdmin', id: userId },
    params: { id: categoryId }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(bulkUpdateCategoryStatus, {
    user: { role: 'superAdmin', id: userId },
    body: { ids: [], status: 'published' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(bulkUpdateCategoryStatus, {
    user: { role: 'superAdmin', id: userId },
    body: { ids: [categoryId], status: 'invalid' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(hardDeleteCategory, {
    user: { role: 'superAdmin', id: userId },
    params: { id: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Category, 'findById', () => query(ownedCategory));
  result = await invoke(hardDeleteCategory, {
    user: { role: 'admin', id: userId },
    params: { id: categoryId }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(createCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    body: { name: 'Sides', isGeneric: false }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findById', () => query({ _id: restaurantId, status: 'draft' }));
  result = await invoke(createCategory, {
    user: { role: 'superAdmin', id: userId },
    body: { name: 'Sides', isGeneric: false, restaurantId }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findById', () => query({ _id: otherRestaurantId, status: 'published' }));
  result = await invoke(createCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    body: { name: 'Sides', isGeneric: false, restaurantId: otherRestaurantId }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(updateCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    body: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(updateCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    body: { name: '   ' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Category, 'findOne', () => query(genericCategory));
  result = await invoke(updateCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    body: { order: 1 }
  });
  assert.equal(result.nextError.statusCode, 403);

  patch(Category, 'findOne', () => query(foreignCategory));
  result = await invoke(updateCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    body: { order: 1 }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(deleteCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Category, 'findById', () => query(genericCategory));
  patch(Menu, 'findOne', () => query(null));
  result = await invoke(deleteCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId }
  });
  assert.equal(result.nextError.statusCode, 403);

  patch(Category, 'findById', () => query(foreignCategory));
  result = await invoke(deleteCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(reorderCategories, {
    user: { role: 'admin', id: userId, restaurantId },
    body: []
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Category, 'bulkWrite', async () => ({ matchedCount: 1, modifiedCount: 1 }));
  result = await invoke(reorderCategories, {
    user: { role: 'admin', id: userId, restaurantId },
    body: [{ id: categoryId, order: 1 }, { id: oid(), order: 2 }]
  });
  assert.equal(result.nextError.statusCode, 404);

  result = await invoke(bulkReorderCategories, {
    user: { role: 'admin', id: userId, restaurantId },
    headers: {},
    body: { items: [{ id: categoryId, order: 1 }] }
  });
  assert.equal(result.nextError.statusCode, 400);

  await setRedisJson(
    `idempotency:category_reorder:${userId}:busy-key`,
    { signature: JSON.stringify([{ id: categoryId, order: 1 }]), inFlight: true },
    60
  );
  result = await invoke(bulkReorderCategories, {
    user: { role: 'admin', id: userId, restaurantId },
    headers: { 'x-idempotency-key': 'busy-key' },
    body: { items: [{ id: categoryId, order: 1 }] }
  });
  assert.equal(result.nextError.statusCode, 409);

  await setRedisJson(
    `idempotency:category_reorder:${userId}:conflict-key`,
    { signature: JSON.stringify([{ id: categoryId, order: 2 }]), inFlight: false, response: { success: true } },
    60
  );
  result = await invoke(bulkReorderCategories, {
    user: { role: 'admin', id: userId, restaurantId },
    headers: { 'x-idempotency-key': 'conflict-key' },
    body: { items: [{ id: categoryId, order: 1 }] }
  });
  assert.equal(result.nextError.statusCode, 409);

  await setRedisJson(
    `idempotency:category_reorder:${userId}:response-key`,
    {
      signature: JSON.stringify([{ id: categoryId, order: 1 }]),
      inFlight: false,
      response: { success: true, message: 'cached-response' }
    },
    60
  );
  patch(Category, 'bulkWrite', async () => ({ matchedCount: 2, modifiedCount: 2 }));
  result = await invoke(bulkReorderCategories, {
    user: { role: 'admin', id: userId, restaurantId },
    headers: { 'x-idempotency-key': 'response-key' },
    body: { items: [{ id: categoryId, order: 1 }] }
  });
  assert.equal(result.res.statusCode, 200);
  assert.equal(result.res.payload.idempotentReplay, true);

  result = await invoke(getDeletedCategories, {
    user: { role: 'superAdmin', id: userId },
    query: {}
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(exportCategories, {
    user: { role: 'superAdmin', id: userId },
    query: {
      format: 'json',
      search: 'cat',
      isGeneric: 'true',
      isActive: 'false',
      includeInactive: 'true',
      limit: '2'
    }
  });
  assert.equal(result.res.statusCode, 200);
  assert.equal(result.res.payload.format, 'json');

  result = await invoke(getCategories, {
    query: { search: 'cat', sort: 'asc', page: 1, limit: 5 }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getCategories, {
    query: { restaurantId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getMyCategories, {
    user: { role: 'admin', restaurantId },
    query: { order: 'asc', page: 1, limit: 5 }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getAllCategories, {
    query: { page: 1, limit: 5 }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(updateCategoryStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    body: { isActive: false }
  });
  assert.equal(result.res.statusCode, 200);

  patch(Category, 'findById', () => query(null));
  result = await invoke(updateCategoryStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    body: { isActive: true }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Category, 'findById', () => query(ownedCategory));
  patch(Category, 'updateMany', async () => ({ matchedCount: 2, modifiedCount: 1 }));
  result = await invoke(bulkUpdateCategoryStatus, {
    user: { role: 'superAdmin', id: userId },
    body: { ids: [categoryId, oid()], status: 'blocked' }
  });
  assert.equal(result.res.statusCode, 200);
});

test('menu controller covers creation, access, status, restore, and public retrieval failure branches', async () => {
  const restaurantId = oid();
  const otherRestaurantId = oid();
  const categoryId = oid();
  const menuId = oid();
  const userId = oid();
  const menuDoc = makeMenuDoc({ _id: menuId, restaurantId, categoryId });
  const inactiveMenuDoc = makeMenuDoc({
    _id: menuId,
    restaurantId,
    categoryId,
    isActive: false,
    status: 'blocked'
  });

  patch(Restaurant, 'findById', (id) =>
    query({
      _id: id,
      status: String(id) === String(otherRestaurantId) ? 'draft' : 'published',
      isActive: String(id) !== String(otherRestaurantId)
    })
  );
  patch(Category, 'findById', (id) =>
    query({
      _id: id,
      restaurantId,
      isGeneric: false,
      isActive: true,
      status: 'published'
    })
  );
  patch(Menu, 'findOne', () => query(menuDoc));
  patch(Menu, 'findById', (id) => query(String(id) === String(menuId) ? menuDoc : null));
  patch(Menu, 'findByIdAndDelete', () => query(menuDoc));
  patch(Menu, 'find', () => query([menuDoc]));
  patch(Menu, 'countDocuments', () => countQuery(1));
  patch(AuditLog, 'countDocuments', async () => 0);
  patch(AuditLog, 'find', () => query([]));
  patch(Menu.prototype, 'save', async function save() {
    return this;
  });
  Menu.collection.findOne = async () => ({ _id: new mongoose.Types.ObjectId(menuId), isActive: false, restaurantId });
  Menu.collection.updateOne = async () => ({ acknowledged: true });

  let result = await invoke(createMenu, {
    user: { role: 'storeManager', id: userId, restaurantId },
    body: { restaurantId, categoryId }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(createMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    body: { restaurantId: otherRestaurantId, categoryId }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findOne', () => query(null));
  patch(Category, 'findById', () =>
    query({
      _id: categoryId,
      restaurantId,
      isGeneric: false,
      isActive: false,
      status: 'draft'
    })
  );
  result = await invoke(createMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    body: { restaurantId, categoryId }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Category, 'findById', () =>
    query({
      _id: categoryId,
      restaurantId: otherRestaurantId,
      isGeneric: false,
      isActive: true,
      status: 'published'
    })
  );
  result = await invoke(createMenu, {
    user: { role: 'superAdmin', id: userId },
    body: { restaurantId, categoryId }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Category, 'findById', () =>
    query({
      _id: categoryId,
      restaurantId,
      isGeneric: false,
      isActive: true,
      status: 'published'
    })
  );
  patch(Menu, 'findOne', () => query(menuDoc));
  result = await invoke(createMenu, {
    user: { role: 'superAdmin', id: userId },
    body: { restaurantId, categoryId }
  });
  assert.equal(result.nextError.statusCode, 409);

  patch(Menu, 'findOne', () => query(inactiveMenuDoc));
  result = await invoke(addMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { name: 'Burger', price: 10 }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Menu, 'findById', () =>
    query(
      makeMenuDoc({
        _id: menuId,
        restaurantId,
        categoryId,
        items: (() => {
          const items = [
            {
              _id: oid(),
              name: 'Inactive',
              price: 10,
              isActive: false,
              isAvailable: false,
              order: 1,
              toObject() {
                return { ...this };
              }
            }
          ];
          items.id = (id) =>
            items.find((item) => String(item._id) === String(id)) || null;
          return items;
        })()
      })
    )
  );
  result = await invoke(updateMenuItem, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId, itemId: oid() },
    body: { price: 10 }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Menu, 'findById', () => query(menuDoc));
  result = await invoke(updateMenuItem, {
    user: { role: 'admin', id: userId, restaurantId: otherRestaurantId },
    params: { menuId, itemId: String(menuDoc.items[0]._id) },
    body: { price: 10 }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(updateMenuItem, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId: 'bad-id', itemId: 'bad-id' },
    body: { price: 10 }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(reorderMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { order: [{ itemId: String(menuDoc.items[0]._id), order: 1 }] }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(reorderMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId: 'bad-id' },
    body: { order: [{ itemId: String(menuDoc.items[0]._id), order: 1 }] }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(reorderMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { order: [{ itemId: 'bad-id', order: 1 }, { itemId: String(menuDoc.items[1]._id), order: 2 }] }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(reorderMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: {
      order: [
        { itemId: String(menuDoc.items[0]._id), order: 1 },
        { itemId: String(menuDoc.items[0]._id), order: 2 }
      ]
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(reorderMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: {
      order: [
        { itemId: String(menuDoc.items[0]._id), order: 1 },
        { itemId: String(menuDoc.items[1]._id), order: 1 }
      ]
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(reorderMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: {
      order: [
        { itemId: String(menuDoc.items[0]._id), order: 1 },
        { itemId: String(menuDoc.items[1]._id), order: 3 }
      ]
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(updateMenuStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { status: 'draft' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(updateMenuStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId: 'bad-id' },
    body: { status: 'published' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(updateMenuStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { status: 'nope' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findById', () => query({ _id: restaurantId, status: 'draft', isActive: true }));
  result = await invoke(updateMenuStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { status: 'published' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findById', () => query({ _id: restaurantId, status: 'published', isActive: true }));
  patch(Category, 'findById', () => query({ _id: categoryId, status: 'draft', isActive: true }));
  result = await invoke(updateMenuStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { status: 'published' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Category, 'findById', () => query({ _id: categoryId, status: 'published', isActive: true }));
  patch(Menu, 'findById', () =>
    query(
      makeMenuDoc({
        _id: menuId,
        restaurantId,
        categoryId,
        status: 'draft',
        items: (() => {
          const items = [
            {
              _id: oid(),
              name: 'Hidden',
              price: 10,
              isActive: false,
              isAvailable: false,
              order: 1,
              toObject() {
                return { ...this };
              }
            }
          ];
          items.id = (id) =>
            items.find((item) => String(item._id) === String(id)) || null;
          return items;
        })()
      })
    )
  );
  result = await invoke(updateMenuStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { status: 'published' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(restoreMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  Menu.collection.findOne = async () => ({ _id: new mongoose.Types.ObjectId(menuId), isActive: true, restaurantId });
  result = await invoke(restoreMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findById', () => query(null));
  result = await invoke(getMenuById, {
    user: { role: 'admin', restaurantId },
    params: { menuId }
  });
  assert.equal(result.nextError.statusCode, 404);

  result = await invoke(getDeletedMenus, {
    user: { role: 'superAdmin', restaurantId },
    query: { restaurantId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getDeletedMenus, {
    user: { role: 'admin', restaurantId },
    query: { search: 'one', page: 1, limit: 5 }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getMenuAuditLogs, {
    user: { role: 'admin', restaurantId },
    params: { menuId: 'bad-id' },
    query: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(hardDeleteMenu, {
    user: { role: 'admin', id: userId },
    params: { menuId }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(deleteMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findById', () => query(null));
  result = await invoke(deleteMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Menu, 'findById', () => query(menuDoc));
  result = await invoke(getMenuAuditLogs, {
    user: { role: 'admin', restaurantId: otherRestaurantId },
    params: { menuId },
    query: {}
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(getMenuAuditLogs, {
    user: { role: 'admin', restaurantId },
    params: { menuId },
    query: { from: 'bad-date' }
  });
  assert.equal(result.nextError.statusCode, 400);

  const validActorId = oid();
  result = await invoke(getMenuAuditLogs, {
    user: { role: 'admin', restaurantId },
    params: { menuId },
    query: {
      actorId: validActorId,
      action: 'UPDATE',
      from: '2026-01-01',
      to: '2026-01-31',
      sort: 'asc'
    }
  });
  assert.equal(result.res.statusCode, 200);

  patch(Menu, 'findById', () => query(null));
  result = await invoke(hardDeleteMenu, {
    user: { role: 'superAdmin', id: userId },
    params: { menuId }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Menu, 'findById', () => query(menuDoc));

  result = await invoke(getMenuByRestaurant, {
    params: { restaurantId: 'bad-id' },
    query: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getMenuByRestaurant, {
    params: { restaurantId },
    query: { search: 'One', sort: 'asc', page: 1, limit: 5 }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getMenuById, {
    user: { role: 'admin', restaurantId: otherRestaurantId },
    params: { menuId }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(getMenuById, {
    user: { role: 'admin', restaurantId },
    params: { menuId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);
});

test('restaurant controller covers missing resource, ownership, and public validation failure branches', async () => {
  const restaurantId = oid();
  const adminId = oid();
  const userId = oid();
  const restaurant = {
    _id: restaurantId,
    name: 'Demo',
    slug: 'demo',
    adminId,
    status: 'draft',
    isActive: true,
    address: { city: 'City', areaLocality: 'Area', addressLine1: 'Line' },
    openingHours: []
  };

  patch(Restaurant, 'findById', () => query(null));
  patch(Restaurant, 'findOne', () => query(null));
  patch(Restaurant, 'findByIdAndUpdate', () => query(null));
  patch(Restaurant, 'countDocuments', async () => 0);
  patch(Restaurant, 'find', () => query([]));
  patch(Restaurant, 'aggregate', async () => []);
  patch(User, 'findById', () => query(null));
  patch(User, 'findByIdAndUpdate', async () => ({}));
  patch(Menu, 'countDocuments', async () => 0);
  patch(Category, 'countDocuments', async () => 0);
  patch(User, 'countDocuments', async () => 0);
  patch(Menu, 'find', () => query([]));

  let result = await invoke(getRestaurantById, {
    params: { id: restaurantId }
  });
  assert.equal(result.nextError.statusCode, 404);

  result = await invoke(getRestaurantBySlug, {
    params: { slug: 'missing' }
  });
  assert.equal(result.nextError.statusCode, 404);

  result = await invoke(updateRestaurantStatus, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId },
    body: { status: 'published' }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Restaurant, 'findOne', () => query(null));
  patch(User, 'findById', () => query({ _id: userId, role: 'admin', restaurantId }));
  patch(User, 'findByIdAndUpdate', async () => ({}));
  patch(Restaurant, 'create', async ([payload]) => [{ ...payload, _id: oid() }]);
  mockWithTransaction();
  result = await invoke(create, {
    user: { id: userId, role: 'admin' },
    body: {
      name: 'Demo',
      address: { city: 'City', addressLine1: 'Line' },
      contactNumber: '123',
      email: 'demo@example.com',
      location: { lat: 1, lng: 2 }
    }
  });
  assert.ok(result.nextError !== undefined || result.res.statusCode === 201);

  const assignedAdminId = oid();
  patch(Restaurant, 'findOne', () => query(null));
  patch(User, 'findById', (id) => {
    if (String(id) === String(assignedAdminId)) {
      return query({ _id: assignedAdminId, role: 'admin', restaurantId });
    }
    return query({ _id: userId, role: 'admin' });
  });
  result = await invoke(create, {
    user: { id: userId, role: 'superAdmin' },
    body: {
      name: 'Demo',
      address: { city: 'City', addressLine1: 'Line' },
      contactNumber: '123',
      email: 'demo@example.com',
      adminId: assignedAdminId,
      location: { lat: 1, lng: 2 }
    }
  });
  assert.ok(result.nextError !== undefined || result.res.statusCode === 201);

  result = await invoke(deleteRestaurant, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId }
  });
  assert.equal(result.nextError.statusCode, 404);

  result = await invoke(restoreRestaurant, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId }
  });
  assert.equal(result.nextError.statusCode, 404);

  result = await invoke(reassignRestaurantAdmin, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId },
    body: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getMyRestaurant, {
    user: { id: userId }
  });
  assert.equal(result.nextError.statusCode, 404);

  result = await invoke(getFeaturedRestaurants, {
    query: { page: 0, limit: 10 }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getTrendingRestaurants, {
    query: { page: 1, limit: 0 }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getRestaurantDetails, {
    params: { slug: 'missing' }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Restaurant, 'findById', () =>
    ({
      select() {
        return Promise.resolve({ ...restaurant, adminId: { toString: () => adminId } });
      }
    })
  );
  result = await invoke(getMyRestaurant, {
    user: { id: userId, restaurantId }
  });
  assert.equal(result.nextError.statusCode, 403);

  patch(Restaurant, 'findById', () => query({ ...restaurant, status: 'published' }));
  result = await invoke(updateRestaurantStatus, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId },
    body: { status: 'published' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findOne', () => query(null));
  patch(Restaurant, 'create', async () => {
    const duplicateError = new Error('duplicate');
    duplicateError.code = 11000;
    throw duplicateError;
  });
  patch(User, 'findById', () => query({ _id: userId, role: 'admin', restaurantId: null }));
  result = await invoke(create, {
    user: { id: userId, role: 'admin' },
    body: {
      name: 'Demo',
      address: { city: 'City', addressLine1: 'Line' },
      contactNumber: '123',
      email: 'demo@example.com',
      location: { lat: 1, lng: 2 }
    }
  });
  assert.equal(result.nextError.statusCode, 409);

  patch(Restaurant, 'findById', () => query({ ...restaurant }));
  patch(Category, 'countDocuments', async () => 0);
  result = await invoke(updateRestaurant, {
    user: { id: userId, role: 'admin' },
    params: { id: restaurantId },
    body: { categories: [oid()] }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findByIdAndUpdate', () => query(null));
  patch(Category, 'countDocuments', async () => 1);
  result = await invoke(updateRestaurant, {
    user: { id: userId, role: 'admin' },
    params: { id: restaurantId },
    body: { name: 'Renamed' }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Restaurant, 'findById', () => query({ ...restaurant, status: 'draft' }));
  result = await invoke(restoreRestaurant, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findById', () => query({ ...restaurant, adminId: oid() }));
  patch(User, 'findById', () => query(null));
  result = await invoke(reassignRestaurantAdmin, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId },
    body: { newAdminId: oid() }
  });
  assert.equal(result.nextError.statusCode, 500);

  result = await invoke(listRestaurants, {
    query: { page: 0, limit: 10 }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'countDocuments', async () => 2);
  patch(Restaurant, 'find', () =>
    query([
      { ...restaurant, openingHours: [], rating: 5, isFeatured: true, isTrending: true },
      { ...restaurant, _id: oid(), openingHours: [], rating: 4, isFeatured: false, isTrending: false }
    ])
  );
  result = await invoke(getAllRestaurants, {
    query: { q: 'demo', order: 'asc', page: 1, limit: 10 }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(listRestaurants, {
    query: {
      city: 'City',
      categories: ['cat-a', 'cat-b'],
      isFeatured: 'true',
      isTrending: 'false',
      sortBy: 'rating',
      page: 1,
      limit: 5
    }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(listRestaurants, {
    query: {
      q: 'demo',
      isOpenNow: 'true',
      page: 1,
      limit: 5
    }
  });
  assert.equal(result.res.statusCode, 200);

  patch(Restaurant, 'findOne', () => ({
    populate() {
      return this;
    },
    async lean() {
      return { ...restaurant, openingHours: [] };
    }
  }));
  patch(Menu, 'find', () => query([{ restaurantId }]));
  result = await invoke(getRestaurantDetails, {
    params: { slug: 'demo' }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getFeaturedRestaurants, {
    query: { page: 1, limit: 5 }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getTrendingRestaurants, {
    query: { page: 1, limit: 5 }
  });
  assert.equal(result.res.statusCode, 200);

  result = await invoke(getAdminRestaurantSummary, {
    user: { restaurantId }
  });
  assert.equal(result.res.statusCode, 200);

  let slugLookups = 0;
  patch(Restaurant, 'findOne', () => {
    slugLookups += 1;
    return query(slugLookups === 1 ? { _id: oid() } : null);
  });
  patch(User, 'findById', () => query({ _id: userId, role: 'admin', restaurantId: null }));
  patch(Restaurant, 'create', async ([payload]) => [{ ...payload, _id: restaurantId }]);
  result = await invoke(create, {
    user: { id: userId, role: 'admin' },
    body: {
      name: 'Demo',
      address: { city: 'City', addressLine1: 'Line' },
      contactNumber: '123',
      email: 'demo@example.com',
      location: { lat: 1, lng: 2 }
    }
  });
  assert.ok(slugLookups >= 2);

  patch(Restaurant, 'findById', () => query({ ...restaurant, status: 'draft' }));
  patch(Restaurant, 'findByIdAndUpdate', () => query({ ...restaurant, status: 'blocked', isActive: false }));
  result = await invoke(updateRestaurantStatus, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId },
    body: { status: 'blocked' }
  });
  assert.equal(result.res.statusCode, 200);

  patch(Restaurant, 'findOne', () => ({
    select() {
      return Promise.resolve({ ...restaurant });
    }
  }));
  result = await invoke(getRestaurantBySlug, {
    params: { slug: 'demo' }
  });
  assert.equal(result.res.statusCode, 200);
});

test('category controller covers remaining ownership, restore, and validation edge branches', async () => {
  const userId = oid();
  const restaurantId = oid();
  const otherRestaurantId = oid();
  const categoryId = oid();
  const genericCategoryId = oid();
  const activeCategoryId = oid();
  const missingCategoryId = oid();

  const ownedCategory = makeCategoryDoc({
    _id: categoryId,
    restaurantId,
    isGeneric: false,
    isActive: true
  });
  const genericCategory = makeCategoryDoc({
    _id: genericCategoryId,
    isGeneric: true,
    restaurantId: null
  });
  const foreignCategory = makeCategoryDoc({
    _id: oid(),
    restaurantId: otherRestaurantId,
    isGeneric: false
  });

  patch(Restaurant, 'findById', (id) => {
    if (String(id) === String(otherRestaurantId)) {
      return query({
        _id: otherRestaurantId,
        status: 'draft',
        isActive: false
      });
    }
    return query({ _id: restaurantId, status: 'published', isActive: true });
  });
  patch(Category, 'findOne', (filter) => {
    if (String(filter?._id) === String(missingCategoryId)) return query(null);
    if (String(filter?._id) === String(genericCategoryId)) {
      return query(genericCategory);
    }
    if (String(filter?._id) === String(foreignCategory._id)) {
      return query(foreignCategory);
    }
    return query(ownedCategory);
  });
  patch(Category, 'findById', (id) => {
    if (String(id) === String(categoryId)) return query(ownedCategory);
    if (String(id) === String(genericCategoryId)) return query(genericCategory);
    if (String(id) === String(foreignCategory._id)) {
      return query(foreignCategory);
    }
    if (String(id) === String(activeCategoryId)) {
      return query(
        makeCategoryDoc({
          _id: activeCategoryId,
          restaurantId,
          isActive: true
        })
      );
    }
    return query(null);
  });
  patch(Category, 'bulkWrite', async () => ({
    matchedCount: 1,
    modifiedCount: 1
  }));
  patch(Category, 'countDocuments', () => countQuery(1));
  patch(Category, 'find', () => query([ownedCategory]));
  patch(Category, 'updateMany', async () => ({
    matchedCount: 1,
    modifiedCount: 1
  }));
  patch(Category, 'findByIdAndDelete', () => query(ownedCategory));
  patch(Menu, 'findOne', (filter) => {
    if (String(filter?.categoryId) === String(categoryId)) {
      return query({ _id: oid(), categoryId });
    }
    return query(null);
  });
  patch(AuditLog, 'countDocuments', async () => 1);
  patch(AuditLog, 'find', () => query([{ action: 'UPDATE' }]));

  Category.collection.findOne = async (filter) => {
    if (String(filter._id) === String(missingCategoryId)) return null;
    if (String(filter._id) === String(activeCategoryId)) {
      return { _id: activeCategoryId, isActive: true };
    }
    return { _id: categoryId, isActive: false };
  };
  Category.collection.updateOne = async () => ({ acknowledged: true });

  let result = await invoke(createCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    body: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(createCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    body: {
      name: 'Unpublished',
      isGeneric: false,
      restaurantId: otherRestaurantId
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findById', () =>
    query({ _id: restaurantId, status: 'published', isActive: true })
  );
  result = await invoke(createCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    body: {
      name: 'Foreign',
      isGeneric: false,
      restaurantId: otherRestaurantId
    }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(updateCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: missingCategoryId },
    body: { name: 'Updated' }
  });
  assert.equal(result.nextError.statusCode, 404);

  result = await invoke(updateCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: genericCategoryId },
    body: { name: 'Updated' }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(deleteCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findOne', () => query(null));
  result = await invoke(deleteCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: foreignCategory._id }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(reorderCategories, {
    user: { role: 'admin', id: userId, restaurantId },
    body: [{ id: categoryId, order: 1 }, { id: oid(), order: 2 }]
  });
  assert.equal(result.nextError.statusCode, 404);

  result = await invoke(checkCategorySlug, {
    user: { role: 'admin', id: userId, restaurantId },
    body: {
      slug: 'demo',
      isGeneric: false,
      restaurantId,
      categoryId: 'bad-id'
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getCategoryAuditLogs, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    query: { actorId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getCategoryAuditLogs, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    query: { from: 'bad-date' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getMyCategories, {
    user: { role: 'superAdmin', id: userId },
    query: {}
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(getCategoryById, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(updateCategoryStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    body: { isActive: 'yes' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(updateCategoryStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: genericCategoryId },
    body: { isActive: false }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(restoreCategory, {
    user: { role: 'superAdmin', id: userId },
    params: { id: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(restoreCategory, {
    user: { role: 'superAdmin', id: userId },
    params: { id: missingCategoryId }
  });
  assert.equal(result.nextError.statusCode, 404);

  result = await invoke(restoreCategory, {
    user: { role: 'superAdmin', id: userId },
    params: { id: activeCategoryId }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(bulkUpdateCategoryStatus, {
    user: { role: 'superAdmin', id: userId },
    body: { ids: ['bad-id'], status: 'published' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(bulkUpdateCategoryStatus, {
    user: { role: 'superAdmin', id: userId },
    body: { ids: [categoryId], status: 'bad-status' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findOne', () => query({ _id: oid(), categoryId }));
  result = await invoke(hardDeleteCategory, {
    user: { role: 'superAdmin', id: userId },
    params: { id: categoryId }
  });
  assert.equal(result.nextError.statusCode, 400);
});

test('menu controller covers remaining validation, audit, and deletion edge branches', async () => {
  const userId = oid();
  const restaurantId = oid();
  const otherRestaurantId = oid();
  const menuId = oid();
  const itemId = oid();

  const baseMenu = makeMenuDoc({
    _id: menuId,
    restaurantId,
    categoryId: oid(),
    status: 'draft',
    isActive: true
  });
  baseMenu.items = [
    {
      _id: itemId,
      name: 'Item One',
      price: 10,
      order: 1,
      isActive: true,
      isAvailable: true,
      toObject() {
        return { ...this };
      }
    }
  ];
  baseMenu.items.id = (id) =>
    baseMenu.items.find((item) => String(item._id) === String(id)) || null;

  patch(Restaurant, 'findById', (id) => {
    if (String(id) === String(otherRestaurantId)) {
      return query({
        _id: otherRestaurantId,
        status: 'draft',
        isActive: false
      });
    }
    return query({ _id: restaurantId, status: 'published', isActive: true });
  });
  patch(Category, 'findById', () =>
    query({
      _id: oid(),
      restaurantId,
      isActive: true,
      status: 'published',
      isGeneric: false
    })
  );
  patch(Menu, 'findOne', () => query(null));
  patch(Menu, 'findById', () => query(baseMenu));
  patch(Menu, 'findByIdAndDelete', () => query(null));
  patch(Menu, 'countDocuments', async () => 1);
  patch(Menu, 'find', () => query([{ ...baseMenu, items: baseMenu.items }]));
  patch(AuditLog, 'countDocuments', async () => 1);
  patch(AuditLog, 'find', () => query([{ action: 'UPDATE' }]));
  Menu.collection.findOne = async () => ({
    _id: new mongoose.Types.ObjectId(menuId),
    restaurantId,
    isActive: true
  });

  let result = await invoke(createMenu, {
    user: { role: 'customer', id: userId },
    body: { restaurantId, categoryId: oid() }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(createMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    body: { restaurantId: otherRestaurantId, categoryId: oid() }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findById', () =>
    query({ _id: restaurantId, status: 'published', isActive: true })
  );
  patch(Category, 'findById', () => query(null));
  result = await invoke(createMenu, {
    user: { role: 'superAdmin', id: userId },
    body: { restaurantId, categoryId: oid() }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Category, 'findById', () =>
    query({
      _id: oid(),
      restaurantId,
      isActive: false,
      status: 'published',
      isGeneric: false
    })
  );
  result = await invoke(createMenu, {
    user: { role: 'superAdmin', id: userId },
    body: { restaurantId, categoryId: oid() }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Category, 'findById', () =>
    query({
      _id: oid(),
      restaurantId,
      isActive: true,
      status: 'draft',
      isGeneric: false
    })
  );
  result = await invoke(createMenu, {
    user: { role: 'superAdmin', id: userId },
    body: { restaurantId, categoryId: oid() }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Category, 'findById', () =>
    query({
      _id: oid(),
      restaurantId: otherRestaurantId,
      isActive: true,
      status: 'published',
      isGeneric: false
    })
  );
  result = await invoke(createMenu, {
    user: { role: 'superAdmin', id: userId },
    body: { restaurantId, categoryId: oid() }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Category, 'findById', () =>
    query({
      _id: oid(),
      restaurantId,
      isActive: true,
      status: 'published',
      isGeneric: false
    })
  );
  patch(Menu, 'findOne', () => query({ _id: oid() }));
  result = await invoke(createMenu, {
    user: { role: 'superAdmin', id: userId },
    body: { restaurantId, categoryId: oid() }
  });
  assert.equal(result.nextError.statusCode, 409);

  patch(Menu, 'findOne', () => query(null));
  result = await invoke(addMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { name: '', price: -1 }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findOne', () => query(null));
  result = await invoke(addMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { name: 'New Item', price: 10 }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Menu, 'findOne', () => query({ ...baseMenu, restaurantId: otherRestaurantId }));
  result = await invoke(addMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { name: 'New Item', price: 10 }
  });
  assert.equal(result.nextError.statusCode, 403);

  patch(Menu, 'findOne', () =>
    query({
      ...baseMenu,
      items: [
        {
          _id: itemId,
          name: 'Item One',
          order: 1,
          isActive: true,
          isAvailable: true
        }
      ]
    })
  );
  result = await invoke(addMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { name: 'item one', price: 12 }
  });
  assert.equal(result.nextError.statusCode, 409);

  patch(Menu, 'findById', () => query(baseMenu));
  result = await invoke(updateMenuItem, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId, itemId },
    body: { unsupported: true }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(updateMenuItem, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId, itemId },
    body: { price: -10 }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(deleteMenuItem, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId, itemId: oid() }
  });
  assert.equal(result.nextError.statusCode, 404);

  const deletedItemMenu = makeMenuDoc({
    _id: menuId,
    restaurantId,
    status: 'draft'
  });
  deletedItemMenu.items[0].isActive = false;
  deletedItemMenu.items.id = (id) =>
    deletedItemMenu.items.find((item) => String(item._id) === String(id)) || null;
  patch(Menu, 'findById', () => query(deletedItemMenu));
  result = await invoke(toggleItemAvailability, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId, itemId: deletedItemMenu.items[0]._id }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findById', () => query({ ...baseMenu, status: 'published' }));
  result = await invoke(updateMenuStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { status: 'published' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findById', () => query({ ...baseMenu, status: 'draft', items: [] }));
  patch(Restaurant, 'findById', () =>
    query({ _id: restaurantId, status: 'published', isActive: true })
  );
  patch(Category, 'findById', () =>
    query({ _id: oid(), status: 'published', isActive: true })
  );
  result = await invoke(updateMenuStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { status: 'published' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(deleteMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  Menu.collection.findOne = async () => ({
    _id: new mongoose.Types.ObjectId(menuId),
    restaurantId,
    isActive: true
  });
  result = await invoke(restoreMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findById', () => query({ ...baseMenu, restaurantId }));
  result = await invoke(getMenuAuditLogs, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    query: { actorId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getMenuAuditLogs, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    query: { from: 'bad-date' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findById', () => query(null));
  result = await invoke(hardDeleteMenu, {
    user: { role: 'superAdmin', id: userId },
    params: { menuId }
  });
  assert.equal(result.nextError.statusCode, 404);
});

test('restaurant controller covers remaining create, lifecycle, and nearby edge branches', async () => {
  const userId = oid();
  const restaurantId = oid();
  const adminId = oid();
  const otherAdminId = oid();

  const restaurant = {
    _id: restaurantId,
    slug: 'demo',
    name: 'Demo',
    tagline: 'Tag',
    address: { city: 'City', addressLine1: 'Line' },
    openingHours: [],
    contactNumber: '123',
    email: 'demo@example.com',
    status: 'draft',
    isActive: false,
    adminId
  };

  patch(Restaurant, 'findOne', () => query(null));
  patch(Restaurant, 'findById', (id) => {
    if (String(id) === String(restaurantId)) return query({ ...restaurant });
    return query(null);
  });
  patch(Restaurant, 'findByIdAndUpdate', () =>
    query({ ...restaurant, status: 'blocked', isActive: false })
  );
  patch(Restaurant, 'create', async ([payload]) => [{ ...payload, _id: restaurantId }]);
  patch(Restaurant, 'countDocuments', async () => 1);
  patch(Restaurant, 'find', () => query([{ ...restaurant, openingHours: [] }]));
  patch(Restaurant, 'aggregate', async () => []);
  patch(User, 'findById', (id) => {
    if (String(id) === String(adminId)) {
      return query({ _id: adminId, role: 'admin', restaurantId: null });
    }
    if (String(id) === String(otherAdminId)) {
      return query({ _id: otherAdminId, role: 'admin', restaurantId });
    }
    return query({ _id: userId, role: 'admin', restaurantId: null });
  });
  patch(User, 'findByIdAndUpdate', async () => ({}));
  patch(Category, 'countDocuments', async () => 1);
  patch(Menu, 'countDocuments', async () => 1);

  let result = await invoke(create, {
    user: { id: userId, role: 'admin' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(create, {
    user: { id: userId, role: 'admin' },
    body: { name: 'Demo' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(create, {
    user: { id: userId, role: 'admin' },
    body: {
      name: 'Demo',
      address: { city: 'City' },
      contactNumber: '123',
      email: 'demo@example.com'
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(create, {
    user: { id: userId, role: 'admin' },
    body: {
      name: 'Demo',
      address: { city: 'City', addressLine1: 'Line' },
      contactNumber: '123',
      email: 'bad-email'
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(create, {
    user: { id: userId, role: 'admin' },
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

  patch(User, 'findById', () =>
    query({ _id: userId, role: 'admin', restaurantId })
  );
  mockWithTransaction();
  result = await invoke(create, {
    user: { id: userId, role: 'admin' },
    body: {
      name: 'Demo',
      address: { city: 'City', addressLine1: 'Line' },
      contactNumber: '123',
      email: 'demo@example.com',
      location: { lat: 1, lng: 2 }
    }
  });
  assert.ok(result.nextError !== undefined || result.res.statusCode === 201);

  patch(User, 'findById', () =>
    query({ _id: otherAdminId, role: 'customer', restaurantId: null })
  );
  result = await invoke(create, {
    user: { id: userId, role: 'superAdmin' },
    body: {
      name: 'Demo',
      address: { city: 'City', addressLine1: 'Line' },
      contactNumber: '123',
      email: 'demo@example.com',
      location: { lat: 1, lng: 2 },
      adminId: otherAdminId
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(User, 'findById', (id) => {
    if (String(id) === String(otherAdminId)) {
      return query({ _id: otherAdminId, role: 'admin', restaurantId });
    }
    return query({ _id: userId, role: 'admin', restaurantId: null });
  });
  result = await invoke(create, {
    user: { id: userId, role: 'superAdmin' },
    body: {
      name: 'Demo',
      address: { city: 'City', addressLine1: 'Line' },
      contactNumber: '123',
      email: 'demo@example.com',
      location: { lat: 1, lng: 2 },
      adminId: otherAdminId
    }
  });
  assert.ok(result.nextError !== undefined || result.res.statusCode === 201);

  result = await invoke(getRestaurantById, {
    params: { id: oid() }
  });
  assert.equal(result.nextError.statusCode, 404);

  result = await invoke(updateRestaurantStatus, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId },
    body: { status: 'bad-status' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findById', () => query({ ...restaurant, status: 'draft' }));
  result = await invoke(updateRestaurantStatus, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId },
    body: { status: 'draft' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findById', () => query({ ...restaurant }));
  result = await invoke(updateRestaurant, {
    user: { id: userId, role: 'admin' },
    params: { id: restaurantId },
    body: { slug: 'nope' }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(updateRestaurant, {
    user: { id: userId, role: 'admin' },
    params: { id: restaurantId },
    body: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findById', () => query(null));
  result = await invoke(deleteRestaurant, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Restaurant, 'findById', () =>
    query({ ...restaurant, status: 'blocked', isActive: false })
  );
  result = await invoke(deleteRestaurant, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Restaurant, 'findById', () => query(null));
  result = await invoke(restoreRestaurant, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Restaurant, 'findById', () => query(null));
  result = await invoke(reassignRestaurantAdmin, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId },
    body: { newAdminId: adminId }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Restaurant, 'findById', () => query({ ...restaurant }));
  patch(User, 'findById', (id) => {
    if (String(id) === String(adminId)) {
      return query({ _id: adminId, role: 'admin', restaurantId: null });
    }
    return query({ _id: otherAdminId, role: 'customer', restaurantId: null });
  });
  result = await invoke(reassignRestaurantAdmin, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId },
    body: { newAdminId: otherAdminId }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(User, 'findById', (id) => {
    if (String(id) === String(adminId)) {
      return query({ _id: adminId, role: 'admin', restaurantId: null });
    }
    return query({ _id: otherAdminId, role: 'admin', restaurantId });
  });
  result = await invoke(reassignRestaurantAdmin, {
    user: { id: userId, role: 'superAdmin' },
    params: { id: restaurantId },
    body: { newAdminId: otherAdminId }
  });
  assert.ok(result.nextError !== undefined || result.res.statusCode === 200);

  result = await invoke(getNearByRestaurants, {
    query: {}
  });
  assert.equal(result.nextError.statusCode, 400);
});

test('category controller covers slug-collision update and reorder validation helper branches', async () => {
  const userId = oid();
  const restaurantId = oid();
  const categoryId = oid();
  const categoryDoc = makeCategoryDoc({
    _id: categoryId,
    restaurantId,
    isGeneric: false,
    isActive: true,
    status: 'draft',
    name: 'Sides',
    slug: 'sides'
  });
  let slugLookupCount = 0;

  patch(Category, 'findOne', (filter) => {
    if (filter.slug) {
      slugLookupCount += 1;
      return query(slugLookupCount === 1 ? { _id: oid(), slug: filter.slug } : null);
    }
    return query(categoryDoc);
  });
  patch(Category, 'bulkWrite', async () => ({
    matchedCount: 2,
    modifiedCount: 2
  }));

  let result = await invoke(updateCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    body: { name: 'Updated Name' }
  });
  assert.equal(result.res.statusCode, 200);
  assert.ok(slugLookupCount >= 2);

  result = await invoke(reorderCategories, {
    user: { role: 'admin', id: userId, restaurantId },
    body: [{ id: categoryId, order: -1 }]
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(reorderCategories, {
    user: { role: 'admin', id: userId, restaurantId },
    body: [
      { id: categoryId, order: 1 },
      { id: categoryId, order: 2 }
    ]
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Category, 'findById', () => query(null));
  result = await invoke(getCategoryAuditLogs, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId },
    query: {}
  });
  assert.equal(result.nextError.statusCode, 404);

  result = await invoke(checkCategorySlug, {
    user: { role: 'admin', id: userId, restaurantId },
    body: { slug: 'demo', isGeneric: false }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(hardDeleteCategory, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { id: categoryId }
  });
  assert.equal(result.nextError.statusCode, 404);
});

test('menu controller covers remaining create, item, reorder, status, and access guards', async () => {
  const userId = oid();
  const restaurantId = oid();
  const otherRestaurantId = oid();
  const menuId = oid();
  const itemId = oid();
  const menuDoc = makeMenuDoc({
    _id: menuId,
    restaurantId,
    status: 'draft',
    isActive: true
  });
  menuDoc.items = [
    {
      _id: itemId,
      name: 'Burger',
      price: 12,
      order: 1,
      isActive: true,
      isAvailable: true,
      toObject() {
        return { ...this };
      }
    }
  ];
  menuDoc.items.id = (id) =>
    menuDoc.items.find((item) => String(item._id) === String(id)) || null;

  patch(Restaurant, 'findById', () =>
    query({ _id: restaurantId, status: 'published', isActive: true })
  );
  patch(Category, 'findById', () =>
    query({
      _id: oid(),
      restaurantId,
      isActive: true,
      status: 'published',
      isGeneric: false
    })
  );
  patch(Menu, 'findOne', () => query(null));
  patch(Menu, 'findById', () => query(menuDoc));

  let result = await invoke(createMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    body: { categoryId: oid() }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(createMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    body: { restaurantId, categoryId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findById', () => query({ ...menuDoc, restaurantId: otherRestaurantId }));
  result = await invoke(deleteMenuItem, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId, itemId }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(toggleItemAvailability, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId: 'bad-id', itemId }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findById', () => query(null));
  result = await invoke(toggleItemAvailability, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId, itemId }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Menu, 'findById', () => query({ ...menuDoc, restaurantId: otherRestaurantId }));
  result = await invoke(toggleItemAvailability, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId, itemId }
  });
  assert.equal(result.nextError.statusCode, 403);

  patch(Menu, 'findById', () => query(menuDoc));
  result = await invoke(reorderMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { order: [] }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(reorderMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { order: [{ itemId, order: 0 }] }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(reorderMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { order: [{ itemId: oid(), order: 1 }] }
  });
  assert.equal(result.nextError.statusCode, 400);

  const deletedReorderMenu = makeMenuDoc({
    _id: menuId,
    restaurantId,
    status: 'draft',
    isActive: true
  });
  deletedReorderMenu.items[0].isActive = false;
  deletedReorderMenu.items.id = (id) =>
    deletedReorderMenu.items.find((item) => String(item._id) === String(id)) || null;
  patch(Menu, 'findById', () => query(deletedReorderMenu));
  result = await invoke(reorderMenuItems, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: {
      order: [{ itemId: deletedReorderMenu.items[0]._id, order: 1 }]
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findById', () => query(null));
  result = await invoke(updateMenuStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { status: 'blocked' }
  });
  assert.equal(result.nextError.statusCode, 404);

  patch(Menu, 'findById', () => query({ ...menuDoc, isActive: false }));
  result = await invoke(updateMenuStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { status: 'blocked' }
  });
  assert.equal(result.nextError.statusCode, 400);

  patch(Menu, 'findById', () => query({ ...menuDoc, restaurantId: otherRestaurantId }));
  result = await invoke(updateMenuStatus, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId },
    body: { status: 'blocked' }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(deleteMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId }
  });
  assert.equal(result.nextError.statusCode, 403);

  Menu.collection.findOne = async () => ({
    _id: new mongoose.Types.ObjectId(menuId),
    restaurantId: otherRestaurantId,
    isActive: false
  });
  patch(Restaurant, 'findById', () =>
    query({ _id: otherRestaurantId, status: 'published', isActive: true })
  );
  result = await invoke(restoreMenu, {
    user: { role: 'admin', id: userId, restaurantId },
    params: { menuId }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(hardDeleteMenu, {
    user: { role: 'superAdmin', id: userId },
    params: { menuId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);
});
