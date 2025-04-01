import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type RequestIosAccessDocument = RequestIosAccess & Document;

@Schema({ timestamps: true })
export class RequestIosAccess {
    
    @Prop({ require: true })
    firstName: string;

    @Prop({ require: true })
    lastName: string;

    @Prop({ require: true, unique: true })
    email: string;
    
    @Prop({ require: false, default: false })
    visited: boolean;

    @Prop({ require: false, default: false })
    action: boolean;

    @Prop({ require: false, default: false })
    granted: boolean;
}

export const RequestIosAccessSchema = SchemaFactory.createForClass(RequestIosAccess);

