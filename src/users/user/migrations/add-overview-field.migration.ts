import { Db } from 'mongodb';

// TODO is SH: Migration to add overview field to existing users collection
// This is backward-compatible; existing users get NULL/undefined overview
export async function up(db: Db) {
  // TODO is SH: Add overview field as optional string with max 500 chars
  // Using MongoDB updateMany with $set to add field to all existing documents
  await db.collection('users').updateMany(
    {},
    {
      $set: {
        overview: null, // TODO is SH: Default to null for existing users
      },
    }
  );
  
  console.log('✅ Migration: Added overview field to users collection');
}

export async function down(db: Db) {
  // TODO is SH: Rollback migration by removing overview field
  await db.collection('users').updateMany(
    {},
    {
      $unset: {
        overview: '',
      },
    }
  );
  
  console.log('✅ Rollback: Removed overview field from users collection');
}
