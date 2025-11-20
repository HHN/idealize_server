import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from 'src/auth/auth.service';
import { Upload, UploadDocument } from '../schema/upload.schema';
import { ObjectId } from 'mongodb';
//TODO SH: GDPR encryption - import EncryptionService for email decryption in populated user
import { EncryptionService } from 'src/encryption/encryption.service';

@Injectable()
export class UploadService {
    constructor(@InjectModel(Upload.name) private uploadModel: Model<UploadDocument>,
        private authService: AuthService,
        //TODO SH: GDPR encryption - inject EncryptionService for decrypting populated user emails
        private readonly encryptionService: EncryptionService,
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

        //TODO SH: GDPR encryption - select +email_enc for user, then decrypt
        const savedFile = await (await newFile.save()).populate({
            path: 'user',
            select: '_id firstName lastName email +email_enc' // Select encrypted field
        });

        // Decrypt user PII
        const fileObj = savedFile.toObject();
        if (fileObj.user) {
            fileObj.user = this.decryptUserPII(fileObj.user);
        }

        return fileObj as Upload;
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
        //TODO SH: GDPR encryption - select +email_enc for user, then decrypt
        const uploads = await this.uploadModel.find()
            .populate({
                path: 'user',
                select: '_id firstName lastName email +email_enc' // Select encrypted field
            })
            .lean();

        // Decrypt user PII in all uploads
        return uploads.map(upload => {
            if (upload.user) {
                upload.user = this.decryptUserPII(upload.user);
            }
            return upload;
        });
    }

    //TODO SH: GDPR encryption - helper method to decrypt user PII in populated objects
    private decryptUserPII(obj: any): any {
        if (!obj) return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => this.decryptUserPII(item));
        }

        const result = { ...obj };

        if (result.email_enc) {
            try {
                result.email = this.encryptionService.decrypt(result.email_enc);
            } catch (error) {
                console.error('Failed to decrypt email:', error);
                result.email = '';
            }
            delete result.email_enc;
        }

        delete result.hashedEmail;
        delete result.firstName_enc;
        delete result.lastName_enc;
        delete result.username_enc;
        delete result.userType_enc;
        delete result.institution_enc;
        delete result.overview_enc;
        delete result.recoveryEmail_enc;

        return result;
    }
}

