import { Controller, Post, Body, UsePipes, ValidationPipe, Headers, Put, UseGuards, Get, Param, Delete, Patch, Req } from '@nestjs/common';
import { UsersService } from '../services/user.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { User } from '../schemas/user.schema';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LoginUserDto } from '../dtos/login-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { JwtAdminOrUserAuthGuard, JwtAuthGuard } from 'src/auth/jwt.guard';
import { VerifyUserDto } from '../dtos/verify-user.dto';
import { ResendCodeDto } from '../dtos/resend-code.dto';
import { DeleteUserDto } from '../dtos/delete-user.dto';
import { ResetPasswordDto, ResetPasswordRequestDto } from '../dtos/reset-password.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post('new')
  @ApiOperation({
    summary: 'This endpoint creates a user',
    description: 'This endpoint creates a user',
  })
  @ApiBody({ type: CreateUserDto })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createUserDto: CreateUserDto): Promise<any> {
    return this.usersService.create(createUserDto);
  }

  @Post('verify')
  @ApiOperation({
    summary: 'This endpoint verifies a user',
    description: 'This endpoint verifies a user',
  })
  @ApiBody({ type: VerifyUserDto })
  @UsePipes(new ValidationPipe({ transform: true }))
  async verify(@Body() verifyUserDto: VerifyUserDto): Promise<any> {
    return this.usersService.verify(verifyUserDto);
  }

  @Post('resend-code')
  @ApiOperation({
    summary: 'This endpoint resends a new code',
    description: 'This endpoint resends a new code',
  })
  @ApiBody({ type: ResendCodeDto })
  @UsePipes(new ValidationPipe({ transform: true }))
  async resendCode(@Body() resendDto: ResendCodeDto): Promise<any> {
    return this.usersService.resendCode(resendDto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'This endpoint make a user logged in',
    description: 'This endpoint make a user logged in',
  })
  @ApiBody({ type: LoginUserDto })
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(@Body() loginUserDto: LoginUserDto): Promise<User> {
    return this.usersService.login(loginUserDto);
  }

  @Post('refresh-token')
  @ApiOperation({
    summary: 'This endpoint refresh the user`s token',
    description: 'This endpoint refresh the user`s token',
  })
  @ApiHeader({ name: 'refresh-token', required: true })
  @ApiHeader({ name: 'expired-token', required: true })
  async refreshToken(
    @Headers('expired-token') expiredToken: string,
    @Headers('refresh-token') refreshToken: string): Promise<String> {
    return this.usersService.refreshToken(expiredToken, refreshToken);
  }

  @Get()
  @ApiOperation({
    summary: 'This endpoint returns all the users',
    description: 'This endpoint returns all the users',
  })
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'This endpoint returns a user',
    description: 'This endpoint returns a user',
  })
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAdminOrUserAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async findOneById(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  @Put()
  @ApiOperation({
    summary: 'This endpoint update a user data',
    description: 'This endpoint update a user data',
  })
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiBody({ type: UpdateUserDto })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(@Body() updateUserDto: UpdateUserDto, @Headers('Authorization') token: string): Promise<User> {
    return this.usersService.update(updateUserDto, token);
  }

  @Delete('soft-delete-request')
  @ApiOperation({
    summary: 'This endpoint make a delete account request',
    description: 'This endpoint make a delete account request',
  })
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async softDeleteRequest(@Headers('Authorization') token: string): Promise<any> {
    return this.usersService.softDeleteUserRequest(token);
  }

  @Delete('soft-anonymized-delete-request')
  @ApiOperation({
    summary: 'This endpoint make a delete account request',
    description: 'This endpoint make a delete account request',
  })
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async softAnonymizedDeleteRequest(@Headers('Authorization') token: string): Promise<any> {
    return this.usersService.softAnonymizedDeleteUserRequest(token);
  }

  @Delete('soft-keepdata-delete-request')
  @ApiOperation({
    summary: 'This endpoint make a delete account request',
    description: 'This endpoint make a delete account request',
  })
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async softKeepDataDeleteRequest(@Headers('Authorization') token: string): Promise<any> {
    return this.usersService.softKeepDataDeleteUserRequest(token);
  }

  @Delete('verify-soft-delete')
  @ApiOperation({
    summary: 'This endpoint verify to delete account',
    description: 'This endpoint verify to delete account',
  })
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: DeleteUserDto })
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async verifySoftDeleteRequest(
    @Body() deleteUserDto: DeleteUserDto,
    @Headers('Authorization') token: string,
    @Req() request: any
  ): Promise<any> {
    return this.usersService.verifySoftDeleteUser(deleteUserDto, token, request);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'This endpoint sends a reset-password request for user',
    description: 'This endpoint sends a reset-password request for user',
  })
  @ApiBody({ type: ResetPasswordRequestDto })
  @UsePipes(new ValidationPipe({ transform: true }))
  async resetPasswordRequest(
    @Body() resetPasswordRequestDto: ResetPasswordRequestDto,
  ): Promise<any> {
    return this.usersService.sendResetPasswordRequest(resetPasswordRequestDto);
  }

  @Post('reset-password-verify')
  @ApiOperation({
    summary: 'This endpoint verifys a reset-password for user',
    description: 'This endpoint verifys a reset-password for user',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<any> {
    return this.usersService.resetPassword(resetPasswordDto);
  }
}
