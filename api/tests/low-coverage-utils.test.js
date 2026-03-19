import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import axios from 'axios';

import config from '../config.js';
import { generateUniqueSlug } from '../utils/generateUniqueSlug.js';
import { geocodeAddress } from '../utils/geocode.js';
import {
  verifyAdmin,
  verifyAdminOrSuperAdmin,
  verifyRestaurantOwner,
  verifySuperAdmin
} from '../utils/roleGuards.js';
import Restaurant from '../models/restaurant.model.js';
import { softDeleteRestorePlugin } from '../utils/plugins/softDeleteRestore.plugin.js';
import { createRateLimit } from '../utils/rateLimit.js';

const createNextRecorder = () => {
  const calls = [];
  const next = (error) => {
    calls.push(error ?? null);
  };

  return { calls, next };
};

const createResponse = () => {
  const headers = new Map();
  return {
    headers,
    setHeader(name, value) {
      headers.set(name, value);
    }
  };
};

test('generateUniqueSlug covers unique, collision, and session-scoped query branches', async (t) => {
  const plainQueries = [];
  const model = {
    findOne(query) {
      plainQueries.push(query);
      const isCollision = query.slug === 'my-store';
      return {
        lean: async () => (isCollision ? { _id: 'existing' } : null)
      };
    }
  };

  const first = await generateUniqueSlug({
    model,
    baseValue: 'My Store'
  });
  assert.equal(first, 'my-store-1');
  assert.deepEqual(plainQueries, [{ slug: 'my-store' }, { slug: 'my-store-1' }]);

  const sessionCalls = [];
  const sessionModel = {
    findOne(query) {
      sessionCalls.push({ query, stage: 'findOne' });
      return {
        session(session) {
          sessionCalls.push({ session, stage: 'session' });
          return {
            lean: async () => null
          };
        }
      };
    }
  };

  const slug = await generateUniqueSlug({
    model: sessionModel,
    baseValue: 'Scoped Name',
    scope: { restaurantId: 'r1' },
    session: { id: 'session-1' }
  });

  assert.equal(slug, 'scoped-name');
  assert.deepEqual(sessionCalls, [
    { query: { slug: 'scoped-name', restaurantId: 'r1' }, stage: 'findOne' },
    { session: { id: 'session-1' }, stage: 'session' }
  ]);

  t.mock.restoreAll();
});

test('geocodeAddress covers missing configuration, no results, and successful coordinate mapping', async (t) => {
  const originalApiKey = config.googleMapsApiKey;

  try {
    config.googleMapsApiKey = '';
    await assert.rejects(
      geocodeAddress({
        addressLine1: '1 Main St',
        areaLocality: 'Downtown',
        city: 'Chennai',
        postcode: '600001',
        country: 'India'
      }),
      /Geocoding service is not configured/
    );

    config.googleMapsApiKey = 'maps-key';
    const axiosMock = t.mock.method(axios, 'get', async () => ({
      data: { results: [] }
    }));

    await assert.rejects(
      geocodeAddress({
        addressLine1: '1 Main St',
        areaLocality: 'Downtown',
        city: 'Chennai',
        postcode: '600001',
        country: 'India'
      }),
      /Unable to geocode address/
    );
    assert.equal(axiosMock.mock.calls.length, 1);

    axiosMock.mock.restore();
    t.mock.method(axios, 'get', async (url, options) => {
      assert.equal(url, 'https://maps.googleapis.com/maps/api/geocode/json');
      assert.equal(options.params.key, 'maps-key');
      assert.match(options.params.address, /1 Main St/);
      return {
        data: {
          results: [
            {
              geometry: {
                location: {
                  lat: 13.0827,
                  lng: 80.2707
                }
              }
            }
          ]
        }
      };
    });

    const point = await geocodeAddress({
      addressLine1: '1 Main St',
      areaLocality: 'Downtown',
      city: 'Chennai',
      postcode: '600001',
      country: 'India'
    });

    assert.deepEqual(point, {
      type: 'Point',
      coordinates: [80.2707, 13.0827]
    });
  } finally {
    config.googleMapsApiKey = originalApiKey;
  }
});

