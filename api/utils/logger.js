import pino from 'pino';
import config, { isProduction, isTest } from '../config.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const isTestEnv = isTest;
const isProd = isProduction;

const logDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'logs'
);

const buildTransportConfig = (production = isProd) =>
  production
    ? {
      targets: [
        {
          target: 'pino/file',
          options: {
            destination: 1,
            mkdir: true
          },
          level: 'info'
        },
        {
          target: 'pino/file',
          options: {
            destination: join(logDirectory, 'error.log'),
            mkdir: true
          },
          level: 'error'
        },
        {
          target: 'pino/file',
          options: {
            destination: join(logDirectory, 'combined.log'),
            mkdir: true
          },
          level: 'info'
        }
      ]
    }
    : {
      targets: [
        {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
          },
          level: 'debug'
        }
      ]
    };

const buildPinoConfig = ({
  production = isProd,
  testEnv = isTestEnv
} = {}) => ({
  enabled: !testEnv,
  level: config.logLevel || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
    bindings: (bindings) => {
      return {
        service: config.appName,
        environment: config.env,
        ...bindings
      };
    }
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      parameters: req.parameters,
      headers: {
        host: req.headers?.host
      }
    }),
    res: (res) => ({
      statusCode: res.statusCode
    })
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      '*.password',
      '*.token',
      '*.secret',
      '*.access_token',
      '*.refresh_token',
      'res.headers["set-cookie"]'
    ],
    censor: '[REDACTED]'
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  ...(production && !testEnv
    ? { transport: buildTransportConfig(production) }
    : {})
});

const pinoConfig = buildPinoConfig();

const pinoLogger = pino(pinoConfig);

const MAX_LOG_BUFFER = 1000;
const recentLogs = [];

const MAX_STRING_LENGTH = 2000;
const MAX_ARRAY_LENGTH = 50;

const redactValue = (value, keyName = null) => {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    if (keyName) {
      const lowerKey = keyName.toLowerCase();
      if (
        lowerKey === 'message' ||
        lowerKey === 'description' ||
        lowerKey === 'msg'
      ) {
        if (value.length > MAX_STRING_LENGTH) {
          return value.slice(0, MAX_STRING_LENGTH) + '...';
        }
        return value;
      }
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('authorization') ||
        (lowerKey.length > 3 && lowerKey.includes('key'))
      ) {
        return '[REDACTED]';
      }
    }
    if (value.length > MAX_STRING_LENGTH) {
      return value.slice(0, MAX_STRING_LENGTH) + '...';
    }
    if (value.length > 3 && !value.includes(' ')) {
      return '[REDACTED]';
    }
    return value;
  }
  if (Array.isArray(value)) {
    const truncated = value.slice(0, MAX_ARRAY_LENGTH);
    return truncated.map((v) => redactValue(v));
  }
  if (typeof value === 'object') {
    const redacted = {};
    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      const isSafeKey =
        lowerKey === 'level' ||
        lowerKey === 'msg' ||
        lowerKey === 'message' ||
        lowerKey === 'service' ||
        lowerKey === 'environment' ||
        lowerKey === 'timestamp' ||
        lowerKey === 'requestid' ||
        lowerKey === 'request_id' ||
        lowerKey === 'method' ||
        lowerKey === 'url' ||
        lowerKey === 'statuscode' ||
        lowerKey === 'durationms' ||
        lowerKey === 'hostname' ||
        lowerKey === 'pid' ||
        lowerKey === 'component' ||
        lowerKey === 'subsystem' ||
        lowerKey === 'userid' ||
        lowerKey === 'user_id' ||
        lowerKey === 'clientip' ||
        lowerKey === 'client_ip' ||
        lowerKey === 'contentlength' ||
        lowerKey === 'content_length' ||
        lowerKey === 'useragent' ||
        lowerKey === 'user_agent' ||
        lowerKey === 'response' ||
        lowerKey === 'body' ||
        lowerKey === 'path';
      if (isSafeKey) {
        if (
          lowerKey === 'message' ||
          lowerKey === 'description' ||
          lowerKey === 'msg'
        ) {
          redacted[key] = redactValue(val, key);
        } else {
          redacted[key] = val;
        }
      } else if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('authorization') ||
        (lowerKey.length > 3 && lowerKey.includes('key'))
      ) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactValue(val, key);
      }
    }
    return redacted;
  }
  return value;
};

