import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './user/controllers/user.controller';
import { UsersService } from './user/services/user.service';
import { UserSchema } from './user/schemas/user.schema';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { MailerModule } from 'src/mailer/mailer.module';
import { AdminUsersController } from './user/controllers/admin-user.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
        AuthModule,
        MailerModule,
    ],
    controllers: [
        UsersController,
        AdminUsersController
    ],
    providers: [UsersService, AuthService]
})
export class UsersModule { }
