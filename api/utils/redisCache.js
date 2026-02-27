/**
 * Redis Caching Layer
 * Provides in-memory and Redis caching for performance optimization
 *
 * Note: This utility works with or without Redis
 * If Redis is not available, it falls back to in-memory cache
 */

import Redis from "ioredis";

// ===================================================================
// CONFIGURATION
// ===================================================================

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CACHE_TTL = parseInt(process.env.CACHE_TTL || "300", 10); // 5 minutes default

// In-memory fallback cache
const memoryCache = new Map();
const memoryCacheTTL = new Map();

// ===================================================================
// REDIS CLIENT (with fallback)
// ===================================================================

let redisClient = null;
let isRedisAvailable = false;

/**
 * Initialize Redis connection
 */
export const initRedis = async () => {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });

    await redisClient.connect();
    isRedisAvailable = true;
    console.log("✅ Redis connected successfully");

    redisClient.on("error", (err) => {
      console.error("Redis error:", err.message);
      isRedisAvailable = false;
    });

    return true;
  } catch (error) {
    console.warn("⚠️ Redis not available, using in-memory cache");
    isRedisAvailable = false;
    return false;
  }
};

/**
 * Get Redis client status
 */
export const isRedisConnected = () => isRedisAvailable;

// ===================================================================
// CACHE OPERATIONS
// ===================================================================

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached value or null
 */
export const get = async (key) => {
  const cacheKey = `cache:${key}`;

  if (isRedisAvailable && redisClient) {
    try {
      const value = await redisClient.get(cacheKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Redis get error:", error.message);
    }
  }

  // Fallback to memory cache
  const expiry = memoryCacheTTL.get(cacheKey);
  if (expiry && Date.now() > expiry) {
    memoryCache.delete(cacheKey);
    memoryCacheTTL.delete(cacheKey);
    return null;
  }

  return memoryCache.get(cacheKey) || null;
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 */
export const set = async (key, value, ttl = CACHE_TTL) => {
  const cacheKey = `cache:${key}`;
  const serialized = JSON.stringify(value);

  if (isRedisAvailable && redisClient) {
    try {
      await redisClient.setex(cacheKey, ttl, serialized);
      return true;
    } catch (error) {
      console.error("Redis set error:", error.message);
    }
  }

  // Fallback to memory cache
  memoryCache.set(cacheKey, value);
  memoryCacheTTL.set(cacheKey, Date.now() + ttl * 1000);

  // Clean old entries if cache is too large
  if (memoryCache.size > 1000) {
    const now = Date.now();
    for (const [k, exp] of memoryCacheTTL.entries()) {
      if (now > exp) {
        memoryCache.delete(k);
        memoryCacheTTL.delete(k);
      }
    }
  }

  return true;
};

/**
 * Delete value from cache
 * @param {string} key - Cache key
 */
export const del = async (key) => {
  const cacheKey = `cache:${key}`;

  if (isRedisAvailable && redisClient) {
    try {
      await redisClient.del(cacheKey);
    } catch (error) {
      console.error("Redis delete error:", error.message);
    }
  }

  memoryCache.delete(cacheKey);
  memoryCacheTTL.delete(cacheKey);

  return true;
};

/**
 * Clear all cache
 */
export const clear = async () => {
  if (isRedisAvailable && redisClient) {
    try {
      const keys = await redisClient.keys("cache:*");
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      console.error("Redis clear error:", error.message);
    }
  }

  memoryCache.clear();
  memoryCacheTTL.clear();

  return true;
};

/**
 * Get cached or fetch data
 * @param {string} key - Cache key
 * @param {Function} fetcher - Function to fetch data if not cached
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} Cached or fetched data
 */
export const getOrFetch = async (key, fetcher, ttl = CACHE_TTL) => {
  // Try to get from cache
  const cached = await get(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  await set(key, data, ttl);

  return data;
};

// ===================================================================
// CACHE HELPERS FOR COMMON PATTERNS
// ===================================================================

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Key pattern to invalidate
 */
export const invalidatePattern = async (pattern) => {
  const cachePattern = `cache:${pattern}`;

  if (isRedisAvailable && redisClient) {
    try {
      const keys = await redisClient.keys(cachePattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      console.error("Redis invalidate error:", error.message);
    }
  }

  // Also clean memory cache
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern.replace("*", ""))) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    redis: isRedisAvailable,
    memorySize: memoryCache.size,
    ttl: CACHE_TTL,
  };
};

export default {
  initRedis,
  isRedisConnected,
  get,
  set,
  del,
  clear,
  getOrFetch,
  invalidatePattern,
  getCacheStats,
};
