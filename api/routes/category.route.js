import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { can } from "../utils/policy.js";

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
  getCategoryAuditLogs,
  checkCategorySlug,
  exportCategories,
  bulkReorderCategories,
  getDeletedCategories,
} from "../controllers/category.controller.js";

const router = express.Router();

// GET all categories
router.get("/", getCategories);

// GET MY category
router.get("/my", verifyToken, can("readMine", "category"), getMyCategories);

// SUPERADMIN FULL VIEW
router.get("/all", verifyToken, can("readAll", "category"), getAllCategories);

// SUPERADMIN DELETED VIEW
router.get("/deleted", verifyToken, can("readDeleted", "category"), getDeletedCategories);

// SUPERADMIN EXPORT
router.get("/export", verifyToken, can("export", "category"), exportCategories);

// BULK STATUS UPDATE
router.patch(
  "/bulk-status",
  verifyToken,
  can("bulkStatus", "category"),
  bulkUpdateCategoryStatus,
);

// BULK REORDER WITH IDEMPOTENCY KEY
router.patch(
  "/bulk-reorder",
  verifyToken,
  can("bulkReorder", "category"),
  bulkReorderCategories,
);

// REORDER category
router.patch(
  "/reorder",
  verifyToken,
  can("reorder", "category"),
  reorderCategories,
);

// Check slug availability
router.post("/check-slug", verifyToken, can("checkSlug", "category"), checkCategorySlug);

// Create new generic or restaurant category
router.post("/", verifyToken, can("create", "category"), createCategory);

// UPATE category status
router.patch(
  "/:id/status",
  verifyToken,
  can("updateStatus", "category"),
  updateCategoryStatus,
);

// Restore soft-deleted category
router.patch("/:id/restore", verifyToken, can("restore", "category"), restoreCategory);

// HARD DELETE
router.delete("/:id/hard", verifyToken, can("hardDelete", "category"), hardDeleteCategory);

// category audit logs
router.get("/:id/audit", verifyToken, can("readAudit", "category"), getCategoryAuditLogs);

// GET Retrieve category by ID
router.get("/:id", verifyToken, can("readById", "category"), getCategoryById);

// UPATE category
router.patch("/:id", verifyToken, can("update", "category"), updateCategory);

// DELETE category
router.delete("/:id", verifyToken, can("delete", "category"), deleteCategory);

export default router;
