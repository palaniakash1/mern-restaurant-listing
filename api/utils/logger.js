import config, { isTest } from '../config.js';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];
const MAX_LOG_BUFFER = 1000;

const levelWeight = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const runtimeLevel = LOG_LEVELS.includes(config.logLevel)
  ? config.logLevel
  : 'info';
const recentLogs = [];

const truncate = (value, max = 256) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.length > max ? `${value.slice(0, max)}...` : value;
};

const redactValue = (key, value) => {
  const normalized = String(key || '').toLowerCase();
  if (
    normalized.includes('password') ||
    normalized.includes('token') ||
    normalized.includes('secret') ||
    normalized === 'authorization'
  ) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    return truncate(value, 2000);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 50)
      .map((item) =>
        typeof item === 'object' && item !== null ? sanitize(item) : item
      );
  }

  if (value && typeof value === 'object') {
    return sanitize(value);
  }

  return value;
};

const sanitize = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const output = {};
  for (const [key, value] of Object.entries(obj)) {
    output[key] = redactValue(key, value);
  }
  return output;
};

const pushRecentLog = (entry) => {
  recentLogs.unshift(entry);
  if (recentLogs.length > MAX_LOG_BUFFER) {
    recentLogs.pop();
  }
};

const canLog = (level) => levelWeight[level] >= levelWeight[runtimeLevel];

const writeEntry = (entry) => {
  if (isTest) {
    return;
  }

  const serialized = JSON.stringify(entry);
  const consoleMethod =
    entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'log';
  // eslint-disable-next-line no-console
  console[consoleMethod](serialized);
};

const baseLog = (level, message, metadata = {}) => {
  if (!LOG_LEVELS.includes(level) || !canLog(level)) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: truncate(String(message || ''), 2000),
    service: config.appName,
    environment: config.env,
    ...sanitize(metadata)
  };

  pushRecentLog(entry);
  writeEntry(entry);
};

export const logger = {
  debug: (message, metadata) => baseLog('debug', message, metadata),
  info: (message, metadata) => baseLog('info', message, metadata),
  warn: (message, metadata) => baseLog('warn', message, metadata),
  error: (message, metadata) => baseLog('error', message, metadata),
  child: (baseMetadata = {}) => ({
    debug: (message, metadata) =>
      baseLog('debug', message, { ...baseMetadata, ...metadata }),
    info: (message, metadata) =>
      baseLog('info', message, { ...baseMetadata, ...metadata }),
    warn: (message, metadata) =>
      baseLog('warn', message, { ...baseMetadata, ...metadata }),
    error: (message, metadata) =>
      baseLog('error', message, { ...baseMetadata, ...metadata })
  }),
  getRecentLogs: (count = 100) => recentLogs.slice(0, Math.max(0, count)),
  clearRecentLogs: () => {
    recentLogs.length = 0;
  }
};

export default logger;
