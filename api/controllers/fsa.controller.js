import Restaurant from '../models/restaurant.model.js';
import {
  searchAndMatchEstablishment,
  getRatingByFHRSID,
  getEstablishmentByFHRSID,
  generateBadgeUrl
} from '../services/fsa.service.js';
import { errorHandler } from '../utils/error.js';
import { logger } from '../utils/logger.js';
import { getJson, setJson } from '../utils/redisCache.js';

const FSA_RATING_CACHE_TTL = 24 * 60 * 60;

export const searchFSA = async (req, res, next) => {
  try {
    const { name, postcode } = req.query;

    if (!name || name.trim().length < 2) {
      throw errorHandler(
        400,
        'Restaurant name is required (minimum 2 characters)'
      );
    }

    const result = await searchAndMatchEstablishment(name, postcode || null);

    if (!result.success) {
      logger.warn('fsa.search.api_error', {
        name,
        postcode,
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      data: {
        matched: result.matched,
        result: result.data,
        multipleOptions: result.multipleOptions,
        score: result.score,
        message: result.message || null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getRating = async (req, res, next) => {
  try {
    const { fhrsId } = req.params;

    if (!fhrsId || !/^\d+$/.test(fhrsId)) {
      throw errorHandler(400, 'Valid FHRSID is required');
    }

    const cacheKey = `fsa:rating:${fhrsId}`;
    const cached = await getJson(cacheKey);

    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached,
        cached: true
      });
    }

    try {
      const establishment = await getEstablishmentByFHRSID(
        parseInt(fhrsId, 10)
      );

      const responseData = {
        fhrsId: establishment.FHRSID,
        name: establishment.BusinessName,
        address: {
          line1: establishment.AddressLine1,
          line2: establishment.AddressLine2,
          line3: establishment.AddressLine3,
          postcode: establishment.PostCode
        },
        rating: establishment.RatingValue,
        ratingDate: establishment.RatingDate,
        hygieneScore: establishment.Scores?.Hygiene,
        structuralScore: establishment.Scores?.Structural,
        confidenceInManagementScore:
          establishment.Scores?.ConfidenceInManagement,
        badgeUrl: `https://ratings.food.gov.uk/images/badges/fhrs/3/fhrs-badge-${establishment.RatingValue}.svg`
      };

      await setJson(cacheKey, responseData, FSA_RATING_CACHE_TTL);

      return res.status(200).json({
        success: true,
        data: responseData,
        cached: false
      });
    } catch (fsaError) {
      const errorMessage = (fsaError.message || '').toLowerCase();
      const isNotFoundError =
        errorMessage.includes('not found') ||
        errorMessage.includes('no establishment') ||
        errorMessage.includes('establishmentid') ||
        errorMessage.includes('fsa api returned status') ||
        errorMessage.includes('failed to connect');

      if (isNotFoundError) {
        throw errorHandler(404, 'Establishment not found');
      }
      logger.error('fsa.get_rating.error', { fhrsId, error: fsaError.message });
      throw errorHandler(502, 'Failed to fetch rating from FSA API');
    }
  } catch (error) {
    next(error);
  }
};

export const linkRestaurant = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { fhrsId } = req.body;

    if (!fhrsId || !/^\d+$/.test(fhrsId)) {
      throw errorHandler(400, 'Valid FHRSID is required');
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw errorHandler(404, 'Restaurant not found');
    }

    if (
      restaurant.adminId.toString() !== req.user.id &&
      req.user.role !== 'superAdmin'
    ) {
      throw errorHandler(
        403,
        'You do not have permission to update this restaurant'
      );
    }

    const result = await getRatingByFHRSID(parseInt(fhrsId, 10));
    if (!result.success) {
      throw errorHandler(502, 'Failed to verify FHRSID with FSA API');
    }

    restaurant.fhrsId = parseInt(fhrsId, 10);
    restaurant.fsaRating = {
      value: result.data.rating,
      lastRefreshed: new Date(),
      isManuallyLinked: true
    };
    await restaurant.save();

    logger.info('fsa.restaurant.linked', {
      restaurantId,
      fhrsId,
      rating: result.data.rating,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant linked to FSA rating successfully',
      data: {
        fhrsId: restaurant.fhrsId,
        rating: restaurant.fsaRating.value,
        badgeUrl: generateBadgeUrl(restaurant.fsaRating.value),
        lastRefreshed: restaurant.fsaRating.lastRefreshed
      }
    });
  } catch (error) {
    next(error);
  }
};

export const unlinkRestaurant = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw errorHandler(404, 'Restaurant not found');
    }

    if (
      restaurant.adminId.toString() !== req.user.id &&
      req.user.role !== 'superAdmin'
    ) {
      throw errorHandler(
        403,
        'You do not have permission to update this restaurant'
      );
    }

    restaurant.fhrsId = null;
    restaurant.fsaRating = {
      value: null,
      lastRefreshed: null,
      isManuallyLinked: false
    };
    await restaurant.save();

    logger.info('fsa.restaurant.unlinked', {
      restaurantId,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant unlinked from FSA rating successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const refreshRestaurantRating = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw errorHandler(404, 'Restaurant not found');
    }

    if (!restaurant.fhrsId) {
      throw errorHandler(400, 'Restaurant is not linked to FSA rating');
    }

    if (
      restaurant.adminId.toString() !== req.user.id &&
      req.user.role !== 'superAdmin'
    ) {
      throw errorHandler(
        403,
        'You do not have permission to update this restaurant'
      );
    }

    const result = await getRatingByFHRSID(restaurant.fhrsId);

    if (!result.success) {
      throw errorHandler(502, 'Failed to refresh rating from FSA API');
    }

    restaurant.fsaRating = {
      value: result.data.rating,
      lastRefreshed: new Date(),
      isManuallyLinked: restaurant.fsaRating.isManuallyLinked
    };
    await restaurant.save();

    res.status(200).json({
      success: true,
      message: 'Rating refreshed successfully',
      data: {
        fhrsId: restaurant.fhrsId,
        rating: restaurant.fsaRating.value,
        badgeUrl: generateBadgeUrl(restaurant.fsaRating.value),
        lastRefreshed: restaurant.fsaRating.lastRefreshed
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantRating = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId).select(
      'fhrsId fsaRating name address'
    );
    if (!restaurant) {
      throw errorHandler(404, 'Restaurant not found');
    }

    if (!restaurant.fhrsId) {
      return res.status(200).json({
        success: true,
        data: {
          linked: false,
          fhrsId: null,
          rating: null,
          badgeUrl: null,
          lastRefreshed: null
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        linked: true,
        fhrsId: restaurant.fhrsId,
        rating: restaurant.fsaRating.value,
        badgeUrl: generateBadgeUrl(restaurant.fsaRating.value),
        lastRefreshed: restaurant.fsaRating.lastRefreshed,
        isManuallyLinked: restaurant.fsaRating.isManuallyLinked,
        needsRefresh: shouldRefreshRating(restaurant.fsaRating.lastRefreshed)
      }
    });
  } catch (error) {
    next(error);
  }
};

const shouldRefreshRating = (lastRefreshed) => {
  if (!lastRefreshed) return true;
  const daysSinceRefresh =
    (Date.now() - new Date(lastRefreshed).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceRefresh > 7;
};

export const autoLinkRestaurant = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw errorHandler(404, 'Restaurant not found');
    }

    if (
      restaurant.adminId.toString() !== req.user.id &&
      req.user.role !== 'superAdmin'
    ) {
      throw errorHandler(
        403,
        'You do not have permission to update this restaurant'
      );
    }

    const result = await searchAndMatchEstablishment(
      restaurant.name,
      restaurant.address?.postcode
    );

    if (!result.matched) {
      return res.status(200).json({
        success: true,
        data: {
          linked: false,
          result: null,
          multipleOptions: result.multipleOptions,
          message: 'No matching FSA establishment found'
        }
      });
    }

    if (result.multipleOptions && result.multipleOptions.length > 1) {
      return res.status(200).json({
        success: true,
        data: {
          linked: false,
          result: result.data,
          multipleOptions: result.multipleOptions.map((est) => ({
            fhrsId: est.FHRSID,
            name: est.BusinessName,
            postcode: est.PostCode,
            rating: est.RatingValue
          })),
          message:
            'Multiple matches found. Please select the correct establishment.'
        }
      });
    }

    restaurant.fhrsId = result.data.fhrsId;
    restaurant.fsaRating = {
      value: result.data.rating,
      lastRefreshed: new Date(),
      isManuallyLinked: false
    };
    await restaurant.save();

    logger.info('fsa.restaurant.auto_linked', {
      restaurantId,
      fhrsId: result.data.fhrsId,
      matchScore: result.score
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant automatically linked to FSA rating',
      data: {
        linked: true,
        result: result.data,
        badgeUrl: generateBadgeUrl(result.data.rating)
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  searchFSA,
  getRating,
  linkRestaurant,
  unlinkRestaurant,
  refreshRestaurantRating,
  getRestaurantRating,
  autoLinkRestaurant
};
