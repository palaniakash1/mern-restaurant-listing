import express from "express";
import {
  create,
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantBySlug,
  reassignRestaurantAdmin,
} from "../controllers/restaurant.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

router.post("/create", verifyToken, create); // create new restaurant - done
router.get("/all-restaurants", verifyToken, getAllRestaurants); // get all restaurant - done

// admin/superAdmin
router.get("/:id", verifyToken, getRestaurantById); // get restaurant by id - done
router.get("/:id/reassign-admin", verifyToken, getRestaurantById); // get restaurant by id - done
router.put("/:id", verifyToken, updateRestaurant); // update restaurant by id - done
router.delete("/:id", verifyToken, deleteRestaurant); //delete restaurant by id - done
router.put(
  "/restaurant/:id/reassign-admin",
  verifyToken,
  reassignRestaurantAdmin
);
// public
router.get("/slug/:slug", getRestaurantBySlug); // done

export default router;
