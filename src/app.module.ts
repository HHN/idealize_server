import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { configuration } from 'config/configuration';
import { AdminModule } from './admins/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommentsModule } from './comments/comment.module';
import { JoinRequestsModule } from './join-requests/join-requests.module';
import { LikeModule } from './likes/like.module';
import { NotificationModule } from './notifications/notifications.module';
import { ProjectsModule } from './projects/project.module';
import { ReportModule } from './reports/report.module';
import { TagModule } from './tags/tag.module';
import { UploadModule } from './uploads/upload.module';
import { UsersModule } from './users/user.module';
import { MailerModule } from './mailer/mailer.module';
import { JwtAuthGuard } from './auth/jwt.guard';
import { ChatService } from 'chat-server/chat.service';
import { ChatGateway } from 'chat-server/chat.gateway';
import { AuthService } from './auth/auth.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `${process.cwd()}/config/env/${process.env.NODE_ENV}.env`,
      isGlobal: true,
      load: [configuration]
    }),
    MongooseModule.forRootAsync({
      useFactory: async () =>
      ({
        uri: configuration().mongodb.url,
        useNewUrlParser: true,
        dbName: 'idealize'
      })
    }),
    UsersModule,
    ProjectsModule,
    TagModule,
    LikeModule,
    CommentsModule,
    UploadModule,
    NotificationModule,
    JoinRequestsModule,
    ReportModule,
    MailerModule,
    AdminModule,
    //ArchiveModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ChatGateway,
    ChatService,
    AuthService,
  ],
})
export class AppModule { }
