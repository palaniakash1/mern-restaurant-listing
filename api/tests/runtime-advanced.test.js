import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import config from '../config.js';
import jwtRotationService from '../services/jwtRotation.service.js';
import {
  initTracing,
  shutdownTracing,
  traceAuthOperation,
  traceDatabaseOperation,
  tracingMiddleware,
  updateRefreshTokenMetrics
} from '../tracing.js';
import {
  clear,
  deleteKey,
  getCacheStats,
  set,
  setJson,
  setJsonIfAbsent
} from '../utils/redisCache.js';
import logger, { __loggerTestUtils } from '../utils/logger.js';

const restoreJwtState = (state) => {
  jwtRotationService.keys = state.keys;
  jwtRotationService.currentKeyId = state.currentKeyId;
  jwtRotationService.initialized = state.initialized;
  jwtRotationService.rotationTimer = state.rotationTimer;
  jwtRotationService.generateNewKey = state.generateNewKey;
  jwtRotationService.saveKey = state.saveKey;
};

test.beforeEach(async () => {
  logger.clearRecentLogs();
  jwtRotationService.stopRotationTimer();
  await clear();
});

test.after(() => {
  jwtRotationService.stopRotationTimer();
});

test('jwt rotation service exposes fallback signing, metadata, and current-key guards', () => {
  const originalState = {
    keys: jwtRotationService.keys,
    currentKeyId: jwtRotationService.currentKeyId,
    initialized: jwtRotationService.initialized,
    rotationTimer: jwtRotationService.rotationTimer,
    generateNewKey: jwtRotationService.generateNewKey,
    saveKey: jwtRotationService.saveKey
  };

  try {
    jwtRotationService.keys = new Map();
    jwtRotationService.currentKeyId = null;
    jwtRotationService.initialized = false;

    assert.throws(
      () => jwtRotationService.getCurrentKey(),
      /No active JWT key available/
    );

    const fallbackToken = jwtRotationService.signToken(
      { id: 'user-1', role: 'user' },
      { fallbackSecret: 'fallback-secret', expiresIn: '1h' }
    );
    const fallbackPayload = jwt.verify(fallbackToken, 'fallback-secret');
    assert.equal(fallbackPayload.id, 'user-1');

    const keyInfo = {
      kid: 'kid-1',
      secret: 'rotated-secret',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      active: true,
      algorithm: 'HS256'
    };
    jwtRotationService.keys.set(keyInfo.kid, keyInfo);
    jwtRotationService.currentKeyId = keyInfo.kid;
    jwtRotationService.initialized = true;

    const rotatedToken = jwtRotationService.signToken(
      { id: 'user-2', role: 'admin' },
      { expiresIn: '1h' }
    );
    const verifiedPayload = jwtRotationService.verifyToken(rotatedToken);
    const metadata = jwtRotationService.getKeyMetadata();

    assert.equal(verifiedPayload.id, 'user-2');
    assert.equal(metadata.currentKeyId, 'kid-1');
    assert.equal(metadata.totalKeys, 1);
    assert.equal(metadata.activeKeys, 1);
  } finally {
    restoreJwtState(originalState);
  }
});

