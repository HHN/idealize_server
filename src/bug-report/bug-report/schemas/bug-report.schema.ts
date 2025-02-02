import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type BugReportDocument = BugReport & Document;

@Schema({ timestamps: true })
export class BugReport {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ require: false })
    content: string;
    
    @Prop({ require: false, default: false })
    visited: boolean;

    @Prop({ require: false, default: false })
    action: boolean;

    @Prop({ type: Boolean, default: false, select: false })
    isMockData: boolean;
}

export const BugReportSchema = SchemaFactory.createForClass(BugReport);

