import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

import bcryptjs from 'bcryptjs';

import User from '../models/user.model.js';
import Restaurant from '../models/restaurant.model.js';
import AuditLog from '../models/auditLog.model.js';
import { createPrivilegedUser } from '../services/admin.service.js';
import {
  assignStoreManagerRestaurant,
  createStoreManagerUser,
  deactivateUserAccount,
  deleteUserAccount,
  listAvailableAdmins,
  listStoreManagers,
  listUsersForAdmin,
  restoreUserAccount,
  transferStoreManagerOwner,
  unassignStoreManagerRestaurant,
  updateUserProfile
} from '../services/user.service.js';
import {
  clearTestDb,
  setupTestDb,
  teardownTestDb
} from './helpers/testDb.js';

const buildReq = () => ({
  headers: {},
  ip: '127.0.0.1'
});

const restaurantPayload = (name, adminId, extras = {}) => ({
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  address: {
    addressLine1: 'Main street',
    areaLocality: 'Center',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
    location: {
      type: 'Point',
      coordinates: [-0.1276, 51.5072]
    }
  },
  openingHours: {
    monday: { open: '09:00', close: '22:00', isClosed: false },
    tuesday: { open: '09:00', close: '22:00', isClosed: false },
    wednesday: { open: '09:00', close: '22:00', isClosed: false },
    thursday: { open: '09:00', close: '22:00', isClosed: false },
    friday: { open: '09:00', close: '22:00', isClosed: false },
    saturday: { open: '09:00', close: '22:00', isClosed: false },
    sunday: { open: '09:00', close: '22:00', isClosed: false }
  },
  adminId,
  ...extras
});

