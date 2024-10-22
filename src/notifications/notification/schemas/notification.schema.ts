import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    message: string;

    @Prop({ required: false, default: false })
    isRead: boolean;

    @Prop({ type: String, enum: ['like', 'comment', 'reply-comment', 'addTeamMember', 'joinTeamMember', 'projectUpdate', 'bookmark', 'report'], required: true })
    type: 'like' | 'comment' | 'reply-comment' | 'addTeamMember' | 'joinTeamMember' | 'projectUpdate' | 'bookmark' | 'report';

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true })
    projectId: Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    sender: Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    receiver: Types.ObjectId;

    @Prop({ required: false, default: false })
    processed: boolean;

    @Prop({ required: false, default: false })
    softDeleted: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

