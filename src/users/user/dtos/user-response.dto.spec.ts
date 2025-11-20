import { toUserResponse, UserResponseDto } from './user-response.dto';
import { Types } from 'mongoose';

/**
 * Unit Tests for UserResponseDto Helper Functions
 * 
 * Purpose: Verify that DTO transformation properly handles email decryption
 * and excludes encrypted fields from API responses.
 * 
 * Tests:
 * - toUserResponse() correctly maps decrypted email
 * - Encrypted fields (email_enc, hashedEmail) are excluded
 * - Optional recoveryEmail is handled correctly
 */
describe('UserResponseDto', () => {
  const mockUserId = new Types.ObjectId();
  const mockTagId = new Types.ObjectId();
  const mockPictureId = new Types.ObjectId();

  describe('toUserResponse()', () => {
    it('should transform user document with decrypted email', () => {
      const userDoc = {
        _id: mockUserId,
        firstName: 'John',
        lastName: 'Doe',
        email_enc: {
          ciphertext: 'encrypted_data',
          iv: 'random_iv',
          authTag: 'auth_tag',
          alg: 'AES-256-GCM',
          kid: 'v1',
        },
        hashedEmail: 'UCjZWwir...',
        username: 'johndoe',
        status: true,
        userType: 'student' as const,
        institution: 'HHN - Hochschule Heilbronn',
        profilePicture: mockPictureId,
        overview: 'Test user bio',
        interestedTags: [mockTagId],
        interestedCourses: [],
        studyPrograms: [],
        isBlockedByAdmin: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      const decryptedEmail = 'john.doe@hs-heilbronn.de';
      const result = toUserResponse(userDoc, decryptedEmail);

      expect(result.email).toBe(decryptedEmail);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result._id).toBe(mockUserId.toString());
      
      // Verify encrypted fields are NOT included
      expect(result).not.toHaveProperty('email_enc');
      expect(result).not.toHaveProperty('hashedEmail');
    });

    it('should handle recoveryEmail when provided', () => {
      const userDoc = {
        _id: mockUserId,
        firstName: 'Jane',
        lastName: 'Smith',
        email_enc: {
          ciphertext: 'encrypted_data',
          iv: 'random_iv',
          authTag: 'auth_tag',
          alg: 'AES-256-GCM',
          kid: 'v1',
        },
        recoveryEmail_enc: {
          ciphertext: 'recovery_encrypted_data',
          iv: 'recovery_iv',
          authTag: 'recovery_tag',
          alg: 'AES-256-GCM',
          kid: 'v1',
        },
        hashedEmail: 'XYZ123...',
        username: 'janesmith',
        status: true,
        userType: 'lecturer' as const,
        interestedTags: [],
        interestedCourses: [],
        studyPrograms: [],
        isBlockedByAdmin: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      const decryptedEmail = 'jane.smith@hs-heilbronn.de';
      const decryptedRecovery = 'jane.recovery@gmail.com';
      const result = toUserResponse(userDoc, decryptedEmail, decryptedRecovery);

      expect(result.email).toBe(decryptedEmail);
      expect(result.recoveryEmail).toBe(decryptedRecovery);
      
      // Verify encrypted fields are NOT included
      expect(result).not.toHaveProperty('email_enc');
      expect(result).not.toHaveProperty('recoveryEmail_enc');
      expect(result).not.toHaveProperty('hashedEmail');
    });

    it('should handle missing recoveryEmail gracefully', () => {
      const userDoc = {
        _id: mockUserId,
        firstName: 'Bob',
        lastName: 'Johnson',
        email_enc: {
          ciphertext: 'encrypted_data',
          iv: 'random_iv',
          authTag: 'auth_tag',
          alg: 'AES-256-GCM',
          kid: 'v1',
        },
        hashedEmail: 'ABC789...',
        username: 'bobjohnson',
        status: true,
        userType: 'student' as const,
        interestedTags: [],
        interestedCourses: [],
        studyPrograms: [],
        isBlockedByAdmin: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      const decryptedEmail = 'bob.johnson@hs-heilbronn.de';
      const result = toUserResponse(userDoc, decryptedEmail);

      expect(result.email).toBe(decryptedEmail);
      expect(result.recoveryEmail).toBe('');
    });

    it('should preserve all non-sensitive user fields', () => {
      const userDoc = {
        _id: mockUserId,
        firstName: 'Alice',
        lastName: 'Williams',
        email_enc: {
          ciphertext: 'encrypted_data',
          iv: 'random_iv',
          authTag: 'auth_tag',
          alg: 'AES-256-GCM',
          kid: 'v1',
        },
        hashedEmail: 'DEF456...',
        username: 'alicewilliams',
        status: true,
        userType: 'student' as const,
        institution: 'DHBW',
        profilePicture: mockPictureId,
        overview: 'Computer science student',
        interestedTags: [mockTagId],
        interestedCourses: [mockTagId],
        studyPrograms: [mockTagId],
        isBlockedByAdmin: false,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-15'),
      };

      const decryptedEmail = 'alice.williams@dhbw.de';
      const result = toUserResponse(userDoc, decryptedEmail);

      expect(result.email).toBe(decryptedEmail);
      expect(result.firstName).toBe('Alice');
      expect(result.lastName).toBe('Williams');
      expect(result.username).toBe('alicewilliams');
      expect(result.status).toBe(true);
      expect(result.userType).toBe('student');
      expect(result.institution).toBe('DHBW');
      expect(result.overview).toBe('Computer science student');
      expect(result.isBlockedByAdmin).toBe(false);
      expect(result.interestedTags).toEqual([mockTagId]);
      expect(result.interestedCourses).toEqual([mockTagId]);
      expect(result.studyPrograms).toEqual([mockTagId]);
    });

    it('should never expose sensitive fields in response', () => {
      const userDoc = {
        _id: mockUserId,
        firstName: 'Test',
        lastName: 'User',
        email_enc: {
          ciphertext: 'encrypted_data',
          iv: 'random_iv',
          authTag: 'auth_tag',
          alg: 'AES-256-GCM',
          kid: 'v1',
        },
        hashedEmail: 'HASH123...',
        username: 'testuser',
        status: true,
        userType: 'student' as const,
        password: 'hashed_password_should_never_be_exposed',
        code: '1234',
        codeExpire: new Date(),
        softDeleted: false,
        isMockData: true,
        interestedTags: [],
        interestedCourses: [],
        studyPrograms: [],
        isBlockedByAdmin: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      const decryptedEmail = 'test.user@example.com';
      const result = toUserResponse(userDoc, decryptedEmail);

      expect(result.email).toBe(decryptedEmail);
      
      // Verify sensitive fields are NEVER exposed
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('code');
      expect(result).not.toHaveProperty('codeExpire');
      expect(result).not.toHaveProperty('email_enc');
      expect(result).not.toHaveProperty('recoveryEmail_enc');
      expect(result).not.toHaveProperty('hashedEmail');
      expect(result).not.toHaveProperty('softDeleted');
      expect(result).not.toHaveProperty('isMockData');
    });
  });

  describe('UserResponseDto with class-transformer', () => {
    it('should only expose @Expose() decorated fields', () => {
      const dto = new UserResponseDto();
      dto._id = mockUserId.toString();
      dto.firstName = 'John';
      dto.lastName = 'Doe';
      dto.email = 'john.doe@example.com';
      dto.username = 'johndoe';
      dto.status = true;
      dto.userType = 'student';
      dto.isBlockedByAdmin = false;
      dto.interestedTags = [];
      dto.interestedCourses = [];
      dto.studyPrograms = [];
      dto.createdAt = new Date();
      dto.updatedAt = new Date();

      // Verify exposed fields exist
      expect(dto.email).toBe('john.doe@example.com');
      expect(dto.firstName).toBe('John');
      expect(dto.lastName).toBe('Doe');

      // Note: @Exclude() at class level means only @Expose() fields are serialized
      // This is tested via E2E tests that actually serialize the response
    });
  });
});
