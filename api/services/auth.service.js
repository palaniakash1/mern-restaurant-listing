import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

import config, { isProduction } from '../config.js';
import jwtRotationService from './jwtRotation.service.js';
import {
  createRefreshToken,
  revokeActiveRefreshTokenByHash,
  saveUser
} from '../repositories/auth.repository.js';
import { getClientIp } from '../utils/controllerHelpers.js';

export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;

export const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
export const REFRESH_COOKIE_NAME = 'refresh_token';
export const ACCOUNT_LOCKED_MESSAGE =
  'Account temporarily locked due to repeated failed login attempts';
// Precomputed bcrypt hash for the string "password" to keep signin timing consistent.
export const DUMMY_PASSWORD_HASH =
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8s7Qw6vY.fQ0M9f8Q5lHppZArYrusW';

export const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction
});

export const buildCsrfCookieOptions = () => ({
  httpOnly: false,
  sameSite: 'lax',
  secure: isProduction,
  maxAge: config.csrf.ttlMs
});

export const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getRefreshTtlMs = () =>
  toPositiveInt(
    process.env.REFRESH_TOKEN_TTL_DAYS,
    config.refreshTokenTtlDays
  ) *
  24 *
  60 *
  60 *
  1000;

export const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  maxAge: getRefreshTtlMs()
});

export const issueCsrfToken = () => crypto.randomBytes(32).toString('hex');
export const issueRefreshTokenValue = () =>
  crypto.randomBytes(48).toString('base64url');
export const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');
export const getUserAgent = (req) =>
  String(req.headers['user-agent'] || 'unknown').slice(0, 250);

export const getLockoutConfig = () => ({
  threshold: toPositiveInt(
    process.env.LOGIN_LOCKOUT_THRESHOLD,
    config.loginLockout.threshold
  ),
  baseMs: toPositiveInt(
    process.env.LOGIN_LOCKOUT_BASE_MS,
    config.loginLockout.baseMs
  ),
  maxMs: toPositiveInt(
    process.env.LOGIN_LOCKOUT_MAX_MS,
    config.loginLockout.maxMs
  )
});

export const getActiveLockoutUntil = (user) => {
  const lockoutUntil = user?.security?.lockoutUntil;
  if (!(lockoutUntil instanceof Date) || Number.isNaN(lockoutUntil.getTime())) {
    return null;
  }

  return lockoutUntil > new Date() ? lockoutUntil : null;
};

export const resetSigninSecurityState = async (user) => {
  user.security = {
    ...user.security,
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lockoutCount: 0,
    lastFailedLoginAt: null
  };
  await saveUser(user);
};

export const recordFailedSigninAttempt = async (user) => {
  const lockoutConfig = getLockoutConfig();
  const nextAttemptCount = (user.security?.failedLoginAttempts || 0) + 1;
  const nextLockoutCount = user.security?.lockoutCount || 0;
  const now = new Date();
  const shouldLock = nextAttemptCount >= lockoutConfig.threshold;

  user.security = {
    ...user.security,
    failedLoginAttempts: shouldLock ? 0 : nextAttemptCount,
    lockoutUntil: shouldLock
      ? new Date(
        now.getTime() +
            Math.min(
              lockoutConfig.baseMs * 2 ** nextLockoutCount,
              lockoutConfig.maxMs
            )
      )
      : null,
    lockoutCount: shouldLock ? nextLockoutCount + 1 : nextLockoutCount,
    lastFailedLoginAt: now
  };

  await saveUser(user);

  return {
    locked: shouldLock,
    attemptsRemaining: Math.max(lockoutConfig.threshold - nextAttemptCount, 0),
    lockoutUntil: shouldLock ? user.security.lockoutUntil : null
  };
};

export const signAccessToken = (user) =>
  jwtRotationService.signToken(
    {
      id: user._id,
      role: user.role
    },
    {
      expiresIn: config.jwtExpire,
      fallbackSecret: config.jwtSecret
    }
  );

export const hashPassword = (password) => bcryptjs.hashSync(password, 10);
export const comparePassword = (value, hash) =>
  bcryptjs.compareSync(value, hash);

export const storeRefreshToken = async ({
  userId,
  tokenValue,
  familyId,
  ipAddress,
  userAgent
}) => {
  const tokenHash = hashRefreshToken(tokenValue);
  const expiresAt = new Date(Date.now() + getRefreshTtlMs());
  await createRefreshToken({
    userId,
    tokenHash,
    familyId,
    expiresAt,
    createdByIp: ipAddress || null,
    userAgent: userAgent || null
  });
  return tokenHash;
};

export const issueSession = async ({ req, res, user, familyId = null }) => {
  const token = signAccessToken(user);
  const csrfToken = issueCsrfToken();
  const refreshTokenValue = issueRefreshTokenValue();
  const tokenFamilyId = familyId || crypto.randomUUID();
  await storeRefreshToken({
    userId: user._id,
    tokenValue: refreshTokenValue,
    familyId: tokenFamilyId,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req)
  });
  res
    .cookie('access_token', token, buildCookieOptions())
    .cookie('csrf_token', csrfToken, buildCsrfCookieOptions())
    .cookie(
      REFRESH_COOKIE_NAME,
      refreshTokenValue,
      buildRefreshCookieOptions()
    );
  return { csrfToken };
};

export const revokeRefreshTokenFromRequest = async (
  req,
  reason = 'signout'
) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    return;
  }

  await revokeActiveRefreshTokenByHash(hashRefreshToken(refreshToken), reason);
};

export const toSessionView = (tokenDoc, currentTokenHash = null) => ({
  id: tokenDoc._id,
  familyId: tokenDoc.familyId,
  isCurrent: Boolean(
    currentTokenHash && tokenDoc.tokenHash === currentTokenHash
  ),
  createdAt: tokenDoc.createdAt,
  lastUsedAt: tokenDoc.lastUsedAt,
  expiresAt: tokenDoc.expiresAt,
  createdByIp: tokenDoc.createdByIp || null,
  userAgent: tokenDoc.userAgent || null,
  revokedAt: tokenDoc.revokedAt,
  revokedReason: tokenDoc.revokedReason || null
});

export default {
  PASSWORD_REGEX,
  INVALID_CREDENTIALS_MESSAGE,
  REFRESH_COOKIE_NAME,
  ACCOUNT_LOCKED_MESSAGE,
  DUMMY_PASSWORD_HASH,
  buildCookieOptions,
  buildCsrfCookieOptions,
  buildRefreshCookieOptions,
  toPositiveInt,
  getRefreshTtlMs,
  issueCsrfToken,
  issueRefreshTokenValue,
  hashRefreshToken,
  getUserAgent,
  getLockoutConfig,
  getActiveLockoutUntil,
  resetSigninSecurityState,
  recordFailedSigninAttempt,
  signAccessToken,
  hashPassword,
  comparePassword,
  storeRefreshToken,
  issueSession,
  revokeRefreshTokenFromRequest,
  toSessionView
};
