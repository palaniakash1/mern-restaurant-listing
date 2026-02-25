import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { verifyAdminOrSuperAdmin } from "../utils/roleGuards.js";
import {
  createReview,
  deleteReview,
  getMyReviews,
  getRestaurantReviewSummary,
  listRestaurantReviews,
  moderateReview,
  updateReview,
} from "../controllers/review.controller.js";

const router = express.Router();

router.get("/restaurant/:restaurantId", listRestaurantReviews);
router.get("/restaurant/:restaurantId/summary", getRestaurantReviewSummary);

router.get("/my", verifyToken, getMyReviews);
router.post("/restaurant/:restaurantId", verifyToken, createReview);
router.patch("/:id", verifyToken, updateReview);
router.delete("/:id", verifyToken, deleteReview);
router.patch(
  "/:id/moderate",
  verifyToken,
  verifyAdminOrSuperAdmin,
  moderateReview,
);

export default router;
