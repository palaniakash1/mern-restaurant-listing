/**
 * Sample Migration: Add Audit Indexes
 * 
 * This migration adds performance indexes to the audit log collection
 * 
 * To run: npm run migrate
 * To rollback: npm run migrate:rollback
 */

export const up = async (db) => {
  console.log("Creating audit log indexes...");
  
  // Index on entityType for filtering
  await db.collection("auditlogs").createIndex(
    { entityType: 1 },
    { name: "idx_entityType" }
  );
  
  // Index on entityId for lookups
  await db.collection("auditlogs").createIndex(
    { entityId: 1 },
    { name: "idx_entityId" }
  );
  
  // Compound index for common queries
  await db.collection("auditlogs").createIndex(
    { entityType: 1, createdAt: -1 },
    { name: "idx_entityType_createdAt" }
  );
  
  // Index on actorId for user activity
  await db.collection("auditlogs").createIndex(
    { actorId: 1, createdAt: -1 },
    { name: "idx_actorId_createdAt" }
  );
  
  console.log("✅ Audit log indexes created");
};

export const down = async (db) => {
  console.log("Removing audit log indexes...");
  
  await db.collection("auditlogs").dropIndex("idx_entityType");
  await db.collection("auditlogs").dropIndex("idx_entityId");
  await db.collection("auditlogs").dropIndex("idx_entityType_createdAt");
  await db.collection("auditlogs").dropIndex("idx_actorId_createdAt");
  
  console.log("✅ Audit log indexes removed");
};

export const meta = {
  version: 1,
  description: "Add performance indexes to audit logs",
  author: "DevTeam",
  rollbackSafe: true,
};
