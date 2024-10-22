import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UsePipes, ValidationPipe, Headers, Query } from '@nestjs/common';
import { CommentsService } from '../services/comment.service';
import { CreateCommentDto } from '../dtos/create-comment.dto';
import { Comment } from '../schemas/comment.schema';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAdminAuthGuard } from 'src/auth/jwt.guard';

@ApiTags('👑 Comments (admin access)')
@Controller('admin/comments')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AdminCommentsController {
    constructor(private readonly commentService: CommentsService) { }

    @Get()
    @ApiOperation({
        summary: 'This endpoint returns all of the comments',
        description: 'This endpoint returns all of the comments',
    })
    @ApiBody({ type: CreateCommentDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    async findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        ): Promise<{ comments: Comment[]; total: number }> {
        return this.commentService.findAll(page, limit);
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
    @UsePipes(new ValidationPipe({ transform: true }))
    async remove(@Param('id') id: string): Promise<boolean> {
        return this.commentService.deleteByAdmin(id);
    }
}
