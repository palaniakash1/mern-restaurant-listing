import { errorHandler } from "../utils/error.js";
import bcryptjs from "bcryptjs";
import User from "../models/user.model.js";
import { withTransaction } from "../utils/withTransaction.js";
import { sanitizeAuditData } from "../utils/sanitizeAuditData.js";

import { logAudit } from "../utils/auditLogger.js";

import { diffObject } from "../utils/diff.js";
import { paginate } from "../utils/paginate.js";
import Restaurant from "../models/restaurant.model.js";

// ===============================================================================
// 🔷 GET /api/users/test — Test / health-check endpoint
// ===============================================================================
// Purpose:
// - Verify authentication & authorization wiring
// - Used during development and debugging
//
// Who can access:
// - SuperAdmin only
//
// Real-world usage:
// - Smoke test after deployment
// - Permission validation
//
// ===============================================================================

export const test = (req, res) => {
  res.json({ message: "API test message is displaying" });
};

// ===============================================================================
// 🔷 PATCH /api/users/{id} — Update user profile
// ===============================================================================
// Purpose:
// - Update basic user profile information
//
// Who can access:
// - SuperAdmin → any user
// - User → own account only
//
// Allowed fields:
// - userName
// - email
// - password
// - profilePicture
//
// Rules:
// - Password is hashed
// - Username is validated (lowercase, no spaces)
// - Email must be unique
//
// Side effects:
// - Audit log recorded (diff-based)
//
// Real-world usage:
// - Profile edit page
// - Admin user management
//
// ===============================================================================

