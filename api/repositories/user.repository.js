import User from '../models/user.model.js';
import { traceDatabaseOperation } from '../tracing.js';

export const findUserById = (userId, select = null) => {
  return traceDatabaseOperation('findUserById', async () => {
    const query = User.findById(userId);
    return select ? query.select(select) : query;
  });
};

export const findUserByEmail = (email) => {
  return traceDatabaseOperation('findUserByEmail', async () => {
    return User.findOne({ email });
  });
};

export const findUserByEmailWithPassword = (email) => {
  return traceDatabaseOperation('findUserByEmailWithPassword', async () => {
    return User.findOne({ email }).select('+password');
  });
};

export const findUserByUserName = (userName) => {
  return traceDatabaseOperation('findUserByUserName', async () => {
    return User.findOne({ userName });
  });
};

export const findUsers = (filter = {}, options = {}) => {
  return traceDatabaseOperation('findUsers', async () => {
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
  return traceDatabaseOperation('findUsersCount', async () => {
    return User.countDocuments(filter);
  });
};

export const createUser = async (payload) => {
  return traceDatabaseOperation('createUser', async () => {
    const user = new User(payload);
    await user.save();
    return user;
  });
};

export const updateUser = async (userId, updateData) => {
  return traceDatabaseOperation('updateUser', async () => {
    return User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true
    });
  });
};

export const deleteUser = async (userId) => {
  return traceDatabaseOperation('deleteUser', async () => {
    return User.findByIdAndDelete(userId);
  });
};

export const updateUserRole = async (userId, role) => {
  return traceDatabaseOperation('updateUserRole', async () => {
    return User.findByIdAndUpdate(userId, { role }, { new: true });
  });
};

export const updateUserStatus = async (userId, isActive) => {
  return traceDatabaseOperation('updateUserStatus', async () => {
    return User.findByIdAndUpdate(userId, { isActive }, { new: true });
  });
};

export const findUsersByRole = (role, options = {}) => {
  return traceDatabaseOperation('findUsersByRole', async () => {
    return findUsers({ role }, options);
  });
};

export const findAdminUsers = (options = {}) => {
  return traceDatabaseOperation('findAdminUsers', async () => {
    return findUsers(
      {
        role: { $in: ['admin', 'superAdmin', 'storeManager'] }
      },
      options
    );
  });
};

export const findActiveUsers = (options = {}) => {
  return traceDatabaseOperation('findActiveUsers', async () => {
    return findUsers({ isActive: true }, options);
  });
};

export const findInactiveUsers = (options = {}) => {
  return traceDatabaseOperation('findInactiveUsers', async () => {
    return findUsers({ isActive: false }, options);
  });
};

export const bulkUpdateUsers = async (filter, updateData) => {
  return traceDatabaseOperation('bulkUpdateUsers', async () => {
    return User.updateMany(filter, updateData);
  });
};

export const bulkDeleteUsers = async (filter) => {
  return traceDatabaseOperation('bulkDeleteUsers', async () => {
    return User.deleteMany(filter);
  });
};

export const getUserStats = async () => {
  return traceDatabaseOperation('getUserStats', async () => {
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
        $group: {
          _id: null,
          totalUsers: { $first: '$totalUsers' },
          activeUsers: { $first: '$activeUsers' },
          inactiveUsers: { $first: '$inactiveUsers' },
          activePercentage: {
            $multiply: [{ $divide: ['$activeUsers', '$totalUsers'] }, 100]
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
  return traceDatabaseOperation('getUserRolesStats', async () => {
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

export default {
  findUserById,
  findUserByEmail,
  findUserByEmailWithPassword,
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
  getUserRolesStats
};
