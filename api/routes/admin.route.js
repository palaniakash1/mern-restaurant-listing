import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { verifySuperAdmin } from "../utils/roleGuards.js";
import { createUserBySuperAdmin } from "../controllers/admin.controller.js";

const router = express.Router();

// ===============================================================================
// 🔷 Admin Routes — SuperAdmin privileged operations
// ===============================================================================
// Scope:
// - High-privilege administrative actions
// - No public or self-service access
//
// Security:
// - verifyToken → authentication
// - verifySuperAdmin → authorization
//
// ===============================================================================

// ===============================================================================
// 🔷 POST /api/admin/users
// ===============================================================================
// Purpose:
// - Create Admin or StoreManager directly by SuperAdmin
//
// Protected by:
// - verifyToken
// - verifySuperAdmin
//
// ===============================================================================

router.post("/users", verifyToken, verifySuperAdmin, createUserBySuperAdmin);
export default router;
