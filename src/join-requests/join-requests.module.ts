
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationModule } from 'src/notifications/notifications.module';
import { JoinRequestsController } from './join-request/controllers/join-requests.controller';
import { JoinRequestsSchema } from './join-request/schemas/join-requests.schema';
import { JoinRequestsService } from './join-request/services/join-requests.service';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                { name: 'JoinRequest', schema: JoinRequestsSchema },
            ]
        ),
        AuthModule,
        NotificationModule,
    ],
    controllers: [JoinRequestsController],
    providers: [
        JoinRequestsService,
    ],
    exports: [
        MongooseModule.forFeature(
            [
                { name: 'JoinRequest', schema: JoinRequestsSchema },
            ]
        ),
        JoinRequestsService,
    ]
})
export class JoinRequestsModule { }