import express from "express";
import {
  create,
  getAllRestaurants,
} from "../controllers/restaurant.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

router.post("/create", verifyToken, create);
router.get("/all-restaurants", verifyToken, getAllRestaurants);

export default router;
