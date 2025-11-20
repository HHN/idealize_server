import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EncryptedField } from '../../../encryption/types/encryption.types';

export type AdminDocument = Admin & Document;

@Schema({ timestamps: true })
export class Admin {
    @Prop({ required: true })
    fullname: string;

    //TODO SH: GDPR encryption - HMAC index for email lookups (replaces legacy email unique index)
    @Prop({ required: true, unique: true, index: true })
    hashedEmail: string;

    //TODO SH: GDPR encryption - encrypted email (AES-256-GCM, required after cutover)
    @Prop({ type: Object, required: true, select: false })
    email_enc: EncryptedField;

    @Prop({ required: true, select: false })
    password: string;

    @Prop({ require: false, select: false })
    codeExpire: Date;
    
    @Prop({ default: false })
    status: boolean;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);

