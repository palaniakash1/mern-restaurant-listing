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
import { can, canAny } from "../utils/policy.js";

import {
  verifyRestaurantOwner,
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
router.post("/", verifyToken, can("create", "restaurant"), create); // create new restaurant - done

// admin
router.get("/me", verifyToken, can("readMine", "restaurant"), getMyRestaurant);
router.get(
  "/me/summary",
  verifyToken,
  can("readMineSummary", "restaurant"),
  getAdminRestaurantSummary,
);

router.get("/all", verifyToken, can("listAll", "restaurant"), getAllRestaurants); // get all restaurant - done

// get restaurant by id
router.get(
  "/id/:id",
  verifyToken,
  canAny(["readById"], "restaurant"),
  verifyRestaurantOwner,
  getRestaurantById,
);

// =======================
// admin/superAdmin
// =======================
router.patch(
  "/id/:id",
  verifyToken,
  canAny(["updateById"], "restaurant"),
  verifyRestaurantOwner,
  updateRestaurant,
); // update restaurant by id - done

// soft delete
router.delete(
  "/id/:id",
  verifyToken,
  canAny(["deleteById"], "restaurant"),
  verifyRestaurantOwner,
  deleteRestaurant,
); //delete restaurant

// =======================
// STATE MANAGEMENT
// =======================
router.patch(
  "/id/:id/status",
  verifyToken,
  can("updateStatus", "restaurant"),
  updateRestaurantStatus,
);

// Restore
router.patch(
  "/id/:id/restore",
  verifyToken,
  can("restore", "restaurant"),
  restoreRestaurant,
); // restore from soft delete

router.patch(
  "/id/:id/admin",
  verifyToken,
  can("reassignAdmin", "restaurant"),
  reassignRestaurantAdmin,
); // reassign restaurant from superAdmin to admin

export default router;
