/**
 * Metrics Middleware
 * Prometheus-style metrics endpoint for observability
 * 
 * Usage:
 * - GET /api/metrics - Returns Prometheus-formatted metrics
 * - Perfect for Prometheus + Grafana dashboards
 * - Used by CI/CD for performance regression testing
 */

import os from "os";

// ===================================================================
// METRIC STORES (In-memory)
// ===================================================================

// Request counters by endpoint and method
const requestCounts = new Map();

// Response time buckets (histogram)
const responseTimes = {
  buckets: {
    "0.05": 0,   // < 50ms
    "0.1": 0,    // < 100ms
    "0.25": 0,   // < 250ms
    "0.5": 0,    // < 500ms
    "1": 0,      // < 1s
    "2.5": 0,    // < 2.5s
    "5": 0,      // < 5s
    "+Inf": 0,   // > 5s
  },
  sum: 0,
  count: 0,
};

// Error counters by status code
const errorCounts = new Map();

// Active connections (approximate)
let activeConnections = 0;

// Uptime
const startTime = Date.now();

// ===================================================================
// MIDDLEWARE - Track Requests
// ===================================================================

/**
 * Metrics collection middleware
 * Add this BEFORE your routes to track all requests
 */
export const metricsMiddleware = (req, res, next) => {
  const startHrTime = process.hrtime();
  
  // Track active connections
  activeConnections++;
  
  // Track request
  const key = `${req.method} ${req.route?.path || req.path}`;
  requestCounts.set(key, (requestCounts.get(key) || 0) + 1);
  
  // On response finish
  res.on("finish", () => {
    activeConnections--;
    
    // Calculate response time
    const diff = process.hrtime(startHrTime);
    const responseTimeMs = (diff[0] * 1000 + diff[1] / 1e6);
    
    // Update histogram
    responseTimes.count++;
    responseTimes.sum += responseTimeMs;
    
    // Buckets
    if (responseTimeMs < 50) responseTimes.buckets["0.05"]++;
    else if (responseTimeMs < 100) responseTimes.buckets["0.1"]++;
    else if (responseTimeMs < 250) responseTimes.buckets["0.25"]++;
    else if (responseTimeMs < 500) responseTimes.buckets["0.5"]++;
    else if (responseTimeMs < 1000) responseTimes.buckets["1"]++;
    else if (responseTimeMs < 2500) responseTimes.buckets["2.5"]++;
    else if (responseTimeMs < 5000) responseTimes.buckets["5"]++;
    else responseTimes.buckets["+Inf"]++;
    
    // Track errors
    if (res.statusCode >= 400) {
      errorCounts.set(res.statusCode, (errorCounts.get(res.statusCode) || 0) + 1);
    }
  });
  
  next();
};

// ===================================================================
// METRICS FORMATTING - Prometheus Format
// ===================================================================

/**
 * Format metrics in Prometheus exposition format
 * This is what Prometheus will scrape
 */