test('role guards cover authorization, validation, ownership, and success branches', async (t) => {
  {
    const { calls, next } = createNextRecorder();
    await verifyRestaurantOwner({ user: null, params: { id: 'abc' } }, {}, next);
    assert.equal(calls[0].statusCode, 401);
  }

  {
    const { calls, next } = createNextRecorder();
    await verifyRestaurantOwner(
      { user: { id: 'u1', role: 'admin' }, params: { id: 'bad-id' } },
      {},
      next
    );
    assert.equal(calls[0].statusCode, 400);
  }

  const validId = new mongoose.Types.ObjectId().toString();

  {
    t.mock.method(Restaurant, 'findById', () => ({
      select: async () => null
    }));
    const { calls, next } = createNextRecorder();
    await verifyRestaurantOwner(
      { user: { id: 'u1', role: 'admin' }, params: { id: validId } },
      {},
      next
    );
    assert.equal(calls[0].statusCode, 404);
    t.mock.restoreAll();
  }

  {
    t.mock.method(Restaurant, 'findById', () => ({
      select: async () => ({ adminId: new mongoose.Types.ObjectId() })
    }));
    const { calls, next } = createNextRecorder();
    await verifyRestaurantOwner(
      { user: { id: new mongoose.Types.ObjectId().toString(), role: 'admin' }, params: { id: validId } },
      {},
      next
    );
    assert.equal(calls[0].statusCode, 403);
    t.mock.restoreAll();
  }

  {
    const ownerId = new mongoose.Types.ObjectId();
    t.mock.method(Restaurant, 'findById', () => ({
      select: async () => ({ adminId: ownerId })
    }));
    const req = {
      user: { id: ownerId.toString(), role: 'admin' },
      params: { id: validId }
    };
    const { calls, next } = createNextRecorder();
    await verifyRestaurantOwner(req, {}, next);
    assert.equal(calls[0], null);
    assert.equal(req.restaurant.adminId.toString(), ownerId.toString());
    t.mock.restoreAll();
  }

  {
    const { calls, next } = createNextRecorder();
    verifyAdminOrSuperAdmin({ user: null }, {}, next);
    assert.equal(calls[0].statusCode, 401);
  }

  {
    const { calls, next } = createNextRecorder();
    verifyAdminOrSuperAdmin({ user: { role: 'user' } }, {}, next);
    assert.equal(calls[0].statusCode, 403);
  }

  {
    const { calls, next } = createNextRecorder();
    verifyAdminOrSuperAdmin({ user: { role: 'admin' } }, {}, next);
    assert.equal(calls[0], null);
  }

  {
    const { calls, next } = createNextRecorder();
    verifySuperAdmin({ user: { role: 'admin' } }, {}, next);
    assert.equal(calls[0].statusCode, 403);
  }

  {
    const { calls, next } = createNextRecorder();
    verifySuperAdmin({ user: { role: 'superAdmin' } }, {}, next);
    assert.equal(calls[0], null);
  }

  {
    const { calls, next } = createNextRecorder();
    verifyAdmin({ user: null }, {}, next);
    assert.equal(calls[0].statusCode, 401);
  }

  {
    const { calls, next } = createNextRecorder();
    verifyAdmin({ user: { role: 'user' } }, {}, next);
    assert.equal(calls[0].statusCode, 403);
  }

  {
    const { calls, next } = createNextRecorder();
    verifyAdmin({ user: { role: 'admin' } }, {}, next);
    assert.equal(calls[0], null);
  }
});

test('softDeleteRestorePlugin adds fields, filters inactive records, and supports soft delete and restore', async () => {
  const schema = new mongoose.Schema({ name: String });
  softDeleteRestorePlugin(schema);

  assert.equal(Boolean(schema.path('isActive')), true);
  assert.equal(Boolean(schema.path('deletedAt')), true);
  assert.equal(Boolean(schema.path('restoredBy')), true);

  const preFindHooks = schema.s.hooks._pres.get('find');
  assert.equal(preFindHooks.length > 0, true);

  const filteredQuery = {
    _conditions: {},
    getOptions() {
      return {};
    },
    where(condition) {
      this._conditions = { ...this._conditions, ...condition };
    }
  };
  await preFindHooks[0].fn.call(filteredQuery);
  assert.deepEqual(filteredQuery._conditions, { isActive: true });

  const unfilteredQuery = {
    _conditions: {},
    getOptions() {
      return { includeInactive: true };
    },
    where(condition) {
      this._conditions = { ...this._conditions, ...condition };
    }
  };
  await preFindHooks[0].fn.call(unfilteredQuery);
  assert.deepEqual(unfilteredQuery._conditions, {});

  const actorId = new mongoose.Types.ObjectId();
  const doc = {
    isActive: true,
    saveCalls: [],
    async save(options) {
      this.saveCalls.push(options ?? null);
      return this;
    }
  };

  await schema.methods.softDelete.call(doc, null, actorId);
  assert.equal(doc.isActive, false);
  assert.equal(doc.deletedBy.toString(), actorId.toString());
  assert.equal(doc.saveCalls.at(-1), null);

  await schema.methods.restore.call(doc, { id: 'session-1' }, actorId);
  assert.equal(doc.isActive, true);
  assert.equal(doc.restoredBy.toString(), actorId.toString());
  assert.deepEqual(doc.saveCalls.at(-1), { session: { id: 'session-1' } });
});

test('createRateLimit covers header-setting, pass-through, and blocking branches', async () => {
  const middleware = createRateLimit({
    windowMs: 5000,
    max: 2,
    keyPrefix: `test-${Date.now()}`
  });

  {
    const res = createResponse();
    const { calls, next } = createNextRecorder();
    await middleware({ ip: '1.1.1.1', headers: {} }, res, next);
    assert.equal(res.headers.get('X-RateLimit-Limit'), '2');
    assert.equal(res.headers.get('X-RateLimit-Remaining'), '1');
    assert.equal(res.headers.get('X-RateLimit-Reset'), '5');
    assert.equal(calls[0], null);
  }

  {
    const res = createResponse();
    const { calls, next } = createNextRecorder();
    await middleware({ ip: '1.1.1.1', headers: {} }, res, next);
    assert.equal(res.headers.get('X-RateLimit-Remaining'), '0');
    assert.equal(calls[0], null);
  }

  {
    const res = createResponse();
    const { calls, next } = createNextRecorder();
    await middleware(
      { ip: '1.1.1.1', headers: {} },
      res,
      next
    );
    assert.equal(res.headers.get('Retry-After'), '5');
    assert.equal(calls[0].statusCode, 429);
  }
});
