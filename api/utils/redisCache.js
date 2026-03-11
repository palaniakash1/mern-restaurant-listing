import Redis from 'ioredis';
import { logger } from './logger.js';
import config from '../config.js';

const CACHE_TTL = config.redis.cacheTtlSeconds;
const REDIS_CONNECT_TIMEOUT = config.redis.connectTimeoutMs;

const memoryCache = new Map();
const memoryCacheTTL = new Map();
const memoryCounters = new Map();

let redisClient = null;
let isRedisAvailable = false;

const memoryGet = (key) => {
  const expiry = memoryCacheTTL.get(key);
  if (expiry && Date.now() > expiry) {
    memoryCache.delete(key);
    memoryCacheTTL.delete(key);
    return null;
  }
  return memoryCache.get(key) || null;
};

const memorySet = (key, value, ttlSeconds) => {
  memoryCache.set(key, value);
  memoryCacheTTL.set(key, Date.now() + ttlSeconds * 1000);
};

const toSafeJson = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

export const initRedis = async () => {
  const redisUrl = config.redis.url;
  if (!redisUrl) {
    logger.info('redis.disabled', { reason: 'missing REDIS_URL' });
    isRedisAvailable = false;
    return false;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      connectTimeout: REDIS_CONNECT_TIMEOUT,
      commandTimeout: REDIS_CONNECT_TIMEOUT,
      lazyConnect: true,
      enableOfflineQueue: false
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      logger.warn('redis.error', { error: err.message });
    });
    redisClient.on('close', () => {
      isRedisAvailable = false;
      logger.warn('redis.closed', {});
    });

    const connectionPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) =>
      // eslint-disable-next-line no-undef
      setTimeout(() => reject(new Error('Redis connection timeout')), REDIS_CONNECT_TIMEOUT)
    );
    await Promise.race([connectionPromise, timeoutPromise]);

    isRedisAvailable = true;
    logger.info('redis.connected', { urlConfigured: true });
    return true;
  } catch (error) {
    isRedisAvailable = false;
    try {
      redisClient?.disconnect();
    } catch {
      // Ignore cleanup failures after a failed lazy connection attempt.
    } finally {
      redisClient = null;
    }
    logger.warn('redis.unavailable', { error: error.message, fallback: 'memory' });
    return false;
  }
};

export const closeRedis = async () => {
  if (!redisClient) {
    isRedisAvailable = false;
    return;
  }

  try {
    await redisClient.quit();
  } catch (error) {
    logger.warn('redis.quit.error', { error: error.message });
    try {
      redisClient.disconnect();
    } catch {
      // Ignore disconnect cleanup failures during shutdown.
    }
  } finally {
    redisClient = null;
    isRedisAvailable = false;
  }
};

export const isRedisConnected = () => isRedisAvailable;
export const getRedisClient = () => (isRedisAvailable ? redisClient : null);

