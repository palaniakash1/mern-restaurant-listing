import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import { signAccessToken } from '../services/auth.service.js';
import jwtRotationService from '../services/jwtRotation.service.js';
import {
  traceAuthOperation,
  traceDatabaseOperation,
  tracingMiddleware
} from '../tracing.js';

test('jwt rotation service signs and verifies access tokens', async () => {
  await jwtRotationService.ready;

  const token = signAccessToken({ _id: '507f1f77bcf86cd799439011', role: 'user' });
  const decoded = jwtRotationService.verifyToken(token);

  assert.equal(decoded.role, 'user');
  assert.equal(String(decoded.id), '507f1f77bcf86cd799439011');
});

test('jwt rotation service still verifies legacy static-secret tokens', () => {
  const legacyToken = jwt.sign(
    { id: '507f1f77bcf86cd799439011', role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const decoded = jwtRotationService.verifyToken(legacyToken);

  assert.equal(decoded.role, 'admin');
  assert.equal(decoded.id, '507f1f77bcf86cd799439011');
});

test('tracing helpers execute wrapped operations and preserve results', async () => {
  const dbResult = await traceDatabaseOperation('unit.query', async () => 'db-ok', {
    collection: 'users'
  });
  const authResult = await traceAuthOperation(
    'unit.auth',
    'user-1',
    { method: 'password' },
    async () => 'auth-ok'
  );

  assert.equal(dbResult, 'db-ok');
  assert.equal(authResult, 'auth-ok');
});

test('tracing middleware attaches a trace id header', async () => {
  const req = {
    method: 'GET',
    path: '/api/health',
    originalUrl: '/api/health',
    headers: {},
    requestId: 'req-test-trace'
  };
  const responseHeaders = {};
  const res = {
    on(event, handler) {
      if (event === 'finish') {
        this.finish = handler;
      }
    },
    setHeader(name, value) {
      responseHeaders[name] = value;
    },
    getHeader(name) {
      return responseHeaders[name];
    },
    statusCode: 200
  };
  let nextCalled = false;

  tracingMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(typeof req.traceId, 'string');
  assert.equal(responseHeaders['X-Trace-Id'], req.traceId);

  res.finish?.();
});
