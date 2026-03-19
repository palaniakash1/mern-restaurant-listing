import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assignStoreManagerToRestaurant,
  changeStoreManagerOwner,
  createStoreManager,
  deactivateUser,
  deleteUser,
  getAllUsers,
  getAvailableAdmins,
  getStoreManagers,
  restoreUser,
  test as testEndpoint,
  unassignStoreManager,
  updateUser
} from '../controllers/user.controller.js';
import userService from '../services/user.service.js';

const restorers = [];

const patch = (target, key, value) => {
  const original = target[key];
  target[key] = value;
  restorers.push(() => {
    target[key] = original;
  });
};

const restoreAll = () => {
  while (restorers.length > 0) {
    restorers.pop()();
  }
};

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

test.afterEach(() => {
  restoreAll();
});

test('user controller returns expected success payloads across user and superAdmin branches', async () => {
  patch(userService, 'updateUserProfile', async () => ({ id: 'user-1' }));
  patch(userService, 'deleteUserAccount', async () => ({ id: 'user-1' }));
  patch(userService, 'deactivateUserAccount', async () => ({ id: 'user-1' }));
  patch(userService, 'restoreUserAccount', async () => ({ id: 'user-1' }));
  patch(userService, 'listUsersForAdmin', async () => ({ data: [], total: 0 }));
  patch(userService, 'listAvailableAdmins', async () => ({ data: [], total: 0 }));
  patch(userService, 'createStoreManagerUser', async () => ({ id: 'manager-1' }));
  patch(userService, 'assignStoreManagerRestaurant', async () => undefined);
  patch(userService, 'listStoreManagers', async () => ({ data: [], total: 0 }));
  patch(userService, 'unassignStoreManagerRestaurant', async () => undefined);
  patch(userService, 'transferStoreManagerOwner', async () => undefined);

  let result = await invoke(testEndpoint, {});
  assert.equal(result.res.payload.message, 'API test message is displaying');

  result = await invoke(updateUser, {
    user: { id: 'actor-1', role: 'user' },
    params: { id: 'user-1' },
    body: { profilePicture: 'https://example.com/a.png' }
  });
  assert.equal(result.res.statusCode, 200);
  assert.equal(result.res.payload.message, 'user updated successfully');

  result = await invoke(deleteUser, {
    user: { id: 'actor-1', role: 'user' },
    params: { id: 'user-1' }
  });
  assert.equal(result.res.payload.message, 'Account deleted successfully');

  result = await invoke(deleteUser, {
    user: { id: 'actor-2', role: 'superAdmin' },
    params: { id: 'user-1' }
  });
  assert.equal(result.res.payload.message, 'User deleted successfully');

  result = await invoke(deactivateUser, {
    user: { id: 'actor-1', role: 'user' },
    params: { id: 'user-1' }
  });
  assert.equal(result.res.payload.message, 'Account deactivated successfully');

  result = await invoke(deactivateUser, {
    user: { id: 'actor-2', role: 'superAdmin' },
    params: { id: 'user-1' }
  });
  assert.equal(result.res.payload.message, 'User deactivated successfully');

  result = await invoke(restoreUser, {
    user: { id: 'actor-2', role: 'superAdmin' },
    params: { id: 'user-1' }
  });
  assert.equal(result.res.payload.message, 'user restored now!');

  result = await invoke(getAllUsers, {
    user: { id: 'actor-2', role: 'superAdmin' },
    query: {}
  });
  assert.equal(result.res.payload.success, true);

  result = await invoke(getAvailableAdmins, {
    user: { id: 'actor-2', role: 'superAdmin' },
    query: {}
  });
  assert.equal(result.res.payload.success, true);

  result = await invoke(createStoreManager, {
    user: { id: 'actor-2', role: 'admin' },
    body: { userName: 'manager' }
  });
  assert.equal(result.res.statusCode, 201);
  assert.equal(result.res.payload.message, 'storeManager created successfully');

  result = await invoke(assignStoreManagerToRestaurant, {
    user: { id: 'actor-2', role: 'admin' },
    params: { id: 'manager-1' },
    body: { restaurantId: 'restaurant-1' }
  });
  assert.equal(result.res.payload.message, 'StoreManager assigned to restaurant');

  result = await invoke(getStoreManagers, {
    user: { id: 'actor-2', role: 'admin' },
    query: {}
  });
  assert.equal(result.res.payload.success, true);

  result = await invoke(unassignStoreManager, {
    user: { id: 'actor-2', role: 'admin' },
    params: { id: 'manager-1' }
  });
  assert.equal(result.res.payload.message, 'StoreManager unassigned');

  result = await invoke(changeStoreManagerOwner, {
    user: { id: 'actor-2', role: 'superAdmin' },
    params: { id: 'manager-1' },
    body: { newAdminId: 'admin-2' }
  });
  assert.equal(result.res.payload.message, 'Transferred successfully');
});

