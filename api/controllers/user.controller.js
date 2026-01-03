import { errorHandler } from "../utils/error.js";
import bcryptjs from "bcryptjs";
import User from "../models/user.model.js";

export const test = (req, res) => {
  res.json({ message: "API test message is displaying" });
};

// =========================================================
// update "user" using user Id - API
// =========================================================
export const updateUser = async (req, res, next) => {
  if (req.user.id !== req.params.userId) {
    return next(errorHandler(403, "you are not allowed to update the user"));
  }
  if (req.body.password) {
    if (req.body.password.length < 8) {
      return next(errorHandler(400, "password must be atleast 8 characters"));
    }
    req.body.password = bcryptjs.hashSync(req.body.password, 10);
  }
  if (req.body.userName) {
    if (req.body.userName.length < 3 || req.body.userName.length > 20) {
      return next(
        errorHandler(400, "userName must be between 3 and 20 characters")
      );
    }
    if (req.body.userName.includes(" ")) {
      return next(errorHandler(400, "userName should not contain spaces"));
    }
    if (req.body.userName !== req.body.userName.toLowerCase()) {
      return next(errorHandler(400, " UserName must be lowercase"));
    }
    if (!req.body.userName.match(/^[a-zA-Z0-9]+$/)) {
      return next(
        errorHandler(400, "UserName can only contain letters and numbers")
      );
    }
  }
  try {
    const updateUser = await User.findByIdAndUpdate(
      req.params.userId,
      {
        $set: {
          userName: req.body.userName,
          email: req.body.email,
          profilePicture: req.body.profilePicture,
          password: req.body.password,
        },
      },
      { new: true }
    );
    const { password, ...rest } = updateUser._doc;
    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

// ======================================
// delete "user" using id - API
// ======================================

export const deleteUser = async (req, res, next) => {
  if (req.user.id !== req.params.userId) {
    return next(errorHandler(403, "you are not allowed to delete the user"));
  }
  try {
    await User.findByIdAndDelete(req.params.userId);
    res.status(200).json("User Deleted Successfully!");
  } catch (error) {
    next(error);
  }
};

export const signout = (req, res, next) => {
  try {
    res
      .clearCookie("access_token")
      .status(200)
      .json("user has been signed out");
  } catch (error) {
    next(error);
  }
};

// ================================
// get all "users" - API
// ================================
export const getAllusers = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "superAdmin") {
      return next(
        errorHandler(403, "You are not allowed to access all the users")
      );
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    const searchFilter = req.query.searchTerm
      ? {
          $or: [
            { userName: { $regex: req.query.searchTerm, $options: "i" } },
            { email: { $regex: req.query.searchTerm, $options: "i" } },
            { role: { $regex: req.query.searchTerm, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(searchFilter)
      .select("-__v")
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: sortDirection });

    const totalUser = await User.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalUser / limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      totalUser,
      totalPages,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// ===================================
// get available "admins users" without "restaurants" linked  - API
// ===================================

export const getAvailableAdmins = async (req, res, next) => {
  try {
    // only superAdmin is allowed
    if (req.user.role !== "superAdmin") {
      return next(
        errorHandler(403, "only superAdmin can access this resource")
      );
    }

    // admins who do not have restaurant linked

    const search = req.query.q || "";

    const admins = await User.find({
      role: "admin",
      restaurantId: { $exists: false },
      userName: { $regex: search, $options: "i" },
    }).select("_id userName email");

    res.status(200).json({
      success: true,
      message: "showing available admins",
      data: admins,
    });
  } catch (error) {
    next(error);
  }
};
