import { hasPermission } from './permissions.js';
import { errorHandler } from './error.js';

export const can = (action, resource) => {
  return (req, res, next) => {
    if (!req.user?.role) {
      return next(errorHandler(401, 'Unauthorized'));
    }

    if (!hasPermission(req.user, resource, action)) {
      return next(errorHandler(403, 'Permission denied'));
    }

    next();
  };
};

export const canAny = (actions, resource) => {
  return (req, res, next) => {
    if (!req.user?.role) {
      return next(errorHandler(401, 'Unauthorized'));
    }

    const isAllowed = actions.some((action) =>
      hasPermission(req.user, resource, action)
    );
    if (!isAllowed) {
      return next(errorHandler(403, 'Permission denied'));
    }

    next();
  };
};
