import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { getAuditLogs } from "../controllers/auditLog.controller.js";
import { verifyAdminOrSuperAdmin } from "../utils/roleGuards.js";

const router = express.Router();

// =================================
// GET endpoints
// =================================
router.get("/", verifyToken, verifyAdminOrSuperAdmin, getAuditLogs);

export default router;
