import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import request from 'supertest';
import bcryptjs from 'bcryptjs';
import app from '../app.js';
import User from '../models/user.model.js';
import { clearTestDb, setupTestDb, teardownTestDb } from './helpers/testDb.js';
import {
  getSecurityTelemetry,
  resetSecurityTelemetry
} from '../utils/securityTelemetry.js';

describe('Auth integration', { concurrency: false }, () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
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
});
