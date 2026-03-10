import mongoose from 'mongoose';
import app from './app.js';
import config from './config.js';
import { closeRedis, initRedis } from './utils/redisCache.js';
import { logger } from './utils/logger.js';

let server;
let isShuttingDown = false;

const closeServer = async () => {
  if (!server) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  logger.warn('server.shutdown.start', { signal });

  const forceShutdownTimer = setTimeout(() => {
    logger.error('server.shutdown.timeout', { signal });
    process.exit(1);
  }, 10000);
  forceShutdownTimer.unref?.();

  try {
    await closeServer();
    await mongoose.connection.close();
    await closeRedis();
    clearTimeout(forceShutdownTimer);
    logger.info('server.shutdown.complete', { signal });
    process.exit(0);
  } catch (error) {
    clearTimeout(forceShutdownTimer);
    logger.error('server.shutdown.error', {
      signal,
      error: error.message
    });
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await mongoose.connect(config.databaseUrl);
    logger.info('mongo.connected', {});

    if (config.env !== 'test') {
      await initRedis();
    }

    server = app.listen(config.port, () => {
      logger.info('server.started', { port: config.port });
    });
  } catch (error) {
    logger.error('server.startup.error', { error: error.message });
    await closeRedis();
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error('process.unhandled_rejection', {
    reason: reason instanceof Error ? reason.message : String(reason)
  });
});
process.on('uncaughtException', (error) => {
  logger.error('process.uncaught_exception', { error: error.message });
  process.exit(1);
});

await startServer();
