/**
 * Database Migration System
 * 
 * Why Migrations?
 * ================
 * As your application evolves, your database schema changes:
 * - Add new fields
 * - Modify existing fields
 * - Create new collections
 * - Index optimization
 * 
 * Without migrations:
 * - Manual database changes get lost
 * - Team members have inconsistent schemas
 * - Production deployments break
 * 
 * With migrations:
 * - Version-controlled schema changes
 * - Reproducible deployments
 * - Easy rollbacks
 * - Team collaboration
 * 
 * Directory Structure:
 * ===================
 * api/migrations/
 * ├── migrate.js          # This file - CLI and runner
 * ├── migrations/
 * │   ├── 001_initial_schema.js
 * │   ├── 002_add_users.js
 * │   └── 003_add_indexes.js
 * └── seeds/
 *     ├── seed_users.js
 *     └── seed_restaurants.js
 * 
 * Usage:
 * ======
 * npm run migrate          # Run pending migrations
 * npm run migrate:rollback # Rollback last migration
 * npm run migrate:status   # Show migration status
 * npm run seed            # Seed database with test data
 * 
 * Migration Format:
 * ================
 * exports.up = async (db) => {
 *   await db.collection('users').createIndex({ email: 1 }, { unique: true });
 * };
 * 
 * exports.down = async (db) => {
 *   await db.collection('users').dropIndex('email_1');
 * };
 * 
 * exports.meta = {
 *   version: 1,
 *   description: 'Add email index to users',
 *   author: 'DevTeam',
 *   rollbackSafe: true
 * };
 */

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================================================================
// CONFIGURATION
// ===================================================================

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const SEEDS_DIR = path.join(__dirname, "seeds");
const MIGRATION_COLLECTION = "_migrations";

// Environment
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

// ===================================================================
// MIGRATION STATE
// ===================================================================

/**
 * Get migrations collection
 */
const getMigrationCollection = (db) => {
  return db.collection(MIGRATION_COLLECTION);
};

/**
 * Get applied migrations from database
 */
const getAppliedMigrations = async (db) => {
  const collection = getMigrationCollection(db);
  const migrations = await collection.find({}).sort({ appliedAt: 1 }).toArray();
  return migrations.map((m) => m.name);
};

/**
 * Mark migration as applied
 */
const markMigrationApplied = async (db, name, batch) => {
  const collection = getMigrationCollection(db);
  await collection.insertOne({
    name,
    appliedAt: new Date(),
    batch,
  });
};

/**
 * Mark migration as rolled back
 */
const markMigrationRolledBack = async (db, name) => {
  const collection = getMigrationCollection(db);
  await collection.deleteOne({ name });
};

// ===================================================================
// MIGRATION LOADERS
// ===================================================================

/**
 * Load all migration files
 */
const loadMigrations = () => {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".js"));
  
  return files
    .map((file) => {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const migration = import(filePath).then((mod) => ({
        name: file.replace(".js", ""),
        up: mod.up,
        down: mod.down,
        meta: mod.meta || {},
      }));
      return migration;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Get migration status
 */
const getMigrationStatus = async (db) => {
  const applied = await getAppliedMigrations(db);
  const pending = await loadMigrations();
  
  const pendingMigrations = [];
  const appliedMigrations = [];
  
  for (const migration of pending) {
    if (applied.includes(migration.name)) {
      appliedMigrations.push(migration);
    } else {
      pendingMigrations.push(migration);
    }
  }
  
  return {
    applied: appliedMigrations,
    pending: pendingMigrations,
    total: applied.length,
  };
};

// ===================================================================
// MAIN MIGRATION FUNCTIONS
// ===================================================================

/**
 * Run all pending migrations
 */
export const runMigrations = async () => {
  console.log("\n🚀 Starting migrations...\n");
  
  const db = mongoose.connection.db;
  
  // Ensure migration collection exists
  await db.createCollection(MIGRATION_COLLECTION).catch(() => {});
  
  const status = await getMigrationStatus(db);
  
  console.log(`📊 Current status:`);
  console.log(`   Applied: ${status.applied.length}`);
  console.log(`   Pending: ${status.pending.length}\n`);
  
  if (status.pending.length === 0) {
    console.log("✅ No pending migrations\n");
    return;
  }
  
  // Get current batch number
  const batchCollection = getMigrationCollection(db);
  const lastMigration = await batchCollection.findOne({}, { sort: { appliedAt: -1 } });
  const batch = (lastMigration?.batch || 0) + 1;
  
  console.log(`📦 Running batch #${batch}\n`);
  
  for (const migration of status.pending) {
    console.log(`⬆️  Applying: ${migration.name}`);
    
    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would apply: ${migration.meta.description || "No description"}`);
      continue;
    }
    
    try {
      await migration.up(db);
      await markMigrationApplied(db, migration.name, batch);
      console.log(`   ✅ Applied successfully\n`);
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}\n`);
      
      if (!FORCE) {
        console.log("💡 Run with --force to continue despite errors");
        process.exit(1);
      }
    }
  }
  
  console.log("✅ All migrations completed!\n");
};

