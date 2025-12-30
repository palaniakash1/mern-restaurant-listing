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
} from "../controllers/restaurant.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

router.post("/create", verifyToken, create); // create new restaurant - done
router.get("/all-restaurants", verifyToken, getAllRestaurants); // get all restaurant - done

// public
router.get("/slug/:slug", getRestaurantBySlug); // done

// admin
router.get("/my", verifyToken, getMyRestaurant);

// admin/superAdmin
router.get("/:id", verifyToken, getRestaurantById); // get restaurant by id - done
router.put("/:id", verifyToken, updateRestaurant); // update restaurant by id - done
router.delete("/:id", verifyToken, deleteRestaurant); //delete restaurant by id - done
router.put("/:id/reassign-admin", verifyToken, reassignRestaurantAdmin);// reassign restaurant from superAdmin to admin

export default router;
