import express from "express";
import {
  create,
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
} from "../controllers/restaurant.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

router.post("/create", verifyToken, create);
router.get("/all-restaurants", verifyToken, getAllRestaurants);
router.get("/:id", verifyToken, getRestaurantById);
router.put("/:id", verifyToken, updateRestaurant);
router.delete("/:id", verifyToken, deleteRestaurant);

export default router;
