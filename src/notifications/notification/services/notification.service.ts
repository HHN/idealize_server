import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { CreateNotificationDto } from '../dtos/create-notification.dto';
import { AuthService } from 'src/auth/auth.service';
import { ReadNotificationDto } from '../dtos/read-notification.dto';
import { ProjectDocument } from 'src/projects/project/schemas/project.schema';
//TODO SH: GDPR encryption - import EncryptionService for email decryption in nested populates
import { EncryptionService } from 'src/encryption/encryption.service';

@Injectable()
export class NotificationService {
    constructor(
        @InjectModel('Project') private readonly projectModel: Model<ProjectDocument>,
        @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
        private authService: AuthService,
        //TODO SH: GDPR encryption - inject EncryptionService for decrypting populated user emails
        private readonly encryptionService: EncryptionService,
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

        //TODO SH: GDPR encryption - select +email_enc for sender and owner, then decrypt
        const notifications = await this.notificationModel.find(query)
            .populate({
                path: 'sender',
                select: '_id firstName lastName email status userType interestedTags interestedCourses username profilePicture +email_enc', // Select encrypted field
                populate: {
                    path: 'profilePicture',
                    model: 'Upload',
                    populate: {
                        path: 'user',
                        model: 'User',
                        select: '_id firstName lastName email userType +email_enc' // Nested user
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
                    select: '_id firstName lastName email userType profilePicture +email_enc', // Select encrypted field
                    populate: {
                        path: 'profilePicture',
                        model: 'Upload',
                    }
                }
            })
            .sort({ 'createdAt': 'desc', '_id': 'desc' })
            .lean();

        const filteredNotifications = notifications.filter(notification => notification.projectId !== null);

        // Decrypt user PII in sender and owner
        const decryptedNotifications = filteredNotifications.map((notification: any) => {
            if (notification.sender) {
                notification.sender = this.decryptUserPII(notification.sender);
            }
            if (notification.projectId && notification.projectId.owner) {
                notification.projectId.owner = this.decryptUserPII(notification.projectId.owner);
            }
            return notification;
        });

        return decryptedNotifications;
    }

    async read(readNotificationDto: ReadNotificationDto, token: string): Promise<boolean> {

        const jwtUser = await this.authService.decodeJWT(token);
        if (jwtUser.userId !== readNotificationDto.userId) {
            throw new HttpException(
                {
                    status: HttpStatus.METHOD_NOT_ALLOWED,
                    error: 'Incorrect Data',
                    message: 'You are not authorized to perform this action!',
                },
                HttpStatus.METHOD_NOT_ALLOWED,
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
        const result = await this.notificationModel.deleteMany(
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
        );

        return result != null;
    }

    async unreadNotifications(token: string): Promise<any> {
        const jwtUser = await this.authService.decodeJWT(token);
        const result = await this.notificationModel.find(
            {
                $and: [
                    { receiver: jwtUser.userId },
                    { isRead: false },
                    { softDeleted: false },
                ]
            },
        ).countDocuments();

        return { unreadNotifications: result }
    }

    async getOneNotification(notificationId: string): Promise<Notification> {
        return await this.notificationModel.findOne({ _id: notificationId });
    }

    //TODO SH: GDPR encryption - helper method to decrypt user PII in populated objects
    /**
     * Decrypts email_enc in a user object or nested structures.
     * Removes email_enc, hashedEmail, and other sensitive fields from response.
     */
    private decryptUserPII(obj: any): any {
        if (!obj) return obj;

        // Handle array of objects
        if (Array.isArray(obj)) {
            return obj.map(item => this.decryptUserPII(item));
        }

        const result = { ...obj };

        // Decrypt email if email_enc exists
        if (result.email_enc) {
            try {
                result.email = this.encryptionService.decrypt(result.email_enc);
            } catch (error) {
                console.error('Failed to decrypt email:', error);
                result.email = '';
            }
            delete result.email_enc;
        }

        // Remove other encrypted/sensitive fields
        delete result.hashedEmail;
        delete result.firstName_enc;
        delete result.lastName_enc;
        delete result.username_enc;
        delete result.userType_enc;
        delete result.institution_enc;
        delete result.overview_enc;
        delete result.recoveryEmail_enc;

        // Recursively decrypt nested user objects
        if (result.profilePicture && typeof result.profilePicture === 'object') {
            if (result.profilePicture.user) {
                result.profilePicture.user = this.decryptUserPII(result.profilePicture.user);
            }
        }

        return result;
    }
}
