/**
 * Idempotency Middleware - Simple version
 * Prevents duplicate POST/PUT/PATCH requests
 * 
 * Usage:
 * app.post('/api/data', idempotentMiddleware, controller);
 * 
 * Client sends: X-Idempotency-Key: unique-key-123
 */

import crypto from "crypto";

const idempotencyCache = new Map();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Simple idempotency middleware
 */
export const idempotentMiddleware = (req, res, next) => {
  // Only apply to write methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }
  
  const key = req.headers["x-idempotency-key"];
  
  if (!key) {
    // No key provided - proceed normally
    return next();
  }
  
  // Check if we've seen this key before
  const cached = idempotencyCache.get(key);
  
  if (cached && Date.now() < cached.expiresAt) {
    // Return cached response
    return res.status(cached.statusCode).json(cached.body);
  }
  
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json to cache response
  res.json = function (body) {
    // Cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyCache.set(key, {
        statusCode: res.statusCode,
        body,
        expiresAt: Date.now() + IDEMPOTENCY_TTL,
      });
    }
    
    // Set header
    res.set("X-Idempotency-Key", key);
    
    return originalJson(body);
  };
  
  next();
};

export default idempotentMiddleware;
