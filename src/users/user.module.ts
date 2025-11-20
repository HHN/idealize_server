import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './user/controllers/user.controller';
import { UsersService } from './user/services/user.service';
import { UserSchema } from './user/schemas/user.schema';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { MailerModule } from 'src/mailer/mailer.module';
import { AdminUsersController } from './user/controllers/admin-user.controller';
import { ProjectSchema } from 'src/projects/project/schemas/project.schema';
//TODO SH: GDPR encryption - import EncryptionModule for PII encryption
import { EncryptionModule } from 'src/encryption/encryption.module';
//TODO SH: GDPR encryption - import migration service for one-time user encryption
import { UserEncryptionMigrationService } from './user/services/user-encryption-migration.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'User', schema: UserSchema }, { name: 'Project', schema: ProjectSchema }]),
        AuthModule,
        MailerModule,
        EncryptionModule, //TODO SH: GDPR encryption - provides EncryptionService
    ],
    controllers: [
        UsersController,
        AdminUsersController
    ],
    providers: [
        UsersService,
        AuthService,
        UserEncryptionMigrationService, //TODO SH: GDPR encryption - one-time migration service
    ]
})
export class UsersModule { }
