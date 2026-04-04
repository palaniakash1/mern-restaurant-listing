import mongoose from 'mongoose';
import Review from '../models/review.model.js';
import Restaurant from '../models/restaurant.model.js';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';
import { paginate } from '../utils/paginate.js';
import { withTransaction } from '../utils/withTransaction.js';
import { logAudit } from '../utils/auditLogger.js';
import { logger } from '../utils/logger.js';

import { isValidObjectId, normalizeIp } from '../utils/controllerHelpers.js';
import { getOrFetch, invalidatePattern } from '../utils/redisCache.js';

const recomputeRestaurantRating = async (restaurantId, session = null) => {
  const stats = await Review.aggregate([
    {
      $match: {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        isActive: true
      }
    },
    {
      $group: {
        _id: '$restaurantId',
        average: { $avg: '$rating' },
        total: { $sum: 1 }
      }
    }
  ]).session(session);

  const average = stats.length ? Number(stats[0].average.toFixed(2)) : 0;
  const total = stats.length ? stats[0].total : 0;

  await Restaurant.findByIdAndUpdate(
    restaurantId,
    { rating: average, reviewCount: total },
    { session }
  );
};

const assertPublicUser = (req) => {
  if (req.user.role !== 'user') {
    throw errorHandler(403, 'Only public users can submit reviews');
  }
};

const assertReviewOwnershipOrSuperAdmin = (req, review) => {
  if (req.user.role === 'superAdmin') return;
  if (req.user.role !== 'user' || review.userId.toString() !== req.user.id) {
    throw errorHandler(403, 'Not allowed');
  }
};

const assertCanReadReview = (req, review) => {
  const reviewUserId =
    typeof review.userId === 'object' && review.userId !== null
      ? review.userId._id?.toString() || review.userId.toString()
      : review.userId?.toString();
  const reviewRestaurantId =
    typeof review.restaurantId === 'object' && review.restaurantId !== null
      ? review.restaurantId._id?.toString() || review.restaurantId.toString()
      : review.restaurantId?.toString();

  if (req.user.role === 'superAdmin') return;

  if (req.user.role === 'user' && reviewUserId === req.user.id) {
    return;
  }

  if (
    ['admin', 'storeManager'].includes(req.user.role) &&
    req.user.restaurantId &&
    reviewRestaurantId === req.user.restaurantId
  ) {
    return;
  }

  throw errorHandler(403, 'Not allowed');
};

export const createReview = async (req, res, next) => {
  try {
    assertPublicUser(req);
    const { restaurantId } = req.params;
    const { rating, comment = '', images = [] } = req.body;

    logger.info('createReview.debug', {
      restaurantId,
      userId: req.user.id,
      rating,
      comment,
      images
    });

    if (!isValidObjectId(restaurantId)) {
      throw errorHandler(400, 'Invalid restaurant ID format');
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      throw errorHandler(400, 'rating must be between 1 and 5');
    }

    if (images.length > 3) {
      throw errorHandler(400, 'Maximum 3 images allowed');
    }

    try {
      const result = await withTransaction(async (session) => {
        const restaurant = await Restaurant.findById(restaurantId)
          .session(session)
          .lean();

        if (
          !restaurant ||
          !restaurant.isActive ||
          restaurant.status !== 'published'
        ) {
          throw errorHandler(404, 'Restaurant not available for reviews');
        }

        const [review] = await Review.create(
          [
            {
              restaurantId,
              userId: req.user.id,
              rating,
              comment: String(comment).trim(),
              images,
              isActive: false
            }
          ],
          { session }
        );

        logger.info('createReview.created', { reviewId: review._id });

        await recomputeRestaurantRating(restaurantId, session);

        await logAudit({
          actorId: req.user.id,
          actorRole: req.user.role,
          entityType: 'review',
          entityId: review._id,
          action: 'CREATE',
          before: null,
          after: { restaurantId, rating },
          ipAddress: normalizeIp(req),
          session
        });

        return review;
      });

      await invalidatePattern(`reviews:restaurant:${restaurantId}*`);
      await invalidatePattern(`reviews:summary:${restaurantId}`);
      await invalidatePattern('reviews:all*');

      return res.status(201).json({ success: true, data: result });
    } catch (createError) {
      logger.error('createReview.error', { error: createError.message, code: createError.code });
      if (createError.code === 11000) {
        const existing = await Review.findOne({
          restaurantId,
          userId: req.user.id
        });
        if (existing) {
          logger.info('createReview.duplicateFound', { existingReviewId: existing._id, isActive: existing.isActive });
          if (existing.isActive) {
            return res.status(200).json({ success: true, data: existing });
          }
          existing.isActive = true;
          existing.comment = String(comment).trim();
          existing.rating = rating;
          await existing.save();
          await invalidatePattern(`reviews:restaurant:${restaurantId}*`);
          await invalidatePattern(`reviews:summary:${restaurantId}`);
          await invalidatePattern('reviews:all*');
          return res.status(200).json({ success: true, data: existing });
        }
      }
      throw createError;
    }
  } catch (error) {
    next(error);
  }
};

