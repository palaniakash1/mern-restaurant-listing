/**
 * Idempotency Key Middleware
 * Ensures identical requests are only executed once
 * 
 * Why Idempotency?
 * =================
 * In distributed systems, network failures can cause clients to retry requests.
 * Without idempotency, the same operation might be executed multiple times:
 * - Payment charged multiple times
 * - Order created multiple times
 * - User registered twice
 * 
 * With idempotency keys:
 * - Client generates a unique key for each unique operation
 * - Server tracks processed keys and returns cached response for duplicates
 * - Safe to retry!
 * 
 * Usage:
 * =====
 * 1. Client generates UUID for each unique operation
 * 2. Client sends request with header: X-Idempotency-Key: <uuid>
 * 3. Server caches response for that key (TTL: 24 hours typically)
 * 4. If client retries with same key, server returns cached response
 * 
 * Example:
 * ========
 * POST /api/orders (idempotency-key: abc-123)
 * → Creates order, returns 201
 * 
 * POST /api/orders (idempotency-key: abc-123)  // Retry!
 * → Returns cached 201 response (no new order)
 * 
 * POST /api/orders (idempotency-key: xyz-789)  // Different key
 * → Creates new order
 */

import crypto from "crypto";

// ===================================================================
// CONFIGURATION
// ===================================================================

const IDEMPOTENCY_TTL = parseInt(process.env.IDEMPOTENCY_TTL || "86400", 10); // 24 hours
const IDEMPOTENCY_KEY_HEADER = "x-idempotency-key";
const IDEMPOTENCY_KEY_HEADER_LOWER = "x-idempotency-key".toLowerCase();

// In-memory store (use Redis in production)
// Structure: { key: { response, expiresAt } }
const idempotencyCache = new Map();

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Generate a new idempotency key (for clients)
 * @returns {string} UUID v4
 */
export const generateIdempotencyKey = () => {
  return crypto.randomUUID();
};

/**
 * Get idempotency key from request
 * @param {Object} req - Express request object
 * @returns {string|null} Idempotency key or null
 */
export const getIdempotencyKey = (req) => {
  // Check headers (case-insensitive)
  const headerKey = Object.keys(req.headers).find(
    (key) => key.toLowerCase() === IDEMPOTENCY_KEY_HEADER_LOWER
  );
  return headerKey ? req.headers[headerKey] : null;
};

/**
 * Validate idempotency key format
 * @param {string} key - Idempotency key
 * @returns {boolean} Is valid
 */
export const isValidIdempotencyKey = (key) => {
  if (!key || typeof key !== "string") return false;
  
  // Must be at least 8 characters and max 64
  if (key.length < 8 || key.length > 64) return false;
  
  // Should only contain alphanumeric, hyphens, underscores
  return /^[a-zA-Z0-9\-_]+$/.test(key);
};

/**
 * Get cached response for idempotency key
 * @param {string} key - Idempotency key
 * @returns {Object|null} Cached response or null
 */
const getCachedResponse = (key) => {
  const cached = idempotencyCache.get(key);
  
  if (!cached) return null;
  
  // Check expiration
  if (Date.now() > cached.expiresAt) {
    idempotencyCache.delete(key);
    return null;
  }
  
  return cached.response;
};

/**
 * Cache response for idempotency key
 * @param {string} key - Idempotency key
 * @param {Object} response - Response to cache
 * @param {number} ttl - Time to live in seconds
 */
const cacheResponse = (key, response, ttl = IDEMPOTENCY_TTL) => {
  const expiresAt = Date.now() + ttl * 1000;
  
  idempotencyCache.set(key, {
    response,
    expiresAt,
  });
  
  // Cleanup old entries periodically
  if (idempotencyCache.size > 10000) {
    cleanupExpired();
  }
};

/**
 * Clean up expired entries
 */
const cleanupExpired = () => {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now > value.expiresAt) {
      idempotencyCache.delete(key);
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupExpired, 10 * 60 * 1000);

