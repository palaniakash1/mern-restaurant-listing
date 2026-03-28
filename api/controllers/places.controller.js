import {
  placeAutocomplete,
  getPlaceDetails,
  searchPlaces
} from '../utils/googlePlaces.js';

export const autocomplete = async (req, res, next) => {
  try {
    const { input, language } = req.query;

    const result = await placeAutocomplete(input, language);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getDetails = async (req, res, next) => {
  try {
    const { placeId } = req.params;

    const result = await getPlaceDetails(placeId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const search = async (req, res, next) => {
  try {
    const { q, lat, lng, radius } = req.query;

    const location =
      lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
    const radiusNum = radius ? parseInt(radius, 10) : 5000;

    const result = await searchPlaces(q, location, radiusNum);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export default {
  autocomplete,
  getDetails,
  search
};
