import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import { traceDatabaseOperation } from '../tracing.js';

export const findUserById = (userId, select = null) => {
  return traceDatabaseOperation('adminFindUserById', async () => {
    const query = User.findById(userId);
    return select ? query.select(select) : query;
  });
};

export const findUserByEmail = (email) => {
  return traceDatabaseOperation('adminFindUserByEmail', async () => {
    return User.findOne({ email });
  });
};

export const findUserByUserName = (userName) => {
  return traceDatabaseOperation('adminFindUserByUserName', async () => {
    return User.findOne({ userName });
  });
};

export const findUsers = (filter = {}, options = {}) => {
  return traceDatabaseOperation('adminFindUsers', async () => {
    const { limit = 10, skip = 0, sort = { createdAt: -1 }, select } = options;

    let query = User.find(filter);

    if (select) {
      query = query.select(select);
    }

    query = query.sort(sort).skip(skip).limit(limit);

    return query.lean();
  });
};

export const findUsersCount = (filter = {}) => {
  return traceDatabaseOperation('adminFindUsersCount', async () => {
    return User.countDocuments(filter);
  });
};

export const createUser = async (payload) => {
  return traceDatabaseOperation('adminCreateUser', async () => {
    const user = new User(payload);
    await user.save();
    return user;
  });
};

export const updateUser = async (userId, updateData) => {
  return traceDatabaseOperation('adminUpdateUser', async () => {
    return User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true
    });
  });
};

export const deleteUser = async (userId) => {
  return traceDatabaseOperation('adminDeleteUser', async () => {
    return User.findByIdAndDelete(userId);
  });
};

export const updateUserRole = async (userId, role) => {
  return traceDatabaseOperation('adminUpdateUserRole', async () => {
    return User.findByIdAndUpdate(userId, { role }, { new: true });
  });
};

export const updateUserStatus = async (userId, isActive) => {
  return traceDatabaseOperation('adminUpdateUserStatus', async () => {
    return User.findByIdAndUpdate(userId, { isActive }, { new: true });
  });
};

export const findUsersByRole = (role, options = {}) => {
  return traceDatabaseOperation('adminFindUsersByRole', async () => {
    return findUsers({ role }, options);
  });
};

export const findAdminUsers = (options = {}) => {
  return traceDatabaseOperation('adminFindAdminUsers', async () => {
    return findUsers(
      {
        role: { $in: ['admin', 'superAdmin', 'storeManager'] }
      },
      options
    );
  });
};

export const findActiveUsers = (options = {}) => {
  return traceDatabaseOperation('adminFindActiveUsers', async () => {
    return findUsers({ isActive: true }, options);
  });
};

export const findInactiveUsers = (options = {}) => {
  return traceDatabaseOperation('adminFindInactiveUsers', async () => {
    return findUsers({ isActive: false }, options);
  });
};

export const bulkUpdateUsers = async (filter, updateData) => {
  return traceDatabaseOperation('adminBulkUpdateUsers', async () => {
    return User.updateMany(filter, updateData);
  });
};

export const bulkDeleteUsers = async (filter) => {
  return traceDatabaseOperation('adminBulkDeleteUsers', async () => {
    return User.deleteMany(filter);
  });
};

