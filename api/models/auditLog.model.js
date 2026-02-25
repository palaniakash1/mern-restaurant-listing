import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actorRole: {
      type: String,
      enum: ["anonymous", "user", "storeManager", "admin", "superAdmin"],
      required: true,
    },
    entityType: {
      type: String,
      enum: ["auth", "restaurant", "menu", "category", "user", "review"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    action: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "BULK_UPDATE",
        "STATUS_CHANGE",
        "RESTORE",
        "REASSIGN",
        // ✅ AUTH EVENTS
        "LOGIN",
        "LOGIN_FAILED",
        "LOGOUT",
      ],
      required: true,
    },
    before: {
      type: Object,
      default: null,
    },
    after: {
      type: Object,
      default: null,
    },
    ipAddress: {
      type: String,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ actorId: 1 });
auditLogSchema.index(
  { createdAt: -1 },
  { expireAfterSeconds: 60 * 60 * 24 * 180 },
);

export default mongoose.model("AuditLog", auditLogSchema);
