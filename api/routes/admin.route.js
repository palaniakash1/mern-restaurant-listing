import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { verifySuperAdmin } from "../utils/verifySuperAdmin.js";
import { createUserBySuperAdmin } from "../controllers/admin.controller.js";

const router = express.Router();
router.post(
  "/create-user",
  verifyToken,
  verifySuperAdmin,
  createUserBySuperAdmin
);
export default router;
