import dotenv from 'dotenv';

dotenv.config();

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toOptionalString = (value) => {
  const normalized = String(value || '').trim();
  return normalized ? normalized : null;
};

const requireString = (value, key) => {
  const normalized = toOptionalString(value);
  if (!normalized) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return normalized;
};

const config = {
  env: toOptionalString(process.env.NODE_ENV) || 'development',
  port: toPositiveInt(process.env.PORT, 3000),
  appName: toOptionalString(process.env.APP_NAME) || 'mern-restaurant',
  appVersion: toOptionalString(process.env.APP_VERSION) || '1.0.0',
  logLevel: toOptionalString(process.env.LOG_LEVEL) || 'info',
  databaseUrl:
    toOptionalString(process.env.DATABASE_URL) ||
    requireString(process.env.MONGO, 'DATABASE_URL (or MONGO)'),
  jwtSecret: requireString(process.env.JWT_SECRET, 'JWT_SECRET'),
  jwtExpire:
    toOptionalString(process.env.JWT_EXPIRE) ||
    toOptionalString(process.env.ACCESS_TOKEN_EXPIRE) ||
    '1h',
  corsOrigins: String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  metricsToken: toOptionalString(process.env.METRICS_TOKEN),
  googleMapsApiKey: toOptionalString(process.env.GOOGLE_MAPS_API_KEY),
  emailServiceUrl: toOptionalString(process.env.EMAIL_SERVICE_URL),
  refreshTokenTtlDays: toPositiveInt(process.env.REFRESH_TOKEN_TTL_DAYS, 14),
  loginLockout: {
    threshold: toPositiveInt(process.env.LOGIN_LOCKOUT_THRESHOLD, 5),
    baseMs: toPositiveInt(process.env.LOGIN_LOCKOUT_BASE_MS, 15 * 60 * 1000),
    maxMs: toPositiveInt(
      process.env.LOGIN_LOCKOUT_MAX_MS,
      24 * 60 * 60 * 1000
    )
  },
  redis: {
    url: toOptionalString(process.env.REDIS_URL),
    cacheTtlSeconds: toPositiveInt(process.env.CACHE_TTL, 300),
    connectTimeoutMs: toPositiveInt(process.env.REDIS_CONNECT_TIMEOUT, 2000)
  }
};

export const isProduction = config.env === 'production';
export const isTest = config.env === 'test';

export default config;
