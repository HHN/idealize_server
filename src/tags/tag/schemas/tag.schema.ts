import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type TagDocument = Tag & Document;

@Schema({ timestamps: true })
export class Tag {
    @Prop({ require: true})
    name: string;

    @Prop({ type: String, enum: ['course', 'tag', 'studyProgram'] ,required: true })
    type: 'course' | 'tag' | 'studyProgram';

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
    user: Types.ObjectId;
    
    @Prop({ type: Boolean, default: false, select: false })
    isMockData: boolean;
    
}

export const TagSchema = SchemaFactory.createForClass(Tag);

