import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js';
import { initRedis } from './utils/redisCache.js';
import { logger } from './utils/logger.js';

dotenv.config();

const mongoUri = process.env.DATABASE_URL || process.env.MONGO;
const requiredEnvVars = ['JWT_SECRET'];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

if (!mongoUri) {
  throw new Error(
    'Missing required environment variable: DATABASE_URL (or MONGO)'
  );
}

mongoose
  .connect(mongoUri)
  .then(() => {
    logger.info('mongo.connected', {});
  })
  .catch((err) => {
    logger.error('mongo.connection.error', { error: err.message });
  });

// Initialize Redis (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  initRedis().catch((err) =>
    logger.warn('redis.init.error', { error: err.message })
  );
}

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info('server.started', { port: PORT });
});

const gracefulShutdown = async (signal) => {
  logger.warn('server.shutdown.start', { signal });
  server.close(async () => {
    try {
      await mongoose.connection.close();
      process.exit(0);
    } catch (err) {
      logger.error('server.shutdown.error', { error: err.message });
      process.exit(1);
    }
  });
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