test('jwt rotation service covers expired, manual rotation, and revocation branches', async () => {
  const originalState = {
    keys: jwtRotationService.keys,
    currentKeyId: jwtRotationService.currentKeyId,
    initialized: jwtRotationService.initialized,
    rotationTimer: jwtRotationService.rotationTimer,
    generateNewKey: jwtRotationService.generateNewKey,
    saveKey: jwtRotationService.saveKey
  };

  try {
    jwtRotationService.keys = new Map();
    jwtRotationService.initialized = true;

    const expiredKey = {
      kid: 'expired-kid',
      secret: 'expired-secret',
      created_at: new Date(Date.now() - 10_000).toISOString(),
      expires_at: new Date(Date.now() - 1_000).toISOString(),
      active: true,
      algorithm: 'HS256'
    };
    jwtRotationService.keys.set(expiredKey.kid, expiredKey);

    const expiredToken = jwt.sign(
      { id: 'expired-user', role: 'user' },
      expiredKey.secret,
      {
        algorithm: 'HS256',
        keyid: expiredKey.kid,
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
        expiresIn: '1h'
      }
    );

    assert.throws(
      () => jwtRotationService.verifyToken(expiredToken),
      /Key has expired/
    );

    await assert.rejects(
      jwtRotationService.revokeKey('missing-kid'),
      /Key not found/
    );

    jwtRotationService.currentKeyId = expiredKey.kid;
    jwtRotationService.saveKey = async () => {};
    jwtRotationService.generateNewKey =
      async function generateReplacementKey() {
        this.currentKeyId = 'replacement-kid';
        this.keys.set('replacement-kid', {
          kid: 'replacement-kid',
          secret: 'replacement-secret',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          active: true,
          algorithm: 'HS256'
        });
      };

    const revokeResult = await jwtRotationService.revokeKey(expiredKey.kid);
    assert.equal(revokeResult.revokedKeyId, expiredKey.kid);
    assert.equal(jwtRotationService.currentKeyId, 'replacement-kid');

    jwtRotationService.generateNewKey = async function manualRotation() {
      this.currentKeyId = 'manual-kid';
      this.keys.set('manual-kid', {
        kid: 'manual-kid',
        secret: 'manual-secret',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        active: true,
        algorithm: 'HS256'
      });
    };

    const manualResult = await jwtRotationService.rotateKeyManually();
    assert.equal(manualResult.success, true);
    assert.equal(manualResult.newKeyId, 'manual-kid');
  } finally {
    restoreJwtState(originalState);
  }
});

test('tracing helpers cover no-op init, error propagation, and trace-id fallback branches', async () => {
  const initResult = await initTracing();
  assert.equal(initResult, false);
  await shutdownTracing();

  await assert.rejects(
    traceDatabaseOperation('failing-op', async () => {
      throw new Error('db failed');
    }),
    /db failed/
  );

  const authFallback = await traceAuthOperation('metadata-only', 'user-77');
  assert.equal(authFallback.operation, 'metadata-only');
  assert.equal(authFallback.userId, 'user-77');

  const tracedResult = await traceAuthOperation(
    'wrapped-op',
    'user-88',
    { source: 'test', details: { ignored: true } },
    async () => 'ok'
  );
  assert.equal(tracedResult, 'ok');

  updateRefreshTokenMetrics(3);

  const req = {
    headers: {},
    requestId: 'req-trace-1'
  };
  const headers = {};
  const res = {
    setHeader(name, value) {
      headers[name] = value;
    }
  };

  let nextCalled = false;
  tracingMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.traceId, 'req-trace-1');
  assert.equal(headers['X-Trace-Id'], 'req-trace-1');
});

test('redis cache utilities cover serialization failures and delete/stat branches', async () => {
  const circular = {};
  circular.self = circular;

  assert.equal(await set('circular', circular), false);
  assert.equal(await setJson('json:circular', circular, 60), false);
  assert.equal(await setJsonIfAbsent('json:absent', circular, 60), false);

  await set('plain-key', { ok: true }, 60);
  await deleteKey('plain-key');

  const stats = getCacheStats();
  assert.equal(typeof stats.redis, 'boolean');
  assert.equal(typeof stats.memorySize, 'number');
});

test('logger enforces bounded buffers and safe recent-log retrieval', () => {
  logger.clearRecentLogs();

  for (let index = 0; index < 1005; index += 1) {
    logger.info(`entry-${index}`);
  }

  const recentLogs = logger.getRecentLogs(2000);
  const negativeRecentLogs = logger.getRecentLogs(-5);

  assert.equal(recentLogs.length, 1000);
  assert.equal(recentLogs[0].message, 'entry-1004');
  assert.deepEqual(negativeRecentLogs, []);
});

