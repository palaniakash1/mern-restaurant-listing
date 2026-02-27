import { errorHandler } from "../utils/error.js";
import Category from "../models/category.model.js";
import Restaurant from "../models/restaurant.model.js";
import Menu from "../models/menu.model.js";
import AuditLog from "../models/auditLog.model.js";
import { diffObject } from "../utils/diff.js";
import { paginate } from "../utils/paginate.js";
import { logAudit } from "../utils/auditLogger.js";
import { withTransaction } from "../utils/withTransaction.js";
import mongoose from "mongoose";
import { generateUniqueSlug } from "../utils/generateUniqueSlug.js";

import {
  MAX_SEARCH_LENGTH,
  MAX_EXPORT_LIMIT,
  toIdString,
  isValidObjectId,
  getClientIp,
  escapeRegex,
} from "../utils/controllerHelpers.js";
import { getOrFetch } from "../utils/redisCache.js";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const bulkReorderIdempotencyStore = new Map();


const buildScopedSlugForUpdate = async ({ category, name, session }) => {
  const baseSlug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const scope = category.isGeneric
    ? { isGeneric: true }
    : { restaurantId: category.restaurantId };

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await Category.findOne({
      slug,
      ...scope,
      _id: { $ne: category._id },
    })
      .session(session)
      .lean();

    if (!existing) return slug;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

const cleanupIdempotencyStore = () => {
  const now = Date.now();
  for (const [key, entry] of bulkReorderIdempotencyStore.entries()) {
    if (entry.expiresAt <= now) {
      bulkReorderIdempotencyStore.delete(key);
    }
  }
};

const validateReorderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw errorHandler(400, "Invalid Payload");
  }

  const seenIds = new Set();
  for (const cat of items) {
    if (
      !cat.id ||
      !isValidObjectId(cat.id) ||
      !Number.isInteger(cat.order) ||
      cat.order < 0
    ) {
      throw errorHandler(
        400,
        "Each category must have valid id and non-negative integer order",
      );
    }

    if (seenIds.has(cat.id)) {
      throw errorHandler(400, "Duplicate category id in payload");
    }
    seenIds.add(cat.id);
  }
};

