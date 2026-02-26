import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { can } from "../utils/policy.js";

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
router.post("/", verifyToken, can("create", "menu"), createMenu); // create new menu

// =================================
// GET endpoints
// =================================
// public
router.get("/restaurant/:restaurantId", getMenuByRestaurant); // get all categories
router.get("/deleted", verifyToken, can("readDeleted", "menu"), getDeletedMenus);

// =======================
// MENU ITEMS (PROTECTED)
// =======================
router.post("/:menuId/items", verifyToken, can("addItem", "menu"), addMenuItems); // create menu item
router.put("/:menuId/items/:itemId", verifyToken, can("updateItem", "menu"), updateMenuItem); // udpate menu item
router.delete("/:menuId/items/:itemId", verifyToken, can("deleteItem", "menu"), deleteMenuItem); // udpate menu item

router.patch(
  "/:menuId/items/:itemId/availability",
  verifyToken,
  can("toggleAvailability", "menu"),
  toggleItemAvailability,
); // toggle item availibility

// =======================
// MENU MANAGEMENT
// =======================

router.patch("/:menuId/status", verifyToken, can("updateStatus", "menu"), updateMenuStatus);
router.put("/:menuId/reorder", verifyToken, can("reorder", "menu"), reorderMenuItems); // reorder menu items
router.patch("/:menuId/restore", verifyToken, can("restore", "menu"), restoreMenu);
router.get("/:menuId/audit", verifyToken, can("readAudit", "menu"), getMenuAuditLogs);
router.delete(
  "/:menuId/hard",
  verifyToken,
  can("hardDelete", "menu"),
  hardDeleteMenu,
);
router.get("/:menuId", verifyToken, can("readById", "menu"), getMenuById);
router.delete("/:menuId", verifyToken, can("delete", "menu"), deleteMenu); // softdelete menu

export default router;
