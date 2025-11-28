import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import jwt from "jsonwebtoken";

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
  // --------------------------------------number check
  // simple email validation using regex
  const userNameRegex = /^\D+$/;
  if (!userNameRegex.test(userName)) {
    return next(errorHandler(400, "Username must not contain numbers"));
  }

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

  // Here, you would typically add logic to save the user to your database
  const newUser = new User({ userName, email, password: hashedPassword });

  try {
    await newUser.save();
    res.status(201).json("User registered successfully");
  } catch (error) {
    next(error);
  }
};

// signin module
export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {

    const validUser = await User.findOne({ email });
    console.log("Entered password:", password);
    console.log("Stored hash:", validUser.password);
    if (!validUser)
      return next(errorHandler(404, `User with this email ${email} not found`));

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword)
      return next(
        errorHandler(401, `Password does not match for email ${email}`)
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
