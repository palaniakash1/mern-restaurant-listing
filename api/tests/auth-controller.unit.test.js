import test from 'node:test';
import assert from 'node:assert/strict';

import {
  changePassword,
  google,
  refreshSession,
  revokeSessionById,
  signin,
  signup
} from '../controllers/auth.controller.js';

const createRes = () => {
  let statusCode = 200;
  let payload = null;

  return {
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

const invoke = async (handler, req = {}) => {
  const res = createRes();
  let nextError = null;
  await handler(req, res, (error) => {
    nextError = error;
  });
  return { res, nextError };
};

test('auth controller signup validation covers missing, malformed, and weak credential branches', async () => {
  let result = await invoke(signup, {
    body: { userName: '', email: 'user@example.com', password: 'Password1' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(signup, {
    body: { userName: 'ab', email: 'user@example.com', password: 'Password1' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(signup, {
    body: {
      userName: 'UpperCase',
      email: 'user@example.com',
      password: 'Password1'
    }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(signup, {
    body: { userName: 'validname', email: '', password: 'Password1' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(signup, {
    body: { userName: 'validname', email: 'bad-email', password: 'Password1' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(signup, {
    body: { userName: 'validname', email: 'user@example.com', password: '' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(signup, {
    body: {
      userName: 'validname',
      email: 'user@example.com',
      password: 'weakpass'
    }
  });
  assert.equal(result.nextError.statusCode, 400);
});

test('auth controller signin, google, refresh, revoke, and password guards cover direct error branches', async () => {
  let result = await invoke(signin, {
    body: { email: '', password: 'Password1' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(signin, {
    body: { email: 'invalid-email', password: 'Password1' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(signin, {
    body: { email: 'user@example.com', password: '' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(google, {
    body: { name: 'Test User' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(refreshSession, {
    cookies: {}
  });
  assert.equal(result.nextError.statusCode, 401);

  result = await invoke(revokeSessionById, {
    user: { id: 'user-1', role: 'user' },
    params: { sessionId: 'bad-id' }
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(changePassword, {
    user: { id: 'user-1', role: 'user' },
    body: {}
  });
  assert.equal(result.nextError.statusCode, 400);

  result = await invoke(changePassword, {
    user: { id: 'user-1', role: 'user' },
    body: {
      currentPassword: 'OldPassword1',
      newPassword: 'weakpass'
    }
  });
  assert.equal(result.nextError.statusCode, 400);
});
