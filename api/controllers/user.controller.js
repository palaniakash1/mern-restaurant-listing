import { errorHandler } from "../utils/error.js";
import bcryptjs from "bcryptjs";
import User from "../models/user.model.js";
import { withTransaction } from "../utils/withTransaction.js";
import AuditLog from "../models/auditLog.model.js";
import { diffObject } from "../utils/diff.js";

export const test = (req, res) => {
  res.json({ message: "API test message is displaying" });
};

// =========================================================
// update "user" using user Id - API
// =========================================================
export const updateUser = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { userId } = req.params;

      if (req.user.role !== "superAdmin" && req.user.id !== userId) {
        throw errorHandler(403, "you are not allowed to update the user");
      }

      const oldUser = await User.findById(userId).session(session);
      if (!oldUser) throw errorHandler(404, "User Not Found!");

      const allowedFields = ["userName", "password", "profilePicture", "email"];
      const updates = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      // password
      if (updates.password) {
        if (updates.password.length < 8) {
          throw errorHandler(400, "password must be atleast 8 characters");
        }
        updates.password = bcryptjs.hashSync(updates.password, 10);
      }

      // username
      if (updates.userName) {
        if (updates.userName.length < 3 || updates.userName.length > 30) {
          throw errorHandler(
            400,
            "userName must be between 3 and 30 characters",
          );
        }

        if (updates.userName.includes(" ")) {
          throw errorHandler(400, "userName should not contain spaces");
        }

        if (updates.userName !== updates.userName.toLowerCase()) {
          throw errorHandler(400, " UserName must be lowercase");
        }
        if (!updates.userName.match(/^[a-z0-9]+$/)) {
          throw errorHandler(
            400,
            "UserName can only contain lowercase  letters and numbers",
          );
        }
      }

      if (updates.email) updates.email = updates.email.toLowerCase();

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: updates,
        },
        { new: true, session },
      )
        .select("-password")
        .lean();

      if (!updatedUser) {
        throw errorHandler(404, "User not found after update");
      }
      // DIFF
      const diff = diffObject(oldUser, updatedUser, allowedFields);

      // AUDIT LOG (only if something changed)
      if (Object.keys(diff).length) {
        await AuditLog.create(
          [
            {
              actorId: req.user.id,
              actorRole: req.user.role,
              entityType: "user",
              entityId: updatedUser._id,
              action: "UPDATE",
              before: diff,
              after: null,
              ipAddress: req.headers["x-forwarded-for"] || req.ip,
            },
          ],
          { session },
        );
      }

      return updatedUser;
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// ======================================
// delete "user" using id - API
// ======================================

export const deleteUser = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { userId } = req.params;

      // 1️⃣ Must be authenticated
      if (!req.user) {
        throw errorHandler(401, "Unauthorized");
      }

      // Fetch snapshot BEFORE delete.
      const oldUser = await User.findById(userId).session(session).lean();

      if (!oldUser) throw errorHandler(404, "user not found");

      // Authorization rules
      const isSuperAdmin = req.user.role === "superAdmin";
      const isSelfDelete = req.user.id === userId;

      if (!isSuperAdmin && !isSelfDelete) {
        throw errorHandler(403, "You are not allowed to delete this user");
      }

      //  Delete user
      await User.findByIdAndDelete(userId, { session });

      // Audit log
      await AuditLog.create(
        [
          {
            actorId: req.user.id,
            actorRole: req.user.role,
            entityType: "user",
            entityId: oldUser._id,
            action: "DELETE",
            before: oldUser,
            after: null,
            ipAddress: req.headers["x-forwarded-for"] || req.ip,
          },
        ],
        { session },
      );
      return {
        deletedUserId: oldUser._id,
        deletedBy: req.user.id,
      };
    });

    res.status(200).json({
      success: true,
      message:
        req.user.role === "superAdmin"
          ? "User deleted successfully"
          : "Account deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const signout = async (req, res, next) => {
  try {
    if (req.user) {
      await AuditLog.create({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "auth",
        entityId: req.user.id,
        action: "LOGOUT",
        before: null,
        after: null,
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });
    }
    res.clearCookie("access_token").status(200).json({
      success: true,
      message: "user has been signed out",
    });
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
        errorHandler(403, "You are not allowed to access all the users"),
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
        errorHandler(403, "only superAdmin can access this resource"),
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
