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
  getAdminRestaurantSummary,
  updateRestaurantStatus,
  restoreRestaurant,
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
router.get("/slug/:slug/details", getRestaurantDetails);

// =======================
// PROTECTED ACTIONS
// =======================

//create
router.post("/", verifyToken, verifyAdminOrSuperAdmin, create); // create new restaurant - done

// admin
router.get("/me", verifyToken, verifyAdmin, getMyRestaurant);
router.get("/me/summary", verifyToken, verifyAdmin, getAdminRestaurantSummary);

router.get("/all", verifyToken, verifySuperAdmin, getAllRestaurants); // get all restaurant - done

// get restaurant by id
router.get(
  "/id/:id",
  verifyToken,
  verifyAdminOrSuperAdmin,
  verifyRestaurantOwner,
  getRestaurantById,
);

// =======================
// admin/superAdmin
// =======================
router.patch(
  "/id/:id",
  verifyToken,
  verifyAdminOrSuperAdmin,
  verifyRestaurantOwner,
  updateRestaurant,
); // update restaurant by id - done

// soft delete
router.delete(
  "/id/:id",
  verifyToken,
  verifyAdminOrSuperAdmin,
  verifyRestaurantOwner,
  deleteRestaurant,
); //delete restaurant

// =======================
// STATE MANAGEMENT
// =======================
router.patch(
  "/id/:id/status",
  verifyToken,
  verifySuperAdmin,
  updateRestaurantStatus,
);

// Restore
router.patch(
  "/id/:id/restore",
  verifyToken,
  verifySuperAdmin,
  restoreRestaurant,
); // restore from soft delete

router.patch(
  "/id/:id/admin",
  verifyToken,
  verifySuperAdmin,
  reassignRestaurantAdmin,
); // reassign restaurant from superAdmin to admin

export default router;
