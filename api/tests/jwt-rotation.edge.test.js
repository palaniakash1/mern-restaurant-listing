import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import config from '../config.js';
import jwtRotationService from '../services/jwtRotation.service.js';

const snapshotState = () => ({
  keysDir: jwtRotationService.keysDir,
  currentKeyId: jwtRotationService.currentKeyId,
  keyRotationInterval: jwtRotationService.keyRotationInterval,
  keyLifetime: jwtRotationService.keyLifetime,
  keys: jwtRotationService.keys,
  rotationTimer: jwtRotationService.rotationTimer,
  initialized: jwtRotationService.initialized
});

const restoreState = (state) => {
  jwtRotationService.stopRotationTimer();
  jwtRotationService.keysDir = state.keysDir;
  jwtRotationService.currentKeyId = state.currentKeyId;
  jwtRotationService.keyRotationInterval = state.keyRotationInterval;
  jwtRotationService.keyLifetime = state.keyLifetime;
  jwtRotationService.keys = state.keys;
  jwtRotationService.rotationTimer = state.rotationTimer;
  jwtRotationService.initialized = state.initialized;
};

test.afterEach(() => {
  jwtRotationService.stopRotationTimer();
});

test('jwt rotation service covers directory, initialization, and existing-key edge branches', async () => {
  const state = snapshotState();
  const originalEnabled = config.jwtRotation.enabled;
  const originalAccess = fs.access;
  const originalReadDir = fs.readdir;
  const originalReadFile = fs.readFile;
  const originalMkdir = fs.mkdir;

  try {
    config.jwtRotation.enabled = true;

    fs.access = async () => {
      const error = new Error('missing');
      error.code = 'ENOENT';
      throw error;
    };
    let mkdirCalled = false;
    fs.mkdir = async () => {
      mkdirCalled = true;
    };
    await jwtRotationService.ensureKeysDirectory();
    assert.equal(mkdirCalled, true);

    fs.access = async () => {
      throw new Error('unexpected access failure');
    };
    await assert.rejects(
      jwtRotationService.ensureKeysDirectory(),
      /unexpected access failure/
    );

    jwtRotationService.keys = new Map();
    jwtRotationService.currentKeyId = null;
    fs.readdir = async () => ['a.key', 'b.key'];
    fs.readFile = async (filePath) => {
      if (String(filePath).endsWith('a.key')) {
        return JSON.stringify({
          kid: 'a',
          secret: 'secret-a',
          created_at: new Date(Date.now() - 5000).toISOString(),
          expires_at: new Date(Date.now() + 60000).toISOString(),
          active: false,
          algorithm: 'HS256'
        });
      }
      return JSON.stringify({
        kid: 'b',
        secret: 'secret-b',
        created_at: new Date(Date.now() - 1000).toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString(),
        active: false,
        algorithm: 'HS256'
      });
    };
    let savedKeyId = null;
    jwtRotationService.saveKey = async (keyInfo) => {
      savedKeyId = keyInfo.kid;
    };
    await jwtRotationService.loadExistingKeys();
    assert.equal(jwtRotationService.currentKeyId, 'b');
    assert.equal(savedKeyId, 'b');

    fs.readdir = async () => {
      throw new Error('readdir failed');
    };
    await assert.rejects(
      jwtRotationService.loadExistingKeys(),
      /readdir failed/
    );

    jwtRotationService.ensureKeysDirectory = async () => {
      throw new Error('init failed');
    };
    await assert.doesNotReject(jwtRotationService.initialize());
    assert.equal(await jwtRotationService.initialize(), false);
  } finally {
    fs.access = originalAccess;
    fs.readdir = originalReadDir;
    fs.readFile = originalReadFile;
    fs.mkdir = originalMkdir;
    config.jwtRotation.enabled = originalEnabled;
    restoreState(state);
  }
});

test('jwt rotation service covers missing-current-key, timer reset, cleanup failure, and invalid token branches', async () => {
  const state = snapshotState();
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalUnlink = fs.unlink;
  const originalStopRotationTimer = jwtRotationService.stopRotationTimer;

  try {
    jwtRotationService.keys = new Map();
    jwtRotationService.currentKeyId = 'missing';
    let generatedCount = 0;
    jwtRotationService.generateNewKey = async () => {
      generatedCount += 1;
    };

    await jwtRotationService.rotateKeysIfNeeded();
    assert.equal(generatedCount, 1);

    jwtRotationService.currentKeyId = null;
    await jwtRotationService.rotateKeysIfNeeded();
    assert.equal(generatedCount, 2);

    jwtRotationService.rotationTimer = 'existing-timer';
    jwtRotationService.rotateKeysIfNeeded = async () => {
      throw new Error('rotation tick failed');
    };
    jwtRotationService.startRotationTimer();
    assert.equal(Boolean(jwtRotationService.rotationTimer), true);

    jwtRotationService.keys = new Map([
      [
        'expired-a',
        {
          kid: 'expired-a',
          expires_at: new Date(Date.now() - 1000).toISOString()
        }
      ]
    ]);
    fs.unlink = async () => {
      throw new Error('unlink failed');
    };
    await jwtRotationService.cleanupExpiredKeys();
    assert.equal(jwtRotationService.keys.has('expired-a'), true);

    assert.throws(
      () => jwtRotationService.verifyToken('totally-invalid-token'),
      /(Invalid token format|jwt malformed)/
    );

    const sigtermHandler = process.listeners('SIGTERM').at(-1);
    const sigintHandler = process.listeners('SIGINT').at(-1);
    let stopCalls = 0;
    jwtRotationService.stopRotationTimer = () => {
      stopCalls += 1;
    };
    sigtermHandler?.();
    sigintHandler?.();
    assert.equal(stopCalls >= 2, true);
  } finally {
    jwtRotationService.stopRotationTimer = originalStopRotationTimer;
    jwtRotationService.stopRotationTimer();
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    fs.unlink = originalUnlink;
    restoreState(state);
  }
});