export const listRestaurantReviews = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 10, sort = 'desc' } = req.query;

    logger.info('listRestaurantReviews.debug', { restaurantId, page, limit, sort });

    if (!isValidObjectId(restaurantId)) {
      throw errorHandler(400, 'Invalid restaurant ID format');
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    // Cache key based on request params
    const cacheKey = `reviews:restaurant:${restaurantId}:${pageNum}:${limitNum}:${sort}`;

    const cachedData = await getOrFetch(
      cacheKey,
      async () => {
        const filter = { restaurantId, isActive: true };
        const total = await Review.countDocuments(filter);
        const pagination = paginate({ page: pageNum, limit: limitNum, total });
        const direction = sort === 'asc' ? 1 : -1;

        logger.info('listRestaurantReviews.query', { filter, total, skip: pagination.skip, limit: pagination.limit });

        const data = await Review.find(filter)
          .populate('userId', 'userName profilePicture')
          .sort({ createdAt: direction })
          .skip(pagination.skip)
          .limit(pagination.limit)
          .lean();

        logger.info('listRestaurantReviews.found', { count: data.length });

        return { success: true, ...pagination, data };
      },
      300 // Cache for 5 minutes
    );

    res.status(200).json(cachedData);
  } catch (error) {
    next(error);
  }
};

export const listAllReviewsForModeration = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 10, sort = 'desc' } = req.query;

    logger.info('listAllReviewsForModeration.debug', { restaurantId, page, limit, sort });

    if (!isValidObjectId(restaurantId)) {
      throw errorHandler(400, 'Invalid restaurant ID format');
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const filter = { restaurantId };
    const total = await Review.countDocuments(filter);
    const pagination = paginate({ page: pageNum, limit: limitNum, total });
    const direction = sort === 'asc' ? 1 : -1;

    logger.info('listAllReviewsForModeration.query', { filter, total, skip: pagination.skip, limit: pagination.limit });

    const data = await Review.find(filter)
      .populate('userId', 'userName profilePicture')
      .sort({ createdAt: direction })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    logger.info('listAllReviewsForModeration.found', { count: data.length });

    res.status(200).json({ success: true, ...pagination, data });
  } catch (error) {
    next(error);
  }
};

export const listAllReviewsForSuperAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = 'desc', restaurantId } = req.query;

    logger.info('listAllReviewsForSuperAdmin.debug', { page, limit, sort, restaurantId });

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const filter = {};
    if (restaurantId) {
      if (!isValidObjectId(restaurantId)) {
        throw errorHandler(400, 'Invalid restaurant ID format');
      }
      filter.restaurantId = restaurantId;
    }

    const total = await Review.countDocuments(filter);
    const pagination = paginate({ page: pageNum, limit: limitNum, total });
    const direction = sort === 'asc' ? 1 : -1;

    logger.info('listAllReviewsForSuperAdmin.query', { filter, total, skip: pagination.skip, limit: pagination.limit });

    const data = await Review.find(filter)
      .populate('userId', 'userName profilePicture')
      .populate('restaurantId', 'name slug')
      .sort({ createdAt: direction })
      .skip(pagination.skip)
      .limit(limitNum)
      .lean();

    logger.info('listAllReviewsForSuperAdmin.found', { count: data.length });

    res.status(200).json({ success: true, ...pagination, data });
  } catch (error) {
    next(error);
  }
};

