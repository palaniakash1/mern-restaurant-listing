import Menu from "../models/menu.model.js";
import Restaurant from "../models/restaurant.model.js";
import Category from "../models/category.model.js";
import AuditLog from "../models/auditLog.model.js";
import { errorHandler } from "../utils/error.js";
import { withTransaction } from "../utils/withTransaction.js";

import { paginate } from "../utils/paginate.js";
import { logAudit } from "../utils/auditLogger.js";
import mongoose from "mongoose";

import {
  MAX_SEARCH_LENGTH,
  isValidObjectId,
  toIdString,
  getClientIp,
  escapeRegex,
} from "../utils/controllerHelpers.js";
import { getOrFetch } from "../utils/redisCache.js";


// ======================================
// Helper: role + ownership guard
// ======================================

const canManageMenu = (user, menuRestaurantId) => {
  if (user.role === "superAdmin") return true;
  if (
    ["admin", "storeManager"].includes(user.role) &&
    user.restaurantId?.toString() === menuRestaurantId.toString()
  ) {
    return true;
  }
  return false;
};

// ======================================
// Helper: MENU_STATE_MACHINE
// ======================================
const MENU_STATE_MACHINE = Object.freeze({
  draft: ["published", "blocked"],
  published: ["blocked"],
  blocked: [],
});

// ======================================
// CREATE MENU (one per category per restaurant)
// ======================================

export const createMenu = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { restaurantId, categoryId } = req.body;

      if (!restaurantId || !categoryId) {
        throw errorHandler(400, "restaurantId and categoryId are required");
      }

      if (!isValidObjectId(restaurantId)) {
        throw errorHandler(400, "Invalid restaurantId");
      }

      if (!isValidObjectId(categoryId)) {
        throw errorHandler(400, "Invalid categoryId");
      }

      // admin lock
      if (!["admin", "superAdmin"].includes(req.user.role)) {
        throw errorHandler(403, "not allowed");
      }

      // check if the restaurant exists and published
      const restaurant = await Restaurant.findById(restaurantId)
        .session(session)
        .select("-__v");
      if (!restaurant || restaurant.status !== "published") {
        throw errorHandler(400, "Restaurant must be published");
      }

      if (
        req.user.role === "admin" &&
        req.user.restaurantId?.toString() !== restaurantId
      ) {
        throw errorHandler(400, "not your restaurant");
      }

      const category = await Category.findById(categoryId)
        .session(session)
        .select("-__v");

      if (!category) {
        throw errorHandler(404, "Category not found");
      }

      if (!category.isActive) {
        throw errorHandler(400, "Category is inactive");
      }

      if (category.status !== "published") {
        throw errorHandler(400, "Category must be published");
      }

      // Generic category allowed
      if (!category.isGeneric) {
        if (category.restaurantId?.toString() !== restaurantId) {
          throw errorHandler(
            400,
            "Category does not belong to this restaurant",
          );
        }
      }

      const exists = await Menu.findOne({ restaurantId, categoryId })
        .session(session)
        .select("-__v");
      if (exists) {
        throw errorHandler(409, "Menu already exists for this category");
      }

      const menu = new Menu({ restaurantId, categoryId, items: [] });
      await menu.save({ session });

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "menu",
        entityId: menu._id,
        action: "CREATE",
        before: null,
        after: { restaurantId, categoryId },
        ipAddress: getClientIp(req),
      });
      return menu;
    });

    res.status(201).json({
      success: true,
      message: "Menu created successfully",
      data: result,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(409, "Menu already exists for this category"));
    }
    next(error);
  }
};

// ======================================
// add MENU ITEM
// ======================================