test('logger child metadata should redact secrets, truncate values, and preserve base metadata', () => {
  logger.clearRecentLogs();

  const childLogger = logger.child({
    component: 'runtime-test',
    authorization: 'Bearer sensitive',
    nested: {
      password: 'super-secret',
      values: Array.from({ length: 60 }, (_, index) => ({
        token: `token-${index}`
      }))
    }
  });

  childLogger.warn('x'.repeat(2505), {
    secretValue: 'hide-me',
    description: 'y'.repeat(2105)
  });

  const [entry] = logger.getRecentLogs(1);
  assert.equal(entry.level, 'warn');
  assert.equal(entry.component, 'runtime-test');
  assert.equal(entry.authorization, '[REDACTED]');
  assert.equal(entry.nested.password, '[REDACTED]');
  assert.equal(entry.nested.values.length, 50);
  assert.equal(entry.nested.values[0].token, '[REDACTED]');
  assert.equal(entry.secretValue, '[REDACTED]');
  assert.equal(entry.message.endsWith('...'), true);
  assert.equal(entry.description.endsWith('...'), true);
});

test('logger test helpers cover transport and pino config branches', () => {
  const prodTransport = __loggerTestUtils.buildTransportConfig(true);
  const devTransport = __loggerTestUtils.buildTransportConfig(false);
  const prodConfig = __loggerTestUtils.buildPinoConfig({
    production: true,
    testEnv: false
  });
  const testConfig = __loggerTestUtils.buildPinoConfig({
    production: true,
    testEnv: true
  });

  assert.equal(prodTransport.targets.length, 3);
  assert.equal(prodTransport.targets[0].options.destination, 1);
  assert.match(prodTransport.targets[1].options.destination, /error\.log$/);
  assert.match(prodTransport.targets[2].options.destination, /combined\.log$/);
  assert.equal(devTransport.targets.length, 1);
  assert.equal(devTransport.targets[0].target, 'pino-pretty');

  assert.equal(prodConfig.enabled, true);
  assert.ok(prodConfig.transport);
  assert.equal(testConfig.enabled, false);
  assert.equal('transport' in testConfig, false);
  assert.equal(
    prodConfig.serializers.req({
      method: 'GET',
      url: '/x',
      path: '/x',
      parameters: { q: 1 },
      headers: {}
    }).headers.host,
    undefined
  );
});

test('logger wrapper covers object logging paths and nested child bindings', () => {
  const calls = [];
  const sink = {
    debug(payload, message) {
      calls.push(['debug', payload, message]);
    },
    info(payload, message) {
      calls.push(['info', payload, message]);
    },
    warn(payload, message) {
      calls.push(['warn', payload, message]);
    },
    error(payload, message) {
      calls.push(['error', payload, message]);
    },
    child(bindings) {
      calls.push(['child', bindings]);
      return this;
    }
  };

  const wrapped = __loggerTestUtils.wrapLogger(sink);
  wrapped.debug({ token: 'secret-token', message: 'object debug' });
  wrapped.info({ apiKey: 'hidden', msg: 'object info' });
  const child = wrapped.child({ component: 'root-child', token: 'hide' });
  child.warn({ authorization: 'Bearer secret', message: 'nested warn' });
  child.error('nested error', { secretKey: 'abc123' });
  child.child({ subsystem: 'inner' }).info({ password: 'pw', msg: 'deep info' });

  const recentLogs = wrapped.getRecentLogs(10);
  assert.equal(calls.some(([method]) => method === 'child'), true);
  assert.equal(calls.some(([method]) => method === 'debug'), true);
  assert.equal(calls.some(([method]) => method === 'warn'), true);
  assert.equal(recentLogs.some((entry) => entry.token === '[REDACTED]'), true);
  assert.equal(
    recentLogs.some((entry) => entry.authorization === '[REDACTED]'),
    true
  );
  assert.equal(
    recentLogs.some((entry) => entry.secretKey === '[REDACTED]'),
    true
  );

  logger.clearRecentLogs();
});
