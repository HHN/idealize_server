import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ArchiveController } from './archive/controllers/archive.controller';
import { ArchiveService } from './archive/services/archive.service';
import { ArchiveSchema } from './archive/schemas/archive.schema';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationModule } from 'src/notifications/notifications.module';
import { CommentsModule } from 'src/comments/comment.module';
import { LikeModule } from 'src/likes/like.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Archive', schema: ArchiveSchema }]),
        AuthModule,
        NotificationModule,
        CommentsModule,
        LikeModule,
    ],
    controllers: [ArchiveController],
    providers: [ArchiveService],
    exports: [
        ArchiveService,
        MongooseModule.forFeature([{ name: 'Archive', schema: ArchiveSchema }]),
    ]
})
export class ArchiveModule { }
