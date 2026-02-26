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
import { validate } from "../middlewares/validate.js";
import { userValidators } from "../validators/index.js";

const router = express.Router();

router.get("/test", verifyToken, can("test", "user"), test);

router.get(
  "/",
  verifyToken,
  can("listAll", "user"),
  validate(userValidators.listQuery, "query"),
  getAllUsers,
);
router.get(
  "/admins",
  verifyToken,
  can("listAdmins", "user"),
  validate(userValidators.listQuery, "query"),
  getAvailableAdmins,
);
router.get(
  "/store-managers",
  verifyToken,
  can("listStoreManagers", "user"),
  validate(userValidators.storeManagersQuery, "query"),
  getStoreManagers,
);

router.post(
  "/",
  verifyToken,
  can("createStoreManager", "user"),
  validate(userValidators.createStoreManager),
  createStoreManager,
);

router.patch(
  "/:id",
  verifyToken,
  canAny(["updateAny", "updateSelf"], "user"),
  validate(userValidators.idParam, "params"),
  validate(userValidators.updateUser),
  updateUser,
);
router.delete(
  "/:id",
  verifyToken,
  canAny(["deleteAny", "deleteSelf"], "user"),
  validate(userValidators.idParam, "params"),
  deleteUser,
);

router.patch(
  "/:id/deactivate",
  verifyToken,
  canAny(["deactivateAny", "deactivateSelf"], "user"),
  validate(userValidators.idParam, "params"),
  deactivateUser,
);

router.patch(
  "/:id/restore",
  verifyToken,
  can("restoreAny", "user"),
  validate(userValidators.idParam, "params"),
  restoreUser,
);

router.patch(
  "/:id/restaurant",
  verifyToken,
  can("assignStoreManager", "user"),
  validate(userValidators.idParam, "params"),
  validate(userValidators.assignStoreManager),
  assignStoreManagerToRestaurant,
);
router.patch(
  "/:id/owner",
  verifyToken,
  can("changeStoreManagerOwner", "user"),
  validate(userValidators.idParam, "params"),
  validate(userValidators.changeStoreManagerOwner),
  changeStoreManagerOwner,
);

router.delete(
  "/:id/restaurant",
  verifyToken,
  can("unassignStoreManager", "user"),
  validate(userValidators.idParam, "params"),
  unassignStoreManager,
);

export default router;
