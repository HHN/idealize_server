import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Project, ProjectDocument } from '../schemas/project.schema';
import { changeOwnerDto, CreateProjectDto, UpdateProjectDto } from '../dtos/project.dto';
import { AuthService } from 'src/auth/auth.service';
import { ObjectId } from 'mongodb';
import { ProjectLikeService } from 'src/likes/like/services/like-project.service';
import { CommentsService } from 'src/comments/comment/services/comment.service';
import { ArchiveService } from 'src/archives/archive/services/archive.service';
import { JoinRequestsService } from 'src/join-requests/join-request/services/join-requests.service';
import { CreateJoinRequestDto } from 'src/join-requests/join-request/dtos/create-join-request.dto';
import { ReportService } from 'src/reports/report/services/report.service';
import { UserDocument } from 'src/users/user/schemas/user.schema';
import { ArchiveDocument } from 'src/archives/archive/schemas/archive.schema';
import { TagDocument } from 'src/tags/tag/schemas/tag.schema';

@Injectable()
export class ProjectsService {

  constructor(
    @InjectModel('Project') private readonly projectModel: Model<ProjectDocument>,
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
    @InjectModel('Archive') private readonly archiveModel: Model<ArchiveDocument>,
    @InjectModel('Tag') private readonly tagModel: Model<TagDocument>,
    private readonly authService: AuthService,
    private readonly projectLikeService: ProjectLikeService,
    private readonly commentsService: CommentsService,
    private readonly joinRequestService: JoinRequestsService,
    private readonly reportProjectService: ReportService,
  ) { }

  async create(createProjectDto: CreateProjectDto, token: string): Promise<Project> {

    const jwtUser = await this.authService.decodeJWT(token);

    const createProjectDtoWithoutTeamMembers = { ...createProjectDto };
    createProjectDtoWithoutTeamMembers['teamMembers'] = [];

    const createdProject = new this.projectModel({ ...createProjectDtoWithoutTeamMembers, owner: jwtUser.userId });
    await createdProject.save();


    for (const teamMemberId of createProjectDto.teamMembers) {
      const joinrequestDto: CreateJoinRequestDto = {
        projectId: createdProject._id.toString(),
        receiver: teamMemberId,
        type: 'addTeamMember',
      };

      await this.joinRequestService.createNew(joinrequestDto, token, true);
    }


    return await this.projectModel.findById(createdProject._id)
      .populate({
        path: 'owner',
        populate: {
          path: 'profilePicture',
          model: 'Upload',
          populate: {
            path: 'user',
            model: 'User'
          }
        }
      })
      .populate({
        path: 'owner',
        populate: {
          path: 'interestedTags',
        },
      })
      .populate({
        path: 'owner',
        populate: {
          path: 'interestedCourses',

        },
      })
      .populate({
        path: 'owner',
        populate: {
          path: 'studyPrograms',

        },
      })
      .populate({
        path: 'teamMembers',
        select: '_id, firstName lastName email userType',
      })
      // .populate('profilePicture')
      .populate('tags')
      .populate('courses')
      .populate('thumbnail')
      .populate({
        path: 'attachments',
        populate: { path: 'user', select: '_id firstName lastName email userType' }
      });
  }

  async createByAdmin(createProjectDto: CreateProjectDto): Promise<Project> {
    const createdProject = new this.projectModel(createProjectDto);
    await createdProject.save();
    return createdProject;
  }

