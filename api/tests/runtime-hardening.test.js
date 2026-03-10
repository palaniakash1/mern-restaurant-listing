import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import config from '../config.js';
import {
  createCookieCsrfGuard,
  createCsrfMiddleware,
  generateToken,
  removeToken
} from '../middlewares/csrfProtection.js';
import {
  createHealthCheck,
  createReadinessProbe
} from '../middlewares/healthCheck.js';
import {
  createMetricsEndpoint,
  metricsMiddleware
} from '../middlewares/metrics.js';
import {
  atomicRateLimitIncrement,
  clear as clearRedisMemory,
  closeRedis,
  del,
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

  it('security telemetry should exercise memory fallback counters', async () => {
    await incrementSecurityEvent('login_failed');
    await incrementSecurityEvent('login_lockout_started', 3);
    await incrementSecurityEvent('', 2);

    const telemetry = await getSecurityTelemetry();
    assert.equal(telemetry.login_failed, 1);
    assert.equal(telemetry.login_lockout_started, 3);
    assert.equal(telemetry.refresh_invalid, 0);
  });
});
