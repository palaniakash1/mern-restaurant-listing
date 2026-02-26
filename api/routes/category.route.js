import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { can } from "../utils/policy.js";
import { validate } from "../middlewares/validate.js";
import { categoryValidators } from "../validators/index.js";

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
router.get("/", validate(categoryValidators.listQuery, "query"), getCategories);

// GET MY category
router.get(
  "/my",
  verifyToken,
  can("readMine", "category"),
  validate(categoryValidators.myQuery, "query"),
  getMyCategories,
);

// SUPERADMIN FULL VIEW
router.get(
  "/all",
  verifyToken,
  can("readAll", "category"),
  validate(categoryValidators.allQuery, "query"),
  getAllCategories,
);

// SUPERADMIN DELETED VIEW
router.get(
  "/deleted",
  verifyToken,
  can("readDeleted", "category"),
  validate(categoryValidators.deletedQuery, "query"),
  getDeletedCategories,
);

// SUPERADMIN EXPORT
router.get(
  "/export",
  verifyToken,
  can("export", "category"),
  validate(categoryValidators.exportQuery, "query"),
  exportCategories,
);

// BULK STATUS UPDATE
router.patch(
  "/bulk-status",
  verifyToken,
  can("bulkStatus", "category"),
  validate(categoryValidators.bulkStatusBody),
  bulkUpdateCategoryStatus,
);

// BULK REORDER WITH IDEMPOTENCY KEY
router.patch(
  "/bulk-reorder",
  verifyToken,
  can("bulkReorder", "category"),
  validate(categoryValidators.idempotencyHeader, "headers", { assign: false }),
  validate(categoryValidators.bulkReorderBody),
  bulkReorderCategories,
);

// REORDER category
router.patch(
  "/reorder",
  verifyToken,
  can("reorder", "category"),
  validate(categoryValidators.reorderBody),
  reorderCategories,
);

// Check slug availability
router.post(
  "/check-slug",
  verifyToken,
  can("checkSlug", "category"),
  validate(categoryValidators.checkSlugBody),
  checkCategorySlug,
);

// Create new generic or restaurant category
router.post(
  "/",
  verifyToken,
  can("create", "category"),
  validate(categoryValidators.createBody),
  createCategory,
);

// UPATE category status
router.patch(
  "/:id/status",
  verifyToken,
  can("updateStatus", "category"),
  validate(categoryValidators.idParam, "params"),
  validate(categoryValidators.updateStatusBody),
  updateCategoryStatus,
);

// Restore soft-deleted category
router.patch(
  "/:id/restore",
  verifyToken,
  can("restore", "category"),
  validate(categoryValidators.idParam, "params"),
  restoreCategory,
);

// HARD DELETE
router.delete(
  "/:id/hard",
  verifyToken,
  can("hardDelete", "category"),
  validate(categoryValidators.idParam, "params"),
  hardDeleteCategory,
);

// category audit logs
router.get(
  "/:id/audit",
  verifyToken,
  can("readAudit", "category"),
  validate(categoryValidators.idParam, "params"),
  validate(categoryValidators.auditQuery, "query"),
  getCategoryAuditLogs,
);

// GET Retrieve category by ID
router.get(
  "/:id",
  verifyToken,
  can("readById", "category"),
  validate(categoryValidators.idParam, "params"),
  getCategoryById,
);

// UPATE category
router.patch(
  "/:id",
  verifyToken,
  can("update", "category"),
  validate(categoryValidators.idParam, "params"),
  validate(categoryValidators.updateBody),
  updateCategory,
);

// DELETE category
router.delete(
  "/:id",
  verifyToken,
  can("delete", "category"),
  validate(categoryValidators.idParam, "params"),
  deleteCategory,
);

export default router;
