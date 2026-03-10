import User from '../models/user.model.js';
import { errorHandler } from './error.js';
import config from '../config.js';
import jwtRotationService from '../services/jwtRotation.service.js';

export const verifyToken = async (req, res, next) => {
  try {
    let token = null;
    let authSource = null;

    // 1️⃣ Authorization header (Swagger / Postman / Mobile)

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
      authSource = 'header';
    }
    // 2️⃣ Cookie (Browser)
    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token;
      authSource = 'cookie';
    }

    if (!token) {
      // let token = req.cookies?.access_token;
      return next(errorHandler(401, 'Authentication token missing'));
    }

    const decoded = jwtRotationService.verifyToken(token, {
      fallbackSecret: config.jwtSecret
    });

    // FETCH FRESH USER DATA
    const user = await User.findById(decoded.id).select(
      '_id role restaurantId isActive'
    );
    if (!user) {
      return next(errorHandler(401, 'User not found'));
    }
    if (!user.isActive) {
      return next(errorHandler(403, 'User account is inactive'));
    }

    // Attach FULL auth context
    req.user = {
      id: user._id.toString(),
      role: user.role,
      restaurantId: user.restaurantId ? user.restaurantId.toString() : null
    };
    req.authSource = authSource;

    next();
  } catch (error) {
    if (
      error?.name === 'JsonWebTokenError' ||
      error?.name === 'TokenExpiredError'
    ) {
      return next(errorHandler(401, 'Invalid or expired authentication token'));
    }
    next(error);
  }
};
