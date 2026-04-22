import { apiGet } from '../utils/api';

export const listCategories = async (options = {}) => {
  const { page = 1, limit = 50 } = options;
  const params = new URLSearchParams({ page, limit }).toString();
  const response = await apiGet(`/api/categories?${params}`);
  return response;
};

export const getRestaurantBySlug = async (slug) => {
  const response = await apiGet(`/api/restaurants/slug/${slug}`);
  return response.data;
};

export const getRestaurantMenus = async (restaurantId, options = {}) => {
  const { page = 1, limit = 10, search = '', sort = 'desc' } = options;
  const params = new URLSearchParams({
    page,
    limit,
    search,
    sort
  }).toString();
  const response = await apiGet(`/api/menus/restaurant/${restaurantId}?${params}`);
  return response;
};

export const getRestaurantDetails = async (slug) => {
  const response = await apiGet(`/api/restaurants/slug/${slug}/details`);
  return response.data;
};

export const getFeaturedRestaurants = async (options = {}) => {
  const { page = 1, limit = 10 } = options;
  const params = new URLSearchParams({ page, limit }).toString();
  const response = await apiGet(`/api/restaurants/featured?${params}`);
  return response;
};

export const getTrendingRestaurants = async (options = {}) => {
  const { page = 1, limit = 10 } = options;
  const params = new URLSearchParams({ page, limit }).toString();
  const response = await apiGet(`/api/restaurants/trending?${params}`);
  return response;
};

export const getNearbyRestaurants = async (options = {}) => {
  const { lng, lat, radius = 5000, limit = 20, sortBy, categories, isOpenNow, exclude } = options;
  const params = new URLSearchParams({
    lng,
    lat,
    radius,
    limit
  });
  if (sortBy) params.set('sortBy', sortBy);
  if (categories) params.set('categories', categories);
  if (isOpenNow) params.set('isOpenNow', 'true');
  if (exclude) params.set('exclude', exclude);
  const response = await apiGet(`/api/restaurants/nearby?${params}`);
  return response;
};

export const listRestaurants = async (options = {}) => {
  const {
    page = 1,
    limit = 12,
    q = '',
    city = '',
    categories = '',
    isFeatured = false,
    isTrending = false,
    sortBy = 'newest'
  } = options;

  const params = new URLSearchParams({
    page,
    limit,
    sortBy,
    ...(q && { q }),
    ...(city && { city }),
    ...(categories && { categories }),
    ...(isFeatured && { isFeatured: 'true' }),
    ...(isTrending && { isTrending: 'true' })
  }).toString();

  const response = await apiGet(`/api/restaurants?${params}`);
  return response;
};

export const getGalleryRestaurantImages = async (options = {}) => {
  const { page = 1, limit = 20 } = options;
  const params = new URLSearchParams({ page, limit }).toString();
  const response = await apiGet(`/api/gallery/restaurants?${params}`);
  return response;
};

export const getGalleryMenuImages = async (options = {}) => {
  const { page = 1, limit = 20 } = options;
  const params = new URLSearchParams({ page, limit }).toString();
  const response = await apiGet(`/api/gallery/menus?${params}`);
  return response;
};

export const getGalleryReviewImages = async (options = {}) => {
  const { page = 1, limit = 20 } = options;
  const params = new URLSearchParams({ page, limit }).toString();
  const response = await apiGet(`/api/gallery/reviews?${params}`);
  return response;
};

export const getCities = async () => {
  const response = await apiGet('/api/restaurants/cities');
  return response.data;
};

export const searchAll = async (options = {}) => {
  const { q = '', city = '' } = options;
  const params = new URLSearchParams({ q, city }).toString();
  const response = await apiGet(`/api/restaurants/search-all?${params}`);
  return response.data;
};

export const getPopularDishes = async (options = {}) => {
  const { lat, lng, radius = 50000, city, limit = 8 } = options;
  const params = new URLSearchParams({ limit });
  if (lat) params.set('lat', lat);
  if (lng) params.set('lng', lng);
  if (radius) params.set('radius', radius);
  if (city) params.set('city', city);
  const response = await apiGet(`/api/restaurants/popular-dishes?${params}`);
  return response.data;
};