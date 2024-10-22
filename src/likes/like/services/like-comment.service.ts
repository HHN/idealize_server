import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationService } from 'src/notifications/notification/services/notification.service';
import { CreateCommentLikeDto } from '../dtos/create-comment-like.dto';
import { LikeCommentDocument, LikeComment } from '../schemas/like-comment.schema';

@Injectable()
export class CommentLikeService {
    constructor(@InjectModel(LikeComment.name) private likeModel: Model<LikeCommentDocument>,
    // private readonly notificationService: NotificationService,        
) { }

    async create(createLikeDto: CreateCommentLikeDto): Promise<LikeComment> {
        const createdLike = new this.likeModel(createLikeDto);
        return createdLike.save();
    }

    async findAll(): Promise<LikeComment[]> {
        return this.likeModel.find().exec();
    }

    async findById(id: string): Promise<LikeComment> {
        return this.likeModel.findById(id).exec();
    }

    async delete(id: string): Promise<LikeComment> {
        return this.likeModel.findByIdAndDelete(id).exec();
    }
}