/**
 * Rollback last batch of migrations
 */
export const rollbackMigrations = async () => {
  console.log("\n🔄 Starting rollback...\n");
  
  const db = mongoose.connection.db;
  
  const status = await getMigrationStatus(db);
  
  if (status.applied.length === 0) {
    console.log("⚠️  No migrations to rollback\n");
    return;
  }
  
  // Get last batch
  const batchCollection = getMigrationCollection(db);
  const lastBatch = await batchCollection
    .findOne({}, { sort: { appliedAt: -1 } });
  
  if (!lastBatch) {
    console.log("⚠️  No migrations to rollback\n");
    return;
  }
  
  // Get migrations from last batch
  const lastBatchMigrations = await batchCollection
    .find({ batch: lastBatch.batch })
    .sort({ appliedAt: -1 })
    .toArray();
  
  console.log(`📦 Rolling back batch #${lastBatch.batch} (${lastBatchMigrations.length} migrations)\n`);
  
  // Load all migrations
  const allMigrations = await loadMigrations();
  const migrationsMap = new Map(allMigrations.map((m) => [m.name, m]));
  
  for (const migration of lastBatchMigrations) {
    console.log(`⬇️  Rolling back: ${migration.name}`);
    
    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would rollback`);
      continue;
    }
    
    try {
      const migrationModule = migrationsMap.get(migration.name);
      if (migrationModule?.down) {
        await migrationModule.down(db);
      }
      await markMigrationRolledBack(db, migration.name);
      console.log(`   ✅ Rolled back successfully\n`);
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}\n`);
      
      if (!FORCE) {
        process.exit(1);
      }
    }
  }
  
  console.log("✅ Rollback completed!\n");
};

/**
 * Show migration status
 */
export const showMigrationStatus = async () => {
  console.log("\n📋 Migration Status\n");
  console.log("─".repeat(50));
  
  const db = mongoose.connection.db;
  const status = await getMigrationStatus(db);
  
  console.log(`\n✅ Applied (${status.applied.length}):`);
  if (status.applied.length === 0) {
    console.log("   (none)");
  } else {
    for (const m of status.applied) {
      console.log(`   • ${m.name}`);
      if (m.meta.description) {
        console.log(`     ${m.meta.description}`);
      }
    }
  }
  
  console.log(`\n⏳ Pending (${status.pending.length}):`);
  if (status.pending.length === 0) {
    console.log("   (none - all caught up!)");
  } else {
    for (const m of status.pending) {
      console.log(`   • ${m.name}`);
      if (m.meta.description) {
        console.log(`     ${m.meta.description}`);
      }
    }
  }
  
  console.log("\n" + "─".repeat(50) + "\n");
};

// ===================================================================
// SEEDING
// ===================================================================

/**
 * Load seed files
 */
const loadSeeds = () => {
  if (!fs.existsSync(SEEDS_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(SEEDS_DIR).filter((f) => f.endsWith(".js"));
  
  return files
    .map((file) => {
      const filePath = path.join(SEEDS_DIR, file);
      const seed = import(filePath).then((mod) => ({
        name: file.replace(".js", ""),
        run: mod.run,
        meta: mod.meta || {},
      }));
      return seed;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Run database seeds
 */
export const runSeeds = async () => {
  console.log("\n🌱 Running database seeds...\n");
  
  const db = mongoose.connection.db;
  const seeds = await loadSeeds();
  
  if (seeds.length === 0) {
    console.log("⚠️  No seed files found\n");
    return;
  }
  
  console.log(`Found ${seeds.length} seed files:\n`);
  
  for (const seed of seeds) {
    console.log(`🌱 Running: ${seed.name}`);
    
    if (seed.meta.description) {
      console.log(`   ${seed.meta.description}`);
    }
    
    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would seed data\n`);
      continue;
    }
    
    try {
      await seed.run(db);
      console.log(`   ✅ Seed completed\n`);
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}\n`);
      
      if (!FORCE) {
        process.exit(1);
      }
    }
  }
  
  console.log("✅ All seeds completed!\n");
};

// ===================================================================
// CLI
// ===================================================================

/**
 * Run CLI commands
 */
export const cli = async (command) => {
  // Ensure mongoose is connected
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.DATABASE_URL || "mongodb://localhost:27017/restaurant";
    await mongoose.connect(mongoUri);
  }
  
  switch (command) {
    case "migrate":
      await runMigrations();
      break;
    case "migrate:rollback":
      await rollbackMigrations();
      break;
    case "migrate:status":
      await showMigrationStatus();
      break;
    case "seed":
      await runSeeds();
      break;
    default:
      console.log(`
Usage: node migrate.js <command>

Commands:
  migrate           Run pending migrations
  migrate:rollback  Rollback last batch
  migrate:status    Show migration status
  seed              Run database seeds

Options:
  --dry-run         Show what would happen without making changes
  --force           Continue despite errors
      `);
  }
  
  await mongoose.disconnect();
  process.exit(0);
};

export default {
  runMigrations,
  rollbackMigrations,
  showMigrationStatus,
  runSeeds,
  cli,
};
