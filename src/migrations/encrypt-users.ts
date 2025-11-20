import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserEncryptionMigrationService } from '../users/user/services/user-encryption-migration.service';

/**
 * TODO SH: GDPR encryption - CLI tool for encrypting existing user PII
 * 
 * This script provides a safe, phased approach to encrypting existing user data:
 * 
 * PHASE 1 - ENCRYPT ONLY (keep plaintext for rollback):
 * ```bash
 * npm run ts-node src/migrations/encrypt-users.ts -- --mode=encrypt-only
 * ```
 * - Creates encrypted versions of all PII fields
 * - Keeps plaintext fields intact (safe rollback)
 * - Test in staging/production with dual-field approach
 * 
 * PHASE 2 - REMOVE PLAINTEXT (final cutover):
 * ```bash
 * npm run ts-node src/migrations/encrypt-users.ts -- --mode=remove-plain
 * ```
 * - Removes plaintext fields after encryption verified
 * - Point of no return (unless you have backups)
 * - Run only after confirming encrypted data works
 * 
 * VERIFY STATUS (check current encryption state):
 * ```bash
 * npm run ts-node src/migrations/encrypt-users.ts -- --mode=verify
 * ```
 * - Shows how many users are fully/partially encrypted
 * - Run before migration to estimate work
 * 
 * ROLLBACK (emergency recovery):
 * ```bash
 * npm run ts-node src/migrations/encrypt-users.ts -- --mode=rollback
 * ```
 * - Decrypts all encrypted fields back to plaintext
 * - Removes *_enc fields
 * - Use only if critical issues found
 * 
 * EXAMPLES:
 * ```bash
 * # Development: encrypt users while keeping plaintext
 * npm run ts-node src/migrations/encrypt-users.ts -- --mode=encrypt-only
 * 
 * # Production: check status first
 * npm run ts-node src/migrations/encrypt-users.ts -- --mode=verify
 * 
 * # Production: encrypt in phase 1 (reversible)
 * npm run ts-node src/migrations/encrypt-users.ts -- --mode=encrypt-only
 * 
 * # After 1-2 weeks of testing: finalize cutover
 * npm run ts-node src/migrations/encrypt-users.ts -- --mode=remove-plain
 * ```
 * 
 * EXIT CODES:
 * - 0: Success
 * - 1: Invalid mode argument
 * - 2: Migration failed with errors
 */

async function bootstrap() {
  console.log('=== User PII Encryption Migration Tool ===');
  console.log('Starting application...\n');

  try {
    //TODO SH: GDPR encryption - parse CLI arguments
    const args = process.argv.slice(2);
    const modeArg = args.find(arg => arg.startsWith('--mode='));
    
    if (!modeArg) {
      console.error('ERROR: Missing --mode argument');
      console.error('\nUsage:');
      console.error('  npm run ts-node src/migrations/encrypt-users.ts -- --mode=encrypt-only');
      console.error('  npm run ts-node src/migrations/encrypt-users.ts -- --mode=remove-plain');
      console.error('  npm run ts-node src/migrations/encrypt-users.ts -- --mode=verify');
      console.error('  npm run ts-node src/migrations/encrypt-users.ts -- --mode=rollback');
      console.error('\nModes:');
      console.error('  encrypt-only  - Encrypt PII while keeping plaintext (safe, reversible)');
      console.error('  remove-plain  - Remove plaintext fields after encryption (final cutover)');
      console.error('  verify        - Check current encryption status (read-only)');
      console.error('  rollback      - Decrypt and remove encrypted fields (emergency only)');
      process.exit(1);
    }

    const mode = modeArg.split('=')[1];

    if (!['encrypt-only', 'remove-plain', 'verify', 'rollback'].includes(mode)) {
      console.error(`ERROR: Invalid mode "${mode}"`);
      console.error('Valid modes: encrypt-only, remove-plain, verify, rollback');
      process.exit(1);
    }

    //TODO SH: GDPR encryption - bootstrap NestJS application (no HTTP server)
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    //TODO SH: GDPR encryption - get migration service from DI container
    const migrationService = app.get(UserEncryptionMigrationService);

    console.log(`Mode: ${mode}\n`);

    //TODO SH: GDPR encryption - execute requested operation
    if (mode === 'verify') {
      const stats = await migrationService.verifyMigrationStatus();
      console.log('\n✅ Verification complete');
      
      if (stats.notEncrypted > 0) {
        console.log(`\n⚠️  ${stats.notEncrypted} users need encryption`);
        console.log('Run with --mode=encrypt-only to encrypt them');
      } else if (stats.total === stats.fullyEncrypted) {
        console.log('\n✅ All users are fully encrypted!');
      }
      
    } else if (mode === 'encrypt-only') {
      console.log('⚠️  PHASE 1: Encrypting PII while keeping plaintext');
      console.log('This is safe and reversible. Plaintext fields remain for rollback.\n');
      
      await migrationService.migrateAllUsers({ removePlain: false });
      console.log('\n✅ Encryption complete!');
      console.log('Plaintext fields are still present for backwards compatibility.');
      console.log('Test your application thoroughly before running --mode=remove-plain');
      
    } else if (mode === 'remove-plain') {
      console.log('⚠️  PHASE 2: Removing plaintext fields (FINAL CUTOVER)');
      console.log('⚠️  WARNING: This is irreversible without backups!\n');
      
      // Give user 5 seconds to cancel
      console.log('Starting in 5 seconds... (Ctrl+C to cancel)');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await migrationService.removePlaintextFields();
      console.log('\n✅ Plaintext removal complete!');
      console.log('All PII is now stored in encrypted format only.');
      console.log('Run --mode=verify to confirm all users are fully encrypted.');
      
    } else if (mode === 'rollback') {
      console.log('⚠️  EMERGENCY ROLLBACK: Decrypting all PII back to plaintext');
      console.log('⚠️  WARNING: This will remove all *_enc fields!\n');
      
      // Give user 5 seconds to cancel
      console.log('Starting in 5 seconds... (Ctrl+C to cancel)');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await migrationService.rollbackEncryption();
      console.log('\n✅ Rollback complete!');
      console.log('All PII is now stored in plaintext format.');
    }

    //TODO SH: GDPR encryption - cleanup and exit
    await app.close();
    console.log('\nApplication closed successfully');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(2);
  }
}

//TODO SH: GDPR encryption - run migration
bootstrap();
