import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type UploadDocument = Upload & Document;

@Schema({ timestamps: true })
export class Upload {
    @Prop({ require: false })
    originalName: string;

    @Prop({ require: false })
    newFileName: string;

    @Prop({ require: false })
    size: number;

    @Prop({ require: false })
    mimeType: string;

    @Prop({ require: false })
    filename: string;

    @Prop({ require: false })
    path: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
    user: Types.ObjectId;
}

export const UploadSchema = SchemaFactory.createForClass(Upload);