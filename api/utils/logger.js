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

const transportConfig = isProd
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

const pinoConfig = {
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
        host: req.headers.host
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
  ...(isProd && !isTestEnv ? { transport: transportConfig } : {})
};

const pinoLogger = pino(pinoConfig);

const MAX_LOG_BUFFER = 1000;
const recentLogs = [];

const wrapLogger = (logger) => ({
  debug: (message, metadata) => {
    const entry =
      typeof message === 'object'
        ? { ...message, level: 'debug' }
        : { message, ...metadata, level: 'debug' };
    recentLogs.unshift(entry);
    if (recentLogs.length > MAX_LOG_BUFFER) recentLogs.pop();
    if (typeof message === 'object') {
      logger.debug(message);
    } else {
      logger.debug(metadata || {}, message);
    }
  },
  info: (message, metadata) => {
    const entry =
      typeof message === 'object'
        ? { ...message, level: 'info' }
        : { message, ...metadata, level: 'info' };
    recentLogs.unshift(entry);
    if (recentLogs.length > MAX_LOG_BUFFER) recentLogs.pop();
    if (typeof message === 'object') {
      logger.info(message);
    } else {
      logger.info(metadata || {}, message);
    }
  },
  warn: (message, metadata) => {
    const entry =
      typeof message === 'object'
        ? { ...message, level: 'warn' }
        : { message, ...metadata, level: 'warn' };
    recentLogs.unshift(entry);
    if (recentLogs.length > MAX_LOG_BUFFER) recentLogs.pop();
    if (typeof message === 'object') {
      logger.warn(message);
    } else {
      logger.warn(metadata || {}, message);
    }
  },
  error: (message, metadata) => {
    const entry =
      typeof message === 'object'
        ? { ...message, level: 'error' }
        : { message, ...metadata, level: 'error' };
    recentLogs.unshift(entry);
    if (recentLogs.length > MAX_LOG_BUFFER) recentLogs.pop();
    if (typeof message === 'object') {
      logger.error(message);
    } else {
      logger.error(metadata || {}, message);
    }
  },
  child: (bindings) => {
    return wrapLogger(logger.child(bindings));
  },
  getRecentLogs: (count = 100) => recentLogs.slice(0, count),
  clearRecentLogs: () => {
    recentLogs.length = 0;
  }
});

export const logger = wrapLogger(pinoLogger);

export default logger;
