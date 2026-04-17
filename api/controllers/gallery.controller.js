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

    const restaurants = await Restaurant.find(filter, { gallery: 1, bannerImage: 1, imageLogo: 1, name: 1, slug: 1 })
      .lean();

    const allImages = [];
    restaurants.forEach((restaurant) => {
      if (restaurant.bannerImage) {
        allImages.push({
          url: restaurant.bannerImage,
          source: 'restaurant',
          imageType: 'banner',
          sourceId: restaurant._id,
          sourceName: restaurant.name,
          sourceSlug: restaurant.slug
        });
      }
      if (restaurant.gallery && restaurant.gallery.length > 0) {
        restaurant.gallery.forEach((url) => {
          allImages.push({
            url,
            source: 'restaurant',
            imageType: 'gallery',
            sourceId: restaurant._id,
            sourceName: restaurant.name,
            sourceSlug: restaurant.slug
          });
        });
      }
      if (!restaurant.bannerImage && (!restaurant.gallery || restaurant.gallery.length === 0) && restaurant.imageLogo) {
        allImages.push({
          url: restaurant.imageLogo,
          source: 'restaurant',
          imageType: 'logo',
          sourceId: restaurant._id,
          sourceName: restaurant.name,
          sourceSlug: restaurant.slug
        });
      }
    });

    const total = allImages.length;
    const pagination = paginate({ page: pageNum, limit: limitNum, total });
    const paginatedImages = allImages.slice(pagination.skip, pagination.skip + pagination.limit);

    res.json({
      success: true,
      page: pagination.page,
      pages: pagination.pages,
      total,
      data: paginatedImages
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

    const filter = {
      status: 'published',
      isActive: true
    };

    const menus = await Menu.find(filter, { items: 1, categoryId: 1, restaurantId: 1 })
      .populate('categoryId', 'name')
      .populate('restaurantId', 'name slug')
      .lean();

    const allImages = [];
    menus.forEach((menu) => {
      (menu.items || []).forEach((item) => {
        if (item.image && item.isActive !== false) {
          allImages.push({
            url: item.image,
            source: 'menu',
            sourceId: item._id,
            sourceName: item.name,
            menuName: menu.categoryId?.name || 'Menu',
            restaurantName: menu.restaurantId?.name,
            restaurantSlug: menu.restaurantId?.slug
          });
        }
      });
    });

    const total = allImages.length;
    const pagination = paginate({ page: pageNum, limit: limitNum, total });
    const paginatedImages = allImages.slice(pagination.skip, pagination.skip + pagination.limit);

    res.json({
      success: true,
      page: pagination.page,
      pages: pagination.pages,
      total,
      data: paginatedImages
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

    const reviews = await Review.find(filter, { images: 1, userId: 1, restaurantId: 1, rating: 1 })
      .populate('userId', 'userName profilePicture')
      .populate('restaurantId', 'name slug')
      .lean();

    const allImages = [];
    reviews.forEach((review) => {
      (review.images || []).forEach((url) => {
        allImages.push({
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

    const total = allImages.length;
    const pagination = paginate({ page: pageNum, limit: limitNum, total });
    const paginatedImages = allImages.slice(pagination.skip, pagination.skip + pagination.limit);

    res.json({
      success: true,
      page: pagination.page,
      pages: pagination.pages,
      total,
      data: paginatedImages
    });
  } catch (error) {
    next(error);
  }
};
