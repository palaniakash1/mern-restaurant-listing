import test from 'node:test';
import assert from 'node:assert/strict';

import { createUserBySuperAdmin } from '../controllers/admin.controller.js';
import {
  createReview,
  deleteReview,
  getMyReviews,
  getRestaurantReviewSummary,
  getReviewById,
  listRestaurantReviews,
  moderateReview,
  updateReview
} from '../controllers/review.controller.js';
import { isRestaurantOpen } from '../utils/openNow.js';
import { paginate } from '../utils/paginate.js';
import { can, canAny } from '../utils/policy.js';

const createRes = () => {
  let statusCode = 200;
  let payload = null;

  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
    }
  };
};

const invoke = async (handler, req = {}) => {
  const res = createRes();
  let nextError = null;
  await handler(req, res, (error) => {
    nextError = error;
  });
  return { res, nextError };
};

const withMockedDate = async (isoDate, fn) => {
  const originalDate = global.Date;
  const fixed = new originalDate(isoDate);

  class MockDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [fixed]));
    }

    static now() {
      return fixed.getTime();
    }

    toLocaleDateString(...args) {
      if (args[0] === 'en-us') {
        return 'Monday';
      }
      return super.toLocaleDateString(...args);
    }

    getHours() {
      return 10;
    }

    getMinutes() {
      return 30;
    }
  }

  global.Date = MockDate;
  try {
    await fn();
  } finally {
    global.Date = originalDate;
  }
};

const withEnv = async (changes, fn) => {
  const original = new Map();
  for (const [key, value] of Object.entries(changes)) {
    original.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    await fn();
  } finally {
    for (const [key, value] of original.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

test('config throws when required database or jwt env variables are missing', async () => {
  await withEnv(
    {
      DATABASE_URL: '',
      MONGO: '',
      JWT_SECRET: 'test-secret'
    },
    async () => {
      await assert.rejects(
        import(`../config.js?missing-env=${Date.now()}`),
        /Missing required environment variable: DATABASE_URL \(or MONGO\)/
      );
    }
  );

  await withEnv(
    {
      DATABASE_URL: 'mongodb://localhost/test-db',
      MONGO: '',
      JWT_SECRET: ''
    },
    async () => {
      await assert.rejects(
        import(`../config.js?missing-jwt=${Date.now()}`),
        /Missing required environment variable: JWT_SECRET/
      );
    }
  );
});

test('paginate covers defaults, lower bounds, upper cap, and next-page calculation branches', () => {
  assert.deepEqual(paginate({ total: 0 }), {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasPrev: false,
    hasNext: false,
    skip: 0
  });

  assert.deepEqual(paginate({ page: '0', limit: '999', total: 80 }), {
    page: 1,
    limit: 50,
    total: 80,
    totalPages: 2,
    hasPrev: false,
    hasNext: true,
    skip: 0
  });

  assert.deepEqual(paginate({ page: '3', limit: '20', total: 60 }), {
    page: 3,
    limit: 20,
    total: 60,
    totalPages: 3,
    hasPrev: true,
    hasNext: false,
    skip: 40
  });
});

test('policy guards cover unauthorized, denied, invalid-resource, and success branches', () => {
  const call = (middleware, req) => {
    const res = {};
    let nextError = null;
    middleware(req, res, (error) => {
      nextError = error ?? null;
    });
    return nextError;
  };

  assert.equal(call(can('create', 'restaurant'), {}).statusCode, 401);
  assert.equal(
    call(can('createPrivilegedUser', 'admin'), { user: { role: 'admin' } })
      .statusCode,
    403
  );
  assert.equal(
    call(can('createPrivilegedUser', 'admin'), { user: { role: 'superAdmin' } }),
    null
  );

  assert.equal(call(canAny(['readById'], 'review'), {}).statusCode, 401);
  assert.equal(
    call(canAny(['readMine'], 'auth'), { user: { role: 'admin' } }).statusCode,
    403
  );
  assert.equal(
    call(canAny(['delete', 'updateItem'], 'menu'), { user: { role: 'user' } })
      .statusCode,
    403
  );
  assert.equal(
    call(canAny(['toggleAvailability', 'missing'], 'menu'), {
      user: { role: 'admin' }
    }),
    null
  );
});

test('isRestaurantOpen covers missing schedule, closed day, open window, and after-hours branches', async () => {
  assert.equal(isRestaurantOpen(null), false);

  await withMockedDate('2026-03-16T10:30:00.000Z', async () => {
    assert.equal(
      isRestaurantOpen({
        monday: { isClosed: true }
      }),
      false
    );

    assert.equal(
      isRestaurantOpen({
        monday: { open: '09:00', close: '11:00', isClosed: false }
      }),
      true
    );

    assert.equal(
      isRestaurantOpen({
        monday: { open: '11:00', close: '20:00', isClosed: false }
      }),
      false
    );
  });
});

test('admin controller forwards privileged-user creation failures through next', async () => {
  const result = await invoke(createUserBySuperAdmin, {
    user: { id: 'actor-1', role: 'admin' },
    body: {
      userName: 'manager',
      email: 'manager@example.com',
      password: 'Password1',
      role: 'storeManager'
    },
    ip: '127.0.0.1'
  });

  assert.equal(result.nextError.statusCode, 403);
  assert.match(result.nextError.message, /Only superAdmin/);
});

test('review controller guards cover invalid ids, invalid payloads, and forbidden access before persistence', async () => {
  let result = await invoke(createReview, {
    user: { id: 'user-1', role: 'admin' },
    params: { restaurantId: '507f1f77bcf86cd799439011' },
    body: { rating: 5 }
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(createReview, {
    user: { id: 'user-1', role: 'user' },
    params: { restaurantId: 'bad-id' },
    body: { rating: 5 }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(createReview, {
    user: { id: 'user-1', role: 'user' },
    params: { restaurantId: '507f1f77bcf86cd799439011' },
    body: { rating: 7 }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(listRestaurantReviews, {
    params: { restaurantId: 'bad-id' },
    query: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getMyReviews, {
    user: { id: 'admin-1', role: 'admin' },
    query: {}
  });
  assert.equal(result.nextError.statusCode, 403);

  result = await invoke(getReviewById, {
    user: { id: 'user-1', role: 'user' },
    params: { id: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(updateReview, {
    user: { id: 'user-1', role: 'user' },
    params: { id: 'bad-id' },
    body: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(updateReview, {
    user: { id: 'user-1', role: 'user' },
    params: { id: '507f1f77bcf86cd799439011' },
    body: { rating: 0 }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(deleteReview, {
    user: { id: 'user-1', role: 'user' },
    params: { id: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(moderateReview, {
    user: { id: 'admin-1', role: 'admin' },
    params: { id: 'bad-id' },
    body: { isActive: true }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(moderateReview, {
    user: { id: 'admin-1', role: 'admin' },
    params: { id: '507f1f77bcf86cd799439011' },
    body: { isActive: 'yes' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(getRestaurantReviewSummary, {
    params: { restaurantId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);
});
