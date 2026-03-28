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

const buildRestaurant = (name, adminId, extras = {}) => ({
  name,
  slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`,
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
    monday: { open: '09:00', close: '22:00', isClosed: false }
  },
  contactNumber: '+44-20-1111-1111',
  email: `${Math.random().toString(36).slice(2, 10)}@example.com`,
  adminId,
  ...extras
});

const createActors = async () => {
  const superAdmin = await User.create({
    userName: `branch3-super-${Math.random().toString(36).slice(2, 8)}`,
    email: `branch3-super-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: hashedPassword,
    role: 'superAdmin',
    isActive: true
  });
  const adminA = await User.create({
    userName: `branch3-admina-${Math.random().toString(36).slice(2, 8)}`,
    email: `branch3-admina-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: hashedPassword,
    role: 'admin',
    isActive: true
  });
  const adminB = await User.create({
    userName: `branch3-adminb-${Math.random().toString(36).slice(2, 8)}`,
    email: `branch3-adminb-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: hashedPassword,
    role: 'admin',
    isActive: true
  });

  return {
    superAdmin,
    adminA,
    adminB,
    tokens: {
      superAdmin: signTestToken({ id: superAdmin._id, role: 'superAdmin' }),
      adminA: signTestToken({ id: adminA._id, role: 'admin' }),
      adminB: signTestToken({ id: adminB._id, role: 'admin' })
    }
  };
};

