import { errorHandler } from "../utils/error.js";
import Category from "../models/category.model.js";
import Restaurant from "../models/restaurant.model.js";
import Menu from "../models/menu.model.js";
import { diffObject } from "../utils/diff.js";
import { paginate } from "../utils/paginate.js";
import { logAudit } from "../utils/auditLogger.js";
import { withTransaction } from "../utils/withTransaction.js";
import mongoose from "mongoose";
import { generateUniqueSlug } from "../utils/generateUniqueSlug.js";

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
    const result = await withTransaction(async (session) => {
      // if (!req.body || Object.keys(req.body).length === 0) {
      //   throw errorHandler(400, "Request body is missing");
      // }
      const { name, isGeneric, restaurantId, order = 0 } = req.body;

      if (!name) {
        throw errorHandler(400, "Category name is required");
      }

      // Only superAdmin can create generic categories
      if (isGeneric && req.user.role !== "superAdmin") {
        throw errorHandler(
          403,
          "Only superAdmin can create generic categories",
        );
      }

      // Restaurant category → restaurantId required
      if (!isGeneric && !restaurantId) {
        throw errorHandler(
          400,
          "restaurantId is required for restaurant category",
        );
      }

      // Restaurant must be published (ONLY for non-generic)
      if (!isGeneric) {
        const restaurant =
          await Restaurant.findById(restaurantId).session(session);

        if (!restaurant || restaurant.status !== "published") {
          throw errorHandler(
            400,
            "Restaurant must be published before adding categories",
          );
        }

        // Ownership check
        if (
          req.user.role === "admin" &&
          req.user.restaurantId?.toString() !== restaurantId
        ) {
          throw errorHandler(
            403,
            "You can create categories only for your restaurant",
          );
        }
      }

      const scope = isGeneric ? { isGeneric: true } : { restaurantId };

      const slug = await generateUniqueSlug({
        model: Category,
        baseValue: name,
        scope,
        session,
      });

      const category = await Category.create(
        [
          {
            name,
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
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
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

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw errorHandler(400, "Invalid ID format");
      }

      // check for updates
      if (!name && order === undefined && isActive === undefined) {
        throw errorHandler(400, "nothing to update");
      }

      // fetch the category
      const category = await Category.findById(req.params.id).session(session);
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
        category.restaurantId?.toString() !== req.user.restaurantId
      ) {
        throw errorHandler(403, "You can update only your restaurant category");
      }

      // apply updates
      if (name) {
        category.name = name;
        category.slug = name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }

      if (order !== undefined) category.order = order;
      if (isActive !== undefined) category.isActive = isActive;

      await category.save();

      const diff = diffObject(before, category, [
        "name",
        "slug",
        "order",
        "isActive",
      ]);

      if (Object.keys(diff).length > 0) {
        await logAudit({
          actorId: req.user.id,
          actorRole: req.user.role,
          entityType: "category",
          entityId: category._id,
          action: isActive !== undefined ? "STATUS_CHANGE" : "UPDATE",
          before: diff,
          after: diff,
          ipAddress: req.headers["x-forwarded-for"] || req.ip,
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
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
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
        category.restaurantId?.toString() !== req.user.restaurantId
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
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
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
      if (!Array.isArray(req.body) || req.body.length === 0) {
        throw errorHandler(400, "Invalid Payload");
      }

      // Validate each item
      for (const cat of req.body) {
        if (!cat.id || typeof cat.order !== "number") {
          throw errorHandler(
            400,
            "Each category must have id and numeric order",
          );
        }
      }

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
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
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

    const sortDirection = sort === "asc" ? 1 : -1;

    // ---------------------------
    // Base filter (business rule)
    // ---------------------------
    const filter = {
      isActive: true,
      ...(restaurantId
        ? { $or: [{ isGeneric: true }, { restaurantId }] }
        : { isGeneric: true }),
    };

    // ---------------------------
    // Search filter
    // ---------------------------

    if (search) {
      filter.$and = [
        {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { slug: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }

    // ---------------------------
    // Total count
    // ---------------------------
    const total = await Category.countDocuments(filter);
    const pagination = paginate({ page, limit, total });

    // ---------------------------
    // Data query
    // ---------------------------
    const categories = await Category.find(filter)
      .select("-__v")
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ updatedAt: sortDirection })
      .lean();

    res.status(200).json({
      success: true,
      message: "viewing all categories",
      ...pagination,
      data: categories,
    });
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw errorHandler(400, "Invalid ID format");
    }

    const category = await Category.findById(req.params.id).lean();

    if (!category) return next(errorHandler(404, "Category not found"));

    // Ownership enforcement
    if (
      !category.isGeneric &&
      req.user.role === "admin" &&
      category.restaurantId?.toString() !== req.user.restaurantId
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
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
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
        category.restaurantId?.toString() !== req.user.restaurantId
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
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
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
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw errorHandler(400, "Invalid ID format");
      }

      const category = await Category.findById(req.params.id).session(session);
      if (!category) {
        throw errorHandler(404, "category not found");
      }
      if (category.isActive) {
        throw errorHandler(400, "category already active");
      }

      const before = { isActive: category.isActive };
      await category.restore(session, req.user.id);

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "category",
        entityId: category._id,
        action: "RESTORE",
        before,
        after: { isActive: true },
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
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

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Category.countDocuments(filter);
    const pagination = paginate({ page, limit, total });

    const data = await Category.find({ ...filter, includeInactive: true })
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

      const allowedStatuses = ["draft", "blocked", "published"];

      if (!allowedStatuses.includes(status)) {
        throw errorHandler(400, "Invalid status value");
      }

      const updateResult = await Category.updateMany(
        { _id: { $in: ids } },
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
        after: { modified: updateResult.modifiedCount },
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
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
