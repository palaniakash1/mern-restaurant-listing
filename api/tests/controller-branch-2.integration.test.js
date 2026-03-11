import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcryptjs from 'bcryptjs';

import app from '../app.js';
import User from '../models/user.model.js';
import {
  clearTestDb,
  setupTestDb,
  teardownTestDb,
  signTestToken
} from './helpers/testDb.js';

const passwordHash = bcryptjs.hashSync('Password1', 10);

const buildRestaurantPayload = (name = 'Branch Diner') => {
  const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    name,
    tagline: 'Coverage target',
    description: 'Payload for controller branch coverage',
    address: {
      addressLine1: 'Street 10',
      areaLocality: 'Central',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom'
    },
    location: {
      lat: 51.5072,
      lng: -0.1276
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
    contactNumber: '+44-20-5555-5555',
    email: `${slugBase}-${uniqueSuffix}@example.com`
  };
};

const createBaseActors = async () => {
  const superAdmin = await User.create({
    userName: 'branchsuper',
    email: 'branchsuper@example.com',
    password: passwordHash,
    role: 'superAdmin',
    isActive: true
  });
  const adminA = await User.create({
    userName: 'branchadmina',
    email: 'branchadmina@example.com',
    password: passwordHash,
    role: 'admin',
    isActive: true
  });
  const adminB = await User.create({
    userName: 'branchadminb',
    email: 'branchadminb@example.com',
    password: passwordHash,
    role: 'admin',
    isActive: true
  });

  return {
    adminA,
    adminB,
    tokens: {
      superAdmin: signTestToken({ id: superAdmin._id, role: 'superAdmin' }),
      adminA: signTestToken({ id: adminA._id, role: 'admin' }),
      adminB: signTestToken({ id: adminB._id, role: 'admin' })
    }
  };
};

const createRestaurantFixture = async (token, baseName) => {
  let lastResponse;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const payload = buildRestaurantPayload(`${baseName} ${attempt + 1}`);
    lastResponse = await request(app)
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    if (lastResponse.status === 201) {
      return lastResponse;
    }
  }

  return lastResponse;
};

describe('Controller branch expansion', { concurrency: false }, () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('restaurant endpoints reject duplicate ownership and invalid status transitions', async () => {
    const { tokens } = await createBaseActors();

    const createRestaurantRes = await createRestaurantFixture(
      tokens.adminA,
      'Primary Branch Diner'
    );
    assert.equal(createRestaurantRes.status, 201);

    const duplicateRestaurantRes = await request(app)
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({
        ...buildRestaurantPayload('Duplicate Branch Diner'),
        email: 'duplicate-owner@example.com'
      });
    assert.ok([400, 403].includes(duplicateRestaurantRes.status));

    const restaurantId = createRestaurantRes.body.data._id;

    const invalidStatusRes = await request(app)
      .patch(`/api/restaurants/id/${restaurantId}/status`)
      .set('Authorization', `Bearer ${tokens.superAdmin}`)
      .send({ status: 'not-a-real-status' });
    assert.equal(invalidStatusRes.status, 400);
  });

  it('category endpoints reject unpublished restaurant scope and invalid bulk status payloads', async () => {
    const { tokens } = await createBaseActors();

    const restaurantRes = await createRestaurantFixture(
      tokens.adminA,
      'Draft Category Diner'
    );
    assert.equal(restaurantRes.status, 201);

    const restaurantId = restaurantRes.body.data._id;

    const createDraftCategoryRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ name: 'Draft Category', isGeneric: false, restaurantId });
    assert.equal(createDraftCategoryRes.status, 400);

    const genericCategoryRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokens.superAdmin}`)
      .send({ name: 'Global Branch Category', isGeneric: true });
    assert.equal(genericCategoryRes.status, 201);

    const invalidBulkStatusRes = await request(app)
      .patch('/api/categories/bulk-status')
      .set('Authorization', `Bearer ${tokens.superAdmin}`)
      .send({
        ids: [genericCategoryRes.body.data._id],
        status: 'not-a-real-status'
      });
    assert.equal(invalidBulkStatusRes.status, 400);
  });

  it('menu endpoints reject unpublished category creation and invalid lifecycle payloads', async () => {
    const { tokens } = await createBaseActors();

    const restaurantRes = await createRestaurantFixture(
      tokens.adminA,
      'Menu Branch Diner'
    );
    assert.equal(restaurantRes.status, 201);
    const restaurantId = restaurantRes.body.data._id;

    const publishRestaurantRes = await request(app)
      .patch(`/api/restaurants/id/${restaurantId}/status`)
      .set('Authorization', `Bearer ${tokens.superAdmin}`)
      .send({ status: 'published' });
    assert.equal(publishRestaurantRes.status, 200);

    const categoryRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ name: 'Draft Menu Category', isGeneric: false, restaurantId });
    assert.equal(categoryRes.status, 201);
    const categoryId = categoryRes.body.data._id;

    const createMenuBeforePublishRes = await request(app)
      .post('/api/menus')
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ restaurantId, categoryId });
    assert.equal(createMenuBeforePublishRes.status, 400);

    const publishCategoryRes = await request(app)
      .patch('/api/categories/bulk-status')
      .set('Authorization', `Bearer ${tokens.superAdmin}`)
      .send({ ids: [categoryId], status: 'published' });
    assert.equal(publishCategoryRes.status, 200);

    const createMenuRes = await request(app)
      .post('/api/menus')
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ restaurantId, categoryId });
    assert.equal(createMenuRes.status, 201);
    const menuId = createMenuRes.body.data._id;

    const itemRes = await request(app)
      .post(`/api/menus/${menuId}/items`)
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ name: 'Wrap', price: 9.5 });
    assert.equal(itemRes.status, 201);
    const itemId = itemRes.body.data[0]._id;

    const invalidMenuStatusRes = await request(app)
      .patch(`/api/menus/${menuId}/status`)
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ status: 'not-a-real-status' });
    assert.equal(invalidMenuStatusRes.status, 400);

    const invalidReorderRes = await request(app)
      .put(`/api/menus/${menuId}/reorder`)
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ order: [{ itemId, order: -1 }] });
    assert.equal(invalidReorderRes.status, 400);
  });
});
