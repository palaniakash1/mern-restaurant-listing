import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import mongoose from 'mongoose';
import request from 'supertest';
import bcryptjs from 'bcryptjs';
import app from '../app.js';
import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import { clearTestDb, setupTestDb, teardownTestDb } from './helpers/testDb.js';
import {
  getSecurityTelemetry,
  resetSecurityTelemetry
} from '../utils/securityTelemetry.js';
import { hashRefreshToken } from '../services/auth.service.js';
import { clear as clearRedisFallbackState } from '../utils/redisCache.js';

describe('Auth integration', { concurrency: false }, () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    await clearRedisFallbackState();
    resetSecurityTelemetry();
  });

  it('signup, signin, session and change-password flow should work', async () => {
    const signupRes = await request(app).post('/api/auth/signup').send({
      userName: 'testuser1',
      email: 'testuser1@example.com',
      password: 'Password1'
    });
    assert.equal(signupRes.status, 201);
    assert.equal(signupRes.body.success, true);

    const agent = request.agent(app);
    const signinRes = await agent.post('/api/auth/signin').send({
      email: 'testuser1@example.com',
      password: 'Password1'
    });
    assert.equal(signinRes.status, 200);
    assert.equal(signinRes.body.email, 'testuser1@example.com');
    const firstRefreshCookie = signinRes.headers['set-cookie']?.find((cookie) =>
      cookie.startsWith('refresh_token=')
    );
    assert.ok(firstRefreshCookie);

    const refreshRes = await agent.post('/api/auth/refresh').send({});
    assert.equal(refreshRes.status, 200);
    assert.equal(refreshRes.body.email, 'testuser1@example.com');
    const rotatedRefreshCookie = refreshRes.headers['set-cookie']?.find((cookie) =>
      cookie.startsWith('refresh_token=')
    );
    assert.ok(rotatedRefreshCookie);
    assert.notEqual(rotatedRefreshCookie, firstRefreshCookie);

    const sessionRes = await agent.get('/api/auth/session');
    assert.equal(sessionRes.status, 200);
    assert.equal(sessionRes.body.success, true);
    assert.equal(sessionRes.body.data.userName, 'testuser1');

    const changePasswordRes = await agent.post('/api/auth/change-password').send({
      currentPassword: 'Password1',
      newPassword: 'Password2'
    });
    assert.equal(changePasswordRes.status, 200);
    assert.equal(changePasswordRes.body.success, true);

    await agent.post('/api/auth/signout').send({});
    const reloginRes = await request(app).post('/api/auth/signin').send({
      email: 'testuser1@example.com',
      password: 'Password2'
    });
    assert.equal(reloginRes.status, 200);
  });

  it('should reject invalid signup payloads and duplicate identities', async () => {
    const invalidUserNameRes = await request(app).post('/api/auth/signup').send({
      userName: 'Ab',
      email: 'valid@example.com',
      password: 'Password1'
    });
    assert.equal(invalidUserNameRes.status, 400);

    const invalidEmailRes = await request(app).post('/api/auth/signup').send({
      userName: 'validuser',
      email: 'not-an-email',
      password: 'Password1'
    });
    assert.equal(invalidEmailRes.status, 400);

    const invalidPasswordRes = await request(app).post('/api/auth/signup').send({
      userName: 'validuser',
      email: 'valid2@example.com',
      password: 'short'
    });
    assert.equal(invalidPasswordRes.status, 400);

    const createdRes = await request(app).post('/api/auth/signup').send({
      userName: 'duplicateuser',
      email: 'duplicate@example.com',
      password: 'Password1'
    });
    assert.equal(createdRes.status, 201);

    const duplicateUserNameRes = await request(app).post('/api/auth/signup').send({
      userName: 'duplicateuser',
      email: 'other@example.com',
      password: 'Password1'
    });
    assert.equal(duplicateUserNameRes.status, 409);

    const duplicateEmailRes = await request(app).post('/api/auth/signup').send({
      userName: 'otheruser',
      email: 'duplicate@example.com',
      password: 'Password1'
    });
    assert.equal(duplicateEmailRes.status, 409);
  });

  it('should reject signin validation failures and unknown users', async () => {
    const missingEmailRes = await request(app).post('/api/auth/signin').send({
      password: 'Password1'
    });
    assert.equal(missingEmailRes.status, 400);

    const invalidEmailRes = await request(app).post('/api/auth/signin').send({
      email: 'bad-email',
      password: 'Password1'
    });
    assert.equal(invalidEmailRes.status, 400);

    const missingPasswordRes = await request(app).post('/api/auth/signin').send({
      email: 'missing@example.com'
    });
    assert.equal(missingPasswordRes.status, 400);

    const unknownUserRes = await request(app).post('/api/auth/signin').send({
      email: 'unknown@example.com',
      password: 'Password1'
    });
    assert.equal(unknownUserRes.status, 401);

    const telemetry = await getSecurityTelemetry();
    assert.equal(telemetry.login_failed, 1);
  });

  it('inactive user should be blocked at signin', async () => {
    const hashedPassword = bcryptjs.hashSync('Password1', 10);
    await User.create({
      userName: 'inactiveuser',
      email: 'inactive@example.com',
      password: hashedPassword,
      role: 'user',
      isActive: false
    });

    const signinRes = await request(app).post('/api/auth/signin').send({
      email: 'inactive@example.com',
      password: 'Password1'
    });

    assert.equal(signinRes.status, 403);
    assert.equal(signinRes.body.success, false);
  });

  it('should enforce google auth validation and inactive-account checks', async () => {
    const missingEmailRes = await request(app).post('/api/auth/google').send({
      name: 'Google User'
    });
    assert.equal(missingEmailRes.status, 400);

    await User.create({
      userName: 'inactivegoogle',
      email: 'inactivegoogle@example.com',
      password: bcryptjs.hashSync('Password1', 10),
      role: 'user',
      isActive: false
    });

    const inactiveRes = await request(app).post('/api/auth/google').send({
      name: 'Inactive Google',
      email: 'inactivegoogle@example.com',
      googlePhotoUrl: 'https://example.com/p.png'
    });
    assert.equal(inactiveRes.status, 403);
  });

  it('should lock an account after repeated failed signin attempts and recover after the lockout window', async () => {
    const originalThreshold = process.env.LOGIN_LOCKOUT_THRESHOLD;
    const originalBaseMs = process.env.LOGIN_LOCKOUT_BASE_MS;
    const originalMaxMs = process.env.LOGIN_LOCKOUT_MAX_MS;

    process.env.LOGIN_LOCKOUT_THRESHOLD = '3';
    process.env.LOGIN_LOCKOUT_BASE_MS = '40';
    process.env.LOGIN_LOCKOUT_MAX_MS = '40';

    try {
      const hashedPassword = bcryptjs.hashSync('Password1', 10);
      await User.create({
        userName: 'lockeduser',
        email: 'locked@example.com',
        password: hashedPassword,
        role: 'user',
        isActive: true
      });

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const signinRes = await request(app).post('/api/auth/signin').send({
          email: 'locked@example.com',
          password: 'WrongPassword1'
        });

        assert.equal(signinRes.status, 401);
        assert.equal(signinRes.body.message, 'Invalid email or password');
      }

      const lockoutRes = await request(app).post('/api/auth/signin').send({
        email: 'locked@example.com',
        password: 'WrongPassword1'
      });
      assert.equal(lockoutRes.status, 423);
      assert.equal(
        lockoutRes.body.message,
        'Account temporarily locked due to repeated failed login attempts'
      );

      const blockedRes = await request(app).post('/api/auth/signin').send({
        email: 'locked@example.com',
        password: 'Password1'
      });
      assert.equal(blockedRes.status, 423);

      const lockedUser = await User.findOne({ email: 'locked@example.com' }).lean();
      assert.ok(lockedUser?.security?.lockoutUntil);
      assert.equal(lockedUser?.security?.failedLoginAttempts, 0);

      const telemetry = await getSecurityTelemetry();
      assert.equal(telemetry.login_failed, 3);
      assert.equal(telemetry.login_lockout_started, 1);
      assert.equal(telemetry.login_lockout_blocked, 1);

      await delay(60);

      const recoveredRes = await request(app).post('/api/auth/signin').send({
        email: 'locked@example.com',
        password: 'Password1'
      });
      assert.equal(recoveredRes.status, 200);

      const recoveredUser = await User.findOne({ email: 'locked@example.com' }).lean();
      assert.equal(recoveredUser?.security?.failedLoginAttempts, 0);
      assert.equal(recoveredUser?.security?.lockoutCount, 0);
      assert.equal(recoveredUser?.security?.lockoutUntil, null);
    } finally {
      if (originalThreshold === undefined) {
        delete process.env.LOGIN_LOCKOUT_THRESHOLD;
      } else {
        process.env.LOGIN_LOCKOUT_THRESHOLD = originalThreshold;
      }

      if (originalBaseMs === undefined) {
        delete process.env.LOGIN_LOCKOUT_BASE_MS;
      } else {
        process.env.LOGIN_LOCKOUT_BASE_MS = originalBaseMs;
      }

      if (originalMaxMs === undefined) {
        delete process.env.LOGIN_LOCKOUT_MAX_MS;
      } else {
        process.env.LOGIN_LOCKOUT_MAX_MS = originalMaxMs;
      }
    }
  });

  it('should list and revoke current session', async () => {
    await request(app).post('/api/auth/signup').send({
      userName: 'sessionuser1',
      email: 'sessionuser1@example.com',
      password: 'Password1'
    });

    const agent = request.agent(app);
    const signinRes = await agent.post('/api/auth/signin').send({
      email: 'sessionuser1@example.com',
      password: 'Password1'
    });
    assert.equal(signinRes.status, 200);

    const sessionsRes = await agent.get('/api/auth/sessions');
    assert.equal(sessionsRes.status, 200);
    assert.equal(sessionsRes.body.success, true);
    assert.ok(Array.isArray(sessionsRes.body.data));
    assert.ok(sessionsRes.body.data.length >= 1);

    const currentSession = sessionsRes.body.data.find((session) => session.isCurrent);
    assert.ok(currentSession?.id);

    const revokeRes = await agent.delete(`/api/auth/sessions/${currentSession.id}`);
    assert.equal(revokeRes.status, 200);
    assert.equal(revokeRes.body.success, true);

    const refreshRes = await agent.post('/api/auth/refresh').send({});
    assert.equal(refreshRes.status, 401);
  });

  it('should handle refresh failure paths and session edge cases', async () => {
    await request(app).post('/api/auth/signup').send({
      userName: 'edgeauthuser',
      email: 'edgeauthuser@example.com',
      password: 'Password1'
    });

    const agent = request.agent(app);
    const signinRes = await agent.post('/api/auth/signin').send({
      email: 'edgeauthuser@example.com',
      password: 'Password1'
    });
    assert.equal(signinRes.status, 200);

    const refreshCookie = signinRes.headers['set-cookie']?.find((cookie) =>
      cookie.startsWith('refresh_token=')
    );
    const refreshToken = refreshCookie?.split(';')[0].split('=')[1];
    assert.ok(refreshToken);

    const missingRefreshRes = await request(app).post('/api/auth/refresh').send({});
    assert.equal(missingRefreshRes.status, 401);

    const invalidRefreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refresh_token=not-real-token']);
    assert.equal(invalidRefreshRes.status, 401);

    const tokenDoc = await RefreshToken.findOne({
      tokenHash: hashRefreshToken(refreshToken)
    });
    assert.ok(tokenDoc);

    tokenDoc.expiresAt = new Date(Date.now() - 1000);
    await tokenDoc.save();

    const expiredRefreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refresh_token=${refreshToken}`]);
    assert.equal(expiredRefreshRes.status, 401);

    tokenDoc.expiresAt = new Date(Date.now() + 60_000);
    tokenDoc.revokedAt = new Date();
    await tokenDoc.save();

    const replayRefreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refresh_token=${refreshToken}`]);
    assert.equal(replayRefreshRes.status, 401);

    const invalidSessionIdRes = await agent.delete('/api/auth/sessions/not-an-id');
    assert.equal(invalidSessionIdRes.status, 400);
  });

  it('should handle already-revoked sessions, missing session users, and password-change errors', async () => {
    await request(app).post('/api/auth/signup').send({
      userName: 'passwordedge',
      email: 'passwordedge@example.com',
      password: 'Password1'
    });

    const agent = request.agent(app);
    const signinRes = await agent.post('/api/auth/signin').send({
      email: 'passwordedge@example.com',
      password: 'Password1'
    });
    assert.equal(signinRes.status, 200);

    const sessionsRes = await agent.get('/api/auth/sessions');
    const currentSession = sessionsRes.body.data.find((session) => session.isCurrent);
    assert.ok(currentSession?.id);

    const firstRevokeRes = await agent.delete(`/api/auth/sessions/${currentSession.id}`);
    assert.equal(firstRevokeRes.status, 200);

    const secondRevokeRes = await agent.delete(`/api/auth/sessions/${currentSession.id}`);
    assert.equal(secondRevokeRes.status, 200);
    assert.match(secondRevokeRes.body.message, /already revoked/i);

    const missingFieldsRes = await agent.post('/api/auth/change-password').send({
      currentPassword: 'Password1'
    });
    assert.equal(missingFieldsRes.status, 400);

    const invalidPatternRes = await agent.post('/api/auth/change-password').send({
      currentPassword: 'Password1',
      newPassword: 'short'
    });
    assert.equal(invalidPatternRes.status, 400);

    const wrongCurrentPasswordRes = await agent.post('/api/auth/change-password').send({
      currentPassword: 'WrongPassword1',
      newPassword: 'Password2'
    });
    assert.equal(wrongCurrentPasswordRes.status, 401);

    const userDoc = await User.findOne({ email: 'passwordedge@example.com' });
    userDoc.isActive = false;
    await userDoc.save();

    const inactivePasswordRes = await agent.post('/api/auth/change-password').send({
      currentPassword: 'Password1',
      newPassword: 'Password2'
    });
    assert.equal(inactivePasswordRes.status, 403);

    const userAgent = request.agent(app);
    const reloginRes = await userAgent.post('/api/auth/signin').send({
      email: 'passwordedge@example.com',
      password: 'Password1'
    });
    assert.equal(reloginRes.status, 403);

    await User.findByIdAndDelete(userDoc._id);
    const missingSessionUserRes = await agent.get('/api/auth/session');
    assert.equal(missingSessionUserRes.status, 401);
  });

  it('should sign out all other sessions while keeping current session active', async () => {
    await request(app).post('/api/auth/signup').send({
      userName: 'sessionuser2',
      email: 'sessionuser2@example.com',
      password: 'Password1'
    });

    const agentA = request.agent(app);
    const agentB = request.agent(app);

    const signinARes = await agentA.post('/api/auth/signin').send({
      email: 'sessionuser2@example.com',
      password: 'Password1'
    });
    assert.equal(signinARes.status, 200);

    const signinBRes = await agentB.post('/api/auth/signin').send({
      email: 'sessionuser2@example.com',
      password: 'Password1'
    });
    assert.equal(signinBRes.status, 200);

    const signoutAllRes = await agentA.post('/api/auth/signout-all').send({});
    assert.equal(signoutAllRes.status, 200);
    assert.equal(signoutAllRes.body.success, true);
    assert.ok(signoutAllRes.body.data.revokedSessions >= 1);

    const refreshARes = await agentA.post('/api/auth/refresh').send({});
    assert.equal(refreshARes.status, 200);

    const refreshBRes = await agentB.post('/api/auth/refresh').send({});
    assert.equal(refreshBRes.status, 401);
  });

  it('should return 404 for missing admin session targets', async () => {
    await User.create({
      userName: 'superadminsessions',
      email: 'superadminsessions@example.com',
      password: bcryptjs.hashSync('Password1', 10),
      role: 'superAdmin',
      isActive: true
    });

    const agent = request.agent(app);
    const signInRes = await agent.post('/api/auth/signin').send({
      email: 'superadminsessions@example.com',
      password: 'Password1'
    });
    assert.equal(signInRes.status, 200);

    const missingUserId = new mongoose.Types.ObjectId().toString();
    const missingSessionId = new mongoose.Types.ObjectId().toString();

    const listRes = await agent.get(`/api/auth/admin/users/${missingUserId}/sessions`);
    assert.equal(listRes.status, 404);

    const revokeAllRes = await agent.post(
      `/api/auth/admin/users/${missingUserId}/sessions/revoke-all`
    );
    assert.equal(revokeAllRes.status, 404);

    const revokeOneRes = await agent.delete(
      `/api/auth/admin/users/${missingUserId}/sessions/${missingSessionId}`
    );
    assert.equal(revokeOneRes.status, 404);
  });
});
