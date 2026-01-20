import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorRole: {
      type: String,
      enum: ["admin", "superAdmin"],
      required: true,
    },
    entityType: {
      type: String,
      enum: ["restaurant", "menu", "category", "user"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "STATUS_CHANGE"],
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
