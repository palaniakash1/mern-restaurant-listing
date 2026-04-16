import Restaurant from '../models/restaurant.model.js';
import Menu from '../models/menu.model.js';
import Review from '../models/review.model.js';
import { errorHandler } from '../utils/error.js';
import { paginate } from '../utils/paginate.js';
import { publicRestaurantFilter } from '../utils/restaurantVisibility.js';

export const getGalleryRestaurantImages = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (pageNum < 1 || limitNum < 1) {
      throw errorHandler(400, 'Invalid pagination values');
    }

    const filter = { ...publicRestaurantFilter };
    filter.gallery = { $exists: true, $ne: [], $not: { $size: 0 } };

    const total = await Restaurant.countDocuments(filter);
    const pagination = paginate({ page: pageNum, limit: limitNum, total });

    const restaurants = await Restaurant.find(filter, { gallery: 1, name: 1, slug: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const images = [];
    restaurants.forEach((restaurant) => {
      (restaurant.gallery || []).forEach((url) => {
        images.push({
          url,
          source: 'restaurant',
          sourceId: restaurant._id,
          sourceName: restaurant.name,
          sourceSlug: restaurant.slug
        });
      });
    });

    res.json({
      success: true,
      page: pagination.page,
      pages: pagination.pages,
      total,
      data: images
    });
  } catch (error) {
    next(error);
  }
};

export const getGalleryMenuImages = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (pageNum < 1 || limitNum < 1) {
      throw errorHandler(400, 'Invalid pagination values');
    }

    const filter = { status: 'active', 'items.image': { $exists: true, $ne: '' } };
    const total = await Menu.countDocuments(filter);
    const pagination = paginate({ page: pageNum, limit: limitNum, total });

    const menus = await Menu.find(filter, { items: 1, category: 1, restaurantId: 1 })
      .populate('restaurantId', 'name slug')
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const images = [];
    menus.forEach((menu) => {
      (menu.items || []).forEach((item) => {
        if (item.image && item.isActive !== false) {
          images.push({
            url: item.image,
            source: 'menu',
            sourceId: item._id,
            sourceName: item.name,
            menuName: menu.category || 'Menu',
            restaurantName: menu.restaurantId?.name,
            restaurantSlug: menu.restaurantId?.slug
          });
        }
      });
    });

    res.json({
      success: true,
      page: pagination.page,
      pages: pagination.pages,
      total,
      data: images
    });
  } catch (error) {
    next(error);
  }
};

export const getGalleryReviewImages = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (pageNum < 1 || limitNum < 1) {
      throw errorHandler(400, 'Invalid pagination values');
    }

    const filter = {
      isActive: true,
      isDeleted: { $ne: true },
      images: { $exists: true, $ne: [], $not: { $size: 0 } }
    };

    const total = await Review.countDocuments(filter);
    const pagination = paginate({ page: pageNum, limit: limitNum, total });

    const reviews = await Review.find(filter, { images: 1, userId: 1, restaurantId: 1, rating: 1 })
      .populate('userId', 'userName profilePicture')
      .populate('restaurantId', 'name slug')
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const images = [];
    reviews.forEach((review) => {
      (review.images || []).forEach((url) => {
        images.push({
          url,
          source: 'review',
          sourceId: review._id,
          userName: review.userId?.userName,
          userAvatar: review.userId?.profilePicture,
          rating: review.rating,
          restaurantName: review.restaurantId?.name,
          restaurantSlug: review.restaurantId?.slug
        });
      });
    });

    res.json({
      success: true,
      page: pagination.page,
      pages: pagination.pages,
      total,
      data: images
    });
  } catch (error) {
    next(error);
  }
};
