import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsController } from './project/controllers/project.controller';
import { ProjectsService } from './project/services/project.service';
import { ProjectSchema } from './project/schemas/project.schema';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationModule } from 'src/notifications/notifications.module';
import { JoinRequestsModule } from 'src/join-requests/join-requests.module';
import { CommentsModule } from 'src/comments/comment.module';
import { LikeModule } from 'src/likes/like.module';
import { ArchiveModule } from 'src/archives/archive.module';
import { AdminProjectsController } from './project/controllers/admin-project.controller';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                { name: 'Project', schema: ProjectSchema },
            ]),
        AuthModule,
        NotificationModule,
        JoinRequestsModule,
        CommentsModule,
        LikeModule,
        ArchiveModule,
    ],
    controllers: [
        ProjectsController,
        AdminProjectsController,
    ],
    providers: [ProjectsService],
})
export class ProjectsModule { }