const createUser = async (overrides = {}) =>
  User.create({
    userName: `user_${Math.random().toString(36).slice(2, 8)}`,
    email: `user_${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: bcryptjs.hashSync('Password1', 10),
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

test('admin service provisions privileged users and enforces actor/duplicate guards', async () => {
  const superAdmin = await createUser({ role: 'superAdmin' });
  const req = buildReq();

  await assert.rejects(
    createPrivilegedUser({
      actor: { id: superAdmin._id.toString(), role: 'admin' },
      body: {
        userName: 'admin_create_fail',
        email: 'admin_create_fail@example.com',
        password: 'Password1',
        role: 'admin'
      },
      req
    }),
    (error) => error.statusCode === 403
  );

  await assert.rejects(
    createPrivilegedUser({
      actor: { id: superAdmin._id.toString(), role: 'superAdmin' },
      body: {
        userName: 'bad_role',
        email: 'bad_role@example.com',
        password: 'Password1',
        role: 'user'
      },
      req
    }),
    (error) => error.statusCode === 400
  );

  const created = await createPrivilegedUser({
    actor: { id: superAdmin._id.toString(), role: 'superAdmin' },
    body: {
      userName: 'ProdAdmin',
      email: 'ProdAdmin@Example.com',
      password: 'Password1',
      role: 'admin'
    },
    req
  });

  assert.equal(created.user.role, 'admin');
  assert.equal(created.user.userName, 'prodadmin');
  assert.equal(created.user.email, 'prodadmin@example.com');

  await assert.rejects(
    createPrivilegedUser({
      actor: { id: superAdmin._id.toString(), role: 'superAdmin' },
      body: {
        userName: 'ProdAdmin',
        email: 'ProdAdmin@Example.com',
        password: 'Password1',
        role: 'admin'
      },
      req
    }),
    (error) => error.statusCode === 400
  );
});

test('user service updates profiles with validation and audit logging', async () => {
  const actor = await createUser({ role: 'user', userName: 'owneruser' });
  const superAdmin = await createUser({ role: 'superAdmin', userName: 'ownerroot' });
  await createUser({ email: 'taken@example.com', userName: 'takenuser' });
  const req = buildReq();

  await assert.rejects(
    updateUserProfile({
      actor: { id: superAdmin._id.toString(), role: 'superAdmin' },
      targetUserId: new User()._id.toString(),
      body: { profilePicture: 'https://example.com/pic.png' },
      req
    }),
    (error) => error.statusCode === 404
  );

  await assert.rejects(
    updateUserProfile({
      actor: { id: actor._id.toString(), role: 'user' },
      targetUserId: actor._id.toString(),
      body: { userName: 'Bad Name' },
      req
    }),
    (error) => error.statusCode === 400
  );

  await assert.rejects(
    updateUserProfile({
      actor: { id: actor._id.toString(), role: 'user' },
      targetUserId: actor._id.toString(),
      body: { email: 'taken@example.com' },
      req
    }),
    (error) => error.statusCode === 409
  );

  const updated = await updateUserProfile({
    actor: { id: actor._id.toString(), role: 'user' },
    targetUserId: actor._id.toString(),
    body: {
      email: 'OwnerUser@Example.com',
      profilePicture: 'https://example.com/new.png'
    },
    req
  });

  assert.equal(updated.email, 'owneruser@example.com');
  assert.equal(updated.profilePicture, 'https://example.com/new.png');
  assert.equal(await AuditLog.countDocuments({ action: 'UPDATE' }), 1);
});

test('user lifecycle service handles list, deactivate, restore, and delete flows', async () => {
  const superAdmin = await createUser({ role: 'superAdmin', userName: 'superadmin' });
  const actor = await createUser({ role: 'user', userName: 'lifecycleuser' });
  const req = buildReq();

  await assert.rejects(
    listUsersForAdmin({
      actor: { id: actor._id.toString(), role: 'user' },
      query: {}
    }),
    (error) => error.statusCode === 403
  );

  const listed = await listUsersForAdmin({
    actor: { id: superAdmin._id.toString(), role: 'superAdmin' },
    query: { q: 'life', page: 1, limit: 10, order: 'desc' }
  });
  assert.equal(listed.data.length, 1);

  const deactivated = await deactivateUserAccount({
    actor: { id: actor._id.toString(), role: 'user' },
    targetUserId: actor._id.toString(),
    req
  });
  assert.equal(deactivated.userId.toString(), actor._id.toString());

  await assert.rejects(
    deactivateUserAccount({
      actor: { id: actor._id.toString(), role: 'user' },
      targetUserId: actor._id.toString(),
      req
    }),
    (error) => error.statusCode === 400
  );

  await assert.rejects(
    restoreUserAccount({
      actor: { id: superAdmin._id.toString(), role: 'superAdmin' },
      targetUserId: superAdmin._id.toString(),
      req
    }),
    (error) => error.statusCode === 400
  );

  const restored = await restoreUserAccount({
    actor: { id: superAdmin._id.toString(), role: 'superAdmin' },
    targetUserId: actor._id.toString(),
    req
  });
  assert.equal(restored.restoredUserId.toString(), actor._id.toString());

  await assert.rejects(
    deleteUserAccount({
      actor: { id: superAdmin._id.toString(), role: 'superAdmin', name: 'root' },
      targetUserId: new User()._id.toString(),
      req
    }),
    (error) => error.statusCode === 404
  );

  const deleted = await deleteUserAccount({
    actor: { id: actor._id.toString(), role: 'user', name: 'self' },
    targetUserId: actor._id.toString(),
    req
  });
  assert.equal(deleted.deletedBy, actor._id.toString());
});

test('store manager services cover listing and available-admin filters', async () => {
  const superAdmin = await createUser({ role: 'superAdmin', userName: 'superscope' });
  const adminA = await createUser({ role: 'admin', userName: 'adminscopea' });
  const adminB = await createUser({ role: 'admin', userName: 'adminscopeb' });
  await Restaurant.create(restaurantPayload('Assigned Restaurant', adminA._id));
  await User.findByIdAndUpdate(adminA._id, { restaurantId: new User()._id });

  await createStoreManagerUser({
    actor: { id: adminA._id.toString(), role: 'admin' },
    body: {
      userName: 'storescope',
      email: 'storescope@example.com',
      password: 'Password1'
    },
    req: buildReq()
  });

  const available = await listAvailableAdmins({
    actor: { id: superAdmin._id.toString(), role: 'superAdmin' },
    query: { q: 'adminscope', page: 1, limit: 10 }
  });
  assert.equal(available.data.length, 1);
  assert.equal(available.data[0]._id.toString(), adminB._id.toString());

  const adminScopedManagers = await listStoreManagers({
    actor: { id: adminA._id.toString(), role: 'admin' },
    query: { page: 1, limit: 10 }
  });
  assert.equal(adminScopedManagers.data.length, 1);
});

test('store manager assignment services cover validation, ownership, and transfer branches', async () => {
  const req = buildReq();
  const superAdmin = await createUser({ role: 'superAdmin', userName: 'superassign' });
  const adminA = await createUser({ role: 'admin', userName: 'assignadmina' });
  const adminB = await createUser({ role: 'admin', userName: 'assignadminb' });
  const foreignStoreManager = await createUser({
    role: 'storeManager',
    userName: 'foreignmanager',
    createdByAdminId: adminB._id
  });
  const assignedRestaurant = await Restaurant.create(
    restaurantPayload('Assign Restaurant', adminA._id)
  );
  await User.findByIdAndUpdate(adminA._id, { restaurantId: assignedRestaurant._id });

  const createResult = await createStoreManagerUser({
    actor: { id: adminA._id.toString(), role: 'admin' },
    body: {
      userName: 'assignmanager',
      email: 'assignmanager@example.com',
      password: 'Password1'
    },
    req
  });

  const storeManagerId = createResult.id.toString();

  await assert.rejects(
    assignStoreManagerRestaurant({
      actor: { id: adminA._id.toString(), role: 'admin' },
      storeManagerId,
      restaurantId: null,
      req
    }),
    (error) => error.statusCode === 400
  );

  await assert.rejects(
    assignStoreManagerRestaurant({
      actor: { id: adminA._id.toString(), role: 'admin' },
      storeManagerId: adminA._id.toString(),
      restaurantId: assignedRestaurant._id.toString(),
      req
    }),
    (error) => error.statusCode === 404
  );

  await assert.rejects(
    assignStoreManagerRestaurant({
      actor: { id: adminA._id.toString(), role: 'admin' },
      storeManagerId: foreignStoreManager._id.toString(),
      restaurantId: assignedRestaurant._id.toString(),
      req
    }),
    (error) => error.statusCode === 403
  );

  await assert.rejects(
    assignStoreManagerRestaurant({
      actor: { id: adminA._id.toString(), role: 'admin' },
      storeManagerId,
      restaurantId: new User()._id.toString(),
      req
    }),
    (error) => error.statusCode === 404
  );

  await assignStoreManagerRestaurant({
    actor: {
      id: adminA._id.toString(),
      role: 'admin',
      restaurantId: assignedRestaurant._id.toString()
    },
    storeManagerId,
    restaurantId: assignedRestaurant._id.toString(),
    req
  });

  await assert.rejects(
    assignStoreManagerRestaurant({
      actor: {
        id: adminA._id.toString(),
        role: 'admin',
        restaurantId: assignedRestaurant._id.toString()
      },
      storeManagerId,
      restaurantId: assignedRestaurant._id.toString(),
      req
    }),
    (error) => error.statusCode === 409
  );

  await assert.rejects(
    unassignStoreManagerRestaurant({
      actor: { id: adminB._id.toString(), role: 'admin' },
      storeManagerId,
      req
    }),
    (error) => error.statusCode === 403
  );

  await unassignStoreManagerRestaurant({
    actor: { id: adminA._id.toString(), role: 'admin' },
    storeManagerId,
    req
  });

  await assert.rejects(
    unassignStoreManagerRestaurant({
      actor: { id: adminA._id.toString(), role: 'admin' },
      storeManagerId,
      req
    }),
    (error) => error.statusCode === 400
  );

  await assert.rejects(
    transferStoreManagerOwner({
      actor: { id: superAdmin._id.toString(), role: 'superAdmin' },
      storeManagerId,
      newAdminId: new User()._id.toString(),
      req
    }),
    (error) => error.statusCode === 400
  );

  await transferStoreManagerOwner({
    actor: { id: superAdmin._id.toString(), role: 'superAdmin' },
    storeManagerId,
    newAdminId: adminB._id.toString(),
    req
  });

  const transferred = await User.findById(storeManagerId);
  assert.equal(transferred.createdByAdminId.toString(), adminB._id.toString());
});
