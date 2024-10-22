import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { AuthModule } from 'src/auth/auth.module';
import { v4 as uuidv4 } from 'uuid';
import { UploadsController } from './upload/controller/upload.controller';
import { UploadSchema } from './upload/schema/upload.schema';
import { UploadService } from './upload/services/upload.service';
import { configuration } from 'config/configuration';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Upload', schema: UploadSchema }]),
    AuthModule,
    ConfigModule.forRoot(),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async () => ({
        storage: diskStorage({
          destination: (req, file, cb) => {
            cb(null, configuration().uploadPath);
          },
          filename: (req, file, cb) => {
            const min = 100000;
            const max = 999999;
            const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
            const fileExtension = file.originalname.split('.').pop();
            const filename = `${uuidv4()}-${randomNumber}.${fileExtension}`;
            cb(null, filename);
          },
        }),
        // fileFilter: (req, file, cb) => {
        //   const allowedTypes = ["application/pdf", "application/ppt", "application/doc", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/jpg", "image/png", "image/gif", "video/mp4"];
        //   if (!allowedTypes.includes(file.mimetype)) {
        //     req.fileValidationError = 'Invalid file type';
        //     cb(new Error('Invalid file type'), false);
        //   } else {
        //     cb(null, true);
        //   }
        // },
        limits: { fileSize: 10000000 }, // limit to 10MB
      }),
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadService],
})
export class UploadModule { }