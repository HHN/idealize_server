import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from '../schemas/report.schema';
import { CreateReportDto } from '../dtos/create-report-dto';
import { AuthService } from 'src/auth/auth.service';
import { NotificationService } from 'src/notifications/notification/services/notification.service';

@Injectable()
export class ReportService {
    constructor(
        @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
        private authService: AuthService,
        private readonly notificationService: NotificationService,
    ) { }

    async new(createReportDto: CreateReportDto, token: string): Promise<Report> {
        const jwtUser = await this.authService.decodeJWT(token);
        if (jwtUser.userId == createReportDto.userId) {
            const existReport = await this.reportModel.findOne({
                projectId: createReportDto.projectId,
                reportedUser: createReportDto.reportedUser,
                userId: jwtUser.userId,
                action: false,
            });

            if (existReport != null) {
                throw new HttpException(
                    {
                        status: HttpStatus.NOT_ACCEPTABLE,
                        error: 'Already Reported',
                        message: 'You cannot report more than one',
                    },
                    HttpStatus.NOT_ACCEPTABLE,
                );
            }

            // Create a notification
            this.notificationService.generalNotification(
                {
                    title: 'Report Notice',
                    message: 'You got a report notice',
                    projectId: createReportDto.projectId,
                    type: 'report',
                    sender: jwtUser.userId,
                    receiver: createReportDto.reportedUser,
                }, token);

            return await this.reportModel.create(createReportDto);
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

    async delete(id: string, token: string): Promise<boolean> {
        const jwtUser = await this.authService.decodeJWT(token);
        const deletedArchived = await this.reportModel.findByIdAndDelete(id, { userId: jwtUser.userId }).exec();
        if (!!deletedArchived) {
            return true;
        } else { return false; }
    }

    async deleteByAdmin(id: string): Promise<Report> {
        return this.reportModel.findByIdAndDelete(id).exec();
    }

    async getAllByAdmin(): Promise<Report[]> {
        return await this.reportModel.find()
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
            .populate({
                path: 'reportedUser',
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
            .populate({
                path: 'projectId',
                model: 'Project'
            })
            .sort({ createdAt: -1 })
            .exec();
    }

    async isReported(projectId: string, userId: string, type: string = 'project'): Promise<boolean> {
        const report = await this.reportModel.findOne({ projectId, userId: userId, type }).exec();
        if (!!report) {
            return true;
        } else { return false; }
    }
}
