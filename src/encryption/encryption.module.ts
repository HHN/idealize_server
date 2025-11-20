import { Module, Logger } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { 
  EnvVarKeyProvider, 
  DockerSecretProvider, 
  CloudKMSProvider 
} from './providers';
import { IKeyProvider } from './interfaces/key-provider.interface';

/**
 * Factory to select key provider based on environment
 * TODO SH: GDPR encryption - dynamic provider selection for different environments
 * 
 * Provider selection via KEY_PROVIDER environment variable:
 * - 'env-var': EnvVarKeyProvider (local development only)
 * - 'docker-secret': DockerSecretProvider (production with Docker Swarm)
 * - 'cloud-kms': CloudKMSProvider (GCP/AWS - stub, not implemented)
 * 
 * Default: 'env-var' for development, 'docker-secret' for production
 */
function createKeyProvider(): IKeyProvider {
  const logger = new Logger('EncryptionModule');
  const providerType = process.env.KEY_PROVIDER || 'env-var';
  const nodeEnv = process.env.NODE_ENV || 'development';

  //TODO SH: GDPR encryption - warn if using env-var in production
  if (nodeEnv === 'production' && providerType === 'env-var') {
    logger.warn(
      '⚠️  WARNING: Using EnvVarKeyProvider in production is insecure!\n' +
      'Set KEY_PROVIDER=docker-secret or KEY_PROVIDER=cloud-kms for production.'
    );
  }

  //TODO SH: GDPR encryption - select provider based on configuration
  switch (providerType) {
    case 'env-var':
      logger.log('🔑 Using EnvVarKeyProvider (development mode)');
      return new EnvVarKeyProvider();

    case 'docker-secret':
      logger.log('🔑 Using DockerSecretProvider (production mode)');
      return new DockerSecretProvider();

    case 'cloud-kms':
      logger.warn('🔑 Using CloudKMSProvider (STUB - not fully implemented)');
      return new CloudKMSProvider();

    default:
      logger.error(
        `❌ Invalid KEY_PROVIDER: ${providerType}\n` +
        `Valid options: 'env-var', 'docker-secret', 'cloud-kms'\n` +
        `Falling back to EnvVarKeyProvider`
      );
      return new EnvVarKeyProvider();
  }
}

/**
 * Encryption module for GDPR-compliant PII encryption
 * TODO SH: GDPR encryption - provides EncryptionService with pluggable KeyProvider
 * 
 * Usage in other modules:
 * @Module({
 *   imports: [EncryptionModule],
 *   // ...
 * })
 * 
 * Then inject EncryptionService in your services:
 * constructor(private readonly encryptionService: EncryptionService) {}
 */
@Module({
  providers: [
    //TODO SH: GDPR encryption - dynamic provider selection based on environment
    {
      provide: 'IKeyProvider',
      useFactory: () => createKeyProvider(),
    },
    //TODO SH: GDPR encryption - inject IKeyProvider into EncryptionService
    {
      provide: EncryptionService,
      useFactory: (keyProvider: IKeyProvider) => {
        return new EncryptionService(keyProvider);
      },
      inject: ['IKeyProvider'],
    },
  ],
  exports: [EncryptionService],
})
export class EncryptionModule {}
