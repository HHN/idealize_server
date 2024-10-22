import { Controller, Post, Body, UsePipes, ValidationPipe, UseGuards, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { CreateAdminDto, LoginAdminDto } from '../dtos/admin.dtos';
import { Admin } from '../schemas/admin.schema';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
    ) { }

    @Post('login')
    @ApiBody({ type: LoginAdminDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    async login(@Body() adminDto: LoginAdminDto): Promise<Admin> {
        return await this.adminService.login(adminDto);
    }

    @Post('create')
    @ApiBody({ type: CreateAdminDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    async create(@Body() adminDto: CreateAdminDto): Promise<Admin> {
        return await this.adminService.create(adminDto);
    }

    @Post('refresh-token')
    @ApiOperation({
        summary: 'This endpoint refresh the admin`s token',
        description: 'This endpoint refresh the admin`s token',
    })
    @ApiHeader({ name: 'refresh-token', required: true })
    @ApiHeader({ name: 'expired-token', required: true })
    async refreshToken(
        @Headers('expired-token') expiredToken: string,
        @Headers('refresh-token') refreshToken: string): Promise<String> {
        return this.adminService.refreshToken(expiredToken, refreshToken);
    }
}