export const addMenuItems = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { menuId } = req.params;
      const item = req.body;

      if (!isValidObjectId(req.params.menuId)) {
        throw errorHandler(400, "Invalid ID format");
      }

      if (!item?.name || typeof item?.price !== "number" || item.price < 0) {
        throw errorHandler(
          400,
          "Valid item name and non-negative price are required",
        );
      }

      const menu = await Menu.findOne({ _id: menuId })
        .setOptions({ includeInactive: true })
        .session(session)
        .select("-__v");
      if (!menu || !menu.isActive) {
        throw errorHandler(404, "Menu not found");
      }

      if (!canManageMenu(req.user, menu.restaurantId)) {
        throw errorHandler(403, "not allowed");
      }

      const duplicate = menu.items.some(
        (i) => i.isActive && i.name.toLowerCase() === item.name.toLowerCase(),
      );

      if (duplicate) {
        throw errorHandler(409, "Item name already exists");
      }

      const maxOrder = Math.max(0, ...menu.items.map((i) => i.order));
      item.order = maxOrder + 1;

      menu.items.push(item);
      await menu.save({ session });

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "menu",
        entityId: menu._id,
        action: "UPDATE",
        before: null,
        after: { addeditem: item.name },
        ipAddress: getClientIp(req),
      });
      return menu.items;
    });
    res.status(201).json({
      success: true,
      message: "menu item created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================
// UPDATE MENU ITEM (index-based)
// ======================================

export const updateMenuItem = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { menuId, itemId } = req.params;
      const updates = req.body;

      if (!isValidObjectId(menuId) || !isValidObjectId(itemId)) {
        throw errorHandler(400, "Invalid ID format");
      }

      const menu = await Menu.findById(menuId).session(session).select("-__v");
      if (!menu) throw errorHandler(404, "Menu not found");
      if (!canManageMenu(req.user, menu.restaurantId)) {
        throw errorHandler(403, "Not allowed");
      }

      const item = menu.items.id(itemId);
      if (!item) throw errorHandler(404, "Item not found");

      if (!item.isActive) {
        throw errorHandler(400, "Item is deleted");
      }

      const allowed = ["name", "description", "price", "image"];

      const before = { ...item.toObject() };
      const safeUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => allowed.includes(key)),
      );
      if (Object.keys(safeUpdates).length === 0) {
        throw errorHandler(400, "No valid fields to update");
      }

      if (
        safeUpdates.price !== undefined &&
        (typeof safeUpdates.price !== "number" || safeUpdates.price < 0)
      ) {
        throw errorHandler(400, "price must be a non-negative number");
      }

      Object.assign(item, safeUpdates);
      await menu.save({ session });

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "menu",
        entityId: menu._id,
        action: "UPDATE",
        before,
        after: safeUpdates,
        ipAddress: getClientIp(req),
      });
      return item;
    });
    res.json({
      success: true,
      message: "menu items updated successfully!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================
// ITEM-LEVEL SOFT DELETE
// ======================================

export const deleteMenuItem = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { menuId, itemId } = req.params;

      if (!isValidObjectId(req.params.menuId) || !isValidObjectId(itemId)) {
        throw errorHandler(400, "Invalid ID format");
      }

      const menu = await Menu.findById(menuId).session(session).select("-__v");
      if (!menu) throw errorHandler(404, "Menu not found");

      if (!canManageMenu(req.user, menu.restaurantId)) {
        throw errorHandler(403, "Not allowed");
      }

      const item = menu.items.id(itemId);
      if (!item) throw errorHandler(404, "Item not found");

      item.isActive = false;
      item.deletedAt = new Date();
      item.deletedBy = req.user.id;

      await menu.save({ session });

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "menu",
        entityId: menu._id,
        action: "DELETE",
        before: { itemId },
        ipAddress: getClientIp(req),
      });

      return;
    });
    res.json({ success: true, message: "Menu item deleted" });
  } catch (error) {
    next(error);
  }
};

// ========================================================================================================================================================
// TOGGLE ITEM AVAILABILITY
// ========================================================================================================================================================

