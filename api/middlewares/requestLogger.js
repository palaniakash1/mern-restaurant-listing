import crypto from 'crypto';
import { logger } from '../utils/logger.js';

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
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const startTime = Date.now();
    const { method, url, ip, headers } = req;
    const clientIp = headers['x-forwarded-for'] || ip;
    const userAgent = headers['user-agent'] || 'unknown';
    const requestLog = logger.child({
      requestId,
      method,
      url,
      clientIp
    });

    requestLog.info('request.start', {
      userAgent: userAgent.substring(0, 100),
      contentLength: headers['content-length'] || 0,
      ...(logBody && req.body && { body: req.body })
    });

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const responseSize = res.getHeader('content-length') || 0;

      const logEntry = {
        statusCode: res.statusCode,
        durationMs: duration,
        responseSize
      };

      if (shouldLogResponse && res.locals?.responseBody) {
        logEntry.response = res.locals.responseBody;
      }

      if (res.statusCode >= 500) {
        requestLog.error('request.finish', logEntry);
      } else {
        requestLog.info('request.finish', logEntry);
      }
    });

    next();
  };
};

export default createRequestLogger;