export const updateUser = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { id } = req.params;

      if (req.user.role !== "superAdmin" && req.user.id !== id) {
        throw errorHandler(403, "you are not allowed to update the user");
      }

      const oldUser = await User.findById(id).session(session).lean();
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

      if (updates.email) {
        const exists = await User.findOne({
          email: updates.email,
          _id: { $ne: id },
        });
        if (exists) throw errorHandler(409, "Email already in use");
      }

      if (updates.email) {
        updates.email = updates.email.toLowerCase();
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: updates },
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
        await logAudit({
          actorId: req.user.id,
          actorRole: req.user.role,
          entityType: "user",
          entityId: updatedUser._id,
          action: "UPDATE",
          before: diff,
          after: null,
          ipAddress: req.headers["x-forwarded-for"] || req.ip,
        });
      }

      return updatedUser;
    });

    res.status(200).json({
      success: true,
      message: "user updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 DELETE /api/users/{id} — Permanently delete user (hard delete)
// ===============================================================================
// Purpose:
// - Completely remove a user from the system
//
// Who can access:
// - SuperAdmin → any user
// - User → own account only
//
// Notes:
// - This is a hard delete (data is removed)
// - Audit log stores sanitized snapshot
//
// Real-world usage:
// - Account closure
// - Admin enforcement
//
// ===============================================================================

export const deleteUser = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { id } = req.params;

      // 1️⃣ Must be authenticated
      if (!req.user) {
        throw errorHandler(401, "Unauthorized");
      }

      // Fetch snapshot BEFORE delete.
      const oldUser = await User.findById(id).session(session).lean();

      if (!oldUser) throw errorHandler(404, "user not found");

      // Authorization rules
      const isSuperAdmin = req.user.role === "superAdmin";
      const isSelfDelete = req.user.id === id;

      if (!isSuperAdmin && !isSelfDelete) {
        throw errorHandler(403, "You are not allowed to delete this user");
      }

      //  Delete user
      const deleted = await User.findByIdAndDelete(id, { session });

      if (!deleted) {
        throw errorHandler(404, "User not found");
      }

      // Audit log
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "user",
        entityId: oldUser._id,
        action: "DELETE",
        before: sanitizeAuditData(oldUser),
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });
      return {
        deletedid: oldUser._id,
        deletedName: oldUser.userName,
        deletedBy: req.user.id,
        deletedByName: req.user.name,
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

// ===============================================================================
// 🔷 PATCH /api/users/{id}/deactivate — Deactivate user account
// ===============================================================================
// Purpose:
// - Soft-disable a user without deleting data
//
// Who can access:
// - SuperAdmin → any user
// - User → own account only
//
// Effects:
// - isActive set to false
// - Login / access is blocked
//
// Real-world usage:
// - Temporary suspension
// - User self-deactivation
//
// ===============================================================================

export const deactivateUser = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { id } = req.params;

      // 1️⃣ Must be authenticated
      if (!req.user) {
        throw errorHandler(401, "Unauthorized");
      }

      // Fetch snapshot BEFORE delete.
      const oldUser = await User.findById(id).session(session);
      if (!oldUser) throw errorHandler(404, "user not found");

      if (!oldUser.isActive) {
        throw errorHandler(400, "already deactivated");
      }

      // Authorization rules
      const isSuperAdmin = req.user.role === "superAdmin";
      const isSelfDelete = req.user.id === id;

      if (!isSuperAdmin && !isSelfDelete) {
        throw errorHandler(403, "You are not allowed to disable this user");
      }

      //  Delete user
      oldUser.isActive = false;
      await oldUser.save({ session });

      // Audit log
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "user",
        entityId: oldUser._id,
        action: "STATUS_CHANGE",
        before: { isActive: true },
        after: { isActive: false },
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });
      return {
        userId: oldUser._id,
        userName: oldUser.userName,
        deactivatedBy: req.user.id,
      };
    });

    res.status(200).json({
      success: true,
      message:
        req.user.role === "superAdmin"
          ? "User deactivated successfully"
          : "Account deactivated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/users/{id}/restore — Restore deactivated user
// ===============================================================================
// Purpose:
// - Reactivate a previously deactivated user
//
// Who can access:
// - SuperAdmin only
//
// Rules:
// - User must already be inactive
//
// Real-world usage:
// - Appeal handling
// - Admin recovery actions
//
// ===============================================================================

export const restoreUser = async (req, res, next) => {
  try {
    await withTransaction(async (session) => {
      const user = await User.findById(req.params.id).session(session);
      if (!user) throw errorHandler(404, "user not found");

      if (user.isActive !== false) {
        throw errorHandler(400, "User already active");
      }

      user.isActive = true;
      await user.save({ session });

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "user",
        entityId: user._id,
        action: "STATUS_CHANGE",
        before: { isActive: false },
        after: { isActive: true },
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });
      return { restoredUserId: user._id };
    });

    res.json({ success: true, message: "user restored now!" });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/users — Get all users (system-wide view)
// ===============================================================================
// Purpose:
// - List all users in the system
//
// Who can access:
// - SuperAdmin only
//
// Supports:
// - Pagination
// - Search (username, email, role)
// - Sorting
//
// Real-world usage:
// - Admin user management
// - Audits & investigations
//
// ===============================================================================

export const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, q } = req.query;
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    const filter = q
      ? {
          $or: [
            { userName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { role: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const total = await User.countDocuments(filter);
    const pagination = paginate({ page, limit, total });

    const users = await User.find(filter)
      .select("-password")
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ updatedAt: sortDirection })
      .lean();

    res.status(200).json({
      success: true,
      ...pagination,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/users/admins — Get available admin users
// ===============================================================================
// Purpose:
// - Fetch admins who are not yet assigned to any restaurant
//
// Who can access:
// - SuperAdmin only
//
// Real-world usage:
// - Restaurant creation flow
// - Admin reassignment workflows
//
// ===============================================================================

export const getAvailableAdmins = async (req, res, next) => {
  try {
    const { page, limit, q } = req.query;

    // admins who do not have restaurant linked
    const filter = {
      role: "admin",
      restaurantId: { $in: [null, undefined] },
      userName: { $regex: q || "", $options: "i" },
    };

    const total = await User.countDocuments(filter);
    const pagination = paginate({ page, limit, total });

    const admins = await User.find(filter)
      .select("_id userName email")
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    res.status(200).json({
      success: true,
      message: "showing available admins",
      ...pagination,
      data: admins,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 POST /api/users — Create store manager
// ===============================================================================
// Purpose:
// - Create a storeManager user under an admin or superAdmin
//
// Who can access:
// - Admin
// - SuperAdmin
//
// Rules:
// - userName & email must be unique
// - Password is hashed
// - Admin-created storeManagers are linked via createdByAdminId
//
// Real-world usage:
// - Staff onboarding
// - Restaurant operations setup
//
// ===============================================================================

export const createStoreManager = async (req, res, next) => {
  try {
    const { userName, email, password } = req.body;

    if (!userName || !email || !password) {
      throw errorHandler(400, "All fields are required");
    }

    const existing = await User.findOne({
      $or: [{ email }, { userName }],
    });

    if (existing) throw errorHandler(409, "User already exists");

    const hashedPassword = bcryptjs.hashSync(password, 10);

    // const createdByAdminId = req.user.role === "admin" ? req.user.id : null;

    const storeManager = await User.create({
      userName: userName.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "storeManager",
      createdByAdminId: req.user.role === "admin" ? req.user.id : null,
    });

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: "user",
      entityId: storeManager._id,
      action: "CREATE",
      before: null,
      after: {
        role: "storeManager",
        email: storeManager.email,
      },
      ipAddress: req.headers["x-forwarded-for"] || req.ip,
    });

    res.status(201).json({
      success: true,
      message: "storeManager created successfully",
      data: {
        id: storeManager._id,
        userName: storeManager.userName,
        email: storeManager.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/users/{id}/restaurant — Assign storeManager to restaurant
// ===============================================================================
// Purpose:
// - Link a storeManager to a restaurant
//
// Who can access:
// - SuperAdmin → any restaurant
// - Admin → own restaurant only
//
// Rules:
// - User must be storeManager
// - StoreManager can only be assigned once
// - Admin can manage only storeManagers they created
//
// Real-world usage:
// - Staff assignment
// - Restaurant operations
//
// ===============================================================================

export const assignStoreManagerToRestaurant = async (req, res, next) => {
  try {
    await withTransaction(async (session) => {
      const { id } = req.params;
      const { restaurantId } = req.body;

      if (!restaurantId) throw errorHandler(400, "restaurantId required");

      // fetch storeManager
      const storeManager = await User.findById(id).session(session);
      if (!storeManager || storeManager.role !== "storeManager") {
        throw errorHandler(404, "StoreManager not found");
      }

      // prevent accidental reassignment
      if (storeManager.restaurantId) {
        throw errorHandler(
          409,
          "StoreManager already assigned to a restaurant",
        );
      }

      // admin can only manage storeManagers they created
      if (
        req.user.role === "admin" &&
        storeManager.createdByAdminId?.toString() !== req.user.id
      ) {
        throw errorHandler(403, "Not your storeManager");
      }

      // check restaurant exists
      const restaurant =
        await Restaurant.findById(restaurantId).session(session);
      if (!restaurant) {
        throw errorHandler(404, "Restaurant not found");
      }

      // ownership rules
      if (
        req.user.role === "admin" &&
        req.user.restaurantId?.toString() !== restaurantId
      ) {
        throw errorHandler(403, "Not your restaurant");
      }

      // assign
      storeManager.restaurantId = restaurantId;
      await storeManager.save({ session });

      // audit
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "user",
        entityId: storeManager._id,
        action: "UPDATE",
        after: { restaurantId },
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });
    });

    res.json({
      success: true,
      message: "StoreManager assigned to restaurant",
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/users/store-managers — List store managers
// ===============================================================================
// Purpose:
// - Fetch storeManager users
//
// Who can access:
// - SuperAdmin → all storeManagers
// - Admin → only storeManagers they created
//
// Supports:
// - Pagination
//
// Real-world usage:
// - Staff management dashboard
//
// ===============================================================================

export const getStoreManagers = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const filter = { role: "storeManager" };

    // admin → only their created storeManagers
    if (req.user.role === "admin") {
      filter.createdByAdminId = req.user.id;
    }

    // superAdmin → sees all storeManagers

    const total = await User.countDocuments(filter);

    const pagination = paginate({ page, limit, total });

    const storeManagers = await User.find(filter)
      .select("-password")
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      ...pagination,
      data: storeManagers,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 DELETE /api/users/{id}/restaurant — Unassign storeManager from restaurant
// ===============================================================================
// Purpose:
// - Remove restaurant assignment from a storeManager
//
// Who can access:
// - SuperAdmin
// - Admin → only own storeManagers
//
// Real-world usage:
// - Staff role changes
// - Restaurant closure or reassignment
//
// ===============================================================================

export const unassignStoreManager = async (req, res, next) => {
  try {
    await withTransaction(async (session) => {
      const { id } = req.params;

      const storeManager = await User.findById(id).session(session);
      if (!storeManager || storeManager.role !== "storeManager") {
        throw errorHandler(404, "StoreManager not found");
      }

      if (
        req.user.role === "admin" &&
        storeManager.createdByAdminId?.toString() !== req.user.id
      ) {
        throw errorHandler(403, "Not your storeManager");
      }

      if (!storeManager.restaurantId) {
        throw errorHandler(400, "StoreManager is not assigned");
      }
      storeManager.restaurantId = null;
      await storeManager.save({ session });

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "user",
        entityId: storeManager._id,
        action: "UPDATE",
        after: { restaurantId: null },
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });
    });

    res.json({ success: true, message: "StoreManager unassigned" });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/users/{id}/owner — Transfer storeManager ownership
// ===============================================================================
// Purpose:
// - Change which admin owns a storeManager
//
// Who can access:
// - SuperAdmin only
//
// Real-world usage:
// - Admin reassignment
// - Organizational restructuring
//
// ===============================================================================

export const changeStoreManagerOwner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newAdminId } = req.body;
    await withTransaction(async (session) => {
      const newAdmin = await User.findById(newAdminId).session(session);
      if (!newAdmin || newAdmin.role !== "admin") {
        throw errorHandler(400, "Invalid admin");
      }

      const storeManager = await User.findById(id);
      if (!storeManager || storeManager.role !== "storeManager") {
        throw errorHandler(404, "StoreManager not found");
      }

      storeManager.createdByAdminId = newAdminId;
      await storeManager.save({ session });

      await logAudit({
        actorId: req.user.id,
        actorRole: "superAdmin",
        entityType: "user",
        entityId: storeManager._id,
        action: "UPDATE",
        after: { createdByAdminId: newAdminId },
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });
    });
    res.json({ success: true, message: "Transferred successfully" });
  } catch (error) {
    next(error);
  }
};
