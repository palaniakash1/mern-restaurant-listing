/**
 * Request Logging Middleware
 * Logs all incoming HTTP requests with relevant details
 * Uses fileLogger for persistent storage with 500 log stack
 */

import crypto from "crypto";
import { logRequest, logResponse, logError } from "../utils/fileLogger.js";

/**
 * Creates a request logger middleware
 * @param {Object} options - Configuration options
 * @param {boolean} options.logBody - Whether to log request body (default: false for security)
 * @param {boolean} options.logResponse - Whether to log response (default: false)
 * @returns {Function} Express middleware
 */
export const createRequestLogger = (options = {}) => {
  const { logBody = false, shouldLogResponse = false } = options;

  return (req, res, next) => {
    // Generate request ID if not already present
    const requestId = req.headers["x-request-id"] || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);

    const startTime = Date.now();
    const { method, url, ip, headers } = req;
    const clientIp = headers["x-forwarded-for"] || ip;
    const userAgent = headers["user-agent"] || "unknown";

    // Log incoming request using fileLogger
    logRequest({
      requestId,
      method,
      url,
      clientIp,
      userAgent: userAgent.substring(0, 100),
      contentLength: headers["content-length"] || 0,
      ...(logBody && req.body && { body: req.body }),
    });

    // Capture original end to log response
    const originalEnd = res.end;

    res.end = function (chunk, encoding) {
      res.end = originalEnd;
      res.end(chunk, encoding);

      const duration = Date.now() - startTime;
      const responseSize = res.getHeader("content-length") || (chunk ? chunk.length : 0);

      const logEntry = {
        requestId,
        method,
        url,
        clientIp,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseSize,
      };

      // Log response body for errors (sanitized)
      if (shouldLogResponse && chunk) {
        try {
          const parsed = JSON.parse(chunk.toString());
          logEntry.response = parsed;
        } catch {
          logEntry.response = chunk.toString();
        }
      }

      // Add error info for 5xx responses
      if (res.statusCode >= 500) {
        logEntry.error = true;
        logError(logEntry);
      } else {
        logResponse(logEntry);
      }
    };

    next();
  };
};

export default createRequestLogger;


