import Restaurant from "../models/restaurant.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";

// ===============================================
// create a new restaurant
// ===============================================
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

// =================================================================
// get all restaurants
// =================================================================
export const getAllRestaurants = async (req, res, next) => {
  try {
    // only accessible for superAdmin - role gaurd
    if (req.user.role !== "superAdmin") {
      return next(
        errorHandler(403, "you are not allowed to access all the restaurants")
      );
    }
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
      message: "showing all restaurants",
      page,
      limit,
      total,
      data: restaurants,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// get restaurant by id (admin / superAdmin)
// ===============================================================================
export const getRestaurantById = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select("-__v");

    if (!restaurant) {
      return next(errorHandler(404, "Restaurant not found"));
    }

    // ownership enforcement
    if (
      req.user.role !== "superAdmin" &&
      restaurant.adminId.toString() !== req.user.id
    ) {
      return next(
        errorHandler(403, `You are not allowed to access this restaurant`)
      );
    }

    res.status(200).json({
      success: true,
      message: `Showing your restaurant name: ${restaurant.name}`,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// get restaurant by slug (admin / superAdmin)
// ===============================================================================
export const getRestaurantBySlug = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({
      slug: req.params.slug,
    }).select("-__v");

    if (!restaurant) {
      return next(errorHandler(404, "Restaurant not found"));
    }

    res.status(200).json({
      success: true,
      message: `showing restaurant using slug: ${restaurant.slug}`,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// update Restaurant using restaurantID and userID + superAdmin
// ===============================================================================
export const updateRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return next(errorHandler(404, "Restaurant not found"));
    }

    // ownership check
    if (
      req.user.role !== "superAdmin" &&
      restaurant.adminId.toString() !== req.user.id
    ) {
      return next(
        errorHandler(403, "You are not allowed to update this Restaurant")
      );
    }
    // prevent admin reassignment via update
    if (req.body.adminId) {
      return next(errorHandler(403, "Admin reassignment is not allowed here"));
    }

    const updateRestaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { $new: true }
    );

    res.status(200).json({
      success: true,
      message: "Restaurant Updated Successfully",
      data: updateRestaurant,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// delete Restaurant using restaurantID and userID + superAdmin
// ===============================================================================
export const deleteRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return next(404, "Restaurant not found");
    }

    // ownership check
    if (
      req.user.role !== "superAdmin" &&
      restaurant.adminId.toString() !== req.user.id
    ) {
      return next(
        errorHandler(403, "You are not allowed to Delete this restaurant")
      );
    }

    // remove restaurant reference from admin
    await User.findByIdAndUpdate(restaurant.adminId, {
      $unset: { restaurantId: "" },
    });

    await restaurant.deleteOne();

    res.status(200).json({
      success: true,
      message: "Restaurant Deleted Successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// reassign restaurant admin (SUPER ADMIN ONLY)
// ===============================================================================

export const reassignRestaurantAdmin = async (req, res, next) => {
  try {
    // only accessible for superAdmin - role gaurd
    if (req.user.role !== "superAdmin") {
      return next(
        errorHandler(403, "Only superAdmin can Reassign the ownership")
      );
    }

    //
    const { id } = req.params;
    const { newAdminId } = req.body;

    if (!newAdminId) {
      return next(errorHandler(400, "New admin ID is required"));
    }

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return next(errorHandler(404, "Restaurant Not Found"));
    }

    // fetch old admin before changing ownership
    const oldAdmin = await User.findById(restaurant.adminId);
    if (!oldAdmin) {
      return next(errorHandler(400, "Current Admin not found"));
    }

    const newAdmin = await User.findById(newAdminId);
    if (!newAdmin || newAdmin.role !== "admin") {
      return next(errorHandler(400, `Invalid admin selected`));
    }

    // check if admin already exists
    if (newAdmin.restaurantId) {
      return next(
        errorHandler(403, `Selected admin already owns a restaurant`)
      );
    }

    // remove restaurant from old admin
    await User.findByIdAndUpdate(oldAdmin._id, {
      $unset: { restaurantId: "" },
    });

    // assign restaurant to the new admin
    restaurant.adminId = newAdmin._id;
    await restaurant.save();

    newAdmin.restaurantId = restaurant._id;
    await newAdmin.save();

    res.status(200).json({
      success: true,
      message: `Restaurant ownership transferred successfully from ${oldAdmin.userName} to ${newAdmin.userName} `,
    });
  } catch (error) {
    next(error);
  }
};
// ===============================================================================
// get logged-in admin restaurant (ADMIN ONLY)
// ===============================================================================

export const getMyRestaurant = async (req, res, next) => {
  try {
    // role guard
    if (req.user.role !== "admin") {
      return next(errorHandler(403, "Only admin can access this resource"));
    }

    const restaurant = await Restaurant.findOne({
      adminId: req.user.id, // ✅ FIXED
    }).select("-__v");

    if (!restaurant) {
      return next(errorHandler(404, "No restaurant assigned to this admin"));
    }

    res.status(200).json({
      success: true,
      message: `viewing your restaurant - restaurant name ${restaurant.name}`,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};
