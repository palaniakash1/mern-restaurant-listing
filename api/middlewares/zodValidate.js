/**
 * Zod Validation Middleware
 * Express middleware for validating requests using Zod schemas
 */

import { z } from "zod";
import { AppError } from "../utils/error.js";

/**
 * Validate request body against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Source of data (body, query, params)
 * @returns {Function} Express middleware
 */
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        // Format Zod errors into readable messages
        const errors = result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }

      // Replace request data with validated (and transformed) data
      req[source] = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate request body
 * @param {z.ZodSchema} schema - Zod schema
 */
export const validateBody = (schema) => validate(schema, "body");

/**
 * Validate query parameters
 * @param {z.ZodSchema} schema - Zod schema
 */
export const validateQuery = (schema) => validate(schema, "query");

/**
 * Validate URL parameters
 * @param {z.ZodSchema} schema - Zod schema
 */
export const validateParams = (schema) => validate(schema, "params");

/**
 * Validate multiple sources
 * @param {Object} sources - Object with schema for each source
 * @example
 * validateAll({
 *   body: userSchema,
 *   query: paginationSchema,
 *   params: idSchema
 * })
 */
export const validateAll = (sources) => {
  return (req, res, next) => {
    try {
      for (const [source, schema] of Object.entries(sources)) {
        const data = req[source];
        const result = schema.safeParse(data);

        if (!result.success) {
          const errors = result.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          }));

          return res.status(400).json({
            success: false,
            message: `Validation failed in ${source}`,
            errors,
          });
        }

        req[source] = result.data;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Async handler wrapper with validation
 * @param {z.ZodSchema} schema - Zod schema
 * @param {Function} handler - Controller handler
 * @returns {Function} Middleware + Handler
 */
export const validatedHandler = (schema, handler) => {
  return [validateBody(schema), handler];
};

export default {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateAll,
  validatedHandler,
};
