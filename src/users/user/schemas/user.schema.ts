import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { EncryptedField } from '../../../encryption/types/encryption.types';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    //TODO SH: GDPR encryption v2 - encrypted firstName (AES-256-GCM)
    @Prop({ type: Object, required: false, select: false })
    firstName_enc?: EncryptedField;

    //TODO SH: GDPR encryption v2 - plaintext firstName for backwards compatibility (will be removed in future)
    @Prop({ required: false, default: '' })
    firstName?: string;

    //TODO SH: GDPR encryption v2 - encrypted lastName (AES-256-GCM)
    @Prop({ type: Object, required: false, select: false })
    lastName_enc?: EncryptedField;

    //TODO SH: GDPR encryption v2 - plaintext lastName for backwards compatibility (will be removed in future)
    @Prop({ required: false, default: '' })
    lastName?: string;

    //TODO SH: GDPR encryption - HMAC index for email lookups (replaces legacy email unique index)
    @Prop({ required: true, unique: true, index: true })
    hashedEmail: string;

    //TODO SH: GDPR encryption - encrypted email (AES-256-GCM, required after cutover)
    @Prop({ type: Object, required: false, select: false })
    email_enc?: EncryptedField;

    //TODO SH: GDPR encryption - encrypted recovery email (AES-256-GCM)
    @Prop({ type: Object, required: false, select: false })
    recoveryEmail_enc?: EncryptedField;

    //TODO SH: GDPR encryption v2 - encrypted username (AES-256-GCM)
    @Prop({ type: Object, required: false, select: false })
    username_enc?: EncryptedField;

    //TODO SH: GDPR encryption v2 - plaintext username for backwards compatibility (will be removed in future)
    @Prop({ required: false, default: '' })
    username?: string;

    @Prop({ required: true, select: false })
    password: string;

    @Prop({ default: false })
    status: boolean;

    //TODO SH: GDPR encryption v2 - encrypted userType (AES-256-GCM)
    @Prop({ type: Object, required: false, select: false })
    userType_enc?: EncryptedField;

    //TODO SH: GDPR encryption v2 - plaintext userType for backwards compatibility (will be removed in future)
    @Prop({ type: String, required: false, default: '' })
    userType?: 'student' | 'lecturer' | '';

    //TODO SH: GDPR encryption v2 - encrypted institution (AES-256-GCM)
    @Prop({ type: Object, required: false, select: false })
    institution_enc?: EncryptedField;

    //TODO SH: GDPR encryption v2 - plaintext institution for backwards compatibility (will be removed in future)
    @Prop({ type: String, required: false, trim: true, default: '' })
    institution?: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: false })
    profilePicture: Types.ObjectId;

    //TODO SH: GDPR encryption v2 - encrypted overview (AES-256-GCM)
    @Prop({ type: Object, required: false, select: false })
    overview_enc?: EncryptedField;

    //TODO SH: GDPR encryption v2 - plaintext overview for backwards compatibility (will be removed in future)
    @Prop({ required: false, type: String, maxlength: 500, default: '' })
    overview?: string;

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }], default: [] })
    interestedTags: Types.ObjectId[];

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }], default: [] })
    interestedCourses: Types.ObjectId[];

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }], default: [] })
    studyPrograms: Types.ObjectId[];

    @Prop({ require: false, select: false })
    code: string;

    @Prop({ require: false, select: false })
    codeExpire: Date;

    @Prop({ default: false })
    isBlockedByAdmin: boolean;

    @Prop({ default: false, select: false })
    softDeleted: boolean;

    @Prop({ type: Boolean, default: false, select: false })
    isMockData: boolean;

    //TODO SH: GDPR encryption - Virtual field for backwards compatibility with frontend
    // This is NOT stored in DB - it's a placeholder that returns empty string by default
    // Services can assign decrypted email to this field when needed (e.g., user.email = decryptedEmail)
    @Prop({ type: String, required: false, default: '' })
    email?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

//TODO SH: GDPR encryption v2 - Post-query hook to ensure plaintext fields exist for backwards compatibility
// This adds empty strings to all PII fields if missing (for documents that only have encrypted versions)
// Prevents Flutter app crashes when expecting non-null fields in nested populates
UserSchema.post(['find', 'findOne', 'findOneAndUpdate'], function(docs: any) {
    if (!docs) return;
    
    const addPlaintextFields = (doc: any) => {
        if (doc && typeof doc === 'object' && doc._id) {
            if (!doc.email) doc.email = '';
            if (!doc.firstName) doc.firstName = '';
            if (!doc.lastName) doc.lastName = '';
            if (!doc.username) doc.username = '';
            if (!doc.userType) doc.userType = '';
            if (!doc.institution) doc.institution = '';
            if (!doc.overview) doc.overview = '';
        }
    };
    
    // Handle both single document and array of documents
    if (Array.isArray(docs)) {
        docs.forEach(addPlaintextFields);
    } else {
        addPlaintextFields(docs);
    }
});

