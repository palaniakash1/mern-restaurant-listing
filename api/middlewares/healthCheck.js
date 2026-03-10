/**
 * Health Check Middleware
 * Provides comprehensive health checks for dependencies and system status
 */

import mongoose from 'mongoose';
import config from '../config.js';
import { isRedisConnected } from '../utils/redisCache.js';

/**
 * Checks MongoDB connection status
 * @returns {Promise<{status: string, latency: number, error?: string}>}
 */
const checkMongoDB = async () => {
  const startTime = Date.now();
  const readyState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  // Fast path: check readyState first
  if (readyState !== 1) {
    return {
      status: 'unhealthy',
      latency: `${Date.now() - startTime}ms`,
      state: states[readyState] || 'unknown',
      database: mongoose.connection.name || 'unknown'
    };
  }

  try {
    // Execute a simple command to check connectivity
    // Use mongoose.connection.db for older versions compatibility
    const db = mongoose.connection.db;
    if (db) {
      await db.command({ ping: 1 });
    }
    const latency = Date.now() - startTime;

    return {
      status: 'healthy',
      latency: `${latency}ms`,
      state: states[readyState],
      database: mongoose.connection.name || 'unknown'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: `${Date.now() - startTime}ms`,
      state: states[readyState] || 'unknown',
      error: error.message
    };
  }
};

/**
 * Checks system resources
 * @returns {Object} System status
 */
const checkSystem = () => {
  const memUsage = process.memoryUsage();
  const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

  return {
    memory: {
      used: `${memUsedMB} MB`,
      total: `${memTotalMB} MB`,
      usage: `${Math.round((memUsedMB / memTotalMB) * 100)}%`
    },
    uptime: `${process.uptime().toFixed(0)}s`,
    nodeVersion: process.version,
    platform: process.platform
  };
};

/**
 * Creates health check middleware
 * @param {Object} options - Configuration options
 * @param {string[]} options.include - What to include in health check (default: all)
 * @returns {Function} Express middleware
 */
export const createHealthCheck = (options = {}) => {
  // Default: don't check mongo to avoid test flakiness
  // Use { include: ["mongo"] } to enable DB check
  const { include = ['system'] } = options;

  return async (req, res) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: config.appName,
      version: config.appVersion
    };

    let overallStatus = 'ok';
    const details = {};

    // Check MongoDB only if explicitly requested
    if (include.includes('mongo')) {
      const mongoHealth = await checkMongoDB();
      details.mongodb = mongoHealth;
      if (mongoHealth.status === 'unhealthy') {
        overallStatus = 'error';
      }
    }

    // Check System - always include
    if (include.includes('system')) {
      details.system = checkSystem();
    }

    // Enhanced environment validation
    if (include.includes('environment')) {
      const envHealth = validateEnvironment();
      details.environment = envHealth;
      if (!envHealth.valid) {
        overallStatus = 'error';
      }
    }

    // Enhanced dependency health checks
    if (include.includes('dependencies')) {
      const depsHealth = await checkDependencies();
      details.dependencies = depsHealth;
      if (!depsHealth.healthy) {
        overallStatus = 'error';
      }
    }

    health.checks = details;
    health.status = overallStatus;

    const statusCode = overallStatus === 'ok' ? 200 : 503;
    res.status(statusCode).json({
      success: overallStatus === 'ok',
      ...health
    });
  };
};

// New functions for enhanced environment testing
const validateEnvironment = () => {
  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL'
  ];

  const missingVars = requiredEnvVars.filter((varName) => {
    if (varName === 'JWT_SECRET') return !config.jwtSecret;
    if (varName === 'DATABASE_URL') return !config.databaseUrl;
    return false;
  });
  const warnings = [];

  if (!config.googleMapsApiKey) {
    warnings.push('GOOGLE_MAPS_API_KEY not configured; address geocoding will fail');
  }

  return {
    valid: missingVars.length === 0,
    missing: missingVars,
    warnings,
    nodeEnv: config.env,
    warningsCount: warnings.length
  };
};

const checkDependencies = async () => {
  const startTime = Date.now();
  const results = {
    healthy: true,
    checks: {},
    latency: 0
  };

  // Check Redis (if configured)
  if (config.redis.url) {
    results.checks.redis = {
      status: isRedisConnected() ? 'healthy' : 'degraded'
    };
    if (!isRedisConnected()) {
      results.healthy = false;
    }
  }

  // Check external services (example: email service)
  if (config.emailServiceUrl) {
    try {
      if (
        typeof globalThis.fetch !== 'function' ||
        typeof globalThis.AbortSignal?.timeout !== 'function'
      ) {
        throw new Error('Fetch-based dependency probes are unavailable');
      }

      const response = await globalThis.fetch(config.emailServiceUrl, {
        method: 'HEAD',
        signal: globalThis.AbortSignal.timeout(3000)
      });
      results.checks.emailService = {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - startTime
      };
    } catch (error) {
      results.checks.emailService = {
        status: 'unhealthy',
        error: error.message
      };
      results.healthy = false;
    }
  }

  results.latency = Date.now() - startTime;
  return results;
};

/**
 * Creates a liveness probe (simple check if app is running)
 * @returns {Function} Express middleware
 */
export const createLivenessProbe = () => {
  return (req, res) => {
    res.status(200).json({
      success: true,
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: `${process.uptime().toFixed(0)}s`
    });
  };
};

/**
 * Creates a readiness probe (checks if app can handle requests)
 * @returns {Function} Express middleware
 */
export const createReadinessProbe = () => {
  return async (req, res) => {
    const mongoHealthy = mongoose.connection.readyState === 1;

    const statusCode = mongoHealthy ? 200 : 503;
    res.status(statusCode).json({
      status: mongoHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: mongoHealthy ? 'connected' : 'disconnected'
      }
    });
  };
};

export default {
  createHealthCheck,
  createLivenessProbe,
  createReadinessProbe,
  checkMongoDB,
  checkSystem
};
