import bcryptjs from 'bcryptjs';

import userRepository from '../repositories/user.repository.js';
import { withTransaction } from '../utils/withTransaction.js';
import { sanitizeAuditData } from '../utils/sanitizeAuditData.js';
import { logAudit } from '../utils/auditLogger.js';
import { diffObject } from '../utils/diff.js';
import {
  MAX_SEARCH_LENGTH,
  escapeRegex,
  getClientIp
} from '../utils/controllerHelpers.js';
import { errorHandler } from '../utils/error.js';
import { paginate } from '../utils/paginate.js';
import { traceAuthOperation } from '../tracing.js';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;
const USERNAME_REGEX = /^[a-z0-9]+$/;

const buildSafeSearchRegex = (value) => {
  const safeQuery = String(value || '')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH);

  return safeQuery ? new RegExp(escapeRegex(safeQuery), 'i') : null;
};

export const updateUserProfile = async ({ actor, targetUserId, body, req }) =>
  traceAuthOperation(
    'updateUserProfile',
    actor.id,
    { targetUserId },
    async () =>
      withTransaction(async (session) => {
        if (actor.role !== 'superAdmin' && actor.id !== targetUserId) {
          throw errorHandler(403, 'you are not allowed to update the user');
        }

        const oldUser = await userRepository.findUserByIdLean(targetUserId, {
          session
        });
        if (!oldUser) {
          throw errorHandler(404, 'User Not Found!');
        }

        const allowedFields = [
          'userName',
          'password',
          'profilePicture',
          'email'
        ];
        const updates = {};

        for (const field of allowedFields) {
          if (body[field] !== undefined) {
            updates[field] = body[field];
          }
        }

        if (updates.password) {
          if (updates.password.length < 8) {
            throw errorHandler(400, 'password must be atleast 8 characters');
          }
          updates.password = bcryptjs.hashSync(updates.password, 10);
        }

        if (updates.userName) {
          if (updates.userName.length < 3 || updates.userName.length > 30) {
            throw errorHandler(
              400,
              'userName must be between 3 and 30 characters'
            );
          }
          if (updates.userName.includes(' ')) {
            throw errorHandler(400, 'userName should not contain spaces');
          }
          if (updates.userName !== updates.userName.toLowerCase()) {
            throw errorHandler(400, ' UserName must be lowercase');
          }
          if (!USERNAME_REGEX.test(updates.userName)) {
            throw errorHandler(
              400,
              'UserName can only contain lowercase  letters and numbers'
            );
          }
        }

        if (updates.email) {
          const existingUser = await userRepository.findUserOne(
            {
              email: updates.email,
              _id: { $ne: targetUserId }
            },
            { session }
          );
          if (existingUser) {
            throw errorHandler(409, 'Email already in use');
          }
          updates.email = updates.email.toLowerCase();
        }

        const updatedUser = await userRepository.updateUserById(
          targetUserId,
          { $set: updates },
          {
            session,
            select: '-password',
            lean: true
          }
        );

        if (!updatedUser) {
          throw errorHandler(404, 'User not found after update');
        }

        const diff = diffObject(oldUser, updatedUser, allowedFields);
        if (Object.keys(diff).length) {
          await logAudit({
            actorId: actor.id,
            actorRole: actor.role,
            entityType: 'user',
            entityId: updatedUser._id,
            action: 'UPDATE',
            before: diff,
            after: null,
            ipAddress: getClientIp(req)
          });
        }

        return updatedUser;
      })
  );

