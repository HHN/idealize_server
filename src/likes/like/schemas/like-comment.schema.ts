import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type LikeCommentDocument = LikeComment & Document;

@Schema({ timestamps: true })
export class LikeComment {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true })
    commentId: Types.ObjectId;
}

export const LikeCommentSchema = SchemaFactory.createForClass(LikeComment);