describe('Controller branch expansion 3', { concurrency: false }, () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('restaurant endpoints reject invalid pagination, restore state, and reassignment payloads', async () => {
    const { adminA, adminB, tokens } = await createActors();
    const restaurant = await Restaurant.create(
      buildRestaurant('Branch3 Restaurant', adminA._id, {
        status: 'published',
        isActive: true
      })
    );

    const myRestaurantMissingRes = await request(app)
      .get('/api/restaurants/me')
      .set('Authorization', `Bearer ${tokens.adminB}`);
    assert.equal(myRestaurantMissingRes.status, 404);

    const invalidPaginationRes = await request(app)
      .get('/api/restaurants/all?page=0&limit=0')
      .set('Authorization', `Bearer ${tokens.superAdmin}`);
    assert.equal(invalidPaginationRes.status, 400);

    const invalidNearbyRes = await request(app).get('/api/restaurants/nearby');
    assert.equal(invalidNearbyRes.status, 400);

    const featuredInvalidPageRes = await request(app).get(
      '/api/restaurants/featured?page=0&limit=1'
    );
    assert.equal(featuredInvalidPageRes.status, 400);

    const restorePublishedRes = await request(app)
      .patch(`/api/restaurants/id/${restaurant._id}/restore`)
      .set('Authorization', `Bearer ${tokens.superAdmin}`);
    assert.equal(restorePublishedRes.status, 400);

    const reassignMissingAdminRes = await request(app)
      .patch(`/api/restaurants/id/${restaurant._id}/admin`)
      .set('Authorization', `Bearer ${tokens.superAdmin}`)
      .send({});
    assert.equal(reassignMissingAdminRes.status, 400);

    await User.findByIdAndUpdate(adminB._id, { restaurantId: restaurant._id });
    const reassignOwnedAdminRes = await request(app)
      .patch(`/api/restaurants/id/${restaurant._id}/admin`)
      .set('Authorization', `Bearer ${tokens.superAdmin}`)
      .send({ newAdminId: adminB._id.toString() });
    assert.equal(reassignOwnedAdminRes.status, 200);

    await User.findByIdAndUpdate(adminB._id, { $unset: { restaurantId: '' } });
    await User.findByIdAndDelete(adminA._id);
    const reassignAfterDeleteRes = await request(app)
      .patch(`/api/restaurants/id/${restaurant._id}/admin`)
      .set('Authorization', `Bearer ${tokens.superAdmin}`)
      .send({ newAdminId: adminB._id.toString() });
    assert.equal(reassignAfterDeleteRes.status, 200);
  });

  it('category endpoints reject generic admin writes, invalid public filters, and ownership violations', async () => {
    const { adminA, adminB, tokens } = await createActors();
    const restaurantA = await Restaurant.create(
      buildRestaurant('Branch3 Category A', adminA._id, {
        status: 'published',
        isActive: true
      })
    );
    const restaurantB = await Restaurant.create(
      buildRestaurant('Branch3 Category B', adminB._id, {
        status: 'published',
        isActive: true
      })
    );
    await User.findByIdAndUpdate(adminA._id, { restaurantId: restaurantA._id });
    await User.findByIdAndUpdate(adminB._id, { restaurantId: restaurantB._id });

    const adminGenericCreateRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ name: 'Generic Blocked', isGeneric: true });
    assert.equal(adminGenericCreateRes.status, 403);

    const invalidPublicFilterRes = await request(app).get(
      '/api/categories?restaurantId=bad-id'
    );
    assert.equal(invalidPublicFilterRes.status, 400);

    const category = await Category.create({
      name: 'Branch3 Scoped Category',
      slug: 'branch3-scoped-category',
      isGeneric: false,
      restaurantId: restaurantA._id,
      status: 'published',
      isActive: true
    });

    const foreignGetRes = await request(app)
      .get(`/api/categories/${category._id}`)
      .set('Authorization', `Bearer ${tokens.adminB}`);
    assert.equal(foreignGetRes.status, 403);

    const emptyUpdateRes = await request(app)
      .patch(`/api/categories/${category._id}`)
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ name: '   ' });
    assert.equal(emptyUpdateRes.status, 400);

    const invalidStatusTypeRes = await request(app)
      .patch(`/api/categories/${category._id}/status`)
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ isActive: 'yes' });
    assert.equal(invalidStatusTypeRes.status, 400);

    const invalidExportRes = await request(app)
      .get('/api/categories/export?status=invalid')
      .set('Authorization', `Bearer ${tokens.superAdmin}`);
    assert.equal(invalidExportRes.status, 400);
  });

  it('menu endpoints reject duplicates, invalid updates, restore failures, and hard-delete access', async () => {
    const { adminA, tokens } = await createActors();
    const restaurant = await Restaurant.create(
      buildRestaurant('Branch3 Menu Restaurant', adminA._id, {
        status: 'published',
        isActive: true
      })
    );
    const inactiveRestaurant = await Restaurant.create(
      buildRestaurant('Branch3 Inactive Restaurant', adminA._id, {
        status: 'blocked',
        isActive: false
      })
    );
    await User.findByIdAndUpdate(adminA._id, { restaurantId: restaurant._id });

    const category = await Category.create({
      name: 'Branch3 Menu Category',
      slug: 'branch3-menu-category',
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
        {
          name: 'Burger',
          price: 10,
          isAvailable: true,
          isActive: true,
          order: 1
        }
      ]
    });

    const duplicateItemRes = await request(app)
      .post(`/api/menus/${menu._id}/items`)
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ name: 'burger', price: 12 });
    assert.equal(duplicateItemRes.status, 409);

    const itemId = menu.items[0]._id;
    const invalidItemUpdateRes = await request(app)
      .put(`/api/menus/${menu._id}/items/${itemId}`)
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ unknownField: true });
    assert.equal(invalidItemUpdateRes.status, 400);

    const invalidTransitionRes = await request(app)
      .patch(`/api/menus/${menu._id}/status`)
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ status: 'draft' });
    assert.equal(invalidTransitionRes.status, 400);

    const deletedMenu = await Menu.create({
      restaurantId: inactiveRestaurant._id,
      categoryId: category._id,
      status: 'blocked',
      isActive: false,
      items: []
    });
    await User.findByIdAndUpdate(adminA._id, { restaurantId: inactiveRestaurant._id });

    const restoreInactiveRestaurantRes = await request(app)
      .patch(`/api/menus/${deletedMenu._id}/restore`)
      .set('Authorization', `Bearer ${tokens.adminA}`);
    assert.equal(restoreInactiveRestaurantRes.status, 400);

    const invalidDeletedMenusFilterRes = await request(app)
      .get('/api/menus/deleted?restaurantId=bad-id')
      .set('Authorization', `Bearer ${tokens.superAdmin}`);
    assert.equal(invalidDeletedMenusFilterRes.status, 400);

    const hardDeleteForbiddenRes = await request(app)
      .delete(`/api/menus/${menu._id}/hard`)
      .set('Authorization', `Bearer ${tokens.adminA}`);
    assert.equal(hardDeleteForbiddenRes.status, 403);
  });
});
