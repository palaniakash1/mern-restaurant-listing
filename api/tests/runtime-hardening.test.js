import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import mongoose from 'mongoose';

import config from '../config.js';
import {
  createCookieCsrfGuard,
  createCsrfMiddleware,
  generateToken,
  removeToken
} from '../middlewares/csrfProtection.js';
import {
  createHealthCheck,
  createLivenessProbe,
  createReadinessProbe
} from '../middlewares/healthCheck.js';
import {
  createMetricsEndpoint,
  metricsMiddleware
} from '../middlewares/metrics.js';
import {
  __setRedisTestState,
  atomicRateLimitIncrement,
  clear as clearRedisMemory,
  closeRedis,
  del,
  deleteKey,
  get,
  getCacheStats,
  getJson,
  getOrFetch,
  initRedis,
  invalidatePattern,
  set,
  setJson,
  setJsonIfAbsent
} from '../utils/redisCache.js';
import {
  getSecurityTelemetry,
  incrementSecurityEvent,
  resetSecurityTelemetry
} from '../utils/securityTelemetry.js';
import {
  authOperationTotal,
  databaseOperationDuration,
  httpRequestDuration,
  httpRequestTotal,
  meter,
  refreshTokensActive,
  shutdownTracing,
  updateRefreshTokenMetrics
} from '../tracing.js';

const createMockReqRes = ({
  method = 'GET',
  path = '/runtime-test',
  baseUrl = '',
  routePath,
  statusCode = 200,
  headers = {},
  cookies = {},
  authSource,
  user,
  session
} = {}) => {
  const req = {
    method,
    path,
    baseUrl,
    route: routePath ? { path: routePath } : undefined,
    headers,
    cookies,
    authSource,
    user,
    session
  };

  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.body = null;
  res.headers = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  res.setHeader = (key, value) => {
    res.headers[key] = value;
  };

  return { req, res };
};

