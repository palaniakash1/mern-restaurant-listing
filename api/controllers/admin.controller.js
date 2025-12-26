import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";


// create a new admin and storeManager using SuperAdmin id (only superadmin can create other users using this API)

export const createUserBySuperAdmin = async (req, res, next) => {
  try {
    const { userName, email, password, role } = req.body;

    if (!["admin", "storeManager"].includes(role)) {
      return next(errorHandler(400, "Invalid role assignment"));
    }

    if (!userName || !email || !password) {
      return next(errorHandler(400, "All fields are required"));
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { userName }],
    });

    if (existingUser) {
      return next(errorHandler(400, "User already exists"));
    }

    const hashedPassword = bcryptjs.hashSync(password, 10);

    const newUser = new User({
      userName: userName.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
    });

    await newUser.save();

    res.status(201).json({
      message: `${role} created successfully`,
      user: {
        id: newUser._id,
        userName: newUser.userName,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    next(error); // prevents hanging requests
  }
};


