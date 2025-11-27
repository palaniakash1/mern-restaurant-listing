import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../7/error.js";

export const signup = async (req, res, next) => {
  const { userName, email, password } = req.body;
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
