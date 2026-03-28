/**
 * CSRF Protection Middleware
 * Provides CSRF token generation and validation for state-changing operations
 *
 * For REST APIs with JWT in Authorization header, CSRF is less critical
 * but this provides extra security for cookie-based sessions
 */

import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import config from '../config.js';

// ===================================================================
// CONFIGURATION
// ===================================================================

const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_TTL_MS = config.csrf?.ttlMs || 24 * 60 * 60 * 1000;

// In-memory token store (use Redis in production)
const csrfTokens = new Map();

/**
 * Generate a CSRF token
 * @param {string} userId - User ID to associate with token
 * @returns {string} CSRF token
 */
export const generateToken = (userId) => {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const timestamp = Date.now();

  // Store token with user association
  csrfTokens.set(token, {
    userId,
    createdAt: timestamp,
    expiresAt: timestamp + CSRF_TOKEN_TTL_MS
  });

  // Cleanup old tokens periodically
  if (csrfTokens.size > 1000) {
    cleanupExpiredTokens();
  }

  return token;
};

/**
 * Validate a CSRF token
 * @param {string} token - CSRF token to validate
 * @param {string} userId - User ID to validate against
 * @returns {boolean} True if valid
 */
export const validateToken = (token, userId) => {
  if (!token) return false;

  const tokenData = csrfTokens.get(token);

  if (!tokenData) {
    return false;
  }

  // Check if expired
  if (Date.now() > tokenData.expiresAt) {
    csrfTokens.delete(token);
    return false;
  }

  // For additional security, validate userId match
  // Comment out if you want tokens to be user-agnostic
  if (userId && tokenData.userId !== userId) {
    return false;
  }

  return true;
};

/**
 * Remove a CSRF token (after successful use)
 * @param {string} token - Token to remove
 */
export const removeToken = (token) => {
  csrfTokens.delete(token);
};

/**
 * Clean up expired tokens
 */
const cleanupExpiredTokens = () => {
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (now > data.expiresAt) {
      csrfTokens.delete(token);
    }
  }
};

// Run cleanup every hour
const cleanupInterval = globalThis.setInterval(
  cleanupExpiredTokens,
  60 * 60 * 1000
);
cleanupInterval.unref?.();

/**
 * Create CSRF middleware for Express
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
export const createCsrfMiddleware = (options = {}) => {
  const {
    excludeMethods = ['GET', 'HEAD', 'OPTIONS'],
    excludePaths = ['/api/health', '/api/live', '/api/docs'],
    tokenHeader = 'x-csrf-token'
  } = options;

  return (req, res, next) => {
    // Skip for safe methods
    if (excludeMethods.includes(req.method)) {
      return next();
    }

    // Skip for excluded paths
    const path = req.path;
    if (excludePaths.some((excluded) => path.startsWith(excluded))) {
      return next();
    }

    // For API with JWT in header, CSRF is optional
    // But we can still check if token is present for extra security
    const csrfToken = req.headers[tokenHeader];

    // If no token provided, it's optional for now (backwards compatibility)
    // In production, you might want to require it
    if (!csrfToken) {
      // Log but don't block (API security handled by JWT)
      logger.warn('csrf.token_missing_allowed', { path: req.path, method: req.method });
      return next();
    }

    // Validate token
    const userId = req.user?.id;
    if (!validateToken(csrfToken, userId)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired CSRF token'
      });
    }

    // Token valid, remove it (one-time use for extra security)
    // Comment out if you want to allow token reuse
    // removeToken(csrfToken);

    next();
  };
};

/**
 * Get CSRF token for client
 * @param {Object} req - Express request
 * @returns {string} CSRF token
 */
export const getCsrfToken = (req) => {
  const userId = req.user?.id || req.session?.userId;
  return generateToken(userId);
};

/**
 * Double-submit CSRF guard for cookie-authenticated write requests.
 * If auth is via Authorization header, CSRF check is skipped.
 */
export const createCookieCsrfGuard = (options = {}) => {
  const {
    tokenHeader = 'x-csrf-token',
    tokenCookie = 'csrf_token',
    unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'],
    excludePaths = ['/api/auth/signin', '/api/auth/signup', '/api/auth/google']
  } = options;

  return (req, res, next) => {
    if (!unsafeMethods.includes(req.method)) {
      return next();
    }

    if (excludePaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    if (req.authSource !== 'cookie' && !req.cookies?.access_token) {
      return next();
    }

    // Enforce primarily for browser-originated requests.
    if (!req.headers.origin) {
      return next();
    }

    const headerToken = req.headers[tokenHeader];
    const cookieToken = req.cookies?.[tokenCookie];

    if (
      typeof headerToken !== 'string' ||
      typeof cookieToken !== 'string' ||
      !headerToken ||
      !cookieToken ||
      headerToken !== cookieToken
    ) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or missing CSRF token'
      });
    }

    next();
  };
};

export default {
  generateToken,
  validateToken,
  removeToken,
  createCsrfMiddleware,
  createCookieCsrfGuard,
  getCsrfToken
};
