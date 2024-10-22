import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectLikeController } from './like/controllers/like-project.controller';
import { ProjectLikeService } from './like/services/like-project.service';
import { LikeProjectSchema } from './like/schemas/like-project.schema';
import { LikeCommentSchema } from './like/schemas/like-comment.schema';
import { AuthModule } from 'src/auth/auth.module';
import { CommentLikeController } from './like/controllers/like-comment.controller';
import { CommentLikeService } from './like/services/like-comment.service';
import { NotificationSchema } from 'src/notifications/notification/schemas/notification.schema';
import { NotificationService } from 'src/notifications/notification/services/notification.service';
import { NotificationModule } from 'src/notifications/notifications.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: 'LikeProject', schema: LikeProjectSchema },
            { name: 'LikeComment', schema: LikeCommentSchema },
        ]),
        AuthModule,
        NotificationModule,
    ],
    controllers: [
        ProjectLikeController,
        CommentLikeController,
    ],
    providers: [
        ProjectLikeService,
        CommentLikeService,
    ],
    exports: [
        MongooseModule.forFeature([
            { name: 'LikeProject', schema: LikeProjectSchema },
            { name: 'LikeComment', schema: LikeCommentSchema },
        ]),
        ProjectLikeService,
    ]
})
export class LikeModule { }
