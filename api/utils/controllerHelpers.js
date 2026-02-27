/**
 * Common controller utilities/helper functions
 * These helpers provide consistent implementations across all controllers
 */

import mongoose from "mongoose";

// ===========================================
// Constants
// ===========================================

export const MAX_SEARCH_LENGTH = 100;
export const MAX_EXPORT_LIMIT = 1000;

// ===========================================
// ID Validation Helpers
// ===========================================

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid ObjectId format
 */
export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Converts a value to a string ID
 * @param {any} value - The value to convert
 * @returns {string} - String representation or empty string
 */
export const toIdString = (value) => {
  if (!value) return "";
  return typeof value === "string" ? value : value.toString();
};

// ===========================================
// IP Address Helpers
// ===========================================

/**
 * Extracts client IP address from request
 * Handles proxy headers (x-forwarded-for) for production deployments
 * @param {Object} req - Express request object
 * @returns {string} - Client IP address
 */
export const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (Array.isArray(forwardedFor)) return forwardedFor[0];
  if (typeof forwardedFor === "string")
    return forwardedFor.split(",")[0].trim();
  return req.ip;
};

/**
 * Alias for getClientIp - for backward compatibility
 */
export const normalizeIp = getClientIp;

// ===========================================
// Search & Regex Helpers
// ===========================================

/**
 * Escapes special regex characters in a string
 * Use to safely include user input in regex patterns
 * @param {string} value - String to escape
 * @returns {string} - Escaped string safe for regex
 */
export const escapeRegex = (value) =>
  value?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || "";

/**
 * Creates a safe search query by limiting length and trimming
 * @param {string} search - Raw search string from query
 * @returns {string} - Sanitized search string (max 100 chars)
 */
export const sanitizeSearch = (search) =>
  String(search || "").trim().slice(0, MAX_SEARCH_LENGTH);

// ===========================================
// Pagination Helpers
// ===========================================

/**
 * Normalizes pagination parameters from query
 * @param {Object} query - Express query object
 * @returns {Object} - Normalized pagination values
 */
export const normalizePagination = (query) => {
  const { page, limit } = query;
  return {
    page: Math.max(1, parseInt(page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
  };
};

/**
 * Normalizes sort direction from query
 * @param {string} sortParam - Sort parameter from query
 * @param {string} defaultDirection - Default direction if not provided
 * @returns {number} - 1 for asc, -1 for desc
 */
export const normalizeSortDirection = (sortParam, defaultDirection = "desc") => {
  return sortParam === "asc" ? 1 : -1;
};
