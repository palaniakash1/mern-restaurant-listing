import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { can } from "../utils/policy.js";
import { validate } from "../middlewares/validate.js";
import { menuValidators } from "../validators/index.js";

import {
  createMenu,
  addMenuItems,
  getMenuByRestaurant,
  updateMenuItem,
  deleteMenuItem,
  updateMenuStatus,
  toggleItemAvailability,
  reorderMenuItems,
  deleteMenu,
  restoreMenu,
  getMenuById,
  getDeletedMenus,
  getMenuAuditLogs,
  hardDeleteMenu,
} from "../controllers/menu.controller.js";

const router = express.Router();

// =======================
// PROTECTED (ADMIN / MANAGER)
// =======================
router.post(
  "/",
  verifyToken,
  can("create", "menu"),
  validate(menuValidators.createMenuBody),
  createMenu,
); // create new menu

// =================================
// GET endpoints
// =================================
// public
router.get(
  "/restaurant/:restaurantId",
  validate(menuValidators.restaurantParam, "params"),
  validate(menuValidators.byRestaurantQuery, "query"),
  getMenuByRestaurant,
); // get all categories
router.get(
  "/deleted",
  verifyToken,
  can("readDeleted", "menu"),
  validate(menuValidators.deletedQuery, "query"),
  getDeletedMenus,
);

// =======================
// MENU ITEMS (PROTECTED)
// =======================
router.post(
  "/:menuId/items",
  verifyToken,
  can("addItem", "menu"),
  validate(menuValidators.menuParam, "params"),
  validate(menuValidators.addItemBody),
  addMenuItems,
); // create menu item
router.put(
  "/:menuId/items/:itemId",
  verifyToken,
  can("updateItem", "menu"),
  validate(menuValidators.itemParam, "params"),
  validate(menuValidators.updateItemBody),
  updateMenuItem,
); // udpate menu item
router.delete(
  "/:menuId/items/:itemId",
  verifyToken,
  can("deleteItem", "menu"),
  validate(menuValidators.itemParam, "params"),
  deleteMenuItem,
); // udpate menu item

router.patch(
  "/:menuId/items/:itemId/availability",
  verifyToken,
  can("toggleAvailability", "menu"),
  validate(menuValidators.itemParam, "params"),
  toggleItemAvailability,
); // toggle item availibility

// =======================
// MENU MANAGEMENT
// =======================

router.patch(
  "/:menuId/status",
  verifyToken,
  can("updateStatus", "menu"),
  validate(menuValidators.menuParam, "params"),
  validate(menuValidators.statusBody),
  updateMenuStatus,
);
router.put(
  "/:menuId/reorder",
  verifyToken,
  can("reorder", "menu"),
  validate(menuValidators.menuParam, "params"),
  validate(menuValidators.reorderBody),
  reorderMenuItems,
); // reorder menu items
router.patch(
  "/:menuId/restore",
  verifyToken,
  can("restore", "menu"),
  validate(menuValidators.menuParam, "params"),
  restoreMenu,
);
router.get(
  "/:menuId/audit",
  verifyToken,
  can("readAudit", "menu"),
  validate(menuValidators.menuParam, "params"),
  validate(menuValidators.auditQuery, "query"),
  getMenuAuditLogs,
);
router.delete(
  "/:menuId/hard",
  verifyToken,
  can("hardDelete", "menu"),
  validate(menuValidators.menuParam, "params"),
  hardDeleteMenu,
);
router.get(
  "/:menuId",
  verifyToken,
  can("readById", "menu"),
  validate(menuValidators.menuParam, "params"),
  getMenuById,
);
router.delete(
  "/:menuId",
  verifyToken,
  can("delete", "menu"),
  validate(menuValidators.menuParam, "params"),
  deleteMenu,
); // softdelete menu

export default router;
