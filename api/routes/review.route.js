import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import { can } from '../utils/policy.js';
import { validate } from '../middlewares/validate.js';
import { reviewValidators } from '../validators/index.js';
import { logger } from '../utils/logger.js';
import {
  createReview,
  deleteReview,
  getReviewById,
  getMyReviews,
  getRestaurantReviewSummary,
  listAllReviewsForModeration,
  listAllReviewsForSuperAdmin,
  moderateReview,
  bulkModerateReviews,
  getReviewCountsForAdmin,
  listAllReviewsPublic
} from '../controllers/review.controller.js';
import { listRestaurantReviews } from '../controllers/review.controller.js';

const router = express.Router();

// SuperAdmin: Get all reviews across all restaurants (must be before /restaurant/:restaurantId)
router.get(
  '/all',
  verifyToken,
  (req, res, next) => {
    logger.info('reviews.all.check', { role: req.user?.role });
    if (req.user?.role !== 'superAdmin') {
      return next({ status: 403, message: 'Permission denied' });
    }
    return next();
  },
  listAllReviewsForSuperAdmin
);

// Public endpoints with validation
router.get(
  '/restaurant/:restaurantId',
  validate(reviewValidators.restaurantParam, 'params'),
  validate(reviewValidators.listRestaurantQuery, 'query'),
  listRestaurantReviews
);

// Public endpoint to list all reviews
router.get(
  '/',
  listAllReviewsPublic
);
router.get(
  '/restaurant/:restaurantId/summary',
  validate(reviewValidators.restaurantParam, 'params'),
  getRestaurantReviewSummary
);

// Protected endpoints for moderation (admin/superAdmin for specific restaurant)
router.get(
  '/restaurant/:restaurantId/all',
  verifyToken,
  can('moderate', 'review'),
  validate(reviewValidators.restaurantParam, 'params'),
  validate(reviewValidators.listRestaurantQuery, 'query'),
  listAllReviewsForModeration
);

// Get review counts for admin overview
router.get(
  '/admin/counts',
  verifyToken,
  getReviewCountsForAdmin
);

// Protected endpoints
router.get(
  '/my',
  verifyToken,
  (req, res, next) => {
    logger.info('reviews.my.check', { role: req.user?.role });
    if (req.user?.role === 'superAdmin' || req.user?.role === 'user') {
      return next();
    }
    return next({ status: 403, message: 'Permission denied' });
  },
  validate(reviewValidators.myQuery, 'query'),
  getMyReviews
);

router.get(
  '/:id',
  verifyToken,
  can('readById', 'review'),
  validate(reviewValidators.idParam, 'params'),
  getReviewById
);

router.post(
  '/restaurant/:restaurantId',
  verifyToken,
  can('create', 'review'),
  validate(reviewValidators.restaurantParam, 'params'),
  validate(reviewValidators.createBody),
  createReview
);

router.patch(
  '/bulk-moderate',
  verifyToken,
  can('moderate', 'review'),
  validate(reviewValidators.bulkModerateBody),
  bulkModerateReviews
);

router.delete(
  '/:id',
  verifyToken,
  can('delete', 'review'),
  validate(reviewValidators.idParam, 'params'),
  deleteReview
);

router.patch(
  '/:id/moderate',
  verifyToken,
  can('moderate', 'review'),
  validate(reviewValidators.idParam, 'params'),
  validate(reviewValidators.moderateBody),
  moderateReview
);

export default router;
