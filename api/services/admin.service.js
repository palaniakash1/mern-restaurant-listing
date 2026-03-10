import adminRepository from '../repositories/admin.repository.js';
import { traceAuthOperation } from '../tracing.js';

// Admin-specific service methods
export const findUserById = async (userId, select = null) => {
  return adminRepository.findUserById(userId, select);
};

export const findUserByEmail = async (email) => {
  return adminRepository.findUserByEmail(email);
};

export const findUserByUserName = async (userName) => {
  return adminRepository.findUserByUserName(userName);
};

export const findUsers = async (filter = {}, options = {}) => {
  return adminRepository.findUsers(filter, options);
};

export const findUsersCount = async (filter = {}) => {
  return adminRepository.findUsersCount(filter);
};

export const createUser = async (payload) => {
  return adminRepository.createUser(payload);
};

export const updateUser = async (userId, updateData) => {
  return adminRepository.updateUser(userId, updateData);
};

export const deleteUser = async (userId) => {
  return adminRepository.deleteUser(userId);
};

export const updateUserRole = async (userId, role) => {
  return adminRepository.updateUserRole(userId, role);
};

export const updateUserStatus = async (userId, isActive) => {
  return adminRepository.updateUserStatus(userId, isActive);
};

export const findUsersByRole = async (role, options = {}) => {
  return adminRepository.findUsersByRole(role, options);
};

export const findAdminUsers = async (options = {}) => {
  return adminRepository.findAdminUsers(options);
};

export const findActiveUsers = async (options = {}) => {
  return adminRepository.findActiveUsers(options);
};

export const findInactiveUsers = async (options = {}) => {
  return adminRepository.findInactiveUsers(options);
};

export const bulkUpdateUsers = async (filter, updateData) => {
  return adminRepository.bulkUpdateUsers(filter, updateData);
};

export const bulkDeleteUsers = async (filter) => {
  return adminRepository.bulkDeleteUsers(filter);
};

export const getUserStats = async () => {
  return adminRepository.getUserStats();
};

export const getUserRolesStats = async () => {
  return adminRepository.getUserRolesStats();
};

// Admin-specific operations
export const findUsersWithSecurityInfo = async (filter = {}, options = {}) => {
  return adminRepository.findUsersWithSecurityInfo(filter, options);
};

export const findUsersWithSessions = async (userId) => {
  return adminRepository.findUsersWithSessions(userId);
};

export const revokeAllUserSessions = async (userId, reason = 'admin_revoke_all') => {
  return adminRepository.revokeAllUserSessions(userId, reason);
};

export const revokeUserSession = async (sessionId, userId, reason = 'admin_revoke') => {
  return adminRepository.revokeUserSession(sessionId, userId, reason);
};

export const findUsersByLastLogin = async (daysAgo, options = {}) => {
  return adminRepository.findUsersByLastLogin(daysAgo, options);
};

export const findUsersByRegistrationDate = async (startDate, endDate, options = {}) => {
  return adminRepository.findUsersByRegistrationDate(startDate, endDate, options);
};

export const findUsersWithFailedLogins = async (threshold = 3, options = {}) => {
  return adminRepository.findUsersWithFailedLogins(threshold, options);
};

export const findLockedUsers = async (options = {}) => {
  return adminRepository.findLockedUsers(options);
};

export const resetUserSecurityState = async (userId) => {
  return adminRepository.resetUserSecurityState(userId);
};

export const getUserSessionStats = async (userId) => {
  return adminRepository.getUserSessionStats(userId);
};

// Traced service methods for admin operations
export const adminGetUserById = async (userId, select = null) => {
  return traceAuthOperation('adminGetUserById', userId, { userId, select });
};

export const adminGetUsers = async (filter = {}, options = {}) => {
  return traceAuthOperation('adminGetUsers', null, { filter, options });
};

export const adminCreateUser = async (userData) => {
  return traceAuthOperation('adminCreateUser', null, { userData });
};

export const adminUpdateUser = async (userId, updateData) => {
  return traceAuthOperation('adminUpdateUser', userId, { updateData });
};

export const adminDeleteUser = async (userId) => {
  return traceAuthOperation('adminDeleteUser', userId);
};

export const adminUpdateUserRole = async (userId, role) => {
  return traceAuthOperation('adminUpdateUserRole', userId, { role });
};

export const adminUpdateUserStatus = async (userId, isActive) => {
  return traceAuthOperation('adminUpdateUserStatus', userId, { isActive });
};

export const adminGetUserStats = async () => {
  return traceAuthOperation('adminGetUserStats', null);
};

export const adminGetUserRolesStats = async () => {
  return traceAuthOperation('adminGetUserRolesStats', null);
};

export const adminRevokeAllUserSessions = async (userId, reason) => {
  return traceAuthOperation('adminRevokeAllUserSessions', userId, { reason });
};

export const adminRevokeUserSession = async (sessionId, userId, reason) => {
  return traceAuthOperation('adminRevokeUserSession', userId, { sessionId, reason });
};

export const adminResetUserSecurityState = async (userId) => {
  return traceAuthOperation('adminResetUserSecurityState', userId);
};

export default {
  // Repository methods
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
  findUsersWithSecurityInfo,
  findUsersWithSessions,
  revokeAllUserSessions,
  revokeUserSession,
  findUsersByLastLogin,
  findUsersByRegistrationDate,
  findUsersWithFailedLogins,
  findLockedUsers,
  resetUserSecurityState,
  getUserSessionStats,

  // Traced service methods
  adminGetUserById,
  adminGetUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  adminGetUserStats,
  adminGetUserRolesStats,
  adminRevokeAllUserSessions,
  adminRevokeUserSession,
  adminResetUserSecurityState
};
