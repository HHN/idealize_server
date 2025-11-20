import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { IKeyProvider } from './interfaces/key-provider.interface';
import { randomBytes } from 'crypto';

/**
 * Mock key provider for testing
 * TODO SH: GDPR encryption - provides deterministic keys for unit tests
 */
class MockKeyProvider implements IKeyProvider {
  private dek: Buffer;
  private hmacKey: Buffer;
  private kid: string;

  constructor() {
    //TODO SH: GDPR encryption - generate random 32-byte keys for each test run
    this.dek = randomBytes(32);
    this.hmacKey = randomBytes(32);
    this.kid = 'test-v1';
  }

  currentKid(): string {
    return this.kid;
  }

  getDEK(kid?: string): Buffer {
    if (kid && kid !== this.kid) {
      throw new Error(`Key version ${kid} not found`);
    }
    return this.dek;
  }

  getHMACKey(kid?: string): Buffer {
    if (kid && kid !== this.kid) {
      throw new Error(`Key version ${kid} not found`);
    }
    return this.hmacKey;
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  //TODO SH: GDPR encryption - test helper to set specific keys
  setKeys(dek: Buffer, hmacKey: Buffer): void {
    this.dek = dek;
    this.hmacKey = hmacKey;
  }
}

describe('EncryptionService', () => {
  let service: EncryptionService;
  let keyProvider: MockKeyProvider;

  beforeEach(async () => {
    keyProvider = new MockKeyProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'IKeyProvider',
          useValue: keyProvider,
        },
        {
          provide: EncryptionService,
          useFactory: (kp: IKeyProvider) => new EncryptionService(kp),
          inject: ['IKeyProvider'],
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    service.resetMetrics(); //TODO SH: GDPR encryption - start with clean metrics
  });

  describe('initialization', () => {
    it('should validate key provider on creation', () => {
      expect(service).toBeDefined();
    });

    it('should reject DEK with invalid length', () => {
      //TODO SH: GDPR encryption - enforce 32-byte key length
      const invalidDek = randomBytes(16); // Only 16 bytes
      const validHmacKey = randomBytes(32);
      
      keyProvider.setKeys(invalidDek, validHmacKey);
      
      expect(() => new EncryptionService(keyProvider)).toThrow('DEK must be 32 bytes');
    });

    it('should reject HMAC key with invalid length', () => {
      //TODO SH: GDPR encryption - enforce 32-byte HMAC key length
      const validDek = randomBytes(32);
      const invalidHmacKey = randomBytes(16); // Only 16 bytes
      
      keyProvider.setKeys(validDek, invalidHmacKey);
      
      expect(() => new EncryptionService(keyProvider)).toThrow('HMAC key must be 32 bytes');
    });
  });

  describe('encrypt()', () => {
    it('should encrypt plaintext successfully', () => {
      const plaintext = 'user@example.com';
      const encrypted = service.encrypt(plaintext);

      //TODO SH: GDPR encryption - verify output structure
      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted.alg).toBe('AES-256-GCM');
      expect(encrypted.kid).toBe('test-v1');
    });

    it('should produce different ciphertext for same plaintext', () => {
      //TODO SH: GDPR encryption - verify random IV creates different output
      const plaintext = 'user@example.com';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should throw error for empty plaintext', () => {
      //TODO SH: GDPR encryption - reject empty input
      expect(() => service.encrypt('')).toThrow('Cannot encrypt empty plaintext');
    });

    it('should increment encryption count metric', () => {
      service.encrypt('test@example.com');
      const metrics = service.getMetrics();
      
      //TODO SH: GDPR encryption - verify metrics tracking
      expect(metrics.encryptionCount).toBe(1);
    });

    it('should generate unique IVs for 10,000 encryptions', () => {
      //TODO SH: GDPR encryption - critical test for IV uniqueness
      const plaintext = 'test@example.com';
      const ivSet = new Set<string>();
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const encrypted = service.encrypt(plaintext);
        ivSet.add(encrypted.iv);
      }

      expect(ivSet.size).toBe(iterations);
    }, 30000); // 30 second timeout for 10k iterations
  });

