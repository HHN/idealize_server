import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { IKeyProvider } from '../interfaces/key-provider.interface';

/**
 * Docker Secret-based key provider for production
 * TODO SH: GDPR encryption - reads keys from Docker Secrets mounted filesystem
 * 
 * Docker Secrets are mounted at /run/secrets/ by default.
 * Keys are stored as files and read at runtime.
 * 
 * Setup:
 * 1. Generate secrets:
 *    echo -n $(openssl rand -base64 32) | docker secret create encryption_dek_v1 -
 *    echo -n $(openssl rand -base64 32) | docker secret create encryption_hmac_key_v1 -
 * 
 * 2. Mount in docker-compose.yml:
 *    services:
 *      api:
 *        secrets:
 *          - encryption_dek_v1
 *          - encryption_hmac_key_v1
 * 
 * 3. Set environment variable:
 *    ENCRYPTION_KEY_VERSION=v1
 *    KEY_PROVIDER=docker-secret
 * 
 * Security benefits:
 * - Keys never in environment variables or code
 * - Encrypted at rest in Docker Swarm
 * - Automatically rotated via Docker
 * - Keys only accessible to authorized containers
 */
@Injectable()
export class DockerSecretProvider implements IKeyProvider {
  private readonly logger = new Logger(DockerSecretProvider.name);
  
  //TODO SH: GDPR encryption - base path for Docker Secrets
  private readonly secretsBasePath = process.env.DOCKER_SECRETS_PATH || '/run/secrets';
  
  //TODO SH: GDPR encryption - cache decoded keys to avoid repeated file reads
  private dekCache: Map<string, Buffer> = new Map();
  private hmacKeyCache: Map<string, Buffer> = new Map();

  constructor() {
    //TODO SH: GDPR encryption - validate secrets exist on startup
    this.validateSecrets();
  }

  /**
   * Get current key version from environment
   * TODO SH: GDPR encryption - defaults to 'v1' if not set
   */
  currentKid(): string {
    return process.env.ENCRYPTION_KEY_VERSION || 'v1';
  }

  /**
   * Get data encryption key from Docker Secret
   * TODO SH: GDPR encryption - reads from /run/secrets/encryption_dek_{kid}
   * 
   * @param kid - Key version identifier (defaults to current)
   * @returns 32-byte Buffer for AES-256-GCM
   * @throws Error if secret file not found or invalid length
   */
  getDEK(kid?: string): Buffer {
    const targetKid = kid || this.currentKid();
    
    //TODO SH: GDPR encryption - check cache first
    if (this.dekCache.has(targetKid)) {
      return this.dekCache.get(targetKid)!;
    }

    //TODO SH: GDPR encryption - read from Docker Secret file
    const secretPath = `${this.secretsBasePath}/encryption_dek_${targetKid}`;
    
    if (!existsSync(secretPath)) {
      throw new Error(
        `DEK secret not found: ${secretPath}\n` +
        `Ensure Docker Secret 'encryption_dek_${targetKid}' is created and mounted.`
      );
    }

    try {
      //TODO SH: GDPR encryption - read and decode base64
      const secretContent = readFileSync(secretPath, 'utf8').trim();
      const dek = Buffer.from(secretContent, 'base64');

      //TODO SH: GDPR encryption - validate 32-byte length
      if (dek.length !== 32) {
        throw new Error(`DEK must be 32 bytes, got ${dek.length} bytes`);
      }

      this.dekCache.set(targetKid, dek);
      this.logger.log(`DEK loaded for version: ${targetKid}`);
      
      return dek;
    } catch (error) {
      this.logger.error(`Failed to load DEK for version ${targetKid}`, error.message);
      throw new Error(`Failed to load DEK secret: ${error.message}`);
    }
  }

