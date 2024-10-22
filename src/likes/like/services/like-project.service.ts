import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from 'src/auth/auth.service';
import { NotificationService } from 'src/notifications/notification/services/notification.service';
import { CreateProjectLikeDto } from '../dtos/create-project-like.dto';
import { LikeProjectDocument, LikeProject } from '../schemas/like-project.schema';

@Injectable()
export class ProjectLikeService {
  constructor(
    @InjectModel(LikeProject.name) private likeModel: Model<LikeProjectDocument>,
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
  ) { }

  async create(createLikeDto: CreateProjectLikeDto, token: string): Promise<boolean> {
    const isLiked = await this.likeModel.findOne({ userId: createLikeDto.userId, projectId: createLikeDto.projectId });

    if (isLiked === null) {
      const createdLike = new this.likeModel(createLikeDto);
      await createdLike.save();

      // Create a notification
      this.notificationService.generalNotification(
        {
          title: 'Project liked',
          message: 'Project liked',
          projectId: createLikeDto.projectId,
          type: 'like',
          sender: createLikeDto.userId,
          receiver: '',
        }, token);

      return true;
    } else {

      // Create a notification
      this.notificationService.generalNotification(
        {
          title: 'Project unliked',
          message: 'Project unliked',
          projectId: createLikeDto.projectId,
          type: 'like',
          sender: createLikeDto.userId,
          receiver: '',
        }, token);


      return await this.delete(isLiked._id.toString(), token);
    }
  }

  async findAll(projectId: string = "", userId: string = ""): Promise<{ likes: LikeProject[], count: Number }> {
    let query = this.likeModel.find();

    if (projectId !== "") {
      query = query.where('projectId').equals(projectId);
    }

    if (userId !== "") {
      query = query.where('userId').equals(userId);
    }

    let likes = await query
      .select('_id userId projectId createdAt updatedAt')
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
      .exec();

    const count = projectId !== "" ? await this.likeModel.countDocuments({ projectId }) : await this.likeModel.countDocuments();

    return { likes, count };
  }

  async findById(id: string): Promise<LikeProject> {
    return this.likeModel.findById(id).exec();
  }

  async delete(projectId: string, token: string): Promise<boolean> {
    const jwtUser = await this.authService.decodeJWT(token);
    let res = await this.likeModel.findOneAndDelete({ projectId, userId: jwtUser.userId });
    if (!!res) {
      return true;
    }

    return false;
  }

  async likesCount(projectId: string,): Promise<number> {
    return await this.likeModel.countDocuments({ projectId });
  }
}
