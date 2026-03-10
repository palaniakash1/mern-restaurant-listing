import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logAudit } from '../utils/auditLogger.js';
import { getClientIp, isValidObjectId } from '../utils/controllerHelpers.js';
import RefreshToken from '../models/refreshToken.model.js';
import { incrementSecurityEvent } from '../utils/securityTelemetry.js';
import config, { isProduction } from '../config.js';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const REFRESH_COOKIE_NAME = 'refresh_token';
const ACCOUNT_LOCKED_MESSAGE =
  'Account temporarily locked due to repeated failed login attempts';
// Precomputed bcrypt hash for the string "password" to keep signin timing consistent.
const DUMMY_PASSWORD_HASH =
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8s7Qw6vY.fQ0M9f8Q5lHppZArYrusW';

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction
});

const buildCsrfCookieOptions = () => ({
  httpOnly: false,
  sameSite: 'lax',
  secure: isProduction
});

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const getRefreshTtlMs = () =>
  toPositiveInt(process.env.REFRESH_TOKEN_TTL_DAYS, config.refreshTokenTtlDays) *
  24 *
  60 *
  60 *
  1000;

const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  maxAge: getRefreshTtlMs()
});

const issueCsrfToken = () => crypto.randomBytes(32).toString('hex');
const issueRefreshTokenValue = () => crypto.randomBytes(48).toString('base64url');
const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');
const getUserAgent = (req) =>
  String(req.headers['user-agent'] || 'unknown').slice(0, 250);
const getLockoutConfig = () => ({
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
const getActiveLockoutUntil = (user) => {
  const lockoutUntil = user?.security?.lockoutUntil;
  if (!(lockoutUntil instanceof Date) || Number.isNaN(lockoutUntil.getTime())) {
    return null;
  }

  return lockoutUntil > new Date() ? lockoutUntil : null;
};
const resetSigninSecurityState = async (user) => {
  user.security = {
    ...user.security,
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lockoutCount: 0,
    lastFailedLoginAt: null
  };
  await user.save();
};
const recordFailedSigninAttempt = async (user) => {
  const config = getLockoutConfig();
  const nextAttemptCount = (user.security?.failedLoginAttempts || 0) + 1;
  const nextLockoutCount = user.security?.lockoutCount || 0;
  const now = new Date();
  const shouldLock = nextAttemptCount >= config.threshold;

  user.security = {
    ...user.security,
    failedLoginAttempts: shouldLock ? 0 : nextAttemptCount,
    lockoutUntil: shouldLock
      ? new Date(
        now.getTime() +
            Math.min(config.baseMs * 2 ** nextLockoutCount, config.maxMs)
      )
      : null,
    lockoutCount: shouldLock ? nextLockoutCount + 1 : nextLockoutCount,
    lastFailedLoginAt: now
  };

  await user.save();

  return {
    locked: shouldLock,
    attemptsRemaining: Math.max(config.threshold - nextAttemptCount, 0),
    lockoutUntil: shouldLock ? user.security.lockoutUntil : null
  };
};

const signAccessToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpire }
  );

const storeRefreshToken = async ({
  userId,
  tokenValue,
  familyId,
  ipAddress,
  userAgent
}) => {
  const tokenHash = hashRefreshToken(tokenValue);
  const expiresAt = new Date(Date.now() + getRefreshTtlMs());
  await RefreshToken.create({
    userId,
    tokenHash,
    familyId,
    expiresAt,
    createdByIp: ipAddress || null,
    userAgent: userAgent || null
  });
  return tokenHash;
};

const issueSession = async ({ req, res, user, familyId = null }) => {
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
    .cookie(REFRESH_COOKIE_NAME, refreshTokenValue, buildRefreshCookieOptions());
  return { csrfToken };
};

const revokeRefreshTokenFromRequest = async (req, reason = 'signout') => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    return;
  }
  const tokenHash = hashRefreshToken(refreshToken);
  await RefreshToken.updateOne(
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
};