// ===================================================================
// MIDDLEWARE
// ===================================================================

/**
 * Create idempotency middleware
 * @param {Object} options - Configuration options
 * @param {string[]} options.methods - HTTP methods to apply idempotency (default: ['POST', 'PUT', 'PATCH'])
 * @param {number} options.ttl - Cache TTL in seconds
 * @param {boolean} options.requireKey - Whether to require idempotency key (default: false)
 */
export const createIdempotencyMiddleware = (options = {}) => {
  const {
    methods = ["POST", "PUT", "PATCH"],
    ttl = IDEMPOTENCY_TTL,
    requireKey = false,
  } = options;
  
  return (req, res, next) => {
    // Only apply to configured methods
    if (!methods.includes(req.method)) {
      return next();
    }
    
    // Get idempotency key
    const idempotencyKey = getIdempotencyKey(req);
    
    // Check if key is required
    if (requireKey && !idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: "Idempotency key is required for this operation",
        header: IDEMPOTENCY_KEY_HEADER,
      });
    }
    
    // If no key provided, skip idempotency (not required)
    if (!idempotencyKey) {
      return next();
    }
    
    // Validate key format
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return res.status(400).json({
        success: false,
        message: "Invalid idempotency key format",
        hint: "Key must be 8-64 characters, alphanumeric with hyphens/underscores",
      });
    }
    
    // Check for cached response
    const cachedResponse = getCachedResponse(idempotencyKey);
    
    if (cachedResponse) {
      // Return cached response
      console.log(`🔄 Idempotency: Returning cached response for key ${idempotencyKey}`);
      
      // Set headers to indicate cached response
      res.set("X-Idempotency-Key", idempotencyKey);
      res.set("X-Idempotent-Replayed", "true");
      
      return res.status(cachedResponse.statusCode).json(cachedResponse.body);
    }
    
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json to cache response
    res.json = function (body) {
      // Only cache successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheResponse(idempotencyKey, {
          statusCode: res.statusCode,
          body,
        }, ttl);
        
        console.log(`💾 Idempotency: Cached response for key ${idempotencyKey}`);
      }
      
      // Set header
      res.set("X-Idempotency-Key", idempotencyKey);
      
      return originalJson(body);
    };
    
    next();
  };
};

// ===================================================================
// DECORATOR FOR CONTROLLERS
// ===================================================================

/**
 * Make a function idempotent
 * @param {Function} fn - Function to make idempotent
 * @param {Object} options - Options
 * @returns {Function} Wrapped function
 */
export const idempotent = (fn, options = {}) => {
  const { keyExtractor, ttl = IDEMPOTENCY_TTL } = options;
  
  return async (...args) => {
    // Extract key from arguments
    const key = keyExtractor ? keyExtractor(...args) : null;
    
    if (!key) {
      return fn(...args);
    }
    
    // Check cache
    const cached = getCachedResponse(key);
    if (cached) {
      return cached.response;
    }
    
    // Execute function
    const result = await fn(...args);
    
    // Cache result
    cacheResponse(key, { statusCode: 200, body: result }, ttl);
    
    return result;
  };
};

// ===================================================================
// UTILITY EXPORTS
// ===================================================================

/**
 * Clear all idempotency cache (for testing)
 */
export const clearIdempotencyCache = () => {
  idempotencyCache.clear();
};

/**
 * Get cache statistics
 */
export const getIdempotencyStats = () => {
  cleanupExpired(); // Clean first
  return {
    size: idempotencyCache.size,
    ttl: IDEMPOTENCY_TTL,
  };
};

export default {
  generateIdempotencyKey,
  getIdempotencyKey,
  isValidIdempotencyKey,
  createIdempotencyMiddleware,
  idempotent,
  clearIdempotencyCache,
  getIdempotencyStats,
  IDEMPOTENCY_KEY_HEADER,
};