const toCsvValue = (value) => {
  if (value === null || value === undefined) return "";
  const serialized =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${serialized.replace(/"/g, '""')}"`;
};

// ===============================================================================
// 🔷 POST /api/categories — Create Category
// ===============================================================================
// Purpose:
// - Create a new category (generic or restaurant-specific)
//
// Business Rules:
// - Only SuperAdmin can create generic categories
// - Admin can create categories only for their own restaurant
// - Restaurant must be in "published" state before attaching categories
// - Slug must be unique within scope (global or per restaurant)
//
// What Happens:
// - Slug auto-generated from name
// - Duplicate slug prevented
// - Category persisted atomically
// - Audit trail recorded
//
// Access Control:
// - Admin (own restaurant only)
// - SuperAdmin (platform-wide)
//
// System Guarantees:
// - Fully transactional
// - Atomic write operation
// - Ownership enforced
// - Referential integrity preserved
//
// Real-World Usage:
// - Adding new menu section
// - Platform-level category standardization
//
// ===============================================================================
export const createCategory = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(errorHandler(401, "Unauthorized"));
    }

    const { name, isGeneric, restaurantId, order = 0 } = req.body;
    const normalizedName = String(name || "").trim();

    if (!normalizedName) {
      return next(errorHandler(400, "Category name is required"));
    }

    const result = await withTransaction(async (session) => {
      if (isGeneric && req.user.role !== "superAdmin") {
        throw errorHandler(
          403,
          "Only superAdmin can create generic categories",
        );
      }

      if (!isGeneric && !restaurantId) {
        throw errorHandler(400, "restaurantId is required");
      }

      if (!isGeneric) {
        if (!isValidObjectId(restaurantId)) {
          throw errorHandler(400, "Invalid restaurantId format");
        }

        const restaurant =
          await Restaurant.findById(restaurantId).session(session);

        if (!restaurant || restaurant.status !== "published") {
          throw errorHandler(400, "Restaurant must be published");
        }

        if (
          req.user.role === "admin" &&
          toIdString(req.user.restaurantId) !== toIdString(restaurantId)
        ) {
          throw errorHandler(403, "Not your restaurant");
        }
      }

      const scope = isGeneric ? { isGeneric: true } : { restaurantId };

      const slug = await generateUniqueSlug({
        model: Category,
        baseValue: normalizedName,
        scope,
        session,
      });

      const category = await Category.create(
        [
          {
            name: normalizedName,
            slug,
            isGeneric,
            restaurantId: isGeneric ? null : restaurantId,
            order,
          },
        ],
        { session },
      );

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "category",
        entityId: category[0]._id,
        action: "CREATE",
        before: null,
        after: category[0].toObject(),
        ipAddress: getClientIp(req),
      });

      return category[0];
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/categories/:id — Update Category
// ===============================================================================
// Purpose:
// - Modify category attributes (name, order, activation)
//
// Business Rules:
// - Generic categories editable only by SuperAdmin
// - Restaurant categories editable only by owning Admin
// - At least one field must be provided for update
// - Slug regenerated if name changes
//
// What Happens:
// - Category fields updated
// - Changes diffed for audit tracking
// - Audit entry recorded if changes detected
//
// Access Control:
// - Admin (own restaurant only)
// - SuperAdmin (all categories)
//
// System Guarantees:
// - Fully transactional
// - Atomic state change
// - Ownership validated
// - Change tracking preserved
//
// Real-World Usage:
// - Renaming menu sections
// - Reordering display priority
// - Temporarily disabling category
//
// ===============================================================================

export const updateCategory = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { name, order, isActive } = req.body;
      const normalizedName =
        name === undefined ? undefined : String(name).trim();

      if (!isValidObjectId(req.params.id)) {
        throw errorHandler(400, "Invalid ID format");
      }

      // check for updates
      if (
        normalizedName === undefined &&
        order === undefined &&
        isActive === undefined
      ) {
        throw errorHandler(400, "nothing to update");
      }
      if (normalizedName !== undefined && !normalizedName) {
        throw errorHandler(400, "Category name cannot be empty");
      }

      // fetch the category
      const category = await Category.findOne({ _id: req.params.id })
        .setOptions({ includeInactive: true })
        .session(session);
      if (!category) {
        throw errorHandler(404, "Category not found");
      }

      const before = category.toObject();

      // Generic category → only superAdmin
      if (category.isGeneric && req.user.role !== "superAdmin") {
        throw errorHandler(
          403,
          "Only superAdmin can modify generic categories",
        );
      }

      // Restaurant category → admin must own it
      if (
        !category.isGeneric &&
        req.user.role === "admin" &&
        toIdString(category.restaurantId) !== toIdString(req.user.restaurantId)
      ) {
        throw errorHandler(403, "You can update only your restaurant category");
      }

      // apply updates
      if (normalizedName !== undefined) {
        category.name = normalizedName;
        category.slug = await buildScopedSlugForUpdate({
          category,
          name: normalizedName,
          session,
        });
      }

      if (order !== undefined) category.order = order;
      if (isActive !== undefined) category.isActive = isActive;

      await category.save({ session });

      const after = category.toObject();
      const diff = diffObject(before, after, [
        "name",
        "slug",
        "order",
        "isActive",
      ]);

      if (diff && Object.keys(diff).length > 0) {
        await logAudit({
          actorId: req.user.id,
          actorRole: req.user.role,
          entityType: "category",
          entityId: category._id,
          action: isActive !== undefined ? "STATUS_CHANGE" : "UPDATE",
          before,
          after: diff,
          ipAddress: getClientIp(req),
        });
      }
      return category;
    });

    res.status(200).json({
      success: true,
      message: "Category Updated Successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 DELETE /api/categories/:id — Soft Delete Category
// ===============================================================================
// Purpose:
// - Deactivate a category without permanently removing it
//
// Business Rules:
// - Category cannot be deleted if linked to active menus
// - Generic categories deletable only by SuperAdmin
// - Admin can delete only categories of their restaurant
//
// What Happens:
// - isActive → false
// - Audit trail recorded
//
// Access Control:
// - Admin (own restaurant only)
// - SuperAdmin (all categories)
//
// System Guarantees:
// - Fully transactional
// - Referential integrity enforced
// - No data loss
// - Audit logged
//
// Real-World Usage:
// - Temporarily hiding category from public
// - Moderation action
//
// ===============================================================================

// softdelete
export const deleteCategory = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      if (!isValidObjectId(req.params.id)) {
        throw errorHandler(400, "Invalid ID format");
      }

      const category = await Category.findById(req.params.id).session(session);
      if (!category) throw errorHandler(404, "category not found");

      //Integrity check
      const activeMenu = await Menu.findOne({
        categoryId: category._id,
        isActive: true,
      }).session(session);

      if (activeMenu) {
        throw errorHandler(400, "Cannot delete category linked to active menu");
      }

      if (category.isGeneric && req.user.role !== "superAdmin") {
        throw errorHandler(403, "only superAdmin can delete generic category");
      }

      if (
        !category.isGeneric &&
        req.user.role === "admin" &&
        toIdString(category.restaurantId) !== toIdString(req.user.restaurantId)
      ) {
        throw errorHandler(403, "not allowed");
      }

      const before = {
        isActive: category.isActive,
      };

      await category.softDelete(session, req.user.id);

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "category",
        entityId: category._id,
        action: "STATUS_CHANGE",
        before,
        after: { isActive: false },
        ipAddress: getClientIp(req),
      });

      return category;
    });

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/categories/reorder — Reorder Categories
// ===============================================================================
// Purpose:
// - Update display order of multiple categories
//
// Business Rules:
// - Payload must be non-empty array
// - Each item must contain valid id and numeric order
// - Admin can reorder only their own restaurant categories
//
// What Happens:
// - Bulk update executed
// - Matched count validated
// - Audit log recorded
//
// Access Control:
// - Admin (own restaurant only)
// - SuperAdmin (all categories)
//
// System Guarantees:
// - Fully transactional
// - Atomic bulk operation
// - Ownership enforced
//
// Real-World Usage:
// - Drag-and-drop UI reorder
// - Dynamic display prioritization
//
// ===============================================================================

export const reorderCategories = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      // Payload must be an array
      validateReorderItems(req.body);

      // 4️⃣ Build bulk operations (scoped to restaurant)
      const bulkOps = req.body.map((cat) => ({
        updateOne: {
          filter: {
            _id: cat.id,
            ...(req.user.role === "admin"
              ? { restaurantId: req.user.restaurantId }
              : {}),
          },
          update: {
            $set: { order: cat.order },
          },
        },
      }));

      // Execute bulk update
      const bulkResult = await Category.bulkWrite(bulkOps, { session });

      // Optional sanity check
      if (bulkResult.matchedCount !== req.body.length) {
        throw errorHandler(
          404,
          "Some categories were not found or unauthorized",
        );
      }

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "category",
        entityId: req.user.role === "admin" ? req.user.restaurantId : null,
        action: "UPDATE",
        before: null,
        after: {
          reorderedCount: req.body.length,
          restaurantId:
            req.user.role === "admin" ? req.user.restaurantId : null,
        },
        ipAddress: getClientIp(req),
      });
      return bulkResult;
    });

    res.status(200).json({
      success: true,
      message: "Categories reordered successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const bulkReorderCategories = async (req, res, next) => {
  let scopedKey = null;
  try {
    cleanupIdempotencyStore();

    const idempotencyKey = String(
      req.headers["x-idempotency-key"] || "",
    ).trim();
    if (!idempotencyKey) {
      throw errorHandler(400, "x-idempotency-key header is required");
    }

    const items = req.body?.items;
    validateReorderItems(items);

    const signature = JSON.stringify(items);
    scopedKey = `${toIdString(req.user.id)}:${idempotencyKey}`;
    const existing = bulkReorderIdempotencyStore.get(scopedKey);

    if (existing && existing.expiresAt > Date.now()) {
      if (existing.signature !== signature) {
        throw errorHandler(
          409,
          "Idempotency key has already been used with a different payload",
        );
      }
      if (existing.inFlight) {
        throw errorHandler(409, "Request with this idempotency key is in progress");
      }
      return res.status(200).json({
        ...existing.response,
        idempotentReplay: true,
      });
    }

    bulkReorderIdempotencyStore.set(scopedKey, {
      signature,
      inFlight: true,
      response: null,
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    });

    const result = await withTransaction(async (session) => {
      const bulkOps = items.map((cat) => ({
        updateOne: {
          filter: {
            _id: cat.id,
            ...(req.user.role === "admin"
              ? { restaurantId: req.user.restaurantId }
              : {}),
          },
          update: {
            $set: { order: cat.order },
          },
        },
      }));

      const bulkResult = await Category.bulkWrite(bulkOps, { session });
      if (bulkResult.matchedCount !== items.length) {
        throw errorHandler(404, "Some categories were not found or unauthorized");
      }

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "category",
        entityId: req.user.role === "admin" ? req.user.restaurantId : null,
        action: "UPDATE",
        before: null,
        after: {
          reorderedCount: items.length,
          idempotencyKey,
          restaurantId:
            req.user.role === "admin" ? req.user.restaurantId : null,
        },
        ipAddress: getClientIp(req),
      });

      return bulkResult;
    });

    const response = {
      success: true,
      message: "Categories bulk reordered successfully",
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    };

    bulkReorderIdempotencyStore.set(scopedKey, {
      signature,
      inFlight: false,
      response,
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    });

    return res.status(200).json({ ...response, idempotentReplay: false });
  } catch (error) {
    if (scopedKey) {
      const entry = bulkReorderIdempotencyStore.get(scopedKey);
      if (entry?.inFlight) {
        bulkReorderIdempotencyStore.delete(scopedKey);
      }
    }
    next(error);
  }
};

export const checkCategorySlug = async (req, res, next) => {
  try {
    const { name, slug, isGeneric = false, restaurantId, categoryId } = req.body;
    const rawValue = String(slug || name || "").trim();

    if (!rawValue) {
      throw errorHandler(400, "Provide name or slug");
    }

    if (isGeneric && req.user.role !== "superAdmin") {
      throw errorHandler(403, "Only superAdmin can validate generic category slug");
    }

    if (!isGeneric) {
      if (!restaurantId || !isValidObjectId(restaurantId)) {
        throw errorHandler(400, "Valid restaurantId is required");
      }

      const restaurant = await Restaurant.findById(restaurantId).lean();
      if (!restaurant || restaurant.status !== "published") {
        throw errorHandler(400, "Restaurant must be published");
      }

      if (
        req.user.role === "admin" &&
        toIdString(req.user.restaurantId) !== toIdString(restaurantId)
      ) {
        throw errorHandler(403, "Not your restaurant");
      }
    }

    const normalizedSlug = rawValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    if (!normalizedSlug) {
      throw errorHandler(400, "Invalid slug value");
    }

    const scope = isGeneric ? { isGeneric: true } : { restaurantId };
    const query = {
      slug: normalizedSlug,
      ...scope,
    };

    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        throw errorHandler(400, "Invalid categoryId format");
      }
      query._id = { $ne: categoryId };
    }

    const existing = await Category.findOne(query).lean();

    res.status(200).json({
      success: true,
      data: {
        slug: normalizedSlug,
        available: !existing,
        conflictId: existing?._id || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryAuditLogs = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw errorHandler(400, "Invalid ID format");
    }

    const category = await Category.findById(req.params.id)
      .setOptions({ includeInactive: true })
      .lean();
    if (!category) {
      throw errorHandler(404, "Category not found");
    }

    if (
      !category.isGeneric &&
      req.user.role === "admin" &&
      toIdString(category.restaurantId) !== toIdString(req.user.restaurantId)
    ) {
      throw errorHandler(403, "Not allowed");
    }

    const { page = 1, limit = 20, action, actorId, from, to, sort = "desc" } =
      req.query;
    const filter = {
      entityType: "category",
      entityId: req.params.id,
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
      if ((from && Number.isNaN(fromDate.getTime())) || (to && Number.isNaN(toDate.getTime()))) {
        throw errorHandler(400, "Invalid date filter. Use ISO date values.");
      }
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = fromDate;
      if (toDate) filter.createdAt.$lte = toDate;
    }

    const total = await AuditLog.countDocuments(filter);
    const pagination = paginate({ page, limit, total });
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: sort === "asc" ? 1 : -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    res.status(200).json({
      success: true,
      ...pagination,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

export const getDeletedCategories = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = "", restaurantId } = req.query;
    if (restaurantId && !isValidObjectId(restaurantId)) {
      throw errorHandler(400, "Invalid restaurantId format");
    }

    const safeSearch = String(search).trim().slice(0, MAX_SEARCH_LENGTH);
    const filter = {
      isActive: false,
      ...(restaurantId ? { restaurantId } : {}),
    };

    if (safeSearch) {
      const searchRegex = escapeRegex(safeSearch);
      filter.$or = [
        { name: { $regex: searchRegex, $options: "i" } },
        { slug: { $regex: searchRegex, $options: "i" } },
      ];
    }

    const total = await Category.countDocuments(filter).setOptions({
      includeInactive: true,
    });
    const pagination = paginate({ page, limit, total });
    const categories = await Category.find(filter)
      .setOptions({ includeInactive: true })
      .select("-__v")
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      ...pagination,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const exportCategories = async (req, res, next) => {
  try {
    const {
      format = "json",
      search = "",
      status,
      isGeneric,
      isActive,
      restaurantId,
      includeInactive = "false",
      limit = MAX_EXPORT_LIMIT,
    } = req.query;

    if (restaurantId && !isValidObjectId(restaurantId)) {
      throw errorHandler(400, "Invalid restaurantId format");
    }

    const safeSearch = String(search).trim().slice(0, MAX_SEARCH_LENGTH);
    const filter = {};

    if (status) {
      const allowedStatuses = ["draft", "blocked", "published"];
      if (!allowedStatuses.includes(status)) {
        throw errorHandler(400, "Invalid status value");
      }
      filter.status = status;
    }
    if (restaurantId) filter.restaurantId = restaurantId;
    if (isGeneric === "true" || isGeneric === "false") {
      filter.isGeneric = isGeneric === "true";
    }
    if (isActive === "true" || isActive === "false") {
      filter.isActive = isActive === "true";
    }
    if (safeSearch) {
      const searchRegex = escapeRegex(safeSearch);
      filter.$or = [
        { name: { $regex: searchRegex, $options: "i" } },
        { slug: { $regex: searchRegex, $options: "i" } },
      ];
    }

    const includeInactiveOption =
      includeInactive === "true" || filter.isActive === false;

    const exportLimit = Math.min(
      Math.max(parseInt(limit, 10) || MAX_EXPORT_LIMIT, 1),
      MAX_EXPORT_LIMIT,
    );

    const categories = await Category.find(filter)
      .setOptions({ includeInactive: includeInactiveOption })
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(exportLimit)
      .lean();

    if (format === "csv") {
      const headers = [
        "_id",
        "name",
        "slug",
        "isGeneric",
        "restaurantId",
        "status",
        "isActive",
        "order",
        "createdAt",
        "updatedAt",
      ];

      const rows = categories.map((category) =>
        [
          category._id,
          category.name,
          category.slug,
          category.isGeneric,
          category.restaurantId,
          category.status,
          category.isActive,
          category.order,
          category.createdAt,
          category.updatedAt,
        ]
          .map(toCsvValue)
          .join(","),
      );

      const csv = [headers.join(","), ...rows].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=\"categories-export-${new Date().toISOString().slice(0, 10)}.csv\"`,
      );
      return res.status(200).send(csv);
    }

    res.status(200).json({
      success: true,
      total: categories.length,
      format: "json",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/categories — List Public Categories
// ===============================================================================
// Purpose:
// - Retrieve active categories (generic + restaurant-specific)
//
// Business Rules:
// - Only active categories returned
// - If restaurantId provided → include generic + that restaurant’s categories
// - If no restaurantId → return only generic categories
//
// What Happens:
// - Search filter applied (name/slug)
// - Paginated result set
// - Sorted by updatedAt
//
// Access Control:
// - Public
//
// System Guarantees:
// - Efficient pagination
// - Lean query for performance
//
// Real-World Usage:
// - Public menu rendering
// - Customer browsing categories
//
// ===============================================================================

export const getCategories = async (req, res, next) => {
  try {
    const {
      restaurantId,
      page = 1,
      limit = 10,
      search = "",
      sort = "desc",
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const sortDirection = sort === "asc" ? 1 : -1;
    
    if (restaurantId && !isValidObjectId(restaurantId)) {
      throw errorHandler(400, "Invalid restaurantId format");
    }
    const safeSearch = String(search).trim().slice(0, MAX_SEARCH_LENGTH);

    // Cache key based on request params
    const cacheKey = `categories:${restaurantId || 'generic'}:${pageNum}:${limitNum}:${safeSearch}:${sort}`;

    const cachedData = await getOrFetch(
      cacheKey,
      async () => {
        // Base filter (business rule)
        const filter = {
          isActive: true,
          ...(restaurantId
            ? { $or: [{ isGeneric: true }, { restaurantId }] }
            : { isGeneric: true }),
        };

        // Search filter
        if (safeSearch) {
          const searchRegex = escapeRegex(safeSearch);
          filter.$and = [
            {
              $or: [
                { name: { $regex: searchRegex, $options: "i" } },
                { slug: { $regex: searchRegex, $options: "i" } },
              ],
            },
          ];
        }

        const total = await Category.countDocuments(filter);
        const pagination = paginate({ page: pageNum, limit: limitNum, total });

        const categories = await Category.find(filter)
          .select("-__v")
          .skip(pagination.skip)
          .limit(pagination.limit)
          .sort({ updatedAt: sortDirection })
          .lean();

        return {
          success: true,
          message: "viewing all categories",
          ...pagination,
          data: categories,
        };
      },
      300 // Cache for 5 minutes
    );

    res.status(200).json(cachedData);
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/categories/my — Admin Category Dashboard
// ===============================================================================
// Purpose:
// - Retrieve categories belonging to logged-in admin’s restaurant
//
// Business Rules:
// - Admin role required
// - Only active categories returned
//
// What Happens:
// - Paginated result
// - Sorted by updatedAt
//
// Access Control:
// - Admin only
//
// System Guarantees:
// - Ownership scoped
// - Efficient pagination
//
// Real-World Usage:
// - Admin management panel
// - Category configuration dashboard
//
// ===============================================================================

export const getMyCategories = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role !== "admin") {
      return next(errorHandler(403, "not allowed"));
    }

    const filter = {
      restaurantId: user.restaurantId,
      isActive: true,
    };

    const { page = 1, limit = 10, order = "desc" } = req.query;
    const sortDirection = order === "asc" ? 1 : -1;

    const total = await Category.countDocuments(filter);
    const pagination = paginate({ page, limit, total });

    const categories = await Category.find(filter)
      .select("-__v")
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ updatedAt: sortDirection })
      .lean();

    res.status(200).json({
      success: true,
      message: `My categories fetched successfully`,
      ...pagination,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/categories/:id — Retrieve Single Category
// ===============================================================================
// Purpose:
// - Fetch a single category by ID
//
// Business Rules:
// - Admin can access only own restaurant categories
// - Generic categories accessible to SuperAdmin
//
// What Happens:
// - Category returned if exists
// - Ownership validated
//
// Access Control:
// - Admin (own restaurant only)
// - SuperAdmin
//
// System Guarantees:
// - Ownership enforcement
// - Secure retrieval
//
// Real-World Usage:
// - Category detail page
// - Edit screen pre-fill
//
// ===============================================================================

export const getCategoryById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw errorHandler(400, "Invalid ID format");
    }

    const category = await Category.findById(req.params.id).lean();

    if (!category) return next(errorHandler(404, "Category not found"));

    // Ownership enforcement
    if (
      !category.isGeneric &&
      req.user.role === "admin" &&
      toIdString(category.restaurantId) !== toIdString(req.user.restaurantId)
    ) {
      return next(errorHandler(403, "Not Allowed"));
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/categories/:id/status — Change Category Activation State
// ===============================================================================
// Purpose:
// - Toggle category activation state
//
// Business Rules:
// - isActive must be boolean
// - Generic categories modifiable only by SuperAdmin
// - Ownership enforced for restaurant categories
//
// What Happens:
// - isActive updated
// - Audit log recorded
//
// Access Control:
// - Admin (own categories)
// - SuperAdmin (all categories)
//
// System Guarantees:
// - Fully transactional
// - Atomic state change
//
// Real-World Usage:
// - Hide category temporarily
// - Platform moderation action
//
// ===============================================================================

export const updateCategoryStatus = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      if (!isValidObjectId(req.params.id)) {
        throw errorHandler(400, "Invalid ID format");
      }

      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        throw errorHandler(400, "isActive must be boolean");
      }

      const category = await Category.findById(req.params.id).session(session);
      if (!category) {
        throw errorHandler(404, "category not found");
      }

      // Generic → only superAdmin
      if (category.isGeneric && req.user.role !== "superAdmin") {
        throw errorHandler(403, "Only superAdmin");
      }

      // Restaurant category → admin must own it
      if (
        !category.isGeneric &&
        req.user.role === "admin" &&
        toIdString(category.restaurantId) !== toIdString(req.user.restaurantId)
      ) {
        throw errorHandler(403, "Not allowed");
      }

      const before = { isActive: category.isActive };

      category.isActive = isActive;
      await category.save({ session });

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "category",
        entityId: category._id,
        action: "STATUS_CHANGE",
        before,
        after: { isActive },
        ipAddress: getClientIp(req),
      });
      return category;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/categories/:id/restore — Restore Soft-Deleted Category
// ===============================================================================
// Purpose:
// - Reactivate previously soft-deleted category
//
// Business Rules:
// - Only inactive categories can be restored
//
// What Happens:
// - isActive → true
// - Audit entry created
//
// Access Control:
// - SuperAdmin only
//
// System Guarantees:
// - Fully transactional
// - Atomic restore
//
// Real-World Usage:
// - Undo moderation
// - Restore accidental deletion
//
// ===============================================================================

export const restoreCategory = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      if (!isValidObjectId(req.params.id)) {
        throw errorHandler(400, "Invalid ID format");
      }

      const categoryId = new mongoose.Types.ObjectId(req.params.id);
      const existing = await Category.collection.findOne(
        { _id: categoryId },
        { session },
      );
      if (!existing) {
        throw errorHandler(404, "category not found");
      }
      if (existing.isActive) {
        throw errorHandler(400, "category already active");
      }

      await Category.collection.updateOne(
        { _id: categoryId },
        {
          $set: {
            isActive: true,
            restoredAt: new Date(),
            restoredBy: new mongoose.Types.ObjectId(req.user.id),
          },
        },
        { session },
      );

      const category = await Category.findById(categoryId)
        .session(session)
        .select("-__v");
      const before = { isActive: false };

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "category",
        entityId: category._id,
        action: "RESTORE",
        before,
        after: { isActive: true },
        ipAddress: getClientIp(req),
      });
      return category;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/categories/all — SuperAdmin Full View
