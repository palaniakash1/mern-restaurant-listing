import axios from 'axios';
import config from '../config.js';
import { errorHandler } from './error.js';
import { logger } from './logger.js';
import { getJson, setJson } from './redisCache.js';

const PLACES_API_BASE_URL = 'https://maps.googleapis.com/maps/api/place';
const AUTOCOMPLETE_TTL_SECONDS = 10 * 60;
const PLACE_DETAILS_TTL_SECONDS = 24 * 60 * 60;
const SEARCH_TTL_SECONDS = 10 * 60;

export const placeAutocomplete = async (input, language = 'en') => {
  if (!config.googleMapsApiKey) {
    throw errorHandler(503, 'Google Maps API is not configured');
  }

  if (!input || input.trim().length < 2) {
    throw errorHandler(400, 'Input must be at least 2 characters');
  }

  const normalizedInput = input.trim();
  const cacheKey = `places:autocomplete:${language}:${normalizedInput.toLowerCase()}`;
  const cached = await getJson(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get(
      `${PLACES_API_BASE_URL}/autocomplete/json`,
      {
        params: {
          input: normalizedInput,
          types: 'address',
          language,
          key: config.googleMapsApiKey
        }
      }
    );

    if (
      response.data.status !== 'OK' &&
      response.data.status !== 'ZERO_RESULTS'
    ) {
      logger.error('places_api.autocomplete_error', {
        input,
        status: response.data.status,
        error: response.data.error_message
      });
      throw errorHandler(500, 'Failed to fetch address suggestions');
    }

    const predictions = response.data.predictions || [];

    const result = {
      success: true,
      data: predictions.map((prediction) => ({
        placeId: prediction.place_id,
        description: prediction.description,
        structuredFormat: {
          mainText: prediction.structured_formatting?.main_text || '',
          secondaryText:
            prediction.structured_formatting?.secondary_text || ''
        },
        matchedSubstrings:
          prediction.matched_substrings?.map((m) => ({
            offset: m.offset,
            length: m.length
          })) || []
      }))
    };

    await setJson(cacheKey, result, AUTOCOMPLETE_TTL_SECONDS);
    return result;
  } catch (error) {
    if (error.statusCode) throw error;
    logger.error('places_api.autocomplete_exception', {
      input,
      error: error.message
    });
    throw errorHandler(500, 'Failed to fetch address suggestions');
  }
};

export const getPlaceDetails = async (placeId) => {
  if (!config.googleMapsApiKey) {
    throw errorHandler(503, 'Google Maps API is not configured');
  }

  if (!placeId) {
    throw errorHandler(400, 'Place ID is required');
  }

  const cacheKey = `places:details:${placeId}`;
  const cached = await getJson(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get(`${PLACES_API_BASE_URL}/details/json`, {
      params: {
        place_id: placeId,
        fields: 'address_components,geometry,formatted_address,name,types',
        key: config.googleMapsApiKey
      }
    });

    if (response.data.status !== 'OK') {
      logger.error('places_api.details_error', {
        placeId,
        status: response.data.status,
        error: response.data.error_message
      });
      throw errorHandler(404, 'Place not found');
    }

    const result = response.data.result;
    const addressComponents = result.address_components || [];

    const getComponent = (types) => {
      const component = addressComponents.find((c) =>
        c.types.some((t) => types.includes(t))
      );
      return component?.long_name || null;
    };

    const address = {
      addressLine1: getComponent(['street_number']) || '',
      addressLine2: getComponent(['route']) || '',
      areaLocality:
        getComponent(['sublocality', 'locality', 'neighborhood']) || '',
      city: getComponent(['postal_town', 'locality']) || '',
      countyRegion:
        getComponent([
          'administrative_area_level_1',
          'administrative_area_level_2'
        ]) || '',
      postcode: getComponent(['postal_code']) || '',
      country: getComponent(['country']) || ''
    };

    const responsePayload = {
      success: true,
      data: {
        placeId: result.place_id,
        name: result.name,
        formattedAddress: result.formatted_address,
        address: {
          ...address,
          addressLine1: address.addressLine1
            ? `${address.addressLine1} ${address.addressLine2}`.trim()
            : address.addressLine2
        },
        location: result.geometry?.location
          ? {
            type: 'Point',
            coordinates: [
              result.geometry.location.lng,
              result.geometry.location.lat
            ]
          }
          : null,
        types: result.types
      }
    };

    await setJson(cacheKey, responsePayload, PLACE_DETAILS_TTL_SECONDS);
    return responsePayload;
  } catch (error) {
    if (error.statusCode) throw error;
    logger.error('places_api.details_exception', {
      placeId,
      error: error.message
    });
    throw errorHandler(500, 'Failed to fetch place details');
  }
};

export const searchPlaces = async (query, location = null, radius = 5000) => {
  if (!config.googleMapsApiKey) {
    throw errorHandler(503, 'Google Maps API is not configured');
  }

  if (!query) {
    throw errorHandler(400, 'Search query is required');
  }

  const cacheKey = `places:search:${query.trim().toLowerCase()}:${location ? `${location.lat},${location.lng}` : 'none'}:${radius}`;
  const cached = await getJson(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const params = {
      query,
      key: config.googleMapsApiKey
    };

    if (location) {
      params.location = `${location.lat},${location.lng}`;
      params.radius = radius;
    }

    const response = await axios.get(`${PLACES_API_BASE_URL}/textsearch/json`, {
      params
    });

    if (
      response.data.status !== 'OK' &&
      response.data.status !== 'ZERO_RESULTS'
    ) {
      logger.error('places_api.search_error', {
        query,
        status: response.data.status,
        error: response.data.error_message
      });
      throw errorHandler(500, 'Failed to search places');
    }

    const results = response.data.results || [];

    const responsePayload = {
      success: true,
      data: results.map((place) => ({
        placeId: place.place_id,
        name: place.name,
        formattedAddress: place.formatted_address,
        rating: place.rating,
        location: place.geometry?.location
          ? {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          }
          : null,
        types: place.types
      }))
    };

    await setJson(cacheKey, responsePayload, SEARCH_TTL_SECONDS);
    return responsePayload;
  } catch (error) {
    if (error.statusCode) throw error;
    logger.error('places_api.search_exception', {
      query,
      error: error.message
    });
    throw errorHandler(500, 'Failed to search places');
  }
};

export default {
  placeAutocomplete,
  getPlaceDetails,
  searchPlaces
};
