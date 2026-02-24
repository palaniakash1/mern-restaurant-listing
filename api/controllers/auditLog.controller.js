import AuditLog from "../models/auditLog.model.js";
import User from "../models/user.model.js";
import Menu from "../models/menu.model.js";
import Category from "../models/category.model.js";
import { errorHandler } from "../utils/error.js";
import { paginate } from "../utils/paginate.js";

// ======================================================================
// GET AUDIT LOGS (SUPER ADMIN + ADMIN)
// ======================================================================
// GET /api/auditlogs
export const getAuditLogs = async (req, res, next) => {
  try {
    const { role, id: userId, restaurantId } = req.user;

    const {
      entityType,
      entityId,
      action,
      actorId,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    // ----------------------------
    // SuperAdmin: full access
    // ----------------------------
    if (role === "superAdmin") {
      if (entityType) filter.entityType = entityType;
      if (entityId) filter.entityId = entityId;
      if (action) filter.action = action;
      if (actorId) filter.actorId = actorId;
    }

    // ----------------------------
    // Admin: restaurant-scoped
    // ----------------------------
    // DO NOT apply actorId filter for admins
    // Admin: never trust actorId from query
    else if (role === "admin") {
      if (!restaurantId) {
        // Admin without restaurant → no audit scope
        return res.status(200).json({
          success: true,
          page: 1,
          limit,
          total: 0,
          data: [],
        });
      }

      // Find storeManagers under this restaurant
      const storeManagerIds = await User.find({
        role: "storeManager",
        restaurantId,
      }).distinct("_id");
      const menuIds = await Menu.find({ restaurantId })
        .setOptions({ includeInactive: true })
        .distinct("_id");
      const categoryIds = await Category.find({ restaurantId })
        .setOptions({ includeInactive: true })
        .distinct("_id");

      filter.$or = [
        // Admin’s own actions
        { actorId: userId },

        // Restaurant actions
        {
          entityType: "restaurant",
          entityId: restaurantId,
        },

        // StoreManagers under this restaurant
        {
          entityType: "user",
          entityId: { $in: storeManagerIds },
        },
        // Menu & category actions belonging to this restaurant
        {
          entityType: { $in: ["menu", "category"] },
          entityId: { $in: [...menuIds, ...categoryIds] },
        },
      ];

      // Optional narrowing (safe)
      if (entityType) filter.entityType = entityType;
      if (action) filter.action = action;
    }

    // =========================================================
    // UNAUTHORIZED ROLES
    // =========================================================
    else {
      return next(errorHandler(403, "Access denied"));
    }

    // ----------------------------
    // Pagination
    // ----------------------------

    const total = await AuditLog.countDocuments(filter);
    const pagination = paginate({ page, limit, total });

    // ----------------------------
    // Data query
    // ----------------------------
    const logs = await AuditLog.find(filter)
      .populate("actorId", "userName role")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    res.status(200).json({
      success: true,
      message: "Audit logs fetched successfully",
      ...pagination,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};
