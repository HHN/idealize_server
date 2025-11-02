import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationController } from './recommendation/controllers/recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { ProjectSchema } from '../projects/project/schemas/project.schema';
import { UserSchema } from '../users/user/schemas/user.schema';
import { LikeProjectSchema } from '../likes/like/schemas/like-project.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Project', schema: ProjectSchema },
      { name: 'User', schema: UserSchema },
      { name: 'LikeProject', schema: LikeProjectSchema },
    ]),
    AuthModule,
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}
