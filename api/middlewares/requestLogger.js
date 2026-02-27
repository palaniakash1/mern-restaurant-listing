/**
 * Request Logging Middleware
 * Logs all incoming HTTP requests with relevant details
 */

import crypto from "crypto";

/**
 * Creates a request logger middleware
 * @param {Object} options - Configuration options
 * @param {boolean} options.logBody - Whether to log request body (default: false for security)
 * @param {boolean} options.logResponse - Whether to log response (default: false)
 * @returns {Function} Express middleware
 */
export const createRequestLogger = (options = {}) => {
  const { logBody = false, logResponse = false } = options;

  return (req, res, next) => {
    // Generate request ID if not already present
    const requestId = req.headers["x-request-id"] || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);

    const startTime = Date.now();
    const { method, url, ip, headers } = req;
    const clientIp = headers["x-forwarded-for"] || ip;
    const userAgent = headers["user-agent"] || "unknown";

    // Log incoming request
    console.log(JSON.stringify({
      type: "request",
      requestId,
      timestamp: new Date().toISOString(),
      method,
      url,
      clientIp,
      userAgent: userAgent.substring(0, 100),
      contentLength: headers["content-length"] || 0,
      ...(logBody && req.body && { body: req.body }),
    }));

    // Capture original end to log response
    const originalEnd = res.end;
    const chunks = [];

    res.end = function (chunk, encoding) {
      res.end = originalEnd;
      res.end(chunk, encoding);

      const duration = Date.now() - startTime;
      const responseSize = res.getHeader("content-length") || (chunk ? chunk.length : 0);

      const logEntry = {
        type: "response",
        requestId,
        timestamp: new Date().toISOString(),
        method,
        url,
        clientIp,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseSize,
      };

      // Log response body for errors (sanitized)
      if (logResponse && chunk) {
        try {
          const parsed = JSON.parse(chunk.toString());
          logEntry.response = parsed;
        } catch {
          logResponse.response = chunk.toString();
        }
      }

      // Add error info for 5xx responses
      if (res.statusCode >= 500) {
        logEntry.error = true;
      }

      console.log(JSON.stringify(logEntry));
    };

    next();
  };
};

export default createRequestLogger;
