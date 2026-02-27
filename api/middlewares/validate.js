import { errorHandler } from "../utils/error.js";

// Map Joi types to friendly labels
const fieldLabels = {
  userName: "Username",
  email: "Email address",
  password: "Password",
  currentPassword: "Current password",
  newPassword: "New password",
  name: "Name",
  description: "Description",
  address: "Address",
  contactNumber: "Contact number",
  website: "Website URL",
  imageLogo: "Logo image",
  gallery: "Gallery images",
  categories: "Categories",
  adminId: "Admin ID",
  status: "Status",
  isActive: "Active status",
  isFeatured: "Featured status",
  isTrending: "Trending status",
  city: "City",
  state: "State",
  country: "Country",
  zipCode: "Zip code",
  latitude: "Latitude",
  longitude: "Longitude",
  radius: "Search radius",
  page: "Page number",
  limit: "Items per page",
  search: "Search term",
  sort: "Sort order",
  sortBy: "Sort by",
  order: "Order",
  rating: "Rating",
  comment: "Comment",
  id: "ID",
  menuId: "Menu ID",
  itemId: "Item ID",
  restaurantId: "Restaurant ID",
  categoryId: "Category ID",
  role: "Role",
  isGeneric: "Generic category flag",
  newAdminId: "New admin ID",
  restaurantId: "Restaurant ID",
  format: "Export format",
  action: "Action type",
  entityType: "Entity type",
  entityId: "Entity ID",
  actorId: "Actor ID",
  from: "Start date",
  to: "End date",
  price: "Price",
  isAvailable: "Availability",
  "x-idempotency-key": "Idempotency key",
};

// Format a single validation error message
const formatError = (detail) => {
  const field = detail.path.join(".");
  const label = fieldLabels[field] || detail.path[detail.path.length - 1] || "Field";
  const msg = detail.message.replace(/"/g, "");
  
  // Handle different error types
  if (detail.type === "string.empty") {
    return `${label} cannot be empty`;
  }
  if (detail.type === "string.min") {
    return `${label} must be at least ${detail.context?.limit} characters`;
  }
  if (detail.type === "string.max") {
    return `${label} cannot exceed ${detail.context?.limit} characters`;
  }
  if (detail.type === "number.min") {
    return `${label} must be at least ${detail.context?.limit}`;
  }
  if (detail.type === "number.max") {
    return `${label} cannot exceed ${detail.context?.limit}`;
  }
  if (detail.type === "number.integer") {
    return `${label} must be a whole number`;
  }
  if (detail.type === "any.required") {
    return `${label} is required`;
  }
  if (detail.type === "any.only") {
    return `${label} must be one of: ${detail.context?.valids?.join(", ")}`;
  }
  if (detail.type === "string.pattern.name") {
    return detail.context?.name === "objectIdPattern"
      ? "Invalid ID format. Please provide a valid 24-character hex string"
      : `${label} is invalid`;
  }
  if (detail.type === "string.email") {
    return "Please enter a valid email address";
  }
  if (detail.type === "string.uri") {
    return `${label} must be a valid URL`;
  }
  if (detail.type === "array.min") {
    return `${label} must contain at least ${detail.context?.limit} item(s)`;
  }
  if (detail.type === "array.max") {
    return `${label} cannot contain more than ${detail.context?.limit} items`;
  }
  if (detail.type === "object.unknown") {
    return `${label} contains invalid fields`;
  }
  
  // Default: clean up the message
  return `${label}: ${msg}`;
};

export const validate =
  (schema, source = "body", options = {}) =>
  (req, res, next) => {
    const { assign = source !== "headers" } = options;
    const payload = req[source];

    const { error, value } = schema.validate(payload, {
      abortEarly: false,
      stripUnknown: source !== "headers",
      convert: true,
    });

    if (error) {
      const messages = error.details.map(formatError);
      const finalMessage = messages.length === 1 
        ? messages[0] 
        : `${messages.length} validation errors: ${messages.join("; ")}`;
      
      return next(errorHandler(400, finalMessage));
    }

    // Don't assign back to req.query as it's a getter-only property in newer Node.js
    if (assign && source !== "query" && source !== "headers") {
      req[source] = value;
    }
    return next();
  };

