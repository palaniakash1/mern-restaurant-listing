import Restaurant from "../models/restaurant.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";

export const create = async (req, res, next) => {
  if (!req.body) {
    return next(errorHandler(400, "Request body is missing or invalid JSON"));
  }

  if (!["superAdmin", "admin"].includes(req.user.role)) {
    return next(
      errorHandler(403, "You are not allowed to create a restaurant")
    );
  }
  if (
    !req.body.name ||
    !req.body.description ||
    !req.body.tagline ||
    !req.body.address ||
    !req.body.contactNumber ||
    !req.body.email
  ) {
    return next(errorHandler(400, "All required fields are must be filled"));
  }

  const slug = req.body.name
    .split(" ")
    .join("-")
    .toLowerCase()
    .replace(/[^a-zA-Z0-9-]/g, "-");

  const exists = await Restaurant.findOne({ slug });
  if (exists) {
    return next(errorHandler(409, "Restaurant with this name already exists"));
  }

  const newRestaurant = new Restaurant({
    ...req.body,
    slug,
    adminId: req.user.id,
  });

  try {
    const savedRestaurant = await newRestaurant.save();

    // ✅ UPDATE THE USER: Link this restaurant to the Admin's profile
    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        restaurantId: savedRestaurant._id,
      },
    });

    res.status(201).json(savedRestaurant);
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
