import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcryptjs from 'bcryptjs';

import app from '../app.js';
import User from '../models/user.model.js';
import Restaurant from '../models/restaurant.model.js';
import Category from '../models/category.model.js';
import Menu from '../models/menu.model.js';
import {
  clearTestDb,
  setupTestDb,
  teardownTestDb,
  signTestToken
} from './helpers/testDb.js';

const hashedPassword = bcryptjs.hashSync('Password1', 10);

const restaurantPayload = (name, adminId, extras = {}) => ({
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  address: {
    addressLine1: 'Main street',
    areaLocality: 'Center',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
    location: {
      type: 'Point',
      coordinates: [-0.1276, 51.5072]
    }
  },
  openingHours: {
    monday: { open: '09:00', close: '22:00', isClosed: false },
    tuesday: { open: '09:00', close: '22:00', isClosed: false },
    wednesday: { open: '09:00', close: '22:00', isClosed: false },
    thursday: { open: '09:00', close: '22:00', isClosed: false },
    friday: { open: '09:00', close: '22:00', isClosed: false },
    saturday: { open: '09:00', close: '22:00', isClosed: false },
    sunday: { open: '09:00', close: '22:00', isClosed: false }
  },
  contactNumber: '+44 20 7946 0958',
  email: `${name.toLowerCase().replace(/\s+/g, '_')}@example.com`,
  adminId,
  status: 'published',
  isActive: true,
  ...extras
});

const createActors = async () => {
  const superAdmin = await User.create({
    userName: 'cb4_super',
    email: 'cb4_super@example.com',
    password: hashedPassword,
    role: 'superAdmin',
    isActive: true
  });
  const admin = await User.create({
    userName: 'cb4_admin',
    email: 'cb4_admin@example.com',
    password: hashedPassword,
    role: 'admin',
    isActive: true
  });
  const secondAdmin = await User.create({
    userName: 'cb4_admin_2',
    email: 'cb4_admin_2@example.com',
    password: hashedPassword,
    role: 'admin',
    isActive: true
  });
  const storeManager = await User.create({
    userName: 'cb4_manager',
    email: 'cb4_manager@example.com',
    password: hashedPassword,
    role: 'storeManager',
    isActive: true
  });

  return {
    superAdmin,
    admin,
    secondAdmin,
    storeManager,
    tokens: {
      superAdmin: signTestToken({ id: superAdmin._id, role: 'superAdmin' }),
      admin: signTestToken({ id: admin._id, role: 'admin' }),
      secondAdmin: signTestToken({ id: secondAdmin._id, role: 'admin' }),
      storeManager: signTestToken({ id: storeManager._id, role: 'storeManager' })
    }
  };
};

