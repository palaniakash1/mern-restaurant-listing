import express from "express";
import {
  test,
  createStoreManager,
  updateUser,
  deleteUser,
  deactivateUser,
  restoreUser,
  getAllUsers,
  getAvailableAdmins,
  getStoreManagers,
  assignStoreManagerToRestaurant,
  unassignStoreManager,
  changeStoreManagerOwner,
} from "../controllers/user.controller.js";
import { verifyToken } from "../utils/verifyUser.js";
import {
  verifyAdmin,
  verifyAdminOrSuperAdmin,
  verifySuperAdmin,
} from "../utils/roleGuards.js";

const router = express.Router();

// =================================
// test endpoint
// =================================
router.get("/test", verifyToken, verifySuperAdmin, test);

// =================================
// GET endpoints (LISTING)
// =================================
router.get("/", verifyToken, verifySuperAdmin, getAllUsers);
router.get("/admins", verifyToken, verifySuperAdmin, getAvailableAdmins);
router.get("/store-managers", verifyToken, verifyAdmin, getStoreManagers);

// =================================
// POST endpoints (ACTIONS)
// =================================
// (admin / superAdmin creates storeManager)
router.post("/", verifyToken, verifyAdminOrSuperAdmin, createStoreManager);

// =================================
// PUT endpoints (UPDATE)
// =================================
router.patch("/:id", verifyToken, updateUser);
// (hard delete – superAdmin or self)
router.delete("/:id", verifyToken, deleteUser);

// =================================
// PATCH endpoints (USER STATE)
// =================================

router.patch("/:id/deactivate", verifyToken, deactivateUser);

router.patch("/:id/restore", verifyToken, verifySuperAdmin, restoreUser);

// PATCH /api/users/:id/restaurant
router.patch(
  "/:id/restaurant",
  verifyToken,
  verifyAdminOrSuperAdmin,
  assignStoreManagerToRestaurant,
);
router.patch(
  "/:id/owner",
  verifyToken,
  verifySuperAdmin,
  changeStoreManagerOwner,
);

// =================================
// DELETE endpoints
// =================================

// DELETE /api/users/:id/restaurant
router.delete(
  "/:id/restaurant",
  verifyToken,
  verifyAdminOrSuperAdmin,
  unassignStoreManager,
);
// (hard delete – superAdmin or self)
// router.delete("/:id", verifyToken, deleteUser);

export default router;
