import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { can } from "../utils/policy.js";
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

router.get("/restaurant/:restaurantId", listRestaurantReviews);
router.get("/restaurant/:restaurantId/summary", getRestaurantReviewSummary);

router.get("/my", verifyToken, can("readMine", "review"), getMyReviews);
router.get("/:id", verifyToken, can("readById", "review"), getReviewById);
router.post("/restaurant/:restaurantId", verifyToken, can("create", "review"), createReview);
router.patch("/:id", verifyToken, can("update", "review"), updateReview);
router.delete("/:id", verifyToken, can("delete", "review"), deleteReview);
router.patch(
  "/:id/moderate",
  verifyToken,
  can("moderate", "review"),
  moderateReview,
);

export default router;
