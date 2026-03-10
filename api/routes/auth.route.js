import express from 'express';
import {
  adminListUserSessions,
  adminRevokeAllUserSessions,
  adminRevokeUserSession,
  changePassword,
  getSession,
  google,
  listSessions,
  refreshSession,
  revokeSessionById,
  signin,
  signoutAllSessions,
  signup,
  signout
} from '../controllers/auth.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { createRateLimit } from '../utils/rateLimit.js';
import { can } from '../utils/policy.js';
import { validate } from '../middlewares/validate.js';
import { authValidators } from '../validators/index.js';

const router = express.Router();
const signupLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'auth_signup'
});
const signinLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyPrefix: 'auth_signin'
});
const googleLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'auth_google'
});
const refreshLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyPrefix: 'auth_refresh'
});

// ===============================================================================
// 🔐 Auth Routes
// ===============================================================================
// Scope:
// - User authentication & session management
// - Public signup and login
// - Secure token-based authentication
//
// Security:
// - JWT-based authentication
// - HTTP-only cookies
//
// ===============================================================================

// ===============================================================================
// 🔷 POST /api/auth/signup
// 🔷 POST /api/auth/signin
// 🔷 POST /api/auth/google
// 🔷 POST /api/auth/signout
// ===============================================================================
// Purpose:
// - Handle all authentication-related actions
//
// ===============================================================================

// ===============================================================================
// 🔷 POST /api/auth/signup
// ===============================================================================

router.post(
  '/signup',
  signupLimiter,
  validate(authValidators.signup),
  signup
);

// ===============================================================================
// 🔷 POST /api/auth/signin
// ===============================================================================
router.post(
  '/signin',
  signinLimiter,
  validate(authValidators.signin),
  signin
);

// ===============================================================================
// 🔷 POST /api/auth/google
// ===============================================================================
router.post(
  '/google',
  googleLimiter,
  validate(authValidators.google),
  google
);
router.post('/refresh', refreshLimiter, refreshSession);

// ===============================================================================
// 🔷 POST /api/auth/signout
// ===============================================================================
router.post('/signout', verifyToken, can('signout', 'auth'), signout);
router.post('/signout-all', verifyToken, can('signout', 'auth'), signoutAllSessions);
router.get('/session', verifyToken, can('session', 'auth'), getSession);
router.get('/sessions', verifyToken, can('session', 'auth'), listSessions);
router.delete(
  '/sessions/:sessionId',
  verifyToken,
  can('session', 'auth'),
  validate(authValidators.sessionIdParam, 'params'),
  revokeSessionById
);
router.get(
  '/admin/users/:userId/sessions',
  verifyToken,
  can('manageUserSessions', 'auth'),
  validate(authValidators.userIdParam, 'params'),
  adminListUserSessions
);
router.delete(
  '/admin/users/:userId/sessions/:sessionId',
  verifyToken,
  can('manageUserSessions', 'auth'),
  validate(authValidators.userIdSessionIdParam, 'params'),
  adminRevokeUserSession
);
router.post(
  '/admin/users/:userId/sessions/revoke-all',
  verifyToken,
  can('manageUserSessions', 'auth'),
  validate(authValidators.userIdParam, 'params'),
  adminRevokeAllUserSessions
);
router.post(
  '/change-password',
  verifyToken,
  can('changePassword', 'auth'),
  validate(authValidators.changePassword),
  changePassword
);

export default router;
