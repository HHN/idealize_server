//TODO SH: GDPR encryption - backfill script to encrypt existing plaintext emails
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/user/schemas/user.schema';
import { Admin, AdminDocument } from '../admins/admin/schemas/admin.schema';
import { EncryptionService } from '../encryption/encryption.service';
import { normalizeEmail } from '../shared/utils/email.utils';

/**
 * Backfill script to encrypt existing plaintext emails
 * TODO SH: GDPR encryption - migrates legacy users to encrypted format
 * 
 * Features:
 * - Cursor-based pagination (memory efficient)
 * - Batch processing (500 docs at a time)
 * - Dry-run mode (preview without changes)
 * - Idempotent (safe to re-run)
 * - Resume capability (skips already encrypted)
 * - Comprehensive statistics
 * 
 * Usage:
 *   npm run backfill:encryption              # Live run
 *   npm run backfill:encryption -- --dry-run # Preview only
 *   npm run backfill:encryption -- --verbose # Detailed logging
 */

interface BackfillStats {
  usersTotal: number;
  usersProcessed: number;
  usersEncrypted: number;
  usersSkipped: number;
  usersFailed: number;
  adminsTotal: number;
  adminsProcessed: number;
  adminsEncrypted: number;
  adminsSkipped: number;
  adminsFailed: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

class EncryptionBackfillScript {
  private stats: BackfillStats;
  private isDryRun: boolean;
  private isVerbose: boolean;
  private batchSize = 500;

  constructor(
    private userModel: Model<UserDocument>,
    private adminModel: Model<AdminDocument>,
    private encryptionService: EncryptionService,
  ) {
    this.isDryRun = process.argv.includes('--dry-run');
    this.isVerbose = process.argv.includes('--verbose');
    
    this.stats = {
      usersTotal: 0,
      usersProcessed: 0,
      usersEncrypted: 0,
      usersSkipped: 0,
      usersFailed: 0,
      adminsTotal: 0,
      adminsProcessed: 0,
      adminsEncrypted: 0,
      adminsSkipped: 0,
      adminsFailed: 0,
      startTime: new Date(),
    };
  }

  /**
   * Main execution method
   * TODO SH: GDPR encryption - orchestrates backfill for both collections
   */
  async execute(): Promise<void> {
    console.log('🚀 Starting GDPR Encryption Backfill');
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`🔧 Mode: ${this.isDryRun ? 'DRY-RUN (no changes)' : 'LIVE'}`);
    console.log('');

    //TODO SH: GDPR encryption - backfill script no longer needed after PR6 cutover
    //NOTE: This script is DISABLED post-cutover (plaintext email field removed from schema)
    console.error('⚠️  WARNING: This backfill script is for pre-cutover migration only!');
    console.error('⚠️  After PR6, plaintext email fields no longer exist in the schema.');
    console.error('⚠️  All new users are automatically encrypted via UserService/AdminService.');
    console.error('');
    console.error('❌ ABORTING: Run this script BEFORE PR6 cutover, not after.');
    console.error('💡 TIP: All future users will be automatically encrypted at creation.');
    process.exit(1);
  }

  // @ts-ignore - Script disabled post-cutover, code never executes
  /**
   * Backfill users collection
}

    try {
      //TODO SH: GDPR encryption - backfill users collection
      await this.backfillUsers();
      console.log('');

      //TODO SH: GDPR encryption - backfill admins collection
      await this.backfillAdmins();
      console.log('');

      this.stats.endTime = new Date();
      this.stats.duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();

      this.printSummary();

      if (this.stats.usersFailed > 0 || this.stats.adminsFailed > 0) {
        console.error('⚠️  Some documents failed to encrypt. Review errors above.');
        process.exit(1);
      }

      console.log('✅ Backfill completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('❌ Fatal error during backfill:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Backfill users collection
   * TODO SH: GDPR encryption - cursor-based batch processing for users
   */
  private async backfillUsers(): Promise<void> {
    console.log('👥 Processing Users collection...');

    //TODO SH: GDPR encryption - count users needing encryption
    const totalUsers = await this.userModel.countDocuments({
      email: { $exists: true, $ne: null },
      $or: [
        { email_enc: { $exists: false } },
        { email_enc: null },
      ],
    });

    this.stats.usersTotal = totalUsers;
    console.log(`   Found ${totalUsers} users to process`);

    if (totalUsers === 0) {
      console.log('   ✅ All users already encrypted!');
      return;
    }

    //TODO SH: GDPR encryption - cursor-based pagination for memory efficiency
    let lastId: any = null;
    let processedCount = 0;

    while (processedCount < totalUsers) {
      //TODO SH: GDPR encryption - fetch batch using cursor
      const query: any = {
        email: { $exists: true, $ne: null },
        $or: [
          { email_enc: { $exists: false } },
          { email_enc: null },
        ],
      };

      if (lastId) {
        query._id = { $gt: lastId };
      }

      const batch = await this.userModel
        .find(query)
        .sort({ _id: 1 })
        .limit(this.batchSize)
        .select('+email +recoveryEmail')
        .exec();

      if (batch.length === 0) break;

      //TODO SH: GDPR encryption - process batch
      await this.processBatch(batch, 'user');

      lastId = batch[batch.length - 1]._id;
      processedCount += batch.length;

      const percentage = ((processedCount / totalUsers) * 100).toFixed(1);
      console.log(`   Progress: ${processedCount}/${totalUsers} (${percentage}%)`);
    }

    console.log(`   ✅ Users: ${this.stats.usersEncrypted} encrypted, ${this.stats.usersSkipped} skipped, ${this.stats.usersFailed} failed`);
  }

