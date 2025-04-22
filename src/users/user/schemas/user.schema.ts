import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true })
    firstName: string;

    @Prop({ required: true })
    lastName: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true, default: '' })
    recoveryEmail: string;

    @Prop({ required: false })
    username: string;

    @Prop({ required: true, select: false })
    password: string;

    @Prop({ default: false })
    status: boolean;

    @Prop({ type: String, required: true })
    userType: 'student' | 'lecturer';

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: false })
    profilePicture: Types.ObjectId;

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
}

export const UserSchema = SchemaFactory.createForClass(User);