export const deleteUserAccount = async ({ actor, targetUserId, req }) =>
  traceAuthOperation(
    'deleteUserAccount',
    actor.id,
    { targetUserId },
    async () =>
      withTransaction(async (session) => {
        if (!actor) {
          throw errorHandler(401, 'Unauthorized');
        }

        const oldUser = await userRepository.findUserByIdLean(targetUserId, {
          session
        });
        if (!oldUser) {
          throw errorHandler(404, 'user not found');
        }

        const isSuperAdmin = actor.role === 'superAdmin';
        const isSelfDelete = actor.id === targetUserId;
        if (!isSuperAdmin && !isSelfDelete) {
          throw errorHandler(403, 'You are not allowed to delete this user');
        }

        const deleted = await userRepository.deleteUserById(targetUserId, {
          session
        });
        if (!deleted) {
          throw errorHandler(404, 'User not found');
        }

        await logAudit({
          actorId: actor.id,
          actorRole: actor.role,
          entityType: 'user',
          entityId: oldUser._id,
          action: 'DELETE',
          before: sanitizeAuditData(oldUser),
          ipAddress: getClientIp(req)
        });

        return {
          deletedid: oldUser._id,
          deletedName: oldUser.userName,
          deletedBy: actor.id,
          deletedByName: actor.name
        };
      })
  );

export const deactivateUserAccount = async ({ actor, targetUserId, req }) => {
  return traceAuthOperation(
    'deactivateUserAccount',
    actor.id,
    { targetUserId },
    async () =>
      withTransaction(async (session) => {
        if (!actor) {
          throw errorHandler(401, 'Unauthorized');
        }

        const user = await userRepository.findUserById(targetUserId, {
          session
        });
        if (!user) {
          throw errorHandler(404, 'user not found');
        }
        if (!user.isActive) {
          throw errorHandler(400, 'already deactivated');
        }

        const isSuperAdmin = actor.role === 'superAdmin';
        const isSelfDeactivate = actor.id === targetUserId;
        if (!isSuperAdmin && !isSelfDeactivate) {
          throw errorHandler(403, 'You are not allowed to disable this user');
        }

        user.isActive = false;
        await userRepository.saveUser(user, { session });

        await logAudit({
          actorId: actor.id,
          actorRole: actor.role,
          entityType: 'user',
          entityId: user._id,
          action: 'STATUS_CHANGE',
          before: { isActive: true },
          after: { isActive: false },
          ipAddress: getClientIp(req)
        });

        return {
          userId: user._id,
          userName: user.userName,
          deactivatedBy: actor.id
        };
      })
  );
};

export const restoreUserAccount = async ({ actor, targetUserId, req }) =>
  traceAuthOperation(
    'restoreUserAccount',
    actor.id,
    { targetUserId },
    async () =>
      withTransaction(async (session) => {
        const user = await userRepository.findUserById(targetUserId, {
          session
        });
        if (!user) {
          throw errorHandler(404, 'user not found');
        }
        if (user.isActive !== false) {
          throw errorHandler(400, 'User already active');
        }

        user.isActive = true;
        await userRepository.saveUser(user, { session });

        await logAudit({
          actorId: actor.id,
          actorRole: actor.role,
          entityType: 'user',
          entityId: user._id,
          action: 'STATUS_CHANGE',
          before: { isActive: false },
          after: { isActive: true },
          ipAddress: getClientIp(req)
        });

        return { restoredUserId: user._id };
      })
  );

export const listUsersForAdmin = async ({ actor, query }) =>
  traceAuthOperation('listUsersForAdmin', actor.id, {}, async () => {
    if (actor.role !== 'superAdmin') {
      throw errorHandler(403, 'Only superAdmin can access all users');
    }

    const { page, limit, q, order } = query;
    const sortDirection = order === 'asc' ? 1 : -1;
    const searchRegex = buildSafeSearchRegex(q);
    const filter = searchRegex
      ? {
        $or: [
          { userName: { $regex: searchRegex } },
          { email: { $regex: searchRegex } },
          { role: { $regex: searchRegex } }
        ]
      }
      : {};

    const total = await userRepository.countUsers(filter);
    const pagination = paginate({ page, limit, total });
    const users = await userRepository.listUsers(filter, {
      select: '-password',
      skip: pagination.skip,
      limit: pagination.limit,
      sort: { updatedAt: sortDirection }
    });

    return { ...pagination, data: users };
  });