describe('Runtime hardening branches', { concurrency: false }, () => {
  const originalEmailServiceUrl = config.emailServiceUrl;
  const originalRedisUrl = config.redis.url;

  beforeEach(async () => {
    config.emailServiceUrl = originalEmailServiceUrl;
    config.redis.url = originalRedisUrl;
    resetSecurityTelemetry();
    __setRedisTestState();
    await clearRedisMemory();
    await closeRedis();
  });

  it('csrf middleware should cover optional, invalid, and valid token branches', async () => {
    const middleware = createCsrfMiddleware();
    const userId = 'user-1';
    const token = generateToken(userId);

    {
      const { req, res } = createMockReqRes({
        method: 'POST',
        headers: {},
        user: { id: userId }
      });
      let nextCalled = false;
      middleware(req, res, () => {
        nextCalled = true;
      });
      assert.equal(nextCalled, true);
    }

    {
      const { req, res } = createMockReqRes({
        method: 'POST',
        headers: { 'x-csrf-token': 'bad-token' },
        user: { id: userId }
      });
      middleware(req, res, () => {});
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.message, 'Invalid or expired CSRF token');
    }

    {
      const { req, res } = createMockReqRes({
        method: 'POST',
        headers: { 'x-csrf-token': token },
        user: { id: userId }
      });
      let nextCalled = false;
      middleware(req, res, () => {
        nextCalled = true;
      });
      assert.equal(nextCalled, true);
      removeToken(token);
    }
  });

  it('cookie csrf guard should skip and reject in the expected browser-auth branches', async () => {
    const guard = createCookieCsrfGuard();

    {
      const { req, res } = createMockReqRes({
        method: 'POST',
        authSource: 'header',
        cookies: {},
        headers: {}
      });
      let nextCalled = false;
      guard(req, res, () => {
        nextCalled = true;
      });
      assert.equal(nextCalled, true);
    }

    {
      const { req, res } = createMockReqRes({
        method: 'PATCH',
        authSource: 'cookie',
        cookies: { access_token: 'cookie-auth' },
        headers: {}
      });
      let nextCalled = false;
      guard(req, res, () => {
        nextCalled = true;
      });
      assert.equal(nextCalled, true);
    }

    {
      const { req, res } = createMockReqRes({
        method: 'DELETE',
        authSource: 'cookie',
        cookies: { access_token: 'cookie-auth', csrf_token: 'a' },
        headers: { origin: 'http://localhost:3000', 'x-csrf-token': 'b' }
      });
      guard(req, res, () => {});
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.message, 'Invalid or missing CSRF token');
    }

    {
      const { req, res } = createMockReqRes({
        method: 'DELETE',
        authSource: 'cookie',
        cookies: { access_token: 'cookie-auth', csrf_token: 'same-token' },
        headers: { origin: 'http://localhost:3000', 'x-csrf-token': 'same-token' }
      });
      let nextCalled = false;
      guard(req, res, () => {
        nextCalled = true;
      });
      assert.equal(nextCalled, true);
    }
  });

  it('health checks should cover environment, dependency, and readiness branches', async () => {
    const originalFetch = globalThis.fetch;
    const originalAbortSignal = globalThis.AbortSignal;

    try {
      config.emailServiceUrl = 'https://email.internal';
      globalThis.fetch = async () => ({ ok: false });
      globalThis.AbortSignal = { timeout: () => ({}) };

      const handler = createHealthCheck({
        include: ['system', 'environment', 'dependencies']
      });
      const { req, res } = createMockReqRes();
      await handler(req, res);

      assert.equal(res.statusCode, 503);
      assert.equal(res.body.status, 'error');
      assert.equal(res.body.checks.environment.valid, true);
      assert.equal(res.body.checks.dependencies.checks.redis.status, 'degraded');
      assert.equal(
        res.body.checks.dependencies.checks.emailService.status,
        'unhealthy'
      );

      const readiness = createReadinessProbe();
      const readinessContext = createMockReqRes();
      await readiness(readinessContext.req, readinessContext.res);
      assert.equal(readinessContext.res.statusCode, 503);
      assert.equal(readinessContext.res.body.status, 'not_ready');
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.AbortSignal = originalAbortSignal;
    }
  });

  it('health probes should cover liveness, mongo unhealthy, mongo healthy, and invalid environment branches', async () => {
    const originalJwtSecret = config.jwtSecret;
    const originalDatabaseUrl = config.databaseUrl;
    const originalReadyState = mongoose.connection.readyState;
    const originalConnectionName = mongoose.connection.name;
    const originalDb = mongoose.connection.db;

    try {
      const liveness = createLivenessProbe();
      const livenessContext = createMockReqRes();
      liveness(livenessContext.req, livenessContext.res);
      assert.equal(livenessContext.res.statusCode, 200);
      assert.equal(livenessContext.res.body.status, 'alive');

      config.jwtSecret = '';
      config.databaseUrl = '';
      const invalidEnvHandler = createHealthCheck({ include: ['environment'] });
      const invalidEnvContext = createMockReqRes();
      await invalidEnvHandler(invalidEnvContext.req, invalidEnvContext.res);
      assert.equal(invalidEnvContext.res.statusCode, 503);
      assert.equal(invalidEnvContext.res.body.checks.environment.valid, false);
      assert.deepEqual(
        invalidEnvContext.res.body.checks.environment.missing.sort(),
        ['DATABASE_URL', 'JWT_SECRET']
      );

      Object.defineProperty(mongoose.connection, 'readyState', {
        configurable: true,
        value: 0
      });
      mongoose.connection.name = 'runtime-test-db';
      const unhealthyMongoHandler = createHealthCheck({ include: ['mongo'] });
      const unhealthyMongoContext = createMockReqRes();
      await unhealthyMongoHandler(
        unhealthyMongoContext.req,
        unhealthyMongoContext.res
      );
      assert.equal(unhealthyMongoContext.res.statusCode, 503);
      assert.equal(unhealthyMongoContext.res.body.checks.mongodb.status, 'unhealthy');
      assert.equal(unhealthyMongoContext.res.body.checks.mongodb.state, 'disconnected');

      Object.defineProperty(mongoose.connection, 'readyState', {
        configurable: true,
        value: 1
      });
      mongoose.connection.db = {
        async command() {
          return { ok: 1 };
        }
      };
      const healthyMongoHandler = createHealthCheck({ include: ['mongo'] });
      const healthyMongoContext = createMockReqRes();
      await healthyMongoHandler(healthyMongoContext.req, healthyMongoContext.res);
      assert.equal(healthyMongoContext.res.statusCode, 200);
      assert.equal(healthyMongoContext.res.body.checks.mongodb.status, 'healthy');

      const readiness = createReadinessProbe();
      const readinessContext = createMockReqRes();
      await readiness(readinessContext.req, readinessContext.res);
      assert.equal(readinessContext.res.statusCode, 200);
      assert.equal(readinessContext.res.body.status, 'ready');
    } finally {
      config.jwtSecret = originalJwtSecret;
      config.databaseUrl = originalDatabaseUrl;
      Object.defineProperty(mongoose.connection, 'readyState', {
        configurable: true,
        value: originalReadyState
      });
      mongoose.connection.name = originalConnectionName;
      mongoose.connection.db = originalDb;
    }
  });

  it('metrics middleware and endpoint should aggregate request and error stats', async () => {
    const middlewareContext = createMockReqRes({
      method: 'GET',
      path: '/boom',
      routePath: '/boom',
      baseUrl: '/api'
    });

    let nextCalled = false;
    metricsMiddleware(middlewareContext.req, middlewareContext.res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);

    middlewareContext.res.statusCode = 503;
    middlewareContext.res.emit('finish');

    const endpoint = createMetricsEndpoint();
    const endpointContext = createMockReqRes();
    let nextError = null;
    await endpoint(endpointContext.req, endpointContext.res, (error) => {
      nextError = error;
    });

    assert.equal(nextError, null);
    assert.equal(endpointContext.res.body.requests.total >= 1, true);
    assert.equal(endpointContext.res.body.requests.statusClassCounts['5xx'] >= 1, true);
    assert.equal(endpointContext.res.body.routes['GET /api/boom'].errors >= 1, true);
    assert.ok(endpointContext.res.body.latencyMs.sampleSize >= 1);
  });

  it('metrics middleware and endpoint should cover 3xx/4xx paths and endpoint error forwarding', async () => {
    const redirectContext = createMockReqRes({
      method: 'POST',
      path: '/redirect',
      routePath: '/redirect',
      baseUrl: '/api'
    });
    metricsMiddleware(redirectContext.req, redirectContext.res, () => {});
    redirectContext.res.statusCode = 302;
    redirectContext.res.emit('finish');

    const clientErrorContext = createMockReqRes({
      method: 'DELETE',
      path: '/missing',
      routePath: '/missing',
      baseUrl: '/api'
    });
    metricsMiddleware(clientErrorContext.req, clientErrorContext.res, () => {});
    clientErrorContext.res.statusCode = 404;
    clientErrorContext.res.emit('finish');
    clientErrorContext.res.emit('finish');

    const endpoint = createMetricsEndpoint();
    const endpointContext = createMockReqRes();
    endpointContext.res.json = () => {
      throw new Error('metrics render failed');
    };

    let nextError = null;
    await endpoint(endpointContext.req, endpointContext.res, (error) => {
      nextError = error;
    });

    assert.equal(nextError?.message, 'metrics render failed');
  });

  it('redis cache helpers should exercise memory fallback branches', async () => {
    config.redis.url = null;
    const initResult = await initRedis();
    assert.equal(initResult, false);

    await set('alpha', { value: 1 }, 5);
    assert.deepEqual(await get('alpha'), { value: 1 });

    const fetched = await getOrFetch('alpha', async () => ({ value: 2 }), 5);
    assert.deepEqual(fetched, { value: 1 });

    await set('prefix:first', { ok: true }, 5);
    await set('prefix:second', { ok: true }, 5);
    await invalidatePattern('prefix:*');
    assert.equal(await get('prefix:first'), null);

    const firstSet = await setJsonIfAbsent('idempotency:key', { ok: true }, 5);
    const secondSet = await setJsonIfAbsent('idempotency:key', { ok: false }, 5);
    assert.equal(firstSet, true);
    assert.equal(secondSet, false);

    await setJson('json:key', { ok: 1 }, 5);
    assert.deepEqual(await getJson('json:key'), { ok: 1 });

    const firstRate = await atomicRateLimitIncrement('rate:key', 50);
    const secondRate = await atomicRateLimitIncrement('rate:key', 50);
    assert.equal(firstRate.count, 1);
    assert.equal(secondRate.count, 2);

    await del('alpha');
    assert.equal(await get('alpha'), null);

    const stats = getCacheStats();
    assert.equal(stats.redis, false);
    assert.ok(stats.memorySize >= 1);
  });

  it('redis cache helpers should cover serialization guards and deleteKey fallbacks', async () => {
    const circular = {};
    circular.self = circular;

    assert.equal(await set('circular', circular, 5), false);
    assert.equal(await setJson('circular-json', circular, 5), false);
    assert.equal(await setJsonIfAbsent('circular-nx', circular, 5), false);

    await setJson('delete-key', { ok: true }, 5);
    await deleteKey('delete-key');
    assert.equal(await getJson('delete-key'), null);
  });

  it('redis init and cache helpers should cover no-url, already-connected, and redis-backed operations', async () => {
    config.redis.url = null;
    assert.equal(await initRedis(), false);

    const connectedClient = {
      async get(key) {
        if (key === 'cache:cached-key') {
          return JSON.stringify({ ok: true });
        }
        if (key === 'json:key') {
          return JSON.stringify({ mode: 'json' });
        }
        return null;
      },
      async setex() {},
      async del() {},
      async keys() {
        return ['cache:one', 'cache:two'];
      },
      async set() {
        return 'OK';
      },
      multi() {
        return {
          incr() {
            return this;
          },
          pexpire() {
            return this;
          },
          pttl() {
            return this;
          },
          async exec() {
            return [[null, 2], [null, 1], [null, 1234]];
          }
        };
      }
    };

    config.redis.url = 'redis://runtime-test';
    __setRedisTestState({ client: connectedClient, available: true });
    assert.equal(await initRedis(), true);
    assert.deepEqual(await get('cached-key'), { ok: true });
    assert.deepEqual(await getJson('json:key'), { mode: 'json' });
    assert.equal(await setJsonIfAbsent('json:absent-ok', { ok: 1 }, 30), true);
    assert.equal(await set('connected-key', { value: 1 }, 30), true);
    assert.equal((await atomicRateLimitIncrement('rate:key:connected', 1000)).count, 2);
    await del('connected-key');
    await invalidatePattern('cache:*');
    await clearRedisMemory();
  });

  it('redis helpers should cover parse and fallback branches when redis returns bad payloads', async () => {
    __setRedisTestState({
      available: true,
      client: {
        async get(key) {
          if (key === 'cache:bad-json') return '{bad-json';
          if (key === 'bad-json-key') return '{bad-json';
          return null;
        }
      }
    });

    assert.equal(await get('bad-json'), null);
    assert.equal(await getJson('bad-json-key'), null);
    assert.equal(getCacheStats().redis, false);
  });

  it('security telemetry should exercise memory fallback counters', async () => {
    await incrementSecurityEvent('login_failed');
    await incrementSecurityEvent('login_lockout_started', 3);
    await incrementSecurityEvent('', 2);

    const telemetry = await getSecurityTelemetry();
    assert.equal(telemetry.login_failed, 1);
    assert.equal(telemetry.login_lockout_started, 3);
    assert.equal(telemetry.refresh_invalid, 0);
  });

  it('redis shutdown and helpers should cover client error fallbacks', async () => {
    let disconnectCalls = 0;
    __setRedisTestState({
      available: true,
      client: {
        async quit() {
          throw new Error('quit failed');
        },
        disconnect() {
          disconnectCalls += 1;
        }
      }
    });

    await closeRedis();
    assert.equal(disconnectCalls, 1);

    let setexCalls = 0;
    let getCalls = 0;
    let delCalls = 0;
    let keysCalls = 0;
    let setCalls = 0;
    let execCalls = 0;
    const failingRedis = {
      async get() {
        getCalls += 1;
        throw new Error('get failed');
      },
      async setex() {
        setexCalls += 1;
        throw new Error('setex failed');
      },
      async del() {
        delCalls += 1;
        throw new Error('del failed');
      },
      async keys() {
        keysCalls += 1;
        throw new Error('keys failed');
      },
      multi() {
        return {
          incr() {
            return this;
          },
          pexpire() {
            return this;
          },
          pttl() {
            return this;
          },
          async exec() {
            execCalls += 1;
            throw new Error('multi failed');
          }
        };
      },
      async set() {
        setCalls += 1;
        throw new Error('set failed');
      }
    };

    __setRedisTestState({ client: failingRedis, available: true });
    await set('fallback-set', { ok: true }, 5);
    assert.equal(setexCalls, 1);
    assert.deepEqual(await get('fallback-set'), { ok: true });
    assert.equal(getCalls, 0);

    await setJson('json-fallback', { ok: true }, 5);
    assert.equal(setCalls, 0);
    assert.deepEqual(await getJson('json-fallback'), { ok: true });
    assert.equal(getCalls, 0);

    const setIfAbsentResult = await setJsonIfAbsent('json-absent', { ok: true }, 5);
    assert.equal(setIfAbsentResult, true);
    assert.equal(setCalls, 0);

    await del('fallback-set');
    await invalidatePattern('json-*');
    await clearRedisMemory();
    const rateState = await atomicRateLimitIncrement('runtime-rate', 100);
    assert.equal(rateState.count, 1);
    assert.equal(getCacheStats().redis, false);
    assert.equal(delCalls, 0);
    assert.equal(keysCalls, 0);
    assert.equal(execCalls, 0);
  });

  it('redis helpers should cover redis parse failures and clear/delete fallback behavior', async () => {
    let deleteCalls = 0;
    __setRedisTestState({
      available: true,
      client: {
        async get(key) {
          if (key === 'cache:broken-json') {
            return '{invalid';
          }
          if (key === 'json:broken') {
            return '{invalid';
          }
          return null;
        },
        async keys() {
          return [];
        },
        async del() {
          deleteCalls += 1;
        }
      }
    });

    assert.equal(await get('broken-json'), null);
    assert.equal(await getJson('json:broken'), null);

    await clearRedisMemory();
    await del('missing-key');
    await deleteKey('json:missing');
    assert.equal(deleteCalls, 0);
    assert.equal(getCacheStats().redis, false);
  });

  it('security telemetry should cover redis-backed and redis-fallback branches', async () => {
    let incrbyCalls = 0;
    __setRedisTestState({
      client: {
        async incrby(key, delta) {
          incrbyCalls += 1;
          assert.equal(key, 'security:telemetry:refresh_invalid');
          assert.equal(delta, 2);
        },
        async mget(keys) {
          assert.equal(keys.length >= 1, true);
          return ['2', '-4', 'abc', null];
        }
      },
      available: true
    });

    await incrementSecurityEvent('refresh_invalid', 2);
    assert.equal(incrbyCalls, 1);

    const redisTelemetry = await getSecurityTelemetry();
    assert.equal(redisTelemetry.login_failed, 2);
    assert.equal(redisTelemetry.login_lockout_started, 0);
    assert.equal(redisTelemetry.login_lockout_blocked, 0);

    __setRedisTestState({
      client: {
        async incrby() {
          throw new Error('telemetry failed');
        },
        async mget() {
          throw new Error('mget failed');
        }
      },
      available: true
    });

    await incrementSecurityEvent('sessions_revoked_all', 4);
    const fallbackTelemetry = await getSecurityTelemetry();
    assert.equal(fallbackTelemetry.sessions_revoked_all, 4);
  });

  it('tracing no-op metrics should be callable in test mode', async () => {
    const histogram = meter.createHistogram('http_request_duration_ms');
    const counter = meter.createCounter('http_requests_total');
    const upDownCounter = meter.createUpDownCounter('refresh_tokens_active');

    histogram.record(12.34);
    counter.add(1, { route: '/health' });
    upDownCounter.add(2);
    httpRequestDuration.record(10, { method: 'GET' });
    httpRequestTotal.add(1, { method: 'GET' });
    databaseOperationDuration.record(4, { operation: 'find' });
    authOperationTotal.add(1, { operation: 'signin' });
    updateRefreshTokenMetrics(3);
    refreshTokensActive.add(-1);

    await shutdownTracing();
    assert.equal(typeof histogram.record, 'function');
    assert.equal(typeof counter.add, 'function');
    assert.equal(typeof upDownCounter.add, 'function');
  });
});
