import { forwardRef, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JoinRequest, JoinRequestDocument } from '../schemas/join-requests.schema';
import { AuthService } from 'src/auth/auth.service';
import { NotificationService } from 'src/notifications/notification/services/notification.service';
import { CreateJoinRequestDto } from '../dtos/create-join-request.dto';
import { ActionJoinRequestDto } from '../dtos/action-join-request.dto';
import { Project, ProjectDocument } from 'src/projects/project/schemas/project.schema';
import { ObjectId } from 'mongodb';

@Injectable()
export class JoinRequestsService {
    constructor(
        @InjectModel(JoinRequest.name) private joinRequestModel: Model<JoinRequestDocument>,
        @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
        private authService: AuthService,
        private readonly notificationService: NotificationService,

    ) { }

    async createNew(
        createJoinRequestDto: CreateJoinRequestDto,
        token: string,
        projectOwner: boolean
    ): Promise<JoinRequest> {
        const jwtUser = await this.authService.decodeJWT(token);

        if (projectOwner) {
            // Add Team Member
            const notification = new this.joinRequestModel({ ...createJoinRequestDto, sender: jwtUser.userId });
            this.notificationService.createNew(
                {
                    title: 'Join Request',
                    message: 'Join Request',
                    projectId: createJoinRequestDto.projectId,
                    type: 'addTeamMember',
                    sender: jwtUser.userId,
                    receiver: createJoinRequestDto.receiver,
                }, token);
            return await notification.save();
        } else {
            // Join TeamMember

            const duplicateCheck = await this.joinRequestModel.findOne(
                {
                    projectId: createJoinRequestDto.projectId,
                    receiver: createJoinRequestDto.receiver,
                    type: 'joinTeamMember',
                    status: 'pending'
                }
            );
            const myProjectCheck = await this.projectModel.findOne(
                {
                    _id: new ObjectId(createJoinRequestDto.projectId),
                    owner: jwtUser.userId,
                }).countDocuments();

            if (myProjectCheck > 0) {
                throw new HttpException(
                    {
                        status: HttpStatus.UNAUTHORIZED,
                        error: 'Incorrect Data',
                        message: 'You cannot send join request to your project!',
                    },
                    HttpStatus.UNAUTHORIZED,
                );

            }

            if (duplicateCheck == null) {
                const notification = new this.joinRequestModel({ ...createJoinRequestDto, sender: jwtUser.userId });
                const projectOwner = await this.projectModel.findOne({ _id: new ObjectId(createJoinRequestDto.projectId), }).select('owner');

                this.notificationService.createNew(
                    {
                        title: 'Join Request',
                        message: 'Join Request',
                        projectId: createJoinRequestDto.projectId,
                        type: 'joinTeamMember',
                        sender: jwtUser.userId,
                        receiver: projectOwner.owner.toString(),
                    }, token);


                return await notification.save();
            } else {
                throw new HttpException(
                    {
                        status: HttpStatus.UNAUTHORIZED,
                        error: 'Incorrect Data',
                        message: 'You have already sent a join request to this project!',
                    },
                    HttpStatus.UNAUTHORIZED,
                );
            }
        }
    }

    async actionJoinRequest(actionJoinRequestDto: ActionJoinRequestDto, token: string): Promise<boolean> {

        const jwtUser = await this.authService.decodeJWT(token);
        if (jwtUser.userId !== actionJoinRequestDto.userId) {
            throw new HttpException(
                {
                    status: HttpStatus.UNAUTHORIZED,
                    error: 'Incorrect Data',
                    message: 'You are not authorized to perform this action!',
                },
                HttpStatus.UNAUTHORIZED,
            );
        }

        const joinRequest = await this.joinRequestModel.findOneAndUpdate(
            { projectId: actionJoinRequestDto.projectId, receiver: jwtUser.userId, status: 'pending' },
            {
                $set: { status: actionJoinRequestDto.action }
            });

        if (joinRequest !== null) {
            let notifTitle = '';
            let notifMessage = '';

            if (actionJoinRequestDto.action === 'accepted') {
                notifTitle = 'Join Request Accepted';
                notifMessage = 'Join Request Accepted';

                await this.addTeamMember(
                    actionJoinRequestDto.projectId,
                    [joinRequest.type == 'addTeamMember' ?
                        joinRequest.receiver.toString() :
                        joinRequest.sender.toString()]
                );
            } else {
                notifTitle = 'Join Request Canceled';
                notifMessage = 'Join Request Canceled';
            }

            // Create a notification

            await this.notificationService.processOne(actionJoinRequestDto.notificationId, notifMessage);
            const notificationModel = await this.notificationService.getOneNotification(actionJoinRequestDto.notificationId);
            await this.notificationService.createNew(
                {
                    title: notifTitle,
                    message: notifMessage,
                    projectId: actionJoinRequestDto.projectId,
                    type: notificationModel.type,
                    sender: jwtUser.userId,
                    receiver: notificationModel.sender.toString(),

                }, token, true);

            return true;
        }
        else {
            return false;
        }
    }

    async addTeamMember(id: string, newMemberIds: string[]): Promise<boolean> {
        const project = await this.projectModel.findOne({ _id: id });
        let updatedMembers = 0;
        if (!!project) {

            for (const member of newMemberIds) {
                const objId = new ObjectId(member);

                if (!project.teamMembers.includes(objId)) {
                    project.teamMembers.push(objId);
                    updatedMembers++;
                }
            }
            if (updatedMembers > 0) {
                await project.save();
            }

            return true;
        } else {
            return false;
        }
    }
}
