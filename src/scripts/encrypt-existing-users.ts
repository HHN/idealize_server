import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/user/schemas/user.schema';
import { EncryptionService } from '../encryption/encryption.service';

/**
 * One-time migration script to encrypt existing user PII fields
 * 
 * This script:
 * 1. Finds all users without encrypted PII fields
 * 2. Encrypts firstName, lastName, username, userType, institution, overview
 * 3. Creates *_enc fields while preserving plaintext (for backwards compatibility)
 * 
 * Usage:
 *   npm run build && node dist/scripts/encrypt-existing-users.js
 * 
 * Safety:
 *   - Only processes users missing *_enc fields
 *   - Preserves all existing data
 *   - Can be run multiple times safely
 */

async function migrateExistingUsers() {
  console.log('🔐 Starting PII encryption migration for existing users...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const userModel = app.get<Model<UserDocument>>('UserModel');
    const encryptionService = app.get(EncryptionService);

    // Find users without encrypted firstName (indicates unmigrated user)
    const usersToMigrate = await userModel.find({
      firstName_enc: { $exists: false }
    }).exec();

    console.log(`📊 Found ${usersToMigrate.length} users to migrate\n`);

    if (usersToMigrate.length === 0) {
      console.log('✅ No users need migration. All users already have encrypted PII fields.');
      await app.close();
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersToMigrate) {
      try {
        const updateData: any = {};

        // Encrypt required fields (firstName, lastName, userType)
        if (user.firstName) {
          updateData.firstName_enc = encryptionService.encrypt(user.firstName);
        }
        if (user.lastName) {
          updateData.lastName_enc = encryptionService.encrypt(user.lastName);
        }
        if (user.userType) {
          updateData.userType_enc = encryptionService.encrypt(user.userType);
        }

        // Encrypt optional fields (username, institution, overview)
        if (user.username) {
          updateData.username_enc = encryptionService.encrypt(user.username);
        }
        if (user.institution) {
          updateData.institution_enc = encryptionService.encrypt(user.institution);
        }
        if (user.overview) {
          updateData.overview_enc = encryptionService.encrypt(user.overview);
        }

        // Update user with encrypted fields
        await userModel.updateOne(
          { _id: user._id },
          { $set: updateData }
        );

        successCount++;
        console.log(`✓ Encrypted PII for user: ${user._id} (${user.firstName} ${user.lastName})`);

      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to encrypt user ${user._id}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully encrypted: ${successCount} users`);
    console.log(`❌ Failed: ${errorCount} users`);
    console.log(`📊 Total processed: ${usersToMigrate.length} users`);
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n📝 Next Steps:');
      console.log('   1. Verify encrypted fields in MongoDB Compass');
      console.log('   2. Test login/registration with Flutter app');
      console.log('   3. After verification, plaintext fields can be removed in future migration\n');
    } else {
      console.log('\n⚠️  Migration completed with errors. Review failed users above.\n');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run migration
migrateExistingUsers()
  .then(() => {
    console.log('Migration script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script error:', error);
    process.exit(1);
  });
