import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import {
  verifyAdmin,
  verifyAdminOrSuperAdmin,
  verifySuperAdmin,
} from "../utils/roleGuards.js";

import {
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  updateCategoryStatus,
  reorderCategories,
  getCategories,
  getMyCategories,
  getCategoryById,
  getAllCategories,
  hardDeleteCategory,
  bulkUpdateCategoryStatus,
} from "../controllers/category.controller.js";

const router = express.Router();

// GET all categories
router.get("/", getCategories);

// GET MY category
router.get("/my", verifyToken, verifyAdmin, getMyCategories);

// SUPERADMIN FULL VIEW
router.get("/all", verifyToken, verifySuperAdmin, getAllCategories);

// BULK STATUS UPDATE
router.patch(
  "/bulk-status",
  verifyToken,
  verifySuperAdmin,
  bulkUpdateCategoryStatus,
);

// REORDER category
router.patch(
  "/reorder",
  verifyToken,
  verifyAdminOrSuperAdmin,
  reorderCategories,
);

// Create new generic or restaurant category
router.post("/", verifyToken, verifyAdminOrSuperAdmin, createCategory);

// UPATE category status
router.patch(
  "/:id/status",
  verifyToken,
  verifyAdminOrSuperAdmin,
  updateCategoryStatus,
);

// Restore soft-deleted category
router.patch("/:id/restore", verifyToken, verifySuperAdmin, restoreCategory);

// HARD DELETE
router.delete("/:id/hard", verifyToken, verifySuperAdmin, hardDeleteCategory);

// GET Retrieve category by ID
router.get("/:id", verifyToken, verifyAdminOrSuperAdmin, getCategoryById);

// UPATE category
router.patch("/:id", verifyToken, verifyAdminOrSuperAdmin, updateCategory);

// DELETE category
router.delete("/:id", verifyToken, verifyAdminOrSuperAdmin, deleteCategory);

export default router;
