/**
 * Centralized Error Handling Middleware
 * Catches all unhandled errors and returns consistent error responses
 */

import mongoose from "mongoose";

/**
 * Determines if the error is a operational error (expected)
 * @param {Error} error 
 * @returns {boolean}
 */
const isOperationalError = (error) => {
  if (error instanceof mongoose.Error) {
    return true;
  }
  return error.isOperational || false;
};

/**
 * Sanitize error message to prevent leaking sensitive information
 * @param {Error} error 
 * @returns {string}
 */
const sanitizeErrorMessage = (error) => {
  // Don't expose internal error details in production
  if (process.env.NODE_ENV === "production") {
    // Keep custom error messages
    if (error.isOperational) {
      return error.message;
    }
    return "Internal server error";
  }
  return error.message;
};

/**
 * Gets a human-readable error type
 * @param {Error} error 
 * @returns {string}
 */
const getErrorType = (error) => {
  if (error instanceof mongoose.Error.ValidationError) {
    return "ValidationError";
  }
  if (error instanceof mongoose.Error.CastError) {
    return "CastError";
  }
  if (error.name === "JsonWebTokenError") {
    return "JsonWebTokenError";
  }
  if (error.name === "TokenExpiredError") {
    return "TokenExpiredError";
  }
  if (error.code === 11000) {
    return "DuplicateKeyError";
  }
  if (error.name === "MongoServerError") {
    return "MongoServerError";
  }
  return error.name || "Error";
};

/**
 * Creates the centralized error handler middleware
 * @param {Object} options - Configuration options
 * @param {boolean} options.logErrors - Whether to log errors (default: true)
 * @returns {Function} Express error handler middleware
 */
export const createErrorHandler = (options = {}) => {
  const { logErrors = true } = options;

  return (err, req, res, next) => {
    // Prevent double response
    if (res.headersSent) {
      return next(err);
    }

    const requestId = req.requestId || "unknown";
    const errorType = getErrorType(err);
    
    // Log error in development
    if (logErrors) {
      const logLevel = err.statusCode >= 500 ? "error" : "warn";
      console[logLevel](JSON.stringify({
        type: "error",
        requestId,
        timestamp: new Date().toISOString(),
        errorType,
        message: err.message,
        stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
        path: req.path,
        method: req.method,
        statusCode: err.statusCode || 500,
        isOperational: isOperationalError(err),
      }));
    }

    // Handle Mongoose validation errors
    if (err instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        requestId,
        statusCode: 400,
        error: "ValidationError",
        message: messages.join(", "),
      });
    }

    // Handle Mongoose CastError (invalid ObjectId)
    if (err instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        success: false,
        requestId,
        statusCode: 400,
        error: "CastError",
        message: `Invalid ${err.path}: ${err.value}`,
      });
    }

    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0];
      return res.status(409).json({
        success: false,
        requestId,
        statusCode: 409,
        error: "DuplicateKeyError",
        message: `Duplicate field value: ${field}. Please use a different value.`,
      });
    }

    // Handle JWT errors
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        requestId,
        statusCode: 401,
        error: "JsonWebTokenError",
        message: "Invalid authentication token",
      });
    }

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        requestId,
        statusCode: 401,
        error: "TokenExpiredError",
        message: "Authentication token has expired",
      });
    }

    // Handle multer/file upload errors
    if (err.name === "MulterError") {
      return res.status(400).json({
        success: false,
        requestId,
        statusCode: 400,
        error: "MulterError",
        message: err.message,
      });
    }

    // Default error response
    const statusCode = err.statusCode || 500;
    const message = sanitizeErrorMessage(err);

    res.status(statusCode).json({
      success: false,
      requestId,
      statusCode,
      error: errorType,
      message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
  };
};

/**
 * Middleware to catch 404 - Not Found routes
 * @returns {Function} Express middleware
 */
export const createNotFoundHandler = () => {
  return (req, res, next) => {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    error.isOperational = true;
    next(error);
  };
};

export default createErrorHandler;
