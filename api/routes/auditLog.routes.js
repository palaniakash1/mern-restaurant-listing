import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { getAuditLogs } from "../controllers/auditLog.controller.js";
const router = express.Router();

router.get("/", verifyToken, getAuditLogs);

export default router;
