import AuditLog from "../models/auditLog.model.js";
export const logAudit = async ({
  actorId = null,
  actorRole = "anonymous",
  entityType,
  entityId = null,
  action,
  before = null,
  after = null,
  ipAddress = null,
}) => {
  try {
    await AuditLog.create({
      actorId,
      actorRole,
      entityType,
      entityId,
      action,
      before,
      after,
      ipAddress,
    });
  } catch (error) {
    // DO NOT throw — audit logs must never break business logic
    console.error("Audit log failed:", error.message);
  }
};
