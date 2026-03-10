import {
  findUserById,
  findUserRefreshTokenById,
  listUserRefreshTokens,
  revokeUserRefreshTokens
} from '../repositories/auth.repository.js';
import { hashRefreshToken, REFRESH_COOKIE_NAME, toSessionView } from './auth.service.js';

export const listSessionsForUser = async ({ userId, refreshToken }) => {
  const currentTokenHash = refreshToken ? hashRefreshToken(refreshToken) : null;
  const sessions = await listUserRefreshTokens(
    userId,
    '_id familyId createdAt lastUsedAt expiresAt createdByIp userAgent revokedAt revokedReason tokenHash'
  );

  return sessions.map((session) => toSessionView(session, currentTokenHash));
};

export const revokeSessionForUser = async ({ sessionId, userId, reason }) => {
  const session = await findUserRefreshTokenById(sessionId, userId);
  if (!session) {
    return { status: 'not_found' };
  }

  if (session.revokedAt) {
    return { status: 'already_revoked' };
  }

  session.revokedAt = new Date();
  session.revokedReason = reason;
  await saveUserSession(session);

  return { status: 'revoked', session };
};

export const revokeAllSessionsForUser = async ({
  userId,
  refreshToken,
  reason
}) => {
  const currentTokenHash = refreshToken ? hashRefreshToken(refreshToken) : null;
  const filter = {
    userId,
    revokedAt: null,
    ...(currentTokenHash ? { tokenHash: { $ne: currentTokenHash } } : {})
  };

  const result = await revokeUserRefreshTokens(filter, reason);
  return { revokedCount: result.modifiedCount || 0 };
};

export const listSessionsForAdminTarget = async ({ userId }) => {
  const targetUser = await findUserById(userId, '_id');
  if (!targetUser) {
    return { status: 'not_found' };
  }

  const sessions = await listUserRefreshTokens(
    userId,
    '_id familyId createdAt lastUsedAt expiresAt createdByIp userAgent revokedAt revokedReason'
  );

  return {
    status: 'ok',
    sessions: sessions.map((session) => toSessionView(session))
  };
};

export const revokeAllSessionsForAdminTarget = async ({ userId, reason }) => {
  const targetUser = await findUserById(userId, '_id');
  if (!targetUser) {
    return { status: 'not_found' };
  }

  const result = await revokeUserRefreshTokens({ userId, revokedAt: null }, reason);
  return { status: 'ok', revokedCount: result.modifiedCount || 0 };
};

const saveUserSession = async (session) => {
  await session.save();
  return session;
};

export const getRefreshTokenFromRequest = (req) => req.cookies?.[REFRESH_COOKIE_NAME] || null;

export default {
  getRefreshTokenFromRequest,
  listSessionsForAdminTarget,
  listSessionsForUser,
  revokeAllSessionsForAdminTarget,
  revokeAllSessionsForUser,
  revokeSessionForUser
};