const formatPrometheusMetrics = () => {
  const lines = [];
  
  // ─────────────────────────────────────────────────────────────
  // Request Metrics (Counter)
  // ─────────────────────────────────────────────────────────────
  
  lines.push("# HELP http_requests_total Total number of HTTP requests");
  lines.push("# TYPE http_requests_total counter");
  
  for (const [endpoint, count] of requestCounts.entries()) {
    const labels = endpoint.split(" ");
    const method = labels[0];
    const path = labels.slice(1).join(" ").replace(/:/g, "_param");
    lines.push(`http_requests_total{method="${method}",endpoint="${path}"} ${count}`);
  }
  
  // Total requests
  const totalRequests = Array.from(requestCounts.values()).reduce((a, b) => a + b, 0);
  lines.push(`http_requests_total_total ${totalRequests}`);
  
  // ─────────────────────────────────────────────────────────────
  // Response Time Metrics (Histogram)
  // ─────────────────────────────────────────────────────────────
  
  lines.push("# HELP http_request_duration_seconds HTTP request latency in seconds");
  lines.push("# TYPE http_request_duration_seconds histogram");
  
  // Buckets
  const bucketLabels = ["0.05", "0.1", "0.25", "0.5", "1", "2.5", "5", "+Inf"];
  let cumulative = 0;
  for (const bucket of bucketLabels) {
    cumulative += responseTimes.buckets[bucket];
    lines.push(`http_request_duration_seconds_bucket{le="${bucket}"} ${cumulative}`);
  }
  
  // Sum and count
  lines.push(`http_request_duration_seconds_sum ${(responseTimes.sum / 1000).toFixed(6)}`);
  lines.push(`http_request_duration_seconds_count ${responseTimes.count}`);
  
  // ─────────────────────────────────────────────────────────────
  // Error Metrics (Counter)
  // ─────────────────────────────────────────────────────────────
  
  lines.push("# HELP http_errors_total Total number of HTTP errors");
  lines.push("# TYPE http_errors_total counter");
  
  for (const [statusCode, count] of errorCounts.entries()) {
    lines.push(`http_errors_total{status="${statusCode}"} ${count}`);
  }
  
  // Total errors
  const totalErrors = Array.from(errorCounts.values()).reduce((a, b) => a + b, 0);
  lines.push(`http_errors_total ${totalErrors}`);
  
  // ─────────────────────────────────────────────────────────────
  // Connection Metrics (Gauge)
  // ─────────────────────────────────────────────────────────────
  
  lines.push("# HELP http_connections_active Active HTTP connections");
  lines.push("# TYPE http_connections_active gauge");
  lines.push(`http_connections_active ${activeConnections}`);
  
  // ─────────────────────────────────────────────────────────────
  // System Metrics (Gauge)
  // ─────────────────────────────────────────────────────────────
  
  lines.push("# HELP process_uptime_seconds Process uptime in seconds");
  lines.push("# TYPE process_uptime_seconds gauge");
  lines.push(`process_uptime_seconds ${Math.floor((Date.now() - startTime) / 1000)}`);
  
  lines.push("# HELP process_memory_bytes Process memory usage in bytes");
  lines.push("# TYPE process_memory_bytes gauge");
  const memUsage = process.memoryUsage();
  lines.push(`process_memory_bytes{type="heapUsed"} ${memUsage.heapUsed}`);
  lines.push(`process_memory_bytes{type="heapTotal"} ${memUsage.heapTotal}`);
  lines.push(`process_memory_bytes{type="rss"} ${memUsage.rss}`);
  lines.push(`process_memory_bytes{type="external"} ${memUsage.external}`);
  
  lines.push("# HELP process_cpu_seconds Process CPU time in seconds");
  lines.push("# TYPE process_cpu_seconds gauge");
  const cpuUsage = process.cpuUsage();
  lines.push(`process_cpu_seconds{type="user"} ${cpuUsage.user}`);
  lines.push(`process_cpu_seconds{type="system"} ${cpuUsage.system}`);
  
  // ─────────────────────────────────────────────────────────────
  // System Load (Gauge)
  // ─────────────────────────────────────────────────────────────
  
  lines.push("# HELP system_load_average System load average");
  lines.push("# TYPE system_load_average gauge");
  lines.push(`system_load_average ${os.loadavg()[0]}`);
  
  lines.push("# HELP system_memory_bytes System memory in bytes");
  lines.push("# TYPE system_memory_bytes gauge");
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  lines.push(`system_memory_bytes{type="total"} ${totalMem}`);
  lines.push(`system_memory_bytes{type="free"} ${freeMem}`);
  lines.push(`system_memory_bytes{type="used"} ${totalMem - freeMem}`);
  
  // ─────────────────────────────────────────────────────────────
  // Application Info (Gauge)
  // ─────────────────────────────────────────────────────────────
  
  lines.push("# HELP app_info Application information");
  lines.push("# TYPE app_info gauge");
  lines.push(`app_info{version="${process.env.APP_VERSION || "1.0.0"}",name="${process.env.APP_NAME || "mern-restaurant"}"} 1`);
  
  return lines.join("\n");
};