export const toggleItemAvailability = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { menuId, itemId } = req.params;

      if (!isValidObjectId(menuId) || !isValidObjectId(itemId)) {
        throw errorHandler(400, "Invalid ID format");
      }

      const menu = await Menu.findById(menuId).session(session).select("-__v");
      if (!menu || !menu.isActive) {
        throw errorHandler(404, "Menu not found");
      }

      if (!canManageMenu(req.user, menu.restaurantId)) {
        throw errorHandler(403, "Not allowed");
      }

      const item = menu?.items.id(itemId);
      if (!item) throw errorHandler(404, "Item not found");

      if (!item.isActive) {
        throw errorHandler(400, "Item is deleted");
      }

      const before = { isAvailable: item.isAvailable };

      item.isAvailable = !item.isAvailable;
      await menu.save({ session });

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "menu",
        entityId: menu._id,
        action: "STATUS_CHANGE",
        before,
        after: { isAvailable: item.isAvailable },
        ipAddress: getClientIp(req),
      });

      return item.isAvailable;
    });
    res.json({
      success: true,
      message: "item toggled",
      isAvailable: result,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================
// REORDER MENU ITEMS (ENTERPRISE SAFE)
// ======================================

export const reorderMenuItems = async (req, res, next) => {
  try {
    await withTransaction(async (session) => {
      const { menuId } = req.params;
      const { order } = req.body;

      if (!isValidObjectId(menuId)) {
        throw errorHandler(400, "Invalid menuId format");
      }

      if (!Array.isArray(order) || order.length === 0) {
        throw errorHandler(400, "Order must be a non-empty array");
      }

      const menu = await Menu.findById(menuId).session(session).select("-__v");

      if (!menu || !menu.isActive) {
        throw errorHandler(404, "Menu not found");
      }

      if (!canManageMenu(req.user, menu.restaurantId)) {
        throw errorHandler(403, "Not allowed");
      }

      const activeItems = menu.items.filter((i) => i.isActive);

      if (order.length !== activeItems.length) {
        throw errorHandler(
          400,
          "Reorder payload must include all active items",
        );
      }

      // ---------- Validate itemIds ----------
      const seenIds = new Set();
      const seenOrders = new Set();

      for (const entry of order) {
        const { itemId, order: position } = entry;

        if (!isValidObjectId(itemId)) {
          throw errorHandler(400, `Invalid itemId format: ${itemId}`);
        }

        if (typeof position !== "number" || position <= 0) {
          throw errorHandler(400, "Order must be a positive number");
        }

        if (seenIds.has(itemId)) {
          throw errorHandler(400, "Duplicate itemIds in payload");
        }

        if (seenOrders.has(position)) {
          throw errorHandler(400, "Duplicate order values not allowed");
        }

        seenIds.add(itemId);
        seenOrders.add(position);

        const item = menu.items.id(itemId);

        if (!item) {
          throw errorHandler(400, "Item does not belong to this menu");
        }

        if (!item.isActive) {
          throw errorHandler(400, "Cannot reorder deleted items");
        }
      }

      // ---------- Validate sequential order ----------
      const expectedOrders = Array.from(
        { length: activeItems.length },
        (_, i) => i + 1,
      );

      const providedOrders = [...seenOrders].sort((a, b) => a - b);

      if (
        expectedOrders.length !== providedOrders.length ||
        !expectedOrders.every((val, idx) => val === providedOrders[idx])
      ) {
        throw errorHandler(
          400,
          `Order must be sequential from 1 to ${activeItems.length}`,
        );
      }

      // ---------- Apply reorder ----------
      for (const entry of order) {
        const item = menu.items.id(entry.itemId);
        item.order = entry.order;
      }

      await menu.save({ session });

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "menu",
        entityId: menu._id,
        action: "UPDATE",
        before: null,
        after: { reorderedItems: order.length },
        ipAddress: getClientIp(req),
      });
    });

    res.json({ success: true, message: "Reordered successfully" });
  } catch (error) {
    next(error);
  }
};

// updateMenuStatus
export const updateMenuStatus = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { menuId } = req.params;
      const { status } = req.body;

      if (!isValidObjectId(menuId)) {
        throw errorHandler(400, "Invalid menu ID");
      }

      if (!["draft", "published", "blocked"].includes(status)) {
        throw errorHandler(400, "invalid status");
      }

      const menu = await Menu.findById(menuId).session(session).select("-__v");
      if (!menu) throw errorHandler(404, "Menu not found");
      if (!menu.isActive) throw errorHandler(400, "Menu is inactive");

      if (!canManageMenu(req.user, menu.restaurantId)) {
        throw errorHandler(403, "Not allowed");
      }

      if (!MENU_STATE_MACHINE[menu.status].includes(status)) {
        throw errorHandler(400, "Invalid status transition");
      }

      if (status === "published") {
        const restaurant = await Restaurant.findById(menu.restaurantId)
          .session(session)
          .select("-__v");
        const category = await Category.findById(menu.categoryId)
          .session(session)
          .select("-__v");

        if (!restaurant || restaurant.status !== "published") {
          throw errorHandler(400, "Restaurant not published");
        }

        if (!category || category.status !== "published") {
          throw errorHandler(400, "Category not published");
        }

        const activeItems = menu.items.filter(
          (i) => i.isActive && i.isAvailable,
        );

        if (activeItems.length === 0) {
          throw errorHandler(400, "Menu must have active items");
        }
      }

      const before = { status: menu.status };

      menu.status = status;
      await menu.save({ session });

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "menu",
        entityId: menu._id,
        action: "STATUS_CHANGE",
        before,
        after: { status },
        ipAddress: getClientIp(req),
      });
      return menu;
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ======================================
//  DELETE MENU (soft)
// ======================================

