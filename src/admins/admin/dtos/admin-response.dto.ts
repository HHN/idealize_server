import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Admin Response DTO
 * TODO SH: GDPR encryption - excludes encrypted fields and sensitive data from API responses
 * 
 * This DTO ensures that encrypted fields (*_enc) are never exposed in API responses.
 * Use this for all admin-facing endpoints.
 * 
 * Excluded fields:
 * - email_enc (encrypted PII)
 * - hashedEmail (HMAC index, not user-facing)
 * - password (always hidden)
 * - codeExpire (internal)
 */
@Exclude()
export class AdminResponseDto {
    @Expose()
    @ApiProperty()
    _id: string;

    @Expose()
    @ApiProperty()
    fullname: string;

    //TODO SH: GDPR encryption - expose decrypted email (populated by service)
    @Expose()
    @ApiProperty({ description: 'Admin email address (decrypted)' })
    email: string;

    @Expose()
    @ApiProperty()
    status: boolean;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty()
    updatedAt: Date;

    //TODO SH: GDPR encryption - NEVER expose these fields
    // @Exclude() is applied at class level, but listing here for clarity
    // email_enc?: any;        // Encrypted email
    // hashedEmail?: string;   // HMAC index
    // password: string;       // Password hash
    // codeExpire?: Date;      // Code expiration
}

/**
 * Helper function to transform Admin document to AdminResponseDto
 * TODO SH: GDPR encryption - use this in services to ensure safe responses
 * 
 * @param admin - Admin document from database
 * @param decryptedEmail - Decrypted email (from EncryptionService)
 * @returns AdminResponseDto with decrypted fields
 */
export function toAdminResponse(
    admin: any,
    decryptedEmail: string
): AdminResponseDto {
    return {
        _id: admin._id?.toString() || admin.id,
        fullname: admin.fullname,
        email: decryptedEmail,
        status: admin.status,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
    };
}
