import { Controller, Get, Post, Delete, Param, Body, UsePipes, ValidationPipe, UseGuards, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CreateProjectLikeDto } from '../dtos/create-project-like.dto';
import { LikeProject } from '../schemas/like-project.schema';
import { ProjectLikeService } from '../services/like-project.service'

@ApiTags('Projects likes')
@Controller('project-likes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectLikeController {
  constructor(private readonly likeService: ProjectLikeService) { }

  @Post('like')
  @ApiOperation({
    summary: 'This endpoint creates a like',
    description: 'This endpoint creates a like',
  })
  @ApiHeader({ name: 'Authorization', required: false })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createLikeDto: CreateProjectLikeDto,  @Headers('Authorization') token: string): Promise<boolean> {
    return this.likeService.create(createLikeDto, token);
  }

  @Get(':projectId')
  @ApiOperation({
    summary: 'This endpoint returns all of the likes about a project',
    description: 'This endpoint returns all of the likes about a project',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAllProjectsLike(@Param('projectId') projectId: string): Promise<{likes: LikeProject[], count: Number}> {
    return this.likeService.findAll(projectId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'This endpoint deletes a liked project',
    description: 'This endpoint deletes a liked project',
  })
  @ApiHeader({ name: 'Authorization', required: false })
  @UsePipes(new ValidationPipe({ transform: true }))
  async remove(@Param('id') id: string,  @Headers('Authorization') token: string): Promise<boolean> {
    return this.likeService.delete(id, token);
  }
}
