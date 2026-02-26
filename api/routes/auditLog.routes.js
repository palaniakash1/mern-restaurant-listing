import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { getAuditLogs } from "../controllers/auditLog.controller.js";
import { can } from "../utils/policy.js";
import { validate } from "../middlewares/validate.js";
import { auditValidators } from "../validators/index.js";

const router = express.Router();

// =================================
// GET endpoints
// =================================
router.get(
  "/",
  verifyToken,
  can("read", "audit"),
  validate(auditValidators.listQuery, "query"),
  getAuditLogs,
);

export default router;
