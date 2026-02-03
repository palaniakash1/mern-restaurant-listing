import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { errorHandler } from "./error.js";

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) {
      return next(errorHandler(401, "Authentication token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // FETCH FRESH USER DATA
    const user = await User.findById(decoded.id).select(
      "_id role restaurantId",
    );
    if (!user) {
      return next(errorHandler(401, "User not found"));
    }

    // Attach FULL auth context
    req.user = {
      id: user._id.toString(),
      role: user.role,
      restaurantId: user.restaurantId ? user.restaurantId.toString() : null,
    };

    next();
  } catch (error) {
    next(error);
  }
};
