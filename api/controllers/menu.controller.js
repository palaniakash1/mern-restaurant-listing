import Menu from "../models/menu.model.js";
import Restaurant from "../models/restaurant.model.js";
import { errorHandler } from "../utils/error.js";

// ======================================
// CREATE MENU (per category per restaurant)
// ======================================

export const createMenu = async (req, res, next) => {
  try {
    // 🔐 Auth check
    if (!req.user) {
      return next(errorHandler(401, "Unauthorized"));
    }

    const { restaurantId, categoryId, items } = req.body;

    // ❌ Basic validations
    if (!restaurantId || !categoryId) {
      return next(
        errorHandler(400, "restaurantId and categoryId are required"),
      );
    }

    // 🔐 Ownership / role guard
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return next(errorHandler(404, "restaurant not found!"));
    }

    if (!restaurantId || !categoryId || !items?.length) {
      return next(errorHandler(400, "Missing required fields"));
    }
    // superAdmin can manage all
    // admin/storeManager only their restaurant
    if (
      req.user.role !== "superAdmin" &&
      restaurant.adminId?.toString() !== req.user.id
    ) {
      return next(errorHandler(403, "you are NOT allowed to manage this restaurant"));
    }
    // ❌ Prevent duplicate menu for same category

    const existingMenuItem = await Menu.findOne({
      restaurantId,
      categoryId,
    });

    if (existingMenuItem) {
      return next(errorHandler(409, "Menu already Exist for this Category"));
    }

    const menu = await Menu.create({
      restaurantId,
      categoryId,
      items: items || [],
    });
    // const saveMenu = await menu.saveMenu();

    res.status(201).json({
      success: true,
      message: "Menu Created Successfully",
      data: menu,
    });
  } catch (error) {
    next(error);
  }
};
