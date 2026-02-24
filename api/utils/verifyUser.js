import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { errorHandler } from "./error.js";

export const verifyToken = async (req, res, next) => {
  try {
    let token = null;

    // 1️⃣ Authorization header (Swagger / Postman / Mobile)

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // 2️⃣ Cookie (Browser)
    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      // let token = req.cookies?.access_token;
      return next(errorHandler(401, "Authentication token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // FETCH FRESH USER DATA
    const user = await User.findById(decoded.id).select(
      "_id role restaurantId isActive",
    );
    if (!user) {
      return next(errorHandler(401, "User not found"));
    }
    if (!user.isActive) {
      return next(errorHandler(403, "User account is inactive"));
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
