import { Controller, Post, Headers, UseGuards, UsePipes, ValidationPipe, Delete, Param, Body, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiHeader, ApiBody } from '@nestjs/swagger';
import { JwtAdminAuthGuard, JwtAuthGuard } from 'src/auth/jwt.guard';
import { CreateReportDto } from '../dtos/create-report-dto';
import { ReportService } from '../services/report.service';
import { Report } from '../schemas/report.schema';

@ApiTags('Reports')
@Controller('report')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReportController {

    constructor(private readonly reportService: ReportService) { }
    
    @Post('new')
    @ApiOperation({
        summary: 'This endpoint create a new report',
        description: 'This endpoint create a new report',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @ApiBody({ type: CreateReportDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    new(@Body() createReportDto: CreateReportDto, @Headers('Authorization') token: string) {
        return this.reportService.new(createReportDto, token);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'This endpoint deletes an report',
        description: 'This endpoint deletes an report',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async removeFile(@Param('id') id: string, @Headers('Authorization') token: string) {
        return this.reportService.delete(id, token);
    }
}