const toSessionView = (tokenDoc, currentTokenHash = null) => ({
  id: tokenDoc._id,
  familyId: tokenDoc.familyId,
  isCurrent: Boolean(currentTokenHash && tokenDoc.tokenHash === currentTokenHash),
  createdAt: tokenDoc.createdAt,
  lastUsedAt: tokenDoc.lastUsedAt,
  expiresAt: tokenDoc.expiresAt,
  createdByIp: tokenDoc.createdByIp || null,
  userAgent: tokenDoc.userAgent || null,
  revokedAt: tokenDoc.revokedAt,
  revokedReason: tokenDoc.revokedReason || null
});

export const signup = async (req, res, next) => {
  try {
    const { userName, email, password } = req.body;

    if (!userName || userName.trim() === '') {
      return next(errorHandler(400, 'Please provide a valid username'));
    }
    if (userName.length < 3) {
      return next(
        errorHandler(400, 'Username must be at least 3 characters long')
      );
    }
    if (userName !== userName.toLowerCase()) {
      return next(errorHandler(400, 'UserName must be lowercase'));
    }

    if (!email || email.trim() === '') {
      return next(errorHandler(400, 'Please enter an email'));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(errorHandler(400, 'Please enter a valid email address'));
    }

    if (!password || password.trim() === '') {
      return next(errorHandler(400, 'Please enter a password'));
    }
    if (!PASSWORD_REGEX.test(password)) {
      return next(
        errorHandler(
          400,
          'Minimum 8 characters total. Must contain at least 1 capital letter (A-Z). Must contain at least 1 number (0-9).'
        )
      );
    }

    const normalizedUserName = userName.toLowerCase();
    const normalizedEmail = email.toLowerCase();

    const existingUserName = await User.findOne({
      userName: normalizedUserName
    });
    if (existingUserName) {
      return next(
        errorHandler(
          409,
          `Username '${normalizedUserName}' already exists, try login instead`
        )
      );
    }

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return next(
        errorHandler(
          409,
          `Email '${normalizedEmail}' already exists, try login instead`
        )
      );
    }

    const hashedPassword = bcryptjs.hashSync(password, 10);

    const newUser = new User({
      userName: normalizedUserName,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'user'
    });

    await newUser.save();

    await logAudit({
      actorId: newUser._id,
      actorRole: 'user',
      entityType: 'user',
      entityId: newUser._id,
      action: 'CREATE',
      before: null,
      after: {
        userName: newUser.userName,
        email: newUser.email,
        role: newUser.role
      },
      ipAddress: getClientIp(req)
    });

    res
      .status(201)
      .json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    next(error);
  }
};

