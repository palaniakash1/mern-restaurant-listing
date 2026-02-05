import express from "express";

import {
  create,
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantBySlug,
  reassignRestaurantAdmin,
  getMyRestaurant,
  getNearByRestaurants,
  listRestaurants,
  getFeaturedRestaurants,
  getTrendingRestaurants,
  getRestaurantDetails,
  // publishRestaurant,
  // blockRestaurant,
  // unpublishRestaurant,
  // restoreBlockedRestaurant,
  getAdminRestaurantSummary,
  updateRestaurantStatus,
} from "../controllers/restaurant.controller.js";

import { verifyToken } from "../utils/verifyUser.js";

import {
  verifyRestaurantOwner,
  verifyAdminOrSuperAdmin,
  verifyAdmin,
  verifySuperAdmin,
} from "../utils/roleGuards.js";

const router = express.Router();

// =======================
// PUBLIC ROUTES (LISTING)
// =======================
router.get("/", listRestaurants);
router.get("/nearby", getNearByRestaurants);
router.get("/featured", getFeaturedRestaurants);
router.get("/trending", getTrendingRestaurants);

// =======================
// PUBLIC DETAILS
// =======================
router.get("/slug/:slug", getRestaurantBySlug);
router.get("/:slug/details", getRestaurantDetails);

// =======================
// PROTECTED ACTIONS
// =======================
router.post("/", verifyToken, verifyAdminOrSuperAdmin, create); // create new restaurant - done

// admin
router.get("/me", verifyToken, verifyAdmin, getMyRestaurant);

router.get("/me/summary", verifyToken, verifyAdmin, getAdminRestaurantSummary);

router.get("/all", verifyToken, verifySuperAdmin, getAllRestaurants); // get all restaurant - done

// =======================
// STATE MANAGEMENT
// =======================
// router.put("/:id/publish", verifyToken, publishRestaurant);
// router.patch("/:id/unpublish", verifyToken, unpublishRestaurant);
// router.put("/:id/block", verifyToken, blockRestaurant);
// router.patch("/:id/restore", verifyToken, restoreBlockedRestaurant);
router.patch(
  "/:id/status",
  verifyToken,
  verifySuperAdmin,
  updateRestaurantStatus,
);

// =======================
// admin/superAdmin
// =======================
router.patch(
  "/:id",
  verifyToken,
  verifyAdminOrSuperAdmin,
  verifyRestaurantOwner,
  updateRestaurant,
); // update restaurant by id - done

router.delete(
  "/:id",
  verifyToken,
  verifyAdminOrSuperAdmin,
  verifyRestaurantOwner,
  deleteRestaurant,
); //delete restaurant by id - done

router.patch(
  "/:id/admin",
  verifyToken,
  verifySuperAdmin,
  reassignRestaurantAdmin,
); // reassign restaurant from superAdmin to admin
router.get("/:id", verifyToken, getRestaurantById); // get restaurant by id - done

export default router;
