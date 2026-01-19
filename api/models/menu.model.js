import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
    },

    image: {
      type: String,
    },

    price: {
      type: Number, // display only
    },

    // 🥗 Dietary filters (top row in screenshot)
    dietary: {
      isVegetarian: { type: Boolean, default: false },
      isVegan: { type: Boolean, default: false },
    },

    // ⚠️ Allergen filters (chips in screenshot)
    allergens: [
      {
        type: String,
        enum: [
          "gluten",
          "milk",
          "nuts",
          "soy",
          "fish",
          "eggs",
          "celery",
          "mustard",
        ],
      },
    ],

    // 🍎 Expandable nutrition panel
    nutrition: {
      energyKcal: Number,
      fat: Number,
      saturates: Number,
      sugars: Number,
      salt: Number,
    },

    // ⭐ UI flags
    isPopular: {
      type: Boolean,
      default: false,
    },

    isRecommended: {
      type: Boolean,
      default: false,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    // 🔢 Item ordering inside category
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);
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
  },
  { timestamps: true }
);
export default mongoose.model("Menu", menuSchema);