export const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || email.trim() === '') {
      return next(errorHandler(400, 'Please enter an email'));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(errorHandler(400, 'Please enter a valid email address'));
    }

    if (!password || password.trim() === '') {
      return next(errorHandler(400, 'Please enter a password'));
    }

    const normalizedEmail = email.toLowerCase();

    const validUser = await User.findOne({ email: normalizedEmail }).select(
      '+password'
    );

    if (!validUser) {
      bcryptjs.compareSync(password, DUMMY_PASSWORD_HASH);
      await incrementSecurityEvent('login_failed');
      await logAudit({
        actorId: null,
        actorRole: 'anonymous',
        entityType: 'auth',
        entityId: null,
        action: 'LOGIN_FAILED',
        before: { email: normalizedEmail, reason: 'unknown_email' },
        after: null,
        ipAddress: getClientIp(req)
      });

      return next(errorHandler(401, INVALID_CREDENTIALS_MESSAGE));
    }

    if (!validUser.isActive) {
      await logAudit({
        actorId: validUser._id,
        actorRole: validUser.role,
        entityType: 'auth',
        entityId: validUser._id,
        action: 'LOGIN_FAILED',
        before: { email: validUser.email, reason: 'inactive_account' },
        after: null,
        ipAddress: getClientIp(req)
      });
      return next(errorHandler(403, 'User account is inactive'));
    }

    const activeLockoutUntil = getActiveLockoutUntil(validUser);
    if (activeLockoutUntil) {
      await incrementSecurityEvent('login_lockout_blocked');
      await logAudit({
        actorId: validUser._id,
        actorRole: validUser.role,
        entityType: 'auth',
        entityId: validUser._id,
        action: 'LOGIN_FAILED',
        before: {
          email: validUser.email,
          reason: 'account_locked',
          lockoutUntil: activeLockoutUntil.toISOString()
        },
        after: null,
        ipAddress: getClientIp(req)
      });
      return next(errorHandler(423, ACCOUNT_LOCKED_MESSAGE));
    }

    if (validUser.security?.lockoutUntil) {
      await resetSigninSecurityState(validUser);
    }

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) {
      await incrementSecurityEvent('login_failed');
      const failureResult = await recordFailedSigninAttempt(validUser);
      if (failureResult.locked) {
        await incrementSecurityEvent('login_lockout_started');
      }
      await logAudit({
        actorId: validUser._id,
        actorRole: validUser.role,
        entityType: 'auth',
        entityId: validUser._id,
        action: 'LOGIN_FAILED',
        before: {
          email: validUser.email,
          reason: failureResult.locked ? 'lockout_threshold_reached' : 'invalid_password',
          attemptsRemaining: failureResult.attemptsRemaining,
          lockoutUntil: failureResult.lockoutUntil?.toISOString() || null
        },
        after: null,
        ipAddress: getClientIp(req)
      });

      return next(
        errorHandler(
          failureResult.locked ? 423 : 401,
          failureResult.locked ? ACCOUNT_LOCKED_MESSAGE : INVALID_CREDENTIALS_MESSAGE
        )
      );
    }

    if (
      (validUser.security?.failedLoginAttempts || 0) > 0 ||
      validUser.security?.lockoutCount ||
      validUser.security?.lastFailedLoginAt
    ) {
      await resetSigninSecurityState(validUser);
    }

    const { csrfToken } = await issueSession({ req, res, user: validUser });
    const { password: pass, ...rest } = validUser._doc;

    await logAudit({
      actorId: validUser._id,
      actorRole: validUser.role,
      entityType: 'auth',
      entityId: validUser._id,
      action: 'LOGIN',
      before: null,
      after: {
        email: validUser.email
      },
      ipAddress: getClientIp(req)
    });

    res.status(200).json({ ...rest, csrfToken });
  } catch (error) {
    next(error);
  }
};

export const google = async (req, res, next) => {
  try {
    const { name, email, googlePhotoUrl } = req.body;

    if (!email) {
      return next(errorHandler(400, 'Email is required'));
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (!user.isActive) {
        return next(errorHandler(403, 'User account is inactive'));
      }
      const { csrfToken } = await issueSession({ req, res, user });
      const { password, ...rest } = user._doc;

      return res
        .status(200)
        .json({ ...rest, csrfToken });
    }

    const generatedPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8);
    const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);

    const newUser = new User({
      userName:
        (name || 'user').toLowerCase().split(' ').join('') +
        Math.random().toString(9).slice(-4),
      email: normalizedEmail,
      password: hashedPassword,
      profilePicture: googlePhotoUrl,
      role: 'user'
    });

    await newUser.save();

    const { csrfToken } = await issueSession({ req, res, user: newUser });
    const { password, ...rest } = newUser._doc;

    return res
      .status(200)
      .json({ ...rest, csrfToken });
  } catch (error) {
    next(error);
  }
};

export const signout = async (req, res, next) => {
  try {
    await revokeRefreshTokenFromRequest(req, 'signout');
    await incrementSecurityEvent('refresh_revoked');

    if (req.user) {
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: 'auth',
        entityId: req.user.id,
        action: 'LOGOUT',
        before: 'login',
        after: null,
        ipAddress: getClientIp(req)
      });
    }

    res
      .clearCookie('access_token', buildCookieOptions())
      .clearCookie('csrf_token', buildCsrfCookieOptions())
      .clearCookie(REFRESH_COOKIE_NAME, buildRefreshCookieOptions())
      .status(200)
      .json({
        success: true,
        message: 'signed out successfully'
      });
  } catch (error) {
    next(error);
  }
};

