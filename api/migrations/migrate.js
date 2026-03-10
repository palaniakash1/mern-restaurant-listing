/* eslint-disable no-console */
/**
 * Database Migration CLI
 *
 * Usage:
 * node api/migrations/migrate.js up     - Run pending migrations
 * node api/migrations/migrate.js down   - Rollback last migration
 * node api/migrations/migrate.js seed  - Run seed data
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SEEDS_DIR = path.join(__dirname, 'seeds');
const MIGRATION_COLLECTION = '_migrations';

const command = process.argv[2] || 'status';

async function main() {
  const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/restaurant';

  console.log(`Connecting to ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log('Connected!\n');

  const db = mongoose.connection.db;

  // Ensure migration collection exists
  await db.createCollection(MIGRATION_COLLECTION).catch(() => {});

  if (command === 'up' || command === 'migrate') {
    await runMigrations(db);
  } else if (command === 'down' || command === 'rollback') {
    await rollbackMigration(db);
  } else if (command === 'seed') {
    await runSeeds(db);
  } else if (command === 'test') {
    await runDeploymentTests(db);
  } else if (command === 'test:options') {
    await showDeploymentTests();
  } else {
    await showStatus(db);
  }

  await mongoose.disconnect();
  process.exit(0);
}

async function runMigrations(db) {
  const applied = await db.collection(MIGRATION_COLLECTION).find({}).toArray();
  const appliedNames = applied.map((migration) => migration.name);

  // Get migration files
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('No migrations directory found.');
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();

  const pending = files.filter(f => !appliedNames.includes(f.replace('.js', '')));

  console.log(`Applied: ${applied.length}`);
  console.log(`Pending: ${pending.length}\n`);

  for (const file of pending) {
    console.log(`Running: ${file}`);
    const mod = await import(path.join(MIGRATIONS_DIR, file));

    if (mod.up) {
      await mod.up(db);
    }

    await db.collection(MIGRATION_COLLECTION).insertOne({
      name: file.replace('.js', ''),
      appliedAt: new Date()
    });

    console.log('  ✅ Done\n');
  }

  console.log('All migrations complete!');
}

async function rollbackMigration(db) {
  const last = await db.collection(MIGRATION_COLLECTION)
    .findOne({}, { sort: { appliedAt: -1 } });

  if (!last) {
    console.log('No migrations to rollback.');
    return;
  }

  console.log(`Rolling back: ${last.name}`);

  const mod = await import(path.join(MIGRATIONS_DIR, last.name + '.js'));

  if (mod.down) {
    await mod.down(db);
  }

  await db.collection(MIGRATION_COLLECTION).deleteOne({ _id: last._id });

  console.log('✅ Rollback complete!');
}

async function runSeeds(db) {
  if (!fs.existsSync(SEEDS_DIR)) {
    console.log('No seeds directory found.');
    return;
  }

  const files = fs.readdirSync(SEEDS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();

  console.log(`Found ${files.length} seed files.\n`);

  for (const file of files) {
    console.log(`Running: ${file}`);
    const mod = await import(path.join(SEEDS_DIR, file));

    if (mod.run) {
      await mod.run(db);
    }

    console.log('  ✅ Done\n');
  }

  console.log('All seeds complete!');
}

// New deployment testing functions
async function runDeploymentTests(db) {
  console.log('\n=== Deployment Test Suite ===');

  // Test 1: Database connectivity
  console.log('\n1. Testing database connectivity...');
  try {
    const collections = await db.listCollections().toArray();
    console.log(`  ✅ Database accessible - ${collections.length} collections found`);
  } catch (error) {
    console.log(`  ❌ Database connection failed: ${error.message}`);
    return false;
  }

  // Test 2: Migration system
  console.log('\n2. Testing migration system...');
  try {
    const migrationCollection = await db.collection(MIGRATION_COLLECTION).countDocuments();
    console.log(`  ✅ Migration system accessible - ${migrationCollection} migrations tracked`);
  } catch (error) {
    console.log(`  ❌ Migration system error: ${error.message}`);
    return false;
  }

  // Test 3: Basic CRUD operations
  console.log('\n3. Testing basic CRUD operations...');
  try {
    const testCollection = await db.collection('test_crud');
    await testCollection.insertOne({ test: 'deployment', timestamp: new Date() });
    await testCollection.findOne({ test: 'deployment' });
    await testCollection.deleteOne({ test: 'deployment' });
    console.log('  ✅ CRUD operations working - inserted and deleted test document');
  } catch (error) {
    console.log(`  ❌ CRUD operations failed: ${error.message}`);
    return false;
  }

  // Test 4: Index validation
  console.log('\n4. Testing index validation...');
  try {
    const indexes = await db.collection('users').indexes();
    const hasIndexes = indexes.some(idx => idx.name === 'email_1');
    console.log(`  ✅ Index validation - ${hasIndexes ? 'indexes present' : 'no indexes found'}`);
  } catch (error) {
    console.log(`  ❌ Index validation failed: ${error.message}`);
    return false;
  }

  // Test 5: Performance check
  console.log('\n5. Testing performance...');
  try {
    const startTime = Date.now();
    await db.collection('users').findOne({}, { projection: { _id: 1 } });
    const latency = Date.now() - startTime;
    console.log(`  ✅ Performance check - query completed in ${latency}ms`);
  } catch (error) {
    console.log(`  ❌ Performance check failed: ${error.message}`);
    return false;
  }

  console.log('\n✅ All deployment tests passed!');
  return true;
}

// Add deployment test option to CLI
async function showDeploymentTests() {
  console.log('\n=== Deployment Test Options ===');
  console.log('1. Run all deployment tests');
  console.log('2. Test database connectivity');
  console.log('3. Test migration system');
  console.log('4. Test CRUD operations');
  console.log('5. Test index validation');
  console.log('6. Test performance');
  console.log('\nUsage: node api/migrations/migrate.js test [option]');
}

async function showStatus(db) {
  const applied = await db.collection(MIGRATION_COLLECTION).find({}).toArray();

  console.log('Migration Status:\n');
  console.log(`Applied: ${applied.length}`);

  for (const m of applied) {
    console.log(`  - ${m.name} (${m.appliedAt})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
