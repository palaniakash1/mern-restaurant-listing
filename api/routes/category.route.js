import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getMyCategories,
  reorderCategories,
  updateCategory,
} from "../controllers/category.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

router.post("/create", verifyToken, createCategory); // create new category
router.get("/", getCategories); // get all categories
router.put("/reorder", verifyToken, reorderCategories); // update category
router.get("/my", verifyToken, getMyCategories); // update category
router.put("/:id", verifyToken, updateCategory); // update category
router.delete("/:id", verifyToken, deleteCategory); // update category

export default router;
