import { Controller, Get, Post, Put, Delete, Param, Body, ValidationPipe, UsePipes, UseGuards, Query, Headers } from '@nestjs/common';
import { ProjectsService } from '../services/project.service';
import { UpdateProjectDto } from '../dtos/project.dto';
import { Project } from '../schemas/project.schema';
import { JwtAdminAuthGuard } from 'src/auth/jwt.guard';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('👑 Projects (admin access)')
@Controller('admin/projects')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AdminProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Get()
    @ApiOperation({
        summary: 'This endpoint returns all of the projects',
        description: 'This endpoint returns all of the projects',
    })
    @ApiQuery({ name: 'owner', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Headers('Authorization') token: string,
        @Query('owner') owner?: string,
        @Query('search') search?: string,
        @Query('sort') sort?: string,
    ): Promise<{ projects: Project[]; total: number }> {
        return this.projectsService.findAll(page, limit, token, owner, search, sort);
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

    @Put(':id')
    @ApiOperation({
        summary: 'This endpoint updates a project',
        description: 'This endpoint updates a project',
    })
    @ApiBody({ type: UpdateProjectDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    async update(
        @Param('id') id: string,
        @Body() updateProjectDto: UpdateProjectDto,
    ): Promise<Project> {
        return this.projectsService.updateByAdmin(id, updateProjectDto);
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
    ): Promise<Project> {
        return this.projectsService.removeTeamMemberByAdmin(projectId, teamMemberId);
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
    ): Promise<any> {
        return this.projectsService.removeCommentByAdmin(projectId, commentId);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'This endpoint deletes a project',
        description: 'This endpoint deletes a project',
    })
    @UsePipes(new ValidationPipe({ transform: true }))
    async remove(@Param('id') id: string): Promise<Project> {
        return this.projectsService.removeByAdmin(id);
    }

}
