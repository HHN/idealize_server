import { Injectable, Logger } from '@nestjs/common';
import { configuration } from 'config/configuration';
import formData = require('form-data');
import Mailgun from 'mailgun.js';

import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class MailerService {
    private readonly mailgunClient;
    private readonly logger = new Logger(MailerService.name);

    constructor() {
        const mailgun = new Mailgun(formData);
        this.mailgunClient = mailgun.client({
            username: 'api',
            key: configuration().mailgun.api,
            url: 'https://api.eu.mailgun.net',
        });
    }

    private async compileTemplate(templateName: string, context: any): Promise<string> {
        const filePath = path.join(__dirname, '..', 'templates', 'email', `${templateName}.hbs`);
        const template = fs.readFileSync(filePath, 'utf8');
        const compiledTemplate = Handlebars.compile(template);
        return compiledTemplate(context);
    }

    async sendBugReportUnderReview(to: string, name: string, content: string) {
        const domain = configuration().mailgun.domain;
        const from = configuration().mailgun.from;

        const html = await this.compileTemplate('bugreport', { name, content });

        try {
            const response = await this.mailgunClient.messages.create(domain, {
                from,
                to: [to],
                subject: 'Bug report under review',
                text: 'Your bug report is under review',
                html,
            });
            this.logger.log(`Email sent to ${to}: ${response.message}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        }
    }

    async sendVerificationEmail(to: string, name: string, code: string) {
        console.log(`-----> Mailgun debug sendVerificationEmail [${name}]`, code);

        const domain = configuration().mailgun.domain;
        const from = configuration().mailgun.from;

        const html = await this.compileTemplate('registration', { name, code });

        try {
            const response = await this.mailgunClient.messages.create(domain, {
                from,
                to: [to],
                subject: 'Verify your account',
                text: `Your verification code is: ${code}`,
                html,
            });
            this.logger.log(`Email sent to ${to}: ${response.message}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        }
    }

    async sendSoftDeletedSuccessEmail(to: string, name: string) {
        const domain = configuration().mailgun.domain;
        const from = configuration().mailgun.from;

        const html = await this.compileTemplate('deleted', { name });

        try {
            const response = await this.mailgunClient.messages.create(domain, {
                from,
                to: [to],
                subject: 'Account deleted successfully',
                text: `Your account has been deleted successfully`,
                html,
            });
            this.logger.log(`Email sent to ${to}: ${response.message}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        }
    }

    async sendSoftDeleteConfirmationEmail(to: string, name: string, code: string) {
        console.log(`-----> Mailgun debug sendSoftDeleteConfirmationEmail [${name}]`, code);

        const domain = configuration().mailgun.domain;
        const from = configuration().mailgun.from;

        const html = await this.compileTemplate('softdelete', { name, code });

        try {
            const response = await this.mailgunClient.messages.create(domain, {
                from,
                to: [to],
                subject: 'Delete your account',
                text: `Your delete verification code is: ${code}`,
                html,
            });
            this.logger.log(`Email sent to ${to}: ${response.message}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        }
    }

    async sendResetPasswordCodeEmail(to: string, name: string, code: string) {
        console.log(`-----> Mailgun debug sendResetPasswordCodeEmail [${name}]`, code);

        const domain = configuration().mailgun.domain;
        const from = configuration().mailgun.from;

        const html = await this.compileTemplate('reset', { name, code });

        try {
            const response = await this.mailgunClient.messages.create(domain, {
                from,
                to: [to],
                subject: 'Reset your password',
                text: `Your reset password code is: ${code}`,
                html,
            });
            this.logger.log(`Email sent to ${to}: ${response.message}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        }
    }

    async passwordResetSuccessfullyEmail(to: string, name: string) {
        
        const domain = configuration().mailgun.domain;
        const from = configuration().mailgun.from;

        const html = await this.compileTemplate('resetpasswordsuccess', { name, date: new Date() });

        try {
            const response = await this.mailgunClient.messages.create(domain, {
                from,
                to: [to],
                subject: 'Password reset successfully',
                text: 'Your password has been reset successfully',
                html,
            });
            this.logger.log(`Email sent to ${to}: ${response.message}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        }
    }

    async sendWelcomeMessage(to: string, name: string) {
        const domain = configuration().mailgun.domain;
        const from = configuration().mailgun.from;

        const html = await this.compileTemplate('welcome', { name });

        try {
            const response = await this.mailgunClient.messages.create(domain, {
                from,
                to: [to],
                subject: 'Welcome to Idealize',
                text: `Welcome to Idealize ${name}`,
                html,
            });
            this.logger.log(`Email sent to ${to}: ${response.message}`);
        } catch (error) {
            console.log(error);
            this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        }
    }
}
