import Joi from "joi";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Custom error messages for better user experience
const messages = {
  string: {
    required: '{{#label}} is required',
    empty: '{{#label}} cannot be empty',
    min: '{{#label}} must be at least {{#limit}} characters',
    max: '{{#label}} cannot exceed {{#limit}} characters',
  },
  stringemail: {
    email: 'Please enter a valid email address',
  },
  number: {
    min: '{{#label}} must be at least {{#limit}}',
    max: '{{#label}} cannot exceed {{#limit}}',
    integer: '{{#label}} must be a whole number',
  },
  any: {
    required: '{{#label}} is required',
    empty: '{{#label}} cannot be empty',
  },
  array: {
    min: '{{#label}} must contain at least {{#limit}} item(s)',
    max: '{{#label}} cannot contain more than {{#limit}} items',
  },
  objectId: 'Invalid ID format. Please provide a valid 24-character hex string',
  pattern: {
    objectId: 'Invalid ID format. Please provide a valid 24-character hex string (e.g., "507f1f77bcf86cd799439011")',
  },
};

const objectId = Joi.string().pattern(objectIdRegex).messages(messages.pattern);
const sortOrder = Joi.string().valid("asc", "desc");
const pagination = {
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
};

const openingHourSchema = Joi.object({
  open: Joi.string().pattern(timeRegex),
  close: Joi.string().pattern(timeRegex),
  isClosed: Joi.boolean(),
}).unknown(false);

const openingHoursSchema = Joi.object({
  monday: openingHourSchema,
  tuesday: openingHourSchema,
  wednesday: openingHourSchema,
  thursday: openingHourSchema,
  friday: openingHourSchema,
  saturday: openingHourSchema,
  sunday: openingHourSchema,
}).unknown(false);

const addressSchema = Joi.object({
  addressLine1: Joi.string().trim().min(2).required(),
  addressLine2: Joi.string().allow(""),
  areaLocality: Joi.string().trim().min(2).required(),
  city: Joi.string().trim().min(2).required(),
  countyRegion: Joi.string().allow(""),
  postcode: Joi.string().trim().min(2).required(),
  country: Joi.string().trim().min(2).default("United Kingdom"),
  location: Joi.object({
    type: Joi.string().valid("Point"),
    coordinates: Joi.array().items(Joi.number()).length(2),
  }).unknown(true),
}).unknown(false);

const restaurantCreateBody = Joi.object({
  name: Joi.string().trim().min(2).required(),
  tagline: Joi.string().allow(""),
  description: Joi.string().allow(""),
  address: addressSchema.required(),
  openingHours: openingHoursSchema,
  contactNumber: Joi.string().allow(""),
  email: Joi.string().email().allow(""),
  website: Joi.string().uri().allow(""),
  imageLogo: Joi.string().uri().allow(""),
  gallery: Joi.array().items(Joi.string().uri()).max(20),
  categories: Joi.array().items(objectId).max(50),
  adminId: objectId,
  timezone: Joi.string().trim().default("UTC"),
  status: Joi.string().valid("draft", "published", "blocked"),
  isActive: Joi.boolean(),
  isFeatured: Joi.boolean(),
  isTrending: Joi.boolean(),
  // Location at top level - controller uses lat/lng directly instead of geocoding
  location: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }),
}).unknown(false);

const restaurantUpdateBody = Joi.object({
  name: Joi.string().trim().min(2),
  tagline: Joi.string().allow(""),
  description: Joi.string().allow(""),
  address: addressSchema,
  openingHours: openingHoursSchema,
  contactNumber: Joi.string().allow(""),
  email: Joi.string().email().allow(""),
  website: Joi.string().uri().allow(""),
  imageLogo: Joi.string().uri().allow(""),
  gallery: Joi.array().items(Joi.string().uri()).max(20),
  categories: Joi.array().items(objectId).max(50),
  timezone: Joi.string().trim(),
}).min(1);

const idParam = Joi.object({ id: objectId.required() });
const menuParam = Joi.object({ menuId: objectId.required() });
const itemParam = Joi.object({
  menuId: objectId.required(),
  itemId: objectId.required(),
});
const restaurantIdParam = Joi.object({ restaurantId: objectId.required() });
const reviewIdParam = Joi.object({ id: objectId.required() });
const userIdParam = Joi.object({ id: objectId.required() });

