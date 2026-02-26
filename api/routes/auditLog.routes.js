import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { getAuditLogs } from "../controllers/auditLog.controller.js";
import { can } from "../utils/policy.js";

const router = express.Router();

// =================================
// GET endpoints
// =================================
router.get("/", verifyToken, can("read", "audit"), getAuditLogs);

export default router;
