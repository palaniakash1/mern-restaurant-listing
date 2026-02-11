import Restaurant from "../models/restaurant.model.js";
import User from "../models/user.model.js";
import Category from "../models/category.model.js";
import { errorHandler } from "../utils/error.js";
import { geocodeAddress } from "../utils/geocode.js";
import { isRestaurantOpen } from "../utils/openNow.js";
import Menu from "../models/menu.model.js";
import { paginate } from "../utils/paginate.js";
import { publicRestaurantFilter } from "../utils/restaurantVisibility.js";

import { withTransaction } from "../utils/withTransaction.js";
import { diffObject } from "../utils/diff.js";
import mongoose from "mongoose";
import { logAudit } from "../utils/auditLogger.js";

// ===============================================================================
// 🔷 POST /api/restaurants — Create a new restaurant
// ===============================================================================
// Purpose:
// - Allows an Admin to create their own restaurant (one per admin)
// - Allows SuperAdmin to create a restaurant and optionally assign an Admin
//
// Who can access:
// - Admin
// - SuperAdmin
//
// Key Rules:
// - Slug is auto-generated from name
// - Admin can own ONLY one restaurant
// - SuperAdmin can assign ownership to another admin
// - Status, isActive, isFeatured, isTrending are restricted on creation
//
// Real-world usage:
// - Admin onboarding flow
// - SuperAdmin manual restaurant setup
//
// ===============================================================================

export const create = async (req, res, next) => {
  try {
    // BASIC VALIDATIONS (NO DB MUTATION)

    if (!req.body || Object.keys(req.body).length === 0) {
      return next(errorHandler(400, "Request body is missing"));
    }

    const {
      name,
      tagline,
      description,
      address,
      location,
      openingHours,
      contactNumber,
      email,
      website,
      imageLogo,
      gallery,
      isFeatured,
      isTrending,
      adminId,
    } = req.body;

    if (!name || !address || !contactNumber || !email) {
      return next(errorHandler(400, "All required fields must be filled"));
    }

    // check for valid address
    if (!address?.city || !address?.addressLine1) {
      throw errorHandler(400, "Invalid address");
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw errorHandler(400, "Invalid email format");
    }

    // Slug generation (clean)
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    let geoLocation;

    // ✅ CASE A: frontend already sent lat/lng
    if (location?.lat !== undefined && location?.lng !== undefined) {
      geoLocation = {
        type: "Point",
        coordinates: [location.lng, location.lat],
      };
    }
    // 🔁 CASE B: fallback geocoding
    else {
      geoLocation = await geocodeAddress(address);
    }
    const forbiddenOnCreate = [
      "isFeatured",
      "isTrending",
      "status",
      "isActive",
    ];

    for (const field of forbiddenOnCreate) {
      if (field in req.body && req.user.role !== "superAdmin") {
        throw errorHandler(403, `${field} cannot be set during creation`);
      }
    }
    const restaurant = await withTransaction(async (session) => {
      //  Slug uniqueness check (DB dependent) if exists lets create +1
      let baseSlug = slug;
      let counter = 1;

      while (await Restaurant.findOne({ slug: baseSlug }).session(session)) {
        baseSlug = `${slug}-${counter++}`;
      }

      let assignedAdminId = req.user.id;

      // Admin → only one restaurant
      if (req.user.role === "admin") {
        const adminUser = await User.findById(req.user.id).session(session);
        if (adminUser.restaurantId) {
          throw errorHandler(403, "Admin can create only one restaurant");
        }
      }

      // SuperAdmin assigning ownership
      if (req.user.role === "superAdmin" && adminId) {
        const adminExists = await User.findById(adminId).session(session);

        if (!adminExists || adminExists.role !== "admin") {
          throw errorHandler(400, "Invalid admin selected");
        }

        if (adminExists.restaurantId) {
          throw errorHandler(403, "Selected admin already owns a restaurant");
        }

        assignedAdminId = adminId;
      }

      const buildSearchText = (restaurant) =>
        [
          restaurant.name,
          restaurant.tagline,
          restaurant.address?.city,
          restaurant.address?.areaLocality,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

      const restaurantPayload = {
        name,
        tagline,
        description,
        slug: baseSlug,
        address: {
          ...address,
          location: geoLocation,
        },
        openingHours,
        contactNumber,
        email,
        website,
        imageLogo,
        gallery,
        adminId: assignedAdminId,
      };

      // 🔐 Role-based fields
      if (req.user.role === "superAdmin") {
        restaurantPayload.isFeatured = isFeatured;
        restaurantPayload.isTrending = isTrending;
      }

      restaurantPayload.searchText = buildSearchText({
        name,
        tagline,
        address,
      });

      // 🏗 Create restaurant
      const [createdRestaurant] = await Restaurant.create([restaurantPayload], {
        session,
      });

      // 🔗 Link restaurant to admin
      await User.findByIdAndUpdate(
        assignedAdminId,
        { restaurantId: createdRestaurant._id },
        { session },
      );

      // 🧾 Audit log
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "restaurant",
        entityId: createdRestaurant._id,
        action: "CREATE",
        before: null,
        after: createdRestaurant,
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });

      return createdRestaurant;
    });

    /* ---------------------------------------------------
       5️⃣ RESPONSE
    --------------------------------------------------- */

    res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      data: restaurant,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(409, "Restaurant slug already exists"));
    }

    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/all — Get all restaurants (internal view)
