import { Controller, Post, Body, UsePipes, ValidationPipe, Headers, Put, UseGuards, Get, Param, Delete, Patch, Query } from '@nestjs/common';
import { UsersService } from '../services/user.service';
import { User } from '../schemas/user.schema';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAdminAuthGuard } from 'src/auth/jwt.guard';
import { UpdateUserByAdminDto } from '../dtos/update-user-by-admin.dto';
import { CreateUserDto } from '../dtos/create-user.dto';

@ApiTags('👑 Users (admin access)')
@Controller('admin/users')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AdminUsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post('/new')
    @ApiOperation({
        summary: 'This endpoint creates a new user',
        description: 'This endpoint creates a new user',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async create(@Body() user: CreateUserDto): Promise<User> {
        return this.usersService.createByAdmin(user);
    }

    @Get()
    @ApiOperation({
        summary: 'This endpoint returns all the users',
        description: 'This endpoint returns all the users',
    })
    @ApiHeader({ name: 'Authorization', required: false })

    @UsePipes(new ValidationPipe({ transform: true }))
    async findAll(@Query() query): Promise<User[]> {
        return this.usersService.findAll(true, query);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'This endpoint returns a user object',
        description: 'This endpoint returns a user object',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async findOneById(@Param('id') id: string): Promise<User> {
        return this.usersService.findByIdAsAdmin(id);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'This endpoint edits a user object',
        description: 'This endpoint edits a user object',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async editByAdmin(
        @Param('id') id: string,
        @Body() updateUserByAdminDto: UpdateUserByAdminDto,
    ): Promise<User> {
        return this.usersService.editByAdmin(id, updateUserByAdminDto);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'This endpoint delete a user',
        description: 'This endpoint a user',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async deleteOneById(@Param('id') id: string): Promise<User> {
        return this.usersService.delete(id);
    }

    @Get('activate/:id')
    @ApiOperation({
        summary: 'This endpoint active a user',
        description: 'This active a user',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async activateUser(@Param('id') id: string): Promise<User> {
        return this.usersService.activate(id);
    }

    @Get('deactivate/:id')
    @ApiOperation({
        summary: 'This endpoint deactive a user',
        description: 'This deactive a user',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async deActivateUser(@Param('id') id: string): Promise<User> {
        return this.usersService.deactivate(id);
    }

    @Get('block/:id')
    @ApiOperation({
        summary: 'This endpoint block a user',
        description: 'This endpoint block a user',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async blockUser(@Param('id') id: string): Promise<User> {
        return this.usersService.block(id);
    }

    @Get('unblock/:id')
    @ApiOperation({
        summary: 'This endpoint unblock a user',
        description: 'This endpoint unblock a user',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    async unBlockUser(@Param('id') id: string): Promise<User> {
        return this.usersService.unblock(id);
    }
}
