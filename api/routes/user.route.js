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
import { can, canAny } from "../utils/policy.js";

const router = express.Router();

router.get("/test", verifyToken, can("test", "user"), test);

router.get("/", verifyToken, can("listAll", "user"), getAllUsers);
router.get("/admins", verifyToken, can("listAdmins", "user"), getAvailableAdmins);
router.get(
  "/store-managers",
  verifyToken,
  can("listStoreManagers", "user"),
  getStoreManagers,
);

router.post("/", verifyToken, can("createStoreManager", "user"), createStoreManager);

router.patch(
  "/:id",
  verifyToken,
  canAny(["updateAny", "updateSelf"], "user"),
  updateUser,
);
router.delete(
  "/:id",
  verifyToken,
  canAny(["deleteAny", "deleteSelf"], "user"),
  deleteUser,
);

router.patch(
  "/:id/deactivate",
  verifyToken,
  canAny(["deactivateAny", "deactivateSelf"], "user"),
  deactivateUser,
);

router.patch("/:id/restore", verifyToken, can("restoreAny", "user"), restoreUser);

router.patch(
  "/:id/restaurant",
  verifyToken,
  can("assignStoreManager", "user"),
  assignStoreManagerToRestaurant,
);
router.patch(
  "/:id/owner",
  verifyToken,
  can("changeStoreManagerOwner", "user"),
  changeStoreManagerOwner,
);

router.delete(
  "/:id/restaurant",
  verifyToken,
  can("unassignStoreManager", "user"),
  unassignStoreManager,
);

export default router;