export const authValidators = {
  signup: Joi.object({
    userName: Joi.string().trim().min(3).max(30).lowercase().required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().pattern(PASSWORD_REGEX).required(),
  }),
  signin: Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().required(),
  }),
  google: Joi.object({
    name: Joi.string().allow(""),
    email: Joi.string().trim().email().required(),
    googlePhotoUrl: Joi.string().uri().allow(""),
  }),
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().pattern(PASSWORD_REGEX).required(),
  }),
};

export const adminValidators = {
  createPrivilegedUser: Joi.object({
    userName: Joi.string().trim().min(3).max(30).lowercase().required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().pattern(PASSWORD_REGEX).required(),
    role: Joi.string().valid("admin", "storeManager").required(),
  }),
};

export const userValidators = {
  idParam: userIdParam,
  listQuery: Joi.object({
    ...pagination,
    q: Joi.string().allow(""),
    order: sortOrder,
  }),
  storeManagersQuery: Joi.object({
    ...pagination,
  }),
  createStoreManager: Joi.object({
    userName: Joi.string().trim().min(3).max(30).lowercase().required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().pattern(PASSWORD_REGEX).required(),
  }),
  updateUser: Joi.object({
    userName: Joi.string().trim().min(3).max(30).lowercase(),
    email: Joi.string().trim().email(),
    password: Joi.string().pattern(PASSWORD_REGEX),
    profilePicture: Joi.string().uri().allow(""),
  }).min(1),
  assignStoreManager: Joi.object({
    restaurantId: objectId.required(),
  }),
  changeStoreManagerOwner: Joi.object({
    newAdminId: objectId.required(),
  }),
};

export const auditValidators = {
  listQuery: Joi.object({
    entityType: Joi.string().valid(
      "user",
      "restaurant",
      "category",
      "menu",
      "review",
      "auth",
    ),
    entityId: objectId,
    action: Joi.string(),
    actorId: objectId,
    ...pagination,
  }),
};

export const restaurantValidators = {
  idParam,
  slugParam: Joi.object({ slug: Joi.string().trim().min(1).required() }),
  createBody: restaurantCreateBody,
  updateBody: restaurantUpdateBody,
  statusBody: Joi.object({
    status: Joi.string().valid("draft", "published", "blocked").required(),
  }),
  reassignBody: Joi.object({
    newAdminId: objectId.required(),
  }),
  listQuery: Joi.object({
    city: Joi.string(),
    categories: Joi.alternatives().try(
      Joi.array().items(objectId),
      Joi.string(),
    ),
    isFeatured: Joi.boolean(),
    isTrending: Joi.boolean(),
    isOpenNow: Joi.boolean(),
    q: Joi.string().allow(""),
    sortBy: Joi.string().valid("rating", "name"),
    ...pagination,
  }),
  allQuery: Joi.object({
    ...pagination,
    q: Joi.string().allow(""),
    order: sortOrder,
  }),
  nearbyQuery: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
    radius: Joi.number().positive(),
  }),
  featuredTrendingQuery: Joi.object({
    ...pagination,
  }),
};

const categoryReorderItem = Joi.object({
  id: objectId.required(),
  order: Joi.number().integer().min(0).required(),
});