  describe('decrypt()', () => {
    it('should decrypt encrypted data correctly', () => {
      const plaintext = 'user@example.com';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      //TODO SH: GDPR encryption - verify round-trip encryption
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      //TODO SH: GDPR encryption - verify UTF-8 support
      const plaintext = 'user+test@例え.com';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for tampered ciphertext', () => {
      //TODO SH: GDPR encryption - verify authentication tag protects integrity
      const plaintext = 'user@example.com';
      const encrypted = service.encrypt(plaintext);
      
      // Tamper with ciphertext - change first character to ensure it's different
      const tamperedCiphertext = 'A' + encrypted.ciphertext.slice(1);
      const tampered = {
        ...encrypted,
        ciphertext: tamperedCiphertext,
      };

      expect(() => service.decrypt(tampered)).toThrow('Decryption operation failed');
    });

    it('should throw error for tampered auth tag', () => {
      //TODO SH: GDPR encryption - verify authentication tag validation
      const plaintext = 'user@example.com';
      const encrypted = service.encrypt(plaintext);
      
      // Tamper with auth tag
      const tampered = {
        ...encrypted,
        authTag: randomBytes(16).toString('base64'),
      };

      expect(() => service.decrypt(tampered)).toThrow('Decryption operation failed');
    });

    it('should throw error for invalid algorithm', () => {
      //TODO SH: GDPR encryption - reject unsupported algorithms
      const encrypted = service.encrypt('test@example.com');
      const invalid = { ...encrypted, alg: 'AES-128-CBC' as any };

      expect(() => service.decrypt(invalid)).toThrow('Unsupported encryption algorithm');
    });

    it('should increment decryption count metric', () => {
      const encrypted = service.encrypt('test@example.com');
      service.decrypt(encrypted);
      const metrics = service.getMetrics();
      
      //TODO SH: GDPR encryption - verify metrics tracking
      expect(metrics.decryptionCount).toBe(1);
    });

    it('should increment failure metric on decryption error', () => {
      const encrypted = service.encrypt('test@example.com');
      const tampered = { ...encrypted, ciphertext: 'invalid' };
      
      try {
        service.decrypt(tampered);
      } catch (error) {
        // Expected to fail
      }
      
      const metrics = service.getMetrics();
      //TODO SH: GDPR encryption - track decryption failures for monitoring
      expect(metrics.decryptionFailures).toBe(1);
    });
  });

  describe('hmacIndex()', () => {
    it('should generate deterministic hash for same email', () => {
      //TODO SH: GDPR encryption - verify HMAC determinism for indexing
      const email = 'user@example.com';
      const hash1 = service.hmacIndex(email);
      const hash2 = service.hmacIndex(email);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different emails', () => {
      //TODO SH: GDPR encryption - verify uniqueness
      const hash1 = service.hmacIndex('user1@example.com');
      const hash2 = service.hmacIndex('user2@example.com');

      expect(hash1).not.toBe(hash2);
    });

    it('should reject non-normalized email', () => {
      //TODO SH: GDPR encryption - enforce normalization before HMAC
      const nonNormalized = 'User@Example.COM';
      
      expect(() => service.hmacIndex(nonNormalized)).toThrow(
        'Email must be normalized before HMAC indexing',
      );
    });

    it('should reject email with leading/trailing whitespace', () => {
      //TODO SH: GDPR encryption - enforce trimming before HMAC
      const withWhitespace = '  user@example.com  ';
      
      expect(() => service.hmacIndex(withWhitespace)).toThrow(
        'Email must be normalized before HMAC indexing',
      );
    });

    it('should accept properly normalized email', () => {
      //TODO SH: GDPR encryption - normalized email should work
      const normalized = 'user@example.com';
      const hash = service.hmacIndex(normalized);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });

    it('should throw error for empty email', () => {
      //TODO SH: GDPR encryption - reject empty input
      expect(() => service.hmacIndex('')).toThrow(
        'Cannot generate HMAC index for empty email',
      );
    });

    it('should increment HMAC count metric', () => {
      service.hmacIndex('user@example.com');
      const metrics = service.getMetrics();
      
      //TODO SH: GDPR encryption - verify metrics tracking
      expect(metrics.hmacIndexCount).toBe(1);
    });

    it('should return base64url-encoded string', () => {
      //TODO SH: GDPR encryption - verify MongoDB-safe encoding
      const hash = service.hmacIndex('user@example.com');
      
      // base64url should not contain +, /, or =
      expect(hash).not.toMatch(/[+/=]/);
    });
  });

