import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logAudit } from '../utils/auditLogger.js';
import { getClientIp } from '../utils/controllerHelpers.js';
import RefreshToken from '../models/refreshToken.model.js';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const REFRESH_COOKIE_NAME = 'refresh_token';
// Precomputed bcrypt hash for the string "password" to keep signin timing consistent.
const DUMMY_PASSWORD_HASH =
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8s7Qw6vY.fQ0M9f8Q5lHppZArYrusW';

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
});

const buildCsrfCookieOptions = () => ({
  httpOnly: false,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
});

const getRefreshTtlMs = () => {
  const days = Number.parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '14', 10);
  const validDays = Number.isFinite(days) && days > 0 ? days : 14;
  return validDays * 24 * 60 * 60 * 1000;
};

const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: getRefreshTtlMs()
});

const issueCsrfToken = () => crypto.randomBytes(32).toString('hex');
const issueRefreshTokenValue = () => crypto.randomBytes(48).toString('base64url');
const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const signAccessToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || process.env.ACCESS_TOKEN_EXPIRE || '1h' }
  );

const storeRefreshToken = async ({
  userId,
  tokenValue,
  familyId,
  ipAddress
}) => {
  const tokenHash = hashRefreshToken(tokenValue);
  const expiresAt = new Date(Date.now() + getRefreshTtlMs());
  await RefreshToken.create({
    userId,
    tokenHash,
    familyId,
    expiresAt,
    createdByIp: ipAddress || null
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
    ipAddress: getClientIp(req)
  });
  res
    .cookie('access_token', token, buildCookieOptions())
    .cookie('csrf_token', csrfToken, buildCsrfCookieOptions())
    .cookie(REFRESH_COOKIE_NAME, refreshTokenValue, buildRefreshCookieOptions());
  return { csrfToken };
};

const revokeRefreshTokenFromRequest = async (req) => {
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
        revokedAt: new Date()
      }
    }
  );
};

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
      await logAudit({
        actorId: null,
        actorRole: 'anonymous',
        entityType: 'auth',
        entityId: null,
        action: 'LOGIN_FAILED',
        before: { email: normalizedEmail },
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

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) {
      await logAudit({
        actorId: validUser._id,
        actorRole: validUser.role,
        entityType: 'auth',
        entityId: validUser._id,
        action: 'LOGIN_FAILED',
        before: { email: validUser.email },
        after: null,
        ipAddress: getClientIp(req)
      });

      return next(errorHandler(401, INVALID_CREDENTIALS_MESSAGE));
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
    await revokeRefreshTokenFromRequest(req);

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
      return next(errorHandler(401, 'Refresh token missing'));
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });
    if (!tokenDoc) {
      return next(errorHandler(401, 'Invalid refresh token'));
    }
    if (tokenDoc.expiresAt <= new Date()) {
      return next(errorHandler(401, 'Refresh token expired'));
    }

    if (tokenDoc.revokedAt) {
      await RefreshToken.updateMany(
        { familyId: tokenDoc.familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
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
      lastUsedAt: now
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
