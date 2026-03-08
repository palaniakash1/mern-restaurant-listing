/**
 * Idempotency Middleware - Simple version
 * Prevents duplicate POST/PUT/PATCH requests
 *
 * Usage:
 * app.post('/api/data', idempotentMiddleware, controller);
 *
 * Client sends: X-Idempotency-Key: unique-key-123
 */

import { deleteKey, getJson, setJson, setJsonIfAbsent } from '../utils/redisCache.js';
import { logger } from '../utils/logger.js';

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours
const IDEMPOTENCY_TTL_SECONDS = Math.floor(IDEMPOTENCY_TTL / 1000);

const buildScopedKey = (req, key) => {
  const userScope = req.user?.id || req.ip || 'anonymous';
  return `idempotency:${req.method}:${req.path}:${userScope}:${key}`;
};

/**
 * Simple idempotency middleware
 */
export const idempotentMiddleware = async (req, res, next) => {
  // Only apply to write methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const key = req.headers['x-idempotency-key'];

  if (!key) {
    // No key provided - proceed normally
    return next();
  }

  const scopedKey = buildScopedKey(req, key);
  const cached = await getJson(scopedKey);

  if (cached?.status === 'done' && cached.response) {
    res.set('X-Idempotency-Key', key);
    return res.status(cached.response.statusCode).json(cached.response.body);
  }

  if (cached?.status === 'in_progress') {
    return res.status(409).json({
      success: false,
      message: 'Request with this idempotency key is in progress'
    });
  }

  const lockAcquired = await setJsonIfAbsent(
    scopedKey,
    {
      status: 'in_progress',
      createdAt: Date.now()
    },
    IDEMPOTENCY_TTL_SECONDS
  );

  if (!lockAcquired) {
    const retryCached = await getJson(scopedKey);
    if (retryCached?.status === 'done' && retryCached.response) {
      res.set('X-Idempotency-Key', key);
      return res
        .status(retryCached.response.statusCode)
        .json(retryCached.response.body);
    }
    return res.status(409).json({
      success: false,
      message: 'Request with this idempotency key is in progress'
    });
  }

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json to cache response
  res.json = function (body) {
    // Cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      setJson(
        scopedKey,
        {
          status: 'done',
          response: {
            statusCode: res.statusCode,
            body
          },
          updatedAt: Date.now()
        },
        IDEMPOTENCY_TTL_SECONDS
      ).catch((error) =>
        logger.warn('idempotency.cache_set.error', { error: error.message })
      );
    } else {
      deleteKey(scopedKey).catch((error) =>
        logger.warn('idempotency.cache_delete.error', { error: error.message })
      );
    }

    // Set header
    res.set('X-Idempotency-Key', key);

    return originalJson(body);
  };

  next();
};

export default idempotentMiddleware;
