import { errorHandler } from "../utils/error.js";

export const validate =
  (schema, source = "body", options = {}) =>
  (req, res, next) => {
    const { assign = source !== "headers" } = options;
    const payload = req[source];

    const { error, value } = schema.validate(payload, {
      abortEarly: false,
      stripUnknown: source !== "headers",
      convert: true,
    });

    if (error) {
      return next(
        errorHandler(
          400,
          error.details.map((detail) => detail.message).join(", "),
        ),
      );
    }

    if (assign) {
      req[source] = value;
    }
    return next();
  };

