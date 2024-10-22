import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportController } from './report/controllers/report.controller';
import { ReportService } from './report/services/report.service';
import { ReportSchema } from './report/schemas/report.schema';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationModule } from 'src/notifications/notifications.module';
import { AdminReportController } from './report/controllers/admin-report.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Report', schema: ReportSchema }]),
        AuthModule,
        NotificationModule,
    ],
    controllers: [
        ReportController,
        AdminReportController,
    ],
    providers: [ReportService],
    exports: [
        ReportService,
        MongooseModule.forFeature([{ name: 'Report', schema: ReportSchema }]),
    ]
})
export class ReportModule { }
