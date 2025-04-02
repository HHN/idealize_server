import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type SurveyDocument = Survey & Document;

@Schema({ timestamps: true })
export class Survey {
    
    @Prop({ require: true })
    q1: string;

    @Prop({ require: true })
    q2: string;

    @Prop({ require: true })
    q3: string;

    @Prop({ require: false })
    q4: string;

    @Prop({ require: false })
    q5: string;

    @Prop({ require: false })
    q6: string;

    @Prop({ require: false })
    q7: string;

    @Prop({ require: false })
    q8: string;

    @Prop({ require: false })
    q9: string;

    @Prop({ require: false })
    q10: string;
    
    @Prop({ require: false, default: false })
    visited: boolean;

    @Prop({ require: false, default: false })
    action: boolean;

    @Prop({ require: false, default: false })
    granted: boolean;
}

export const SurveySchema = SchemaFactory.createForClass(Survey);

