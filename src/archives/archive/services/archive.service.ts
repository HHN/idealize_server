import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Archive, ArchiveDocument } from '../schemas/archive.schema';
import { CreateArchiveDto } from '../dtos/create-archive.dto';
import { AuthService } from 'src/auth/auth.service';
import { NotificationService } from 'src/notifications/notification/services/notification.service';

@Injectable()
export class ArchiveService {
    constructor(
        @InjectModel(Archive.name) private archiveModel: Model<ArchiveDocument>,
        private authService: AuthService,
        private readonly notificationService: NotificationService,
    ) { }

    async new(createArchiveDto: CreateArchiveDto, token: string): Promise<Archive> {
        const jwtUser = await this.authService.decodeJWT(token);

        const found = await this.isArchivedOrNot(jwtUser.userId, createArchiveDto.projectId);

        if (found) {
            return found;
        } else {
            const createdArchive = new this.archiveModel({
                userId: jwtUser.userId,
                projectId: createArchiveDto.projectId,
            });

            // Create a notification
            this.notificationService.generalNotification(
                {
                    title: 'Project archived',
                    message: 'Project archived',
                    projectId: createArchiveDto.projectId,
                    type: 'bookmark',
                    sender: jwtUser.userId,
                    receiver: '',
                }, token);

            return createdArchive.save();
        }
    }

    async getAllArchives(token: string): Promise<Archive[]> {
        const jwtUser = await this.authService.decodeJWT(token);
        return this.archiveModel.find({ userId: jwtUser.userId })
            .populate({
                path: 'userId',
                select: '_id firstName lastName email status userType interestedTags interestedCourses username',
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
                populate: {
                    path: 'owner',
                    populate: {
                        path: 'profilePicture',
                        model: 'Upload',
                        populate: {
                            path: 'user',
                            model: 'User'
                        }
                    },
                }
            })
            .populate({
                path: 'projectId',
                populate: {
                    path: 'owner',
                    populate: {
                        path: 'interestedTags',
                        model: 'Tag',
                    },
                }
            })
            .populate({
                path: 'projectId',
                populate: {
                    path: 'owner',
                    populate: {
                        path: 'interestedCourses',
                        model: 'Tag',
                    },
                }
            })
            .populate({
                path: 'projectId',
                populate: {
                    path: 'owner',
                    populate: {
                        path: 'studyPrograms',
                        model: 'Tag',
                    },
                }
            })
            .populate({
                path: 'projectId',
                populate: {
                    path: 'teamMembers',
                    model: 'User',
                }
            })
            .populate({
                path: 'projectId',
                populate: {
                    path: 'tags',
                    model: 'Tag',
                }
            })
            .populate({
                path: 'projectId',
                populate: {
                    path: 'courses',
                    model: 'Tag',
                }
            })
            .populate({
                path: 'projectId',
                populate: {
                    path: 'attachments',
                    model: 'Upload',
                }
            })
            .exec();
    }

    async isArchivedOrNot(userId: string, projectId: string): Promise<any> {
        return await this.archiveModel.findOne({ userId: userId, projectId: projectId });
    }

    async delete(id: string, token: string): Promise<boolean> {
        const jwtUser = await this.authService.decodeJWT(token);
        const deletedArchived = await this.archiveModel.findByIdAndDelete(id, { userId: jwtUser.userId }).exec();
        if (!!deletedArchived) {
            return true;
        } else { return false; }
    }
}
