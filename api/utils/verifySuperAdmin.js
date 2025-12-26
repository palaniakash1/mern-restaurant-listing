import { errorHandler } from "../utils/error.js";

export const verifySuperAdmin = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "superAdmin") {
      return next(errorHandler(403, "SuperAdmin access only"));
    }
    next();
  } catch (error) {
    next(error);
  }
};
