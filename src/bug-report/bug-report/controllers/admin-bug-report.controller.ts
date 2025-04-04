import { Controller, Post, Headers, UseGuards, UsePipes, ValidationPipe, Delete, Param, Body, Get, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiHeader, ApiBody } from '@nestjs/swagger';
import { JwtAdminAuthGuard, JwtAuthGuard } from 'src/auth/jwt.guard';
import { BugReportService } from '../services/bug-controller.service';
import { CreateBugReportDto } from '../dtos/create-bug-report.dto';

@ApiTags('👑 Bug Reports (admin access)')
@Controller('admin/bug-report')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AdminBugReportController {
    constructor(private readonly bugReportService: BugReportService) { }

    @Get()
    @ApiOperation({
        summary: 'This endpoint returns all the bug reported',
        description: 'This endpoint returns all the bug reported',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @ApiBody({ type: CreateBugReportDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    fetchAll() {
        return this.bugReportService.fetchAllByAdmin();
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'This endpoint deletes a bug report by admin access',
        description: 'This endpoint deletes a bug report by admin access',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async removeReportByAdmin(@Param('id') id: string) {
        return this.bugReportService.removeByAdmin(id);
    }

    @Put(':id/accept')
    @ApiOperation({
        summary: 'This endpoint accepts a bug report by admin access',
        description: 'This endpoint accepts a bug report by admin access',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async acceptReport(@Param('id') id: string) {
        return this.bugReportService.updateByAdmin(id, true);
    }

    @Put(':id/deny')
    @ApiOperation({
        summary: 'This endpoint denys a bug report by admin access',
        description: 'This endpoint denys a bug report by admin access',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async denyReport(@Param('id') id: string) {
        return this.bugReportService.updateByAdmin(id, false);
    }
}
