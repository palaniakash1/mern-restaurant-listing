import userRepository from '../repositories/user.repository.js';
import { traceAuthOperation } from '../tracing.js';

export const getUserById = async (userId) => {
  return traceAuthOperation('getUserById', userId, { userId });
};

export const getUserByEmail = async (email) => {
  return traceAuthOperation('getUserByEmail', null, { email });
};

export const getUserByUserName = async (userName) => {
  return traceAuthOperation('getUserByUserName', null, { userName });
};

export const getUsers = async (filter = {}, options = {}) => {
  return traceAuthOperation('getUsers', null, { filter, options });
};

export const getUserCount = async (filter = {}) => {
  return traceAuthOperation('getUserCount', null, { filter });
};

export const createUser = async (userData) => {
  return traceAuthOperation('createUser', null, { userData });
};

export const updateUserService = async (userId, updateData) => {
  return traceAuthOperation('updateUser', userId, { updateData });
};

export const deleteUserService = async (userId) => {
  return traceAuthOperation('deleteUser', userId);
};

export const updateUserRoleService = async (userId, role) => {
  return traceAuthOperation('updateUserRole', userId, { role });
};

export const updateUserStatusService = async (userId, isActive) => {
  return traceAuthOperation('updateUserStatus', userId, { isActive });
};

export const getUsersByRoleService = async (role, options = {}) => {
  return traceAuthOperation('getUsersByRole', null, { role, options });
};

export const getAdminUsersService = async (options = {}) => {
  return traceAuthOperation('getAdminUsers', null, { options });
};

export const getActiveUsersService = async (options = {}) => {
  return traceAuthOperation('getActiveUsers', null, { options });
};

export const getInactiveUsersService = async (options = {}) => {
  return traceAuthOperation('getInactiveUsers', null, { options });
};

export const bulkUpdateUsersService = async (filter, updateData) => {
  return traceAuthOperation('bulkUpdateUsers', null, { filter, updateData });
};

export const bulkDeleteUsersService = async (filter) => {
  return traceAuthOperation('bulkDeleteUsers', null, { filter });
};

export const getUserStats = async () => {
  return traceAuthOperation('getUserStats', null);
};

export const getUserRolesStats = async () => {
  return traceAuthOperation('getUserRolesStats', null);
};

// Service methods that actually use the repository
export const findUserById = async (userId, select = null) => {
  return userRepository.findUserById(userId, select);
};

export const findUserByEmail = async (email) => {
  return userRepository.findUserByEmail(email);
};

export const findUserByUserName = async (userName) => {
  return userRepository.findUserByUserName(userName);
};

export const findUsers = async (filter = {}, options = {}) => {
  return userRepository.findUsers(filter, options);
};

export const findUsersCount = async (filter = {}) => {
  return userRepository.findUsersCount(filter);
};

export const createUserService = async (payload) => {
  return userRepository.createUser(payload);
};

export const updateUser = async (userId, updateData) => {
  return userRepository.updateUser(userId, updateData);
};

export const deleteUser = async (userId) => {
  return userRepository.deleteUser(userId);
};

export const updateUserRole = async (userId, role) => {
  return userRepository.updateUserRole(userId, role);
};

export const updateUserStatus = async (userId, isActive) => {
  return userRepository.updateUserStatus(userId, isActive);
};

export const findUsersByRole = async (role, options = {}) => {
  return userRepository.findUsersByRole(role, options);
};

export const findAdminUsers = async (options = {}) => {
  return userRepository.findAdminUsers(options);
};

export const findActiveUsers = async (options = {}) => {
  return userRepository.findActiveUsers(options);
};

export const findInactiveUsers = async (options = {}) => {
  return userRepository.findInactiveUsers(options);
};

export const bulkUpdateUsers = async (filter, updateData) => {
  return userRepository.bulkUpdateUsers(filter, updateData);
};

export const bulkDeleteUsers = async (filter) => {
  return userRepository.bulkDeleteUsers(filter);
};

export const getUserStatsData = async () => {
  return userRepository.getUserStats();
};

export const getUserRolesStatsData = async () => {
  return userRepository.getUserRolesStats();
};

export default {
  // Repository methods
  findUserById,
  findUserByEmail,
  findUserByUserName,
  findUsers,
  findUsersCount,
  createUserService,
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
  getUserStatsData,
  getUserRolesStatsData,

  // Traced service methods (for future use with business logic)
  getUserById,
  getUserByEmail,
  getUserByUserName,
  getUsers,
  getUserCount,
  createUser,
  updateUserService,
  deleteUserService,
  updateUserRoleService,
  updateUserStatusService,
  getUsersByRoleService,
  getAdminUsersService,
  getActiveUsersService,
  getInactiveUsersService,
  bulkUpdateUsersService,
  bulkDeleteUsersService,
  getUserStats,
  getUserRolesStats
};
