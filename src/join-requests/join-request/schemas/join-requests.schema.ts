import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type JoinRequestDocument = JoinRequest & Document;

@Schema({ timestamps: true })
export class JoinRequest {

    @Prop({ type: String, enum: ['pending', 'accepted', 'canceled'], required: false, default: 'pending' })
    status: 'pending' | 'accepted' | 'canceled';

    @Prop({ type: String, enum: ['addTeamMember', 'joinTeamMember'], required: true, default: 'addTeamMember' })
    type: 'addTeamMember' | 'joinTeamMember';



    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true })
    projectId: Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    sender: Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    receiver: Types.ObjectId;

    @Prop({ type: String, required: false, default: '' })
    message: string;
}

export const JoinRequestsSchema = SchemaFactory.createForClass(JoinRequest);