  /**
   * Backfill admins collection
   * TODO SH: GDPR encryption - cursor-based batch processing for admins
   */
  private async backfillAdmins(): Promise<void> {
    console.log('👨‍💼 Processing Admins collection...');

    //TODO SH: GDPR encryption - count admins needing encryption
    const totalAdmins = await this.adminModel.countDocuments({
      email: { $exists: true, $ne: null },
      $or: [
        { email_enc: { $exists: false } },
        { email_enc: null },
      ],
    });

    this.stats.adminsTotal = totalAdmins;
    console.log(`   Found ${totalAdmins} admins to process`);

    if (totalAdmins === 0) {
      console.log('   ✅ All admins already encrypted!');
      return;
    }

    //TODO SH: GDPR encryption - cursor-based pagination
    let lastId: any = null;
    let processedCount = 0;

    while (processedCount < totalAdmins) {
      const query: any = {
        email: { $exists: true, $ne: null },
        $or: [
          { email_enc: { $exists: false } },
          { email_enc: null },
        ],
      };

      if (lastId) {
        query._id = { $gt: lastId };
      }

      const batch = await this.adminModel
        .find(query)
        .sort({ _id: 1 })
        .limit(this.batchSize)
        .select('+email')
        .exec();

      if (batch.length === 0) break;

      //TODO SH: GDPR encryption - process batch
      await this.processBatch(batch, 'admin');

      lastId = batch[batch.length - 1]._id;
      processedCount += batch.length;

      const percentage = ((processedCount / totalAdmins) * 100).toFixed(1);
      console.log(`   Progress: ${processedCount}/${totalAdmins} (${percentage}%)`);
    }

    console.log(`   ✅ Admins: ${this.stats.adminsEncrypted} encrypted, ${this.stats.adminsSkipped} skipped, ${this.stats.adminsFailed} failed`);
  }

  /**
   * Process a batch of documents
   * TODO SH: GDPR encryption - encrypt emails in batch with error handling
   */
  private async processBatch(
    documents: (UserDocument | AdminDocument)[],
    type: 'user' | 'admin',
  ): Promise<void> {
    const promises = documents.map(doc => this.processDocument(doc, type));
    await Promise.allSettled(promises);
  }

