import Restaurant from "../models/restaurant.model.js";
import { errorHandler } from "./error.js";

export const verifyRestaurantOwner = (req, res, next) => {
  if (!req.user) {
    return next(errorHandler(401, "Unauthorized"));
  }

  const restaurant = Restaurant.findById(req.params.id);
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

export const verifyAdminOrSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return next(errorHandler(401, "Unauthorized"));
  }
  if (!["admin", "superAdmin"].includes(req.user.role)) {
    return next(errorHandler(403, "Forbidden!, you don't have access"));
  }
  next();
};

export const verifySuperAdmin = (req, res, next) => {
  if (req.user.role !== "superAdmin") {
    return next(errorHandler(403, "Only superAdmin allowed"));
  }
  next();
};

export const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return next(errorHandler(401, "Unauthorized"));
  }
  if (req.user.role !== "admin") {
    return next(errorHandler(403, "Only admin"));
  }
  next();
};
