import Restaurant from "../models/restaurant.model.js";
import { errorHandler } from "./error.js";

export const verifyRestaurantOwner = async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(errorHandler(404, "Restaurant Not Found"));

  if (
    req.user.role !== "superAdmin" &&
    restaurant.adminId.toString() !== req.user.id
  ) {
    return next(errorHandler(403, "Access denied!"));
  }

  req.restaurant = restaurant;
  next();
};

export const verifyAdminOrSuperAdmin = async (req, res, next) => {
  if (!["admin", "superAdmin"].includes(req.user.role)) {
    return next(errorHandler(403, "Forbidden!, you don't have access"));
  }
  next();
};
