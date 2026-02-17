export const softDeleteRestorePlugin = (schema) => {
  if (!schema.path("isActive")) {
    schema.add({
      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },
      deletedAt: Date,
      deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      restoredAt: Date,
      restoredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    });
  }

  schema.pre(/^find/, function (next) {
    if (!this.getQuery().includeInactive) {
      this.where({ isActive: true });
    }

    delete this.getQuery().includeInactive;
    next();
  });

  schema.methods.softDelete = async function (session = null, actorId = null) {
    this.isActive = false;
    this.deletedAt = new Date();
    this.deletedBy = actorId;

    return session ? this.save({ session }) : this.save();
  };

  schema.methods.restore = async function (session = null, actorId = null) {
    this.isActive = true;
    this.restoredAt = new Date();
    this.restoredBy = actorId;

    return session ? this.save({ session }) : this.save();
  };
};
