import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { CreateNotificationDto } from '../dtos/create-notification.dto';
import { AuthService } from 'src/auth/auth.service';
import { ReadNotificationDto } from '../dtos/read-notification.dto';
import { ProjectDocument } from 'src/projects/project/schemas/project.schema';

@Injectable()
export class NotificationService {
    constructor(
        @InjectModel('Project') private readonly projectModel: Model<ProjectDocument>,
        @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
        private authService: AuthService,
    ) { }

    async generalNotification(
        createNotificationDto: CreateNotificationDto,
        token: string
    ): Promise<any> {
        const jwtUser = await this.authService.decodeJWT(token);

        const project = await this.projectModel.findOne({ _id: createNotificationDto.projectId }).select('owner');

        let receiver = project.owner.toString();

        if (['comment', 'reply-comment'].includes(createNotificationDto.type)) {
            if (project.owner.toString() == createNotificationDto.sender) {
                // own project
                if (createNotificationDto.receiver != '') {
                    receiver = createNotificationDto.receiver;

                    const notification = new this.notificationModel({
                        title: createNotificationDto.title,
                        message: createNotificationDto.message,
                        sender: createNotificationDto.sender,
                        receiver: receiver,
                        projectId: createNotificationDto.projectId,
                        type: createNotificationDto.type,
                    });

                    return await notification.save();
                }
            } else {
                const notification = new this.notificationModel({
                    title: createNotificationDto.title,
                    message: createNotificationDto.message,
                    sender: createNotificationDto.sender,
                    receiver: receiver,
                    projectId: createNotificationDto.projectId,
                    type: createNotificationDto.type,
                });

                return await notification.save();
            }
        } else {
            
            if(createNotificationDto.type == 'report'){
                receiver = createNotificationDto.receiver;
            }

            const notification = new this.notificationModel({
                title: createNotificationDto.title,
                message: createNotificationDto.message,
                sender: createNotificationDto.sender,
                receiver: receiver,
                projectId: createNotificationDto.projectId,
                type: createNotificationDto.type,
            });

            return await notification.save();
        }
    }
    async createNew(
        createNotificationDto: CreateNotificationDto,
        token: string,
        processed: boolean = false
    ): Promise<Notification> {
        const jwtUser = await this.authService.decodeJWT(token);
        const notification = new this.notificationModel({
            title: createNotificationDto.title,
            message: createNotificationDto.message,
            sender: jwtUser.userId,
            receiver: createNotificationDto.receiver,
            projectId: createNotificationDto.projectId,
            type: createNotificationDto.type,
            processed: processed,
        });

        return await notification.save();
    }

    async processOne(notificationId: string, newMessage: string): Promise<void> {
        await this.notificationModel.findOne({ _id: notificationId }).updateOne({ message: newMessage, processed: true });
    }

    async getAllNotifications(token: string): Promise<Notification[]> {
        const jwtUser = await this.authService.decodeJWT(token);

        let query = {
            $and: [
                {
                    receiver: jwtUser.userId,
                },
                {
                    $or: [
                        {
                            softDeleted: false
                        },
                        {
                            softDeleted: null,
                        }
                    ]
                }
            ]
        };

        const notifications = await this.notificationModel.find(query)
            .populate({
                path: 'sender',
                select: '_id firstName lastName email status userType interestedTags interestedCourses username profilePicture',
                populate: {
                    path: 'profilePicture',
                    model: 'Upload',
                    populate: {
                        path: 'user',
                        model: 'User',
                        select: '_id firstName lastName email userType'
                    }
                }
            })
            .populate({
                path: 'projectId',
                model: 'Project',
                populate: {
                    path: 'thumbnail',
                    model: 'Upload'
                }
            })
            .populate({
                path: 'projectId',
                model: 'Project',
                populate: {
                    path: 'owner',
                    model: 'User',
                    select: '_id firstName lastName email userType profilePicture',
                    populate: {
                        path: 'profilePicture',
                        model: 'Upload',
                    }
                }
            })
            .sort({ 'createdAt': 'desc', '_id': 'desc' })
            .exec();

        const filteredNotifications = notifications.filter(notification => notification.projectId !== null);

        return filteredNotifications;
    }

    async read(readNotificationDto: ReadNotificationDto, token: string): Promise<boolean> {

        const jwtUser = await this.authService.decodeJWT(token);
        if (jwtUser.userId !== readNotificationDto.userId) {
            throw new HttpException(
                {
                    status: HttpStatus.UNAUTHORIZED,
                    error: 'Incorrect Data',
                    message: 'You are not authorized to perform this action!',
                },
                HttpStatus.UNAUTHORIZED,
            );
        }

        const result = await this.notificationModel.updateMany(
            { _id: { $in: readNotificationDto.notificationsId } },
            { $set: { isRead: true } },
        );


        return result != null;
    }

    async clear(token: string): Promise<boolean> {
        const jwtUser = await this.authService.decodeJWT(token);
        const result = await this.notificationModel.updateMany(
            {
                receiver: jwtUser.userId,
                $or: [
                    {
                        type: { $in: ['addTeamMember', 'joinTeamMember'] },
                        processed: true,
                    },
                    {
                        type: { $not: { $in: ['addTeamMember', 'joinTeamMember'] } },
                        processed: false,
                    }
                ]
            },
            { $set: { softDeleted: true } },
        );

        return result != null;
    }

    async unreadNotifications(token: string): Promise<any> {
        const jwtUser = await this.authService.decodeJWT(token);
        const result = await this.notificationModel.find(
            {
                $and: [
                    { receiver: jwtUser.userId },
                    { isRead: false }
                ]
            },
        ).countDocuments();

        return { unreadNotifications: result }
    }

    async getOneNotification(notificationId: string): Promise<Notification> {
        return await this.notificationModel.findOne({ _id: notificationId });
    }
}
