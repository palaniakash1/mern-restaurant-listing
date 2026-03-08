import { errorHandler } from './error.js';
import { atomicRateLimitIncrement } from './redisCache.js';

export const createRateLimit = ({
  windowMs = 60 * 1000,
  max = 30,
  keyPrefix = 'global'
} = {}) => {
  return async (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const key = `ratelimit:${keyPrefix}:${ip}`;

    const { count, ttlMs } = await atomicRateLimitIncrement(key, windowMs);
    const retryAfterSec = Math.ceil(ttlMs / 1000);
    const remaining = Math.max(max - count, 0);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(retryAfterSec));

    if (count > max) {
      res.setHeader('Retry-After', String(retryAfterSec));
      return next(
        errorHandler(
          429,
          'Too many requests. Please wait before trying again.'
        )
      );
    }

    next();
  };
};
