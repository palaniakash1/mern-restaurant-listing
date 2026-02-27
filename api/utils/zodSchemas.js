/**
 * Zod Validation Schemas
 * TypeScript-first schema validation for all models
 */

import { z } from "zod";

// ===================================================================
// USER SCHEMAS
// ===================================================================

export const createUserSchema = z.object({
  userName: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["user", "storeManager", "admin", "superAdmin"]).optional(),
});

export const updateUserSchema = z.object({
  userName: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
  profilePicture: z.string().url().optional(),
  // Password should be changed via change-password endpoint
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const assignRestaurantSchema = z.object({
  restaurantId: z.string().min(1),
});

export const changeOwnerSchema = z.object({
  newAdminId: z.string().min(1),
});

// ===================================================================
// RESTAURANT SCHEMAS
// ===================================================================

export const createRestaurantSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  cuisineType: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default("USA"),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
  }),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
  openingHours: z
    .array(
      z.object({
        day: z.enum([
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ]),
        open: z.string(),
        close: z.string(),
        closed: z.boolean().optional(),
      })
    )
    .optional(),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateRestaurantSchema = createRestaurantSchema.partial();

// ===================================================================
// CATEGORY SCHEMAS
// ===================================================================

export const createCategorySchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
  restaurantId: z.string().min(1),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ===================================================================
// MENU SCHEMAS
// ===================================================================

export const createMenuItemSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  categoryId: z.string().min(1),
  restaurantId: z.string().min(1),
  isAvailable: z.boolean().optional(),
  preparationTime: z.number().int().positive().optional(), // in minutes
  allergens: z.array(z.string()).optional(),
  dietaryInfo: z
    .array(z.enum(["vegetarian", "vegan", "gluten-free", "dairy-free", "nut-free"]))
    .optional(),
  images: z.array(z.string().url()).optional(),
  isPopular: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

// ===================================================================
// REVIEW SCHEMAS
// ===================================================================

export const createReviewSchema = z.object({
  restaurantId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  photos: z.array(z.string().url()).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
  isHidden: z.boolean().optional(),
  isFlagged: z.boolean().optional(),
});

// ===================================================================
// PAGINATION & FILTERS
// ===================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  q: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

// ===================================================================
// EXPORT ALL SCHEMAS
// ===================================================================

export const schemas = {
  // User
  createUser: createUserSchema,
  updateUser: updateUserSchema,
  changePassword: changePasswordSchema,
  login: loginSchema,
  assignRestaurant: assignRestaurantSchema,
  changeOwner: changeOwnerSchema,
  // Restaurant
  createRestaurant: createRestaurantSchema,
  updateRestaurant: updateRestaurantSchema,
  // Category
  createCategory: createCategorySchema,
  updateCategory: updateCategorySchema,
  // Menu
  createMenuItem: createMenuItemSchema,
  updateMenuItem: updateMenuItemSchema,
  // Review
  createReview: createReviewSchema,
  updateReview: updateReviewSchema,
  // Common
  pagination: paginationSchema,
  idParam: idParamSchema,
};

export default schemas;
