import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentsController } from './comment/controllers/comment.controller';
import { CommentsService } from './comment/services/comment.service';
import { CommentSchema } from './comment/schemas/comment.schema';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationModule } from 'src/notifications/notifications.module';
import { AdminCommentsController } from './comment/controllers/admin-comment.controller';
//TODO SH: GDPR encryption - import EncryptionModule for email decryption in comments
import { EncryptionModule } from 'src/encryption/encryption.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Comment', schema: CommentSchema }]),
        AuthModule,
        NotificationModule,
        EncryptionModule, //TODO SH: GDPR encryption - enable email decryption
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
