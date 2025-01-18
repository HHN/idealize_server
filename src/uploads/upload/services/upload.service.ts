import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from 'src/auth/auth.service';
import { Upload, UploadDocument } from '../schema/upload.schema';
import { ObjectId } from 'mongodb';

@Injectable()
export class UploadService {
    constructor(@InjectModel(Upload.name) private uploadModel: Model<UploadDocument>,
        private authService: AuthService,
    ) { }

    async new(fileData, token: string): Promise<Upload> {

        const jwtUser = await this.authService.decodeJWT(token);

        const newFile = new this.uploadModel({
            originalName: fileData.originalname,
            newFileName: fileData.filename.replaceAll('.jpg', ''),
            size: fileData.size,
            mimeType: fileData.mimetype,
            filename: fileData.filename,
            path: fileData.path,
            user: jwtUser.userId,
        });

        return (await newFile.save()).populate('user', '_id firstName lastName email');
    }

    async remove(fileId: string, token: string): Promise<boolean> {
        const jwtUser = await this.authService.decodeJWT(token);
        const fileObject = await this.uploadModel.findById(fileId);

        const fs = require('fs');
        try {
            await fs.promises.unlink(fileObject.path);
            await this.uploadModel.findByIdAndDelete(fileId, { user: jwtUser.userId });

            return true;
        } catch (err) {
            console.error(`failed to remove ${fileObject.path}: ${err.message}`);
            return false;
        }
    }

    async removeByAdmin(fileId: string, token: string): Promise<boolean> {
        const fileObject = await this.uploadModel.findById(fileId);

        const fs = require('fs');
        try {
            await fs.promises.unlink(fileObject.path);
            await this.uploadModel.findByIdAndDelete(fileId);

            return true;
        } catch (err) {
            console.error(`failed to remove ${fileObject.path}: ${err.message}`);
            return false;
        }
    }

    async get(id: string): Promise<string> {
        try {
            const fileObject = await this.uploadModel.findOne({ _id: new ObjectId(id) });

            if (fileObject == null) {
                return null;
            }

            return fileObject.filename;
        } catch (er) {
            return null;
        }
    }

    async getAll(): Promise<Upload[]> {
        return this.uploadModel.find().populate('user', '_id firstName lastName email');
    }
}
