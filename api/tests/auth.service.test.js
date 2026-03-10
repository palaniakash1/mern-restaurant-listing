import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRefreshCookieOptions,
  comparePassword,
  getActiveLockoutUntil,
  hashPassword,
  hashRefreshToken,
  recordFailedSigninAttempt,
  resetSigninSecurityState,
  toPositiveInt,
  toSessionView
} from '../services/auth.service.js';

test('auth service normalizes positive integers and hashes passwords safely', () => {
  assert.equal(toPositiveInt('15', 5), 15);
  assert.equal(toPositiveInt('0', 5), 5);
  assert.equal(toPositiveInt('invalid', 5), 5);

  const hash = hashPassword('Password123!');
  assert.equal(comparePassword('Password123!', hash), true);
  assert.equal(comparePassword('WrongPassword123!', hash), false);
  assert.equal(hashRefreshToken('refresh-token'), hashRefreshToken('refresh-token'));
});

test('auth service lockout helpers derive active lockouts and reset state', async () => {
  let saved = false;
  const user = {
    security: {
      failedLoginAttempts: 2,
      lockoutUntil: new Date(Date.now() + 60_000),
      lockoutCount: 1,
      lastFailedLoginAt: new Date()
    },
    save: async () => {
      saved = true;
    }
  };

  assert.ok(getActiveLockoutUntil(user) instanceof Date);
  assert.equal(getActiveLockoutUntil({ security: { lockoutUntil: new Date(Date.now() - 1) } }), null);

  await resetSigninSecurityState(user);

  assert.equal(saved, true);
  assert.deepEqual(user.security, {
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lockoutCount: 0,
    lastFailedLoginAt: null
  });
});

test('auth service records failed signin attempts and escalates to lockout', async () => {
  const originalThreshold = process.env.LOGIN_LOCKOUT_THRESHOLD;
  const originalBaseMs = process.env.LOGIN_LOCKOUT_BASE_MS;
  const originalMaxMs = process.env.LOGIN_LOCKOUT_MAX_MS;

  process.env.LOGIN_LOCKOUT_THRESHOLD = '2';
  process.env.LOGIN_LOCKOUT_BASE_MS = '1000';
  process.env.LOGIN_LOCKOUT_MAX_MS = '4000';

  let saveCalls = 0;
  const user = {
    security: {
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lockoutCount: 0,
      lastFailedLoginAt: null
    },
    save: async () => {
      saveCalls += 1;
    }
  };

  const firstFailure = await recordFailedSigninAttempt(user);
  const secondFailure = await recordFailedSigninAttempt(user);

  assert.equal(saveCalls, 2);
  assert.equal(firstFailure.locked, false);
  assert.equal(firstFailure.attemptsRemaining, 1);
  assert.equal(secondFailure.locked, true);
  assert.ok(secondFailure.lockoutUntil instanceof Date);
  assert.equal(user.security.failedLoginAttempts, 0);
  assert.equal(user.security.lockoutCount, 1);

  process.env.LOGIN_LOCKOUT_THRESHOLD = originalThreshold;
  process.env.LOGIN_LOCKOUT_BASE_MS = originalBaseMs;
  process.env.LOGIN_LOCKOUT_MAX_MS = originalMaxMs;
});

test('auth service derives refresh cookie options and session view models', () => {
  const options = buildRefreshCookieOptions();
  const now = new Date();
  const sessionView = toSessionView(
    {
      _id: 'session-1',
      familyId: 'family-1',
      tokenHash: 'hash-1',
      createdAt: now,
      lastUsedAt: now,
      expiresAt: now,
      createdByIp: '127.0.0.1',
      userAgent: 'test-agent',
      revokedAt: null,
      revokedReason: null
    },
    'hash-1'
  );

  assert.equal(typeof options.maxAge, 'number');
  assert.equal(options.httpOnly, true);
  assert.equal(sessionView.id, 'session-1');
  assert.equal(sessionView.familyId, 'family-1');
  assert.equal(sessionView.isCurrent, true);
  assert.equal(sessionView.createdByIp, '127.0.0.1');
});