// ===============================================================================
// Purpose:
// - Retrieve all categories (active + inactive)
//
// Business Rules:
// - No isActive filter
// - Search supported
//
// What Happens:
// - Paginated full dataset
// - Sorted by creation date
//
// Access Control:
// - SuperAdmin only
//
// System Guarantees:
// - Efficient pagination
// - Lean optimized query
//
// Real-World Usage:
// - Platform moderation
// - Compliance audits
// - Data export
//
// ===============================================================================

export const getAllCategories = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;

    const filter = {};
    const safeSearch = String(search).trim().slice(0, MAX_SEARCH_LENGTH);

    if (safeSearch) {
      const searchRegex = escapeRegex(safeSearch);
      filter.$or = [
        { name: { $regex: searchRegex, $options: "i" } },
        { slug: { $regex: searchRegex, $options: "i" } },
      ];
    }

    const total = await Category.countDocuments(filter).setOptions({
      includeInactive: true,
    });
    const pagination = paginate({ page, limit, total });

    const data = await Category.find(filter)
      .setOptions({ includeInactive: true })
      .select("-__v")
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, ...pagination, data });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/categories/bulk-status — Bulk Status Update
// ===============================================================================
// Purpose:
// - Update status field for multiple categories
//
// Business Rules:
// - ids must be array
// - status must be valid enum
//
// What Happens:
// - updateMany executed transactionally
// - Modified count returned
//
// Access Control:
// - SuperAdmin
//
// System Guarantees:
// - Fully transactional
// - Atomic bulk update
//
// Real-World Usage:
// - Enterprise moderation dashboards
// - Mass publish/block actions
//
// ===============================================================================

