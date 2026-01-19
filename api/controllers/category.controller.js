import { errorHandler } from "../utils/error.js";
import Category from "../models/category.model.js";

// ===============================================
// Create new Category
// ===============================================

export const createCategory = async (req, res, next) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next(errorHandler(400, "Request body is missing"));
    }
    const { name, isGeneric, restaurantId, order = 0 } = req.body;

    if (!name) {
      return next(errorHandler(400, "Category name is required"));
    }

    if (!["admin", "superAdmin"].includes(req.user.role)) {
      return next(
        errorHandler(403, "You are not allowed to create categories")
      );
    }

    // Only superAdmin can create generic categories
    if (isGeneric && req.user.role !== "superAdmin") {
      return next(
        errorHandler(403, "Only superAdmin can create generic categories")
      );
    }

    if (!isGeneric && !restaurantId) {
      return next(
        errorHandler(400, "restaurantId is required for restaurant category")
      );
    }

    // Restaurant-specific category must have restaurantId and user role should be admin
    if (!isGeneric && req.user.role === "admin") {
      if (req.user.restaurantId?.toString() !== restaurantId) {
        return next(
          errorHandler(
            403,
            "You can create categories only for your restaurant"
          )
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

    const category = new Category({
      name,
      slug,
      isGeneric,
      restaurantId: isGeneric ? null : restaurantId,
      order,
    });
    const saveCategory = await category.save();

    res.status(201).json({
      success: true,
      data: saveCategory,
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
      ? { $or: [{ isGeneric: true }, { restaurantId }] }
      : { isGeneric: true };

    const categories = await Category.find(query).sort({ order: 1 });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};
