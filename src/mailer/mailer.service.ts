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
            // this.logger.log(`Email sent to ${to}: ${response.message}`);
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
                subject: 'Ihr Verifizierungscode für IdeaLize',
                text: `Ihr Verifizierungscode ist: ${code}`,
                html,
                'o:tracking': 'no',
                'o:tracking-clicks': 'no',
                'o:tracking-opens': 'no',
                'o:tag': ['verification', 'transactional'],
                'o:dkim': 'yes',
                'h:Reply-To': 'idealize@hs-heilbronn.de',
                'h:X-Mailgun-Variables': JSON.stringify({ type: 'verification' }),
            });
            // this.logger.log(`Email sent to ${to}: ${response.message}`);
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
                subject: 'Konto erfolgreich gelöscht - IdeaLize',
                text: `Ihr Konto wurde erfolgreich gelöscht`,
                html,
                'o:tracking': 'no',
                'o:tracking-clicks': 'no',
                'o:tracking-opens': 'no',
                'o:tag': ['account-deleted', 'transactional'],
                'o:dkim': 'yes',
                'h:Reply-To': 'idealize@hs-heilbronn.de',
                'h:X-Mailgun-Variables': JSON.stringify({ type: 'account-deleted' }),
            });
            // this.logger.log(`Email sent to ${to}: ${response.message}`);
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
                subject: 'Konto löschen - IdeaLize',
                text: `Ihr Code zum Löschen des Kontos ist: ${code}`,
                html,
                'o:tracking': 'no',
                'o:tracking-clicks': 'no',
                'o:tracking-opens': 'no',
                'o:tag': ['account-delete', 'transactional'],
                'o:dkim': 'yes',
                'h:Reply-To': 'idealize@hs-heilbronn.de',
                'h:X-Mailgun-Variables': JSON.stringify({ type: 'account-delete' }),
            });
            // this.logger.log(`Email sent to ${to}: ${response.message}`);
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
                subject: 'Passwort zurücksetzen - IdeaLize',
                text: `Ihr Code zum Zurücksetzen des Passworts ist: ${code}`,
                html,
                'o:tracking': 'no',
                'o:tracking-clicks': 'no',
                'o:tracking-opens': 'no',
                'o:tag': ['password-reset', 'transactional'],
                'o:dkim': 'yes',
                'h:Reply-To': 'idealize@hs-heilbronn.de',
                'h:X-Mailgun-Variables': JSON.stringify({ type: 'password-reset' }),
            });
            // this.logger.log(`Email sent to ${to}: ${response.message}`);
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
                subject: 'Passwort erfolgreich zurückgesetzt - IdeaLize',
                text: 'Ihr Passwort wurde erfolgreich zurückgesetzt',
                html,
                'o:tracking': 'no',
                'o:tracking-clicks': 'no',
                'o:tracking-opens': 'no',
                'o:tag': ['password-reset-success', 'transactional'],
                'o:dkim': 'yes',
                'h:Reply-To': 'idealize@hs-heilbronn.de',
                'h:X-Mailgun-Variables': JSON.stringify({ type: 'password-reset-success' }),
            });
            // this.logger.log(`Email sent to ${to}: ${response.message}`);
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
                subject: 'Willkommen bei IdeaLize',
                text: `Willkommen bei IdeaLize ${name}`,
                html,
                'o:tracking': 'no',
                'o:tracking-clicks': 'no',
                'o:tracking-opens': 'no',
                'o:tag': ['welcome', 'transactional'],
                'o:dkim': 'yes',
                'h:Reply-To': 'idealize@hs-heilbronn.de',
                'h:X-Mailgun-Variables': JSON.stringify({ type: 'welcome' }),
            });
            // this.logger.log(`Email sent to ${to}: ${response.message}`);
        } catch (error) {
            console.log(error);
            this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        }
    }
}
