import express from "express";
import {
  deleteUser,
  signout,
  test,
  updateUser,
  getAllusers,
  getAvailableAdmins,
} from "../controllers/user.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

router.get("/test", test);
router.put("/update/:userId", verifyToken, updateUser);
router.delete("/delete/:userId", verifyToken, deleteUser);
router.post("/signout", signout);
router.get("/all-users", verifyToken, getAllusers);
router.get("/available-admins", verifyToken, getAvailableAdmins);

export default router;
