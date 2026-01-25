import Restaurant from "../models/restaurant.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";
import { geocodeAddress } from "../utils/geocode.js";
import { isRestaurantOpen } from "../utils/openNow.js";
import Menu from "../models/menu.model.js";
import { paginate } from "../utils/paginate.js";
import { publicRestaurantFilter } from "../utils/restaurantVisibility.js";
import AuditLog from "../models/auditLog.model.js";
import { withTransaction } from "../utils/withTransaction.js";
import { diffObject } from "../utils/diff.js";
import mongoose from "mongoose";

// ===============================================
// create a new restaurant
// ===============================================
export const create = async (req, res, next) => {
  try {
    // BASIC VALIDATIONS (NO DB MUTATION)

    if (!req.body || Object.keys(req.body).length === 0) {
      return next(errorHandler(400, "Request body is missing"));
    }

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return next(
        errorHandler(403, "You are not allowed to create a restaurant"),
      );
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

    // Slug generation (clean)
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    let geoLocation;

    // ✅ CASE A: frontend already sent lat/lng
    if (location?.lat && location?.lng) {
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
      //  Slug uniqueness check (DB dependent)
      const slugExists = await Restaurant.findOne({ slug }).session(session);
      if (slugExists) {
        throw errorHandler(409, "Restaurant with this name already exists");
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

      // 🏗 Create restaurant
      const [createdRestaurant] = await Restaurant.create(
        [
          {
            name,
            tagline,
            description,
            slug,
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
            isFeatured,
            isTrending,
            adminId: assignedAdminId,
          },
        ],
        { session },
      );

      // 🔗 Link restaurant to admin
      await User.findByIdAndUpdate(
        assignedAdminId,
        { restaurantId: createdRestaurant._id },
        { session },
      );

      // 🧾 Audit log
      await AuditLog.create(
        [
          {
            actorId: req.user.id,
            actorRole: req.user.role,
            entityType: "restaurant",
            entityId: createdRestaurant._id,
            action: "CREATE",
            before: null,
            after: createdRestaurant,
            ipAddress: req.headers["x-forwarded-for"] || req.ip,
          },
        ],
        { session },
      );

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

// =================================================================
// get all restaurants
// =================================================================
export const getAllRestaurants = async (req, res, next) => {
  try {
    // only accessible for superAdmin - role gaurd
    if (req.user.role !== "superAdmin") {
      return next(
        errorHandler(403, "you are not allowed to access all the restaurants"),
      );
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    const searchFilter = req.query.searchTerm
      ? {
          $or: [
            { name: { $regex: req.query.searchTerm, $options: "i" } },
            { slug: { $regex: req.query.searchTerm, $options: "i" } },
            { "address.city": { $regex: req.query.searchTerm, $options: "i" } },
            {
              "address.areaLocality": {
                $regex: req.query.searchTerm,
                $options: "i",
              },
            },
          ],
        }
      : {};
    const restaurants = await Restaurant.find(searchFilter)
      .select("-__v")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Restaurant.countDocuments(searchFilter);

    res.status(200).json({
      success: true,
      message: "showing all restaurants",
      page,
      limit,
      total,
      data: restaurants,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// get restaurant by id (admin / superAdmin)
// ===============================================================================
export const getRestaurantById = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select("-__v");

    if (!restaurant) {
      return next(errorHandler(404, "Restaurant not found"));
    }

    res.status(200).json({
      success: true,
      message: `Showing your restaurant name: ${restaurant.name}`,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// get restaurant by slug (admin / superAdmin)
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
      message: `showing restaurant using slug: ${restaurant.slug}`,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================================
// PUBLISH RESTAURANT (SUPER ADMIN ONLY)
// ======================================================================
// PUT /api/restaurants/:id/publish

export const publishRestaurant = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      if (req.user.role !== "superAdmin") {
        throw errorHandler(403, "Only superAdmin can publish restaurants");
      }
      const restaurant = await Restaurant.findById(req.params.id)
        .session(session)
        .lean();

      if (!restaurant) {
        throw errorHandler(404, "Restaurant not found");
      }
      if (restaurant.status === "published") {
        throw errorHandler(400, "Restaurant already published");
      }

      const updated = await Restaurant.findByIdAndUpdate(
        req.params.id,
        { status: "published", isActive: true },
        { new: true, session },
      ).lean();

      await AuditLog.create(
        [
          {
            actorId: req.user.id,
            actorRole: req.user.role,
            entityType: "restaurant",
            entityId: updated._id,
            action: "STATUS_CHANGE",
            before: { status: restaurant.status },
            after: { status: updated.status },
            ipAddress: req.headers["x-forwarded-for"] || req.ip,
          },
        ],
        { session },
      );

      return updated;
    });

    res.json({
      success: true,
      message: "Restaurant published successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================================
// BLOCK RESTAURANT (SUPER ADMIN ONLY)
// ======================================================================
// PUT /api/restaurants/:id/block
export const blockRestaurant = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      if (req.user.role !== "superAdmin") {
        throw errorHandler(403, "Only superAdmin can block restaurants");
      }

      const restaurant = await Restaurant.findById(req.params.id)
        .session(session)
        .lean();

      if (!restaurant) {
        throw errorHandler(404, "Restaurant not found");
      }

      if (restaurant.status === "blocked") {
        throw errorHandler(400, "Restaurant is already blocked");
      }

      const updated = await Restaurant.findByIdAndUpdate(
        req.params.id,
        { status: "blocked", isActive: false },
        { new: true, session },
      ).lean();

      await AuditLog.create(
        [
          {
            actorId: req.user.id,
            actorRole: req.user.role,
            entityType: "restaurant",
            entityId: updated._id,
            action: "STATUS_CHANGE",
            before: { status: restaurant.status },
            after: { status: updated.status },
            ipAddress: req.headers["x-forwarded-for"] || req.ip,
          },
        ],
        { session },
      );
      return updated;
    });

    res.json({
      success: true,
      message: "Restaurant blocked successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// update Restaurant using restaurantID and userID + superAdmin
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
      if (Object.keys(diff).length) {
        await AuditLog.create(
          [
            {
              actorId: req.user.id,
              actorRole: req.user.role,
              entityType: "restaurant",
              entityId: updatedRestaurant._id,
              action: "UPDATE",
              before: diff,
              after: null,
              ipAddress: req.headers["x-forwarded-for"] || req.ip,
            },
          ],
          { session },
        );
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
// delete Restaurant using restaurantID and userID + superAdmin
// ===============================================================================
export const deleteRestaurant = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Fetch snapshot BEFORE deletion
    const restaurant = await Restaurant.findById(req.params.id)
      .session(session)
      .lean();
    if (!restaurant) {
      return next(errorHandler(404, "Restaurant not found"));
    }

    // remove restaurant reference from admin
    await User.findByIdAndUpdate(
      restaurant.adminId,
      {
        $unset: { restaurantId: "" },
      },
      { session },
    );

    await Menu.deleteMany({ restaurantId: restaurant._id }, { session });

    // Delete restaurant
    await Restaurant.findByIdAndDelete(req.params.id, { session });

    // AUDIT LOG (DELETE)
    await AuditLog.create(
      [
        {
          actorId: req.user.id,
          actorRole: req.user.role,
          entityType: "restaurant",
          entityId: restaurant._id,
          action: "DELETE",
          before: restaurant,
          after: null,
          ipAddress: req.headers["x-forwarded-for"] || req.ip,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Restaurant Deleted Successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// ===============================================================================
// reassign restaurant admin (SUPER ADMIN ONLY)
// ===============================================================================

export const reassignRestaurantAdmin = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      // only accessible for superAdmin - role gaurd
      if (req.user.role !== "superAdmin") {
        throw errorHandler(403, "Only superAdmin can Reassign the ownership");
      }

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
      const newAdmin = await User.findById(newAdminId).session(session);

      // const newAdmin = await User.findById(newAdminId);
      if (!newAdmin || newAdmin.role !== "admin") {
        throw errorHandler(400, `Invalid admin selected`);
      }

      // check if admin already exists
      // if (newAdmin.restaurantId) {
      //   return next(
      //     errorHandler(403, `Selected admin already owns a restaurant`),
      //   );
      // }

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
      await AuditLog.create(
        [
          {
            actorId: req.user.id,
            actorRole: req.user.role,
            entityType: "restaurant",
            entityId: restaurant._id,
            action: "STATUS_CHANGE",
            before: { adminId: restaurant.adminId },
            after: { adminId: newAdmin._id },
            ipAddress: req.headers["x-forwarded-for"] || req.ip,
          },
        ],
        { session },
      );

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
// get logged-in admin restaurant (ADMIN ONLY)
// ===============================================================================

export const getMyRestaurant = async (req, res, next) => {
  try {
    // role guard
    if (req.user.role !== "admin") {
      return next(errorHandler(403, "Only admin can access this resource"));
    }

    const restaurant = await Restaurant.findOne({
      adminId: req.user.id,
    }).select("-__v");

    if (!restaurant) {
      return next(errorHandler(404, "No restaurant assigned to this admin"));
    }

    res.status(200).json({
      success: true,
      message: `viewing your restaurant - restaurant name ${restaurant.name}`,
      data: restaurant,
    });
    // console.log(`restaurant: ${restaurant}`);
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// get nearby restaurants
// ===============================================================================

// GET /api/restaurants/nearby
// lat   (required)
// lng   (required)
// radius (optional, meters – default 5000)

// 🧪 Postman Test
// GET /api/restaurants/nearby?lat=51.5136&lng=-0.1319&radius=3000

// ===============================================================================
export const getNearByRestaurants = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      return next(errorHandler(400, "lat and long are required"));
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
//  restaurant filter
// ===============================================================================
// GET / api / restaurants;

// Supported Filters
// city;
// category;
// isFeatured;
// isTrending;
// openNow;
// page;
// limit;

// ===============================================================================

//🧪 Postman Test API ENDPOINTS
//
// GET /api/restaurants?city=London
// GET /api/restaurants?isFeatured=true
// GET /api/restaurants?openNow=true
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
      search,
      sortBy,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = { ...publicRestaurantFilter };

    if (city) filter["address.city"] = city;
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";
    if (isTrending !== undefined) filter.isTrending = isTrending === "true";
    if (categories) {
      const categoryArray = Array.isArray(categories)
        ? categories
        : categories.split(",");

      filter.categories = { $in: categoryArray };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { "address.areaLocality": { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
      ];
    }

    const total = await Restaurant.countDocuments(filter);
    const pagination = paginate({
      page,
      limit,
      total,
    });

    let sort = { createdAt: -1 };
    if (sortBy === "rating") sort = { rating: -1 };
    if (sortBy === "name") sort = { name: 1 };

    const restaurants = await Restaurant.find(filter)
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
//  RESTAURANT FULL PAGE
// ===============================================================================

// 📌 Route
// GET /api/restaurants/:slug/details

export const getRestaurantDetails = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({
      slug: req.params.slug,
      ...publicRestaurantFilter,
    })
      .populate("categories")
      .lean();

    if (!restaurant) return next(errorHandler(404, "not found"));

    const menu = await Menu.find({ restaurantId: restaurant._id }).populate(
      "categoryId",
    );

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

// ======================================================================
// FEATURED / TRENDING APIs
// ======================================================================

// ======================================================================

// 📌 Routes
// GET /api/restaurants/featured
// GET /api/restaurants/trending

// ======================================================================

export const getFeaturedRestaurants = async (req, res, next) => {
  try {
    const filter = {
      isFeatured: true,
      ...publicRestaurantFilter,
    };
    const restaurant = await Restaurant.find(filter).limit(10).lean();
    const total = await Restaurant.countDocuments(filter);

    res.json({
      success: true,
      total,
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

export const getTrendingRestaurants = async (req, res, next) => {
  try {
    const filter = { isTrending: true, ...publicRestaurantFilter };
    const restaurant = await Restaurant.find(filter).limit(10).lean();

    const total = await Restaurant.countDocuments(filter);

    res.json({
      success: true,
      total,
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
