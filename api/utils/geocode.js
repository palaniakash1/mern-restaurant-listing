import axios from 'axios';
import { errorHandler } from './error.js';
import config from '../config.js';

export const geocodeAddress = async ({
  addressLine1,
  areaLocality,
  city,
  postcode,
  country
}) => {
  if (!config.googleMapsApiKey) {
    throw errorHandler(503, 'Geocoding service is not configured');
  }

  const fullAddress = `${addressLine1}, ${areaLocality}, ${city}, ${postcode}, ${country}`;

  const response = await axios.get(
    'https://maps.googleapis.com/maps/api/geocode/json',
    {
      params: {
        address: fullAddress,
        key: config.googleMapsApiKey
      }
    }
  );

  if (!response.data.results.length) {
    throw errorHandler(400, 'Unable to geocode address');
  }

  const location = response.data.results[0].geometry.location;

  return {
    type: 'Point',
    coordinates: [location.lng, location.lat]
  };
};
