import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';

export const findUserByUserName = (userName) =>
  User.findOne({ userName });

export const findUserByEmail = (email) =>
  User.findOne({ email });

export const findUserByEmailWithPassword = (email) =>
  User.findOne({ email }).select('+password');

export const createUser = async (payload) => {
  const user = new User(payload);
  await user.save();
  return user;
};

export const findUserById = (userId, select = null) => {
  const query = User.findById(userId);
  return select ? query.select(select) : query;
};

export const saveUser = (user) => user.save();

export const createRefreshToken = (payload) =>
  RefreshToken.create(payload);

export const findRefreshTokenByHash = (tokenHash) =>
  RefreshToken.findOne({ tokenHash });

export const revokeActiveRefreshTokenByHash = (tokenHash, reason) =>
  RefreshToken.updateOne(
    {
      tokenHash,
      revokedAt: null
    },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: reason
      }
    }
  );

export const revokeRefreshFamily = (familyId, reason) =>
  RefreshToken.updateMany(
    { familyId, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: reason
      }
    }
  );

export const listUserRefreshTokens = (userId, select) =>
  RefreshToken.find({ userId })
    .sort({ createdAt: -1 })
    .select(select)
    .lean();

export const findUserRefreshTokenById = (sessionId, userId) =>
  RefreshToken.findOne({
    _id: sessionId,
    userId
  });

export const revokeUserRefreshTokens = (filter, reason) =>
  RefreshToken.updateMany(filter, {
    $set: {
      revokedAt: new Date(),
      revokedReason: reason
    }
  });

export default {
  findUserByUserName,
  findUserByEmail,
  findUserByEmailWithPassword,
  createUser,
  findUserById,
  saveUser,
  createRefreshToken,
  findRefreshTokenByHash,
  revokeActiveRefreshTokenByHash,
  revokeRefreshFamily,
  listUserRefreshTokens,
  findUserRefreshTokenById,
  revokeUserRefreshTokens
};
