import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import { can } from '../utils/policy.js';
import {
  createUserBySuperAdmin,
  updateUserBySuperAdmin
} from '../controllers/admin.controller.js';
import { validate } from '../middlewares/validate.js';
import { adminValidators } from '../validators/index.js';
import jwtAdminRoutes from './admin.jwt.route.js';

const router = express.Router();

// ===============================================================================
// 🔷 Admin Routes — SuperAdmin privileged operations
// ===============================================================================
// Scope:
// - High-privilege administrative actions
// - No public or self-service access
//
// Security:
// - verifyToken → authentication
// - verifySuperAdmin → authorization
//
// ===============================================================================

// ===============================================================================
// 🔷 POST /api/admin/users
// ===============================================================================
// Purpose:
// - Create Admin or StoreManager directly by SuperAdmin
//
// Protected by:
// - verifyToken
// - verifySuperAdmin
//
// ===============================================================================

router.post(
  '/users',
  verifyToken,
  can('createPrivilegedUser', 'admin'),
  validate(adminValidators.createPrivilegedUser),
  createUserBySuperAdmin
);
router.patch(
  '/users/:id',
  verifyToken,
  can('createPrivilegedUser', 'admin'),
  validate(adminValidators.idParam, 'params'),
  validate(adminValidators.updatePrivilegedUser),
  updateUserBySuperAdmin
);

// JWT Management routes
router.use('/jwt', jwtAdminRoutes);

export default router;
