import { apiGet, apiPost } from '../utils/api';

export const listRestaurantReviews = async (restaurantId, options = {}) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const params = new URLSearchParams({
    page,
    limit,
    sortBy,
    sortOrder
  });

  const response = await apiGet(`/api/reviews/restaurant/${restaurantId}?${params}`);
  return response.data;
};

export const getRestaurantReviewSummary = async (restaurantId) => {
  const response = await apiGet(`/api/reviews/restaurant/${restaurantId}/summary`);
  return response.data;
};

export const createReview = async (restaurantId, reviewData) => {
  const response = await apiPost(`/api/reviews/restaurant/${restaurantId}`, reviewData);
  return response.data;
};

export const getMyReviews = async (options = {}) => {
  const { page = 1, limit = 10 } = options;
  const params = new URLSearchParams({ page, limit });
  const response = await apiGet(`/api/reviews/my?${params}`);
  return response.data;
};