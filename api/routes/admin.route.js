import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { verifySuperAdmin } from "../utils/roleGuards.js";
import { createUserBySuperAdmin } from "../controllers/admin.controller.js";

const router = express.Router();

// =================================
// POST endpoints
// =================================
router.post("/admin", verifyToken, verifySuperAdmin, createUserBySuperAdmin);
export default router;
