import os from 'os';
import { getSecurityTelemetry } from '../utils/securityTelemetry.js';

const startTime = Date.now();
const routeStats = new Map();
const statusClassCounts = {
  '2xx': 0,
  '3xx': 0,
  '4xx': 0,
  '5xx': 0
};
const latencySamples = [];
const MAX_LATENCY_SAMPLES = 5000;
let activeConnections = 0;
let totalRequests = 0;
let totalErrors = 0;

const percentile = (samples, p) => {
  if (!samples.length) {
    return 0;
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return Number(sorted[index].toFixed(2));
};

const statusClass = (statusCode) => {
  if (statusCode >= 500) return '5xx';
  if (statusCode >= 400) return '4xx';
  if (statusCode >= 300) return '3xx';
  return '2xx';
};

const routeLabelFromReq = (req) => {
  const routePath = req.route?.path || req.path || 'unknown';
  const baseUrl = req.baseUrl || '';
  return `${req.method} ${baseUrl}${routePath}`;
};

export const metricsMiddleware = (req, res, next) => {
  const startHrTime = process.hrtime.bigint();
  activeConnections += 1;

  res.on('finish', () => {
    activeConnections = Math.max(activeConnections - 1, 0);
    totalRequests += 1;

    const durationNs = Number(process.hrtime.bigint() - startHrTime);
    const durationMs = durationNs / 1e6;
    latencySamples.push(durationMs);
    if (latencySamples.length > MAX_LATENCY_SAMPLES) {
      latencySamples.shift();
    }

    const routeLabel = routeLabelFromReq(req);
    const routeEntry = routeStats.get(routeLabel) || {
      count: 0,
      errors: 0,
      totalDurationMs: 0,
      maxDurationMs: 0
    };
    routeEntry.count += 1;
    routeEntry.totalDurationMs += durationMs;
    routeEntry.maxDurationMs = Math.max(routeEntry.maxDurationMs, durationMs);

    if (res.statusCode >= 400) {
      routeEntry.errors += 1;
    }
    if (res.statusCode >= 500) {
      totalErrors += 1;
    }
    routeStats.set(routeLabel, routeEntry);

    statusClassCounts[statusClass(res.statusCode)] += 1;
  });

  next();
};

export const createMetricsEndpoint = () => {
  return async (req, res, next) => {
    try {
      const routeMetrics = {};
      for (const [route, entry] of routeStats.entries()) {
        routeMetrics[route] = {
          count: entry.count,
          errors: entry.errors,
          avgResponseTimeMs:
            entry.count > 0
              ? Number((entry.totalDurationMs / entry.count).toFixed(2))
              : 0,
          maxResponseTimeMs: Number(entry.maxDurationMs.toFixed(2))
        };
      }

      const errorRate =
        totalRequests > 0
          ? Number(((totalErrors / totalRequests) * 100).toFixed(2))
          : 0;
      const p50 = percentile(latencySamples, 50);
      const p95 = percentile(latencySamples, 95);
      const p99 = percentile(latencySamples, 99);
      const mean =
        latencySamples.length > 0
          ? Number(
            (
              latencySamples.reduce((sum, value) => sum + value, 0) /
                latencySamples.length
            ).toFixed(2)
          )
          : 0;
      const securityTelemetry = await getSecurityTelemetry();

      res.json({
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        requests: {
          total: totalRequests,
          activeConnections,
          statusClassCounts,
          errorRatePercent: errorRate
        },
        latencyMs: {
          sampleSize: latencySamples.length,
          avg: mean,
          p50,
          p95,
          p99
        },
        routes: routeMetrics,
        security: {
          telemetry: securityTelemetry
        },
        system: {
          memory: process.memoryUsage(),
          cpuLoadAvg: os.loadavg(),
          platform: process.platform,
          nodeVersion: process.version
        }
      });
    } catch (error) {
      next(error);
    }
  };
};

export default {
  metricsMiddleware,
  createMetricsEndpoint
};
