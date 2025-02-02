import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { BugReportSchema } from './bug-report/schemas/bug-report.schema';
import { BugReportController } from './bug-report/controllers/bug-report.controller';
import { BugReportService } from './bug-report/services/bug-controller.service';
import { AdminBugReportController } from './bug-report/controllers/admin-bug-report.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: 'BugReport', schema: BugReportSchema },
        ]),
        AuthModule,
    ],
    controllers: [
        BugReportController,
        AdminBugReportController,
    ],
    providers: [
        BugReportService,
    ],
    exports: [
        MongooseModule.forFeature([
            { name: 'BugReport', schema: BugReportSchema },

        ]),
    ]
})
export class BugReportModule { }
