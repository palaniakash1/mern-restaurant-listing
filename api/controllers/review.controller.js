import mongoose from "mongoose";
import Review from "../models/review.model.js";
import Restaurant from "../models/restaurant.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";
import { paginate } from "../utils/paginate.js";
import { withTransaction } from "../utils/withTransaction.js";
import { logAudit } from "../utils/auditLogger.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (Array.isArray(forwardedFor)) return forwardedFor[0];
  if (typeof forwardedFor === "string") return forwardedFor.split(",")[0].trim();
  return req.ip;
};

const recomputeRestaurantRating = async (restaurantId, session = null) => {
  const stats = await Review.aggregate([
    {
      $match: {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$restaurantId",
        average: { $avg: "$rating" },
        total: { $sum: 1 },
      },
    },
  ]).session(session);

  const average = stats.length ? Number(stats[0].average.toFixed(2)) : 0;
  const total = stats.length ? stats[0].total : 0;

  await Restaurant.findByIdAndUpdate(
    restaurantId,
    { rating: average, reviewCount: total },
    { session },
  );
};

const assertPublicUser = (req) => {
  if (req.user.role !== "user") {
    throw errorHandler(403, "Only public users can submit reviews");
  }
};

const assertReviewOwnershipOrSuperAdmin = (req, review) => {
  if (req.user.role === "superAdmin") return;
  if (req.user.role !== "user" || review.userId.toString() !== req.user.id) {
    throw errorHandler(403, "Not allowed");
  }
};

export const createReview = async (req, res, next) => {
  try {
    assertPublicUser(req);
    const { restaurantId } = req.params;
    const { rating, comment = "" } = req.body;

    if (!isValidObjectId(restaurantId)) {
      throw errorHandler(400, "Invalid restaurant ID format");
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      throw errorHandler(400, "rating must be between 1 and 5");
    }

    const result = await withTransaction(async (session) => {
      const restaurant = await Restaurant.findById(restaurantId)
        .session(session)
        .lean();
      if (!restaurant || !restaurant.isActive || restaurant.status !== "published") {
        throw errorHandler(404, "Restaurant not available for reviews");
      }

      const existing = await Review.findOne({
        restaurantId,
        userId: req.user.id,
        isActive: true,
      }).session(session);
      if (existing) {
        throw errorHandler(409, "You already reviewed this restaurant");
      }

      const [review] = await Review.create(
        [
          {
            restaurantId,
            userId: req.user.id,
            rating,
            comment: String(comment).trim(),
          },
        ],
        { session },
      );

      await recomputeRestaurantRating(restaurantId, session);

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "review",
        entityId: review._id,
        action: "CREATE",
        before: null,
        after: { restaurantId, rating },
        ipAddress: normalizeIp(req),
      });

      return review;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(409, "You already reviewed this restaurant"));
    }
    next(error);
  }
};

export const listRestaurantReviews = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 10, sort = "desc" } = req.query;

    if (!isValidObjectId(restaurantId)) {
      throw errorHandler(400, "Invalid restaurant ID format");
    }

    const filter = { restaurantId, isActive: true };
    const total = await Review.countDocuments(filter);
    const pagination = paginate({ page, limit, total });
    const direction = sort === "asc" ? 1 : -1;

    const data = await Review.find(filter)
      .populate("userId", "userName profilePicture")
      .sort({ createdAt: direction })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    res.status(200).json({ success: true, ...pagination, data });
  } catch (error) {
    next(error);
  }
};

export const getMyReviews = async (req, res, next) => {
  try {
    assertPublicUser(req);
    const { page = 1, limit = 10 } = req.query;
    const filter = { userId: req.user.id, isActive: true };

    const total = await Review.countDocuments(filter);
    const pagination = paginate({ page, limit, total });
    const data = await Review.find(filter)
      .populate("restaurantId", "name slug")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    res.status(200).json({ success: true, ...pagination, data });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!isValidObjectId(id)) {
      throw errorHandler(400, "Invalid review ID format");
    }
    if (rating !== undefined && (typeof rating !== "number" || rating < 1 || rating > 5)) {
      throw errorHandler(400, "rating must be between 1 and 5");
    }

    const result = await withTransaction(async (session) => {
      const review = await Review.findById(id).session(session);
      if (!review || !review.isActive) {
        throw errorHandler(404, "Review not found");
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
        entityType: "review",
        entityId: review._id,
        action: "UPDATE",
        before,
        after: { rating: review.rating, comment: review.comment },
        ipAddress: normalizeIp(req),
      });

      return review;
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      throw errorHandler(400, "Invalid review ID format");
    }

    await withTransaction(async (session) => {
      const review = await Review.findById(id).session(session);
      if (!review || !review.isActive) {
        throw errorHandler(404, "Review not found");
      }

      assertReviewOwnershipOrSuperAdmin(req, review);

      review.isActive = false;
      review.moderatedBy = req.user.id;
      review.moderatedAt = new Date();
      await review.save({ session });

      await recomputeRestaurantRating(review.restaurantId, session);

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        entityType: "review",
        entityId: review._id,
        action: "DELETE",
        before: { isActive: true },
        after: { isActive: false },
        ipAddress: normalizeIp(req),
      });
    });

    res.status(200).json({ success: true, message: "Review deleted" });
  } catch (error) {
    next(error);
  }
};

const assertCanModerate = async (req, review, session) => {
  if (req.user.role === "superAdmin") return;
  if (req.user.role !== "admin") {
    throw errorHandler(403, "Not allowed");
  }

  const admin = await User.findById(req.user.id).session(session).lean();
  if (!admin?.restaurantId || admin.restaurantId.toString() !== review.restaurantId.toString()) {
    throw errorHandler(403, "Not your restaurant");
  }
};

export const moderateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (!isValidObjectId(id)) throw errorHandler(400, "Invalid review ID format");
    if (typeof isActive !== "boolean") throw errorHandler(400, "isActive must be boolean");

    const result = await withTransaction(async (session) => {
      const review = await Review.findById(id).session(session);
      if (!review) throw errorHandler(404, "Review not found");

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
        entityType: "review",
        entityId: review._id,
        action: "STATUS_CHANGE",
        before,
        after: { isActive },
        ipAddress: normalizeIp(req),
      });

      return review;
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantReviewSummary = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    if (!isValidObjectId(restaurantId)) {
      throw errorHandler(400, "Invalid restaurant ID format");
    }

    const [summary] = await Review.aggregate([
      { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId), isActive: true } },
      {
        $group: {
          _id: "$restaurantId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          one: {
            $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] },
          },
          two: {
            $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] },
          },
          three: {
            $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] },
          },
          four: {
            $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] },
          },
          five: {
            $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
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
              5: summary.five,
            },
          }
        : {
            averageRating: 0,
            totalReviews: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          },
    });
  } catch (error) {
    next(error);
  }
};
