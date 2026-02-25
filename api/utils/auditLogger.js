import AuditLog from "../models/auditLog.model.js";
import { sanitizeAuditData } from "./sanitizeAuditData.js";

export const logAudit = async ({
  actorId = null,
  actorRole = "anonymous",
  entityType,
  entityId = null,
  action,
  before = null,
  after = null,
  ipAddress = null,
  session = null,
}) => {
  try {
    const payload = {
      actorId,
      actorRole,
      entityType,
      entityId,
      action,
      before: sanitizeAuditData(before),
      after: sanitizeAuditData(after),
      ipAddress,
    };

    if (session) {
      await AuditLog.create([payload], { session });
      return;
    }

    await AuditLog.create(payload);
  } catch (error) {
    // DO NOT throw - audit logs must never break business logic.
    console.error("Audit log failed:", error.message);
  }
};
