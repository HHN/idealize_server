// src/mailer/mailer.module.ts

import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';

@Module({
    imports: [],
    providers: [MailerService],
    exports: [MailerService],
})
export class MailerModule { }