export const deleteMenu = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { menuId } = req.params;

      if (!isValidObjectId(req.params.menuId)) {
        throw errorHandler(400, "Invalid ID format");
      }

      const menu = await Menu.findById(menuId).session(session).select("-__v");
      if (!menu) throw errorHandler(404, "Menu not found");

      if (
        req.user.role !== "superAdmin" &&
        req.user.restaurantId?.toString() !== menu.restaurantId?.toString()
      ) {
        throw errorHandler(403, "not allowed");
      }

      await menu.softDelete(session, req.user.id);

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "menu",
        entityId: menu._id,
        action: "STATUS_CHANGE",
        before: { isActive: true },
        after: { isActive: false },
        ipAddress: getClientIp(req),
      });
    });
    res.json({
      success: true,
      message: "Menu disabled (soft delete)",
    });
  } catch (error) {
    next(error);
  }
};

// ==============================================
// RESTORE MENU
// ==============================================

export const restoreMenu = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { menuId } = req.params;

      if (!isValidObjectId(menuId)) {
        throw errorHandler(400, "Invalid ID format");
      }

      const menuObjectId = new mongoose.Types.ObjectId(menuId);
      const existing = await Menu.collection.findOne(
        { _id: menuObjectId },
        { session },
      );
      if (!existing) throw errorHandler(404, "Menu not found");

      if (existing.isActive) {
        throw errorHandler(400, "Menu already active");
      }
      if (!existing.isActive) {
        const restaurant = await Restaurant.findById(existing.restaurantId)
          .session(session)
          .select("-__v");

        if (!restaurant || !restaurant.isActive) {
          throw errorHandler(
            400,
            "Cannot restore menu for inactive restaurant",
          );
        }
      }

      if (!canManageMenu(req.user, existing.restaurantId)) {
        throw errorHandler(403, "Not allowed");
      }

      await Menu.collection.updateOne(
        { _id: menuObjectId },
        {
          $set: {
            isActive: true,
            restoredAt: new Date(),
            restoredBy: new mongoose.Types.ObjectId(req.user.id),
          },
        },
        { session },
      );

      const menu = await Menu.findById(menuObjectId).session(session).select("-__v");

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "menu",
        entityId: menu._id,
        action: "RESTORE",
        before: { isActive: false },
        after: { isActive: true },
        ipAddress: getClientIp(req),
      });

      return;
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getMenuById = async (req, res, next) => {
  try {
    const { menuId } = req.params;
    if (!isValidObjectId(menuId)) {
      throw errorHandler(400, "Invalid ID format");
    }

    const menu = await Menu.findById(menuId)
      .setOptions({ includeInactive: true })
      .populate("categoryId", "name slug status isActive")
      .select("-__v")
      .lean();
    if (!menu) throw errorHandler(404, "Menu not found");

    if (!canManageMenu(req.user, menu.restaurantId)) {
      throw errorHandler(403, "Not allowed");
    }

    res.status(200).json({
      success: true,
      data: menu,
    });
  } catch (error) {
    next(error);
  }
};

