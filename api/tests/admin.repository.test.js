import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

import bcryptjs from 'bcryptjs';

import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import * as adminRepository from '../repositories/admin.repository.js';
import {
  clearTestDb,
  setupTestDb,
  teardownTestDb
} from './helpers/testDb.js';

const passwordHash = bcryptjs.hashSync('Password1', 10);

const createUser = async (overrides = {}) =>
  User.create({
    userName: `repo_${Math.random().toString(36).slice(2, 8)}`,
    email: `repo_${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: passwordHash,
    role: 'user',
    isActive: true,
    ...overrides
  });

before(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

after(async () => {
  await teardownTestDb();
});

test('admin repository covers user lookup, mutation, and filtered list operations', async () => {
  const baseUser = await createUser({
    userName: 'repo_base_user',
    email: 'repo_base_user@example.com',
    role: 'user'
  });
  await createUser({
    userName: 'repo_admin_user',
    email: 'repo_admin_user@example.com',
    role: 'admin'
  });
  await createUser({
    userName: 'repo_store_manager',
    email: 'repo_store_manager@example.com',
    role: 'storeManager',
    isActive: false
  });

  const foundById = await adminRepository.findUserById(
    baseUser._id.toString(),
    'email role'
  );
  assert.equal(foundById.email, 'repo_base_user@example.com');
  assert.equal(foundById.role, 'user');

  const foundByEmail = await adminRepository.findUserByEmail(
    'repo_base_user@example.com'
  );
  assert.equal(foundByEmail._id.toString(), baseUser._id.toString());

  const foundByUserName = await adminRepository.findUserByUserName(
    'repo_base_user'
  );
  assert.equal(foundByUserName.email, 'repo_base_user@example.com');

  const listedUsers = await adminRepository.findUsers(
    {},
    {
      limit: 2,
      skip: 0,
      sort: { userName: 1 },
      select: 'email role userName'
    }
  );
  assert.equal(listedUsers.length, 2);
  assert.equal(listedUsers[0].userName <= listedUsers[1].userName, true);

  assert.equal(await adminRepository.findUsersCount({}), 3);
  assert.equal((await adminRepository.findUsersByRole('admin')).length, 1);
  assert.equal((await adminRepository.findAdminUsers()).length, 2);
  assert.equal((await adminRepository.findActiveUsers()).length, 2);
  assert.equal((await adminRepository.findInactiveUsers()).length, 1);

  const created = await adminRepository.createUser({
    userName: 'repo_created_user',
    email: 'repo_created_user@example.com',
    password: passwordHash,
    role: 'user',
    isActive: true
  });
  assert.equal(created.email, 'repo_created_user@example.com');

  const updated = await adminRepository.updateUser(created._id.toString(), {
    profilePicture: 'https://example.com/avatar.png'
  });
  assert.equal(updated.profilePicture, 'https://example.com/avatar.png');

  const roleUpdated = await adminRepository.updateUserRole(
    created._id.toString(),
    'admin'
  );
  assert.equal(roleUpdated.role, 'admin');

  const statusUpdated = await adminRepository.updateUserStatus(
    created._id.toString(),
    false
  );
  assert.equal(statusUpdated.isActive, false);

  const bulkUpdated = await adminRepository.bulkUpdateUsers(
    { role: 'user' },
    { $set: { isActive: false } }
  );
  assert.equal(bulkUpdated.matchedCount >= 1, true);

  const bulkDeleted = await adminRepository.bulkDeleteUsers({
    email: { $regex: '^repo_created_user@example.com$' }
  });
  assert.equal(bulkDeleted.deletedCount, 1);

  const deleted = await adminRepository.deleteUser(baseUser._id.toString());
  assert.equal(deleted._id.toString(), baseUser._id.toString());
});

test('admin repository covers stats, security filters, session revocation, and date-based queries', async () => {
  const activeAdmin = await createUser({
    userName: 'repo_security_admin',
    email: 'repo_security_admin@example.com',
    role: 'admin',
    isActive: true,
    lastLoginAt: new Date('2025-01-01T00:00:00.000Z'),
    security: {
      failedLoginAttempts: 5,
      lockoutUntil: new Date(Date.now() + 60_000),
      lockoutCount: 2,
      lastFailedLoginAt: new Date()
    }
  });
  const inactiveUser = await createUser({
    userName: 'repo_security_inactive',
    email: 'repo_security_inactive@example.com',
    role: 'user',
    isActive: false,
    lastLoginAt: new Date('2023-01-01T00:00:00.000Z'),
    createdAt: new Date('2024-02-01T00:00:00.000Z')
  });

  const activeSession = await RefreshToken.create({
    userId: activeAdmin._id,
    familyId: 'repo-family-1',
    tokenHash: 'hash-active',
    expiresAt: new Date(Date.now() + 3600_000),
    revokedAt: null
  });
  await RefreshToken.create({
    userId: activeAdmin._id,
    familyId: 'repo-family-2',
    tokenHash: 'hash-revoked',
    expiresAt: new Date(Date.now() + 3600_000),
    revokedAt: new Date(),
    revokedReason: 'seed'
  });
  await RefreshToken.create({
    userId: activeAdmin._id,
    familyId: 'repo-family-3',
    tokenHash: 'hash-active-2',
    expiresAt: new Date(Date.now() + 3600_000),
    revokedAt: null
  });

  const stats = await adminRepository.getUserStats();
  assert.equal(stats.totalUsers, 2);
  assert.equal(stats.activeUsers, 1);
  assert.equal(stats.inactiveUsers, 1);

  const roleStats = await adminRepository.getUserRolesStats();
  assert.equal(roleStats.length >= 2, true);

  const usersWithSecurity = await adminRepository.findUsersWithSecurityInfo();
  assert.equal(usersWithSecurity.length, 2);

  const sessions = await adminRepository.findUsersWithSessions(
    activeAdmin._id.toString()
  );
  assert.equal(sessions.length, 3);

  const staleUsers = await adminRepository.findUsersByLastLogin(30);
  assert.equal(staleUsers.length >= 1, true);

  const registeredUsers = await adminRepository.findUsersByRegistrationDate(
    '2024-01-01T00:00:00.000Z',
    '2026-12-31T23:59:59.000Z'
  );
  assert.equal(registeredUsers.length, 2);

  const failedLogins = await adminRepository.findUsersWithFailedLogins(3);
  assert.equal(failedLogins.length, 1);
  assert.equal(failedLogins[0]._id.toString(), activeAdmin._id.toString());

  const lockedUsers = await adminRepository.findLockedUsers();
  assert.equal(lockedUsers.length, 1);
  assert.equal(lockedUsers[0]._id.toString(), activeAdmin._id.toString());

  const sessionStats = await adminRepository.getUserSessionStats(
    activeAdmin._id.toString()
  );
  assert.equal(sessionStats.totalSessions, 3);
  assert.equal(sessionStats.activeSessions, 2);
  assert.equal(sessionStats.revokedSessions, 1);

  const revokeSingle = await adminRepository.revokeUserSession(
    activeSession._id.toString(),
    activeAdmin._id.toString(),
    'manual-test'
  );
  assert.equal(revokeSingle.modifiedCount, 1);

  const revokeAll = await adminRepository.revokeAllUserSessions(
    activeAdmin._id.toString(),
    'bulk-test'
  );
  assert.equal(revokeAll.matchedCount >= 1, true);

  const resetSecurity = await adminRepository.resetUserSecurityState(
    activeAdmin._id.toString()
  );
  assert.equal(resetSecurity.security.failedLoginAttempts, 0);
  assert.equal(resetSecurity.security.lockoutUntil, null);

  const postResetLockedUsers = await adminRepository.findLockedUsers();
  assert.equal(postResetLockedUsers.length, 0);

  assert.equal(inactiveUser.email, 'repo_security_inactive@example.com');
});