const wrapLogger = (logger) => ({
  debug: (message, metadata) => {
    const rawEntry =
      typeof message === 'object' ? { ...message } : { message, ...metadata };
    const entry = redactValue({ ...rawEntry, level: 'debug' });
    recentLogs.unshift(entry);
    if (recentLogs.length > MAX_LOG_BUFFER) recentLogs.pop();
    if (typeof message === 'object') {
      logger.debug(message);
    } else {
      logger.debug(metadata || {}, message);
    }
  },
  info: (message, metadata) => {
    const rawEntry =
      typeof message === 'object' ? { ...message } : { message, ...metadata };
    const entry = redactValue({ ...rawEntry, level: 'info' });
    recentLogs.unshift(entry);
    if (recentLogs.length > MAX_LOG_BUFFER) recentLogs.pop();
    if (typeof message === 'object') {
      logger.info(message);
    } else {
      logger.info(metadata || {}, message);
    }
  },
  warn: (message, metadata) => {
    const rawEntry =
      typeof message === 'object' ? { ...message } : { message, ...metadata };
    const entry = redactValue({ ...rawEntry, level: 'warn' });
    recentLogs.unshift(entry);
    if (recentLogs.length > MAX_LOG_BUFFER) recentLogs.pop();
    if (typeof message === 'object') {
      logger.warn(message);
    } else {
      logger.warn(metadata || {}, message);
    }
  },
  error: (message, metadata) => {
    const rawEntry =
      typeof message === 'object' ? { ...message } : { message, ...metadata };
    const entry = redactValue({ ...rawEntry, level: 'error' });
    recentLogs.unshift(entry);
    if (recentLogs.length > MAX_LOG_BUFFER) recentLogs.pop();
    if (typeof message === 'object') {
      logger.error(message);
    } else {
      logger.error(metadata || {}, message);
    }
  },
  child: (bindings) => {
    const childLogger = logger.child(bindings);
    return {
      debug: (message, metadata) => {
        const rawEntry =
          typeof message === 'object'
            ? { ...message, ...bindings }
            : { message, ...metadata, ...bindings };
        const entry = redactValue({ ...rawEntry, level: 'debug' });
        recentLogs.unshift(entry);
        if (recentLogs.length > MAX_LOG_BUFFER) recentLogs.pop();
        if (typeof message === 'object') {
          childLogger.debug({ ...message, ...bindings });
        } else {
          childLogger.debug({ ...bindings, ...metadata }, message);
        }
      },
      info: (message, metadata) => {
        const rawEntry =
          typeof message === 'object'
            ? { ...message, ...bindings }
            : { message, ...metadata, ...bindings };
        const entry = redactValue({ ...rawEntry, level: 'info' });
        recentLogs.unshift(entry);
        if (recentLogs.length > MAX_LOG_BUFFER) recentLogs.pop();
        if (typeof message === 'object') {
          childLogger.info({ ...message, ...bindings });
        } else {
          childLogger.info({ ...bindings, ...metadata }, message);
        }
      },
      warn: (message, metadata) => {
        const rawEntry =
          typeof message === 'object'
            ? { ...message, ...bindings }
            : { message, ...metadata, ...bindings };
        const entry = redactValue({ ...rawEntry, level: 'warn' });
        recentLogs.unshift(entry);
        if (recentLogs.length > MAX_LOG_BUFFER) recentLogs.pop();
        if (typeof message === 'object') {
          childLogger.warn({ ...message, ...bindings });
        } else {
          childLogger.warn({ ...bindings, ...metadata }, message);
        }
      },
      error: (message, metadata) => {
        const rawEntry =
          typeof message === 'object'
            ? { ...message, ...bindings }
            : { message, ...metadata, ...bindings };
        const entry = redactValue({ ...rawEntry, level: 'error' });
        recentLogs.unshift(entry);
        if (recentLogs.length > MAX_LOG_BUFFER) recentLogs.pop();
        if (typeof message === 'object') {
          childLogger.error({ ...message, ...bindings });
        } else {
          childLogger.error({ ...bindings, ...metadata }, message);
        }
      },
      child: (newBindings) => {
        return wrapLogger(childLogger.child({ ...bindings, ...newBindings }));
      }
    };
  },
  getRecentLogs: (count = 100) => {
    if (count <= 0) return [];
    return recentLogs.slice(0, count);
  },
  clearRecentLogs: () => {
    recentLogs.length = 0;
  }
});

export const logger = wrapLogger(pinoLogger);

export const __loggerTestUtils = {
  buildTransportConfig,
  buildPinoConfig,
  redactValue,
  wrapLogger
};

export default logger;
