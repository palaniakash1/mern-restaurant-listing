import assert from 'node:assert/strict';
import test from 'node:test';

import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import User from '../models/user.model.js';
import { clearTestDb, setupTestDb, teardownTestDb } from './helpers/testDb.js';

const password = 'Password123!';

const restaurantPayload = {
  name: 'Coverage Restaurant',
  address: '123 Branch Street',
  phone: '+15555550123',
  email: 'coverage-restaurant@example.com',
  description: 'Restaurant used for controller branch coverage tests.'
};

test.before(async () => {
  await setupTestDb();
});

test.beforeEach(async () => {
  await clearTestDb();
});

test.after(async () => {
  await teardownTestDb();
});

async function signupAndPromote({ username, email, role }) {
  const signupRes = await request(app)
    .post('/api/auth/signup')
    .send({ username, email, password });

  assert.equal(signupRes.status, 201);

  const user = await User.findOneAndUpdate({ email }, { role }, { new: true });

  assert.ok(user);

  const agent = request.agent(app);
  const signinRes = await agent
    .post('/api/auth/signin')
    .send({ email, password });

  assert.equal(signinRes.status, 200);

  return { agent, user };
}

test('covers restaurant controller business-rule failures', async () => {
  const superAdmin = await signupAndPromote({
    username: 'coverage-super-admin',
    email: 'coverage-super-admin@example.com',
    role: 'superAdmin'
  });

  const admin = await signupAndPromote({
    username: 'coverage-admin',
    email: 'coverage-admin@example.com',
    role: 'admin'
  });

  const createInitialRestaurantRes = await admin.agent
    .post('/api/restaurants')
    .send(restaurantPayload);

  assert.equal(createInitialRestaurantRes.status, 201);
  assert.ok(createInitialRestaurantRes.body?._id);

  const ownedRestaurantId = createInitialRestaurantRes.body._id;

  const secondRestaurantRes = await admin.agent.post('/api/restaurants').send({
    ...restaurantPayload,
    email: 'coverage-restaurant-2@example.com',
    name: 'Coverage Restaurant 2'
  });

  assert.equal(secondRestaurantRes.status, 400);

  const noValidFieldsUpdateRes = await admin.agent
    .put(`/api/restaurants/${ownedRestaurantId}`)
    .send({ unknownField: 'value' });

  assert.equal(noValidFieldsUpdateRes.status, 400);

  const invalidCategoriesUpdateRes = await admin.agent
    .put(`/api/restaurants/${ownedRestaurantId}`)
    .send({ categories: ['invalid-category-id'] });

  assert.equal(invalidCategoriesUpdateRes.status, 400);

  const missingAdminTransferRes = await superAdmin.agent
    .patch(`/api/restaurants/${ownedRestaurantId}/reassign`)
    .send({});

  assert.equal(missingAdminTransferRes.status, 400);

  const invalidAdminTransferRes = await superAdmin.agent
    .patch(`/api/restaurants/${ownedRestaurantId}/reassign`)
    .send({ newAdminId: new mongoose.Types.ObjectId().toString() });

  assert.equal(invalidAdminTransferRes.status, 400);

  const deleteRes = await superAdmin.agent.delete(
    `/api/restaurants/${ownedRestaurantId}`
  );

  assert.equal(deleteRes.status, 200);

  const alreadyDeletedRes = await superAdmin.agent.delete(
    `/api/restaurants/${ownedRestaurantId}`
  );

  assert.equal(alreadyDeletedRes.status, 400);
});
