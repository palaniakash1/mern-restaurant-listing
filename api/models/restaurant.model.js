import mongoose from "mongoose";

const openingHourSchema = new mongoose.Schema(
  {
    open: { type: String },
    close: { type: String },
    isClosed: { type: Boolean, default: false },
  },
  { _id: false },
);

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    tagline: { type: String },
    description: { type: String },

    slug: { type: String, required: true, unique: true, index: true },

    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
      },
    ],

    menus: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Menu",
      },
    ],

    address: {
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
      areaLocality: { type: String, required: true },
      city: { type: String, required: true },
      countyRegion: { type: String },
      postcode: { type: String, required: true },
      country: { type: String, default: "United Kingdom" },

      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [lng, lat]
          required: true,
        },
      },
    },

    openingHours: {
      monday: openingHourSchema,
      tuesday: openingHourSchema,
      wednesday: openingHourSchema,
      thursday: openingHourSchema,
      friday: openingHourSchema,
      saturday: openingHourSchema,
      sunday: openingHourSchema,
    },

    contactNumber: { type: String },
    email: { type: String },
    website: { type: String },

    imageLogo: {
      type: String,
      default:
        "https://firebasestorage.googleapis.com/v0/b/mern-restaurant-b5fb7.firebasestorage.app/o/1766387131263eatwisely%20food%20placeholder%20(1).jpg?alt=media&token=9c262556-bbdc-4d02-8175-6c92fada6aee",
    },
    gallery: [{ type: String }],

    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },

    isFeatured: { type: Boolean, default: false, index: true },
    isTrending: { type: Boolean, default: false, index: true },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "blocked"],
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

restaurantSchema.index({
  "address.location": "2dsphere",
});

export default mongoose.model("Restaurant", restaurantSchema);