export const listAvailableAdmins = async ({ actor, query }) =>
  traceAuthOperation('listAvailableAdmins', actor.id, {}, async () => {
    if (actor.role !== 'superAdmin') {
      throw errorHandler(403, 'Only superAdmin can access available admins');
    }

    const { page, limit, q } = query;
    const searchRegex = buildSafeSearchRegex(q) || new RegExp('', 'i');
    const filter = {
      role: 'admin',
      restaurantId: { $in: [null, undefined] },
      userName: { $regex: searchRegex }
    };

    const total = await userRepository.countUsers(filter);
    const pagination = paginate({ page, limit, total });
    const admins = await userRepository.listUsers(filter, {
      select: '_id userName email',
      skip: pagination.skip,
      limit: pagination.limit
    });

    return {
      message: 'showing available admins',
      ...pagination,
      data: admins
    };
  });

export const createStoreManagerUser = async ({ actor, body, req }) =>
  traceAuthOperation('createStoreManagerUser', actor.id, {}, async () => {
    const { userName, email, password } = body;

    if (!userName || userName.trim() === '') {
      throw errorHandler(400, 'Please provide a valid username');
    }
    if (userName.length < 3) {
      throw errorHandler(400, 'Username must be at least 3 characters long');
    }
    if (userName !== userName.toLowerCase()) {
      throw errorHandler(400, 'UserName must be lowercase');
    }

    if (!email || email.trim() === '') {
      throw errorHandler(400, 'Please enter an email');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw errorHandler(400, 'Please enter a valid email address');
    }

    if (!password || password.trim() === '') {
      throw errorHandler(400, 'Please enter a password');
    }
    if (!PASSWORD_REGEX.test(password)) {
      throw errorHandler(
        400,
        'Minimum 8 characters total. Must contain at least 1 capital letter (A-Z). Must contain at least 1 number (0-9).'
      );
    }

    const normalizedUserName = userName.toLowerCase();
    const normalizedEmail = email.toLowerCase();

    const existingUserName = await userRepository.findUserOne({
      userName: normalizedUserName
    });
    if (existingUserName) {
      throw errorHandler(
        409,
        `Username '${normalizedUserName}' already exists, try login instead`
      );
    }

    const existingEmail = await userRepository.findUserOne({
      email: normalizedEmail
    });
    if (existingEmail) {
      throw errorHandler(
        409,
        `Email '${normalizedEmail}' already exists, try login instead`
      );
    }

    const storeManager = await userRepository.createUser({
      userName: normalizedUserName,
      email: normalizedEmail,
      password: bcryptjs.hashSync(password, 10),
      role: 'storeManager',
      createdByAdminId: actor.role === 'admin' ? actor.id : null
    });

    await logAudit({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: 'user',
      entityId: storeManager._id,
      action: 'CREATE',
      before: null,
      after: {
        role: 'storeManager',
        email: storeManager.email
      },
      ipAddress: getClientIp(req)
    });

    return {
      id: storeManager._id,
      userName: storeManager.userName,
      email: storeManager.email
    };
  });

export const assignStoreManagerRestaurant = async ({
  actor,
  storeManagerId,
  restaurantId,
  req
}) => {
  return traceAuthOperation(
    'assignStoreManagerRestaurant',
    actor.id,
    { storeManagerId, restaurantId },
    async () =>
      withTransaction(async (session) => {
        if (!restaurantId) {
          throw errorHandler(400, 'restaurantId required');
        }

        const storeManager = await userRepository.findUserById(storeManagerId, {
          session
        });
        if (!storeManager || storeManager.role !== 'storeManager') {
          throw errorHandler(404, 'StoreManager not found');
        }
        if (storeManager.restaurantId) {
          throw errorHandler(
            409,
            'StoreManager already assigned to a restaurant'
          );
        }
        if (
          actor.role === 'admin' &&
          storeManager.createdByAdminId?.toString() !== actor.id
        ) {
          throw errorHandler(403, 'Not your storeManager');
        }

        const restaurant = await userRepository.findRestaurantById(
          restaurantId,
          {
            session
          }
        );
        if (!restaurant) {
          throw errorHandler(404, 'Restaurant not found');
        }
        if (
          actor.role === 'admin' &&
          actor.restaurantId?.toString() !== restaurantId
        ) {
          throw errorHandler(403, 'Not your restaurant');
        }

        storeManager.restaurantId = restaurantId;
        await userRepository.saveUser(storeManager, { session });

        await logAudit({
          actorId: actor.id,
          actorRole: actor.role,
          entityType: 'user',
          entityId: storeManager._id,
          action: 'UPDATE',
          after: { restaurantId },
          ipAddress: getClientIp(req)
        });
      })
  );
};

