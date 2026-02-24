import mongoose from "mongoose";
import { softDeleteRestorePlugin } from "../utils/plugins/softDeleteRestore.plugin.js";

// Ingredient schema (critical)
const ingredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    allergens: [
      {
        type: String,
        enum: [
          "gluten",
          "egg",
          "fish",
          "crustaceans",
          "molluscs",
          "milk",
          "peanut",
          "tree_nuts",
          "sesame",
          "soya",
          "celery",
          "mustard",
          "sulphites",
          "lupin",
        ],
      },
    ],

    strict: {
      type: Boolean, // cannot be removed
      default: false,
    },

    removable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

// Nutrition schema (with levels)
const nutritionValueSchema = new mongoose.Schema(
  {
    value: Number,
    level: {
      type: String,
      enum: ["green", "amber", "red"],
    },
  },
  { _id: false },
);

const nutritionSchema = new mongoose.Schema(
  {
    calories: nutritionValueSchema,
    fat: nutritionValueSchema,
    saturates: nutritionValueSchema,
    sugar: nutritionValueSchema,
    salt: nutritionValueSchema,
  },
  { _id: false },
);

// Upsell schema
const upsellSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

// Menu Item schema (core)
const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    image: String,

    price: {
      type: Number,
      required: true,
    },

    dietary: {
      vegetarian: { type: Boolean, default: false },
      vegan: { type: Boolean, default: false },
    },

    ingredients: [ingredientSchema],

    nutrition: nutritionSchema,

    upsells: [upsellSchema],

    isMeal: {
      type: Boolean,
      default: false,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },

    isActive: { type: Boolean, default: true },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: true },
);

// Menu schema (per category per restaurant)
const menuSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    items: [menuItemSchema],

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["draft", "blocked", "published"],
      default: "draft",
      index: true,
    },
  },
  { timestamps: true, optimisticConcurrency: true },
);

menuSchema.index({ status: 1, isActive: 1 });
menuSchema.index({ restaurantId: 1, categoryId: 1 }, { unique: true });
menuSchema.plugin(softDeleteRestorePlugin);

export default mongoose.model("Menu", menuSchema);
