import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminDocument = Admin & Document;

@Schema({ timestamps: true })
export class Admin {
    @Prop({ required: true })
    fullname: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true, select: false })
    password: string;

    @Prop({ require: false, select: false })
    codeExpire: Date;
    
    @Prop({ default: false })
    status: boolean;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);

