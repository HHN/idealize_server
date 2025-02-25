import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from 'src/auth/auth.service';
import { BugReport, BugReportDocument } from '../schemas/bug-report.schema';
import { CreateBugReportDto } from '../dtos/create-bug-report.dto';
import { MailerService } from 'src/mailer/mailer.service';
import { User, UserDocument } from 'src/users/user/schemas/user.schema';

@Injectable()
export class BugReportService {
    constructor(
        @InjectModel(BugReport.name) private bugReportModel: Model<BugReportDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private authService: AuthService,
        private mailerServive: MailerService,
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
                const userData = await this.userModel
                  .findOne({ _id: jwtUser.userId })
                  .exec();
                await this.mailerServive.sendBugReportUnderReview(
                  userData.email,
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
        return await this.bugReportModel.find()
            .populate({
                path: 'userId',
                select: '_id firstName lastName email status userType username profilePicture',
                model: 'User',
                populate: {
                    path: 'profilePicture',
                    model: 'Upload',
                    populate: {
                        path: 'user',
                        model: 'User',
                        select: '_id firstName lastName email userType profilePicture'
                    },
                }
            })
            .sort({ createdAt: -1 })
            .exec();
    }

    async removeByAdmin(bugReportedId: string) {
        return this.bugReportModel.findByIdAndDelete(bugReportedId).exec();
    }

    async updateByAdmin(bugReportedId: string, accepted: boolean = true) {
        return this.bugReportModel.findByIdAndUpdate(bugReportedId, { action: accepted, visited: true, }).exec();
    }
}


