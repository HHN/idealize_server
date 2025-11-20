/**
 * Type definitions for encryption system
 * Part of GDPR encryption implementation
 */

/**
 * Encrypted field stored in database
 * TODO SH: GDPR encryption - AES-256-GCM output format with key versioning
 * 
 * This structure supports key rotation via the 'kid' field without rewriting data.
 * Old keys are kept in the KeyProvider to decrypt legacy data.
 */
export interface EncryptedField {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  
  /** Base64-encoded initialization vector (12 bytes for GCM) */
  iv: string;
  
  /** Base64-encoded authentication tag (16 bytes for GCM) */
  authTag: string;
  
  /** Encryption algorithm identifier */
  alg: 'AES-256-GCM';
  
  /** Key identifier for rotation support (e.g., 'v1', 'v2') */
  kid: string;
}

/**
 * Encryption metrics for monitoring
 * TODO SH: GDPR encryption - track plaintext fallback rate during migration
 */
export interface EncryptionMetrics {
  /** Count of successful encryptions */
  encryptionCount: number;
  
  /** Count of successful decryptions */
  decryptionCount: number;
  
  /** Count of decryption failures */
  decryptionFailures: number;
  
  /** Count of plaintext fallbacks during dual-read phase */
  plaintextFallbackCount: number;
  
  /** Count of HMAC index generations */
  hmacIndexCount: number;
}

/**
 * Configuration for encryption service
 * TODO SH: GDPR encryption - loaded from environment or KeyProvider
 */
export interface EncryptionConfig {
  /** Current key version identifier */
  keyVersion: string;
  
  /** 32-byte data encryption key (DEK) as base64 */
  dekBase64: string;
  
  /** 32-byte HMAC key for deterministic indexing as base64 */
  hmacKeyBase64: string;
}
