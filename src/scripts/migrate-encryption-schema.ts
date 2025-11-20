/**
 * MongoDB Schema Migration Script
 * TODO SH: GDPR encryption - add hashedEmail index for encrypted email lookups
 * 
 * This script creates sparse unique indexes on hashedEmail fields for both
 * User and Admin collections to support GDPR-compliant email lookups.
 * 
 * IMPORTANT: Run this script BEFORE deploying code changes that use hashedEmail.
 * 
 * Prerequisites:
 * - MongoDB connection string in MONGODB_URI environment variable
 * - Database backup completed
 * - Scheduled maintenance window (estimated: 5-10 minutes for 100k users)
 * 
 * What this script does:
 * 1. Connects to MongoDB
 * 2. Creates sparse unique index on users.hashedEmail (background)
 * 3. Creates sparse unique index on admins.hashedEmail (background)
 * 4. Verifies indexes were created successfully
 * 5. Reports on existing data that needs backfill
 * 
 * Rollback:
 * - Drop indexes: db.users.dropIndex('hashedEmail_1')
 * - Drop indexes: db.admins.dropIndex('hashedEmail_1')
 */

import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';

//TODO SH: GDPR encryption - load environment variables
if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: 'config/env/development.env' });
} else if (process.env.NODE_ENV === 'staging') {
  dotenv.config({ path: 'config/env/staging.env' });
} else {
  dotenv.config({ path: 'production.env' });
}

/**
 * Migration configuration
 * TODO SH: GDPR encryption - adjust based on environment
 */
const MIGRATION_CONFIG = {
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  collections: {
    users: 'users',
    admins: 'admins',
  },
};

/**
 * Create sparse unique index on hashedEmail
 * TODO SH: GDPR encryption - background index to avoid write stalls
 * 
 * @param collectionName - Name of collection (users or admins)
 */
async function createHashedEmailIndex(collectionName: string): Promise<void> {
  console.log(`\n📋 Processing collection: ${collectionName}`);
  
  const collection = connection.collection(collectionName);
  
  //TODO SH: GDPR encryption - check if index already exists
  const existingIndexes = await collection.indexes();
  const hasIndex = existingIndexes.some(
    (idx) => idx.name === 'hashedEmail_1' || idx.key?.hashedEmail === 1
  );

  if (hasIndex) {
    console.log(`✅ Index 'hashedEmail_1' already exists on ${collectionName}`);
    return;
  }

  if (MIGRATION_CONFIG.dryRun) {
    console.log(`🔍 [DRY RUN] Would create index on ${collectionName}.hashedEmail`);
    return;
  }

  //TODO SH: GDPR encryption - create sparse unique index in background
  console.log(`🔨 Creating index on ${collectionName}.hashedEmail...`);
  const startTime = Date.now();

  try {
    await collection.createIndex(
      { hashedEmail: 1 },
      {
        unique: true,        //TODO SH: GDPR encryption - enforce uniqueness
        sparse: true,        //TODO SH: GDPR encryption - allow null for GDPR erasure
        background: true,    //TODO SH: GDPR encryption - avoid blocking writes
        name: 'hashedEmail_1',
      }
    );

    const duration = Date.now() - startTime;
    console.log(`✅ Index created successfully in ${duration}ms`);
  } catch (error) {
    console.error(`❌ Failed to create index on ${collectionName}:`, error.message);
    throw error;
  }
}

/**
 * Verify index was created correctly
 * TODO SH: GDPR encryption - check index properties
 */
async function verifyIndex(collectionName: string): Promise<boolean> {
  const collection = connection.collection(collectionName);
  const indexes = await collection.indexes();
  
  const hashedEmailIndex = indexes.find(
    (idx) => idx.name === 'hashedEmail_1'
  );

  if (!hashedEmailIndex) {
    console.error(`❌ Index 'hashedEmail_1' not found on ${collectionName}`);
    return false;
  }

  //TODO SH: GDPR encryption - verify index properties
  const isUnique = hashedEmailIndex.unique === true;
  const isSparse = hashedEmailIndex.sparse === true;

  if (MIGRATION_CONFIG.verbose) {
    console.log(`📊 Index properties on ${collectionName}:`, {
      name: hashedEmailIndex.name,
      unique: isUnique,
      sparse: isSparse,
      key: hashedEmailIndex.key,
    });
  }

  if (!isUnique || !isSparse) {
    console.error(
      `❌ Index on ${collectionName} has incorrect properties:`,
      `unique=${isUnique} (expected: true), sparse=${isSparse} (expected: true)`
    );
    return false;
  }

  console.log(`✅ Index verified on ${collectionName}`);
  return true;
}

/**
 * Analyze existing data for migration planning
 * TODO SH: GDPR encryption - report on documents needing backfill
 */
