import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from 'src/auth/auth.service';
import { BugReport, BugReportDocument } from '../schemas/bug-report.schema';
import { CreateBugReportDto } from '../dtos/create-bug-report.dto';
import { MailerService } from 'src/mailer/mailer.service';
import { User, UserDocument } from 'src/users/user/schemas/user.schema';
//TODO SH: GDPR encryption - import EncryptionService for email decryption
import { EncryptionService } from 'src/encryption/encryption.service';

@Injectable()
export class BugReportService {
    constructor(
        @InjectModel(BugReport.name) private bugReportModel: Model<BugReportDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private authService: AuthService,
        private mailerServive: MailerService,
        //TODO SH: GDPR encryption - inject EncryptionService for email operations
        private readonly encryptionService: EncryptionService,
    ) { }

    async new(createReportDto: CreateBugReportDto, token: string): Promise<BugReport> {
        const jwtUser = await this.authService.decodeJWT(token);
        if (jwtUser.userId == createReportDto.userId) {
            const existReport = await this.bugReportModel.findOne({
                userId: createReportDto.userId,
                visited: false,
            });

            if (existReport != null) {
                throw new HttpException(
                    {
                        status: HttpStatus.NOT_ACCEPTABLE,
                        error: 'Already Reported',
                        message: 'You cannot report more than one, please wait for review!',
                    },
                    HttpStatus.NOT_ACCEPTABLE,
                );
            }
            
            try {
                //TODO SH: GDPR encryption - select and decrypt email for notification (post-cutover)
                const userData = await this.userModel
                  .findOne({ _id: jwtUser.userId })
                  .select('+email_enc')
                  .exec();
                
                const decryptedEmail = this.encryptionService.decrypt(userData.email_enc);
                
                await this.mailerServive.sendBugReportUnderReview(
                  decryptedEmail,
                  `${userData.firstName} ${userData.lastName}`,
                  createReportDto.content,
                );
              } catch (er) {
                console.log(er);
              }

            return await this.bugReportModel.create(createReportDto);
        } else {
            throw new HttpException(
                {
                    status: HttpStatus.NOT_ACCEPTABLE,
                    error: 'Incorrect Data',
                    message: 'You cannot create report for other users!',
                },
                HttpStatus.NOT_ACCEPTABLE,
            );
        }
    }

    async fetchAllByAdmin(): Promise<BugReport[]> {
        //TODO SH: GDPR encryption - select +email_enc for userId and nested users, then decrypt
        const bugReports = await this.bugReportModel.find()
            .populate({
                path: 'userId',
                select: '_id firstName lastName email status userType username profilePicture +email_enc', // Select encrypted field
                model: 'User',
                populate: {
                    path: 'profilePicture',
                    model: 'Upload',
                    populate: {
                        path: 'user',
                        model: 'User',
                        select: '_id firstName lastName email userType profilePicture +email_enc' // Nested user
                    },
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        // Decrypt user PII in userId
        return bugReports.map(report => {
            if (report.userId) {
                report.userId = this.decryptUserPII(report.userId);
            }
            return report;
        });
    }

    //TODO SH: GDPR encryption - helper method to decrypt user PII in populated objects
    private decryptUserPII(obj: any): any {
        if (!obj) return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => this.decryptUserPII(item));
        }

        const result = { ...obj };

        if (result.email_enc) {
            try {
                result.email = this.encryptionService.decrypt(result.email_enc);
            } catch (error) {
                console.error('Failed to decrypt email:', error);
                result.email = '';
            }
            delete result.email_enc;
        }

        delete result.hashedEmail;
        delete result.firstName_enc;
        delete result.lastName_enc;
        delete result.username_enc;
        delete result.userType_enc;
        delete result.institution_enc;
        delete result.overview_enc;
        delete result.recoveryEmail_enc;

        if (result.profilePicture && typeof result.profilePicture === 'object') {
            if (result.profilePicture.user) {
                result.profilePicture.user = this.decryptUserPII(result.profilePicture.user);
            }
        }

        return result;
    }

    async removeByAdmin(bugReportedId: string) {
        return this.bugReportModel.findByIdAndDelete(bugReportedId).exec();
    }

    async updateByAdmin(bugReportedId: string, accepted: boolean = true) {
        return this.bugReportModel.findByIdAndUpdate(bugReportedId, { action: accepted, visited: true, }).exec();
    }
}