export const getMyReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const filter = { isActive: true };

    if (req.user.role === 'user') {
      filter.userId = req.user.id;
    } else if (req.user.role !== 'superAdmin') {
      throw errorHandler(403, 'Not allowed to view reviews');
    }

    const total = await Review.countDocuments(filter);
    const pagination = paginate({ page, limit, total });
    const data = await Review.find(filter)
      .populate('restaurantId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    res.status(200).json({ success: true, ...pagination, data });
  } catch (error) {
    next(error);
  }
};

export const getReviewById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      throw errorHandler(400, 'Invalid review ID format');
    }

    const review = await Review.findById(id)
      .populate('userId', 'userName profilePicture')
      .populate('restaurantId', 'name slug')
      .lean();

    if (!review || !review.isActive) {
      throw errorHandler(404, 'Review not found');
    }

    assertCanReadReview(req, review);

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!isValidObjectId(id)) {
      throw errorHandler(400, 'Invalid review ID format');
    }
    if (
      rating !== undefined &&
      (typeof rating !== 'number' || rating < 1 || rating > 5)
    ) {
      throw errorHandler(400, 'rating must be between 1 and 5');
    }

    const result = await withTransaction(async (session) => {
      const review = await Review.findById(id).session(session);
      if (!review || !review.isActive) {
        throw errorHandler(404, 'Review not found');
      }

      assertReviewOwnershipOrSuperAdmin(req, review);

      const before = { rating: review.rating, comment: review.comment };
      if (rating !== undefined) review.rating = rating;
      if (comment !== undefined) review.comment = String(comment).trim();
      await review.save({ session });

      await recomputeRestaurantRating(review.restaurantId, session);

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: 'review',
        entityId: review._id,
        action: 'UPDATE',
        before,
        after: { rating: review.rating, comment: review.comment },
        ipAddress: normalizeIp(req),
        session
      });

      return review;
    });

    await invalidatePattern(`reviews:restaurant:${result.restaurantId}*`);
    await invalidatePattern(`reviews:summary:${result.restaurantId}`);
    await invalidatePattern('reviews:all*');

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      throw errorHandler(400, 'Invalid review ID format');
    }

    let deletedRestaurantId;
    await withTransaction(async (session) => {
      const review = await Review.findById(id).session(session);
      if (!review || !review.isActive) {
        throw errorHandler(404, 'Review not found');
      }

      assertReviewOwnershipOrSuperAdmin(req, review);

      deletedRestaurantId = review.restaurantId;

      review.isActive = false;
      review.moderatedBy = req.user.id;
      review.moderatedAt = new Date();
      await review.save({ session });

      await recomputeRestaurantRating(review.restaurantId, session);

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: 'review',
        entityId: review._id,
        action: 'DELETE',
        before: { isActive: true },
        after: { isActive: false },
        ipAddress: normalizeIp(req),
        session
      });
    });

    await invalidatePattern(`reviews:restaurant:${deletedRestaurantId}*`);
    await invalidatePattern(`reviews:summary:${deletedRestaurantId}`);
    await invalidatePattern('reviews:all*');

    res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};

const assertCanModerate = async (req, review, session) => {
  if (req.user.role === 'superAdmin') return;
  if (req.user.role !== 'admin') {
    throw errorHandler(403, 'Not allowed');
  }

  const admin = await User.findById(req.user.id).session(session).lean();
  if (
    !admin?.restaurantId ||
    admin.restaurantId.toString() !== review.restaurantId.toString()
  ) {
    throw errorHandler(403, 'Not your restaurant');
  }
};

