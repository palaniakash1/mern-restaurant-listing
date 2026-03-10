import test from 'node:test';
import assert from 'node:assert/strict';

import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import {
  hashRefreshToken,
  issueRefreshTokenValue
} from '../services/auth.service.js';
import {
  getRefreshTokenFromRequest,
  listSessionsForAdminTarget,
  listSessionsForUser,
  revokeAllSessionsForAdminTarget,
  revokeAllSessionsForUser,
  revokeSessionForUser
} from '../services/authOperations.service.js';
import {
  clearTestDb,
  setupTestDb,
  teardownTestDb
} from './helpers/testDb.js';

const createUser = async (overrides = {}) =>
  User.create({
    userName: `user-${Math.random().toString(36).slice(2, 8)}`,
    email: `user-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: 'Password123!',
    role: 'user',
    ...overrides
  });

const createRefreshDoc = async (userId, overrides = {}) => {
  const tokenValue = overrides.tokenValue || issueRefreshTokenValue();
  const tokenHash = overrides.tokenHash || hashRefreshToken(tokenValue);

  return RefreshToken.create({
    userId,
    tokenHash,
    familyId: overrides.familyId || `family-${Math.random().toString(36).slice(2, 8)}`,
    expiresAt: overrides.expiresAt || new Date(Date.now() + 60_000),
    createdByIp: overrides.createdByIp || '127.0.0.1',
    userAgent: overrides.userAgent || 'test-agent',
    revokedAt: overrides.revokedAt || null,
    revokedReason: overrides.revokedReason || null,
    lastUsedAt: overrides.lastUsedAt || null,
    replacedByHash: overrides.replacedByHash || null
  });
};

test.before(async () => {
  await setupTestDb();
});

test.beforeEach(async () => {
  await clearTestDb();
});

test.after(async () => {
  await teardownTestDb();
});

test('auth operations service lists user sessions with current token context', async () => {
  const user = await createUser();
  const currentToken = issueRefreshTokenValue();
  const currentSession = await createRefreshDoc(user._id, {
    tokenValue: currentToken,
    familyId: 'family-current'
  });
  await createRefreshDoc(user._id, {
    familyId: 'family-other',
    revokedAt: new Date(),
    revokedReason: 'manual_revoke'
  });

  const sessions = await listSessionsForUser({
    userId: user._id,
    refreshToken: currentToken
  });

  assert.equal(sessions.length, 2);
  assert.equal(sessions.find((session) => session.id.equals(currentSession._id)).isCurrent, true);
});

test('auth operations service revokes a single session and handles missing or prior state', async () => {
  const user = await createUser();
  const session = await createRefreshDoc(user._id);

  const revoked = await revokeSessionForUser({
    sessionId: session._id,
    userId: user._id,
    reason: 'manual_revoke'
  });
  const alreadyRevoked = await revokeSessionForUser({
    sessionId: session._id,
    userId: user._id,
    reason: 'manual_revoke'
  });
  const missing = await revokeSessionForUser({
    sessionId: session._id,
    userId: (await createUser())._id,
    reason: 'manual_revoke'
  });

  assert.equal(revoked.status, 'revoked');
  assert.equal(alreadyRevoked.status, 'already_revoked');
  assert.equal(missing.status, 'not_found');
});

test('auth operations service bulk revokes user sessions while preserving current token', async () => {
  const user = await createUser();
  const currentToken = issueRefreshTokenValue();
  await createRefreshDoc(user._id, {
    tokenValue: currentToken,
    familyId: 'family-keep'
  });
  const revokedSession = await createRefreshDoc(user._id, {
    familyId: 'family-revoke'
  });

  const result = await revokeAllSessionsForUser({
    userId: user._id,
    refreshToken: currentToken,
    reason: 'signout_all'
  });

  const updatedRevoked = await RefreshToken.findById(revokedSession._id);
  const currentDoc = await RefreshToken.findOne({
    userId: user._id,
    tokenHash: hashRefreshToken(currentToken)
  });

  assert.equal(result.revokedCount, 1);
  assert.equal(updatedRevoked.revokedReason, 'signout_all');
  assert.equal(currentDoc.revokedAt, null);
});

test('auth operations service supports admin target listing and bulk revoke', async () => {
  const user = await createUser();
  await createRefreshDoc(user._id, { familyId: 'family-admin-1' });
  await createRefreshDoc(user._id, { familyId: 'family-admin-2' });

  const listed = await listSessionsForAdminTarget({ userId: user._id });
  const revoked = await revokeAllSessionsForAdminTarget({
    userId: user._id,
    reason: 'admin_revoke_all'
  });
  const missing = await listSessionsForAdminTarget({
    userId: new mongoose.Types.ObjectId().toString()
  });

  assert.equal(listed.status, 'ok');
  assert.equal(listed.sessions.length, 2);
  assert.equal(revoked.status, 'ok');
  assert.equal(revoked.revokedCount, 2);
  assert.equal(missing.status, 'not_found');
});

test('auth operations service reads refresh token from request cookies', () => {
  assert.equal(
    getRefreshTokenFromRequest({ cookies: { refresh_token: 'token-value' } }),
    'token-value'
  );
  assert.equal(getRefreshTokenFromRequest({ cookies: {} }), null);
});
import mongoose from 'mongoose';