  async findAllOfMyProjects(page: number = 1, limit: number = 10, isDraft: boolean, token: string, filterByTag?: string, joined: boolean = false,): Promise<{ projects: Project[]; total: number }> {
    const jwtUser = await this.authService.decodeJWT(token);

    const skip = (page - 1) * limit;
    const query = {
      $or: [
        {
          'owner': jwtUser.userId,
        },
        {
          'teamMembers': { $in: [jwtUser.userId] },
        },
      ]
    };

    if (typeof isDraft === 'boolean') {
      query['isDraft'] = isDraft;
    }

    if (!!filterByTag) {
      query['tags'] = { $in: [filterByTag] };
    }

    const likedProjectIds = await this.projectLikeService.findAll("", jwtUser.userId);

    const projectsQuery = this.projectModel.find(query)
      .populate({
        path: 'owner',
        populate: {
          path: 'profilePicture',
          model: 'Upload',
          populate: {
            path: 'user',
            model: 'User'
          }
        }
      })
      .populate({
        path: 'owner',
        populate: {
          path: 'interestedTags',
        },
      })
      .populate({
        path: 'owner',
        populate: {
          path: 'studyPrograms',
        },
      })
      .populate({
        path: 'owner',
        populate: {
          path: 'interestedCourses',

        },
      })
      .populate({
        path: 'teamMembers',
        select: '_id, firstName lastName email userType',
      })
      .populate('tags')
      .populate('courses')
      .populate('thumbnail')
      .populate({
        path: 'attachments',
        populate: { path: 'user', select: '_id firstName lastName email userType' }
      });

    const total = await this.projectModel.countDocuments(query);
    const projects = await projectsQuery
      .skip(skip)
      .limit(limit)
      .sort({ 'createdAt': 'desc', '_id': 'desc' })
      .lean();

    let projectsWithLikes = [];

    for (const project of projects) {
      const isLiked = likedProjectIds.likes.findIndex(item => item.projectId.toString() == project._id.toString()) !== -1;
      const comments = await this.commentsService.findAllOfCommentsCount(project._id.toString());
      const likes = await this.projectLikeService.likesCount(project._id.toString());
      const isArchived = await this.archiveModel.findOne({ projectId: project._id.toString() });

      var pendingMembers = [];
      const pendingMembersId = await this.joinRequestService.findPendingMembers(project._id.toString());
      if (pendingMembersId && pendingMembersId.length > 0) {
        pendingMembers = (await this.userModel.find({ _id: { $in: pendingMembersId } })
          .lean()
          .select('_id firstName lastName email userType'))
      }

      projectsWithLikes.push({
        ...project,
        isLiked,
        comments,
        likes,
        isArchived: (isArchived !== null),
        archiveId: (isArchived !== null) ? isArchived._id : null,
        pendingMembers,
      });
    }

    return { projects: projectsWithLikes, total };
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    token: string,
    owner?: string,
    search: string = '',
    sort: string = '_id',
    filter: string = 'all',
    filterByTag: string = '',
    joined: boolean = false,
  ): Promise<{ projects: Project[]; total: number }> {

    const jwtUser = await this.authService.decodeJWT(token);
    const likedProjectIds = await this.projectLikeService.findAll("", jwtUser.userId);
    const favoriteProjectIds = await this.archiveModel.find({ userId: jwtUser.userId });

    const skip = (page - 1) * limit;
    const query = {};


    if (owner) {
      query['owner'] = owner;
    }

    const targetUserId = !!owner ? owner : jwtUser.userId;

    query['isDraft'] = false;

    if (!!filterByTag) {
      query['tags'] = { $in: [filterByTag] };
    }

    if (filter === 'my-projects') {
      query['owner'] = jwtUser.userId;
    }

    if (filter === 'favorite-projects') {
      query['_id'] = { $in: [...favoriteProjectIds.map(item => item.projectId)] };
    }

    // *** this condition should be stay last one ***
    let filteredTags = null;
    if (search) {
      query['title'] = { $regex: search, $options: 'i' };
      filteredTags = await this.tagModel.find({ name: { $regex: search, $options: 'i' } });
    }

    let ors = [query];
    if (joined) {
      ors.push({ 'teamMembers': { $in: [targetUserId] } })
    }
    if (!!filteredTags) {
      ors.push({ 'tags': { $in: [...filteredTags.map(item => item._id)] } });
    }

    const projectsQuery = this.projectModel.find()
      .or(ors)
      .populate({
        path: 'owner',
        select: '_id, firstName lastName email userType',
      })
      .populate({
        path: 'teamMembers',
        select: '_id, firstName lastName email userType',
      })
      .populate('courses')
      .populate('tags');

    const total = await this.projectModel.countDocuments(projectsQuery);
    let projects = await projectsQuery
      .skip(skip)
      .limit(limit)
      .sort({ 'createdAt': 'desc', sort: 'desc' })
      .lean();

    let projectsWithLikes = [];

    for (const project of projects) {
      const isLiked = likedProjectIds.likes.findIndex(item => item.projectId.toString() == project._id.toString()) !== -1;
      const comments = await this.commentsService.findAllOfCommentsCount(project._id.toString());
      const likes = await this.projectLikeService.likesCount(project._id.toString());
      const isArchived = await this.archiveModel.findOne({ userId: jwtUser.userId, projectId: project._id.toString() });

      projectsWithLikes.push({
        ...project,
        isLiked,
        comments,
        likes,
        isArchived: (isArchived !== null),
        archiveId: (isArchived !== null) ? isArchived._id : null,
      });
    }


    return { projects: projectsWithLikes, total };
  }


