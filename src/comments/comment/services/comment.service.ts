import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from '../schemas/comment.schema';
import { CreateCommentDto } from '../dtos/create-comment.dto';
import { AuthService } from 'src/auth/auth.service';
import { NotificationService } from 'src/notifications/notification/services/notification.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
  ) { }

  async create(createCommentDto: CreateCommentDto, token: string): Promise<boolean> {
    const jwtUser = await this.authService.decodeJWT(token);

    await new this.commentModel({ ...createCommentDto, userId: jwtUser.userId }).save();

    if (createCommentDto.parentCommentId != null) {
      const checkParentcommentIdOwner = await this.commentModel.findOne({ _id: createCommentDto.parentCommentId });
      const replyForUserId = checkParentcommentIdOwner.userId;

      this.notificationService.generalNotification(
        {
          title: 'New Comment',
          message: createCommentDto.content,
          projectId: createCommentDto.projectId,
          type: createCommentDto.parentCommentId != null ? 'reply-comment' : 'comment',
          sender: jwtUser.userId,
          receiver: replyForUserId.toString() != jwtUser.userId.toString() ? replyForUserId.toString() : '',
        }, token);
    } else {
      this.notificationService.generalNotification(
        {
          title: 'New Comment',
          message: createCommentDto.content,
          projectId: createCommentDto.projectId,
          type: createCommentDto.parentCommentId != null ? 'reply-comment' : 'comment',
          sender: jwtUser.userId,
          receiver: '',
        }, token);
    }




    return true;
  }

  async findAllOfCommentsCount(projectId: string): Promise<number> {
    return await this.commentModel.countDocuments({ projectId });
  }

  private async findAllRepliesByCommentId(page: number = 1, limit: number = 10, commentId: string): Promise<{ comments: Comment[]; total: number }> {
    const skip = (page - 1) * limit;

    const query = { parentCommentId: commentId };

    const commentsData = await this.commentModel.find(query)
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
        path: 'parentCommentId',
        model: 'Comment',
        populate: {
          path: 'userId',
          model: 'User',
          select: '_id firstName lastName email userType profilePicture',
          populate: {
            path: 'profilePicture',
            model: 'Upload',
            populate: {
              path: 'user',
              model: 'User',
              select: '_id firstName lastName email userType profilePicture'
            },
          },
        },
      })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.commentModel.countDocuments(query);

    return { comments: commentsData, total };
  }

  async findAllByProjectId(page: number = 1, limit: number = 10, projectId: string): Promise<{ comments: Comment[]; total: number }> {
    const skip = (page - 1) * limit;
    const commentsData = await this.commentModel.find({ projectId, parentCommentId: null })
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
        path: 'parentCommentId',
        model: 'Comment',
        populate: {
          path: 'userId',
          model: 'User',
          select: '_id firstName lastName email userType profilePicture',
          populate: {
            path: 'profilePicture',
            model: 'Upload',
            populate: {
              path: 'user',
              model: 'User',
              select: '_id firstName lastName email userType profilePicture'
            },
          },
        },
      })
      .skip(skip)
      .limit(limit)
      .sort({ 'createdAt': 'desc', '_id': 'desc' })
      .lean();


    let commentsWithReplies = [];

    for (const comment of commentsData) {
      const replies = await this.findAllRepliesByCommentId(1, 5, comment._id.toString());
      commentsWithReplies.push({
        ...comment,
        replies
      });
    }

    const total = await this.commentModel.countDocuments({ projectId });
    return { comments: commentsWithReplies, total };
  }

  async findAll(page: number = 1, limit: number = 10,): Promise<{ comments: Comment[]; total: number }> {
    const skip = (page - 1) * limit;
    const commentsData = await this.commentModel.find()
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
        path: 'parentCommentId',
        model: 'Comment',
        populate: {
          path: 'userId',
          model: 'User',
          select: '_id firstName lastName email userType profilePicture',
          populate: {
            path: 'profilePicture',
            model: 'Upload',
            populate: {
              path: 'user',
              model: 'User',
              select: '_id firstName lastName email userType profilePicture'
            },
          },
        },
      })
      .skip(skip)
      .limit(limit)
      .sort({ 'createdAt': 'desc', '_id': 'desc' })
      .lean();


    let commentsWithReplies = [];

    for (const comment of commentsData) {
      const replies = await this.findAllRepliesByCommentId(1, 5, comment._id.toString());
      commentsWithReplies.push({
        ...comment,
        replies
      });
    }

    const total = await this.commentModel.countDocuments();
    return { comments: commentsWithReplies, total };
  }

  async findById(id: string): Promise<Comment> {
    return this.commentModel.findById(id).exec();
  }

  async delete(id: string, token: string): Promise<boolean> {
    const jwtUser = await this.authService.decodeJWT(token);
    let res = await this.commentModel.findOneAndDelete({ _id: id, userId: jwtUser.userId });
    if (!!res) {
      return true;
    }

    return false;
  }

  async deleteByOwner(commentId: string, projectId: string): Promise<boolean> {
    let res = await this.commentModel.findOneAndDelete({ _id: commentId, projectId });
    if (!!res) {
      return true;
    }

    return false;
  }

  async deleteByAdmin(id: string): Promise<boolean> {
    let res = await this.commentModel.findOneAndDelete({ _id: id });
    if (!!res) {
      return true;
    }

    return false;
  }
}
