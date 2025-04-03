import { Controller, Post, Headers, UploadedFile, UseGuards, UseInterceptors, UsePipes, ValidationPipe, Delete, Param, Get, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { UploadService } from '../services/upload.service';
import { join } from 'path';
import { Response } from 'express';


@ApiTags('Uploads')
@Controller('uploads')
@ApiBearerAuth('JWT-auth')
export class UploadsController {

    constructor(private readonly uploadService: UploadService) { }

    @UseGuards(JwtAuthGuard)
    @Post('new')
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
            },
        }),
        fileFilter: (req, file, cb) => {
            const allowedMimeTypes = [
                'image/jpeg',
                'image/png',
                'image/gif',
                'application/pdf',
                'application/msword',  // .doc
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
                'application/vnd.ms-powerpoint',  // .ppt
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',  // .pptx
                'video/mp4',  // MP4 videos
            ];

            console.log('file.mimetype: ', file.mimetype);
            if (allowedMimeTypes.includes(file.mimetype)) {
                cb(null, true);  // Accept the file
            } else {
                cb(new Error('File type is not allowed!'), false);  // Reject the file
            }
        },
        // limits: {
        //     fileSize: 10 * 1024 * 1024,  // 5MB file size limit
        // },
    }))
    @ApiOperation({
        summary: 'This endpoint upload a file',
        description: 'This endpoint upload a file',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    uploadFile(@UploadedFile() file, @Headers('Authorization') token: string) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            throw new Error('File size maximum is 10MB');
        }
        return this.uploadService.new(file, token);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    @ApiOperation({
        summary: 'This endpoint deletes a file',
        description: 'This endpoint deletes a file',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async removeFile(@Param('id') id: string, @Headers('Authorization') token: string) {
        return this.uploadService.remove(id, token);
    }

    // Download a file endpoint
    @Get('resource/:id')
    @ApiOperation({
        summary: 'This endpoint gets a file',
        description: 'This endpoint gets a file',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async downloadFile(@Param('id') id: string, @Res() res: Response) {
        const filename = await this.uploadService.get(id);
        if (filename === null) {
            res.send('File not found');
        }
        else {
            const filePath = join(__dirname, '../../../../../uploads', filename);
            res.sendFile(filePath);
        }

    }
}
