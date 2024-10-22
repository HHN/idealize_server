
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { ProjectsModule } from 'src/projects/project.module';
import { ProjectSchema } from 'src/projects/project/schemas/project.schema';
import { NotificationController } from './notification/controllers/notification.controller';
import { NotificationSchema } from './notification/schemas/notification.schema';
import { NotificationService } from './notification/services/notification.service';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                { name: 'Notification', schema: NotificationSchema },
                { name: 'Project', schema: ProjectSchema },
            ]
        ),
        AuthModule,
    ],
    controllers: [NotificationController],
    providers:
        [
            NotificationService,
        ],
    exports: [
        NotificationService,
        MongooseModule.forFeature(
            [
                { name: 'Notification', schema: NotificationSchema },
                { name: 'Project', schema: ProjectSchema },
            ]
        ),]
})
export class NotificationModule { }