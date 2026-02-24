import mongoose from "mongoose";
import { softDeleteRestorePlugin } from "../utils/plugins/softDeleteRestore.plugin.js";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    // true = Starter, Main Course, Desserts (global)
    // false = Restaurant-specific
    isGeneric: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Only required when isGeneric = false
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null,
      index: true,
      validate: {
        validator: function (value) {
          return this.isGeneric || value !== null;
        },
        message: "restaurantId is required for non-generic categories",
      },
    },

    order: {
      type: Number,
      default: 0, // display order
    },

    status: {
      type: String,
      enum: ["draft", "blocked", "published"],
      default: "draft",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate categories per restaurant
categorySchema.index({ slug: 1, restaurantId: 1 });

categorySchema.index(
  { name: 1, restaurantId: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);

categorySchema.index({ restaurantId: 1, isActive: 1, status: 1 });

categorySchema.plugin(softDeleteRestorePlugin);

export default mongoose.model("Category", categorySchema);
