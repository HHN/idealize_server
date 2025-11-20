import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

// TypeScript Type for the Recommendation Document
export type RecommendationDocument = Recommendation & Document;

/**
 * Recommendation Schema
 * Stores pre-calculated recommendations for users
 */
@Schema({ timestamps: true })  // createdAt and updatedAt are added automatically
export class Recommendation {
  // User for whom the recommendation is for
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  // The recommended project
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  // Which algorithm was used
  @Prop({ 
    type: String, 
    enum: ['content-based', 'collaborative', 'hybrid', 'basic-filtering'],
    required: true 
  })
  algorithm: string;

  // Score of the recommendation (0.0 - 1.0)
  @Prop({ type: Number, required: true, min: 0, max: 1 })
  score: number;

  // Reason for the recommendation (optional, for transparency)
  @Prop({ type: String, required: false })
  reason?: string;

  // Matching tags between user and project
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }], default: [] })
  matchingTags: Types.ObjectId[];

  // Was the recommendation already shown to the user?
  @Prop({ type: Boolean, default: false })
  shown: boolean;

  // Date when the recommendation was shown
  @Prop({ type: Date, required: false })
  shownAt?: Date;

  // Did the user click on the recommendation?
  @Prop({ type: Boolean, default: false })
  clicked: boolean;

  // Date when the user clicked
  @Prop({ type: Date, required: false })
  clickedAt?: Date;

  // Expiration date (recommendations should be recalculated regularly)
  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

// Create Mongoose Schema from the class
export const RecommendationSchema = SchemaFactory.createForClass(Recommendation);

// Compound indexes for fast queries
RecommendationSchema.index({ userId: 1, algorithm: 1, score: -1 });
RecommendationSchema.index({ userId: 1, expiresAt: 1 });
RecommendationSchema.index({ expiresAt: 1 }); // For automatic deletion of old recommendations