export const categoryValidators = {
  idParam,
  listQuery: Joi.object({
    restaurantId: objectId,
    ...pagination,
    search: Joi.string().allow(""),
    sort: sortOrder,
  }),
  myQuery: Joi.object({
    ...pagination,
    order: sortOrder,
  }),
  allQuery: Joi.object({
    ...pagination,
    search: Joi.string().allow(""),
  }),
  deletedQuery: Joi.object({
    ...pagination,
    search: Joi.string().allow(""),
    restaurantId: objectId,
  }),
  exportQuery: Joi.object({
    format: Joi.string().valid("json", "csv"),
    search: Joi.string().allow(""),
    status: Joi.string().valid("draft", "blocked", "published"),
    isGeneric: Joi.boolean(),
    isActive: Joi.boolean(),
    restaurantId: objectId,
    includeInactive: Joi.boolean(),
    limit: Joi.number().integer().min(1).max(5000),
  }),
  createBody: Joi.object({
    name: Joi.string().trim().min(2).required(),
    isGeneric: Joi.boolean().default(false),
    restaurantId: objectId,
    order: Joi.number().integer().min(0),
  }),
  updateBody: Joi.object({
    name: Joi.string().trim().min(2),
    order: Joi.number().integer().min(0),
    isActive: Joi.boolean(),
  }).min(1),
  updateStatusBody: Joi.object({
    isActive: Joi.boolean().required(),
  }),
  bulkStatusBody: Joi.object({
    ids: Joi.array().items(objectId).min(1).required(),
    status: Joi.string().valid("draft", "blocked", "published").required(),
  }),
  reorderBody: Joi.array().items(categoryReorderItem).min(1),
  bulkReorderBody: Joi.object({
    items: Joi.array().items(categoryReorderItem).min(1).required(),
  }),
  checkSlugBody: Joi.object({
    name: Joi.string().trim().allow(""),
    slug: Joi.string().trim().allow(""),
    isGeneric: Joi.boolean().default(false),
    restaurantId: objectId,
    categoryId: objectId,
  }).or("name", "slug"),
  auditQuery: Joi.object({
    ...pagination,
    action: Joi.string(),
    actorId: objectId,
    from: Joi.date().iso(),
    to: Joi.date().iso(),
    sort: sortOrder,
  }),
  idempotencyHeader: Joi.object({
    "x-idempotency-key": Joi.string().trim().min(8).required(),
  }).unknown(true),
};

export const menuValidators = {
  menuParam,
  itemParam,
  restaurantParam: restaurantIdParam,
  createMenuBody: Joi.object({
    restaurantId: objectId.required(),
    categoryId: objectId.required(),
  }),
  addItemBody: Joi.object({
    name: Joi.string().trim().min(1).required(),
    description: Joi.string().allow(""),
    image: Joi.string().uri().allow(""),
    price: Joi.number().min(0).required(),
    dietary: Joi.object({
      vegetarian: Joi.boolean(),
      vegan: Joi.boolean(),
    }),
    ingredients: Joi.array().items(Joi.object().unknown(true)),
    nutrition: Joi.object().unknown(true),
    upsells: Joi.array().items(
      Joi.object({
        label: Joi.string().trim().required(),
        price: Joi.number().min(0).required(),
      }),
    ),
    isMeal: Joi.boolean(),
  }).unknown(false),
  updateItemBody: Joi.object({
    name: Joi.string().trim().min(1),
    description: Joi.string().allow(""),
    image: Joi.string().uri().allow(""),
    price: Joi.number().min(0),
    dietary: Joi.object({
      vegetarian: Joi.boolean(),
      vegan: Joi.boolean(),
    }),
    ingredients: Joi.array().items(Joi.object().unknown(true)),
    nutrition: Joi.object().unknown(true),
    upsells: Joi.array().items(Joi.object().unknown(true)),
    isMeal: Joi.boolean(),
    isAvailable: Joi.boolean(),
  }).min(1),
  reorderBody: Joi.object({
    order: Joi.array()
      .items(
        Joi.object({
          itemId: objectId.required(),
          order: Joi.number().integer().min(1).required(),
        }),
      )
      .min(1)
      .required(),
  }),
  statusBody: Joi.object({
    status: Joi.string().valid("draft", "blocked", "published").required(),
  }),
  deletedQuery: Joi.object({
    ...pagination,
    restaurantId: objectId,
    search: Joi.string().allow(""),
  }),
  auditQuery: Joi.object({
    ...pagination,
    action: Joi.string(),
    actorId: objectId,
    from: Joi.date().iso(),
    to: Joi.date().iso(),
    sort: sortOrder,
  }),
  byRestaurantQuery: Joi.object({
    ...pagination,
    search: Joi.string().allow(""),
    sort: sortOrder,
  }),
};

export const reviewValidators = {
  idParam: reviewIdParam,
  restaurantParam: restaurantIdParam,
  listRestaurantQuery: Joi.object({
    ...pagination,
    sort: sortOrder,
  }),
  myQuery: Joi.object({
    ...pagination,
  }),
  createBody: Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().allow(""),
  }),
  updateBody: Joi.object({
    rating: Joi.number().min(1).max(5),
    comment: Joi.string().allow(""),
  }).min(1),
  moderateBody: Joi.object({
    isActive: Joi.boolean().required(),
  }),
};