// ===============================================================================
// Purpose:
// - Fetch ALL restaurants in the system (including draft / blocked)
//
// Who can access:
// - SuperAdmin only
//
// Supports:
// - Pagination
// - Full-text search
// - Sorting
//
// Real-world usage:
// - SuperAdmin dashboard
// - Moderation panel
// - Audit & management screens
//
// ===============================================================================
export const getAllRestaurants = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, q } = req.query;
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    const filter = {};
    let projection = {};
    let sort = { createdAt: sortDirection };

    if (q) {
      filter.$text = { $search: q };
      projection = { score: { $meta: "textScore" } };
      sort = { score: { $meta: "textScore" } };
    }

    const total = await Restaurant.countDocuments(filter);

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (pageNum < 1 || limitNum < 1) {
      throw errorHandler(400, "Invalid pagination values");
    }

    const pagination = paginate({
      page: pageNum,
      limit: limitNum,
      total,
    });

    const restaurants = await Restaurant.find(filter, projection)
      .select("-__v")
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort(sort)
      .lean();

    res.status(200).json({
      success: true,
      ...pagination,
      data: restaurants,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/id/{id} — Get restaurant by ID (internal/system view)
// ===============================================================================
// Purpose:
// - Fetch the complete internal record of a restaurant using DB ID
//
// Who can access:
// - SuperAdmin → any restaurant
// - Admin → only their assigned restaurant (ownership enforced)
//
// Why ID-based:
// - IDs never change
// - Used for admin tooling, audits, updates, reassignment
//
// Real-world usage:
// - Admin edit restaurant form
// - SuperAdmin moderation & audits
// - Status updates, restore, reassignment
//
// ===============================================================================

export const getRestaurantById = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select("-__v");

    if (!restaurant) {
      return next(errorHandler(404, "Restaurant not found"));
    }

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/slug/{slug} — Get restaurant by slug (public-safe)
// ===============================================================================
// Purpose:
// - Fetch restaurant data intended for public visibility
//
// Visibility rules:
// - Only published & active restaurants
// - Uses publicRestaurantFilter
//
// Who can access:
// - Public users
// - Frontend clients
// - Admins (via public preview, NOT internal data)
//
// Why slug-based:
// - SEO-friendly
// - Human-readable URLs
//
// Real-world usage:
// - Restaurant preview pages
// - SEO landing pages
// - Admin "Preview restaurant" feature
//
// ===============================================================================

export const getRestaurantBySlug = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({
      slug: req.params.slug,
      ...publicRestaurantFilter,
    }).select("-__v");

    if (!restaurant) {
      return next(errorHandler(404, "Restaurant not found"));
    }

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/restaurants/id/{id}/status — Update restaurant status
// ===============================================================================
// Purpose:
// - Control publication state of restaurant
//
// Allowed statuses:
// - published
// - draft
// - blocked
//
// Who can access:
// - SuperAdmin only
//
// Side effects:
// - isActive derived from status
// - Audit log recorded
//
// Real-world usage:
// - Moderation
// - Approval workflows
//
// ===============================================================================

export const updateRestaurantStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ["published", "draft", "blocked"];

    if (!allowedStatuses.includes(status))
      throw errorHandler(400, "Invalid restaurant status");

    const result = await withTransaction(async (session) => {
      // 📄 Fetch current state
      const restaurant = await Restaurant.findById(req.params.id)
        .session(session)
        .lean();

      if (!restaurant) {
        throw errorHandler(404, "Restaurant not found");
      }

      // ⛔ No-op protection
      if (restaurant.status === status) {
        throw errorHandler(400, `Restaurant already in '${status}' status`);
      }

      // 🧠 Derive isActive from status (single source of truth)
      const isActive = status === "published";

      // 🔁 Update
      const updated = await Restaurant.findByIdAndUpdate(
        req.params.id,
        {
          status,
          isActive,
        },
        { new: true, session },
      ).lean();

      // 🧾 Audit log
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "restaurant",
        entityId: updated._id,
        action: "STATUS_CHANGE",
        before: { status: restaurant.status },
        after: { status },
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });

      return updated;
    });

    res.status(200).json({
      success: true,
      message: `Restaurant status updated to '${result.status}'`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/restaurants/id/{id} — Update restaurant details
// ===============================================================================
// Purpose:
// - Update editable restaurant information
//
// Who can access:
// - Admin (own restaurant only)
// - SuperAdmin
//
// Restricted fields:
// - slug
// - status
// - isActive
// - isFeatured
// - isTrending
// - adminId
//
// Notes:
// - Uses transaction
// - Audit logs are recorded
//
// Real-world usage:
// - Admin editing restaurant profile
//
// ===============================================================================

export const updateRestaurant = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      // Fetch old snapshot for audit
      const oldRestaurant = await Restaurant.findById(req.params.id)
        .session(session)
        .lean();

      if (!oldRestaurant) {
        throw errorHandler(404, "Restaurant not found");
      }

      const buildSearchText = (restaurant) =>
        [
          restaurant.name,
          restaurant.tagline,
          restaurant.address?.city,
          restaurant.address?.areaLocality,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

      // Forbidden Fields
      const forbiddenFields = [
        "slug",
        "status",
        "isActive",
        "isFeatured",
        "isTrending",
        "adminId",
      ];

      for (const field of forbiddenFields) {
        if (field in req.body) {
          throw errorHandler(403, `${field} cannot be updated`);
        }
      }

      // Allowlisted updates
      const allowedUpdates = [
        "name",
        "tagline",
        "description",
        "categories",
        "address",
        "openingHours",
        "contactNumber",
        "email",
        "website",
        "imageLogo",
        "gallery",
      ];

      const updates = {};

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (!Object.keys(updates).length) {
        throw errorHandler(400, "No valid fields provided");
      }

      // Recompute geo if address changes
      if (updates.address) {
        const geo = await geocodeAddress(updates.address);
        updates.address.location = geo;
      }

      // validation of categories array
      if (updates.categories) {
        const validCategories = await Category.countDocuments({
          _id: { $in: updates.categories },
        });

        if (validCategories !== updates.categories.length) {
          throw errorHandler(400, "Invalid category IDs");
        }
      }

      updates.searchText = buildSearchText({
        name: updates.name ?? oldRestaurant.name,
        tagline: updates.tagline ?? oldRestaurant.tagline,
        address: updates.address ?? oldRestaurant.address,
      });

      // Perform update
      const updatedRestaurant = await Restaurant.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, session },
      ).lean();

      if (!updatedRestaurant) {
        throw errorHandler(404, "Restaurant not found after update");
      }

      const diff = diffObject(oldRestaurant, updatedRestaurant, allowedUpdates);

      // Audit log AFTER success
      if (diff && Object.keys(diff).length) {
        await logAudit({
          actorId: req.user.id,
          actorRole: req.user.role,
          entityType: "restaurant",
          entityId: updatedRestaurant._id,
          action: "UPDATE",
          before: diff,
          after: null,
          ipAddress: req.headers["x-forwarded-for"] || req.ip,
        });
      }

      return updatedRestaurant;
    });

    res.status(200).json({
      success: true,
      message: "Restaurant Updated Successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 DELETE /api/restaurants/id/{id} — Soft delete restaurant
// ===============================================================================
// Purpose:
// - Soft delete a restaurant (no hard delete)
//
// What happens:
// - status → blocked
// - isActive → false
// - Admin ownership detached
//
// Who can access:
// - Admin (own restaurant)
// - SuperAdmin
//
// Notes:
// - Transactional
// - Audit logged
//
// Real-world usage:
// - Admin closing restaurant
// - SuperAdmin enforcement
//
// ===============================================================================

export const deleteRestaurant = async (req, res, next) => {
  try {
    let deletedRestaurantId;
    let softDeleted;
    await withTransaction(async (session) => {
      // Fetch snapshot BEFORE deletion
      const restaurant = await Restaurant.findById(req.params.id)
        .session(session)
        .lean();

      if (!restaurant) {
        throw errorHandler(404, "Restaurant not found");
      }

      deletedRestaurantId = restaurant._id;

      // ⛔ Prevent double-delete
      if (!restaurant.isActive && restaurant.status === "blocked") {
        throw errorHandler(400, "Restaurant already deleted");
      }

      // 🔒 Soft delete restaurant

      softDeleted = await Restaurant.findByIdAndUpdate(
        req.params.id,
        { status: "blocked", isActive: false },
        { new: true, session },
      ).lean();

      // 🔓 Detach admin ownership (optional but recommended)
      if (restaurant.adminId) {
        await User.findByIdAndUpdate(
          restaurant.adminId,
          { $unset: { restaurantId: "" } },
          { session },
        );
      }

      // delete menus
      // await Menu.deleteMany({ restaurantId: restaurant._id }, { session });

      // AUDIT LOG (DELETE)
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "restaurant",
        entityId: restaurant._id,
        action: "DELETE",
        before: restaurant,
        after: { status: "blocked", isActive: false },
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });
    });

    res.status(200).json({
      success: true,
      message: "Restaurant deleted successfully",
      data: softDeleted,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/restaurants/id/{id}/restore — Restore soft-deleted restaurant
// ===============================================================================
// Purpose:
// - Restore a previously blocked restaurant
//
// Rules:
// - Only blocked restaurants can be restored
// - Restored to draft state
//
// Who can access:
// - SuperAdmin only
//
// Real-world usage:
// - Appeals
// - Admin mistake recovery
//
// ===============================================================================

export const restoreRestaurant = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const restaurant = await Restaurant.findById(req.params.id)
        .session(session)
        .lean();

      if (!restaurant) {
        throw errorHandler(404, "Restaurant not found");
      }

      if (restaurant.status !== "blocked") {
        throw errorHandler(400, "Only blocked restaurants can be restored");
      }

      const restored = await Restaurant.findByIdAndUpdate(
        req.params.id,
        {
          status: "draft",
          isActive: false,
        },
        { new: true, session },
      ).lean();

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "restaurant",
        entityId: restaurant._id,
        action: "RESTORE",
        before: { status: "blocked", isActive: false },
        after: { status: "draft", isActive: false },
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });

      return restored;
    });

    res.status(200).json({
      success: true,
      message: "Restaurant restored successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/restaurants/id/{id}/admin — Reassign restaurant ownership
// ===============================================================================
// Purpose:
// - Transfer restaurant ownership to another admin
//
// Who can access:
// - SuperAdmin only
//
// Side effects:
// - Old admin detached
// - New admin assigned
// - Audit log recorded
//
// Real-world usage:
// - Staff changes
// - Admin replacement
//
// ===============================================================================

export const reassignRestaurantAdmin = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      //
      const { id } = req.params;
      const { newAdminId } = req.body;

      if (!newAdminId) {
        throw errorHandler(400, "New admin ID is required");
      }
      // Fetch restaurant (LEAN snapshot)
      const restaurant = await Restaurant.findById(id).session(session).lean();

      if (!restaurant) {
        throw errorHandler(404, "Restaurant Not Found");
      }

      // Fetch admins
      const oldAdmin = await User.findById(restaurant.adminId).session(session);
      if (!oldAdmin) {
        throw errorHandler(500, "Original admin not found");
      }

      const newAdmin = await User.findById(newAdminId).session(session);
      // const newAdmin = await User.findById(newAdminId);
      if (!newAdmin || newAdmin.role !== "admin") {
        throw errorHandler(400, `Invalid admin selected`);
      }

      // check if admin already exists
      if (newAdmin.restaurantId) {
        throw errorHandler(403, "Selected admin already owns a restaurant");
      }

      // Perform reassignment
      // remove restaurant from old admin
      await User.findByIdAndUpdate(
        oldAdmin._id,
        {
          $unset: { restaurantId: "" },
        },
        { session },
      );

      // Assign new admin
      await Restaurant.findByIdAndUpdate(
        id,
        {
          adminId: newAdmin._id,
        },
        { session },
      );

      await User.findByIdAndUpdate(
        newAdmin._id,
        {
          restaurantId: id,
        },
        { session },
      );

      // AUDIT LOG (STATUS_CHANGE)
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "restaurant",
        entityId: restaurant._id,
        action: "REASSIGN",
        before: { adminId: restaurant.adminId },
        after: { adminId: newAdmin._id },
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });

      return {
        restaurantId: restaurant._id,
        oldAdminId: restaurant.adminId,
        newAdminId: newAdmin._id,
      };
    });

    res.status(200).json({
      success: true,
      message: `Restaurant ownership reassigned successfully `,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/me — Get logged-in admin’s restaurant
// ===============================================================================
// Purpose:
// - Fetch the restaurant owned by the currently logged-in admin
//
// Who can access:
// - Admin only
//
// Rules:
// - Admin can only see their own restaurant
//
// Real-world usage:
// - Admin dashboard
// - Restaurant management panel
//
// ===============================================================================

export const getMyRestaurant = async (req, res, next) => {
  try {
    // Admin must have restaurantId assigned
    if (!req.user.restaurantId) {
      return next(errorHandler(404, "No restaurant assigned to this admin"));
    }

    // 🔎 Fetch restaurant by ID
    const restaurant = await Restaurant.findById(req.user.restaurantId).select(
      "-__v",
    );

    if (!restaurant) {
      return next(errorHandler(404, "Restaurant not found"));
    }

    // 🚨 Cross-check ownership consistency
    if (restaurant.adminId.toString() !== req.user.id) {
      return next(
        errorHandler(403, "Ownership mismatch detected. Contact superAdmin."),
      );
    }

    res.status(200).json({
      success: true,
      data: restaurant,
    });
    // console.log(`restaurant: ${restaurant}`);
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/nearby — Nearby restaurants
// ===============================================================================
// Purpose:
// - Find restaurants near user location
//
// Query params:
// - lat (required)
// - lng (required)
// - radius (optional, meters)
//
// Visibility:
// - Only public & active restaurants
//
// Real-world usage:
// - Location-based discovery
// - Maps & proximity search
//
// ===============================================================================

export const getNearByRestaurants = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (lat === undefined || lng === undefined) {
      return next(errorHandler(400, "lat and lng are required"));
    }

    const restaurants = await Restaurant.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance",
          maxDistance: parseInt(radius),
          spherical: true,
          query: publicRestaurantFilter,
        },
      },
      { $sort: { distance: 1 } },
      { $limit: 20 },
    ]);

    const enriched = restaurants.map((r) => ({
      ...r,
      isOpenNow: isRestaurantOpen(r.openingHours),
    }));

    res.json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
    // console.log(`enriched:  ${enriched}`);
    // console.log(`restaurants: ${restaurants}`);
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants — Public restaurant listing & filters
// ===============================================================================
// Purpose:
// - List restaurants for customers with filters
//
// Supported filters:
// - city
// - categories
// - isFeatured
// - isTrending
// - openNow
// - search (q)
// - pagination
//
// Visibility:
// - Only public & active restaurants
//
// Real-world usage:
// - Homepage listings
// - Search results
// - Discovery pages
//
// ===============================================================================

