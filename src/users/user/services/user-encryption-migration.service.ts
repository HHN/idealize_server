import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { EncryptionService } from 'src/encryption/encryption.service';
import { EncryptedField } from 'src/encryption/types/encryption.types';

/**
 * Service for migrating User PII from plaintext to encrypted storage
 * TODO SH: GDPR encryption - one-time migration service for existing users
 * 
 * Features:
 * - Streams users with cursor (memory efficient for large datasets)
 * - Encrypts 7 PII fields: firstName, lastName, email, username, userType, institution, overview
 * - recoveryEmail was encrypted from day 1, so it's excluded
 * - Idempotent: skips already-encrypted fields
 * - Optional plaintext removal after encryption
 * - Detailed logging for audit trail
 * 
 * Usage:
 * 1. Run with removePlain=false to encrypt while keeping plaintext (safe rollback)
 * 2. Verify encrypted data works in production
 * 3. Run with removePlain=true to remove plaintext fields (final cutover)
 */
@Injectable()
export class UserEncryptionMigrationService {
  private readonly logger = new Logger(UserEncryptionMigrationService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Migrate all users from plaintext to encrypted PII storage
   * 
   * Note: recoveryEmail was encrypted from day 1, so it's excluded from migration
   * This migrates 7 fields: firstName, lastName, email, username, userType, institution, overview
   * 
   * @param options.removePlain - If true, removes plaintext fields after encryption
   * @returns Promise that resolves when migration completes
   */
  async migrateAllUsers({ removePlain }: { removePlain: boolean }): Promise<void> {
    this.logger.log('=== Starting User PII Encryption Migration ===');
    this.logger.log(`Mode: ${removePlain ? 'ENCRYPT + REMOVE PLAINTEXT' : 'ENCRYPT ONLY (keep plaintext)'}`);

    let totalScanned = 0;
    let totalUpdated = 0;
    let alreadyMigrated = 0;
    let plaintextRemoved = 0;
    let errors = 0;

    try {
      //TODO SH: GDPR encryption - use cursor for memory-efficient streaming
      const cursor = this.userModel.find().cursor();

      for (let user = await cursor.next(); user != null; user = await cursor.next()) {
        totalScanned++;

        try {
          const updateObj: any = {};
          const unsetObj: any = {};
          let needsUpdate = false;

          //TODO SH: GDPR encryption - encrypt firstName if not already encrypted
          if (!user.firstName_enc && user.firstName) {
            updateObj.firstName_enc = this.encryptionService.encrypt(user.firstName);
            needsUpdate = true;
            if (removePlain) {
              unsetObj.firstName = '';
            }
          }

          //TODO SH: GDPR encryption - encrypt lastName if not already encrypted
          if (!user.lastName_enc && user.lastName) {
            updateObj.lastName_enc = this.encryptionService.encrypt(user.lastName);
            needsUpdate = true;
            if (removePlain) {
              unsetObj.lastName = '';
            }
          }

          //TODO SH: GDPR encryption - encrypt email if not already encrypted
          if (!user.email_enc && user.email) {
            updateObj.email_enc = this.encryptionService.encrypt(user.email);
            needsUpdate = true;
            if (removePlain) {
              unsetObj.email = '';
            }
          }

          //TODO SH: GDPR encryption - encrypt username if not already encrypted
          if (!user.username_enc && user.username) {
            updateObj.username_enc = this.encryptionService.encrypt(user.username);
            needsUpdate = true;
            if (removePlain) {
              unsetObj.username = '';
            }
          }

          //TODO SH: GDPR encryption - encrypt userType if not already encrypted
          if (!user.userType_enc && user.userType) {
            updateObj.userType_enc = this.encryptionService.encrypt(user.userType);
            needsUpdate = true;
            if (removePlain) {
              unsetObj.userType = '';
            }
          }

          //TODO SH: GDPR encryption - encrypt institution if not already encrypted
          if (!user.institution_enc && user.institution) {
            updateObj.institution_enc = this.encryptionService.encrypt(user.institution);
            needsUpdate = true;
            if (removePlain) {
              unsetObj.institution = '';
            }
          }

          //TODO SH: GDPR encryption - encrypt overview if not already encrypted
          if (!user.overview_enc && user.overview) {
            updateObj.overview_enc = this.encryptionService.encrypt(user.overview);
            needsUpdate = true;
            if (removePlain) {
              unsetObj.overview = '';
            }
          }

          //TODO SH: GDPR encryption - encrypt recoveryEmail if not already encrypted
          // Note: recoveryEmail doesn't have a plaintext field in the schema, only recoveryEmail_enc
          // This is intentional - it was encrypted from day 1
          // Keeping this block for consistency but it won't execute since plaintext never existed

          if (needsUpdate) {
            //TODO SH: GDPR encryption - build final update query
            const update: any = { $set: updateObj };
            
            if (removePlain && Object.keys(unsetObj).length > 0) {
              update.$unset = unsetObj;
            }

            //TODO SH: GDPR encryption - apply update atomically
            const result = await this.userModel.updateOne({ _id: user._id }, update);
            
            //TODO SH: DEBUG - log update result to verify MongoDB is actually writing
            if (totalUpdated < 3) {
              this.logger.log(`[DEBUG] User ${user._id}: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
              this.logger.log(`[DEBUG] Update obj keys: ${Object.keys(updateObj).join(', ')}`);
            }
            
            if (result.modifiedCount === 0) {
              this.logger.warn(`User ${user._id}: updateOne matched but modified 0 documents!`);
            }
            
            totalUpdated++;
            
            if (removePlain && Object.keys(unsetObj).length > 0) {
              plaintextRemoved++;
            }

            //TODO SH: GDPR encryption - log progress every 10 users
            if (totalUpdated % 10 === 0) {
              this.logger.log(`Progress: ${totalUpdated} users encrypted (${totalScanned} scanned)`);
            }
          } else {
            alreadyMigrated++;
          }

        } catch (error) {
          errors++;
          this.logger.error(`Failed to migrate user ${user._id}: ${error.message}`);
          //TODO SH: GDPR encryption - continue processing other users on error
        }
      }

      //TODO SH: GDPR encryption - final summary
      this.logger.log('=== Migration Complete ===');
      this.logger.log(`Total users scanned: ${totalScanned}`);
      this.logger.log(`Users encrypted: ${totalUpdated}`);
      this.logger.log(`Already migrated: ${alreadyMigrated}`);
      if (removePlain) {
        this.logger.log(`Plaintext removed: ${plaintextRemoved}`);
      }
      this.logger.log(`Errors: ${errors}`);

      if (errors > 0) {
        throw new Error(`Migration completed with ${errors} errors`);
      }

    } catch (error) {
      this.logger.error('Migration failed', error.message);
      throw error;
    }
  }

  /**
   * Phase 2: Remove plaintext PII fields after encryption is verified
   * TODO SH: GDPR encryption - final cutover step (irreversible without backups)
   * 
   * Safety rules:
   * - Only removes plaintext if the corresponding encrypted field exists
   * - Never removes the last copy of a field
   * - Reuses piiFields mapping for consistency with verifyMigrationStatus()
   * 
   * @returns Promise that resolves when plaintext removal completes
   */
  async removePlaintextFields(): Promise<void> {
    this.logger.log('=== Phase 2: Removing Plaintext PII Fields ===');
    this.logger.warn('⚠️  This operation is IRREVERSIBLE without database backups!');

    let totalScanned = 0;
    let totalUpdated = 0;
    let alreadyClean = 0;
    let errors = 0;

    //TODO SH: GDPR encryption - define PII field pairs (same as verifyMigrationStatus)
    const piiFields = [
      { plain: 'firstName', enc: 'firstName_enc' },
      { plain: 'lastName', enc: 'lastName_enc' },
      { plain: 'email', enc: 'email_enc' },
      { plain: 'username', enc: 'username_enc' },
      { plain: 'userType', enc: 'userType_enc' },
      { plain: 'institution', enc: 'institution_enc' },
      { plain: 'overview', enc: 'overview_enc' },
    ];

    try {
      //TODO SH: GDPR encryption - explicitly select encrypted fields (they have select: false)
      const cursor = this.userModel
        .find()
        .select('+firstName_enc +lastName_enc +email_enc +username_enc +userType_enc +institution_enc +overview_enc')
        .cursor();

      for (let user = await cursor.next(); user != null; user = await cursor.next()) {
        totalScanned++;

        try {
          const unsetObj: any = {};
          let needsUpdate = false;

          //TODO SH: GDPR encryption - only remove plaintext if encrypted version exists
          for (const field of piiFields) {
            const hasEncrypted = user[field.enc] != null;
            const hasPlaintext = user[field.plain] != null && user[field.plain] !== '';

            if (hasEncrypted && hasPlaintext) {
              unsetObj[field.plain] = '';
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            //TODO SH: GDPR encryption - remove plaintext fields atomically
            const result = await this.userModel.updateOne(
              { _id: user._id },
              { $unset: unsetObj }
            );

            //TODO SH: DEBUG - log first few updates
            if (totalUpdated < 3) {
              this.logger.log(`[DEBUG] User ${user._id}: removed ${Object.keys(unsetObj).join(', ')}`);
            }

            if (result.modifiedCount === 0) {
              this.logger.warn(`User ${user._id}: updateOne matched but modified 0 documents!`);
            }

            totalUpdated++;

            //TODO SH: GDPR encryption - log progress every 10 users
            if (totalUpdated % 10 === 0) {
              this.logger.log(`Progress: ${totalUpdated} users cleaned (${totalScanned} scanned)`);
            }
          } else {
            alreadyClean++;
          }

        } catch (error) {
          errors++;
          this.logger.error(`Failed to clean user ${user._id}: ${error.message}`);
          //TODO SH: GDPR encryption - continue processing other users on error
        }
      }

      //TODO SH: GDPR encryption - final summary
      this.logger.log('=== Plaintext Removal Complete ===');
      this.logger.log(`Total users scanned: ${totalScanned}`);
      this.logger.log(`Plaintext removed: ${totalUpdated}`);
      this.logger.log(`Already clean: ${alreadyClean}`);
      this.logger.log(`Errors: ${errors}`);

      if (errors > 0) {
        throw new Error(`Plaintext removal completed with ${errors} errors`);
      }

    } catch (error) {
      this.logger.error('Plaintext removal failed', error.message);
      throw error;
    }
  }

  /**
   * Verify migration status - check how many users are encrypted
   * TODO SH: GDPR encryption - run before migration to estimate work
   * 
   * NEW LOGIC: "Fully encrypted" means all PII fields that exist for a user are encrypted,
   * not that all 7 possible fields exist. Users without institution/overview/username are
   * still "fully encrypted" if their existing fields (firstName, lastName, email, etc.) are encrypted.
   * 
   * @returns Stats about current encryption status
   */
  async verifyMigrationStatus(): Promise<{
    total: number;
    fullyEncrypted: number;
    partiallyEncrypted: number;
    notEncrypted: number;
  }> {
    this.logger.log('=== Verifying Migration Status ===');

    let total = 0;
    let fullyEncrypted = 0;
    let partiallyEncrypted = 0;
    let notEncrypted = 0;

    //TODO SH: GDPR encryption - define PII field pairs (plaintext + encrypted)
    const piiFields = [
      { plain: 'firstName', enc: 'firstName_enc' },
      { plain: 'lastName', enc: 'lastName_enc' },
      { plain: 'email', enc: 'email_enc' },
      { plain: 'username', enc: 'username_enc' },
      { plain: 'userType', enc: 'userType_enc' },
      { plain: 'institution', enc: 'institution_enc' },
      { plain: 'overview', enc: 'overview_enc' },
    ];

    //TODO SH: GDPR encryption - explicitly select encrypted fields (they have select: false in schema)
    const cursor = this.userModel
      .find()
      .select('+firstName_enc +lastName_enc +email_enc +username_enc +userType_enc +institution_enc +overview_enc')
      .cursor();

    for (let user = await cursor.next(); user != null; user = await cursor.next()) {
      total++;

      //TODO SH: GDPR encryption - count relevant fields (any field with data, plaintext OR encrypted)
      let relevantFields = 0;
      let encryptedFieldCount = 0;

      for (const field of piiFields) {
        const hasPlaintext = user[field.plain] != null && user[field.plain] !== '';
        const hasEncrypted = user[field.enc] != null;

        if (hasPlaintext || hasEncrypted) {
          relevantFields++;
        }
        if (hasEncrypted) {
          encryptedFieldCount++;
        }
      }

      //TODO SH: DEBUG - log first user to verify encrypted fields are loaded
      if (total === 1) {
        this.logger.debug(`[VERIFY DEBUG] first user: relevantFields=${relevantFields}, encryptedFields=${encryptedFieldCount}`);
      }

      //TODO SH: GDPR encryption - classify user encryption status
      if (relevantFields === 0) {
        // No PII at all (edge case - shouldn't happen in practice)
        notEncrypted++;
      } else if (encryptedFieldCount === relevantFields) {
        // All existing PII fields are encrypted
        fullyEncrypted++;
      } else if (encryptedFieldCount > 0) {
        // Mix of encrypted and plaintext
        partiallyEncrypted++;
      } else {
        // No encrypted fields
        notEncrypted++;
      }
    }

    const stats = {
      total,
      fullyEncrypted,
      partiallyEncrypted,
      notEncrypted,
    };

    this.logger.log(`Total users: ${stats.total}`);
    this.logger.log(`Fully encrypted: ${stats.fullyEncrypted}`);
    this.logger.log(`Partially encrypted: ${stats.partiallyEncrypted}`);
    this.logger.log(`Not encrypted: ${stats.notEncrypted}`);

    return stats;
  }

  /**
   * Rollback: restore plaintext from encrypted fields
   * TODO SH: GDPR encryption - emergency rollback if issues found
   * 
   * @returns Promise that resolves when rollback completes
   */
  async rollbackEncryption(): Promise<void> {
    this.logger.warn('=== Starting Encryption Rollback ===');
    this.logger.warn('This will decrypt all encrypted fields back to plaintext!');

    let totalScanned = 0;
    let totalRolledBack = 0;
    let errors = 0;

    try {
      const cursor = this.userModel.find().cursor();

      for (let user = await cursor.next(); user != null; user = await cursor.next()) {
        totalScanned++;

        try {
          const updateObj: any = {};
          const unsetObj: any = {};
          let needsUpdate = false;

          //TODO SH: GDPR encryption - decrypt and restore plaintext fields
          if (user.firstName_enc) {
            updateObj.firstName = this.encryptionService.decrypt(user.firstName_enc);
            unsetObj.firstName_enc = '';
            needsUpdate = true;
          }

          if (user.lastName_enc) {
            updateObj.lastName = this.encryptionService.decrypt(user.lastName_enc);
            unsetObj.lastName_enc = '';
            needsUpdate = true;
          }

          if (user.email_enc) {
            updateObj.email = this.encryptionService.decrypt(user.email_enc);
            unsetObj.email_enc = '';
            needsUpdate = true;
          }

          if (user.username_enc) {
            updateObj.username = this.encryptionService.decrypt(user.username_enc);
            unsetObj.username_enc = '';
            needsUpdate = true;
          }

          if (user.userType_enc) {
            updateObj.userType = this.encryptionService.decrypt(user.userType_enc);
            unsetObj.userType_enc = '';
            needsUpdate = true;
          }

          if (user.institution_enc) {
            updateObj.institution = this.encryptionService.decrypt(user.institution_enc);
            unsetObj.institution_enc = '';
            needsUpdate = true;
          }

          if (user.overview_enc) {
            updateObj.overview = this.encryptionService.decrypt(user.overview_enc);
            unsetObj.overview_enc = '';
            needsUpdate = true;
          }

          // Note: recoveryEmail_enc is excluded - it was encrypted from day 1

          if (needsUpdate) {
            await this.userModel.updateOne(
              { _id: user._id },
              { $set: updateObj, $unset: unsetObj }
            );
            totalRolledBack++;

            if (totalRolledBack % 10 === 0) {
              this.logger.log(`Progress: ${totalRolledBack} users rolled back`);
            }
          }

        } catch (error) {
          errors++;
          this.logger.error(`Failed to rollback user ${user._id}: ${error.message}`);
        }
      }

      this.logger.warn('=== Rollback Complete ===');
      this.logger.log(`Total users scanned: ${totalScanned}`);
      this.logger.log(`Users rolled back: ${totalRolledBack}`);
      this.logger.log(`Errors: ${errors}`);

      if (errors > 0) {
        throw new Error(`Rollback completed with ${errors} errors`);
      }

    } catch (error) {
      this.logger.error('Rollback failed', error.message);
      throw error;
    }
  }
}
