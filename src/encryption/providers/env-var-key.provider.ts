import { Injectable, Logger } from '@nestjs/common';
import { IKeyProvider } from '../interfaces/key-provider.interface';

/**
 * Environment variable-based key provider
 * TODO SH: GDPR encryption - for local development only, use Docker Secrets in production
 * 
 * Loads encryption keys from environment variables:
 * - ENCRYPTION_KEY_VERSION: Current key version (e.g., 'v1')
 * - ENCRYPTION_DEK_B64: Base64-encoded 32-byte DEK
 * - ENCRYPTION_HMAC_KEY_B64: Base64-encoded 32-byte HMAC key
 * 
 * WARNING: In production, use DockerSecretProvider or CloudKMSProvider.
 * Never commit actual keys to .env files.
 */
@Injectable()
export class EnvVarKeyProvider implements IKeyProvider {
  private readonly logger = new Logger(EnvVarKeyProvider.name);
  
  //TODO SH: GDPR encryption - cache decoded keys to avoid repeated base64 decoding
  private dekCache: Map<string, Buffer> = new Map();
  private hmacKeyCache: Map<string, Buffer> = new Map();

  constructor() {
    //TODO SH: GDPR encryption - validate required env vars on startup
    this.validateEnvironment();
  }

  /**
   * Get current key version from environment
   * TODO SH: GDPR encryption - defaults to 'v1' if not set
   */
  currentKid(): string {
    return process.env.ENCRYPTION_KEY_VERSION || 'v1';
  }

  /**
   * Get data encryption key for specified version
   * TODO SH: GDPR encryption - only supports current version in this provider
   */
  getDEK(kid?: string): Buffer {
    const targetKid = kid || this.currentKid();
    
    //TODO SH: GDPR encryption - check cache first
    if (this.dekCache.has(targetKid)) {
      return this.dekCache.get(targetKid)!;
    }

    //TODO SH: GDPR encryption - for now, only current key version supported
    if (targetKid !== this.currentKid()) {
      throw new Error(
        `Key version ${targetKid} not found. EnvVarKeyProvider only supports current version.`,
      );
    }

    const dekBase64 = process.env.ENCRYPTION_DEK_B64;
    if (!dekBase64) {
      throw new Error('ENCRYPTION_DEK_B64 environment variable not set');
    }

    //TODO SH: GDPR encryption - decode and validate length
    const dek = Buffer.from(dekBase64, 'base64');
    if (dek.length !== 32) {
      throw new Error(`DEK must be 32 bytes, got ${dek.length} bytes`);
    }

    this.dekCache.set(targetKid, dek);
    return dek;
  }

  /**
   * Get HMAC key for specified version
   * TODO SH: GDPR encryption - only supports current version in this provider
   */
  getHMACKey(kid?: string): Buffer {
    const targetKid = kid || this.currentKid();
    
    //TODO SH: GDPR encryption - check cache first
    if (this.hmacKeyCache.has(targetKid)) {
      return this.hmacKeyCache.get(targetKid)!;
    }

    //TODO SH: GDPR encryption - for now, only current key version supported
    if (targetKid !== this.currentKid()) {
      throw new Error(
        `Key version ${targetKid} not found. EnvVarKeyProvider only supports current version.`,
      );
    }

    const hmacKeyBase64 = process.env.ENCRYPTION_HMAC_KEY_B64;
    if (!hmacKeyBase64) {
      throw new Error('ENCRYPTION_HMAC_KEY_B64 environment variable not set');
    }

    //TODO SH: GDPR encryption - decode and validate length
    const hmacKey = Buffer.from(hmacKeyBase64, 'base64');
    if (hmacKey.length !== 32) {
      throw new Error(`HMAC key must be 32 bytes, got ${hmacKey.length} bytes`);
    }

    this.hmacKeyCache.set(targetKid, hmacKey);
    return hmacKey;
  }

  /**
   * Check if provider is healthy
   * TODO SH: GDPR encryption - validates keys are available and correct length
   */
  async isHealthy(): Promise<boolean> {
    try {
      const kid = this.currentKid();
      const dek = this.getDEK(kid);
      const hmacKey = this.getHMACKey(kid);
      
      //TODO SH: GDPR encryption - verify keys are correct length
      return dek.length === 32 && hmacKey.length === 32;
    } catch (error) {
      this.logger.error('Key provider health check failed', error.message);
      return false;
    }
  }

  /**
   * Validate environment variables on startup
   * TODO SH: GDPR encryption - fail fast if configuration invalid
   */
  private validateEnvironment(): void {
    const requiredVars = ['ENCRYPTION_DEK_B64', 'ENCRYPTION_HMAC_KEY_B64'];
    const missing: string[] = [];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }

    if (missing.length > 0) {
      const error = `Missing required environment variables: ${missing.join(', ')}`;
      this.logger.error(error);
      throw new Error(error);
    }

    //TODO SH: GDPR encryption - validate keys can be loaded
    try {
      this.getDEK();
      this.getHMACKey();
      this.logger.log(`EnvVarKeyProvider initialized with version: ${this.currentKid()}`);
    } catch (error) {
      this.logger.error('Key validation failed', error.message);
      throw error;
    }
  }
}
