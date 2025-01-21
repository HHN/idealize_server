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
                        status: HttpStatus.BAD_REQUEST,
                        error: 'Incorrect Data',
                        message: 'You cannot send join request to your project!',
                    },
                    HttpStatus.BAD_REQUEST,
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
                        status: HttpStatus.BAD_REQUEST,
                        error: 'Already Sent',
                        message: 'You have already sent a join request to this project!',
                    },
                    HttpStatus.BAD_REQUEST,
                );
            }
        }
    }

    async actionJoinRequest(actionJoinRequestDto: ActionJoinRequestDto, token: string): Promise<boolean> {

        const jwtUser = await this.authService.decodeJWT(token);
        if (jwtUser.userId !== actionJoinRequestDto.userId) {
            throw new HttpException(
                {
                    status: HttpStatus.BAD_REQUEST,
                    error: 'Incorrect Data',
                    message: 'You are not authorized to perform this action!',
                },
                HttpStatus.BAD_REQUEST,
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

    async removeTeamMemberRequest(projectId: string, teamMemberId: string): Promise<void> {
        await this.joinRequestModel.findOneAndDelete({
            projectId: projectId,
            receiver: teamMemberId,
            type: 'addTeamMember',
            status: 'pending'
        });

        // TODO : Add notification
    }

    async upateTeamMemberRequests(senderId: string, projectId: string, keepReceiverIds: string[], token: string): Promise<void> {

        const requests = await this.joinRequestModel.find({
            projectId: projectId,
            sender: senderId,
            type: 'addTeamMember',
            status: 'pending'
        });


        for (const receiver of keepReceiverIds) {
            if (!(requests.map((request) => request.receiver.toString()).includes(receiver))) {
                await this.joinRequestModel.create({
                    projectId: projectId,
                    receiver: receiver,
                    sender: senderId,
                    type: 'addTeamMember',
                    status: 'pending'
                });

                this.notificationService.createNew(
                    {
                        title: 'Join Request',
                        message: 'Join Request',
                        projectId: projectId,
                        type: 'addTeamMember',
                        sender: senderId,
                        receiver: receiver,
                    }, token);
            }
        }

        await this.joinRequestModel.deleteMany({
            projectId: projectId,
            receiver: { $nin: keepReceiverIds },
            sender: senderId,
            type: 'addTeamMember',
            status: 'pending'
        });



        // TODO : Add notification
    }

    async findPendingMembers(id: string): Promise<string[]> {
        const project = await this.projectModel.findOne({ _id: id });
        if (!!project) {
            const membersPending = await this.joinRequestModel.find({ projectId: id, status: 'pending', type: 'addTeamMember' });
            if (membersPending.length > 0) {
                return membersPending.map((member) => member.receiver.toString());
            }
        } else {
            return [];
        }
    }

    async checkIfUserAlreadySentJoinRequest(projectId: string, userId: string): Promise<'canceled' | 'accepted' | 'pending' | null> {
        const joinRequest = await this.joinRequestModel.findOne({
            projectId: projectId,
            sender: userId,
        });

        if (joinRequest === null) {
            return null;
        }

        return joinRequest.status;
    }
}
