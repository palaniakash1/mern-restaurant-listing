import mongoose from "mongoose";

const forbiddenFields = ["password", "tokens", "access_token"];

export const sanitizeAuditData = (data) => {
  const seen = new WeakSet();

  const sanitize = (value) => {
    if (value === null || value === undefined || typeof value !== "object") {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof mongoose.Types.ObjectId) {
      return value.toString();
    }

    if (seen.has(value)) {
      return "[circular]";
    }
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map(sanitize);
    }

    if (typeof value.toObject === "function") {
      return sanitize(
        value.toObject({ getters: false, virtuals: false, depopulate: true }),
      );
    }

    const sanitized = {};
    for (const [key, nested] of Object.entries(value)) {
      if (forbiddenFields.includes(key)) continue;
      sanitized[key] = sanitize(nested);
    }
    return sanitized;
  };

  return sanitize(data);
};
