#!/usr/bin/env ts-node
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/user/schemas/user.schema';
import { Admin } from '../admins/admin/schemas/admin.schema';

//TODO SH: GDPR encryption - cutover script to drop old email indexes and ensure hashedEmail indexes exist

/**
 * Cutover Index Migration Script
 * 
 * Purpose: Drop legacy plaintext email indexes and ensure hashedEmail indexes exist
 * 
 * Run AFTER:
 * - PR5 backfill is complete (all users/admins encrypted)
 * - Verification that all documents have hashedEmail and email_enc
 * 
 * This script:
 * 1. Drops old 'email' unique indexes from Users and Admins collections
 * 2. Ensures 'hashedEmail' unique indexes exist
 * 3. Removes 'email' and 'recoveryEmail' fields from all documents (point of no return)
 * 
 * Usage:
 *   npm run cutover:indexes          # Live run (destructive!)
 *   npm run cutover:indexes -- --dry-run  # Preview only
 */

class IndexCutoverScript {
  private isDryRun: boolean;
  
  constructor() {
    this.isDryRun = process.argv.includes('--dry-run');
  }

  async execute(): Promise<void> {
    console.log('🚀 Starting Index Cutover Script');
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`🔧 Mode: ${this.isDryRun ? 'DRY-RUN (no changes)' : 'LIVE (destructive!)'}`);
    console.log('');

    // Load environment variables
    require('dotenv').config({ path: './config/env/development.env' });

    const app = await NestFactory.createApplicationContext(AppModule);
    
    try {
      const userModel = app.get<Model<User>>(getModelToken(User.name));
      const adminModel = app.get<Model<Admin>>(getModelToken(Admin.name));

      // Step 1: Verify all documents are encrypted
      console.log('🔍 Step 1: Verifying encryption completeness...');
      await this.verifyEncryption(userModel, adminModel);
      console.log('');

      // Step 2: Drop old email indexes
      console.log('🗑️  Step 2: Dropping old email indexes...');
      await this.dropOldIndexes(userModel, adminModel);
      console.log('');

      // Step 3: Ensure hashedEmail indexes exist
      console.log('📇 Step 3: Ensuring hashedEmail indexes...');
      await this.ensureHashedEmailIndexes(userModel, adminModel);
      console.log('');

      // Step 4: Remove plaintext fields from documents
      console.log('🔥 Step 4: Removing plaintext fields...');
      await this.removePlaintextFields(userModel, adminModel);
      console.log('');

      console.log('═══════════════════════════════════════════════════════════════');
      if (this.isDryRun) {
        console.log('ℹ️  This was a DRY-RUN. No changes were made.');
        console.log('   Run without --dry-run to apply changes.');
      } else {
        console.log('✅ CUTOVER COMPLETE!');
        console.log('⚠️  WARNING: Plaintext email fields have been permanently removed.');
        console.log('   All future operations will use encrypted fields only.');
      }
      console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
      console.error('❌ Cutover failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    } finally {
      await app.close();
    }
  }

  private async verifyEncryption(userModel: Model<User>, adminModel: Model<Admin>): Promise<void> {
    //TODO SH: GDPR encryption - verify all documents encrypted before cutover
    
    // Check users
    const usersWithoutEncryption = await userModel.countDocuments({
      $or: [
        { hashedEmail: { $exists: false } },
        { hashedEmail: null },
        { email_enc: { $exists: false } },
        { email_enc: null },
      ],
    });

    if (usersWithoutEncryption > 0) {
      throw new Error(
        `❌ Found ${usersWithoutEncryption} users without encryption. ` +
        `Run backfill script first: npm run backfill:encryption`
      );
    }

    console.log(`   ✅ All users encrypted (${await userModel.countDocuments()} total)`);

    // Check admins
    const adminsWithoutEncryption = await adminModel.countDocuments({
      $or: [
        { hashedEmail: { $exists: false } },
        { hashedEmail: null },
        { email_enc: { $exists: false } },
        { email_enc: null },
      ],
    });

    if (adminsWithoutEncryption > 0) {
      throw new Error(
        `❌ Found ${adminsWithoutEncryption} admins without encryption. ` +
        `Run backfill script first: npm run backfill:encryption`
      );
    }

    console.log(`   ✅ All admins encrypted (${await adminModel.countDocuments()} total)`);
  }

