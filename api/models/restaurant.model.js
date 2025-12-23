import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    tagline: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    mapSnippet: {
      type: String,
    },
    imageLogo: {
      type: String,
      required: true,
      default:
        "https://firebasestorage.googleapis.com/v0/b/mern-restaurant-b5fb7.firebasestorage.app/o/1766387126586eatwisely%20food%20placeholder.jpg?alt=media&token=0ce0890c-9cae-410b-8eb3-33ae74e20dee",
    },
    gallery: [
      {
        type: String,
      },
    ],
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    openingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
    // Linking to the User who is the Admin
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const restaurant = mongoose.model("restaurant", restaurantSchema);

export default restaurant;
