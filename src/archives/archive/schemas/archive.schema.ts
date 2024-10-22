import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type ArchiveDocument = Archive & Document;

@Schema({ timestamps: true })
export class Archive {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true })
    projectId: Types.ObjectId;
}

export const ArchiveSchema = SchemaFactory.createForClass(Archive);

