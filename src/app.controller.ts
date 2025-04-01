import { Body, Controller, Get, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiBearerAuth, ApiBody, ApiHeader } from '@nestjs/swagger';
import { CreateReqIosAccessDto } from './shared/dtos/create-ios-access-dto';
import { JwtAdminAuthGuard } from './auth/jwt.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get('hello-world')
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('request-test-account')
  @ApiBody({ type: CreateReqIosAccessDto })
  @UsePipes(new ValidationPipe({ transform: true }))
  async requestTestAccount(@Body() body: CreateReqIosAccessDto) {
    return this.appService.requestTestAccount(body);
  }

  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiHeader({ name: 'Authorization', required: false })
  @UsePipes(new ValidationPipe({ transform: true }))
  @Get('request-test-accounts')
  async getTestAccounts() {
    return this.appService.getTestAccounts();
  }
}
