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
import { EvaluationModule } from 'src/evaluation/evaluation.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'User', schema: UserSchema }, { name: 'Project', schema: ProjectSchema }]),
        AuthModule,
        MailerModule,
        EvaluationModule,
    ],
    controllers: [
        UsersController,
        AdminUsersController
    ],
    providers: [UsersService, AuthService],
    exports: [UsersService] // Export UsersService damit andere Module es nutzen können
})
export class UsersModule { }