export const getUserStats = async () => {
  return traceDatabaseOperation('adminGetUserStats', async () => {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalUsers: 1,
          activeUsers: 1,
          inactiveUsers: 1,
          activePercentage: {
            $cond: [
              { $gt: ['$totalUsers', 0] },
              { $multiply: [{ $divide: ['$activeUsers', '$totalUsers'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    return stats.length > 0
      ? stats[0]
      : {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        activePercentage: 0
      };
  });
};

export const getUserRolesStats = async () => {
  return traceDatabaseOperation('adminGetUserRolesStats', async () => {
    return User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
  });
};

// Admin-specific operations
export const findUsersWithSecurityInfo = (filter = {}, options = {}) => {
  return traceDatabaseOperation('adminFindUsersWithSecurityInfo', async () => {
    const { limit = 10, skip = 0, sort = { createdAt: -1 } } = options;

    return User.find(filter)
      .select('+security +password')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  });
};

export const findUsersWithSessions = (userId) => {
  return traceDatabaseOperation('adminFindUsersWithSessions', async () => {
    return RefreshToken.find({ userId }).sort({ createdAt: -1 }).lean();
  });
};

export const revokeAllUserSessions = (userId, reason = 'admin_revoke_all') => {
  return traceDatabaseOperation('adminRevokeAllUserSessions', async () => {
    return RefreshToken.updateMany(
      { userId, revokedAt: null },
      {
        $set: {
          revokedAt: new Date(),
          revokedReason: reason
        }
      }
    );
  });
};

export const revokeUserSession = (
  sessionId,
  userId,
  reason = 'admin_revoke'
) => {
  return traceDatabaseOperation('adminRevokeUserSession', async () => {
    return RefreshToken.updateOne(
      { _id: sessionId, userId, revokedAt: null },
      {
        $set: {
          revokedAt: new Date(),
          revokedReason: reason
        }
      }
    );
  });
};

export const findUsersByLastLogin = (daysAgo, options = {}) => {
  return traceDatabaseOperation('adminFindUsersByLastLogin', async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    return findUsers({ lastLoginAt: { $lt: cutoffDate } }, options);
  });
};

export const findUsersByRegistrationDate = (
  startDate,
  endDate,
  options = {}
) => {
  return traceDatabaseOperation(
    'adminFindUsersByRegistrationDate',
    async () => {
      return findUsers(
        {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        },
        options
      );
    }
  );
};

export const findUsersWithFailedLogins = (threshold = 3, options = {}) => {
  return traceDatabaseOperation('adminFindUsersWithFailedLogins', async () => {
    return findUsers(
      {
        'security.failedLoginAttempts': { $gte: threshold }
      },
      options
    );
  });
};

export const findLockedUsers = (options = {}) => {
  return traceDatabaseOperation('adminFindLockedUsers', async () => {
    return findUsers(
      {
        $and: [
          { 'security.lockoutUntil': { $exists: true, $ne: null } },
          { 'security.lockoutUntil': { $gt: new Date() } }
        ]
      },
      options
    );
  });
};

export const resetUserSecurityState = async (userId) => {
  return traceDatabaseOperation('adminResetUserSecurityState', async () => {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'security.failedLoginAttempts': 0,
          'security.lockoutUntil': null,
          'security.lockoutCount': 0,
          'security.lastFailedLoginAt': null
        }
      },
      { new: true }
    );
  });
};

export const getUserSessionStats = async (userId) => {
  return traceDatabaseOperation('adminGetUserSessionStats', async () => {
    const [totalSessions, activeSessions, revokedSessions] = await Promise.all([
      RefreshToken.countDocuments({ userId }),
      RefreshToken.countDocuments({
        userId,
        revokedAt: null,
        expiresAt: { $gt: new Date() }
      }),
      RefreshToken.countDocuments({ userId, revokedAt: { $ne: null } })
    ]);

    return {
      userId,
      totalSessions,
      activeSessions,
      revokedSessions,
      activePercentage:
        totalSessions > 0 ? (activeSessions / totalSessions) * 100 : 0
    };
  });
};

export default {
  findUserById,
  findUserByEmail,
  findUserByUserName,
  findUsers,
  findUsersCount,
  createUser,
  updateUser,
  deleteUser,
  updateUserRole,
  updateUserStatus,
  findUsersByRole,
  findAdminUsers,
  findActiveUsers,
  findInactiveUsers,
  bulkUpdateUsers,
  bulkDeleteUsers,
  getUserStats,
  getUserRolesStats,
  // Admin-specific methods
  findUsersWithSecurityInfo,
  findUsersWithSessions,
  revokeAllUserSessions,
  revokeUserSession,
  findUsersByLastLogin,
  findUsersByRegistrationDate,
  findUsersWithFailedLogins,
  findLockedUsers,
  resetUserSecurityState,
  getUserSessionStats
};
