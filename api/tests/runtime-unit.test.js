import test from 'node:test';
import assert from 'node:assert/strict';

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import {
  createErrorHandler,
  createNotFoundHandler
} from '../middlewares/errorHandler.js';
import logger from '../utils/logger.js';
import { errorHandler as createError } from '../utils/error.js';
import { verifyToken } from '../utils/verifyUser.js';
import User from '../models/user.model.js';
import {
  clearTestDb,
  setupTestDb,
  signTestToken,
  teardownTestDb
} from './helpers/testDb.js';

const createMockResponse = () => {
  let statusCode = 200;
  let payload;

  return {
    headersSent: false,
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
    }
  };
};

const createRequest = (overrides = {}) => ({
  headers: {},
  cookies: {},
  originalUrl: '/api/test',
  method: 'GET',
  ...overrides
});

const { JsonWebTokenError, TokenExpiredError } = jwt;

test.before(async () => {
  await setupTestDb();
});

test.beforeEach(async () => {
  await clearTestDb();
  logger.clearRecentLogs();
});

test.after(async () => {
  await teardownTestDb();
});

test('error helper creates typed errors', () => {
  const error = createError(418, 'teapot');

  assert.equal(error.statusCode, 418);
  assert.equal(error.message, 'teapot');
});

test('error handler maps mongoose validation errors', () => {
  const handler = createErrorHandler({ isProduction: false });
  const response = createMockResponse();
  const validationError = new mongoose.Error.ValidationError();

  validationError.addError(
    'email',
    new mongoose.Error.ValidatorError({
      path: 'email',
      message: 'Email is required'
    })
  );

  handler(validationError, createRequest(), response, () => {});

  assert.equal(response.statusCode, 400);
  assert.match(response.payload.message, /email is required/i);
});

test('error handler maps mongoose cast errors', () => {
  const handler = createErrorHandler({ isProduction: false });
  const response = createMockResponse();
  const castError = new mongoose.Error.CastError(
    'ObjectId',
    'bad-id',
    'userId'
  );

  handler(castError, createRequest(), response, () => {});

  assert.equal(response.statusCode, 400);
  assert.match(response.payload.message, /invalid/i);
});

test('error handler maps duplicate key errors', () => {
  const handler = createErrorHandler({ isProduction: false });
  const response = createMockResponse();

  handler(
    {
      code: 11000,
      keyValue: { email: 'duplicate@example.com' }
    },
    createRequest(),
    response,
    () => {}
  );

  assert.equal(response.statusCode, 409);
  assert.match(response.payload.message, /already exists|duplicate/i);
});

test('error handler maps JWT, upload, and default errors', () => {
  const handler = createErrorHandler({ isProduction: true });

  const jwtResponse = createMockResponse();
  handler(
    new JsonWebTokenError('jwt malformed'),
    createRequest(),
    jwtResponse,
    () => {}
  );
  assert.equal(jwtResponse.statusCode, 401);

  const expiredResponse = createMockResponse();
  handler(
    new TokenExpiredError('jwt expired', new Date()),
    createRequest(),
    expiredResponse,
    () => {}
  );
  assert.equal(expiredResponse.statusCode, 401);

  const uploadResponse = createMockResponse();
  handler(
    { name: 'MulterError', code: 'LIMIT_FILE_SIZE', message: 'File too large' },
    createRequest(),
    uploadResponse,
    () => {}
  );
  assert.equal(uploadResponse.statusCode, 400);

  const defaultResponse = createMockResponse();
  handler(
    new Error('unexpected failure'),
    createRequest(),
    defaultResponse,
    () => {}
  );
  assert.equal(defaultResponse.statusCode, 500);
});

test('error handler delegates when headers were already sent', () => {
  const handler = createErrorHandler({ isProduction: false });
  const response = createMockResponse();
  response.headersSent = true;
  const expectedError = new Error('stream already started');
  let nextError;

  handler(expectedError, createRequest(), response, (error) => {
    nextError = error;
  });

  assert.equal(nextError, expectedError);
  assert.equal(response.payload, undefined);
});

test('not found handler returns 404 payload', () => {
  const handler = createNotFoundHandler();
  const response = createMockResponse();
  let nextError;

  handler(createRequest({ originalUrl: '/api/missing' }), response, (error) => {
    nextError = error;
  });

  assert.equal(response.statusCode, 200);
  assert.equal(nextError.statusCode, 404);
  assert.match(nextError.message, /not found/i);
});