  /**
   * Get HMAC key from Docker Secret
   * TODO SH: GDPR encryption - reads from /run/secrets/encryption_hmac_key_{kid}
   * 
   * @param kid - Key version identifier (defaults to current)
   * @returns 32-byte Buffer for HMAC-SHA256
   * @throws Error if secret file not found or invalid length
   */
  getHMACKey(kid?: string): Buffer {
    const targetKid = kid || this.currentKid();
    
    //TODO SH: GDPR encryption - check cache first
    if (this.hmacKeyCache.has(targetKid)) {
      return this.hmacKeyCache.get(targetKid)!;
    }

    //TODO SH: GDPR encryption - read from Docker Secret file
    const secretPath = `${this.secretsBasePath}/encryption_hmac_key_${targetKid}`;
    
    if (!existsSync(secretPath)) {
      throw new Error(
        `HMAC key secret not found: ${secretPath}\n` +
        `Ensure Docker Secret 'encryption_hmac_key_${targetKid}' is created and mounted.`
      );
    }

    try {
      //TODO SH: GDPR encryption - read and decode base64
      const secretContent = readFileSync(secretPath, 'utf8').trim();
      const hmacKey = Buffer.from(secretContent, 'base64');

      //TODO SH: GDPR encryption - validate 32-byte length
      if (hmacKey.length !== 32) {
        throw new Error(`HMAC key must be 32 bytes, got ${hmacKey.length} bytes`);
      }

      this.hmacKeyCache.set(targetKid, hmacKey);
      this.logger.log(`HMAC key loaded for version: ${targetKid}`);
      
      return hmacKey;
    } catch (error) {
      this.logger.error(`Failed to load HMAC key for version ${targetKid}`, error.message);
      throw new Error(`Failed to load HMAC key secret: ${error.message}`);
    }
  }

  /**
   * Check if provider is healthy
   * TODO SH: GDPR encryption - validates secrets are accessible and correct length
   */
  async isHealthy(): Promise<boolean> {
    try {
      const kid = this.currentKid();
      const dek = this.getDEK(kid);
      const hmacKey = this.getHMACKey(kid);
      
      //TODO SH: GDPR encryption - verify keys are correct length
      const healthy = dek.length === 32 && hmacKey.length === 32;
      
      if (healthy) {
        this.logger.debug(`Health check passed for version: ${kid}`);
      } else {
        this.logger.error(`Health check failed: Invalid key lengths`);
      }
      
      return healthy;
    } catch (error) {
      this.logger.error('Docker Secret provider health check failed', error.message);
      return false;
    }
  }

  /**
   * Validate required secrets on startup
   * TODO SH: GDPR encryption - fail fast if secrets not mounted
   */
  private validateSecrets(): void {
    const kid = this.currentKid();
    const dekPath = `${this.secretsBasePath}/encryption_dek_${kid}`;
    const hmacPath = `${this.secretsBasePath}/encryption_hmac_key_${kid}`;

    //TODO SH: GDPR encryption - check if secrets directory exists
    if (!existsSync(this.secretsBasePath)) {
      this.logger.warn(
        `Docker Secrets path not found: ${this.secretsBasePath}\n` +
        `This is expected in development. Set KEY_PROVIDER=env-var for local development.`
      );
      // Don't throw in development - allow fallback to EnvVarProvider
      return;
    }

    //TODO SH: GDPR encryption - validate DEK secret exists
    if (!existsSync(dekPath)) {
      throw new Error(
        `DEK secret not found: ${dekPath}\n` +
        `Create with: echo -n $(openssl rand -base64 32) | docker secret create encryption_dek_${kid} -`
      );
    }

    //TODO SH: GDPR encryption - validate HMAC secret exists
    if (!existsSync(hmacPath)) {
      throw new Error(
        `HMAC key secret not found: ${hmacPath}\n` +
        `Create with: echo -n $(openssl rand -base64 32) | docker secret create encryption_hmac_key_${kid} -`
      );
    }

    //TODO SH: GDPR encryption - preload and validate keys
    try {
      this.getDEK(kid);
      this.getHMACKey(kid);
      this.logger.log(`DockerSecretProvider initialized with version: ${kid}`);
    } catch (error) {
      this.logger.error('Secret validation failed', error.message);
      throw error;
    }
  }

  /**
   * Clear key cache (for testing or key rotation)
   * TODO SH: GDPR encryption - call after Docker Secret rotation
   */
  clearCache(): void {
    this.dekCache.clear();
    this.hmacKeyCache.clear();
    this.logger.log('Key cache cleared');
  }

  /**
   * List available key versions
   * TODO SH: GDPR encryption - discovers all mounted secrets
   * 
   * @returns Array of available key version identifiers
   */
  getAvailableKeyVersions(): string[] {
    const versions: string[] = [];
    
    if (!existsSync(this.secretsBasePath)) {
      return versions;
    }

    try {
      const fs = require('fs');
      const files = fs.readdirSync(this.secretsBasePath);
      
      //TODO SH: GDPR encryption - extract version from filename pattern
      for (const file of files) {
        const match = file.match(/^encryption_dek_(.+)$/);
        if (match) {
          versions.push(match[1]);
        }
      }
      
      this.logger.debug(`Available key versions: ${versions.join(', ')}`);
    } catch (error) {
      this.logger.error('Failed to list key versions', error.message);
    }
    
    return versions;
  }
}