export const moderateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (!isValidObjectId(id))
      throw errorHandler(400, 'Invalid review ID format');
    if (typeof isActive !== 'boolean')
      throw errorHandler(400, 'isActive must be boolean');

    const result = await withTransaction(async (session) => {
      const review = await Review.findById(id).session(session);
      if (!review) throw errorHandler(404, 'Review not found');

      await assertCanModerate(req, review, session);

      const before = { isActive: review.isActive };
      review.isActive = isActive;
      review.moderatedAt = new Date();
      review.moderatedBy = req.user.id;
      await review.save({ session });

      await recomputeRestaurantRating(review.restaurantId, session);

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: 'review',
        entityId: review._id,
        action: 'STATUS_CHANGE',
        before,
        after: { isActive },
        ipAddress: normalizeIp(req),
        session
      });

      return review;
    });

    await invalidatePattern(`reviews:restaurant:${result.restaurantId}*`);
    await invalidatePattern(`reviews:summary:${result.restaurantId}`);
    await invalidatePattern('reviews:all*');

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const bulkModerateReviews = async (req, res, next) => {
  try {
    const { reviewIds, isActive } = req.body;

    logger.info('bulkModerateReviews.debug', { reviewIds: reviewIds.length, isActive });

    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      throw errorHandler(400, 'reviewIds must be a non-empty array');
    }
    if (typeof isActive !== 'boolean') {
      throw errorHandler(400, 'isActive must be boolean');
    }

    const invalidIds = reviewIds.filter((id) => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      throw errorHandler(400, `Invalid review IDs: ${invalidIds.join(', ')}`);
    }

    const reviews = await Review.find({ _id: { $in: reviewIds } });
    if (reviews.length === 0) {
      throw errorHandler(404, 'No reviews found');
    }

    if (req.user.role === 'admin') {
      const admin = await User.findById(req.user.id).lean();
      const unauthorizedReviews = reviews.filter(
        (r) => r.restaurantId.toString() !== admin?.restaurantId?.toString()
      );
      if (unauthorizedReviews.length > 0) {
        throw errorHandler(403, 'You can only moderate reviews for your assigned restaurant');
      }
    }

    const restaurantIds = [...new Set(reviews.map((r) => r.restaurantId.toString()))];

    const updatedReviews = await Review.updateMany(
      { _id: { $in: reviewIds } },
      {
        $set: {
          isActive,
          moderatedAt: new Date(),
          moderatedBy: req.user.id
        }
      }
    ).lean();

    for (const restaurantId of restaurantIds) {
      await recomputeRestaurantRating(restaurantId);
    }

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'review',
      entityId: null,
      action: 'BULK_STATUS_CHANGE',
      before: null,
      after: { reviewIds, isActive },
      ipAddress: normalizeIp(req)
    });

    for (const restaurantId of restaurantIds) {
      await invalidatePattern(`reviews:restaurant:${restaurantId}*`);
      await invalidatePattern(`reviews:summary:${restaurantId}`);
    }
    await invalidatePattern('reviews:all*');

    res.status(200).json({
      success: true,
      data: {
        modifiedCount: updatedReviews.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantReviewSummary = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    logger.info('getRestaurantReviewSummary.debug', { restaurantId });

    if (!isValidObjectId(restaurantId)) {
      throw errorHandler(400, 'Invalid restaurant ID format');
    }

    // Cache key based on restaurantId
    const cacheKey = `reviews:summary:${restaurantId}`;

    const cachedData = await getOrFetch(
      cacheKey,
      async () => {
        const [summary] = await Review.aggregate([
          {
            $match: {
              restaurantId: new mongoose.Types.ObjectId(restaurantId),
              isActive: true
            }
          },
          {
            $group: {
              _id: '$restaurantId',
              averageRating: { $avg: '$rating' },
              totalReviews: { $sum: 1 },
              one: {
                $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] }
              },
              two: {
                $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] }
              },
              three: {
                $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] }
              },
              four: {
                $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] }
              },
              five: {
                $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] }
              }
            }
          }
        ]);

        return {
          success: true,
          data: summary
            ? {
              averageRating: Number(summary.averageRating.toFixed(2)),
              totalReviews: summary.totalReviews,
              distribution: {
                1: summary.one,
                2: summary.two,
                3: summary.three,
                4: summary.four,
                5: summary.five
              }
            }
            : {
              averageRating: 0,
              totalReviews: 0,
              distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            }
        };
      },
      300 // Cache for 5 minutes
    );

    res.status(200).json(cachedData);
  } catch (error) {
    next(error);
  }
};