  async findOne(id: string, token: string): Promise<any> {
    const jwtUser = await this.authService.decodeJWT(token);
    const likedProjectIds = await this.projectLikeService.findAll("", jwtUser.userId);

    const project = await this.projectModel.findById(id).populate({
      path: 'owner',
      populate: {
        path: 'profilePicture',
        model: 'Upload',
        populate: {
          path: 'user',
          model: 'User'
        }
      },
    })
      .populate({
        path: 'owner',
        populate: {
          path: 'interestedTags',
        },
      })
      .populate({
        path: 'owner',
        populate: {
          path: 'studyPrograms',
        },
      })
      .populate({
        path: 'owner',
        populate: {
          path: 'interestedCourses',

        },
      })
      .populate({
        path: 'teamMembers',
        select: '_id, firstName lastName email userType',
      })
      .populate('tags')
      .populate('courses')
      .populate('thumbnail')
      .populate({
        path: 'attachments',
        populate: { path: 'user', select: '_id firstName lastName email userType' }
      })
      .lean();

    const isLiked = likedProjectIds.likes.findIndex(item => item.projectId.toString() == project._id.toString()) !== -1;
    const comments = await this.commentsService.findAllOfCommentsCount(project._id.toString());
    const likes = await this.projectLikeService.likesCount(project._id.toString());
    const isArchived = await this.archiveModel.findOne({ userId: jwtUser.userId, projectId: project._id.toString() });
    const joinedStatus = await this.joinRequestService.checkIfUserAlreadySentJoinRequest(project._id.toString(), jwtUser.userId);
    const isReportedProject = await this.reportProjectService.isReported(project._id.toString(), jwtUser.userId);


    return {
      ...project,
      isLiked,
      comments,
      likes,
      isArchived: (isArchived !== null),
      archiveId: (isArchived !== null) ? isArchived._id : null,
      joinedStatus: joinedStatus,
      isReported: isReportedProject,
    }
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    token: string
  ): Promise<Project> {
    const jwtUser = await this.authService.decodeJWT(token);
    const isTeamMembersIncluded = updateProjectDto.teamMembers;

    const currentProject = await this.projectModel.findOne({
      _id: id, $or: [
        { owner: jwtUser.userId },
        { teamMembers: { $in: jwtUser.userId } }
      ]
    }).exec();

    if (!!isTeamMembersIncluded && currentProject.owner.toString() !== jwtUser.userId) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'Permission denied',
          message: 'You dont have permission to edit team members',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (currentProject !== null) {

      var membersRequestsShouldBeKept = [];
      const existingTeamMembers: string[] = currentProject.teamMembers.map(item => item.toString()) || [];
      const pendingTeamMembers: string[] = await this.joinRequestService.findPendingMembers(id) || [];
      const newTeamMembers: string[] = updateProjectDto.teamMembers || [];

      var updatedUsers: string[] = [];

      if (existingTeamMembers) {
        existingTeamMembers.forEach((member) => {
          if (newTeamMembers.includes(member)) {
            updatedUsers.push(member);
          }
        });
      }

      if (pendingTeamMembers) {
        pendingTeamMembers.forEach((member) => {
          if (newTeamMembers.includes(member)) {
            membersRequestsShouldBeKept.push(member);
          }
        });
      }

      if (newTeamMembers) {
        newTeamMembers.forEach((member) => {
          if (!existingTeamMembers.includes(member) && !pendingTeamMembers.includes(member)) {
            membersRequestsShouldBeKept.push(member);
          }
        })
      }

      await this.joinRequestService.upateTeamMemberRequests(jwtUser.userId, currentProject._id.toString(), membersRequestsShouldBeKept, token);

      return this.projectModel.findByIdAndUpdate(id, { ...updateProjectDto, teamMembers: updatedUsers }, { new: true }).exec();
    } else {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'Permission denied',
          message: 'You dont have permission to edit the project',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async updateByAdmin(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const currentProject = await this.projectModel.findOne({
      _id: id,
    }).exec();

    if (currentProject !== null) {
      return this.projectModel.findByIdAndUpdate(id, updateProjectDto, { new: true }).exec()
    } else {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Project not found!',
          message: 'Project not found!',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async removeTeamMember(
    projectId: string,
    teamMemberId: string,
    token: string
  ): Promise<Project> {
    const jwtUser = await this.authService.decodeJWT(token);

    const currentProject = await this.projectModel.findOne({ _id: projectId, owner: jwtUser.userId }).exec();

    if (currentProject !== null) {
      if (currentProject.teamMembers.includes(new ObjectId(teamMemberId))) {
        const newTeamMembers = currentProject.teamMembers.filter(item => item.toString() !== teamMemberId);

        return this.projectModel.findByIdAndUpdate(projectId, { teamMembers: newTeamMembers }, { new: true }).exec();
      }
      else {

        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'MemberId not found',
            message: 'Forbidden not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

    } else {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'Permission denied',
          message: 'You dont have permission to remove a team member',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async removeTeamMemberByAdmin(
    projectId: string,
    teamMemberId: string,
  ): Promise<Project> {


    const currentProject = await this.projectModel.findOne({ _id: projectId }).exec();

    if (currentProject !== null) {
      if (currentProject.teamMembers.includes(new ObjectId(teamMemberId))) {
        const newTeamMembers = currentProject.teamMembers.filter(item => item.toString() !== teamMemberId);

        return this.projectModel.findByIdAndUpdate(projectId, { teamMembers: newTeamMembers }, { new: true }).exec();
      }
      else {

        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'MemberId not found',
            message: 'MemberId not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

    } else {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Project not found!',
          message: 'Project not found!',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async removeCommentByProjectOwner(
    projectId: string,
    commentId: string,
    token: string
  ): Promise<any> {
    const jwtUser = await this.authService.decodeJWT(token);

    const currentProject = await this.projectModel.findOne({ _id: projectId, owner: jwtUser.userId }).exec();

    if (currentProject !== null) {

      return await this.commentsService.deleteByOwner(commentId, currentProject._id.toString());

    } else {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'Forbidden Data',
          message: 'Forbidden Data',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async removeCommentByAdmin(
    projectId: string,
    commentId: string,
  ): Promise<any> {

    const currentProject = await this.projectModel.findOne({ _id: projectId, }).exec();

    if (currentProject !== null) {

      return await this.commentsService.deleteByOwner(commentId, currentProject._id.toString());

    } else {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Comment not found!',
          message: 'Comment not found!',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async removeByAdmin(id: string): Promise<Project> {
    try {
      if (!isValidObjectId(id)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Project Id',
            message: `The provided project id ${id} is not valid!`,
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        const objectId = new ObjectId(id);
        const foundProject = await this.projectModel.findById(objectId).exec();
        if (foundProject) {
          // TODO delete all the related materials
          // TODO delete all the related comments
          // TODO delete all the likes
          // TODO delete all of the archived
          return this.projectModel.findByIdAndDelete(objectId).exec();
        } else {
          throw new HttpException(
            {
              status: HttpStatus.NOT_FOUND,
              error: 'Project Not Found',
              message: `The provided project id ${id} does not exist`,
            },
            HttpStatus.NOT_FOUND,
          );
        }
      }
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: error.name,
          message: error?.message ?? '',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async remove(id: string): Promise<Project> {
    try {
      if (!isValidObjectId(id)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Project Id',
            message: `The provided project id ${id} is not valid!`,
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        const objectId = new ObjectId(id);
        const foundUser = await this.projectModel.findById(objectId).exec();
        if (foundUser) {
          return this.projectModel.findByIdAndDelete(objectId).exec();
        } else {
          throw new HttpException(
            {
              status: HttpStatus.NOT_FOUND,
              error: 'Project Not Found',
              message: `The provided project id ${id} does not exist`,
            },
            HttpStatus.NOT_FOUND,
          );
        }
      }
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: error.name,
          message: error?.message ?? '',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async updateOwner(
    bodyData: changeOwnerDto,
    token: string
  ): Promise<Project> {
    const jwtUser = await this.authService.decodeJWT(token);

    const currentProject = await this.projectModel.findOne({ _id: bodyData.projectId, owner: jwtUser.userId }).exec();

    if (currentProject !== null) {

      // exlude new owner from the project team members
      const newTeamMembers = currentProject.teamMembers.filter(item => item.toString() !== bodyData.ownerId);

      return await this.projectModel.findOneAndUpdate(
        { _id: bodyData.projectId, owner: jwtUser.userId },
        { owner: bodyData.ownerId, teamMembers: newTeamMembers },
        { new: true },
      ).exec();
    } else {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'Forbidden Data',
          message: 'Forbidden Data',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
