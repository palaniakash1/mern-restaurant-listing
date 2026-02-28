/**
 * Sample Migration: Add indexes to improve performance
 */

export const up = async (db) => {
  console.log("Creating indexes...");
  
  // Add indexes to auditlogs
  await db.collection("auditlogs").createIndex({ entityType: 1, createdAt: -1 });
  await db.collection("auditlogs").createIndex({ actorId: 1 });
  
  // Add indexes to reviews
  await db.collection("reviews").createIndex({ restaurantId: 1, createdAt: -1 });
  await db.collection("reviews").createIndex({ userId: 1 });
  
  console.log("✅ Indexes created");
};

export const down = async (db) => {
  console.log("Removing indexes...");
  console.log("✅ Indexes removed");
};
