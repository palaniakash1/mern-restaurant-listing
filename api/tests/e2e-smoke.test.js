import test from 'node:test';
import assert from 'node:assert/strict';

import request from 'supertest';

import app from '../app.js';
import User from '../models/user.model.js';
import { hashPassword } from '../services/auth.service.js';
import { clearTestDb, setupTestDb, teardownTestDb } from './helpers/testDb.js';

test.before(async () => {
  await setupTestDb();
});

test.beforeEach(async () => {
  await clearTestDb();
});

test.after(async () => {
  await teardownTestDb();
});

test('E2E smoke: health/docs and user auth flow', async () => {
  const agent = request.agent(app);

  const healthResponse = await agent.get('/api/health');
  assert.equal(healthResponse.status, 200);

  const docsResponse = await agent.get('/api/docs');
  assert.equal(docsResponse.status, 301);

  const signupResponse = await agent.post('/api/auth/signup').send({
    userName: 'smokeuser',
    email: 'smoke@example.com',
    password: 'Password123!'
  });
  assert.equal(signupResponse.status, 201);

  const signinResponse = await agent.post('/api/auth/signin').send({
    email: 'smoke@example.com',
    password: 'Password123!'
  });
  assert.equal(signinResponse.status, 200);
  assert.equal(typeof signinResponse.body.csrfToken, 'string');

  const sessionResponse = await agent.get('/api/auth/session');
  assert.equal(sessionResponse.status, 200);
  assert.equal(sessionResponse.body.data.email, 'smoke@example.com');

  const refreshResponse = await agent.post('/api/auth/refresh');
  assert.equal(refreshResponse.status, 200);
  assert.equal(refreshResponse.body.email, 'smoke@example.com');

  const signoutAllResponse = await agent.post('/api/auth/signout-all');
  assert.equal(signoutAllResponse.status, 200);
  assert.equal(signoutAllResponse.body.success, true);

  const signoutResponse = await agent.post('/api/auth/signout');
  assert.equal(signoutResponse.status, 200);
});

test('E2E smoke: superAdmin can inspect and revoke target user sessions', async () => {
  await User.create({
    userName: 'superadmin',
    email: 'superadmin@example.com',
    password: hashPassword('Password123!'),
    role: 'superAdmin'
  });
  await User.create({
    userName: 'sessiontarget',
    email: 'target@example.com',
    password: hashPassword('Password123!'),
    role: 'user'
  });

  const targetAgent = request.agent(app);
  const targetSignin = await targetAgent.post('/api/auth/signin').send({
    email: 'target@example.com',
    password: 'Password123!'
  });
  assert.equal(targetSignin.status, 200);

  const adminAgent = request.agent(app);
  const adminSignin = await adminAgent.post('/api/auth/signin').send({
    email: 'superadmin@example.com',
    password: 'Password123!'
  });
  assert.equal(adminSignin.status, 200);

  const targetUser = await User.findOne({ email: 'target@example.com' }).select('_id');
  const sessionsResponse = await adminAgent.get(
    `/api/auth/admin/users/${targetUser._id.toString()}/sessions`
  );
  assert.equal(sessionsResponse.status, 200);
  assert.equal(Array.isArray(sessionsResponse.body.data), true);
  assert.ok(sessionsResponse.body.data.length >= 1);

  const revokeAllResponse = await adminAgent.post(
    `/api/auth/admin/users/${targetUser._id.toString()}/sessions/revoke-all`
  );
  assert.equal(revokeAllResponse.status, 200);
  assert.equal(revokeAllResponse.body.data.revokedSessions >= 1, true);
});
