import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { can } from "../utils/policy.js";
import { validate } from "../middlewares/validate.js";
import { reviewValidators } from "../validators/index.js";
import {
  createReview,
  deleteReview,
  getReviewById,
  getMyReviews,
  getRestaurantReviewSummary,
  listRestaurantReviews,
  moderateReview,
  updateReview,
} from "../controllers/review.controller.js";

const router = express.Router();

// Public endpoints with validation
router.get(
  "/restaurant/:restaurantId",
  validate(reviewValidators.restaurantParam, "params"),
  validate(reviewValidators.listRestaurantQuery, "query"),
  listRestaurantReviews,
);
router.get(
  "/restaurant/:restaurantId/summary",
  validate(reviewValidators.restaurantParam, "params"),
  getRestaurantReviewSummary,
);

// Protected endpoints
router.get(
  "/my",
  verifyToken,
  can("readMine", "review"),
  validate(reviewValidators.myQuery, "query"),
  getMyReviews,
);

router.get(
  "/:id",
  verifyToken,
  can("readById", "review"),
  validate(reviewValidators.idParam, "params"),
  getReviewById,
);

router.post(
  "/restaurant/:restaurantId",
  verifyToken,
  can("create", "review"),
  validate(reviewValidators.restaurantParam, "params"),
  validate(reviewValidators.createBody),
  createReview,
);

router.patch(
  "/:id",
  verifyToken,
  can("update", "review"),
  validate(reviewValidators.idParam, "params"),
  validate(reviewValidators.updateBody),
  updateReview,
);

router.delete(
  "/:id",
  verifyToken,
  can("delete", "review"),
  validate(reviewValidators.idParam, "params"),
  deleteReview,
);

router.patch(
  "/:id/moderate",
  verifyToken,
  can("moderate", "review"),
  validate(reviewValidators.idParam, "params"),
  validate(reviewValidators.moderateBody),
  moderateReview,
);

export default router;
