import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type LikeProjectDocument = LikeProject & Document;

@Schema({ timestamps: true })
export class LikeProject {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true })
    projectId: Types.ObjectId;
}

export const LikeProjectSchema = SchemaFactory.createForClass(LikeProject);