async function analyzeData(collectionName: string): Promise<void> {
  console.log(`\n📊 Analyzing ${collectionName}...`);
  
  const collection = connection.collection(collectionName);
  
  //TODO SH: GDPR encryption - count total documents
  const totalCount = await collection.countDocuments({});
  
  //TODO SH: GDPR encryption - count documents with plaintext email but no hashedEmail
  const needsBackfill = await collection.countDocuments({
    email: { $exists: true, $ne: null },
    hashedEmail: { $exists: false },
  });
  
  //TODO SH: GDPR encryption - count documents already migrated
  const alreadyMigrated = await collection.countDocuments({
    hashedEmail: { $exists: true, $ne: null },
  });
  
  //TODO SH: GDPR encryption - count soft-deleted documents
  const softDeleted = await collection.countDocuments({
    softDeleted: true,
  });

  console.log(`📈 ${collectionName} statistics:`);
  console.log(`   Total documents: ${totalCount}`);
  console.log(`   Already migrated: ${alreadyMigrated} (${((alreadyMigrated/totalCount)*100).toFixed(1)}%)`);
  console.log(`   Needs backfill: ${needsBackfill} (${((needsBackfill/totalCount)*100).toFixed(1)}%)`);
  console.log(`   Soft-deleted: ${softDeleted}`);

  if (needsBackfill > 0) {
    const estimatedTime = Math.ceil(needsBackfill / 500); // 500 docs/batch
    console.log(`\n⏱️  Estimated backfill time: ~${estimatedTime} minutes (500 docs/min)`);
  }
}

/**
 * Main migration function
 * TODO SH: GDPR encryption - orchestrate index creation and verification
 */
async function migrate(): Promise<void> {
  console.log('🚀 Starting GDPR Encryption Schema Migration');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🔧 Mode: ${MIGRATION_CONFIG.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`🗄️  Database: ${process.env.MONGODB_URI?.split('@')[1] || 'unknown'}`);

  try {
    //TODO SH: GDPR encryption - connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    //TODO SH: GDPR encryption - create indexes on both collections
    await createHashedEmailIndex(MIGRATION_CONFIG.collections.users);
    await createHashedEmailIndex(MIGRATION_CONFIG.collections.admins);

    if (!MIGRATION_CONFIG.dryRun) {
      //TODO SH: GDPR encryption - verify indexes were created correctly
      console.log('\n🔍 Verifying indexes...');
      const usersVerified = await verifyIndex(MIGRATION_CONFIG.collections.users);
      const adminsVerified = await verifyIndex(MIGRATION_CONFIG.collections.admins);

      if (!usersVerified || !adminsVerified) {
        throw new Error('Index verification failed');
      }
    }

    //TODO SH: GDPR encryption - analyze data for backfill planning
    await analyzeData(MIGRATION_CONFIG.collections.users);
    await analyzeData(MIGRATION_CONFIG.collections.admins);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Deploy application code with encryption support');
    console.log('   2. Run backfill script: npm run backfill');
    console.log('   3. Monitor metrics: plaintextFallbackCount should decrease');
    console.log('   4. After 100% migration, run cutover script');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n🔄 Rollback commands:');
    console.error(`   db.${MIGRATION_CONFIG.collections.users}.dropIndex('hashedEmail_1')`);
    console.error(`   db.${MIGRATION_CONFIG.collections.admins}.dropIndex('hashedEmail_1')`);
    process.exit(1);
  } finally {
    //TODO SH: GDPR encryption - close database connection
    await connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

/**
 * Rollback function to drop indexes
 * TODO SH: GDPR encryption - emergency rollback if needed
 */
async function rollback(): Promise<void> {
  console.log('🔄 Starting rollback...');

  try {
    await connect(process.env.MONGODB_URI!);
    
    const usersCollection = connection.collection(MIGRATION_CONFIG.collections.users);
    const adminsCollection = connection.collection(MIGRATION_CONFIG.collections.admins);

    //TODO SH: GDPR encryption - drop hashedEmail indexes
    try {
      await usersCollection.dropIndex('hashedEmail_1');
      console.log(`✅ Dropped index on ${MIGRATION_CONFIG.collections.users}`);
    } catch (error) {
      console.log(`⚠️  Index not found on ${MIGRATION_CONFIG.collections.users}`);
    }

    try {
      await adminsCollection.dropIndex('hashedEmail_1');
      console.log(`✅ Dropped index on ${MIGRATION_CONFIG.collections.admins}`);
    } catch (error) {
      console.log(`⚠️  Index not found on ${MIGRATION_CONFIG.collections.admins}`);
    }

    console.log('✅ Rollback completed');
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    process.exit(1);
  } finally {
    await connection.close();
  }
}

//TODO SH: GDPR encryption - execute migration or rollback
if (require.main === module) {
  const isRollback = process.argv.includes('--rollback');
  
  if (isRollback) {
    rollback();
  } else {
    migrate();
  }
}

export { migrate, rollback };
