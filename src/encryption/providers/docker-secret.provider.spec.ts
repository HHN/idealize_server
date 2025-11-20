import { Test, TestingModule } from '@nestjs/testing';
import { DockerSecretProvider } from './docker-secret.provider';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

/**
 * Tests for DockerSecretProvider
 * TODO SH: GDPR encryption - test Docker Secrets filesystem integration
 */
describe('DockerSecretProvider', () => {
  const testSecretsPath = join(__dirname, '../../../test-secrets');
  let provider: DockerSecretProvider;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    //TODO SH: GDPR encryption - save original environment
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    //TODO SH: GDPR encryption - create test secrets directory
    if (existsSync(testSecretsPath)) {
      rmSync(testSecretsPath, { recursive: true, force: true });
    }
    mkdirSync(testSecretsPath, { recursive: true });

    //TODO SH: GDPR encryption - set test environment
    process.env.DOCKER_SECRETS_PATH = testSecretsPath;
    process.env.ENCRYPTION_KEY_VERSION = 'v1';
  });

  afterEach(() => {
    //TODO SH: GDPR encryption - clean up test secrets
    if (existsSync(testSecretsPath)) {
      rmSync(testSecretsPath, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    //TODO SH: GDPR encryption - restore original environment
    process.env = originalEnv;
  });

  describe('initialization', () => {
    it('should initialize successfully with valid secrets', () => {
      //TODO SH: GDPR encryption - create valid test secrets
      const dek = randomBytes(32).toString('base64');
      const hmacKey = randomBytes(32).toString('base64');

      writeFileSync(join(testSecretsPath, 'encryption_dek_v1'), dek);
      writeFileSync(join(testSecretsPath, 'encryption_hmac_key_v1'), hmacKey);

      expect(() => {
        provider = new DockerSecretProvider();
      }).not.toThrow();
    });

    it('should warn if secrets directory does not exist', () => {
      //TODO SH: GDPR encryption - test development fallback
      rmSync(testSecretsPath, { recursive: true, force: true });

      expect(() => {
        provider = new DockerSecretProvider();
      }).not.toThrow(); // Should warn but not throw in development
    });

    it('should throw if DEK secret is missing in production', () => {
      //TODO SH: GDPR encryption - only create HMAC key
      const hmacKey = randomBytes(32).toString('base64');
      writeFileSync(join(testSecretsPath, 'encryption_hmac_key_v1'), hmacKey);

      expect(() => {
        provider = new DockerSecretProvider();
      }).toThrow(/DEK secret not found/);
    });

    it('should throw if HMAC key secret is missing in production', () => {
      //TODO SH: GDPR encryption - only create DEK
      const dek = randomBytes(32).toString('base64');
      writeFileSync(join(testSecretsPath, 'encryption_dek_v1'), dek);

      expect(() => {
        provider = new DockerSecretProvider();
      }).toThrow(/HMAC key secret not found/);
    });
  });

  describe('currentKid()', () => {
    beforeEach(() => {
      //TODO SH: GDPR encryption - create valid secrets for tests
      const dek = randomBytes(32).toString('base64');
      const hmacKey = randomBytes(32).toString('base64');
      writeFileSync(join(testSecretsPath, 'encryption_dek_v1'), dek);
      writeFileSync(join(testSecretsPath, 'encryption_hmac_key_v1'), hmacKey);
      provider = new DockerSecretProvider();
    });

    it('should return current key version from environment', () => {
      expect(provider.currentKid()).toBe('v1');
    });

    it('should default to v1 if not set', () => {
      delete process.env.ENCRYPTION_KEY_VERSION;
      expect(provider.currentKid()).toBe('v1');
    });
  });

  describe('getDEK()', () => {
    beforeEach(() => {
      //TODO SH: GDPR encryption - create valid secrets
      const dek = randomBytes(32).toString('base64');
      const hmacKey = randomBytes(32).toString('base64');
      writeFileSync(join(testSecretsPath, 'encryption_dek_v1'), dek);
      writeFileSync(join(testSecretsPath, 'encryption_hmac_key_v1'), hmacKey);
      provider = new DockerSecretProvider();
    });

    it('should load DEK from secret file', () => {
      const dek = provider.getDEK('v1');
      
      //TODO SH: GDPR encryption - verify 32-byte length
      expect(dek).toBeInstanceOf(Buffer);
      expect(dek.length).toBe(32);
    });

    it('should cache DEK after first load', () => {
      const dek1 = provider.getDEK('v1');
      const dek2 = provider.getDEK('v1');
      
      //TODO SH: GDPR encryption - verify same instance returned
      expect(dek1).toBe(dek2);
    });

    it('should throw error for invalid key length', () => {
      //TODO SH: GDPR encryption - create secret with wrong length
      const invalidDek = randomBytes(16).toString('base64'); // Only 16 bytes
      writeFileSync(join(testSecretsPath, 'encryption_dek_v2'), invalidDek);
      writeFileSync(
        join(testSecretsPath, 'encryption_hmac_key_v2'),
        randomBytes(32).toString('base64')
      );

      expect(() => provider.getDEK('v2')).toThrow(/DEK must be 32 bytes/);
    });

    it('should throw error for missing secret', () => {
      //TODO SH: GDPR encryption - request non-existent version
      expect(() => provider.getDEK('v999')).toThrow(/DEK secret not found/);
    });

    it('should handle whitespace in secret files', () => {
      //TODO SH: GDPR encryption - test trimming
      const dek = randomBytes(32).toString('base64');
      writeFileSync(join(testSecretsPath, 'encryption_dek_v1'), `  ${dek}\n`);

      const loaded = provider.getDEK('v1');
      expect(loaded.length).toBe(32);
    });
  });

  describe('getHMACKey()', () => {
    beforeEach(() => {
      //TODO SH: GDPR encryption - create valid secrets
      const dek = randomBytes(32).toString('base64');
      const hmacKey = randomBytes(32).toString('base64');
      writeFileSync(join(testSecretsPath, 'encryption_dek_v1'), dek);
      writeFileSync(join(testSecretsPath, 'encryption_hmac_key_v1'), hmacKey);
      provider = new DockerSecretProvider();
    });

    it('should load HMAC key from secret file', () => {
      const hmacKey = provider.getHMACKey('v1');
      
      //TODO SH: GDPR encryption - verify 32-byte length
      expect(hmacKey).toBeInstanceOf(Buffer);
      expect(hmacKey.length).toBe(32);
    });

    it('should cache HMAC key after first load', () => {
      const key1 = provider.getHMACKey('v1');
      const key2 = provider.getHMACKey('v1');
      
      //TODO SH: GDPR encryption - verify same instance returned
      expect(key1).toBe(key2);
    });

    it('should throw error for invalid key length', () => {
      //TODO SH: GDPR encryption - create secret with wrong length
      const invalidHmac = randomBytes(16).toString('base64'); // Only 16 bytes
      writeFileSync(join(testSecretsPath, 'encryption_dek_v2'), randomBytes(32).toString('base64'));
      writeFileSync(join(testSecretsPath, 'encryption_hmac_key_v2'), invalidHmac);

      expect(() => provider.getHMACKey('v2')).toThrow(/HMAC key must be 32 bytes/);
    });

    it('should throw error for missing secret', () => {
      //TODO SH: GDPR encryption - request non-existent version
      expect(() => provider.getHMACKey('v999')).toThrow(/HMAC key secret not found/);
    });
  });

  describe('isHealthy()', () => {
    it('should return true for valid configuration', async () => {
      //TODO SH: GDPR encryption - create valid secrets
      const dek = randomBytes(32).toString('base64');
      const hmacKey = randomBytes(32).toString('base64');
      writeFileSync(join(testSecretsPath, 'encryption_dek_v1'), dek);
      writeFileSync(join(testSecretsPath, 'encryption_hmac_key_v1'), hmacKey);
      
      provider = new DockerSecretProvider();
      const healthy = await provider.isHealthy();
      
      expect(healthy).toBe(true);
    });

    it('should return false if secrets are invalid', async () => {
      //TODO SH: GDPR encryption - create valid secrets first (provider validates in constructor)
      const validDek = randomBytes(32).toString('base64');
      const validHmac = randomBytes(32).toString('base64');
      writeFileSync(join(testSecretsPath, 'encryption_dek_v1'), validDek);
      writeFileSync(join(testSecretsPath, 'encryption_hmac_key_v1'), validHmac);

      provider = new DockerSecretProvider();
      
      // Now corrupt the secrets on disk (simulates external failure)
      const invalidDek = randomBytes(16).toString('base64');
      writeFileSync(join(testSecretsPath, 'encryption_dek_v1'), invalidDek);
      
      // Clear cache to force reload
      provider.clearCache();
      
      // Health check should now fail when it tries to reload
      const healthy = await provider.isHealthy();
      expect(healthy).toBe(false);
    });
  });

  describe('clearCache()', () => {
    beforeEach(() => {
      //TODO SH: GDPR encryption - create valid secrets
      const dek = randomBytes(32).toString('base64');
      const hmacKey = randomBytes(32).toString('base64');
      writeFileSync(join(testSecretsPath, 'encryption_dek_v1'), dek);
      writeFileSync(join(testSecretsPath, 'encryption_hmac_key_v1'), hmacKey);
      provider = new DockerSecretProvider();
    });

    it('should clear cached keys', () => {
      //TODO SH: GDPR encryption - load keys to cache
      const dek1 = provider.getDEK('v1');
      const hmac1 = provider.getHMACKey('v1');

      provider.clearCache();

      //TODO SH: GDPR encryption - reload should read from file again
      const dek2 = provider.getDEK('v1');
      const hmac2 = provider.getHMACKey('v1');

      // Different instances after cache clear
      expect(dek1).not.toBe(dek2);
      expect(hmac1).not.toBe(hmac2);

      // But same values
      expect(dek1.equals(dek2 as any)).toBe(true);
      expect(hmac1.equals(hmac2 as any)).toBe(true);
    });
  });

  describe('getAvailableKeyVersions()', () => {
    beforeEach(() => {
      //TODO SH: GDPR encryption - create v1 secrets for initialization
      const dek = randomBytes(32).toString('base64');
      const hmacKey = randomBytes(32).toString('base64');
      writeFileSync(join(testSecretsPath, 'encryption_dek_v1'), dek);
      writeFileSync(join(testSecretsPath, 'encryption_hmac_key_v1'), hmacKey);
      provider = new DockerSecretProvider();
    });

    it('should list all available key versions', () => {
      //TODO SH: GDPR encryption - create multiple versions
      writeFileSync(join(testSecretsPath, 'encryption_dek_v2'), randomBytes(32).toString('base64'));
      writeFileSync(join(testSecretsPath, 'encryption_dek_v3'), randomBytes(32).toString('base64'));

      const versions = provider.getAvailableKeyVersions();
      
      expect(versions).toContain('v1');
      expect(versions).toContain('v2');
      expect(versions).toContain('v3');
    });

    it('should return empty array if secrets path does not exist', () => {
      //TODO SH: GDPR encryption - remove secrets directory
      rmSync(testSecretsPath, { recursive: true, force: true });

      const versions = provider.getAvailableKeyVersions();
      expect(versions).toEqual([]);
    });

    it('should ignore non-DEK files', () => {
      //TODO SH: GDPR encryption - create unrelated files
      writeFileSync(join(testSecretsPath, 'some_other_secret'), 'data');
      writeFileSync(join(testSecretsPath, 'encryption_hmac_key_v2'), 'data');

      const versions = provider.getAvailableKeyVersions();
      
      expect(versions).toContain('v1');
      expect(versions).not.toContain('some_other_secret');
    });
  });

  describe('key rotation scenario', () => {
    it('should support reading old and new key versions', () => {
      //TODO SH: GDPR encryption - create v1 and v2 keys
      const dekV1 = randomBytes(32).toString('base64');
      const hmacV1 = randomBytes(32).toString('base64');
      const dekV2 = randomBytes(32).toString('base64');
      const hmacV2 = randomBytes(32).toString('base64');

      writeFileSync(join(testSecretsPath, 'encryption_dek_v1'), dekV1);
      writeFileSync(join(testSecretsPath, 'encryption_hmac_key_v1'), hmacV1);
      writeFileSync(join(testSecretsPath, 'encryption_dek_v2'), dekV2);
      writeFileSync(join(testSecretsPath, 'encryption_hmac_key_v2'), hmacV2);

      process.env.ENCRYPTION_KEY_VERSION = 'v2';
      provider = new DockerSecretProvider();

      //TODO SH: GDPR encryption - current should be v2
      expect(provider.currentKid()).toBe('v2');

      //TODO SH: GDPR encryption - should be able to load v1 for decryption
      const oldDek = provider.getDEK('v1');
      expect(oldDek.length).toBe(32);

      //TODO SH: GDPR encryption - should load v2 for encryption
      const newDek = provider.getDEK('v2');
      expect(newDek.length).toBe(32);

      //TODO SH: GDPR encryption - keys should be different
      expect(oldDek.equals(newDek as any)).toBe(false);
    });
  });
});
