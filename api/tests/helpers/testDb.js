import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let mongoReplSet;

export const setupTestDb = async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

  if (!mongoReplSet) {
    mongoReplSet = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
      binary: {
        // Coverage runs slow process startup enough to hit the default limit.
        launchTimeout: 30000
      }
    });
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoReplSet.getUri());
  }
};

export const clearTestDb = async () => {
  const { collections } = mongoose.connection;
  const deletions = Object.values(collections).map((collection) =>
    collection.deleteMany({})
  );
  await Promise.all(deletions);
};

export const teardownTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  if (mongoReplSet) {
    await mongoReplSet.stop();
    mongoReplSet = null;
  }
};

export const signTestToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};
