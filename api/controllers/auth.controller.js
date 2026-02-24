import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import jwt from "jsonwebtoken";
import { logAudit } from "../utils/auditLogger.js";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});

export const signup = async (req, res, next) => {
  try {
    const { userName, email, password } = req.body;

    if (!userName || userName.trim() === "") {
      return next(errorHandler(400, "Please provide a valid username"));
    }
    if (userName.length < 3) {
      return next(
        errorHandler(400, "Username must be at least 3 characters long"),
      );
    }
    if (userName !== userName.toLowerCase()) {
      return next(errorHandler(400, "UserName must be lowercase"));
    }

    if (!email || email.trim() === "") {
      return next(errorHandler(400, "Please enter an email"));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(errorHandler(400, "Please enter a valid email address"));
    }

    if (!password || password.trim() === "") {
      return next(errorHandler(400, "Please enter a password"));
    }
    if (!PASSWORD_REGEX.test(password)) {
      return next(
        errorHandler(
          400,
          "Minimum 8 characters total. Must contain at least 1 capital letter (A-Z). Must contain at least 1 number (0-9).",
        ),
      );
    }

    const normalizedUserName = userName.toLowerCase();
    const normalizedEmail = email.toLowerCase();

    const existingUserName = await User.findOne({ userName: normalizedUserName });
    if (existingUserName) {
      return next(
        errorHandler(
          409,
          `Username '${normalizedUserName}' already exists, try login instead`,
        ),
      );
    }

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return next(
        errorHandler(
          409,
          `Email '${normalizedEmail}' already exists, try login instead`,
        ),
      );
    }

    const hashedPassword = bcryptjs.hashSync(password, 10);

    const newUser = new User({
      userName: normalizedUserName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
    });

    await newUser.save();

    await logAudit({
      actorId: newUser._id,
      actorRole: "user",
      entityType: "user",
      entityId: newUser._id,
      action: "CREATE",
      before: null,
      after: {
        userName: newUser.userName,
        email: newUser.email,
        role: newUser.role,
      },
      ipAddress: req.headers["x-forwarded-for"] || req.ip,
    });

    res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (error) {
    next(error);
  }
};

export const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || email.trim() === "") {
      return next(errorHandler(400, "Please enter an email"));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(errorHandler(400, "Please enter a valid email address"));
    }

    if (!password || password.trim() === "") {
      return next(errorHandler(400, "Please enter a password"));
    }

    const normalizedEmail = email.toLowerCase();

    const validUser = await User.findOne({ email: normalizedEmail }).select(
      "+password",
    );

    if (!validUser) {
      await logAudit({
        actorId: null,
        actorRole: "anonymous",
        entityType: "auth",
        entityId: null,
        action: "LOGIN_FAILED",
        before: { email: normalizedEmail },
        after: null,
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });

      return next(
        errorHandler(404, `User with this email ${normalizedEmail} not found`),
      );
    }

    if (!validUser.isActive) {
      await logAudit({
        actorId: validUser._id,
        actorRole: validUser.role,
        entityType: "auth",
        entityId: validUser._id,
        action: "LOGIN_FAILED",
        before: { email: validUser.email, reason: "inactive_account" },
        after: null,
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });
      return next(errorHandler(403, "User account is inactive"));
    }

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) {
      await logAudit({
        actorId: validUser._id,
        actorRole: validUser.role,
        entityType: "auth",
        entityId: validUser._id,
        action: "LOGIN_FAILED",
        before: { email: validUser.email },
        after: null,
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });

      return next(
        errorHandler(
          401,
          `Password does not match for email ${normalizedEmail}`,
        ),
      );
    }

    const token = jwt.sign(
      {
        id: validUser._id,
        role: validUser.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    const { password: pass, ...rest } = validUser._doc;

    await logAudit({
      actorId: validUser._id,
      actorRole: validUser.role,
      entityType: "auth",
      entityId: validUser._id,
      action: "LOGIN",
      before: null,
      after: {
        email: validUser.email,
      },
      ipAddress: req.headers["x-forwarded-for"] || req.ip,
    });

    res
      .cookie("access_token", token, buildCookieOptions())
      .status(200)
      .json(rest);
  } catch (error) {
    next(error);
  }
};

export const google = async (req, res, next) => {
  try {
    const { name, email, googlePhotoUrl } = req.body;

    if (!email) {
      return next(errorHandler(400, "Email is required"));
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (!user.isActive) {
        return next(errorHandler(403, "User account is inactive"));
      }
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );
      const { password, ...rest } = user._doc;

      return res
        .status(200)
        .cookie("access_token", token, buildCookieOptions())
        .json(rest);
    }

    const generatedPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8);
    const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);

    const newUser = new User({
      userName:
        (name || "user").toLowerCase().split(" ").join("") +
        Math.random().toString(9).slice(-4),
      email: normalizedEmail,
      password: hashedPassword,
      profilePicture: googlePhotoUrl,
      role: "user",
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    const { password, ...rest } = newUser._doc;

    return res
      .status(200)
      .cookie("access_token", token, buildCookieOptions())
      .json(rest);
  } catch (error) {
    next(error);
  }
};

export const signout = async (req, res, next) => {
  try {
    if (req.user) {
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "auth",
        entityId: req.user.id,
        action: "LOGOUT",
        before: "login",
        after: null,
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });
    }

    res
      .clearCookie("access_token", buildCookieOptions())
      .status(200)
      .json({
        success: true,
        message: "signed out successfully",
      });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      "_id userName email role restaurantId profilePicture isActive",
    );
    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(errorHandler(400, "currentPassword and newPassword are required"));
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return next(
        errorHandler(
          400,
          "Minimum 8 characters total. Must contain at least 1 capital letter (A-Z). Must contain at least 1 number (0-9).",
        ),
      );
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    if (!user.isActive) {
      return next(errorHandler(403, "User account is inactive"));
    }

    const validCurrentPassword = bcryptjs.compareSync(
      currentPassword,
      user.password,
    );
    if (!validCurrentPassword) {
      await logAudit({
        actorId: user._id,
        actorRole: user.role,
        entityType: "auth",
        entityId: user._id,
        action: "LOGIN_FAILED",
        before: { reason: "invalid_current_password" },
        after: null,
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });
      return next(errorHandler(401, "Current password is invalid"));
    }

    user.password = bcryptjs.hashSync(newPassword, 10);
    await user.save();

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      entityType: "user",
      entityId: user._id,
      action: "UPDATE",
      before: null,
      after: { passwordChanged: true },
      ipAddress: req.headers["x-forwarded-for"] || req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};
