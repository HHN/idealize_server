import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { Link } from '../../../shared/interfaces/link.interface';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    description: string;

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }], default: [] })
    tags: Types.ObjectId[];

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }], default: [] })
    courses: Types.ObjectId[];

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] })
    teamMembers: Types.ObjectId[];

    @Prop({ default: true })
    isDraft: boolean;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    owner: Types.ObjectId;

    @Prop({ type: [Object], default: [] as Link[] }) 
    links: Link[];

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Upload' }], default: [] })
    attachments: Types.ObjectId[];

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: false })
    thumbnail: Types.ObjectId;

    @Prop({ type: Boolean, default: false, select: false })
    isMockData: boolean;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
