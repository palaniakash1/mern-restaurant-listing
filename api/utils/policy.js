import { PERMISSIONS } from "./permissions.js";
import { errorHandler } from "./error.js";

export const can = (action, resource) => {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      return next(errorHandler(401, "Unauthorized"));
    }

    const allowed = PERMISSIONS[role]?.[resource];

    if (!allowed || !allowed.includes(action)) {
      return next(errorHandler(403, "Permission denied"));
    }

    next();
  };
};
