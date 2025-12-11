import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationController } from './recommendation/controllers/recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { ProjectSchema } from '../projects/project/schemas/project.schema';
import { UserSchema } from '../users/user/schemas/user.schema';
import { LikeProjectSchema } from '../likes/like/schemas/like-project.schema';
import { RecommendationSchema } from './recommendation/schemas/recommendation.schema';
import { AuthModule } from '../auth/auth.module';
import { LikeModule } from '../likes/like.module';
import { CommentsModule } from '../comments/comment.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Project', schema: ProjectSchema },
      { name: 'User', schema: UserSchema },
      { name: 'LikeProject', schema: LikeProjectSchema },
      { name: 'Recommendation', schema: RecommendationSchema },
    ]),
    AuthModule,
    LikeModule,
    CommentsModule,
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}
