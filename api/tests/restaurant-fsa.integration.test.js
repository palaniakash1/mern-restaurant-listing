import test from 'node:test';
import assert from 'node:assert/strict';
import bcryptjs from 'bcryptjs';
import request from 'supertest';
import axios from 'axios';

import app from '../app.js';
import User from '../models/user.model.js';
import Restaurant from '../models/restaurant.model.js';
import {
  clearTestDb,
  setupTestDb,
  teardownTestDb,
  signTestToken
} from './helpers/testDb.js';

const passwordHash = bcryptjs.hashSync('Password1', 10);

const buildRestaurantPayload = (name = 'FSA Linked Diner') => ({
  name,
  tagline: 'Fresh food',
  description: 'Created during FSA integration test',
  address: {
    addressLine1: '10 Test Street',
    areaLocality: 'Central',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom'
  },
  location: {
    lat: 51.5072,
    lng: -0.1276
  },
  contactNumber: '+44-20-7000-0000',
  email: 'owner@example.com'
});

test.describe('Restaurant creation with FSA linkage', { concurrency: false }, () => {
  test.before(async () => {
    await setupTestDb();
  });

  test.after(async () => {
    await teardownTestDb();
  });

  test.beforeEach(async () => {
    await clearTestDb();
  });

  test.it('stores manually selected FHRS details during creation', async (t) => {
    const admin = await User.create({
      userName: 'fsaadmin',
      email: 'fsamanual@example.com',
      password: passwordHash,
      role: 'admin',
      isActive: true
    });

    t.mock.method(axios, 'get', async (url) => {
      assert.match(url, /Establishments\/778899$/);

      return {
        status: 200,
        data: {
          FHRSID: 778899,
          BusinessName: 'Manual Match Kitchen',
          RatingValue: '5',
          AddressLine1: '10 Test Street',
          AddressLine2: '',
          AddressLine3: 'London',
          PostCode: 'SW1A 1AA',
          Scores: {
            Hygiene: 5,
            Structural: 5,
            ConfidenceInManagement: 5
          }
        }
      };
    });

    const response = await request(app)
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${signTestToken({ id: admin._id, role: 'admin' })}`)
      .send({
        ...buildRestaurantPayload('Manual Match Kitchen'),
        fsa: {
          fhrsId: 778899,
          isManuallyLinked: true
        }
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.fhrsId, 778899);
    assert.equal(response.body.data.fsaRating.value, '5');
    assert.equal(response.body.data.fsaRating.isManuallyLinked, true);

    const storedRestaurant = await Restaurant.findById(response.body.data._id).lean();
    assert.equal(storedRestaurant.fhrsId, 778899);
    assert.equal(storedRestaurant.fsaRating.value, '5');
    assert.equal(storedRestaurant.fsaRating.isManuallyLinked, true);
  });

  test.it('auto-links a single confident FSA match during creation', async (t) => {
    const admin = await User.create({
      userName: 'fsaauto',
      email: 'fsaauto@example.com',
      password: passwordHash,
      role: 'admin',
      isActive: true
    });

    t.mock.method(axios, 'get', async (url) => {
      assert.match(url, /Establishments\?/);

      return {
        status: 200,
        data: {
          establishments: [
            {
              FHRSID: 112233,
              BusinessName: 'Auto Match Kitchen',
              RatingValue: '4',
              AddressLine1: '10 Test Street',
              AddressLine2: '',
              AddressLine3: 'London',
              PostCode: 'SW1A 1AA',
              Scores: {
                Hygiene: 4,
                Structural: 4,
                ConfidenceInManagement: 4
              }
            }
          ]
        }
      };
    });

    const response = await request(app)
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${signTestToken({ id: admin._id, role: 'admin' })}`)
      .send(buildRestaurantPayload('Auto Match Kitchen'));

    assert.equal(response.status, 201);
    assert.equal(response.body.data.fhrsId, 112233);
    assert.equal(response.body.data.fsaRating.value, '4');
    assert.equal(response.body.data.fsaRating.isManuallyLinked, false);
  });
});