export const refreshSession = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      await incrementSecurityEvent('refresh_invalid');
      return next(errorHandler(401, 'Refresh token missing'));
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });
    if (!tokenDoc) {
      await incrementSecurityEvent('refresh_invalid');
      return next(errorHandler(401, 'Invalid refresh token'));
    }
    if (tokenDoc.expiresAt <= new Date()) {
      await incrementSecurityEvent('refresh_expired');
      return next(errorHandler(401, 'Refresh token expired'));
    }

    if (tokenDoc.revokedAt) {
      await RefreshToken.updateMany(
        { familyId: tokenDoc.familyId, revokedAt: null },
        {
          $set: {
            revokedAt: new Date(),
            revokedReason: 'replay_detected'
          }
        }
      );
      await incrementSecurityEvent('refresh_replay_detected');
      return next(errorHandler(401, 'Refresh token replay detected'));
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user || !user.isActive) {
      return next(errorHandler(401, 'User not found or inactive'));
    }

    const nextRefreshToken = issueRefreshTokenValue();
    const nextHash = hashRefreshToken(nextRefreshToken);
    const now = new Date();

    tokenDoc.revokedAt = now;
    tokenDoc.replacedByHash = nextHash;
    tokenDoc.lastUsedAt = now;
    await tokenDoc.save();

    await RefreshToken.create({
      userId: user._id,
      tokenHash: nextHash,
      familyId: tokenDoc.familyId,
      expiresAt: new Date(Date.now() + getRefreshTtlMs()),
      createdByIp: getClientIp(req),
      lastUsedAt: now,
      userAgent: getUserAgent(req)
    });

    const accessToken = signAccessToken(user);
    const csrfToken = issueCsrfToken();
    const { password: pass, ...rest } = user._doc;

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      entityType: 'auth',
      entityId: user._id,
      action: 'REFRESH',
      before: null,
      after: { source: 'refresh_token_rotation' },
      ipAddress: getClientIp(req)
    });

    return res
      .cookie('access_token', accessToken, buildCookieOptions())
      .cookie('csrf_token', csrfToken, buildCsrfCookieOptions())
      .cookie(REFRESH_COOKIE_NAME, nextRefreshToken, buildRefreshCookieOptions())
      .status(200)
      .json({ ...rest, csrfToken });
  } catch (error) {
    next(error);
  }
};

export const listSessions = async (req, res, next) => {
  try {
    const tokenHash = req.cookies?.[REFRESH_COOKIE_NAME]
      ? hashRefreshToken(req.cookies[REFRESH_COOKIE_NAME])
      : null;

    const sessions = await RefreshToken.find({
      userId: req.user.id
    })
      .sort({ createdAt: -1 })
      .select(
        '_id familyId createdAt lastUsedAt expiresAt createdByIp userAgent revokedAt revokedReason tokenHash'
      )
      .lean();

    res.status(200).json({
      success: true,
      data: sessions.map((session) => toSessionView(session, tokenHash))
    });
  } catch (error) {
    next(error);
  }
};

export const revokeSessionById = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!isValidObjectId(sessionId)) {
      return next(errorHandler(400, 'Invalid sessionId'));
    }

    const session = await RefreshToken.findOne({
      _id: sessionId,
      userId: req.user.id
    });
    if (!session) {
      return next(errorHandler(404, 'Session not found'));
    }
    if (session.revokedAt) {
      return res.status(200).json({
        success: true,
        message: 'Session already revoked'
      });
    }

    session.revokedAt = new Date();
    session.revokedReason = 'manual_revoke';
    await session.save();
    await incrementSecurityEvent('sessions_revoked_single');

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'auth',
      entityId: req.user.id,
      action: 'LOGOUT',
      before: null,
      after: { revokedSessionId: sessionId },
      ipAddress: getClientIp(req)
    });

    res.status(200).json({
      success: true,
      message: 'Session revoked'
    });
  } catch (error) {
    next(error);
  }
};

