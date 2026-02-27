import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import { logAudit } from "../utils/auditLogger.js";
import { getClientIp } from "../utils/controllerHelpers.js";


// ===============================================================================
// 🔷 POST /api/admin/users — Create user (Admin / StoreManager)
// ===============================================================================
// Purpose:
// - Allow SuperAdmin to directly create privileged users
// - Bypass public signup and admin self-service flows
//
// Who can access:
// - SuperAdmin only
//
// Supported roles:
// - admin
// - storeManager
//
// Rules:
// - role must be explicitly provided
// - Password must be at least 8 characters
// - userName and email must be unique
// - Credentials are stored securely (hashed password)
//
// Ownership rules:
// - Admin → createdByAdminId is set to SuperAdmin ID
// - StoreManager → no restaurant or admin assigned at creation
//
// Side effects:
// - Audit log recorded (CREATE action)
//
// Real-world usage:
// - Internal onboarding
// - Emergency admin creation
// - Platform-level user provisioning
//
// ===============================================================================

export const createUserBySuperAdmin = async (req, res, next) => {
  try {
    // Defense-in-depth: Verify superAdmin role at controller level
    if (req.user.role !== "superAdmin") {
      return next(errorHandler(403, "Only superAdmin can perform this action"));
    }

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

    await logAudit({
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
      ipAddress: getClientIp(req),
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
