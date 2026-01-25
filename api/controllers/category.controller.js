import { errorHandler } from "../utils/error.js";
import Category from "../models/category.model.js";
import Restaurant from "../models/restaurant.model.js";

// ===============================================
// Create new Category
// ===============================================

export const createCategory = async (req, res, next) => {
  try {
    // if (!req.body || Object.keys(req.body).length === 0) {
    //   return next(errorHandler(400, "Request body is missing"));
    // }
    const { name, isGeneric, restaurantId, order = 0 } = req.body;

    if (!name) {
      return next(errorHandler(400, "Category name is required"));
    }

    if (!["admin", "superAdmin"].includes(req.user.role)) {
      return next(
        errorHandler(403, "You are not allowed to create categories"),
      );
    }

    // Only superAdmin can create generic categories
    if (isGeneric && req.user.role !== "superAdmin") {
      return next(
        errorHandler(403, "Only superAdmin can create generic categories"),
      );
    }

    // Restaurant category → restaurantId required
    if (!isGeneric && !restaurantId) {
      return next(
        errorHandler(400, "restaurantId is required for restaurant category"),
      );
    }

    // Restaurant must be published (ONLY for non-generic)
    if (!isGeneric) {
      const restaurant = await Restaurant.findById(restaurantId);

      if (!restaurant || restaurant.status !== "published") {
        return next(
          errorHandler(
            400,
            "Restaurant must be published before adding categories",
          ),
        );
      }

      // Ownership check
      if (
        req.user.role === "admin" &&
        req.user.restaurantId?.toString() !== restaurantId
      ) {
        return next(
          errorHandler(
            403,
            "You can create categories only for your restaurant",
          ),
        );
      }
    }

    // Slug generation (clean)
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const slugQuery = isGeneric
      ? { slug, isGeneric: true }
      : { slug, restaurantId };

    const slugExists = await Category.findOne(slugQuery);
    if (slugExists) {
      return next(errorHandler(409, "Category already exists"));
    }

    const category = await Category.create({
      name,
      slug,
      isGeneric,
      restaurantId: isGeneric ? null : restaurantId,
      order,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================
// Get Categories (generic + restaurant-specific)
// ===============================================

export const getCategories = async (req, res, next) => {
  try {
    const { restaurantId } = req.query;

    const query = restaurantId
      ? {
          isActive: true,
          $or: [{ isGeneric: true }, { restaurantId }],
        }
      : { isGeneric: true };

    const categories = await Category.find(query).sort({ order: 1 });
    const total = categories.length;
    res.json({
      success: true,
      message: "viewing all categories",
      total,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// ====================================================================
// update category
// ====================================================================

export const updateCategory = async (req, res, next) => {
  try {
    const { name, order, isActive } = req.body;

    // check for updates
    if (!name && order === undefined && isActive === undefined) {
      return next(errorHandler(400, "nothing to update"));
    }

    // fetch the category
    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(errorHandler(404, "Category not found"));
    }

    // authorization
    if (category.isGeneric && req.user.role !== "superAdmin") {
      return next(
        errorHandler(403, "only super admin update the generic category"),
      );
    }

    // check the category is not generic and belongs to the editing admin
    if (
      !category.isGeneric &&
      req.user.role === "admin" &&
      category.restaurantId?.toString() !== req.user.restaurantId
    ) {
      return next(
        errorHandler(403, "You can update only your restaurant category"),
      );
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

    res.status(200).json({
      success: true,
      message: "Category Updated Successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// ====================================================
// delete category (soft delete)
// ====================================================

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return next(errorHandler(404, "category not found"));

    if (category.isGeneric && req.user.role !== "superAdmin") {
      return next(
        errorHandler(403, "only superAdmin can delete generic category"),
      );
    }

    if (
      !category.isGeneric &&
      req.user.role === "admin" &&
      category.restaurantId?.toString() !== req.user.restaurantId
    ) {
      return next(errorHandler(403, "not allowed"));
    }

    category.isActive = false;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: {
        id: category._id,
        name: category.name,
        isActive: category.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// REORDER CATEGORIES
// =========================================================

export const reorderCategories = async (req, res, next) => {
  try {
    // Authorization check
    if (!["admin", "superAdmin"].includes(req.user.role)) {
      return next(
        errorHandler(403, "You are not allowed to reorder categories"),
      );
    }

    // Payload must be an array
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return next(errorHandler(400, "Invalid Payload"));
    }

    // Validate each item
    for (const cat of req.body) {
      if (!cat.id || typeof cat.order !== "number") {
        return next(
          errorHandler(400, "Each category must have id and numeric order"),
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
    const result = await Category.bulkWrite(bulkOps);

    // Optional sanity check
    if (result.matchedCount === 0) {
      return next(errorHandler(404, "No categories found to reorder"));
    }

    res.status(200).json({
      success: true,
      message: "Categories reordered successfully",
    });
  } catch (error) {
    next(error);
  }
};

//GET MY CATEGORIES (admin dashboard)

export const getMyCategories = async (req, res, next) => {
  try {
    let query = {};
    const user = req.user;
    if (user.role === "admin") {
      query = {
        restaurantId: user.restaurantId,
        isActive: true,
      };
    }

    const categories = await Category.find(query).sort({ order: 1 });
    const total = categories.length;

    res.json({
      success: true,
      message: `My categories fetched successfully`,
      total,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};
