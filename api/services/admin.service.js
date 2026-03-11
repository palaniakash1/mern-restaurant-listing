import bcryptjs from 'bcryptjs';

import adminRepository from '../repositories/admin.repository.js';
import { errorHandler } from '../utils/error.js';
import { getClientIp } from '../utils/controllerHelpers.js';
import { logAudit } from '../utils/auditLogger.js';
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

      const { userName, email, password, role } = body;

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
        createdByAdminId: role === 'admin' ? actor.id : null
      });

      await logAudit({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: 'user',
        entityId: newUser._id,
        action: 'CREATE',
        before: null,
        after: {
          role: newUser.role,
          email: newUser.email
        },
        ipAddress: getClientIp(req)
      });

      return {
        message: `${role} created successfully`,
        user: {
          id: newUser._id,
          userName: newUser.userName,
          email: newUser.email,
          role: newUser.role
        }
      };
    }
  );
};

export default {
  createPrivilegedUser
};
