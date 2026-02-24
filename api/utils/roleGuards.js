import Restaurant from "../models/restaurant.model.js";
import { errorHandler } from "./error.js";
import mongoose from "mongoose";

export const verifyRestaurantOwner = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(errorHandler(401, "Unauthorized"));
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(errorHandler(400, "Invalid restaurant ID format"));
    }

    const restaurant = await Restaurant.findById(id).select("adminId");
    if (!restaurant) return next(errorHandler(404, "Restaurant Not Found"));

    if (
      req.user.role !== "superAdmin" &&
      restaurant.adminId?.toString() !== req.user.id
    ) {
      return next(errorHandler(403, "Access denied!"));
    }

    req.restaurant = restaurant;
    next();
  } catch (error) {
    next(error);
  }
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
