import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import jwt from "jsonwebtoken";
import { logAudit } from "../utils/auditLogger.js";

// ===============================================
// signup module
// ===============================================

export const signup = async (req, res, next) => {
  try {
    const { userName, email, password } = req.body;

    // 🔍 1. Manual Validations
    // user name validation ---------------- empty name
    if (!userName || userName.trim() === "") {
      return next(errorHandler(400, "Please provide a valid username"));
    }
    // --------------------------------------length check
    if (userName.length < 3) {
      return next(
        errorHandler(400, "Username must be at least 3 characters long"),
      );
    }
    if (req.body.userName !== req.body.userName.toLowerCase()) {
      return next(errorHandler(400, " UserName must be lowercase"));
    }

    // simple email validation using regex
    // --------------------------------------empty email check
    if (!email || email.trim() === "") {
      return next(errorHandler(400, "Please enter an email"));
    }

    // --------------------------------------email format check
    // simple email validation using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(errorHandler(400, "Please enter a valid email address"));
    }

    // password validation ---------------- empty password
    if (!password || password.trim() === "") {
      return next(errorHandler(400, "Please enter a password"));
    }
    // --------------------------------------password strength check
    // simple password validation using regex
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return next(
        errorHandler(
          400,
          "Minimum 8 characters total. Must contain at least 1 capital letter (A-Z). Must contain at least 1 number (0-9).",
        ),
      );
    }

    // 🔍 2. Check duplicates manually (faster than catching Mongo error)
    const existingUserName = await User.findOne({ userName });
    if (existingUserName) {
      return next(
        errorHandler(
          400,
          `Username '${existingUserName}' already exists, try login instead`,
        ),
      );
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return next(
        errorHandler(
          400,
          `Email '${existingEmail}' already exists, try login instead`,
        ),
      );
    }

    // previous codes
    const hashedPassword = bcryptjs.hashSync(password, 10);
    const lowerCasedEmail = email.toLowerCase();

    // Here, you would typically add logic to save the user to your database
    const newUser = new User({
      userName,
      email: lowerCasedEmail,
      password: hashedPassword,
      role: "user", // ⬅️ Explicitly set the default role here
    });

    await newUser.save();

    // AUDIT LOG — SIGNUP
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

    res.status(201).json("User registered successfully");
  } catch (error) {
    next(error);
  }
};

// ================================================
// signin module
// ================================================

export const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // simple email validation using regex
    // --------------------------------------empty email check
    if (!email || email.trim() === "") {
      return next(errorHandler(400, "Please enter an email"));
    }

    // --------------------------------------email format check
    // simple email validation using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(errorHandler(400, "Please enter a valid email address"));
    }

    // password validation ---------------- empty password
    if (!password || password.trim() === "") {
      return next(errorHandler(400, "Please enter a password"));
    }

    const lowerCasedEmail = email.toLowerCase();

    const validUser = await User.findOne({ email: lowerCasedEmail }).select(
      "+password",
    );

    if (!validUser) {
      await logAudit({
        actorId: null,
        actorRole: "anonymous",
        entityType: "auth",
        entityId: null,
        action: "LOGIN_FAILED",
        before: { email: lowerCasedEmail },
        after: null,
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });

      return next(
        errorHandler(404, `User with this email ${lowerCasedEmail} not found`),
      );
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
          `Password does not match for email ${lowerCasedEmail}`,
        ),
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: validUser._id,
        role: validUser.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    const { password: pass, ...rest } = validUser._doc; // Exclude password from user data

    // after successful login
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
      .cookie("access_token", token, { httpOnly: true })
      .status(200)
      .json(rest);
  } catch (error) {
    next(error);
  }
};

// ================================================
// google oauth module
// ================================================

export const google = async (req, res, next) => {
  try {
    const { name, email, googlePhotoUrl } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );
      const { password, ...rest } = user._doc;

      res
        .status(200)
        .cookie("access_token", token, { httpOnly: true })
        .json(rest);
    } else {
      const generatedPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);

      const newUser = new User({
        userName:
          name.toLowerCase().split(" ").join("") +
          Math.random().toString(9).slice(-4),
        email,
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
      res
        .status(200)
        .cookie("access_token", token, {
          httpOnly: true,
        })
        .json(rest);
    }
  } catch (error) {
    next(error);
  }
};

// ======================================
// signout - API
// ======================================

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
    res.clearCookie("access_token").status(200).json({
      success: true,
      message: "signed out successfully",
    });
  } catch (error) {
    next(error);
  }
};
