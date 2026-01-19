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
} from "../controllers/restaurant.controller.js";
import { verifyToken } from "../utils/verifyUser.js";
import {
  verifyRestaurantOwner,
  verifyAdminOrSuperAdmin,
} from "../middlewares/restaurantGuards.js";

const router = express.Router();

// =======================
// PUBLIC ROUTES
// =======================

router.get("/nearby", getNearByRestaurants);
router.get("/featured", getFeaturedRestaurants);
router.get("/trending", getTrendingRestaurants);
router.get("/", listRestaurants);

// public
router.get("/slug/:slug", getRestaurantBySlug); // done

router.get("/:slug/details", getRestaurantDetails);

router.put("/:id/publish", verifyToken, publishRestaurant);

router.put("/:id/block", verifyToken, blockRestaurant);

// =======================
// PROTECTED ROUTES
// =======================
router.post("/create", verifyToken, create); // create new restaurant - done
router.get("/all-restaurants", verifyToken, getAllRestaurants); // get all restaurant - done

// admin
router.get("/my", verifyToken, getMyRestaurant);

// admin/superAdmin
router.put(
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
router.put("/:id/reassign-admin", verifyToken, reassignRestaurantAdmin); // reassign restaurant from superAdmin to admin

router.get("/:id", verifyToken, getRestaurantById); // get restaurant by id - done

export default router;
