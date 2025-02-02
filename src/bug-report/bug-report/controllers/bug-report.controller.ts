import { Controller, Post, Headers, UseGuards, UsePipes, ValidationPipe, Delete, Param, Body, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiHeader, ApiBody } from '@nestjs/swagger';
import { JwtAdminAuthGuard, JwtAuthGuard } from 'src/auth/jwt.guard';
import { BugReportService } from '../services/bug-controller.service';
import { CreateBugReportDto } from '../dtos/create-bug-report.dto';

@ApiTags('Bug Reports')
@Controller('bug-report')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BugReportController {
    constructor(private readonly bugReportService: BugReportService) { }

    @Post('new')
    @ApiOperation({
        summary: 'This endpoint create a new bug report',
        description: 'This endpoint create a new bug report',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @ApiBody({ type: CreateBugReportDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    new(@Body() createReportDto: CreateBugReportDto, @Headers('Authorization') token: string) {
        return this.bugReportService.new(createReportDto, token);
    }
}