describe('Controller branch expansion 4', { concurrency: false }, () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('restaurant endpoints reject forbidden create fields, repeated status, restore-state, and ownership mismatches', async () => {
    const { admin, secondAdmin, tokens } = await createActors();

    const forbiddenCreateRes = await request(app)
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        ...restaurantPayload('Branch Forbidden Create', admin._id.toString()),
        isFeatured: true
      });
    assert.equal(forbiddenCreateRes.status, 400);

    const blockedRestaurant = await Restaurant.create(
      restaurantPayload('Branch Blocked Restore', admin._id, {
        status: 'blocked',
        isActive: false
      })
    );
    await User.findByIdAndUpdate(admin._id, { restaurantId: blockedRestaurant._id });

    const repeatStatusRes = await request(app)
      .patch(`/api/restaurants/id/${blockedRestaurant._id}/status`)
      .set('Authorization', `Bearer ${tokens.superAdmin}`)
      .send({ status: 'blocked' });
    assert.equal(repeatStatusRes.status, 404);

    const restoreRes = await request(app)
      .patch(`/api/restaurants/id/${blockedRestaurant._id}/restore`)
      .set('Authorization', `Bearer ${tokens.superAdmin}`);
    assert.equal(restoreRes.status, 200);

    const secondRestoreRes = await request(app)
      .patch(`/api/restaurants/id/${blockedRestaurant._id}/restore`)
      .set('Authorization', `Bearer ${tokens.superAdmin}`);
    assert.equal(secondRestoreRes.status, 400);

    const ownershipMismatchRestaurant = await Restaurant.create(
      restaurantPayload('Branch Ownership Restaurant', secondAdmin._id)
    );
    await User.findByIdAndUpdate(admin._id, {
      restaurantId: ownershipMismatchRestaurant._id
    });
    const mismatchToken = signTestToken({
      id: admin._id,
      role: 'admin',
      restaurantId: ownershipMismatchRestaurant._id.toString()
    });

    const myRestaurantRes = await request(app)
      .get('/api/restaurants/me')
      .set('Authorization', `Bearer ${mismatchToken}`);
    assert.equal(myRestaurantRes.status, 403);
  });

  it('category endpoints cover idempotent replay, duplicate delete protections, and hard-delete integrity guards', async () => {
    const { admin, secondAdmin, tokens } = await createActors();
    const restaurant = await Restaurant.create(
      restaurantPayload('Branch Category Restaurant', admin._id, {
        status: 'published'
      })
    );
    await User.findByIdAndUpdate(admin._id, { restaurantId: restaurant._id });
    await User.findByIdAndUpdate(secondAdmin._id, { restaurantId: null });

    const category = await Category.create({
      name: 'Branch Category',
      slug: 'branch-category',
      isGeneric: false,
      restaurantId: restaurant._id,
      status: 'published',
      isActive: true
    });

    const replayKey = 'cb4-category-replay';
    const firstBulkReorderRes = await request(app)
      .patch('/api/categories/bulk-reorder')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .set('x-idempotency-key', replayKey)
      .send({ items: [{ id: category._id.toString(), order: 1 }] });
    assert.equal(firstBulkReorderRes.status, 200);

    const replayBulkReorderRes = await request(app)
      .patch('/api/categories/bulk-reorder')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .set('x-idempotency-key', replayKey)
      .send({ items: [{ id: category._id.toString(), order: 1 }] });
    assert.equal(replayBulkReorderRes.status, 200);
    assert.equal(replayBulkReorderRes.body.idempotentReplay, true);

    const conflictBulkReorderRes = await request(app)
      .patch('/api/categories/bulk-reorder')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .set('x-idempotency-key', replayKey)
      .send({ items: [{ id: category._id.toString(), order: 2 }] });
    assert.equal(conflictBulkReorderRes.status, 409);

    const deleteRes = await request(app)
      .delete(`/api/categories/${category._id}`)
      .set('Authorization', `Bearer ${tokens.admin}`);
    assert.equal(deleteRes.status, 200);

    const restoreRes = await request(app)
      .patch(`/api/categories/${category._id}/restore`)
      .set('Authorization', `Bearer ${tokens.superAdmin}`);
    assert.equal(restoreRes.status, 200);

    const linkedCategory = await Category.create({
      name: 'Branch Linked Category',
      slug: 'branch-linked-category',
      isGeneric: false,
      restaurantId: restaurant._id,
      status: 'published',
      isActive: true
    });
    await Menu.create({
      restaurantId: restaurant._id,
      categoryId: linkedCategory._id,
      status: 'published',
      isActive: true,
      items: [{ name: 'Linked Item', price: 10, isAvailable: true, isActive: true }]
    });

    const hardDeleteRes = await request(app)
      .delete(`/api/categories/${linkedCategory._id}/hard`)
      .set('Authorization', `Bearer ${tokens.superAdmin}`);
    assert.equal(hardDeleteRes.status, 400);
  });

  it('menu endpoints reject invalid reorder/state/audit flows and restore against inactive restaurants', async () => {
    const { admin, storeManager, tokens } = await createActors();
    const restaurant = await Restaurant.create(
      restaurantPayload('Branch Menu Restaurant', admin._id, {
        status: 'published'
      })
    );
    await User.findByIdAndUpdate(admin._id, { restaurantId: restaurant._id });
    await User.findByIdAndUpdate(storeManager._id, { restaurantId: restaurant._id });

    const category = await Category.create({
      name: 'Branch Menu Category',
      slug: 'branch-menu-category',
      isGeneric: false,
      restaurantId: restaurant._id,
      status: 'published',
      isActive: true
    });
    const secondCategory = await Category.create({
      name: 'Branch Menu Category 2',
      slug: 'branch-menu-category-2',
      isGeneric: false,
      restaurantId: restaurant._id,
      status: 'published',
      isActive: true
    });

    const menu = await Menu.create({
      restaurantId: restaurant._id,
      categoryId: category._id,
      status: 'draft',
      isActive: true,
      items: [
        { name: 'Item A', price: 10, order: 1, isAvailable: true, isActive: true },
        { name: 'Item B', price: 12, order: 2, isAvailable: false, isActive: true }
      ]
    });

    const duplicateReorderRes = await request(app)
      .put(`/api/menus/${menu._id}/reorder`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        order: [
          { itemId: menu.items[0]._id.toString(), order: 1 },
          { itemId: menu.items[0]._id.toString(), order: 2 }
        ]
      });
    assert.equal(duplicateReorderRes.status, 400);

    const publishWithoutAvailableItemsMenu = await Menu.create({
      restaurantId: restaurant._id,
      categoryId: secondCategory._id,
      status: 'draft',
      isActive: true,
      items: [{ name: 'Unavailable Item', price: 9, order: 1, isAvailable: false, isActive: true }]
    });

    const invalidPublishRes = await request(app)
      .patch(`/api/menus/${publishWithoutAvailableItemsMenu._id}/status`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ status: 'published' });
    assert.equal(invalidPublishRes.status, 400);

    const invalidAuditActorRes = await request(app)
      .get(`/api/menus/${menu._id}/audit?actorId=bad-id`)
      .set('Authorization', `Bearer ${tokens.admin}`);
    assert.equal(invalidAuditActorRes.status, 400);

    await request(app)
      .delete(`/api/menus/${menu._id}`)
      .set('Authorization', `Bearer ${tokens.admin}`);
    await Restaurant.findByIdAndUpdate(restaurant._id, { isActive: false, status: 'blocked' });

    const restoreInactiveRestaurantRes = await request(app)
      .patch(`/api/menus/${menu._id}/restore`)
      .set('Authorization', `Bearer ${tokens.admin}`);
    assert.equal(restoreInactiveRestaurantRes.status, 400);

    const deletedMenusBadRestaurantFilterRes = await request(app)
      .get('/api/menus/deleted?restaurantId=bad-id')
      .set('Authorization', `Bearer ${tokens.superAdmin}`);
    assert.equal(deletedMenusBadRestaurantFilterRes.status, 400);

    const unauthorizedMenuByIdRes = await request(app)
      .get(`/api/menus/${publishWithoutAvailableItemsMenu._id}`)
      .set('Authorization', `Bearer ${tokens.secondAdmin}`);
    assert.equal(unauthorizedMenuByIdRes.status, 403);
  });
});