  private async dropOldIndexes(userModel: Model<User>, adminModel: Model<Admin>): Promise<void> {
    //TODO SH: GDPR encryption - drop legacy plaintext email indexes
    
    try {
      // Get existing indexes
      const userIndexes = await userModel.collection.getIndexes();
      const adminIndexes = await adminModel.collection.getIndexes();

      console.log('   📋 Current User indexes:', Object.keys(userIndexes).join(', '));
      console.log('   📋 Current Admin indexes:', Object.keys(adminIndexes).join(', '));
      console.log('');

      // Drop user email index if it exists
      if (userIndexes['email_1']) {
        if (this.isDryRun) {
          console.log('   🔍 [DRY-RUN] Would drop Users.email_1 index');
        } else {
          await userModel.collection.dropIndex('email_1');
          console.log('   ✅ Dropped Users.email_1 index');
        }
      } else {
        console.log('   ⏭️  Users.email_1 index already removed');
      }

      // Drop admin email index if it exists
      if (adminIndexes['email_1']) {
        if (this.isDryRun) {
          console.log('   🔍 [DRY-RUN] Would drop Admins.email_1 index');
        } else {
          await adminModel.collection.dropIndex('email_1');
          console.log('   ✅ Dropped Admins.email_1 index');
        }
      } else {
        console.log('   ⏭️  Admins.email_1 index already removed');
      }

    } catch (error) {
      if (error.message.includes('index not found')) {
        console.log('   ⏭️  Old indexes already removed');
      } else {
        throw error;
      }
    }
  }

  private async ensureHashedEmailIndexes(userModel: Model<User>, adminModel: Model<Admin>): Promise<void> {
    //TODO SH: GDPR encryption - ensure hashedEmail unique indexes exist
    
    const userIndexes = await userModel.collection.getIndexes();
    const adminIndexes = await adminModel.collection.getIndexes();

    // Check if hashedEmail indexes exist
    const userHasIndex = userIndexes['hashedEmail_1'] !== undefined;
    const adminHasIndex = adminIndexes['hashedEmail_1'] !== undefined;

    if (userHasIndex) {
      console.log('   ✅ Users.hashedEmail_1 index exists');
    } else {
      if (this.isDryRun) {
        console.log('   🔍 [DRY-RUN] Would create Users.hashedEmail_1 unique index');
      } else {
        await userModel.collection.createIndex({ hashedEmail: 1 }, { unique: true });
        console.log('   ✅ Created Users.hashedEmail_1 unique index');
      }
    }

    if (adminHasIndex) {
      console.log('   ✅ Admins.hashedEmail_1 index exists');
    } else {
      if (this.isDryRun) {
        console.log('   🔍 [DRY-RUN] Would create Admins.hashedEmail_1 unique index');
      } else {
        await adminModel.collection.createIndex({ hashedEmail: 1 }, { unique: true });
        console.log('   ✅ Created Admins.hashedEmail_1 unique index');
      }
    }
  }

  private async removePlaintextFields(userModel: Model<User>, adminModel: Model<Admin>): Promise<void> {
    //TODO SH: GDPR encryption - remove plaintext email fields permanently (point of no return!)
    
    console.log('   ⚠️  WARNING: This will permanently delete plaintext email fields!');
    
    if (this.isDryRun) {
      // Count how many documents would be affected
      const usersWithEmail = await userModel.countDocuments({
        $or: [
          { email: { $exists: true } },
          { recoveryEmail: { $exists: true } },
        ],
      });
      
      const adminsWithEmail = await adminModel.countDocuments({
        email: { $exists: true },
      });

      console.log(`   🔍 [DRY-RUN] Would remove 'email' from ${usersWithEmail} users`);
      console.log(`   🔍 [DRY-RUN] Would remove 'recoveryEmail' from users`);
      console.log(`   🔍 [DRY-RUN] Would remove 'email' from ${adminsWithEmail} admins`);
    } else {
      // Remove email and recoveryEmail from users
      const userResult = await userModel.updateMany(
        {},
        {
          $unset: {
            email: '',
            recoveryEmail: '',
          },
        }
      );
      console.log(`   ✅ Removed plaintext fields from ${userResult.modifiedCount} users`);

      // Remove email from admins
      const adminResult = await adminModel.updateMany(
        {},
        {
          $unset: {
            email: '',
          },
        }
      );
      console.log(`   ✅ Removed plaintext fields from ${adminResult.modifiedCount} admins`);
    }
  }
}

// Bootstrap and execute
(async () => {
  const script = new IndexCutoverScript();
  await script.execute();
  process.exit(0);
})();
