/**
 * Metrics Middleware - Simple version
 * Tracks basic request metrics
 */

import os from "os";

// In-memory metrics store
const requestCounts = new Map();
const responseTimes = [];
let activeConnections = 0;
const startTime = Date.now();

/**
 * Metrics middleware - tracks requests
 */
export const metricsMiddleware = (req, res, next) => {
  const startHrTime = process.hrtime();
  activeConnections++;
  
  const key = `${req.method} ${req.route?.path || req.path}`;
  requestCounts.set(key, (requestCounts.get(key) || 0) + 1);
  
  res.on("finish", () => {
    activeConnections--;
    
    const diff = process.hrtime(startHrTime);
    const responseTimeMs = diff[0] * 1000 + diff[1] / 1e6;
    responseTimes.push(responseTimeMs);
    
    // Keep only last 1000 response times
    if (responseTimes.length > 1000) {
      responseTimes.shift();
    }
  });
  
  next();
};

/**
 * Get metrics endpoint
 */
export const createMetricsEndpoint = () => {
  return (req, res) => {
    const totalRequests = Array.from(requestCounts.values()).reduce((a, b) => a + b, 0);
    
    // Calculate avg response time
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    
    res.json({
      timestamp: new Date().toISOString(),
      requests: {
        total: totalRequests,
        byEndpoint: Object.fromEntries(requestCounts),
      },
      performance: {
        avgResponseTimeMs: Math.round(avgResponseTime * 100) / 100,
        sampleSize: responseTimes.length,
      },
      connections: {
        active: activeConnections,
      },
      system: {
        uptime: Math.floor((Date.now() - startTime) / 1000),
        memory: process.memoryUsage(),
        cpu: os.loadavg(),
      },
    });
  };
};

export default {
  metricsMiddleware,
  createMetricsEndpoint,
};
