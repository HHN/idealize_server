import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationModule } from 'src/notifications/notifications.module';
import { AdminSeedingController } from './seeding.controller';
import { SeedingService } from './seeding.service';
import { TagSchema } from 'src/tags/tag/schemas/tag.schema';
import { UserSchema } from 'src/users/user/schemas/user.schema';
import { Project, ProjectSchema } from 'src/projects/project/schemas/project.schema';
import { ReportSchema } from 'src/reports/report/schemas/report.schema';
import { CommentSchema } from 'src/comments/comment/schemas/comment.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: 'Tag', schema: TagSchema },
            { name: 'User', schema: UserSchema },
            { name: 'Project', schema: ProjectSchema },
            { name: 'Report', schema: ReportSchema },
            { name: 'Comment', schema: CommentSchema }
        ]),
        AuthModule,
        NotificationModule,
    ],
    controllers: [
        AdminSeedingController,
    ],
    providers: [SeedingService],
    exports: [
        SeedingService,
        MongooseModule.forFeature([
            { name: 'Tag', schema: TagSchema },
            { name: 'User', schema: UserSchema },
            { name: 'Project', schema: ProjectSchema }
        ]),
    ]
})
export class SeedingModule { }