export const getDeletedMenus = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, restaurantId, search = "" } = req.query;

    if (restaurantId && !isValidObjectId(restaurantId)) {
      throw errorHandler(400, "Invalid restaurantId format");
    }

    const safeSearch = String(search).trim().slice(0, MAX_SEARCH_LENGTH);
    const filter = {
      isActive: false,
      ...(restaurantId ? { restaurantId } : {}),
    };

    if (req.user.role !== "superAdmin") {
      filter.restaurantId = req.user.restaurantId;
    }

    if (safeSearch) {
      filter.$or = [
        { "items.name": { $regex: escapeRegex(safeSearch), $options: "i" } },
      ];
    }

    const total = await Menu.countDocuments(filter).setOptions({
      includeInactive: true,
    });
    const pagination = paginate({ page, limit, total });
    const data = await Menu.find(filter)
      .setOptions({ includeInactive: true })
      .populate("categoryId", "name slug")
      .select("-__v")
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      ...pagination,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getMenuAuditLogs = async (req, res, next) => {
  try {
    const { menuId } = req.params;
    if (!isValidObjectId(menuId)) {
      throw errorHandler(400, "Invalid ID format");
    }

    const menu = await Menu.findById(menuId)
      .setOptions({ includeInactive: true })
      .select("restaurantId")
      .lean();
    if (!menu) throw errorHandler(404, "Menu not found");

    if (!canManageMenu(req.user, menu.restaurantId)) {
      throw errorHandler(403, "Not allowed");
    }

    const {
      page = 1,
      limit = 20,
      action,
      actorId,
      from,
      to,
      sort = "desc",
    } = req.query;

    const filter = {
      entityType: "menu",
      entityId: menuId,
    };
    if (action) filter.action = action;
    if (actorId) {
      if (!isValidObjectId(actorId)) {
        throw errorHandler(400, "Invalid actorId format");
      }
      filter.actorId = actorId;
    }
    if (from || to) {
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;
      if (
        (from && Number.isNaN(fromDate.getTime())) ||
        (to && Number.isNaN(toDate.getTime()))
      ) {
        throw errorHandler(400, "Invalid date filter. Use ISO date values.");
      }
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = fromDate;
      if (toDate) filter.createdAt.$lte = toDate;
    }

    const total = await AuditLog.countDocuments(filter);
    const pagination = paginate({ page, limit, total });
    const data = await AuditLog.find(filter)
      .sort({ createdAt: sort === "asc" ? 1 : -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    res.status(200).json({
      success: true,
      ...pagination,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const hardDeleteMenu = async (req, res, next) => {
  try {
    const { menuId } = req.params;
    if (!isValidObjectId(menuId)) {
      throw errorHandler(400, "Invalid ID format");
    }

    if (req.user.role !== "superAdmin") {
      throw errorHandler(403, "Only superAdmin");
    }

    const result = await withTransaction(async (session) => {
      const menu = await Menu.findById(menuId)
        .session(session)
        .setOptions({ includeInactive: true });
      if (!menu) throw errorHandler(404, "Menu not found");

      const deleted = await Menu.findByIdAndDelete(menuId).session(session);

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "menu",
        entityId: menuId,
        action: "DELETE",
        before: { isActive: menu.isActive, status: menu.status },
        after: null,
        ipAddress: getClientIp(req),
      });

      return deleted;
    });

    res.status(200).json({
      success: true,
      message: "Menu permanently deleted",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ==============================================
// PUBLIC MENU (published + active only) - with caching
// ==============================================

export const getMenuByRestaurant = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 10, search = "", sort = "desc" } = req.query;
    
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const sortDirection = sort === "asc" ? 1 : -1;
    
    if (!isValidObjectId(restaurantId)) {
      throw errorHandler(400, "Invalid restaurantId format");
    }
    const safeSearch = String(search).trim().slice(0, MAX_SEARCH_LENGTH);

    // Cache key based on request params
    const cacheKey = `menu:restaurant:${restaurantId}:${pageNum}:${limitNum}:${safeSearch}:${sort}`;

    const cachedData = await getOrFetch(
      cacheKey,
      async () => {
        const filter = {
          restaurantId,
          isActive: true,
          status: "published",
        };

        if (safeSearch) {
          filter["items.name"] = { $regex: escapeRegex(safeSearch), $options: "i" };
        }

        const total = await Menu.countDocuments(filter);
        const pagination = paginate({ page: pageNum, limit: limitNum, total });

        const menus = await Menu.find(filter)
          .populate("categoryId", "name slug item")
          .select("-__v")
          .skip(pagination.skip)
          .limit(pagination.limit)
          .sort({ updatedAt: sortDirection })
          .lean();

        menus.forEach((menu) => {
          menu.items = menu.items
            .filter((i) => i.isActive && i.isAvailable)
            .sort((a, b) => a.order - b.order);
        });

        return {
          success: true,
          message: "viewing menu",
          ...pagination,
          total,
          data: menus,
        };
      },
      300 // Cache for 5 minutes
    );

    res.status(200).json(cachedData);
  } catch (error) {
    next(error);
  }
};
