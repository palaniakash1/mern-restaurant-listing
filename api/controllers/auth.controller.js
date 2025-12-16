import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import jwt from "jsonwebtoken";

// ===============================================
// signup module
// ===============================================

export const signup = async (req, res, next) => {
  const { userName, email, password } = req.body;

  // 🔍 1. Manual Validations
  // user name validation ---------------- empty name
  if (!userName || userName.trim() === "") {
    return next(errorHandler(400, "Please provide a valid username"));
  }
  // --------------------------------------length check
  if (userName.length < 3) {
    return next(
      errorHandler(400, "Username must be at least 3 characters long")
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
  // simple email validation using regex
  const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;
  if (!passwordRegex.test(password)) {
    return next(
      errorHandler(
        400,
        "Minimum 8 characters total. Must contain at least 1 capital letter (A-Z). Must contain at least 1 number (0-9)."
      )
    );
  }

  // 🔍 2. Check duplicates manually (faster than catching Mongo error)
  const existingUserName = await User.findOne({ userName });
  if (existingUserName) {
    return next(
      errorHandler(
        400,
        `Username '${userName}' already exists, try login instead`
      )
    );
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return next(
      errorHandler(400, `Email '${email}' already exists, try login instead`)
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

  try {
    await newUser.save();
    res.status(201).json("User registered successfully");
  } catch (error) {
    next(error);
  }
};

// ================================================
// signin module
// ================================================

export const signin = async (req, res, next) => {
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

  try {
    const validUser = await User.findOne({ email: lowerCasedEmail });

    if (!validUser)
      return next(
        errorHandler(404, `User with this email ${lowerCasedEmail} not found`)
      );

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword)
      return next(
        errorHandler(
          401,
          `Password does not match for email ${lowerCasedEmail}`
        )
      );

    // Generate JWT token
    const token = jwt.sign({ id: validUser._id }, process.env.JWT_SECRET);
    const { password: pass, ...rest } = validUser._doc; // Exclude password from user data

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
  const { name, email, googlePhotoUrl } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
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
      });
      await newUser.save();
      const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);
      const { passowrd, ...rest } = newUser._doc;
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
