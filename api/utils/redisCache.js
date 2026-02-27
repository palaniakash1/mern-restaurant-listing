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
const REDIS_CONNECT_TIMEOUT = 2000; // 2 second timeout for Redis connection

// In-memory fallback cache
const memoryCache = new Map();
const memoryCacheTTL = new Map();

// ===================================================================
// REDIS CLIENT (with fallback)
// ===================================================================

let redisClient = null;
let isRedisAvailable = false;

/**
 * Initialize Redis connection with timeout
 */
export const initRedis = async () => {
  // If no Redis URL configured, skip Redis entirely
  if (!REDIS_URL || REDIS_URL.trim() === "") {
    console.log("ℹ️ Redis URL not configured, using in-memory cache");
    isRedisAvailable = false;
    return false;
  }

  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry, fail fast
      connectTimeout: REDIS_CONNECT_TIMEOUT,
      commandTimeout: REDIS_CONNECT_TIMEOUT,
      lazyConnect: true,
      enableOfflineQueue: false, // Fail immediately if not connected
    });

    // Set up connection timeout
    const connectionPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis connection timeout')), REDIS_CONNECT_TIMEOUT)
    );

    await Promise.race([connectionPromise, timeoutPromise]);
    
    isRedisAvailable = true;
    console.log("✅ Redis connected successfully");
    
    redisClient.on("error", (err) => {
      console.warn("Redis error:", err.message);
      isRedisAvailable = false;
    });
    
    redisClient.on("close", () => {
      isRedisAvailable = false;
      console.log("Redis connection closed");
    });
    
    return true;
  } catch (error) {
    console.warn(`⚠️ Redis not available: ${error.message}, using in-memory cache`);
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
      // Add timeout for Redis operations
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis get timeout')), 1000)
      );
      const getPromise = redisClient.get(cacheKey);
      
      const value = await Promise.race([getPromise, timeoutPromise]);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn("Redis get error:", error.message);
      isRedisAvailable = false;
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
      // Add timeout for Redis operations
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis set timeout')), 1000)
      );
      const setPromise = redisClient.setex(cacheKey, ttl, serialized);
      
      await Promise.race([setPromise, timeoutPromise]);
      return true;
    } catch (error) {
      console.warn("Redis set error:", error.message);
      isRedisAvailable = false;
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
      console.warn("Redis delete error:", error.message);
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
      console.warn("Redis clear error:", error.message);
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
  try {
    const cached = await get(key);
    if (cached !== null) {
      return cached;
    }
  } catch (error) {
    console.warn("Cache get error, falling back to fetcher:", error.message);
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache (don't await, fire and forget)
  set(key, data, ttl).catch(err => console.warn("Cache set error:", err.message));

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
      console.warn("Redis invalidate error:", error.message);
    }
  }

  // Also clean memory cache
  const patternStr = pattern.replace("*", "");
  for (const key of memoryCache.keys()) {
    if (key.includes(patternStr)) {
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
