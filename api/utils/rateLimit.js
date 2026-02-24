import { errorHandler } from "./error.js";

const stores = new Map();

export const createRateLimit = ({
  windowMs = 60 * 1000,
  max = 30,
  keyPrefix = "global",
} = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const key = `${keyPrefix}:${ip}`;

    let entry = stores.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
    }

    entry.count += 1;
    stores.set(key, entry);

    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(max - entry.count, 0)));
    res.setHeader("X-RateLimit-Reset", String(retryAfterSec));

    if (entry.count > max) {
      res.setHeader("Retry-After", String(retryAfterSec));
      return next(
        errorHandler(
          429,
          "Too many requests. Please wait before trying again.",
        ),
      );
    }

    next();
  };
};
