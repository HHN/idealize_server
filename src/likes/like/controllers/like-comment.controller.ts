import { Controller, Get, Post, Delete, Param, Body, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CreateCommentLikeDto } from '../dtos/create-comment-like.dto';
import { LikeComment } from '../schemas/like-comment.schema';
import { CommentLikeService } from '../services/like-comment.service'

@ApiTags('Comments likes')
@Controller('comment-likes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CommentLikeController {
  constructor(private readonly likeService: CommentLikeService) { }

  @Post('like')
  @ApiOperation({
    summary: 'This endpoint creates a like',
    description: 'This endpoint creates a like',
  })
  @ApiBody({type: CreateCommentLikeDto})
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createLikeDto: CreateCommentLikeDto): Promise<LikeComment> {
    return this.likeService.create(createLikeDto);
  }

  @Get()
  @ApiOperation({
    summary: 'This endpoint returns all of the liked comments',
    description: 'This endpoint returns all of the liked comments',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAll(): Promise<LikeComment[]> {
    return this.likeService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'This endpoint returns a liked comments',
    description: 'This endpoint returns a liked comments',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async findOne(@Param('id') id: string): Promise<LikeComment> {
    return this.likeService.findById(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'This endpoint deletes a liked comments',
    description: 'This endpoint deletes a liked comments',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async remove(@Param('id') id: string): Promise<LikeComment> {
    return this.likeService.delete(id);
  }
}
