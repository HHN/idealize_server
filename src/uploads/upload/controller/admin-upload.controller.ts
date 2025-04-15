import { Controller, Post, Headers, UploadedFile, UseGuards, UseInterceptors, UsePipes, ValidationPipe, Delete, Param, Get, Res, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes, ApiHeader } from '@nestjs/swagger';
import { JwtAdminAuthGuard } from 'src/auth/jwt.guard';
import { UploadService } from '../services/upload.service';
import { join } from 'path';
import { Response } from 'express';


@ApiTags('👑 Uploads (admin access)')
@Controller('admin/uploads')
@ApiBearerAuth('JWT-auth')
export class AdminUploadsController {

    constructor(private readonly uploadService: UploadService) { }

    @UseGuards(JwtAdminAuthGuard)
    @Delete(':id')
    @ApiOperation({
        summary: 'This endpoint deletes a file',
        description: 'This endpoint deletes a file',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async removeFile(@Param('id') id: string, @Headers('Authorization') token: string) {
        return this.uploadService.removeByAdmin(id, token);
    }

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

    @UseGuards(JwtAdminAuthGuard)
    @Get()
    @ApiOperation({
        summary: 'This endpoint gets all files',
        description: 'This endpoint gets all files',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async getAll() {
        return this.uploadService.getAll();
    }

    @UseGuards(JwtAdminAuthGuard)
    @Delete('file/:fileId')
    @ApiOperation({
        summary: 'Delete a file by fileId',
        description: 'Deletes a file from the storage system using the fileId'
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async deleteFile(
        @Param('fileId') fileId: string,
        @Headers('Authorization') token: string
    ) {
        return await this.uploadService.removeByAdmin(fileId, token);
    }
}
