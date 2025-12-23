import Restaurant from "../models/restaurant.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";

export const create = async (req, res, next) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next(errorHandler(400, "Request body is missing or invalid JSON"));
    }

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return next(
        errorHandler(403, "You are not allowed to create a restaurant")
      );
    }

    const {
      name,
      description,
      tagline,
      address,
      contactNumber,
      email,
      adminId,
    } = req.body;

    if (
      !name ||
      !description ||
      !tagline ||
      !address ||
      !contactNumber ||
      !email
    ) {
      return next(errorHandler(400, "All required fields must be filled"));
    }

    // Admin → only one restaurant
    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user.id);
      if (adminUser.restaurantId) {
        return next(errorHandler(403, "Admin can create only one restaurant"));
      }
    }

    // Slug generation (clean)
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const exists = await Restaurant.findOne({ slug });
    if (exists) {
      return next(
        errorHandler(409, "Restaurant with this name already exists")
      );
    }

    // Ownership resolution
    let assignedAdminId = req.user.id;

    if (req.user.role === "superAdmin" && adminId) {
      const adminExists = await User.findById(adminId);

      if (!adminExists || adminExists.role !== "admin") {
        return next(errorHandler(400, "Invalid admin selected"));
      }

      if (adminExists.restaurantId) {
        return next(
          errorHandler(403, "Selected admin already owns a restaurant")
        );
      }

      assignedAdminId = adminId;
    }

    const newRestaurant = new Restaurant({
      name,
      description,
      tagline,
      address,
      contactNumber,
      email,
      slug,
      adminId: assignedAdminId,
    });

    const savedRestaurant = await newRestaurant.save();

    const adminUser = await User.findById(assignedAdminId);
    adminUser.restaurantId = savedRestaurant._id;
    await adminUser.save();

    res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      data: savedRestaurant,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllRestaurants = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const restaurants = await Restaurant.find()
      .select("-__v")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Restaurant.countDocuments();

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      data: restaurants,
    });
  } catch (error) {
    next(error);
  }
};