export const get = async (key) => {
  const cacheKey = `cache:${key}`;
  if (isRedisAvailable && redisClient) {
    try {
      const value = await redisClient.get(cacheKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      isRedisAvailable = false;
      logger.warn('redis.get.error', { error: error.message });
    }
  }
  return memoryGet(cacheKey);
};

export const set = async (key, value, ttl = CACHE_TTL) => {
  const cacheKey = `cache:${key}`;
  const serialized = toSafeJson(value);
  if (!serialized) {
    return false;
  }
  if (isRedisAvailable && redisClient) {
    try {
      await redisClient.setex(cacheKey, ttl, serialized);
      return true;
    } catch (error) {
      isRedisAvailable = false;
      logger.warn('redis.set.error', { error: error.message });
    }
  }
  memorySet(cacheKey, value, ttl);
  return true;
};

export const del = async (key) => {
  const cacheKey = `cache:${key}`;
  if (isRedisAvailable && redisClient) {
    try {
      await redisClient.del(cacheKey);
    } catch (error) {
      logger.warn('redis.del.error', { error: error.message });
    }
  }
  memoryCache.delete(cacheKey);
  memoryCacheTTL.delete(cacheKey);
  return true;
};

export const clear = async () => {
  if (isRedisAvailable && redisClient) {
    try {
      const keys = await redisClient.keys('cache:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      logger.warn('redis.clear.error', { error: error.message });
    }
  }
  memoryCache.clear();
  memoryCacheTTL.clear();
  memoryCounters.clear();
  return true;
};

export const getOrFetch = async (key, fetcher, ttl = CACHE_TTL) => {
  try {
    const cached = await get(key);
    if (cached !== null) {
      return cached;
    }
  } catch (error) {
    logger.warn('cache.get_or_fetch.get_error', { error: error.message });
  }
  const data = await fetcher();
  set(key, data, ttl).catch((err) =>
    logger.warn('cache.get_or_fetch.set_error', { error: err.message })
  );
  return data;
};

export const invalidatePattern = async (pattern) => {
  const cachePattern = `cache:${pattern}`;
  if (isRedisAvailable && redisClient) {
    try {
      const keys = await redisClient.keys(cachePattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      logger.warn('redis.invalidate.error', { error: error.message });
    }
  }
  const startsWith = pattern.replace('*', '');
  for (const key of memoryCache.keys()) {
    if (key.includes(startsWith)) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
  }
};

export const getCacheStats = () => ({
  redis: isRedisAvailable,
  memorySize: memoryCache.size,
  ttl: CACHE_TTL
});

export const __setRedisTestState = ({ client = null, available = false } = {}) => {
  if (config.env !== 'test') {
    throw new Error('__setRedisTestState is only available in tests');
  }

  redisClient = client;
  isRedisAvailable = Boolean(client) && Boolean(available);
};

export const atomicRateLimitIncrement = async (key, windowMs) => {
  if (isRedisAvailable && redisClient) {
    try {
      const results = await redisClient
        .multi()
        .incr(key)
        .pexpire(key, windowMs, 'NX')
        .pttl(key)
        .exec();

      const count = Number(results?.[0]?.[1] || 0);
      let ttlMs = Number(results?.[2]?.[1] || windowMs);
      if (!Number.isFinite(ttlMs) || ttlMs < 0) {
        ttlMs = windowMs;
      }
      return { count, ttlMs };
    } catch (error) {
      isRedisAvailable = false;
      logger.warn('redis.ratelimit.error', { error: error.message });
    }
  }

  const now = Date.now();
  const existing = memoryCounters.get(key);
  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    memoryCounters.set(key, next);
    return { count: 1, ttlMs: windowMs };
  }
  existing.count += 1;
  memoryCounters.set(key, existing);
  return { count: existing.count, ttlMs: Math.max(existing.resetAt - now, 0) };
};

export const setJsonIfAbsent = async (key, value, ttlSeconds) => {
  const serialized = toSafeJson(value);
  if (!serialized) {
    return false;
  }

  if (isRedisAvailable && redisClient) {
    try {
      const result = await redisClient.set(key, serialized, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      isRedisAvailable = false;
      logger.warn('redis.setnx.error', { error: error.message });
    }
  }

  if (memoryGet(key) !== null) {
    return false;
  }
  memorySet(key, value, ttlSeconds);
  return true;
};

export const getJson = async (key) => {
  if (isRedisAvailable && redisClient) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      isRedisAvailable = false;
      logger.warn('redis.getjson.error', { error: error.message });
    }
  }
  return memoryGet(key);
};

export const setJson = async (key, value, ttlSeconds) => {
  const serialized = toSafeJson(value);
  if (!serialized) {
    return false;
  }
  if (isRedisAvailable && redisClient) {
    try {
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
      return true;
    } catch (error) {
      isRedisAvailable = false;
      logger.warn('redis.setjson.error', { error: error.message });
    }
  }
  memorySet(key, value, ttlSeconds);
  return true;
};

export const deleteKey = async (key) => {
  if (isRedisAvailable && redisClient) {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.warn('redis.deletekey.error', { error: error.message });
    }
  }
  memoryCache.delete(key);
  memoryCacheTTL.delete(key);
};

export default {
  initRedis,
  closeRedis,
  isRedisConnected,
  getRedisClient,
  get,
  set,
  del,
  clear,
  getOrFetch,
  invalidatePattern,
  getCacheStats,
  __setRedisTestState,
  atomicRateLimitIncrement,
  setJsonIfAbsent,
  getJson,
  setJson,
  deleteKey
};
