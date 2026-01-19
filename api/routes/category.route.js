import express from "express";
import {
  createCategory,
  getCategories,
} from "../controllers/category.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

router.post("/create", verifyToken, createCategory); // create new category
router.get("/", getCategories); // get all categories

export default router;