export const bulkUpdateCategoryStatus = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { ids, status } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw errorHandler(400, "ids must be a non-empty array");
      }

      const uniqueIds = [...new Set(ids.map((id) => String(id)))];
      if (uniqueIds.some((id) => !isValidObjectId(id))) {
        throw errorHandler(400, "All ids must be valid ObjectId values");
      }

      const allowedStatuses = ["draft", "blocked", "published"];

      if (!allowedStatuses.includes(status)) {
        throw errorHandler(400, "Invalid status value");
      }

      const updateResult = await Category.updateMany(
        { _id: { $in: uniqueIds } },
        { $set: { status } },
        { session },
      );

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "category",
        entityId: null,
        action: "BULK_UPDATE",
        before: null,
        after: {
          matched: updateResult.matchedCount,
          modified: updateResult.modifiedCount,
          status,
        },
        ipAddress: getClientIp(req),
      });

      return updateResult;
    });

    res.json({
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 DELETE /api/categories/:id/hard — Permanently Delete Category
// ===============================================================================
// Purpose:
// - Permanently remove category from database
//
// Business Rules:
// - Only SuperAdmin allowed
// - Category must not be linked to active menus
//
// What Happens:
// - Document permanently deleted
// - No recovery possible
//
// Access Control:
// - SuperAdmin only
//
// System Guarantees:
// - Referential integrity validated
// - Data removal irreversible
//
// Real-World Usage:
// - GDPR compliance
// - Permanent cleanup
//
// ===============================================================================

export const hardDeleteCategory = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw errorHandler(400, "Invalid ID format");
    }

    const result = await withTransaction(async (session) => {
      const category = await Category.findById(req.params.id).session(session);
      if (!category) throw errorHandler(404, "category not found");

      //Integrity check
      const activeMenu = await Menu.findOne({
        categoryId: category._id,
        isActive: true,
      }).session(session);

      if (activeMenu) {
        throw errorHandler(400, "Cannot delete category linked to active menu");
      }

      if (req.user.role !== "superAdmin") {
        throw errorHandler(403, "Only superAdmin");
      }

      const hardDeleteCategory = await Category.findByIdAndDelete(
        req.params.id,
      ).session(session);
      return hardDeleteCategory;
    });

    res.json({
      success: true,
      message: "Category permanently deleted",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
