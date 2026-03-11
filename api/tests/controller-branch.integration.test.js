import assert from 'node:assert/strict';
import test from 'node:test';

import bcryptjs from 'bcryptjs';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import Restaurant from '../models/restaurant.model.js';
import User from '../models/user.model.js';
import { clearTestDb, setupTestDb, teardownTestDb } from './helpers/testDb.js';

const password = 'Password123!';

const restaurantPayload = {
  name: 'Coverage Restaurant',
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

  let user = null;

  if (signupRes.status === 201) {
    user = await User.findOneAndUpdate(
      { email },
      { role },
      { new: true }
    );
  }

  if (!user) {
    const hashedPassword = bcryptjs.hashSync(password, 10);
    user = await User.findOneAndUpdate(
      { email },
      {
        userName: username,
        username,
        email,
        password: hashedPassword,
        role
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );
  }

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
    username: 'coveragesuperadmin',
    email: 'coverage-super-admin@example.com',
    role: 'superAdmin'
  });

  const admin = await signupAndPromote({
    username: 'coverageadmin',
    email: 'coverage-admin@example.com',
    role: 'admin'
  });

  const ownedRestaurant = await Restaurant.create({
    ...restaurantPayload,
    slug: 'coverage-restaurant',
    admin: admin.user._id,
    adminId: admin.user._id,
    address: {
      addressLine1: '123 Branch Street',
      areaLocality: 'Coverage District',
      city: 'Chennai',
      postcode: '600001',
      location: {
        type: 'Point',
        coordinates: [80.2707, 13.0827]
      }
    }
  });

  const ownedRestaurantId = ownedRestaurant._id.toString();

  const secondRestaurantRes = await admin.agent
    .post('/api/restaurants')
    .send({
      ...restaurantPayload,
      email: 'coverage-restaurant-2@example.com',
      name: 'Coverage Restaurant 2'
    });

  assert.equal(secondRestaurantRes.status, 400);

  const noValidFieldsUpdateRes = await admin.agent
    .put(`/api/restaurants/${ownedRestaurantId}`)
    .send({ unknownField: 'value' });

  assert.ok([400, 404].includes(noValidFieldsUpdateRes.status));

  const invalidCategoriesUpdateRes = await admin.agent
    .put(`/api/restaurants/${ownedRestaurantId}`)
    .send({ categories: ['invalid-category-id'] });

  assert.ok([400, 404].includes(invalidCategoriesUpdateRes.status));

  const missingAdminTransferRes = await superAdmin.agent
    .patch(`/api/restaurants/${ownedRestaurantId}/reassign`)
    .send({});

  assert.ok([400, 404].includes(missingAdminTransferRes.status));

  const invalidAdminTransferRes = await superAdmin.agent
    .patch(`/api/restaurants/${ownedRestaurantId}/reassign`)
    .send({ newAdminId: new mongoose.Types.ObjectId().toString() });

  assert.ok([400, 404].includes(invalidAdminTransferRes.status));

});
