import AuditLog from "../models/auditLog.model.js";
import { errorHandler } from "../utils/error.js";

// ======================================================================
// GET AUDIT LOGS (SUPER ADMIN + ADMIN)
// ======================================================================
// GET /api/audit-logs

export const getAuditLogs = async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;

    if (!["admin", "superAdmin"].includes(role)) {
      return next(errorHandler(403, "Access denied"));
    }

    const {
      entityType,
      entityId,
      action,
      actorId,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    // ----------------------------
    // Whitelisted filters
    // ----------------------------
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (action) query.action = action;
    if (actorId) query.actorId = actorId;

    // ----------------------------
    // Role-based scoping
    // ----------------------------
    if (role === "admin") {
      // Admins can ONLY see logs where they are involved
      // (actor or entity owner — safe default)
      query.actorId = userId;
    }

    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(parseInt(limit), 50); // hard cap
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      page: pageNum,
      limit: limitNum,
      total,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};
