import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryReplSet } from "mongodb-memory-server";

let mongoReplSet;

export const setupTestDb = async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
  mongoReplSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongoReplSet.getUri());
};

export const clearTestDb = async () => {
  const { collections } = mongoose.connection;
  const deletions = Object.values(collections).map((collection) =>
    collection.deleteMany({}),
  );
  await Promise.all(deletions);
};

export const teardownTestDb = async () => {
  await mongoose.connection.close();
  if (mongoReplSet) {
    await mongoReplSet.stop();
  }
};

export const signTestToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
};
