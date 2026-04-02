import axios from 'axios';
import { getJson, setJson } from '../utils/redisCache.js';
import { logger } from '../utils/logger.js';

const buildQueryString = (params) => {
  const entries = Object.entries(params).filter(([, v]) => v != null);
  return entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
};

const FSA_API_BASE_URL = 'https://api.ratings.food.gov.uk';
const FSA_API_VERSION = '2';
const CACHE_TTL_ESTABLISHMENT = 12 * 60 * 60;
const CACHE_TTL_SEARCH = 60 * 60;

export const normalizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
};

export const normalizePostcode = (postcode) => {
  if (!postcode || typeof postcode !== 'string') return '';
  return postcode.toUpperCase().trim().replace(/\s+/g, ' ');
};

const calculateNameSimilarity = (name1, name2) => {
  const normalized1 = normalizeString(name1);
  const normalized2 = normalizeString(name2);

  if (normalized1 === normalized2) return 1;
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.85;
  }

  const tokens1 = normalized1.split(' ').filter(Boolean);
  const tokens2 = normalized2.split(' ').filter(Boolean);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const commonTokens = tokens1.filter((t) => tokens2.includes(t));
  const avgLength = (tokens1.length + tokens2.length) / 2;
  const tokenScore = commonTokens.length / avgLength;

  const longer =
    normalized1.length > normalized2.length ? normalized1 : normalized2;
  const shorter =
    normalized1.length > normalized2.length ? normalized2 : normalized1;

  let prefixMatch = 0;
  for (let i = 0; i < Math.min(longer.length, shorter.length); i++) {
    if (longer[i] === shorter[i]) prefixMatch++;
    else break;
  }
  const prefixScore = prefixMatch / longer.length;

  return Math.max(
    tokenScore * 0.6 + prefixScore * 0.4,
    commonTokens.length / Math.max(tokens1.length, tokens2.length)
  );
};

const extractBusinessType = (name) => {
  const lower = name.toLowerCase();
  const typePatterns = [
    {
      pattern: /\b(restaurant|cafe|café|bistro|eatery|dining)\b/i,
      type: 'restaurant'
    },
    {
      pattern:
        /\b(takeaway|takeaway|take away|fast food|kebab|pizza|burger|chippy|chinese|indian|thai|vietnamese|mexican)\b/i,
      type: 'fast_food'
    },
    { pattern: /\b(pub|inn|bar|hotel)\b/i, type: 'pub' },
    { pattern: /\b(hotel|resort|lodge|inn)\b/i, type: 'hotel' },
    {
      pattern:
        /\b(school|college|university|hospital|care home|nursing home)\b/i,
      type: 'institutional'
    },
    { pattern: /\b(shop|store|supermarket|market)\b/i, type: 'retail' }
  ];

  for (const { pattern, type } of typePatterns) {
    if (pattern.test(lower)) return type;
  }
  return 'other';
};

export const searchEstablishments = async (name, postcode = null) => {
  const cacheKey = `fsa:search:${normalizeString(name)}:${normalizePostcode(postcode) || 'none'}`;
  const cached = await getJson(cacheKey);
  if (cached) {
    logger.debug('fsa_api.search_cache_hit', { name, postcode });
    return cached;
  }

  const queryParams = buildQueryString({ name, postcode });
  const url = `${FSA_API_BASE_URL}/Establishments?${queryParams}&pageSize=50`;

  try {
    const res = await axios.get(url, {
      headers: {
        'x-api-version': FSA_API_VERSION,
        Accept: 'application/json'
      }
    });

    await setJson(cacheKey, res.data, CACHE_TTL_SEARCH);
    return res.data;
  } catch (error) {
    logger.error('fsa_api.search_http_error', { url, error: error.message });
    throw error;
  }
};

export const getEstablishmentByFHRSID = async (fhrsId) => {
  const cacheKey = `fsa:establishment:${fhrsId}`;

  const cached = await getJson(cacheKey);
  if (cached) {
    logger.debug('fsa_api.cache_hit', { fhrsId });
    return cached;
  }

  const url = `${FSA_API_BASE_URL}/Establishments/${fhrsId}`;

  let response;
  try {
    response = await axios.get(url, {
      headers: {
        'x-api-version': FSA_API_VERSION,
        Accept: 'application/json'
      },
      validateStatus: () => true
    });
  } catch (error) {
    logger.error('fsa_api.fetch_error', {
      fhrsId,
      error: error.message,
      stack: error.stack
    });
    throw new Error('Failed to connect to FSA API');
  }

  const data = response.data;

  if (!data || typeof data !== 'object') {
    throw new Error('Establishment not found');
  }

  if (data.Message && data.Message.toLowerCase().includes('not found')) {
    throw new Error('Establishment not found');
  }

  if (
    response.status === 404 ||
    response.status === 204 ||
    response.status === 410 ||
    response.status >= 400
  ) {
    throw new Error('Establishment not found');
  }

  if (response.status !== 200) {
    const errorMsg =
      data?.Message || `FSA API returned status ${response.status}`;
    throw new Error(errorMsg);
  }

  if (data?.FHRSAuthority?.EstablishmentCollection?.EstablishmentDetail) {
    const establishment =
      data.FHRSAuthority.EstablishmentCollection.EstablishmentDetail;
    await setJson(cacheKey, establishment, CACHE_TTL_ESTABLISHMENT);
    return establishment;
  }

  if (data?.establishments?.[0]) {
    const establishment = data.establishments[0];
    await setJson(cacheKey, establishment, CACHE_TTL_ESTABLISHMENT);
    return establishment;
  }

  if (data?.FHRSID) {
    await setJson(cacheKey, data, CACHE_TTL_ESTABLISHMENT);
    return data;
  }

  throw new Error('Invalid FSA API response format');
};

