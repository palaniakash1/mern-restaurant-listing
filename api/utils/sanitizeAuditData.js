import mongoose from "mongoose";

const forbiddenFields = ["password", "tokens", "access_token"];

export const sanitizeAuditData = (data) => {
  // null / primitive
  if (!data || typeof data !== "object") {
    return data;
  }

  // ObjectId → string
  if (data instanceof mongoose.Types.ObjectId) {
    return data.toString();
  }

  // Array
  if (Array.isArray(data)) {
    return data.map(sanitizeAuditData);
  }

  // Plain object
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (forbiddenFields.includes(key)) continue; // drop sensitive field

    sanitized[key] = sanitizeAuditData(value);
  }

  return sanitized;
};