export const signoutAllSessions = async (req, res, next) => {
  try {
    const currentTokenHash = req.cookies?.[REFRESH_COOKIE_NAME]
      ? hashRefreshToken(req.cookies[REFRESH_COOKIE_NAME])
      : null;

    const filter = {
      userId: req.user.id,
      revokedAt: null,
      ...(currentTokenHash ? { tokenHash: { $ne: currentTokenHash } } : {})
    };

    const result = await RefreshToken.updateMany(filter, {
      $set: {
        revokedAt: new Date(),
        revokedReason: 'signout_all'
      }
    });
    await incrementSecurityEvent('sessions_revoked_all', result.modifiedCount || 0);

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'auth',
      entityId: req.user.id,
      action: 'LOGOUT',
      before: null,
      after: { revokedSessions: result.modifiedCount || 0, scope: 'all_other_sessions' },
      ipAddress: getClientIp(req)
    });

    res.status(200).json({
      success: true,
      message: 'All other sessions revoked',
      data: {
        revokedSessions: result.modifiedCount || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export const adminListUserSessions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const targetUser = await User.findById(userId).select('_id');
    if (!targetUser) {
      return next(errorHandler(404, 'User not found'));
    }

    const sessions = await RefreshToken.find({
      userId
    })
      .sort({ createdAt: -1 })
      .select(
        '_id familyId createdAt lastUsedAt expiresAt createdByIp userAgent revokedAt revokedReason'
      )
      .lean();

    return res.status(200).json({
      success: true,
      data: sessions.map((session) => toSessionView(session))
    });
  } catch (error) {
    next(error);
  }
};

export const adminRevokeUserSession = async (req, res, next) => {
  try {
    const { userId, sessionId } = req.params;
    const session = await RefreshToken.findOne({
      _id: sessionId,
      userId
    });
    if (!session) {
      return next(errorHandler(404, 'Session not found'));
    }
    if (session.revokedAt) {
      return res.status(200).json({
        success: true,
        message: 'Session already revoked'
      });
    }

    session.revokedAt = new Date();
    session.revokedReason = 'admin_revoke';
    await session.save();
    await incrementSecurityEvent('sessions_revoked_single');

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'auth',
      entityId: userId,
      action: 'LOGOUT',
      before: null,
      after: { revokedSessionId: sessionId, scope: 'admin' },
      ipAddress: getClientIp(req)
    });

    return res.status(200).json({
      success: true,
      message: 'User session revoked'
    });
  } catch (error) {
    next(error);
  }
};

export const adminRevokeAllUserSessions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const targetUser = await User.findById(userId).select('_id');
    if (!targetUser) {
      return next(errorHandler(404, 'User not found'));
    }

    const result = await RefreshToken.updateMany(
      { userId, revokedAt: null },
      {
        $set: {
          revokedAt: new Date(),
          revokedReason: 'admin_revoke_all'
        }
      }
    );
    const revokedCount = result.modifiedCount || 0;
    await incrementSecurityEvent('sessions_revoked_all', revokedCount);

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'auth',
      entityId: userId,
      action: 'LOGOUT',
      before: null,
      after: { revokedSessions: revokedCount, scope: 'admin_all' },
      ipAddress: getClientIp(req)
    });

    return res.status(200).json({
      success: true,
      message: 'All user sessions revoked',
      data: {
        revokedSessions: revokedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      '_id userName email role restaurantId profilePicture isActive'
    );
    if (!user) {
      return next(errorHandler(404, 'User not found'));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(
        errorHandler(400, 'currentPassword and newPassword are required')
      );
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return next(
        errorHandler(
          400,
          'Minimum 8 characters total. Must contain at least 1 capital letter (A-Z). Must contain at least 1 number (0-9).'
        )
      );
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return next(errorHandler(404, 'User not found'));
    }

    if (!user.isActive) {
      return next(errorHandler(403, 'User account is inactive'));
    }

    const validCurrentPassword = bcryptjs.compareSync(
      currentPassword,
      user.password
    );
    if (!validCurrentPassword) {
      await logAudit({
        actorId: user._id,
        actorRole: user.role,
        entityType: 'auth',
        entityId: user._id,
        action: 'LOGIN_FAILED',
        before: { reason: 'invalid_current_password' },
        after: null,
        ipAddress: getClientIp(req)
      });
      return next(errorHandler(401, 'Current password is invalid'));
    }

    user.password = bcryptjs.hashSync(newPassword, 10);
    await user.save();

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      entityType: 'user',
      entityId: user._id,
      action: 'UPDATE',
      before: null,
      after: { passwordChanged: true },
      ipAddress: getClientIp(req)
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
