import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true })
    projectId: Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    reportedUser: Types.ObjectId;

    @Prop({ type: String, enum: ['project', 'comment', 'user'], required: true })
    type: 'project' | 'comment' | 'user';

    @Prop({ require: false })
    content: string;
    
    @Prop({ require: false, default: false })
    visited: boolean;

    @Prop({ require: false, default: false })
    action: boolean;

    @Prop({ type: Boolean, default: false, select: false })
    isMockData: boolean;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

