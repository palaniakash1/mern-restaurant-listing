/**
 * Database Migration CLI
 * 
 * Usage:
 * node api/migrations/migrate.js up     - Run pending migrations
 * node api/migrations/migrate.js down   - Rollback last migration
 * node api/migrations/migrate.js seed  - Run seed data
 */

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const SEEDS_DIR = path.join(__dirname, "seeds");
const MIGRATION_COLLECTION = "_migrations";

const command = process.argv[2] || "status";

async function main() {
  const mongoUri = process.env.DATABASE_URL || "mongodb://localhost:27017/restaurant";
  
  console.log(`Connecting to ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log("Connected!\n");
  
  const db = mongoose.connection.db;
  
  // Ensure migration collection exists
  await db.createCollection(MIGRATION_COLLECTION).catch(() => {});
  
  if (command === "up" || command === "migrate") {
    await runMigrations(db);
  } else if (command === "down" || command === "rollback") {
    await rollbackMigration(db);
  } else if (command === "seed") {
    await runSeeds(db);
  } else {
    await showStatus(db);
  }
  
  await mongoose.disconnect();
  process.exit(0);
}

async function runMigrations(db) {
  const applied = await db.collection(MIGRATION_COLLECTION).find({}).toArray();
  const appliedNames = applied.map(m => m.name);
  
  // Get migration files
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log("No migrations directory found.");
    return;
  }
  
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".js"))
    .sort();
  
  const pending = files.filter(f => !appliedNames.includes(f.replace(".js", "")));
  
  console.log(`Applied: ${applied.length}`);
  console.log(`Pending: ${pending.length}\n`);
  
  for (const file of pending) {
    console.log(`Running: ${file}`);
    const mod = await import(path.join(MIGRATIONS_DIR, file));
    
    if (mod.up) {
      await mod.up(db);
    }
    
    await db.collection(MIGRATION_COLLECTION).insertOne({
      name: file.replace(".js", ""),
      appliedAt: new Date()
    });
    
    console.log(`  ✅ Done\n`);
  }
  
  console.log("All migrations complete!");
}

async function rollbackMigration(db) {
  const last = await db.collection(MIGRATION_COLLECTION)
    .findOne({}, { sort: { appliedAt: -1 } });
  
  if (!last) {
    console.log("No migrations to rollback.");
    return;
  }
  
  console.log(`Rolling back: ${last.name}`);
  
  const mod = await import(path.join(MIGRATIONS_DIR, last.name + ".js"));
  
  if (mod.down) {
    await mod.down(db);
  }
  
  await db.collection(MIGRATION_COLLECTION).deleteOne({ _id: last._id });
  
  console.log("✅ Rollback complete!");
}

async function runSeeds(db) {
  if (!fs.existsSync(SEEDS_DIR)) {
    console.log("No seeds directory found.");
    return;
  }
  
  const files = fs.readdirSync(SEEDS_DIR)
    .filter(f => f.endsWith(".js"))
    .sort();
  
  console.log(`Found ${files.length} seed files.\n`);
  
  for (const file of files) {
    console.log(`Running: ${file}`);
    const mod = await import(path.join(SEEDS_DIR, file));
    
    if (mod.run) {
      await mod.run(db);
    }
    
    console.log(`  ✅ Done\n`);
  }
  
  console.log("All seeds complete!");
}

async function showStatus(db) {
  const applied = await db.collection(MIGRATION_COLLECTION).find({}).toArray();
  
  console.log("Migration Status:\n");
  console.log(`Applied: ${applied.length}`);
  
  for (const m of applied) {
    console.log(`  - ${m.name} (${m.appliedAt})`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