export const listStoreManagers = async ({ actor, query }) =>
  traceAuthOperation('listStoreManagers', actor.id, {}, async () => {
    const { page, limit } = query;
    const filter = { role: 'storeManager' };
    if (actor.role === 'admin') {
      filter.createdByAdminId = actor.id;
    }

    const total = await userRepository.countUsers(filter);
    const pagination = paginate({ page, limit, total });
    const storeManagers = await userRepository.listUsers(filter, {
      select: '-password',
      skip: pagination.skip,
      limit: pagination.limit,
      sort: { createdAt: -1 }
    });

    return {
      ...pagination,
      data: storeManagers
    };
  });

export const unassignStoreManagerRestaurant = async ({
  actor,
  storeManagerId,
  req
}) => {
  return traceAuthOperation(
    'unassignStoreManagerRestaurant',
    actor.id,
    { storeManagerId },
    async () =>
      withTransaction(async (session) => {
        const storeManager = await userRepository.findUserById(storeManagerId, {
          session
        });
        if (!storeManager || storeManager.role !== 'storeManager') {
          throw errorHandler(404, 'StoreManager not found');
        }
        if (
          actor.role === 'admin' &&
          storeManager.createdByAdminId?.toString() !== actor.id
        ) {
          throw errorHandler(403, 'Not your storeManager');
        }
        if (!storeManager.restaurantId) {
          throw errorHandler(400, 'StoreManager is not assigned');
        }

        storeManager.restaurantId = null;
        await userRepository.saveUser(storeManager, { session });

        await logAudit({
          actorId: actor.id,
          actorRole: actor.role,
          entityType: 'user',
          entityId: storeManager._id,
          action: 'UPDATE',
          after: { restaurantId: null },
          ipAddress: getClientIp(req)
        });
      })
  );
};

export const transferStoreManagerOwner = async ({
  actor,
  storeManagerId,
  newAdminId,
  req
}) => {
  return traceAuthOperation(
    'transferStoreManagerOwner',
    actor.id,
    { storeManagerId, newAdminId },
    async () =>
      withTransaction(async (session) => {
        const newAdmin = await userRepository.findUserById(newAdminId, {
          session
        });
        if (!newAdmin || newAdmin.role !== 'admin') {
          throw errorHandler(400, 'Invalid admin');
        }

        const storeManager = await userRepository.findUserById(storeManagerId, {
          session
        });
        if (!storeManager || storeManager.role !== 'storeManager') {
          throw errorHandler(404, 'StoreManager not found');
        }

        storeManager.createdByAdminId = newAdminId;
        await userRepository.saveUser(storeManager, { session });

        await logAudit({
          actorId: actor.id,
          actorRole: 'superAdmin',
          entityType: 'user',
          entityId: storeManager._id,
          action: 'UPDATE',
          after: { createdByAdminId: newAdminId },
          ipAddress: getClientIp(req)
        });
      })
  );
};

export default {
  updateUserProfile,
  deleteUserAccount,
  deactivateUserAccount,
  restoreUserAccount,
  listUsersForAdmin,
  listAvailableAdmins,
  createStoreManagerUser,
  assignStoreManagerRestaurant,
  listStoreManagers,
  unassignStoreManagerRestaurant,
  transferStoreManagerOwner
};
