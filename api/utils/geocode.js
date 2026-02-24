import axios from "axios";
import { response } from "express";
import { errorHandler } from "./error.js";

export const geocodeAddress = async ({
  addressLine1,
  areaLocality,
  city,
  postcode,
  country,
}) => {
  const fullAddress = `${addressLine1}, ${areaLocality}, ${city}, ${postcode}, ${country}`;

  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/geocode/json",
    {
      params: {
        address: fullAddress,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  );

  if (!response.data.results.length) {
    throw errorHandler(400, "Unable to geocode address");
  }

  const location = response.data.results[0].geometry.location;

  return {
    type: "Point",
    coordinates: [location.lng, location.lat],
  };
};
