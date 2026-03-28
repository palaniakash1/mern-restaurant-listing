import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { describe as testDescribe } from 'node:test';

import {
  setupTestDb,
  clearTestDb,
  teardownTestDb,
  signTestToken
} from './helpers/testDb.js';
import app from '../app.js';
import Restaurant from '../models/restaurant.model.js';
import User from '../models/user.model.js';
import { __setRedisTestState, clear as clearRedisCache } from '../utils/redisCache.js';

testDescribe('FSA Controller Integration Tests', { concurrency: false }, () => {
  let adminUser;
  let adminToken;
  let regularUser;
  let regularToken;
  let testRestaurant;

  test.before(async () => {
    await setupTestDb();
    __setRedisTestState({ available: false });
  });

  test.after(async () => {
    __setRedisTestState({ available: false });
    await teardownTestDb();
  });

  test.beforeEach(async () => {
    await clearTestDb();
    await clearRedisCache();

    adminUser = await User.create({
      userName: 'admin_test',
      email: 'admin@test.com',
      password: '$2a$10$test',
      role: 'admin',
      isActive: true
    });

    adminToken = signTestToken({ id: adminUser._id, role: 'admin' });

    regularUser = await User.create({
      userName: 'user_test',
      email: 'user@test.com',
      password: '$2a$10$test',
      role: 'user',
      isActive: true
    });

    regularToken = signTestToken({ id: regularUser._id, role: 'user' });

    testRestaurant = await Restaurant.create({
      name: 'Test Restaurant',
      slug: 'test-restaurant',
      address: {
        addressLine1: '123 Test St',
        areaLocality: 'Test Area',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'United Kingdom',
        location: {
          type: 'Point',
          coordinates: [-0.1276, 51.5072]
        }
      },
      adminId: adminUser._id,
      status: 'published'
    });
  });

  testDescribe('GET /api/fsa/search (Public)', () => {
    test.it('should work without authentication', async () => {
      await request(app)
        .get('/api/fsa/search?name=Test')
        .expect(200)
        .then((res) => {
          assert.equal(res.body.success, true);
          assert.ok('data' in res.body);
        });
    });

    test.it('should require name parameter', async () => {
      await request(app)
        .get('/api/fsa/search')
        .expect(400)
        .then((res) => {
          assert.equal(res.body.success, false);
        });
    });

    test.it('should reject name shorter than 2 characters', async () => {
      await request(app)
        .get('/api/fsa/search?name=a')
        .expect(400)
        .then((res) => {
          assert.equal(res.body.success, false);
        });
    });

    test.it('should search with name only', async () => {
      await request(app)
        .get('/api/fsa/search?name=Pizza+Palace')
        .expect(200)
        .then((res) => {
          assert.equal(res.body.success, true);
          assert.ok('data' in res.body);
        });
    });

    test.it('should search with name and postcode', async () => {
      await request(app)
        .get('/api/fsa/search?name=Pizza&postcode=SW1A')
        .expect(200)
        .then((res) => {
          assert.equal(res.body.success, true);
        });
    });
  });

  testDescribe('GET /api/fsa/rating/:fhrsId (Public)', () => {
    test.it('should work without authentication', async () => {
      const res = await request(app)
        .get('/api/fsa/rating/123456789');

      assert.ok(res.status === 200 || res.status === 502);
    });

    test.it('should reject invalid FHRSID format', async () => {
      await request(app)
        .get('/api/fsa/rating/abc')
        .expect(400)
        .then((res) => {
          assert.equal(res.body.success, false);
        });
    });
  });

  testDescribe('GET /api/fsa/restaurant/:restaurantId (Protected)', () => {
    test.it('should require authentication', async () => {
      await request(app)
        .get(`/api/fsa/restaurant/${testRestaurant._id}`)
        .expect(401);
    });

    test.it('should return not linked for restaurant without fhrsId', async () => {
      await request(app)
        .get(`/api/fsa/restaurant/${testRestaurant._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((res) => {
          assert.equal(res.body.success, true);
          assert.equal(res.body.data.linked, false);
          assert.equal(res.body.data.fhrsId, null);
        });
    });

    test.it('should return linked status for restaurant with fhrsId', async () => {
      testRestaurant.fhrsId = 123456;
      testRestaurant.fsaRating = { value: '5', lastRefreshed: new Date(), isManuallyLinked: false };
      await testRestaurant.save();

      await request(app)
        .get(`/api/fsa/restaurant/${testRestaurant._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((res) => {
          assert.equal(res.body.success, true);
          assert.equal(res.body.data.linked, true);
          assert.equal(res.body.data.fhrsId, 123456);
        });
    });

    test.it('should return 404 for non-existent restaurant', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/fsa/restaurant/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  testDescribe('POST /api/fsa/restaurant/:restaurantId/link (Protected)', () => {
    test.it('should require authentication', async () => {
      await request(app)
        .post(`/api/fsa/restaurant/${testRestaurant._id}/link`)
        .send({ fhrsId: 123456 })
        .expect(401);
    });

    test.it('should require fhrsId in body', async () => {
      await request(app)
        .post(`/api/fsa/restaurant/${testRestaurant._id}/link`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400)
        .then((res) => {
          assert.equal(res.body.success, false);
        });
    });

    test.it('should reject invalid fhrsId', async () => {
      await request(app)
        .post(`/api/fsa/restaurant/${testRestaurant._id}/link`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fhrsId: -1 })
        .expect(400)
        .then((res) => {
          assert.equal(res.body.success, false);
        });
    });

    test.it('should only allow restaurant owner to link', async () => {
      await request(app)
        .post(`/api/fsa/restaurant/${testRestaurant._id}/link`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ fhrsId: 123456 })
        .expect(403)
        .then((res) => {
          assert.equal(res.body.success, false);
        });
    });
  });

  testDescribe('POST /api/fsa/restaurant/:restaurantId/auto-link (Protected)', () => {
    test.it('should require authentication', async () => {
      await request(app)
        .post(`/api/fsa/restaurant/${testRestaurant._id}/auto-link`)
        .expect(401);
    });

    test.it('should only allow restaurant owner to auto-link', async () => {
      await request(app)
        .post(`/api/fsa/restaurant/${testRestaurant._id}/auto-link`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    test.it('should attempt auto-link for restaurant owner', async () => {
      const res = await request(app)
        .post(`/api/fsa/restaurant/${testRestaurant._id}/auto-link`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.ok(res.status === 200 || res.status === 502);
    });
  });

  testDescribe('POST /api/fsa/restaurant/:restaurantId/refresh (Protected)', () => {
    test.it('should require authentication', async () => {
      await request(app)
        .post(`/api/fsa/restaurant/${testRestaurant._id}/refresh`)
        .expect(401);
    });

    test.it('should require restaurant to have fhrsId', async () => {
      await request(app)
        .post(`/api/fsa/restaurant/${testRestaurant._id}/refresh`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)
        .then((res) => {
          assert.equal(res.body.success, false);
          assert.ok(res.body.message.includes('not linked'));
        });
    });

    test.it('should refresh rating for restaurant with fhrsId', async () => {
      testRestaurant.fhrsId = 123456;
      testRestaurant.fsaRating = { value: '5', lastRefreshed: new Date(), isManuallyLinked: true };
      await testRestaurant.save();

      const res = await request(app)
        .post(`/api/fsa/restaurant/${testRestaurant._id}/refresh`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.ok(res.status === 200 || res.status === 502);
    });
  });

  testDescribe('DELETE /api/fsa/restaurant/:restaurantId/link (Protected)', () => {
    test.it('should require authentication', async () => {
      await request(app)
        .delete(`/api/fsa/restaurant/${testRestaurant._id}/link`)
        .expect(401);
    });

    test.it('should only allow restaurant owner to unlink', async () => {
      await request(app)
        .delete(`/api/fsa/restaurant/${testRestaurant._id}/link`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    test.it('should unlink restaurant successfully', async () => {
      testRestaurant.fhrsId = 123456;
      testRestaurant.fsaRating = { value: '5', lastRefreshed: new Date(), isManuallyLinked: true };
      await testRestaurant.save();

      await request(app)
        .delete(`/api/fsa/restaurant/${testRestaurant._id}/link`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then(async () => {
          const updated = await Restaurant.findById(testRestaurant._id);
          assert.equal(updated.fhrsId, null);
        });
    });
  });

  testDescribe('FSA Not Found Handling', () => {
    test.it('fhrsId null should return linked: false', async () => {
      await request(app)
        .get(`/api/fsa/restaurant/${testRestaurant._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((res) => {
          assert.equal(res.body.data.linked, false);
          assert.equal(res.body.data.rating, null);
          assert.equal(res.body.data.badgeUrl, null);
        });
    });

    test.it('search with non-existent restaurant should return matched: false', async () => {
      await request(app)
        .get('/api/fsa/search?name=NonExistentRestaurantXYZ99999999')
        .expect(200)
        .then((res) => {
          assert.equal(res.body.success, true);
          assert.equal(res.body.data.matched, false);
        });
    });
  });
});
