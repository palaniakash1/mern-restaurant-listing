const placeholderValues = new Set([
  'your-firebase-api-key',
  'your-google-maps-api-key',
  'your-cloudinary-cloud-name'
]);

const normalizeEnvValue = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/^['"]|['"]$/g, '');
};

export const isConfiguredEnvValue = (value) => {
  const normalizedValue = normalizeEnvValue(value);

  return normalizedValue !== '' && !placeholderValues.has(normalizedValue);
};

export const firebaseApiKey = normalizeEnvValue(import.meta.env.VITE_FIREBASE_API_KEY);
export const googleMapsApiKey = normalizeEnvValue(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

export const hasFirebaseConfig = isConfiguredEnvValue(firebaseApiKey);
export const hasGoogleMapsConfig = isConfiguredEnvValue(googleMapsApiKey);
