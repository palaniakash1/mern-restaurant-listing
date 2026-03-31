import bcryptjs from 'bcryptjs';

import adminRepository from '../repositories/admin.repository.js';
import { errorHandler } from '../utils/error.js';
import { getClientIp } from '../utils/controllerHelpers.js';
import { logAudit } from '../utils/auditLogger.js';
import { diffObject } from '../utils/diff.js';
import {
  clonePermissionsForRole,
  normalizePermissionOverrides,
  resolvePermissionsForUser
} from '../utils/permissions.js';
import { traceAuthOperation } from '../tracing.js';

export const createPrivilegedUser = async ({ actor, body, req }) => {
  return traceAuthOperation(
    'createPrivilegedUser',
    actor.id,
    { role: body?.role || null },
    async () => {
      if (actor.role !== 'superAdmin') {
        throw errorHandler(403, 'Only superAdmin can perform this action');
      }

      const {
        userName,
        email,
        password,
        role,
        permissions,
        isActive = true
      } = body;

      if (!['admin', 'storeManager'].includes(role)) {
        throw errorHandler(400, 'Invalid role assignment');
      }
      if (!userName || !email || !password) {
        throw errorHandler(400, 'All fields are required');
      }
      if (password.length < 8) {
        throw errorHandler(400, 'Password must be at least 8 characters');
      }

      const normalizedUserName = userName.toLowerCase();
      const normalizedEmail = email.toLowerCase();
      const normalizedPermissions = normalizePermissionOverrides(role, permissions);

      if (
        permissions &&
        Object.keys(permissions).length > 0 &&
        !normalizedPermissions
      ) {
        throw errorHandler(400, 'Select at least one valid permission');
      }

      const requestedPermissionCount = Object.values(permissions || {}).reduce(
        (count, actions) => count + (Array.isArray(actions) ? actions.length : 0),
        0
      );
      const normalizedPermissionCount = Object.values(
        normalizedPermissions || {}
      ).reduce((count, actions) => count + actions.length, 0);

      if (requestedPermissionCount !== normalizedPermissionCount) {
        throw errorHandler(
          400,
          'Custom permissions must stay within the selected role template'
        );
      }

      const existingUser = await adminRepository.findUsersCount({
        $or: [{ email: normalizedEmail }, { userName: normalizedUserName }]
      });
      if (existingUser) {
        throw errorHandler(400, 'User already exists');
      }

      const newUser = await adminRepository.createUser({
        userName: normalizedUserName,
        email: normalizedEmail,
        password: bcryptjs.hashSync(password, 10),
        role,
        customPermissions: normalizedPermissions,
        isActive,
        createdByAdminId: role === 'admin' ? actor.id : null
      });
      const effectivePermissions = resolvePermissionsForUser(newUser);

      await logAudit({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: 'user',
        entityId: newUser._id,
        action: 'CREATE',
        before: null,
        after: {
          role: newUser.role,
          email: newUser.email,
          isActive: newUser.isActive,
          customPermissions:
            normalizedPermissions || clonePermissionsForRole(newUser.role)
        },
        ipAddress: getClientIp(req)
      });

      return {
        message: `${role} created successfully`,
        user: {
          id: newUser._id,
          userName: newUser.userName,
          email: newUser.email,
          role: newUser.role,
          isActive: newUser.isActive,
          customPermissions: newUser.customPermissions,
          effectivePermissions
        },
        permissionMode: normalizedPermissions ? 'custom' : 'roleTemplate'
      };
    }
  );
};

export const updatePrivilegedUser = async ({
  actor,
  targetUserId,
  body,
  req
}) => {
  return traceAuthOperation(
    'updatePrivilegedUser',
    actor.id,
    { targetUserId },
    async () => {
      if (actor.role !== 'superAdmin') {
        throw errorHandler(403, 'Only superAdmin can perform this action');
      }

      const existingUser = await adminRepository.findUserById(targetUserId);
      if (!existingUser) {
        throw errorHandler(404, 'User not found');
      }
      if (!['admin', 'storeManager'].includes(existingUser.role)) {
        throw errorHandler(
          400,
          'Only admin or storeManager accounts can be updated here'
        );
      }

      const nextRole = body.role || existingUser.role;
      if (!['admin', 'storeManager'].includes(nextRole)) {
        throw errorHandler(400, 'Invalid role assignment');
      }

      const updates = {};

      if (body.userName !== undefined) {
        updates.userName = body.userName.toLowerCase();
      }
      if (body.email !== undefined) {
        updates.email = body.email.toLowerCase();
      }
      if (body.password !== undefined) {
        updates.password = bcryptjs.hashSync(body.password, 10);
      }
      if (body.role !== undefined) {
        updates.role = nextRole;
      }
      if (body.isActive !== undefined) {
        updates.isActive = body.isActive;
      }
      if (body.profilePicture !== undefined) {
        updates.profilePicture = body.profilePicture || existingUser.profilePicture;
      }

      if (updates.userName) {
        const duplicateUserName = await adminRepository.findUsersCount({
          userName: updates.userName,
          _id: { $ne: targetUserId }
        });
        if (duplicateUserName) {
          throw errorHandler(400, 'User already exists');
        }
      }

      if (updates.email) {
        const duplicateEmail = await adminRepository.findUsersCount({
          email: updates.email,
          _id: { $ne: targetUserId }
        });
        if (duplicateEmail) {
          throw errorHandler(400, 'User already exists');
        }
      }

      if (Object.prototype.hasOwnProperty.call(body, 'permissions')) {
        const normalizedPermissions = normalizePermissionOverrides(
          nextRole,
          body.permissions
        );
        const requestedPermissionCount = Object.values(body.permissions || {}).reduce(
          (count, actions) => count + (Array.isArray(actions) ? actions.length : 0),
          0
        );
        const normalizedPermissionCount = Object.values(
          normalizedPermissions || {}
        ).reduce((count, actions) => count + actions.length, 0);

        if (requestedPermissionCount !== normalizedPermissionCount) {
          throw errorHandler(
            400,
            'Custom permissions must stay within the selected role template'
          );
        }

        updates.customPermissions = normalizedPermissions;
      } else if (body.role && body.role !== existingUser.role) {
        updates.customPermissions = null;
      }

      const updatedUser = await adminRepository.updateUser(targetUserId, updates);
      const effectivePermissions = resolvePermissionsForUser(updatedUser);
      const diff = diffObject(existingUser.toObject(), updatedUser.toObject(), [
        'userName',
        'email',
        'role',
        'isActive',
        'profilePicture',
        'customPermissions'
      ]);

      if (Object.keys(diff).length) {
        await logAudit({
          actorId: actor.id,
          actorRole: actor.role,
          entityType: 'user',
          entityId: updatedUser._id,
          action: 'UPDATE',
          before: diff,
          after: {
            role: updatedUser.role,
            isActive: updatedUser.isActive,
            customPermissions:
              updatedUser.customPermissions ||
              clonePermissionsForRole(updatedUser.role)
          },
          ipAddress: getClientIp(req)
        });
      }

      return {
        message: `${updatedUser.role} updated successfully`,
        user: {
          id: updatedUser._id,
          userName: updatedUser.userName,
          email: updatedUser.email,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          profilePicture: updatedUser.profilePicture,
          customPermissions: updatedUser.customPermissions,
          effectivePermissions
        },
        permissionMode: updatedUser.customPermissions ? 'custom' : 'roleTemplate'
      };
    }
  );
};

export default {
  createPrivilegedUser,
  updatePrivilegedUser
};
