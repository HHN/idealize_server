import { Controller, Get, Post, Put, Delete, Param, Body, ValidationPipe, UsePipes, UseGuards, Query, Headers } from '@nestjs/common';
import { ProjectsService } from '../services/project.service';
import { changeOwnerDto, CreateProjectDto, UpdateProjectDto } from '../dtos/project.dto';
import { Project } from '../schemas/project.schema';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) { }

  @Post('new')
  @ApiOperation({
    summary: 'This endpoint creates a project',
    description: 'This endpoint creates a project',
  })
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiBody({ type: CreateProjectDto })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createProjectDto: CreateProjectDto, @Headers('Authorization') token: string): Promise<Project> {
    return this.projectsService.create(createProjectDto, token);
  }

  @Get()
  @ApiOperation({
    summary: 'This endpoint returns all of the projects',
    description: 'This endpoint returns all of the projects',
  })
  @ApiQuery({ name: 'owner', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'Authorization', required: false })
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Headers('Authorization') token: string,
    @Query('owner') owner?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('filter') filter?: string,
    @Query('filterByTag') filterByTag?: string,
    @Query('joined') joined?: boolean,
  ): Promise<{ projects: Project[]; total: number }> {
    return this.projectsService.findAll(
      page,
      limit,
      token,
      owner,
      search,
      sort,
      filter,
      filterByTag,
      joined || false
    );
  }

  @Get('my-projects')
  @ApiOperation({
    summary: 'This endpoint returns all of your projects',
    description: 'This endpoint returns all of your projects',
  })
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAllOfMyProjects(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('isDraft') isDraft: boolean,
    @Headers('Authorization') token: string,
    @Query('filterByTag') filterByTag?: string,
    @Query('joined') joined?: boolean,
  ): Promise<{ projects: Project[]; total: number }> {
    return this.projectsService.findAllOfMyProjects(page,
      limit,
      isDraft,
      token,
      filterByTag,
      joined || false
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'This endpoint returns a project',
    description: 'This endpoint returns a project',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async findOne(
    @Param('id') id: string,
    @Headers('Authorization') token: string,
  ): Promise<Project> {
    return this.projectsService.findOne(id, token);
  }

  @Put('update-owner')
  @ApiOperation({
    summary: 'This endpoint updates the owner of a project',
    description: 'This endpoint updates the owner of a project',
  })
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiBody({ type: changeOwnerDto })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateOwner(
    @Body() bodyData: changeOwnerDto,
    @Headers('Authorization') token: string
  ): Promise<Project> {
    return this.projectsService.updateOwner(bodyData, token);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'This endpoint updates a project',
    description: 'This endpoint updates a project',
  })
  @ApiBody({ type: UpdateProjectDto })
  @ApiHeader({ name: 'Authorization', required: false })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Headers('Authorization') token: string
  ): Promise<Project> {
    return this.projectsService.update(id, updateProjectDto, token);
  }

  @Delete(':projectId/members/:teamMemberId')
  @ApiOperation({
    summary: 'This endpoint deletes a team member from a project',
    description: 'This endpoint deletes a team member from a project (just owner of a project can delete a team member)',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async removeTeamMember(
    @Param('projectId') projectId: string,
    @Param('teamMemberId') teamMemberId: string,
    @Headers('Authorization') token: string
  ): Promise<Project> {
    return this.projectsService.removeTeamMember(projectId, teamMemberId, token);
  }

  @Delete(':projectId/comments/:commentId')
  @ApiOperation({
    summary: 'This endpoint deletes a comment by projects owner',
    description: 'This endpoint deletes a comment by projects owner',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async removeCommentByProjectOwner(
    @Param('projectId') projectId: string,
    @Param('commentId') commentId: string,
    @Headers('Authorization') token: string
  ): Promise<any> {
    return this.projectsService.removeCommentByProjectOwner(projectId, commentId, token);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'This endpoint deletes a project',
    description: 'This endpoint deletes a project',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async remove(
    @Param('id') id: string,
    @Headers('Authorization') token: string
  ): Promise<Project> {
    return this.projectsService.remove(id, token);
  }
}
