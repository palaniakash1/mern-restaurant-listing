import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import { can } from '../utils/policy.js';
import {
  getOverview,
  getStats,
  getAnalytics,
  getRealtime
} from '../controllers/dashboard.controller.js';

const router = express.Router();

router.get(
  '/overview',
  verifyToken,
  can('read', 'dashboard'),
  getOverview
);

router.get(
  '/stats',
  verifyToken,
  can('read', 'dashboard'),
  getStats
);

router.get(
  '/analytics',
  verifyToken,
  can('read', 'dashboard'),
  getAnalytics
);

router.get(
  '/realtime',
  verifyToken,
  can('read', 'dashboard'),
  getRealtime
);

export default router;
