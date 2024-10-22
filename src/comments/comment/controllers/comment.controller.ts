import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UsePipes, ValidationPipe, Headers, Query } from '@nestjs/common';
import { CommentsService } from '../services/comment.service';
import { CreateCommentDto } from '../dtos/create-comment.dto';
import { Comment } from '../schemas/comment.schema';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@ApiTags('Comments')
@Controller('comments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CommentsController {
    constructor(private readonly commentService: CommentsService) { }

    @Post('new')
    @ApiOperation({
        summary: 'This endpoint creates a comment',
        description: 'This endpoint creates a comment',
    })
    @ApiBody({ type: CreateCommentDto })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async create(@Body() createCommentDto: CreateCommentDto, @Headers('Authorization') token: string): Promise<boolean> {
        return this.commentService.create(createCommentDto, token);
    }


    @Get(':projectId')
    @ApiOperation({
        summary: 'This endpoint returns all of the comments under a post based on its :projectId',
        description: 'This endpoint returns all of the comments under a post based on its :projectId',
    })
    @ApiBody({ type: CreateCommentDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    async findAllByProjectId(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Param('projectId') projectId: string): Promise<{ comments: Comment[]; total: number }> {
        return this.commentService.findAllByProjectId(page, limit, projectId);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'This endpoint returns an specific comment based on its :id',
        description: 'This endpoint returns an specific comment based on its :id',
    })
    @UsePipes(new ValidationPipe({ transform: true }))
    async findOne(@Param('id') id: string): Promise<Comment> {
        return this.commentService.findById(id);
    }


    @Delete(':id')
    @ApiOperation({
        summary: 'This endpoint deletes an specific comment based on its :id',
        description: 'This endpoint deletes an specific comment based on its :id',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async remove(@Param('id') id: string, @Headers('Authorization') token: string): Promise<boolean> {
        return this.commentService.delete(id, token);
    }
}
