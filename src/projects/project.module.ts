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
import { ReportModule } from 'src/reports/report.module';
import { UserSchema } from 'src/users/user/schemas/user.schema';
import { ArchiveSchema } from 'src/archives/archive/schemas/archive.schema';
import { TagSchema } from 'src/tags/tag/schemas/tag.schema';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                { name: 'Project', schema: ProjectSchema },
                { name: 'User', schema: UserSchema },
                { name: 'Archive', schema: ArchiveSchema },
                { name: 'Tag', schema: TagSchema },
            ]),
        AuthModule,
        NotificationModule,
        JoinRequestsModule,
        CommentsModule,
        LikeModule,
        ReportModule,
    ],
    controllers: [
        ProjectsController,
        AdminProjectsController,
    ],
    providers: [ProjectsService],
})
export class ProjectsModule { }
