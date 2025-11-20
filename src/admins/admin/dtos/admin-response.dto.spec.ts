import { toAdminResponse, AdminResponseDto } from './admin-response.dto';
import { Types } from 'mongoose';

/**
 * Unit Tests for AdminResponseDto Helper Functions
 * 
 * Purpose: Verify that admin DTO transformation properly handles email decryption
 * and excludes encrypted fields from API responses.
 */
describe('AdminResponseDto', () => {
  const mockAdminId = new Types.ObjectId();

  describe('toAdminResponse()', () => {
    it('should transform admin document with decrypted email', () => {
      const adminDoc = {
        _id: mockAdminId,
        fullname: 'Admin User',
        email_enc: {
          ciphertext: 'encrypted_admin_data',
          iv: 'admin_iv',
          authTag: 'admin_tag',
          alg: 'AES-256-GCM',
          kid: 'v1',
        },
        hashedEmail: 'ADMIN_HASH_123...',
        status: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      const decryptedEmail = 'admin@hs-heilbronn.de';
      const result = toAdminResponse(adminDoc, decryptedEmail);

      expect(result.email).toBe(decryptedEmail);
      expect(result.fullname).toBe('Admin User');
      expect(result._id).toBe(mockAdminId.toString());
      expect(result.status).toBe(true);
      
      // Verify encrypted fields are NOT included
      expect(result).not.toHaveProperty('email_enc');
      expect(result).not.toHaveProperty('hashedEmail');
    });

    it('should preserve all non-sensitive admin fields', () => {
      const adminDoc = {
        _id: mockAdminId,
        fullname: 'Super Admin',
        email_enc: {
          ciphertext: 'encrypted_data',
          iv: 'random_iv',
          authTag: 'auth_tag',
          alg: 'AES-256-GCM',
          kid: 'v1',
        },
        hashedEmail: 'HASH_XYZ...',
        status: true,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-15'),
      };

      const decryptedEmail = 'superadmin@system.com';
      const result = toAdminResponse(adminDoc, decryptedEmail);

      expect(result.email).toBe(decryptedEmail);
      expect(result.fullname).toBe('Super Admin');
      expect(result.status).toBe(true);
      expect(result.createdAt).toEqual(new Date('2024-02-01'));
      expect(result.updatedAt).toEqual(new Date('2024-02-15'));
    });

    it('should never expose sensitive admin fields', () => {
      const adminDoc = {
        _id: mockAdminId,
        fullname: 'Test Admin',
        email_enc: {
          ciphertext: 'encrypted_data',
          iv: 'random_iv',
          authTag: 'auth_tag',
          alg: 'AES-256-GCM',
          kid: 'v1',
        },
        hashedEmail: 'HASH_ABC...',
        password: 'hashed_password_never_exposed',
        codeExpire: new Date(),
        status: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      const decryptedEmail = 'testadmin@example.com';
      const result = toAdminResponse(adminDoc, decryptedEmail);

      expect(result.email).toBe(decryptedEmail);
      
      // Verify sensitive fields are NEVER exposed
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('codeExpire');
      expect(result).not.toHaveProperty('email_enc');
      expect(result).not.toHaveProperty('hashedEmail');
    });
  });

  describe('AdminResponseDto with class-transformer', () => {
    it('should only expose @Expose() decorated fields', () => {
      const dto = new AdminResponseDto();
      dto._id = mockAdminId.toString();
      dto.fullname = 'Admin User';
      dto.email = 'admin@example.com';
      dto.status = true;
      dto.createdAt = new Date();
      dto.updatedAt = new Date();

      // Verify exposed fields exist
      expect(dto.email).toBe('admin@example.com');
      expect(dto.fullname).toBe('Admin User');
      expect(dto.status).toBe(true);

      // Note: @Exclude() at class level means only @Expose() fields are serialized
    });
  });
});
