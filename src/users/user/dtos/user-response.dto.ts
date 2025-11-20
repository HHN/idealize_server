import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { Types } from 'mongoose';

/**
 * User Response DTO
 * TODO SH: GDPR encryption - excludes encrypted fields and sensitive data from API responses
 * 
 * This DTO ensures that encrypted fields (*_enc) are never exposed in API responses.
 * Use this for all user-facing endpoints.
 * 
 * Excluded fields:
 * - email_enc, recoveryEmail_enc (encrypted PII)
 * - hashedEmail (HMAC index, not user-facing)
 * - password (always hidden)
 * - code, codeExpire (verification codes)
 * - softDeleted, isMockData (internal flags)
 */
@Exclude()
export class UserResponseDto {
    @Expose()
    @ApiProperty()
    _id: string;

    @Expose()
    @ApiProperty()
    firstName: string;

    @Expose()
    @ApiProperty()
    lastName: string;

    //TODO SH: GDPR encryption - expose decrypted email (populated by service)
    @Expose()
    @ApiProperty({ description: 'Email address (decrypted)' })
    email: string;

    //TODO SH: GDPR encryption - expose decrypted recovery email (populated by service)
    @Expose()
    @ApiProperty({ required: false, description: 'Recovery email (decrypted)' })
    recoveryEmail?: string;

    @Expose()
    @ApiProperty()
    username: string;

    @Expose()
    @ApiProperty()
    status: boolean;

    @Expose()
    @ApiProperty({ enum: ['student', 'lecturer'] })
    userType: 'student' | 'lecturer';

    @Expose()
    @ApiProperty({ required: false })
    institution?: string;

    @Expose()
    @ApiProperty({ required: false })
    profilePicture?: Types.ObjectId;

    @Expose()
    @ApiProperty({ required: false, maxLength: 500 })
    overview?: string;

    @Expose()
    @ApiProperty({ type: [String] })
    interestedTags: Types.ObjectId[];

    @Expose()
    @ApiProperty({ type: [String] })
    interestedCourses: Types.ObjectId[];

    @Expose()
    @ApiProperty({ type: [String] })
    studyPrograms: Types.ObjectId[];

    @Expose()
    @ApiProperty()
    isBlockedByAdmin: boolean;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty()
    updatedAt: Date;

    //TODO SH: GDPR encryption - NEVER expose these fields
    // @Exclude() is applied at class level, but listing here for clarity
    // email_enc?: any;           // Encrypted email
    // recoveryEmail_enc?: any;   // Encrypted recovery email
    // hashedEmail?: string;      // HMAC index
    // password: string;          // Password hash
    // code?: string;             // Verification code
    // codeExpire?: Date;         // Code expiration
    // softDeleted?: boolean;     // Soft delete flag
    // isMockData?: boolean;      // Mock data flag
}

/**
 * Helper function to transform User document to UserResponseDto
 * TODO SH: GDPR encryption - use this in services to ensure safe responses
 * 
 * @param user - User document from database
 * @param decryptedEmail - Decrypted email (from EncryptionService)
 * @param decryptedRecoveryEmail - Decrypted recovery email (optional)
 * @returns UserResponseDto with decrypted fields
 */
export function toUserResponse(
    user: any,
    decryptedEmail: string,
    decryptedRecoveryEmail?: string
): UserResponseDto {
    return {
        _id: user._id?.toString() || user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: decryptedEmail,
        recoveryEmail: decryptedRecoveryEmail || '',
        username: user.username,
        status: user.status,
        userType: user.userType,
        institution: user.institution,
        profilePicture: user.profilePicture,
        overview: user.overview,
        interestedTags: user.interestedTags || [],
        interestedCourses: user.interestedCourses || [],
        studyPrograms: user.studyPrograms || [],
        isBlockedByAdmin: user.isBlockedByAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
