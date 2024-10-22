import { Controller, Post, Headers, UseGuards, UsePipes, ValidationPipe, Delete, Param, Body, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiHeader, ApiBody } from '@nestjs/swagger';
import { JwtAdminAuthGuard, JwtAuthGuard } from 'src/auth/jwt.guard';
import { CreateReportDto } from '../dtos/create-report-dto';
import { ReportService } from '../services/report.service';
import { Report } from '../schemas/report.schema';

@ApiTags('👑 Reports (admin access)')
@Controller('admin/report')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AdminReportController {

    constructor(private readonly reportService: ReportService) { }

    @Delete('admin/:id')
    @ApiOperation({
        summary: 'This endpoint deletes an report by admin access',
        description: 'This endpoint deletes an report by admin access',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async removeReportByAdmin(@Param('id') id: string) {
        return this.reportService.deleteByAdmin(id);
    }

    @Get('admin/fetch-all')
    @ApiOperation({
        summary: 'This endpoint returns all reports by admin access',
        description: 'This endpoint returns all reports by admin access',
    })
    @ApiHeader({ name: 'Authorization', required: true })
    @UsePipes(new ValidationPipe({ transform: true }))
    async getAllReportsByAdmin(): Promise<Report[]> {
        return this.reportService.getAllByAdmin();
    }
}