export const listRestaurants = async (req, res, next) => {
  try {
    const {
      city,
      categories,
      isFeatured,
      isTrending,
      isOpenNow,
      q, // q=search
      sortBy,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = { ...publicRestaurantFilter };
    let projection = {};
    let sort = { createdAt: -1 };

    if (city) filter["address.city"] = city;
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";
    if (isTrending !== undefined) filter.isTrending = isTrending === "true";

    if (categories) {
      const categoryArray = Array.isArray(categories)
        ? categories
        : categories.split(",");

      filter.categories = { $in: categoryArray };
    }

    if (q) {
      filter.$text = { $search: q };
      projection = { score: { $meta: "textScore" } };
      sort = { score: { $meta: "textScore" } };
    } else {
      if (sortBy === "rating") sort = { rating: -1 };
      if (sortBy === "name") sort = { name: 1 };
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (pageNum < 1 || limitNum < 1) {
      throw errorHandler(400, "Invalid pagination values");
    }

    const total = await Restaurant.countDocuments(filter);
    const pagination = paginate({
      page: pageNum,
      limit: limitNum,
      total,
    });

    const restaurants = await Restaurant.find(filter, projection)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort(sort)
      .lean();

    let result = restaurants.map((r) => ({
      ...r,
      isOpenNow: isRestaurantOpen(r.openingHours),
    }));

    if (isOpenNow === "true") {
      result = result.filter((r) => r.isOpenNow);
    }

    res.json({
      success: true,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev,
      data: result,
    });
    // console.log(result);
    // console.log(`restaurants ${restaurants}`);
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/{slug}/details — Full restaurant public page
// ===============================================================================
// Purpose:
// - Serve the complete restaurant detail page for customers
//
// Includes:
// - Restaurant info
// - Categories
// - Menu items
// - Open/closed status
//
// Visibility rules:
// - Only public & active restaurants
//
// Real-world usage:
// - Customer restaurant page
// - Food ordering / browsing experience
//
// ===============================================================================

export const getRestaurantDetails = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({
      slug: req.params.slug,
      ...publicRestaurantFilter,
    })
      .populate("categories")
      .lean();

    if (!restaurant) return next(errorHandler(404, "not found"));

    const menu = await Menu.find({ restaurantId: restaurant._id })
      .populate("categoryId")
      .lean();

    res.json({
      success: true,
      data: {
        ...restaurant,
        isOpenNow: isRestaurantOpen(restaurant.openingHours),
        menu,
      },
    });
    // console.log(`restaurant ${restaurant}`);
    // console.log(`menu ${menu}`);
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/featured — Featured restaurants
// ===============================================================================
// Purpose:
// - Highlight curated restaurants
//
// Visibility:
// - Only public & active restaurants
//
// Supports:
// - Pagination
//
// Real-world usage:
// - Homepage sections
// - Marketing campaigns
//
// ===============================================================================

export const getFeaturedRestaurants = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const filter = {
      isFeatured: true,
      ...publicRestaurantFilter,
    };

    // total count
    const total = await Restaurant.countDocuments(filter);

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (pageNum < 1 || limitNum < 1) {
      throw errorHandler(400, "Invalid pagination values");
    }

    const pagination = paginate({
      page: pageNum,
      limit: limitNum,
      total,
    });

    // query
    const restaurant = await Restaurant.find(filter)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      ...pagination,
      data: restaurant.map((r) => ({
        ...r,
        isOpenNow: isRestaurantOpen(r.openingHours),
      })),
    });

    // console.log("restaurants:", restaurant.length);
    // console.log("total:", total);
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/trending — Trending restaurants
// ===============================================================================
// Purpose:
// - Highlight curated restaurants
//
// Visibility:
// - Only public & active restaurants
//
// Supports:
// - Pagination
//
// Real-world usage:
// - Homepage sections
// - Marketing campaigns
//
// ===============================================================================

export const getTrendingRestaurants = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const filter = { isTrending: true, ...publicRestaurantFilter };

    // total count
    const total = await Restaurant.countDocuments(filter);

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (pageNum < 1 || limitNum < 1) {
      throw errorHandler(400, "Invalid pagination values");
    }

    const pagination = paginate({
      page: pageNum,
      limit: limitNum,
      total,
    });

    // query
    const restaurant = await Restaurant.find(filter)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      ...pagination,
      data: restaurant.map((r) => ({
        ...r,
        isOpenNow: isRestaurantOpen(r.openingHours),
      })),
    });
    // console.log("restaurants:", restaurant.length);
    // console.log("total:", total);
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/me/summary — Admin restaurant summary
// ===============================================================================
// Purpose:
// - Provide quick metrics for admin dashboard
//
// Includes:
// - Menu count
// - Category count
// - Store manager count
//
// Who can access:
// - Admin only
//
// Real-world usage:
// - Admin dashboard widgets
//
// ===============================================================================

export const getAdminRestaurantSummary = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurantId;

    const [menuCount, categoryCount, storeManagerCount] = await Promise.all([
      Menu.countDocuments({ restaurantId, isActive: true }),
      Category.countDocuments({ restaurantId, isActive: true }),
      User.countDocuments({ role: "storeManager", restaurantId }),
    ]);

    res.json({
      success: true,
      data: {
        menuCount,
        categoryCount,
        storeManagerCount,
      },
    });
  } catch (err) {
    next(err);
  }
};
