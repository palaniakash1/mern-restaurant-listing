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
import { validate } from "../middlewares/validate.js";
import { restaurantValidators } from "../validators/index.js";

import {
  verifyRestaurantOwner,
} from "../utils/roleGuards.js";

const router = express.Router();

// =======================
// PUBLIC ROUTES (LISTING)
// =======================
router.get("/", validate(restaurantValidators.listQuery, "query"), listRestaurants);
router.get("/nearby", validate(restaurantValidators.nearbyQuery, "query"), getNearByRestaurants);
router.get(
  "/featured",
  validate(restaurantValidators.featuredTrendingQuery, "query"),
  getFeaturedRestaurants,
);
router.get(
  "/trending",
  validate(restaurantValidators.featuredTrendingQuery, "query"),
  getTrendingRestaurants,
);

// =======================
// PUBLIC DETAILS
// =======================
router.get(
  "/slug/:slug",
  validate(restaurantValidators.slugParam, "params"),
  getRestaurantBySlug,
);
router.get(
  "/slug/:slug/details",
  validate(restaurantValidators.slugParam, "params"),
  getRestaurantDetails,
);

// =======================
// PROTECTED ACTIONS
// =======================

//create
router.post(
  "/",
  verifyToken,
  can("create", "restaurant"),
  validate(restaurantValidators.createBody),
  create,
); // create new restaurant - done

// admin
router.get("/me", verifyToken, can("readMine", "restaurant"), getMyRestaurant);
router.get(
  "/me/summary",
  verifyToken,
  can("readMineSummary", "restaurant"),
  getAdminRestaurantSummary,
);

router.get(
  "/all",
  verifyToken,
  can("listAll", "restaurant"),
  validate(restaurantValidators.allQuery, "query"),
  getAllRestaurants,
); // get all restaurant - done

// get restaurant by id
router.get(
  "/id/:id",
  verifyToken,
  canAny(["readById"], "restaurant"),
  validate(restaurantValidators.idParam, "params"),
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
  validate(restaurantValidators.idParam, "params"),
  validate(restaurantValidators.updateBody),
  verifyRestaurantOwner,
  updateRestaurant,
); // update restaurant by id - done

// soft delete
router.delete(
  "/id/:id",
  verifyToken,
  canAny(["deleteById"], "restaurant"),
  validate(restaurantValidators.idParam, "params"),
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
  validate(restaurantValidators.idParam, "params"),
  validate(restaurantValidators.statusBody),
  updateRestaurantStatus,
);

// Restore
router.patch(
  "/id/:id/restore",
  verifyToken,
  can("restore", "restaurant"),
  validate(restaurantValidators.idParam, "params"),
  restoreRestaurant,
); // restore from soft delete

router.patch(
  "/id/:id/admin",
  verifyToken,
  can("reassignAdmin", "restaurant"),
  validate(restaurantValidators.idParam, "params"),
  validate(restaurantValidators.reassignBody),
  reassignRestaurantAdmin,
); // reassign restaurant from superAdmin to admin

export default router;
