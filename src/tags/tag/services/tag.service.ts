import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tag, TagDocument } from '../schemas/tag.schema';
import { CreateTagDto, EditTagDto } from '../dtos/tag.dto';

@Injectable()
export class TagService {
    constructor(@InjectModel(Tag.name) private tagModel: Model<TagDocument>) { }

    async create(createTagDto: CreateTagDto): Promise<Tag> {
        const createdTag = new this.tagModel(createTagDto);
        return createdTag.save();
    }

    async createBulk(createTagDto: CreateTagDto[]): Promise<Tag[]> {
        return this.tagModel.insertMany(createTagDto);
    }

    async findAll(requestQuery = null): Promise<Tag[]> {
        const sortField = requestQuery.sortField ? requestQuery.sortField : 'createdAt';
        const sortOrder = requestQuery.sort === 'desc' ? -1 : 1;

        return this.tagModel.find()
            .sort({ [sortField]: sortOrder })
            .exec();
    }

    async findById(id: string): Promise<Tag> {
        return this.tagModel.findById(id).exec();
    }

    async update(id: string, updateTagDto: Partial<CreateTagDto>): Promise<Tag> {
        return this.tagModel.findByIdAndUpdate(id, updateTagDto, { new: true }).exec();
    }

    async delete(id: string): Promise<Tag> {
        return this.tagModel.findByIdAndDelete(id).exec();
    }

    async edit(id: string, editTagDto: Partial<EditTagDto>): Promise<Tag> {
        return this.tagModel.findByIdAndUpdate(id, editTagDto, { new: true }).exec();
    }
}
