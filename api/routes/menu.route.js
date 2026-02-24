import express from "express";
import { verifyToken } from "../utils/verifyUser.js";

import {
  verifyAdmin,
  verifyAdminOrSuperAdmin,
  verifySuperAdmin,
} from "../utils/roleGuards.js";

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
router.post("/", verifyToken, createMenu); // create new menu

// =================================
// GET endpoints
// =================================
// public
router.get("/restaurant/:restaurantId", getMenuByRestaurant); // get all categories
router.get("/deleted", verifyToken, getDeletedMenus);

// =======================
// MENU ITEMS (PROTECTED)
// =======================
router.post("/:menuId/items", verifyToken, addMenuItems); // create menu item
router.put("/:menuId/items/:itemId", verifyToken, updateMenuItem); // udpate menu item
router.delete("/:menuId/items/:itemId", verifyToken, deleteMenuItem); // udpate menu item

router.patch(
  "/:menuId/items/:itemId/availability",
  verifyToken,
  toggleItemAvailability,
); // toggle item availibility

// =======================
// MENU MANAGEMENT
// =======================

router.patch("/:menuId/status", verifyToken, updateMenuStatus);
router.put("/:menuId/reorder", verifyToken, reorderMenuItems); // reorder menu items
router.patch("/:menuId/restore", verifyToken, restoreMenu);
router.get("/:menuId/audit", verifyToken, getMenuAuditLogs);
router.delete(
  "/:menuId/hard",
  verifyToken,
  verifyAdminOrSuperAdmin,
  hardDeleteMenu,
);
router.get("/:menuId", verifyToken, getMenuById);
router.delete("/:menuId", verifyToken, deleteMenu); // softdelete menu

export default router;