test('user controller forwards service failures through next', async () => {
  const expectedError = new Error('service failure');
  patch(userService, 'updateUserProfile', async () => {
    throw expectedError;
  });
  patch(userService, 'deleteUserAccount', async () => {
    throw expectedError;
  });
  patch(userService, 'deactivateUserAccount', async () => {
    throw expectedError;
  });
  patch(userService, 'restoreUserAccount', async () => {
    throw expectedError;
  });
  patch(userService, 'listUsersForAdmin', async () => {
    throw expectedError;
  });
  patch(userService, 'listAvailableAdmins', async () => {
    throw expectedError;
  });
  patch(userService, 'createStoreManagerUser', async () => {
    throw expectedError;
  });
  patch(userService, 'assignStoreManagerRestaurant', async () => {
    throw expectedError;
  });
  patch(userService, 'listStoreManagers', async () => {
    throw expectedError;
  });
  patch(userService, 'unassignStoreManagerRestaurant', async () => {
    throw expectedError;
  });
  patch(userService, 'transferStoreManagerOwner', async () => {
    throw expectedError;
  });

  let result = await invoke(updateUser, {
    user: { id: 'actor-1', role: 'user' },
    params: { id: 'user-1' },
    body: {}
  });
  assert.equal(result.nextError, expectedError);

  result = await invoke(deleteUser, {
    user: { id: 'actor-1', role: 'user' },
    params: { id: 'user-1' }
  });
  assert.equal(result.nextError, expectedError);

  result = await invoke(deactivateUser, {
    user: { id: 'actor-1', role: 'user' },
    params: { id: 'user-1' }
  });
  assert.equal(result.nextError, expectedError);

  result = await invoke(restoreUser, {
    user: { id: 'actor-1', role: 'superAdmin' },
    params: { id: 'user-1' }
  });
  assert.equal(result.nextError, expectedError);

  result = await invoke(getAllUsers, {
    user: { id: 'actor-1', role: 'superAdmin' },
    query: {}
  });
  assert.equal(result.nextError, expectedError);

  result = await invoke(getAvailableAdmins, {
    user: { id: 'actor-1', role: 'superAdmin' },
    query: {}
  });
  assert.equal(result.nextError, expectedError);

  result = await invoke(createStoreManager, {
    user: { id: 'actor-1', role: 'admin' },
    body: {}
  });
  assert.equal(result.nextError, expectedError);

  result = await invoke(assignStoreManagerToRestaurant, {
    user: { id: 'actor-1', role: 'admin' },
    params: { id: 'manager-1' },
    body: {}
  });
  assert.equal(result.nextError, expectedError);

  result = await invoke(getStoreManagers, {
    user: { id: 'actor-1', role: 'admin' },
    query: {}
  });
  assert.equal(result.nextError, expectedError);

  result = await invoke(unassignStoreManager, {
    user: { id: 'actor-1', role: 'admin' },
    params: { id: 'manager-1' }
  });
  assert.equal(result.nextError, expectedError);

  result = await invoke(changeStoreManagerOwner, {
    user: { id: 'actor-1', role: 'superAdmin' },
    params: { id: 'manager-1' },
    body: {}
  });
  assert.equal(result.nextError, expectedError);
});