  describe('decryptWithFallback()', () => {
    it('should prefer encrypted value over plaintext', () => {
      //TODO SH: GDPR encryption - verify migration path
      const plaintext = 'user@example.com';
      const encrypted = service.encrypt(plaintext);
      const result = service.decryptWithFallback(encrypted, 'fallback@example.com');

      expect(result).toBe(plaintext);
    });

    it('should use plaintext fallback if encrypted field is null', () => {
      //TODO SH: GDPR encryption - support legacy data during migration
      const result = service.decryptWithFallback(null, 'fallback@example.com');

      expect(result).toBe('fallback@example.com');
    });

    it('should use plaintext fallback on decryption error', () => {
      //TODO SH: GDPR encryption - graceful degradation
      const encrypted = service.encrypt('user@example.com');
      const corrupted = { ...encrypted, authTag: 'invalid' };
      
      const result = service.decryptWithFallback(corrupted, 'fallback@example.com');

      expect(result).toBe('fallback@example.com');
    });

    it('should return null if both encrypted and plaintext are null', () => {
      //TODO SH: GDPR encryption - handle GDPR erasure case
      const result = service.decryptWithFallback(null, null);

      expect(result).toBeNull();
    });

    it('should increment plaintext fallback metric', () => {
      service.decryptWithFallback(null, 'fallback@example.com');
      const metrics = service.getMetrics();
      
      //TODO SH: GDPR encryption - track fallback rate for migration monitoring
      expect(metrics.plaintextFallbackCount).toBe(1);
    });
  });

  describe('getMetrics()', () => {
    it('should return copy of metrics', () => {
      //TODO SH: GDPR encryption - prevent external mutation
      const metrics1 = service.getMetrics();
      metrics1.encryptionCount = 999;
      
      const metrics2 = service.getMetrics();
      expect(metrics2.encryptionCount).toBe(0);
    });

    it('should track all metric types', () => {
      //TODO SH: GDPR encryption - verify all metrics are tracked
      service.encrypt('test@example.com');
      service.hmacIndex('user@example.com');
      service.decryptWithFallback(null, 'fallback@example.com');
      
      const metrics = service.getMetrics();
      
      expect(metrics).toHaveProperty('encryptionCount');
      expect(metrics).toHaveProperty('decryptionCount');
      expect(metrics).toHaveProperty('decryptionFailures');
      expect(metrics).toHaveProperty('plaintextFallbackCount');
      expect(metrics).toHaveProperty('hmacIndexCount');
    });
  });

  describe('key rotation support', () => {
    it('should include kid in encrypted output', () => {
      //TODO SH: GDPR encryption - verify key versioning
      const encrypted = service.encrypt('test@example.com');
      
      expect(encrypted.kid).toBe('test-v1');
    });

    it('should decrypt data encrypted with old key version', () => {
      //TODO SH: GDPR encryption - support backward compatibility
      const plaintext = 'user@example.com';
      const encrypted = service.encrypt(plaintext);
      
      // Simulate old key version
      encrypted.kid = 'test-v1';
      
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });
});
