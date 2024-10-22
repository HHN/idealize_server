import { Controller, Post, Headers, UploadedFile, UseGuards, UseInterceptors, UsePipes, ValidationPipe, Delete, Param, Body, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes, ApiHeader, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CreateArchiveDto } from '../dtos/create-archive.dto';
import { ArchiveService } from '../services/archive.service';


@ApiTags('Archives')
@Controller('archive')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ArchiveController {

    constructor(private readonly archiveService: ArchiveService) { }

    @Post('new')
    @ApiOperation({
        summary: 'This endpoint create a new archive',
        description: 'This endpoint create a new archive',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @ApiBody({ type: CreateArchiveDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    new(@Body() createArchiveDto: CreateArchiveDto, @Headers('Authorization') token: string) {
        return this.archiveService.new(createArchiveDto, token);
    }

    @Get('all')
    @ApiOperation({
        summary: 'This endpoint returns all the archive',
        description: 'This endpoint returns all the archive',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    getArchives(@Headers('Authorization') token: string) {
        return this.archiveService.getAllArchives(token);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'This endpoint deletes an archive',
        description: 'This endpoint deletes an archive',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async removeFile(@Param('id') id: string, @Headers('Authorization') token: string) {
        return this.archiveService.delete(id, token);
    }
}