// ===================================================================
// JSON FORMAT (for Grafana/CloudWatch)
// ===================================================================

/**
 * Get metrics in JSON format
 * Useful for Grafana JSON datasource
 */
const getJsonMetrics = () => {
  const totalRequests = Array.from(requestCounts.values()).reduce((a, b) => a + b, 0);
  const totalErrors = Array.from(errorCounts.values()).reduce((a, b) => a + b, 0);
  const memUsage = process.memoryUsage();
  
  return {
    timestamp: new Date().toISOString(),
    application: {
      name: process.env.APP_NAME || "mern-restaurant",
      version: process.env.APP_VERSION || "1.0.0",
      uptime: Math.floor((Date.now() - startTime) / 1000),
    },
    http: {
      requests: {
        total: totalRequests,
        byEndpoint: Object.fromEntries(requestCounts),
      },
      responses: {
        times: {
          avg: responseTimes.count > 0 ? responseTimes.sum / responseTimes.count : 0,
          p50: calculatePercentile(responseTimes, 0.5),
          p90: calculatePercentile(responseTimes, 0.9),
          p95: calculatePercentile(responseTimes, 0.95),
          p99: calculatePercentile(responseTimes, 0.99),
        },
        buckets: responseTimes.buckets,
      },
      errors: {
        total: totalErrors,
        byStatus: Object.fromEntries(errorCounts),
      },
      connections: {
        active: activeConnections,
      },
    },
    system: {
      memory: {
        process: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          rss: memUsage.rss,
          external: memUsage.external,
        },
        os: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
        },
      },
      cpu: {
        loadAverage: os.loadavg(),
        usage: process.cpuUsage(),
      },
      platform: {
        hostname: os.hostname(),
        type: os.type(),
        release: os.release(),
        cpus: os.cpus().length,
      },
    },
  };
};

// Helper: Calculate percentile from histogram
function calculatePercentile(histogram, percentile) {
  if (histogram.count === 0) return 0;
  
  const target = histogram.count * percentile;
  let cumulative = 0;
  const buckets = ["0.05", "0.1", "0.25", "0.5", "1", "2.5", "5", "+Inf"];
  
  for (const bucket of buckets) {
    cumulative += histogram.buckets[bucket];
    if (cumulative >= target) {
      return parseFloat(bucket) * 1000; // Convert to ms
    }
  }
  return 5000; // Max
}

// ===================================================================
// EXPRESS MIDDLEWARE
// ===================================================================

/**
 * Create metrics endpoint
 * @param {Object} options - Options
 * @param {string} options.format - 'prometheus' or 'json'
 * @param {string} options.path - Endpoint path
 */
export const createMetricsEndpoint = (options = {}) => {
  const { format = "prometheus", path = "/api/metrics" } = options;
  
  return (req, res) => {
    // Set content type
    if (format === "prometheus") {
      res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
      res.send(formatPrometheusMetrics());
    } else {
      res.set("Content-Type", "application/json");
      res.json(getJsonMetrics());
    }
  };
};

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Reset all metrics (useful for testing)
 */
export const resetMetrics = () => {
  requestCounts.clear();
  errorCounts.clear();
  responseTimes.buckets = {
    "0.05": 0, "0.1": 0, "0.25": 0, "0.5": 0,
    "1": 0, "2.5": 0, "5": 0, "+Inf": 0,
  };
  responseTimes.sum = 0;
  responseTimes.count = 0;
  activeConnections = 0;
};

/**
 * Get current metrics snapshot
 */
export const getMetricsSnapshot = getJsonMetrics;

export default {
  metricsMiddleware,
  createMetricsEndpoint,
  resetMetrics,
  getMetricsSnapshot,
  formatPrometheusMetrics,
  getJsonMetrics,
};
