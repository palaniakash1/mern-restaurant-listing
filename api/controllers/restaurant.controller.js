import Restaurant from '../models/restaurant.model.js';
import User from '../models/user.model.js';
import Category from '../models/category.model.js';
import { errorHandler } from '../utils/error.js';
import { geocodeAddress } from '../utils/geocode.js';
import { isRestaurantOpen } from '../utils/openNow.js';
import Menu from '../models/menu.model.js';
import { paginate } from '../utils/paginate.js';
import { publicRestaurantFilter } from '../utils/restaurantVisibility.js';

import { withTransaction } from '../utils/withTransaction.js';
import { diffObject } from '../utils/diff.js';
// import mongoose from 'mongoose';
import { logAudit } from '../utils/auditLogger.js';
import { getClientIp } from '../utils/controllerHelpers.js';
import { getOrFetch } from '../utils/redisCache.js';

// ===============================================================================
// 🔷 POST /api/restaurants — Create a new restaurant
// ===============================================================================

export const create = async (req, res, next) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next(errorHandler(400, 'Request body is missing'));
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
      adminId
    } = req.body;

    if (!name || !address || !contactNumber || !email) {
      return next(errorHandler(400, 'All required fields must be filled'));
    }

    if (!address?.city || !address?.addressLine1) {
      throw errorHandler(400, 'Invalid address');
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw errorHandler(400, 'Invalid email format');
    }

    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    let geoLocation;

    if (location?.lat !== undefined && location?.lng !== undefined) {
      geoLocation = {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      };
    } else if (location?.type === 'Point' && location?.coordinates) {
      geoLocation = location;
    } else {
      geoLocation = await geocodeAddress(address);
    }
    const forbiddenOnCreate = [
      'isFeatured',
      'isTrending',
      'status',
      'isActive'
    ];

    for (const field of forbiddenOnCreate) {
      if (field in req.body && req.user.role !== 'superAdmin') {
        throw errorHandler(403, `${field} cannot be set during creation`);
      }
    }
    const restaurant = await withTransaction(async (session) => {
      let baseSlug = slug;
      let counter = 1;

      while (true) {
        const existingRestaurant = await Restaurant.findOne({ slug: baseSlug }).session(session);
        if (!existingRestaurant) break;
        baseSlug = `${slug}-${counter++}`;
      }

      let assignedAdminId = req.user.id;
      let isPrimary = true;

      if (req.user.role === 'superAdmin' && adminId) {
        const adminExists = await User.findById(adminId).session(session);

        if (!adminExists || adminExists.role !== 'admin') {
          throw errorHandler(400, 'Invalid admin selected');
        }

        assignedAdminId = adminId;
      }

      if (req.user.role === 'admin') {
        const currentAdmin = await User.findById(req.user.id).session(session);
        isPrimary = !currentAdmin?.restaurantId && (!currentAdmin?.restaurantIds || currentAdmin.restaurantIds.length === 0);
      }

      const buildSearchText = (restaurant) =>
        [
          restaurant.name,
          restaurant.tagline,
          restaurant.address?.city,
          restaurant.address?.areaLocality
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

      const restaurantPayload = {
        name,
        tagline,
        description,
        slug: baseSlug,
        address: {
          ...address,
          location: geoLocation
        },
        openingHours,
        contactNumber,
        email,
        website,
        imageLogo,
        gallery,
        adminId: assignedAdminId
      };

      if (req.user.role === 'superAdmin') {
        restaurantPayload.isFeatured = isFeatured;
        restaurantPayload.isTrending = isTrending;
      }

      restaurantPayload.searchText = buildSearchText({
        name,
        tagline,
        address
      });

      const [createdRestaurant] = await Restaurant.create([restaurantPayload], {
        session
      });

      const userUpdate = {
        $addToSet: { restaurantIds: createdRestaurant._id }
      };
      if (isPrimary) {
        userUpdate.restaurantId = createdRestaurant._id;
      }

      await User.findByIdAndUpdate(
        assignedAdminId,
        userUpdate,
        { session }
      );

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: 'restaurant',
        entityId: createdRestaurant._id,
        action: 'CREATE',
        before: null,
        after: createdRestaurant,
        ipAddress: getClientIp(req)
      });

      return createdRestaurant;
    });

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully',
      data: restaurant
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(409, 'Restaurant slug already exists'));
    }

    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/all — Get all restaurants (internal view)
