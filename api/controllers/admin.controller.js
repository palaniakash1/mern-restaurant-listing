import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import AuditLog from "../models/auditLog.model.js";

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

    if (password.length < 8) {
      return next(errorHandler(400, "Password must be at least 8 characters"));
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
      createdByAdminId: role === "admin" ? req.user.id : null,
    });

    await newUser.save();

    await AuditLog.create({
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: "user",
      entityId: newUser._id,
      action: "CREATE",
      before: null,
      after: {
        role: newUser.role,
        email: newUser.email,
      },
      ipAddress: req.headers["x-forwarded-for"] || req.ip,
    });

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
