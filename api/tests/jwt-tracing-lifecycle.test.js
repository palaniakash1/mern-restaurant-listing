import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import config from '../config.js';
import jwtRotationService from '../services/jwtRotation.service.js';
import {
  __setTracingSdkFactory,
  __setTracingTestOverride,
  initTracing,
  shutdownTracing,
  traceAuthOperation,
  traceDatabaseOperation,
  tracingMiddleware
} from '../tracing.js';

const snapshotJwtState = () => ({
  keysDir: jwtRotationService.keysDir,
  currentKeyId: jwtRotationService.currentKeyId,
  keyRotationInterval: jwtRotationService.keyRotationInterval,
  keyLifetime: jwtRotationService.keyLifetime,
  keys: jwtRotationService.keys,
  rotationTimer: jwtRotationService.rotationTimer,
  initialized: jwtRotationService.initialized
});

const restoreJwtState = (state) => {
  jwtRotationService.stopRotationTimer();
  jwtRotationService.keysDir = state.keysDir;
  jwtRotationService.currentKeyId = state.currentKeyId;
  jwtRotationService.keyRotationInterval = state.keyRotationInterval;
  jwtRotationService.keyLifetime = state.keyLifetime;
  jwtRotationService.keys = state.keys;
  jwtRotationService.rotationTimer = state.rotationTimer;
  jwtRotationService.initialized = state.initialized;
};

test.after(async () => {
  jwtRotationService.stopRotationTimer();
  __setTracingTestOverride(null);
  __setTracingSdkFactory(null);
  await shutdownTracing();
});

test('jwt rotation service manages file-backed key lifecycle and cleanup', async () => {
  const originalState = snapshotJwtState();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jwt-rotation-'));

  try {
    jwtRotationService.stopRotationTimer();
    jwtRotationService.keysDir = tempDir;
    jwtRotationService.keys = new Map();
    jwtRotationService.currentKeyId = null;
    jwtRotationService.keyRotationInterval = 5;
    jwtRotationService.keyLifetime = 60_000;
    jwtRotationService.initialized = true;

    const olderKey = {
      kid: 'older-key',
      secret: 'older-secret',
      created_at: new Date(Date.now() - 10_000).toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      active: false,
      algorithm: 'HS256'
    };
    const newerKey = {
      kid: 'newer-key',
      secret: 'newer-secret',
      created_at: new Date(Date.now() - 5_000).toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      active: false,
      algorithm: 'HS256'
    };
    const expiredKey = {
      kid: 'expired-key',
      secret: 'expired-secret',
      created_at: new Date(Date.now() - 20_000).toISOString(),
      expires_at: new Date(Date.now() - 1_000).toISOString(),
      active: false,
      algorithm: 'HS256'
    };

    await jwtRotationService.saveKey(olderKey);
    await jwtRotationService.saveKey(newerKey);
    await jwtRotationService.saveKey(expiredKey);

    jwtRotationService.keys = new Map();
    jwtRotationService.currentKeyId = null;

    await jwtRotationService.ensureKeysDirectory();
    await jwtRotationService.loadExistingKeys();

    assert.equal(jwtRotationService.currentKeyId, 'newer-key');
    assert.equal(jwtRotationService.getKeyById('older-key').secret, 'older-secret');
    assert.equal(jwtRotationService.getAllActiveKeys().length, 1);

    await jwtRotationService.rotateKeysIfNeeded();
    assert.notEqual(jwtRotationService.currentKeyId, 'newer-key');
    assert.ok(jwtRotationService.getCurrentKey());
    assert.ok(jwtRotationService.keys.size >= 3);

    await jwtRotationService.cleanupExpiredKeys();
    assert.equal(jwtRotationService.getKeyById('expired-key'), undefined);

    jwtRotationService.startRotationTimer();
    assert.ok(jwtRotationService.rotationTimer);
    jwtRotationService.stopRotationTimer();
    assert.equal(jwtRotationService.rotationTimer, null);

    const storedFiles = await fs.readdir(tempDir);
    assert.ok(storedFiles.some((file) => file.endsWith('.key')));
  } finally {
    restoreJwtState(originalState);
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('jwt rotation service initialize short-circuits when disabled', async () => {
  const originalEnabled = config.jwtRotation.enabled;
  const originalEnv = config.env;

  try {
    config.jwtRotation.enabled = false;
    config.env = 'development';
    const result = await jwtRotationService.initialize();
    assert.equal(result, false);
  } finally {
    config.jwtRotation.enabled = originalEnabled;
    config.env = originalEnv;
  }
});

test('tracing supports active middleware and lifecycle paths', async () => {
  const originalEnv = config.env;
  const originalEnabled = config.tracing.enabled;

  try {
    config.env = 'development';
    config.tracing.enabled = true;
    __setTracingTestOverride(false);

    const initResult = await initTracing();
    assert.equal(typeof initResult, 'boolean');

    const requestHeaders = {};
    let finishHandler = null;
    let nextCalled = false;

    const req = {
      method: 'GET',
      path: '/api/test-trace',
      originalUrl: '/api/test-trace?ok=1',
      requestId: 'request-fallback-id',
      headers: {
        'user-agent': 'node-test'
      }
    };
    const res = {
      statusCode: 200,
      setHeader(name, value) {
        requestHeaders[name] = value;
      },
      getHeader(name) {
        return requestHeaders[name];
      },
      on(event, handler) {
        if (event === 'finish') {
          finishHandler = handler;
        }
      }
    };

    tracingMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.ok(req.traceId);
    assert.equal(requestHeaders['X-Trace-Id'], req.traceId);
    if (finishHandler) {
      assert.equal(typeof finishHandler, 'function');
      finishHandler();
    } else {
      assert.equal(finishHandler, null);
    }

    const dbResult = await traceDatabaseOperation(
      'success-op',
      async () => 'db-ok',
      { collection: 'users' }
    );
    assert.equal(dbResult, 'db-ok');

    const authResult = await traceAuthOperation(
      'active-op',
      'user-900',
      { actor: 'integration', nested: { ignored: true } },
      async () => 'auth-ok'
    );
    assert.equal(authResult, 'auth-ok');

    await shutdownTracing();
    await shutdownTracing();
  } finally {
    __setTracingTestOverride(null);
    config.env = originalEnv;
    config.tracing.enabled = originalEnabled;
  }
});

test('tracing init and shutdown cover explicit success and failure sdk paths', async () => {
  const originalEnabled = config.tracing.enabled;
  const calls = [];

  try {
    config.tracing.enabled = true;
    __setTracingTestOverride(false);

    __setTracingSdkFactory(() => ({
      start() {
        calls.push('start-success');
      },
      async shutdown() {
        calls.push('shutdown-success');
      }
    }));

    const successResult = await initTracing();
    assert.equal(successResult, true);
    await shutdownTracing();
    assert.deepEqual(calls, ['start-success', 'shutdown-success']);

    __setTracingSdkFactory(() => ({
      start() {
        throw new Error('sdk start failed');
      },
      async shutdown() {
        calls.push('shutdown-failure-sdk');
      }
    }));

    const failureResult = await initTracing();
    assert.equal(failureResult, false);

    __setTracingSdkFactory(() => ({
      start() {
        calls.push('start-shutdown-failure');
      },
      async shutdown() {
        throw new Error('sdk shutdown failed');
      }
    }));

    await initTracing();
    await shutdownTracing();
    assert.equal(calls.includes('start-shutdown-failure'), true);
  } finally {
    __setTracingSdkFactory(null);
    __setTracingTestOverride(null);
    config.tracing.enabled = originalEnabled;
    await shutdownTracing();
  }
});
