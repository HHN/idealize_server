import { Controller, Post, Headers, UseGuards, UsePipes, ValidationPipe, Delete, Param, Body, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiHeader, ApiBody } from '@nestjs/swagger';
import { JwtAdminAuthGuard, JwtAuthGuard } from 'src/auth/jwt.guard';
import { SeedingService } from './seeding.service';

@ApiTags('👑 Seeding data (admin access)')
@Controller('admin/seeding')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AdminSeedingController {

    constructor(private readonly seedingService: SeedingService) { }

    @Post('tags')
    @ApiOperation({
        summary: 'This endpoint creates tags for seeding',
        description: 'This endpoint creates tags for seeding',
    })
    @ApiHeader({ name: 'Authorization', required: true })
    @UsePipes(new ValidationPipe({ transform: true }))
    async tagsMockup(): Promise<any> {
        return this.seedingService.tagsMockup();
    }

    @Post('users')
    @ApiOperation({
        summary: 'This endpoint creates users for seeding',
        description: 'This endpoint creates users for seeding',
    })
    @ApiHeader({ name: 'Authorization', required: true })
    @UsePipes(new ValidationPipe({ transform: true }))
    async usersMockup(): Promise<any> {
        return this.seedingService.usersMockup();
    }

    @Post('projects')
    @ApiOperation({
        summary: 'This endpoint creates projects for seeding',
        description: 'This endpoint creates projects for seeding',
    })
    @ApiHeader({ name: 'Authorization', required: true })
    @UsePipes(new ValidationPipe({ transform: true }))
    async projectsMockup(): Promise<any> {
        return this.seedingService.projectsMockup();
    }

    @Delete('all')
    @ApiOperation({
        summary: 'This endpoint deletes all seeds',
        description: 'This endpoint deletes all seeds',
    })
    @ApiHeader({ name: 'Authorization', required: true })
    @UsePipes(new ValidationPipe({ transform: true }))
    async clearAllSeeds(): Promise<any> {
        return this.seedingService.clearAllSeeds();
    }
}

