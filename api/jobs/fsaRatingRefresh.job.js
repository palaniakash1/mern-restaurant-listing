import { setInterval, clearInterval } from 'node:timers';
import { setTimeout } from 'node:timers/promises';
import Restaurant from '../models/restaurant.model.js';
import { getRatingByFHRSID } from '../services/fsa.service.js';
import { logger } from '../utils/logger.js';

const BATCH_SIZE = 50;
const REFRESH_INTERVAL_DAYS = 1;

let refreshJobInterval = null;

export const refreshAllRatings = async () => {
  logger.info('fsa.job.refresh_started');

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - REFRESH_INTERVAL_DAYS);

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    let hasMore = true;
    let lastId = null;

    while (hasMore) {
      const query = Restaurant.find({
        fhrsId: { $ne: null },
        $or: [
          { 'fsaRating.lastRefreshed': { $lt: cutoffDate } },
          { 'fsaRating.lastRefreshed': null } ]
      });

      if (lastId) {
        query.where('_id').gt(lastId);
      }

      const restaurants = await query
        .select('_id fhrsId name fsaRating')
        .limit(BATCH_SIZE)
        .lean();

      if (restaurants.length === 0) {
        hasMore = false;
        break;
      }

      lastId = restaurants[restaurants.length - 1]._id;

      for (const restaurant of restaurants) {
        totalProcessed++;

        try {
          const result = await getRatingByFHRSID(restaurant.fhrsId);

          if (result.success) {
            await Restaurant.findByIdAndUpdate(restaurant._id, {
              fsaRating: {
                value: result.data.rating,
                lastRefreshed: new Date(),
                isManuallyLinked: restaurant.fsaRating?.isManuallyLinked || false
              }
            });
            totalUpdated++;
            logger.debug('fsa.job.rating_updated', {
              restaurantId: restaurant._id,
              fhrsId: restaurant.fhrsId,
              rating: result.data.rating
            });
          } else {
            logger.warn('fsa.job.refresh_failed', {
              restaurantId: restaurant._id,
              fhrsId: restaurant.fhrsId,
              error: result.error
            });
            totalErrors++;
          }
        } catch (error) {
          logger.error('fsa.job.refresh_error', {
            restaurantId: restaurant._id,
            fhrsId: restaurant.fhrsId,
            error: error.message
          });
          totalErrors++;
        }

        await sleep(100);
      }

      if (restaurants.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    logger.info('fsa.job.refresh_completed', {
      totalProcessed,
      totalUpdated,
      totalErrors
    });

    return { totalProcessed, totalUpdated, totalErrors };
  } catch (error) {
    logger.error('fsa.job.refresh_critical_error', {
      error: error.message
    });
    throw error;
  }
};

export const refreshRatingsByIds = async (restaurantIds) => {
  const results = { success: 0, failed: 0, errors: [] };

  for (const id of restaurantIds) {
    try {
      const restaurant = await Restaurant.findById(id);
      if (!restaurant || !restaurant.fhrsId) {
        results.failed++;
        continue;
      }

      const result = await getRatingByFHRSID(restaurant.fhrsId);

      if (result.success) {
        restaurant.fsaRating = {
          value: result.data.rating,
          lastRefreshed: new Date(),
          isManuallyLinked: restaurant.fsaRating.isManuallyLinked
        };
        await restaurant.save();
        results.success++;
      } else {
        results.failed++;
        results.errors.push({ id, error: result.error });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ id, error: error.message });
    }
  }

  return results;
};

export const startRatingRefreshJob = (intervalHours = 24) => {
  if (refreshJobInterval) {
    logger.warn('fsa.job.already_running');
    return;
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;

  const runJob = async () => {
    try {
      await refreshAllRatings();
    } catch (error) {
      logger.error('fsa.job.scheduled_run_failed', { error: error.message });
    }
  };

  refreshJobInterval = setInterval(runJob, intervalMs);

  logger.info('fsa.job.started', { intervalHours });

  runJob();

  return refreshJobInterval;
};

export const stopRatingRefreshJob = () => {
  if (refreshJobInterval) {
    clearInterval(refreshJobInterval);
    refreshJobInterval = null;
    logger.info('fsa.job.stopped');
  }
};

const sleep = (ms) => setTimeout(ms);

export const getJobStatus = () => ({
  running: refreshJobInterval !== null,
  intervalHours: refreshJobInterval ? 24 : null
});

export default {
  refreshAllRatings,
  refreshRatingsByIds,
  startRatingRefreshJob,
  stopRatingRefreshJob,
  getJobStatus
};
