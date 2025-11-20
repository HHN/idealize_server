import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from '../schemas/comment.schema';
import { CreateCommentDto } from '../dtos/create-comment.dto';
import { AuthService } from 'src/auth/auth.service';
import { NotificationService } from 'src/notifications/notification/services/notification.service';
//TODO SH: GDPR encryption - import EncryptionService for email decryption in nested populates
import { EncryptionService } from 'src/encryption/encryption.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    //TODO SH: GDPR encryption - inject EncryptionService for decrypting populated user emails
    private readonly encryptionService: EncryptionService,
  ) { }

  async create(createCommentDto: CreateCommentDto, token: string): Promise<boolean> {
    const jwtUser = await this.authService.decodeJWT(token);

    await new this.commentModel({ ...createCommentDto, userId: jwtUser.userId }).save();

    if (createCommentDto.parentCommentId != null) {
      const checkParentcommentIdOwner = await this.commentModel.findOne({ _id: createCommentDto.parentCommentId });
      const replyForUserId = checkParentcommentIdOwner.userId;

      if (replyForUserId.toString() != jwtUser.userId.toString()) {
        this.notificationService.generalNotification(
          {
            title: 'New Comment',
            message: createCommentDto.content,
            projectId: createCommentDto.projectId,
            type: createCommentDto.parentCommentId != null ? 'reply-comment' : 'comment',
            sender: jwtUser.userId,
            receiver: replyForUserId.toString() != jwtUser.userId.toString() ? replyForUserId.toString() : '',
          }, token);
      }

    } else {

      if (createCommentDto.userId != createCommentDto.projectOwnerId) {
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

    }




    return true;
  }

  async findAllOfCommentsCount(projectId: string): Promise<number> {
    return await this.commentModel.countDocuments({ projectId });
  }

  private async findAllRepliesByCommentId(page: number = 1, limit: number = 10, commentId: string): Promise<{ comments: Comment[]; total: number }> {
    const skip = (page - 1) * limit;

    const query = { parentCommentId: commentId };

    //TODO SH: GDPR encryption - select +email_enc for userId and nested users in populate
    const commentsData = await this.commentModel.find(query)
      .populate({
        path: 'userId',
        select: '_id firstName lastName email status userType username profilePicture +email_enc', // Select encrypted field
        model: 'User',
        populate: {
          path: 'profilePicture',
          model: 'Upload',
          populate: {
            path: 'user',
            model: 'User',
            select: '_id firstName lastName email userType profilePicture +email_enc' // Nested user
          },
        }
      })
      .populate({
        path: 'parentCommentId',
        model: 'Comment',
        populate: {
          path: 'userId',
          model: 'User',
          select: '_id firstName lastName email userType profilePicture +email_enc', // Select encrypted field
          populate: {
            path: 'profilePicture',
            model: 'Upload',
            populate: {
              path: 'user',
              model: 'User',
              select: '_id firstName lastName email userType profilePicture +email_enc' // Nested user
            },
          },
        },
      })
      .skip(skip)
      .limit(limit)
      .lean();

    // Decrypt user PII in all populated users
    const decryptedComments = commentsData.map(comment => this.decryptUserPII(comment));

    const total = await this.commentModel.countDocuments(query);

    return { comments: decryptedComments, total };
  }

  async findAllByProjectId(
    page: number = 1,
    limit: number = 10,
    projectId: string
  ): Promise<{ comments: Comment[]; total: number }> {
    const skip = (page - 1) * limit;

    //TODO SH: GDPR encryption - include email_enc in aggregate $project stage for decryption
    // Fetch all comments for the project
    const allComments = await this.commentModel.aggregate([
      { $match: { projectId: new Types.ObjectId(projectId) } },
      { $sort: { createdAt: -1, _id: -1 } },

      // Populate User details
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $lookup: {
                from: 'uploads',
                localField: 'profilePicture',
                foreignField: '_id',
                as: 'profilePicture'
              }
            },
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                email: 1,
                email_enc: 1, // Include encrypted email for decryption
                userType: 1,
                profilePicture: { $arrayElemAt: ['$profilePicture', 0] }
              }
            }
          ]
        }
      },
      { $unwind: '$user' }
    ]);

    // Function to build a nested comment structure
    function buildNestedComments(comments: any[], parentId: string | null = null): any[] {
      return comments
        .filter(comment => String(comment.parentCommentId) === String(parentId))
        .map(comment => ({
          ...comment,
          replies: buildNestedComments(comments, String(comment._id))
        }));
    }

    // Get paginated root-level comments
    const rootComments = buildNestedComments(allComments, null).slice(skip, skip + limit);

    // Decrypt user PII in all nested comments (including replies)
    const decryptedComments = rootComments.map(comment => this.decryptUserPII(comment));

    // Get total count of root-level comments
    const total = allComments.filter(comment => !comment.parentCommentId).length;

    return { comments: decryptedComments, total };
  }

  async findAll(page: number = 1, limit: number = 10,): Promise<{ comments: Comment[]; total: number }> {
    const skip = (page - 1) * limit;
    //TODO SH: GDPR encryption - select +email_enc for userId and nested users
    const commentsData = await this.commentModel.find()
      .populate({
        path: 'projectId',
        select: '_id title',
        model: 'Project',
      })
      .populate({
        path: 'userId',
        select: '_id firstName lastName email status userType username profilePicture +email_enc', // Select encrypted field
        model: 'User',
        populate: {
          path: 'profilePicture',
          model: 'Upload',
          populate: {
            path: 'user',
            model: 'User',
            select: '_id firstName lastName email userType profilePicture +email_enc' // Nested user
          },
        }
      })
      .populate({
        path: 'parentCommentId',
        model: 'Comment',
        populate: {
          path: 'userId',
          model: 'User',
          select: '_id firstName lastName email userType profilePicture +email_enc', // Select encrypted field
          populate: {
            path: 'profilePicture',
            model: 'Upload',
            populate: {
              path: 'user',
              model: 'User',
              select: '_id firstName lastName email userType profilePicture +email_enc' // Nested user
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
      
      // Decrypt user PII in comment
      const decryptedComment = this.decryptUserPII(comment);
      
      commentsWithReplies.push({
        ...decryptedComment,
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

    const comment: any = await this.commentModel.findOne({ _id: id }).populate({
      path: 'projectId',
      select: '_id title owner',
      model: 'Project',
    }).lean();

    if (!comment) {
      return false;
    }

    const projectOwner = comment.projectId.owner.toString();

    if (comment.userId.toString() === jwtUser.userId.toString() || projectOwner === jwtUser.userId.toString()) {
      await this.deleteReplies(id);
      await this.commentModel.deleteOne({ _id: id });
      return true;
    } else {
      return false;
    }
  }

  private async deleteReplies(commentId: string): Promise<void> {
    const replies = await this.commentModel.find({ parentCommentId: commentId });

    for (const reply of replies) {
      await this.deleteReplies(reply._id.toString());
      await this.commentModel.deleteOne({ _id: reply._id });
    }
  }

  async deleteByOwner(commentId: string, projectId: string): Promise<boolean> {
    let res = await this.commentModel.findOneAndDelete({ _id: commentId, projectId });
    await this.commentModel.findOneAndDelete({ parentCommentId: commentId });
    if (!!res) {
      return true;
    }

    return false;
  }

  async deleteByAdmin(id: string): Promise<boolean> {
    let res = await this.commentModel.findOneAndDelete({ _id: id });
    await this.commentModel.findOneAndDelete({ parentCommentId: id });
    if (!!res) {
      return true;
    }

    return false;
  }

  //TODO SH: GDPR encryption - helper method to decrypt user PII in populated objects
  /**
   * Decrypts email_enc in a user object or nested structures.
   * Removes email_enc, hashedEmail, and other sensitive fields from response.
   * @param obj - User object, comment with populated user, or any nested structure
   * @returns Same structure with decrypted email field
   */
  private decryptUserPII(obj: any): any {
    if (!obj) return obj;

    // Handle array of objects
    if (Array.isArray(obj)) {
      return obj.map(item => this.decryptUserPII(item));
    }

    // Make a copy to avoid mutating input
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
    if (result.userId && typeof result.userId === 'object') {
      result.userId = this.decryptUserPII(result.userId);
    }
    if (result.user && typeof result.user === 'object') {
      result.user = this.decryptUserPII(result.user);
    }
    if (result.parentCommentId && result.parentCommentId.userId) {
      result.parentCommentId.userId = this.decryptUserPII(result.parentCommentId.userId);
    }
    // Handle profilePicture.user in nested structures
    if (result.profilePicture && typeof result.profilePicture === 'object') {
      if (result.profilePicture.user) {
        result.profilePicture.user = this.decryptUserPII(result.profilePicture.user);
      }
    }

    return result;
  }
}