export const findBestMatch = (
  establishments,
  targetName,
  targetPostcode = null
) => {
  if (!establishments || establishments.length === 0) {
    return { match: null, score: 0, multipleMatches: false };
  }

  const normalizedTargetPostcode = targetPostcode
    ? normalizePostcode(targetPostcode)
    : null;
  const targetType = extractBusinessType(targetName);

  const scored = establishments.map((est) => {
    const nameScore = calculateNameSimilarity(est.BusinessName, targetName);

    let postcodeScore = 0;
    if (normalizedTargetPostcode && est.PostCode) {
      const estPostcode = normalizePostcode(est.PostCode);
      if (estPostcode === normalizedTargetPostcode) {
        postcodeScore = 1;
      } else if (
        estPostcode.startsWith(normalizedTargetPostcode.split(' ')[0])
      ) {
        postcodeScore = 0.5;
      }
    }

    const typeScore =
      targetType === extractBusinessType(est.BusinessName) ? 0.15 : 0;

    const totalScore = nameScore * 0.7 + postcodeScore * 0.15 + typeScore;

    return {
      establishment: est,
      score: totalScore,
      breakdown: { nameScore, postcodeScore, typeScore }
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const bestScore = scored[0].score;
  const allMatches = scored.filter((s) => s.score >= bestScore * 0.8);

  if (allMatches.length > 1) {
    return {
      match: allMatches[0].establishment,
      matches: allMatches.map((s) => s.establishment),
      score: bestScore,
      multipleMatches: true
    };
  }

  return {
    match: scored[0].establishment,
    score: bestScore,
    multipleMatches: scored.length > 1 && scored[1].score >= bestScore * 0.8
  };
};

export const parseRatingValue = (rating) => {
  if (rating === null || rating === undefined) {
    return null;
  }

  if (rating === 'Exempt' || rating === 'Exempt - Awaiting Publication') {
    return 'Exempt';
  }

  const numeric = parseInt(rating, 10);
  if (isNaN(numeric) || numeric < 0 || numeric > 5) {
    return null;
  }

  return String(numeric);
};

export const generateBadgeUrl = (rating) => {
  if (!rating || rating === 'Exempt') {
    return null;
  }

  return `https://ratings.food.gov.uk/images/badges/fhrs/3/fhrs-badge-${rating}.svg`;
};

export const searchAndMatchEstablishment = async (name, postcode = null) => {
  try {
    const searchResponse = await searchEstablishments(name, postcode);

    let establishments = searchResponse?.establishments;

    if (!establishments) {
      establishments =
        searchResponse?.FHRSAuthority?.EstablishmentCollection
          ?.EstablishmentDetail;
    }

    if (
      !establishments ||
      (Array.isArray(establishments) && establishments.length === 0)
    ) {
      return {
        success: true,
        matched: false,
        data: null,
        multipleOptions: null,
        error: null,
        rawResponse: searchResponse
      };
    }

    const estArray = Array.isArray(establishments)
      ? establishments
      : [establishments];
    const matchResult = findBestMatch(estArray, name, postcode);

    if (!matchResult.match || matchResult.score < 0.4) {
      return {
        success: true,
        matched: false,
        data: null,
        multipleOptions: null,
        error: null,
        message: 'No suitable match found'
      };
    }

    const establishment = matchResult.match;
    const rating = parseRatingValue(establishment.RatingValue);

    return {
      success: true,
      matched: true,
      data: {
        fhrsId: establishment.FHRSID,
        name: establishment.BusinessName,
        address: {
          line1: establishment.AddressLine1,
          line2: establishment.AddressLine2,
          line3: establishment.AddressLine3,
          postcode: establishment.PostCode
        },
        rating,
        ratingDate: establishment.RatingDate,
        hygieneScore: establishment.Scores?.Hygiene,
        structuralScore: establishment.Scores?.Structural,
        confidenceInManagementScore:
          establishment.Scores?.ConfidenceInManagement
      },
      multipleOptions: matchResult.multipleMatches
        ? estArray.slice(0, 5)
        : null,
      score: matchResult.score
    };
  } catch (error) {
    logger.error('fsa_api.search_error', {
      name,
      postcode,
      error: error.message
    });

    return {
      success: false,
      matched: false,
      data: null,
      multipleOptions: null,
      error: error.message
    };
  }
};

export const getRatingByFHRSID = async (fhrsId) => {
  try {
    const establishment = await getEstablishmentByFHRSID(fhrsId);
    const rating = parseRatingValue(establishment.RatingValue);

    return {
      success: true,
      data: {
        fhrsId: establishment.FHRSID,
        name: establishment.BusinessName,
        address: {
          line1: establishment.AddressLine1,
          line2: establishment.AddressLine2,
          line3: establishment.AddressLine3,
          postcode: establishment.PostCode
        },
        rating,
        ratingDate: establishment.RatingDate,
        hygieneScore: establishment.Scores?.Hygiene,
        structuralScore: establishment.Scores?.Structural,
        confidenceInManagementScore:
          establishment.Scores?.ConfidenceInManagement
      },
      badgeUrl: generateBadgeUrl(rating)
    };
  } catch (error) {
    logger.error('fsa_api.fetch_error', {
      fhrsId,
      error: error.message
    });

    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

export default {
  searchEstablishments,
  getEstablishmentByFHRSID,
  findBestMatch,
  parseRatingValue,
  generateBadgeUrl,
  searchAndMatchEstablishment,
  getRatingByFHRSID,
  normalizeString,
  normalizePostcode
};
