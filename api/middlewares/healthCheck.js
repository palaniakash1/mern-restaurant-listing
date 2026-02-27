/**
 * Health Check Middleware
 * Provides comprehensive health checks for dependencies and system status
 */

import mongoose from "mongoose";

/**
 * Checks MongoDB connection status
 * @returns {Promise<{status: string, latency: number, error?: string}>}
 */
const checkMongoDB = async () => {
  const startTime = Date.now();
  try {
    // Execute a simple command to check connectivity
    // Use mongoose.connection.db for older versions compatibility
    const db = mongoose.connection.db;
    if (db) {
      await db.command({ ping: 1 });
    }
    const latency = Date.now() - startTime;
    
    const readyState = mongoose.connection.readyState;
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };
    
    return {
      status: readyState === 1 ? "healthy" : "unhealthy",
      latency: `${latency}ms`,
      state: states[readyState] || "unknown",
      database: mongoose.connection.name || "unknown",
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latency: `${Date.now() - startTime}ms`,
      error: error.message,
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
      usage: `${Math.round((memUsedMB / memTotalMB) * 100)}%`,
    },
    uptime: `${process.uptime().toFixed(0)}s`,
    nodeVersion: process.version,
    platform: process.platform,
  };
};

/**
 * Creates health check middleware
 * @param {Object} options - Configuration options
 * @param {string[]} options.include - What to include in health check (default: all)
 * @returns {Function} Express middleware
 */
export const createHealthCheck = (options = {}) => {
  const { include = ["mongo", "system"] } = options;
  
  return async (req, res, next) => {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: process.env.APP_NAME || "mern-restaurant",
      version: process.env.APP_VERSION || "1.0.0",
    };
    
    let overallStatus = "healthy";
    const details = {};
    
    // Check MongoDB
    if (include.includes("mongo")) {
      const mongoHealth = await checkMongoDB();
      details.mongodb = mongoHealth;
      if (mongoHealth.status === "unhealthy") {
        overallStatus = "unhealthy";
      }
    }
    
    // Check System
    if (include.includes("system")) {
      details.system = checkSystem();
    }
    
    health.checks = details;
    health.status = overallStatus;
    
    const statusCode = overallStatus === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
  };
};

/**
 * Creates a liveness probe (simple check if app is running)
 * @returns {Function} Express middleware
 */
export const createLivenessProbe = () => {
  return (req, res) => {
    res.status(200).json({
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: `${process.uptime().toFixed(0)}s`,
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
      status: mongoHealthy ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: mongoHealthy ? "connected" : "disconnected",
      },
    });
  };
};

export default {
  createHealthCheck,
  createLivenessProbe,
  createReadinessProbe,
  checkMongoDB,
  checkSystem,
};