  /**
   * Process a single document
   * TODO SH: GDPR encryption - encrypt email and recoveryEmail for one document
   */
  private async processDocument(
    doc: UserDocument | AdminDocument,
    type: 'user' | 'admin',
  ): Promise<void> {
    try {
      this.stats[type === 'user' ? 'usersProcessed' : 'adminsProcessed']++;

      //TODO SH: GDPR encryption - skip if no email
      // @ts-expect-error - Plaintext email field removed in PR6
      if (!doc.email) {
        if (this.isVerbose) {
          console.log(`   ⚠️  Skipping ${type} ${doc._id}: no email`);
        }
        this.stats[type === 'user' ? 'usersSkipped' : 'adminsSkipped']++;
        return;
      }

      //TODO SH: GDPR encryption - skip if already encrypted (idempotent)
      if ((doc as any).email_enc?.ciphertext) {
        if (this.isVerbose) {
          console.log(`   ⏭️  Skipping ${type} ${doc._id}: already encrypted`);
        }
        this.stats[type === 'user' ? 'usersSkipped' : 'adminsSkipped']++;
        return;
      }

      //TODO SH: GDPR encryption - normalize and encrypt email
      // @ts-expect-error - Plaintext email field removed in PR6
      const normalizedEmail = normalizeEmail(doc.email);
      const hashedEmail = this.encryptionService.hmacIndex(normalizedEmail);
      const email_enc = this.encryptionService.encrypt(normalizedEmail);

      const updateData: any = {
        hashedEmail,
        email_enc,
      };

      //TODO SH: GDPR encryption - also encrypt recovery email if present
      // @ts-expect-error - Plaintext recoveryEmail field removed in PR6
      if (type === 'user' && (doc as UserDocument).recoveryEmail) {
        // @ts-expect-error - Plaintext recoveryEmail field removed in PR6
        const normalizedRecoveryEmail = normalizeEmail((doc as UserDocument).recoveryEmail);
        updateData.recoveryEmail_enc = this.encryptionService.encrypt(normalizedRecoveryEmail);
      }

      if (this.isDryRun) {
        if (this.isVerbose) {
          // @ts-expect-error - Plaintext email field removed in PR6
          console.log(`   🔍 [DRY-RUN] Would encrypt ${type} ${doc._id}: ${doc.email}`);
        }
      } else {
        //TODO SH: GDPR encryption - update document in database
        if (type === 'user') {
          await this.userModel.updateOne({ _id: doc._id }, { $set: updateData });
        } else {
          await this.adminModel.updateOne({ _id: doc._id }, { $set: updateData });
        }

        if (this.isVerbose) {
          // @ts-expect-error - Plaintext email field removed in PR6
          console.log(`   ✅ Encrypted ${type} ${doc._id}: ${doc.email}`);
        }
      }

      this.stats[type === 'user' ? 'usersEncrypted' : 'adminsEncrypted']++;
    } catch (error) {
      console.error(`   ❌ Failed to encrypt ${type} ${doc._id}:`, error.message);
      this.stats[type === 'user' ? 'usersFailed' : 'adminsFailed']++;
    }
  }

  /**
   * Print summary statistics
   * TODO SH: GDPR encryption - display comprehensive results
   */
  private printSummary(): void {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 BACKFILL SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    console.log('👥 Users:');
    console.log(`   Total found:       ${this.stats.usersTotal}`);
    console.log(`   Processed:         ${this.stats.usersProcessed}`);
    console.log(`   ✅ Encrypted:      ${this.stats.usersEncrypted}`);
    console.log(`   ⏭️  Skipped:        ${this.stats.usersSkipped}`);
    console.log(`   ❌ Failed:         ${this.stats.usersFailed}`);
    console.log('');

    console.log('👨‍💼 Admins:');
    console.log(`   Total found:       ${this.stats.adminsTotal}`);
    console.log(`   Processed:         ${this.stats.adminsProcessed}`);
    console.log(`   ✅ Encrypted:      ${this.stats.adminsEncrypted}`);
    console.log(`   ⏭️  Skipped:        ${this.stats.adminsSkipped}`);
    console.log(`   ❌ Failed:         ${this.stats.adminsFailed}`);
    console.log('');

    const totalEncrypted = this.stats.usersEncrypted + this.stats.adminsEncrypted;
    const totalFailed = this.stats.usersFailed + this.stats.adminsFailed;

    console.log('📈 Overall:');
    console.log(`   Total encrypted:   ${totalEncrypted}`);
    console.log(`   Total failed:      ${totalFailed}`);
    console.log(`   Duration:          ${(this.stats.duration! / 1000).toFixed(2)}s`);
    console.log('');

    if (this.isDryRun) {
      console.log('ℹ️  This was a DRY-RUN. No changes were made to the database.');
      console.log('   Run without --dry-run to apply changes.');
    } else {
      console.log('✅ Changes committed to database.');
    }

    console.log('═══════════════════════════════════════════════════════════════');
  }
}

/**
 * Bootstrap and run the backfill script
 * TODO SH: GDPR encryption - initialize NestJS app and execute backfill
 */
async function bootstrap() {
  //TODO SH: GDPR encryption - load environment variables
  require('dotenv').config({ path: './config/env/development.env' });

  try {
    //TODO SH: GDPR encryption - create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });

    //TODO SH: GDPR encryption - get required services from DI container
    const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    const adminModel = app.get<Model<AdminDocument>>(getModelToken(Admin.name));
    const encryptionService = app.get<EncryptionService>(EncryptionService);

    //TODO SH: GDPR encryption - run backfill script (renamed method to execute)
    const script = new EncryptionBackfillScript(userModel, adminModel, encryptionService);
    await script.execute();

    //TODO SH: GDPR encryption - cleanup
    await app.close();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

//TODO SH: GDPR encryption - execute if run directly
if (require.main === module) {
  bootstrap();
}
