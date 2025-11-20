/**
 * Interface for pluggable key providers
 * Part of GDPR encryption implementation
 */

/**
 * Abstract key provider interface for encryption keys
 * TODO SH: GDPR encryption - pluggable provider for Docker Secrets now, Cloud KMS later
 * 
 * Implementations:
 * - DockerSecretProvider (default, for production)
 * - CloudKMSProvider (for GCP/AWS migration)
 * - EnvVarProvider (for local development only)
 * 
 * Key rotation flow:
 * 1. Deploy new key with new kid (e.g., 'v2')
 * 2. Update ENCRYPTION_KEY_VERSION to 'v2'
 * 3. New encryptions use v2, old data still decrypts with v1
 * 4. Run backfill script to re-encrypt with v2
 * 5. After backfill complete, remove v1 keys from provider
 */
export interface IKeyProvider {
  /**
   * Get the current key version identifier
   * TODO SH: GDPR encryption - used for new encryptions
   * 
   * @returns Current key version (e.g., 'v1', 'v2')
   */
  currentKid(): string;

  /**
   * Get data encryption key (DEK) for specified version
   * TODO SH: GDPR encryption - must be exactly 32 bytes for AES-256
   * 
   * @param kid - Key version identifier. If not provided, returns current key
   * @returns 32-byte Buffer for AES-256-GCM encryption
   * @throws Error if key not found or invalid length
   */
  getDEK(kid?: string): Buffer;

  /**
   * Get HMAC key for deterministic email indexing
   * TODO SH: GDPR encryption - must be exactly 32 bytes for HMAC-SHA256
   * 
   * @param kid - Key version identifier. If not provided, returns current key
   * @returns 32-byte Buffer for HMAC-SHA256
   * @throws Error if key not found or invalid length
   */
  getHMACKey(kid?: string): Buffer;

  /**
   * Validate provider health and key availability
   * TODO SH: GDPR encryption - used in healthcheck endpoint
   * 
   * @returns true if all required keys are available and valid
   */
  isHealthy(): Promise<boolean>;
}
