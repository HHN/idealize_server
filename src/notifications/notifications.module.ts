
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { ProjectsModule } from 'src/projects/project.module';
import { ProjectSchema } from 'src/projects/project/schemas/project.schema';
import { NotificationController } from './notification/controllers/notification.controller';
import { NotificationSchema } from './notification/schemas/notification.schema';
import { NotificationService } from './notification/services/notification.service';
//TODO SH: GDPR encryption - import EncryptionModule for email decryption in notifications
import { EncryptionModule } from 'src/encryption/encryption.module';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                { name: 'Notification', schema: NotificationSchema },
                { name: 'Project', schema: ProjectSchema },
            ]
        ),
        AuthModule,
        EncryptionModule, //TODO SH: GDPR encryption - enable email decryption
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