test('logger stores redacted structured entries', () => {
  logger.info('login-attempt', {
    email: 'user@example.com',
    password: 'super-secret',
    nested: {
      refreshToken: 'very-secret-token'
    }
  });

  const [entry] = logger.getRecentLogs();
  const serialized = JSON.stringify(entry);

  assert.equal(entry.level, 'info');
  assert.match(serialized, /\[REDACTED\]/);
  assert.doesNotMatch(serialized, /super-secret|very-secret-token/);
});

test('logger child merges context into entries', () => {
  const authLogger = logger.child({ component: 'auth', subsystem: 'session' });

  authLogger.warn('session-refresh', { requestId: 'req-1' });

  const [entry] = logger.getRecentLogs();

  assert.equal(entry.component, 'auth');
  assert.equal(entry.subsystem, 'session');
  assert.equal(entry.requestId, 'req-1');
});

test('verifyToken rejects requests without an auth token', async () => {
  const request = createRequest();
  let nextError;

  await verifyToken(request, createMockResponse(), (error) => {
    nextError = error;
  });

  assert.equal(nextError.statusCode, 401);
  assert.match(nextError.message, /missing/i);
});

test('verifyToken rejects malformed and expired tokens', async () => {
  const malformedRequest = createRequest({
    headers: { authorization: 'Bearer not-a-real-token' }
  });
  let malformedError;

  await verifyToken(malformedRequest, createMockResponse(), (error) => {
    malformedError = error;
  });

  assert.equal(malformedError.statusCode, 401);

  const expiredToken = jwt.sign(
    { id: new mongoose.Types.ObjectId().toString() },
    process.env.JWT_SECRET,
    { expiresIn: -1 }
  );
  const expiredRequest = createRequest({
    headers: { authorization: `Bearer ${expiredToken}` }
  });
  let expiredError;

  await verifyToken(expiredRequest, createMockResponse(), (error) => {
    expiredError = error;
  });

  assert.equal(expiredError.statusCode, 401);
});

test('verifyToken rejects missing and inactive users', async () => {
  const missingUserToken = signTestToken({
    id: new mongoose.Types.ObjectId().toString(),
    role: 'user'
  });
  let missingUserError;

  await verifyToken(
    createRequest({ headers: { authorization: `Bearer ${missingUserToken}` } }),
    createMockResponse(),
    (error) => {
      missingUserError = error;
    }
  );

  assert.equal(missingUserError.statusCode, 401);
  assert.match(missingUserError.message, /not found/i);

  const inactiveUser = await User.create({
    name: 'Inactive User',
    userName: 'inactive-user',
    email: 'inactive@example.com',
    password: 'Password123!',
    role: 'user',
    isActive: false
  });
  const inactiveToken = signTestToken({
    id: inactiveUser._id.toString(),
    role: inactiveUser.role
  });
  let inactiveUserError;

  await verifyToken(
    createRequest({ headers: { authorization: `Bearer ${inactiveToken}` } }),
    createMockResponse(),
    (error) => {
      inactiveUserError = error;
    }
  );

  assert.equal(inactiveUserError.statusCode, 403);
  assert.match(inactiveUserError.message, /inactive/i);
});

test('verifyToken authenticates bearer and cookie tokens', async () => {
  const user = await User.create({
    name: 'Active User',
    userName: 'active-user',
    email: 'active@example.com',
    password: 'Password123!',
    role: 'user'
  });
  const token = signTestToken({
    id: user._id.toString(),
    role: user.role
  });

  const bearerRequest = createRequest({
    headers: { authorization: `Bearer ${token}` }
  });
  let bearerNextCalled = false;

  await verifyToken(bearerRequest, createMockResponse(), (error) => {
    assert.equal(error, undefined);
    bearerNextCalled = true;
  });

  assert.equal(bearerNextCalled, true);
  assert.equal(bearerRequest.authSource, 'header');
  assert.equal(bearerRequest.user.id, user._id.toString());
  assert.equal(bearerRequest.user.role, 'user');

  const cookieRequest = createRequest({
    cookies: { access_token: token }
  });
  let cookieNextCalled = false;

  await verifyToken(cookieRequest, createMockResponse(), (error) => {
    assert.equal(error, undefined);
    cookieNextCalled = true;
  });

  assert.equal(cookieNextCalled, true);
  assert.equal(cookieRequest.authSource, 'cookie');
  assert.equal(cookieRequest.user.id, user._id.toString());
  assert.equal(cookieRequest.user.role, 'user');
});