// ===============================================================================

export const getAllRestaurants = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, q } = req.query;
    const sortDirection = req.query.order === 'asc' ? 1 : -1;

    const filter = {};
    let projection = {};
    let sort = { createdAt: sortDirection };

    if (q) {
      filter.$text = { $search: q };
      projection = { score: { $meta: 'textScore' } };
      sort = { score: { $meta: 'textScore' } };
    }

    const total = await Restaurant.countDocuments(filter);

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (pageNum < 1 || limitNum < 1) {
      throw errorHandler(400, 'Invalid pagination values');
    }

    const pagination = paginate({
      page: pageNum,
      limit: limitNum,
      total
    });

    const restaurants = await Restaurant.find(filter, projection)
      .select('-__v')
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort(sort)
      .lean();

    res.status(200).json({
      success: true,
      ...pagination,
      data: restaurants
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/id/{id} — Get restaurant by ID
// ===============================================================================

export const getRestaurantById = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select('-__v');

    if (!restaurant) {
      return next(errorHandler(404, 'Restaurant not found'));
    }

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/slug/{slug} — Get restaurant by slug
// ===============================================================================

export const getRestaurantBySlug = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({
      slug: req.params.slug,
      ...publicRestaurantFilter
    }).select('-__v');

    if (!restaurant) {
      return next(errorHandler(404, 'Restaurant not found'));
    }

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/restaurants/id/{id}/status — Update restaurant status
// ===============================================================================

export const updateRestaurantStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ['published', 'draft', 'blocked'];

    if (!allowedStatuses.includes(status))
      throw errorHandler(400, 'Invalid restaurant status');

    const result = await withTransaction(async (session) => {
      const restaurant = await Restaurant.findById(req.params.id)
        .session(session)
        .lean();

      if (!restaurant) {
        throw errorHandler(404, 'Restaurant not found');
      }

      if (restaurant.status === status) {
        throw errorHandler(400, `Restaurant already in '${status}' status`);
      }

      const isActive = status === 'published';

      const updated = await Restaurant.findByIdAndUpdate(
        req.params.id,
        {
          status,
          isActive
        },
        { new: true, session }
      ).lean();

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: 'restaurant',
        entityId: updated._id,
        action: 'STATUS_CHANGE',
        before: { status: restaurant.status },
        after: { status },
        ipAddress: getClientIp(req)
      });

      return updated;
    });

    res.status(200).json({
      success: true,
      message: `Restaurant status updated to '${result.status}'`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/restaurants/id/{id} — Update restaurant details
// ===============================================================================

export const updateRestaurant = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const oldRestaurant = await Restaurant.findById(req.params.id)
        .session(session)
        .lean();

      if (!oldRestaurant) {
        throw errorHandler(404, 'Restaurant not found');
      }

      const buildSearchText = (restaurant) =>
        [
          restaurant.name,
          restaurant.tagline,
          restaurant.address?.city,
          restaurant.address?.areaLocality
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

      const forbiddenFields = [
        'slug',
        'status',
        'isActive',
        'isFeatured',
        'isTrending',
        'adminId'
      ];

      for (const field of forbiddenFields) {
        if (field in req.body) {
          throw errorHandler(403, `${field} cannot be updated`);
        }
      }

      const allowedUpdates = [
        'name',
        'tagline',
        'description',
        'categories',
        'address',
        'openingHours',
        'contactNumber',
        'email',
        'website',
        'imageLogo',
        'gallery'
      ];

      const updates = {};

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (!Object.keys(updates).length) {
        throw errorHandler(400, 'No valid fields provided');
      }

      if (updates.address) {
        const geo = await geocodeAddress(updates.address);
        updates.address.location = geo;
      }

      if (updates.categories) {
        const validCategories = await Category.countDocuments({
          _id: { $in: updates.categories }
        });

        if (validCategories !== updates.categories.length) {
          throw errorHandler(400, 'Invalid category IDs');
        }
      }

      updates.searchText = buildSearchText({
        name: updates.name ?? oldRestaurant.name,
        tagline: updates.tagline ?? oldRestaurant.tagline,
        address: updates.address ?? oldRestaurant.address
      });

      const updatedRestaurant = await Restaurant.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, session }
      ).lean();

      if (!updatedRestaurant) {
        throw errorHandler(404, 'Restaurant not found after update');
      }

      const diff = diffObject(oldRestaurant, updatedRestaurant, allowedUpdates);

      if (diff && Object.keys(diff).length) {
        await logAudit({
          actorId: req.user.id,
          actorRole: req.user.role,
          entityType: 'restaurant',
          entityId: updatedRestaurant._id,
          action: 'UPDATE',
          before: diff,
          after: null,
          ipAddress: getClientIp(req)
        });
      }

      return updatedRestaurant;
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant Updated Successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 DELETE /api/restaurants/id/{id} — Soft delete restaurant
// ===============================================================================

export const deleteRestaurant = async (req, res, next) => {
  try {
    let deletedRestaurantId;
    let softDeleted;
    await withTransaction(async (session) => {
      const restaurant = await Restaurant.findById(req.params.id)
        .session(session)
        .lean();

      if (!restaurant) {
        throw errorHandler(404, 'Restaurant not found');
      }

      deletedRestaurantId = restaurant._id;

      if (!restaurant.isActive && restaurant.status === 'blocked') {
        throw errorHandler(400, 'Restaurant already deleted');
      }

      softDeleted = await Restaurant.findByIdAndUpdate(
        req.params.id,
        { status: 'blocked', isActive: false },
        { new: true, session }
      ).lean();

      if (restaurant.adminId) {
        await User.findByIdAndUpdate(
          restaurant.adminId,
          {
            $pull: { restaurantIds: restaurant._id },
            $unset: { restaurantId: restaurant._id }
          },
          { session }
        );
      }

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: 'restaurant',
        entityId: restaurant._id,
        action: 'DELETE',
        before: deletedRestaurantId,
        after: { status: 'blocked', isActive: false },
        ipAddress: getClientIp(req)
      });
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant deleted successfully',
      data: softDeleted
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/restaurants/id/{id}/restore — Restore restaurant
// ===============================================================================

export const restoreRestaurant = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const restaurant = await Restaurant.findById(req.params.id)
        .setOptions({ includeInactive: true })
        .session(session)
        .lean();

      if (!restaurant) {
        throw errorHandler(404, 'Restaurant not found');
      }

      if (restaurant.status !== 'blocked') {
        throw errorHandler(400, 'Only blocked restaurants can be restored');
      }

      const restored = await Restaurant.findByIdAndUpdate(
        req.params.id,
        {
          status: 'draft',
          isActive: true
        },
        { new: true, session }
      )
        .setOptions({ includeInactive: true })
        .lean();

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: 'restaurant',
        entityId: restaurant._id,
        action: 'RESTORE',
        before: { status: 'blocked', isActive: false },
        after: { status: 'draft', isActive: false },
        ipAddress: getClientIp(req)
      });

      return restored;
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant restored successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 PATCH /api/restaurants/id/{id}/admin — Reassign ownership
// ===============================================================================

export const reassignRestaurantAdmin = async (req, res, next) => {
  try {
    const result = await withTransaction(async (session) => {
      const { id } = req.params;
      const { newAdminId } = req.body;

      if (!newAdminId) {
        throw errorHandler(400, 'New admin ID is required');
      }
      const restaurant = await Restaurant.findById(id).session(session).lean();

      if (!restaurant) {
        throw errorHandler(404, 'Restaurant Not Found');
      }

      const oldAdmin = await User.findById(restaurant.adminId).session(session);
      if (!oldAdmin) {
        throw errorHandler(500, 'Original admin not found');
      }

      const newAdmin = await User.findById(newAdminId).session(session);
      if (!newAdmin || newAdmin.role !== 'admin') {
        throw errorHandler(400, 'Invalid admin selected');
      }

      await User.findByIdAndUpdate(
        oldAdmin._id,
        {
          $pull: { restaurantIds: restaurant._id }
        },
        { session }
      );

      if (oldAdmin.restaurantId?.toString() === id) {
        const remainingRestaurants = oldAdmin.restaurantIds?.filter(
          (rid) => rid.toString() !== id
        ) || [];
        await User.findByIdAndUpdate(
          oldAdmin._id,
          {
            restaurantId: remainingRestaurants.length > 0 ? remainingRestaurants[0] : null
          },
          { session }
        );
      }

      await Restaurant.findByIdAndUpdate(
        id,
        {
          adminId: newAdmin._id
        },
        { session }
      );

      const newAdminHasRestaurants = newAdmin.restaurantIds && newAdmin.restaurantIds.length > 0;
      await User.findByIdAndUpdate(
        newAdmin._id,
        {
          $addToSet: { restaurantIds: id },
          ...(newAdminHasRestaurants ? {} : { restaurantId: id })
        },
        { session }
      );

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: 'restaurant',
        entityId: restaurant._id,
        action: 'REASSIGN',
        before: { adminId: restaurant.adminId },
        after: { adminId: newAdmin._id },
        ipAddress: getClientIp(req)
      });

      return {
        restaurantId: restaurant._id,
        oldAdminId: restaurant.adminId,
        newAdminId: newAdmin._id
      };
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant ownership reassigned successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/me — Get logged-in admin's restaurant (single/first)
// ===============================================================================

export const getMyRestaurant = async (req, res, next) => {
  try {
    if (!req.user.restaurantId && (!req.user.restaurantIds || req.user.restaurantIds.length === 0)) {
      return next(errorHandler(404, 'No restaurant assigned to this admin'));
    }

    const restaurantId = req.user.restaurantId || req.user.restaurantIds[0];

    const restaurant = await Restaurant.findById(restaurantId).select('-__v');

    if (!restaurant) {
      return next(errorHandler(404, 'Restaurant not found'));
    }

    if (restaurant.adminId.toString() !== req.user.id) {
      return next(
        errorHandler(403, 'Ownership mismatch detected. Contact superAdmin.')
      );
    }

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/me/all — Get all restaurants for logged-in admin
// ===============================================================================

export const getMyRestaurants = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    let restaurantIds = req.user.restaurantIds;
    if (!restaurantIds || restaurantIds.length === 0) {
      if (req.user.restaurantId) {
        restaurantIds = [req.user.restaurantId];
      } else {
        return res.status(200).json({
          success: true,
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
          data: []
        });
      }
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (pageNum < 1 || limitNum < 1) {
      return next(errorHandler(400, 'Invalid pagination values'));
    }

    const filter = { _id: { $in: restaurantIds }, adminId: req.user.id };
    const total = await Restaurant.countDocuments(filter);

    const pagination = paginate({
      page: pageNum,
      limit: limitNum,
      total
    });

    const restaurants = await Restaurant.find(filter)
      .select('-__v')
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      ...pagination,
      data: restaurants
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/nearby — Nearby restaurants
// ===============================================================================

export const getNearByRestaurants = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (lat === undefined || lng === undefined) {
      return next(errorHandler(400, 'lat and lng are required'));
    }

    const restaurants = await Restaurant.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          distanceField: 'distance',
          maxDistance: parseInt(radius),
          spherical: true,
          query: publicRestaurantFilter
        }
      },
      { $sort: { distance: 1 } },
      { $limit: 20 }
    ]);

    const enriched = restaurants.map((r) => ({
      ...r,
      isOpenNow: isRestaurantOpen(r.openingHours)
    }));

    res.json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants — Public restaurant listing
// ===============================================================================

export const listRestaurants = async (req, res, next) => {
  try {
    const {
      city,
      categories,
      isFeatured,
      isTrending,
      isOpenNow,
      q,
      sortBy,
      page = 1,
      limit = 10
    } = req.query;

    const filter = { ...publicRestaurantFilter };
    let projection = {};
    let sort = { createdAt: -1 };

    if (city) filter['address.city'] = city;
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';
    if (isTrending !== undefined) filter.isTrending = isTrending === 'true';

    if (categories) {
      const categoryArray = Array.isArray(categories)
        ? categories
        : categories.split(',');

      filter.categories = { $in: categoryArray };
    }

    if (q) {
      filter.$text = { $search: q };
      projection = { score: { $meta: 'textScore' } };
      sort = { score: { $meta: 'textScore' } };
    } else {
      if (sortBy === 'rating') sort = { rating: -1 };
      if (sortBy === 'name') sort = { name: 1 };
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (pageNum < 1 || limitNum < 1) {
      throw errorHandler(400, 'Invalid pagination values');
    }

    const total = await Restaurant.countDocuments(filter);
    const pagination = paginate({
      page: pageNum,
      limit: limitNum,
      total
    });

    const restaurants = await Restaurant.find(filter, projection)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort(sort)
      .lean();

    let result = restaurants.map((r) => ({
      ...r,
      isOpenNow: isRestaurantOpen(r.openingHours)
    }));

    if (isOpenNow === 'true') {
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
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/{slug}/details — Full restaurant details
// ===============================================================================

export const getRestaurantDetails = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({
      slug: req.params.slug,
      ...publicRestaurantFilter
    })
      .populate('categories')
      .lean();

    if (!restaurant) return next(errorHandler(404, 'not found'));

    const menu = await Menu.find({ restaurantId: restaurant._id })
      .populate('categoryId')
      .lean();

    res.json({
      success: true,
      data: {
        ...restaurant,
        isOpenNow: isRestaurantOpen(restaurant.openingHours),
        menu
      }
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/featured — Featured restaurants (with caching)
// ===============================================================================

export const getFeaturedRestaurants = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (pageNum < 1 || limitNum < 1) {
      throw errorHandler(400, 'Invalid pagination values');
    }

    // Use Redis cache for public endpoint
    const cacheKey = `restaurants:featured:${pageNum}:${limitNum}`;
    const cachedData = await getOrFetch(
      cacheKey,
      async () => {
        const filter = {
          isFeatured: true,
          ...publicRestaurantFilter
        };

        const total = await Restaurant.countDocuments(filter);
        const pagination = paginate({ page: pageNum, limit: limitNum, total });

        const restaurant = await Restaurant.find(filter)
          .skip(pagination.skip)
          .limit(pagination.limit)
          .sort({ createdAt: -1 })
          .lean();

        return {
          ...pagination,
          data: restaurant.map((r) => ({
            ...r,
            isOpenNow: isRestaurantOpen(r.openingHours)
          }))
        };
      },
      300 // Cache for 5 minutes
    );

    res.json({
      success: true,
      ...cachedData
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/trending — Trending restaurants
// ===============================================================================

export const getTrendingRestaurants = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const filter = { isTrending: true, ...publicRestaurantFilter };

    const total = await Restaurant.countDocuments(filter);

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (pageNum < 1 || limitNum < 1) {
      throw errorHandler(400, 'Invalid pagination values');
    }

    const pagination = paginate({
      page: pageNum,
      limit: limitNum,
      total
    });

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
        isOpenNow: isRestaurantOpen(r.openingHours)
      }))
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/me/summary — Admin restaurant summary
// ===============================================================================

export const getAdminRestaurantSummary = async (req, res, next) => {
  try {
    const { restaurantId } = req.query;

    let targetRestaurantIds;
    if (restaurantId) {
      targetRestaurantIds = [restaurantId];
    } else {
      targetRestaurantIds = req.user.restaurantIds?.length
        ? req.user.restaurantIds
        : req.user.restaurantId
          ? [req.user.restaurantId]
          : [];
    }

    if (targetRestaurantIds.length === 0) {
      return res.json({
        success: true,
        data: {
          menuCount: 0,
          categoryCount: 0,
          storeManagerCount: 0
        }
      });
    }

    const [menuCount, categoryCount, storeManagerCount] = await Promise.all([
      Menu.countDocuments({ restaurantId: { $in: targetRestaurantIds }, isActive: true }),
      Category.countDocuments({ restaurantId: { $in: targetRestaurantIds }, isActive: true }),
      User.countDocuments({ role: 'storeManager', restaurantId: { $in: targetRestaurantIds } })
    ]);

    res.json({
      success: true,
      data: {
        menuCount,
        categoryCount,
        storeManagerCount
      }
    });
  } catch (err) {
    next(err);
  }
};

// ===============================================================================
// 🔷 PATCH /api/restaurants/me/primary/:restaurantId — Set primary restaurant
// ===============================================================================

export const setPrimaryRestaurant = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId).lean();

    if (!restaurant) {
      return next(errorHandler(404, 'Restaurant not found'));
    }

    const isOwner = restaurant.adminId.toString() === req.user.id;
    const isSuperAdmin = req.user.role === 'superAdmin';

    if (!isOwner && !isSuperAdmin) {
      return next(errorHandler(403, 'You do not have permission to manage this restaurant'));
    }

    const userBelongsToRestaurant = req.user.restaurantIds?.some(
      (id) => id.toString() === restaurantId
    ) || req.user.restaurantId?.toString() === restaurantId;

    if (!userBelongsToRestaurant && !isSuperAdmin) {
      return next(errorHandler(403, 'Restaurant not assigned to this user'));
    }

    await User.findByIdAndUpdate(req.user.id, {
      restaurantId: restaurant._id
    });

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'restaurant',
      entityId: restaurant._id,
      action: 'SET_PRIMARY',
      before: { primaryRestaurantId: req.user.restaurantId },
      after: { primaryRestaurantId: restaurant._id },
      ipAddress: getClientIp(req)
    });

    res.status(200).json({
      success: true,
      message: 'Primary restaurant updated successfully',
      data: { primaryRestaurantId: restaurant._id }
    });
  } catch (error) {
    next(error);
  }
};

// ===============================================================================
// 🔷 GET /api/restaurants/me/:restaurantId — Get specific restaurant for admin
// ===============================================================================

export const getMyRestaurantById = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId).select('-__v');

    if (!restaurant) {
      return next(errorHandler(404, 'Restaurant not found'));
    }

    const isOwner = restaurant.adminId.toString() === req.user.id;
    const isSuperAdmin = req.user.role === 'superAdmin';

    if (!isOwner && !isSuperAdmin) {
      return next(errorHandler(403, 'You do not have permission to view this restaurant'));
    }

    const userBelongsToRestaurant = req.user.restaurantIds?.some(
      (id) => id.toString() === restaurantId
    ) || req.user.restaurantId?.toString() === restaurantId;

    if (!userBelongsToRestaurant && !isSuperAdmin) {
      return next(errorHandler(403, 'Restaurant not assigned to this user'));
    }

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};
