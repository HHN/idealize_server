import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentsController } from './comment/controllers/comment.controller';
import { CommentsService } from './comment/services/comment.service';
import { CommentSchema } from './comment/schemas/comment.schema';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationModule } from 'src/notifications/notifications.module';
import { AdminCommentsController } from './comment/controllers/admin-comment.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Comment', schema: CommentSchema }]),
        AuthModule,
        NotificationModule,
    ],
    controllers: [
        CommentsController,
        AdminCommentsController,
    ],
    providers: [
        CommentsService,
    ],
    exports: [
        MongooseModule.forFeature([{ name: 'Comment', schema: CommentSchema }]),
        CommentsService,
    ],
})
export class CommentsModule { }
