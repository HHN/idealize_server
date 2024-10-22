import { Controller, Post, Headers, UseGuards, UsePipes, ValidationPipe, Delete, Param, Body, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiHeader, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ReadNotificationDto } from '../dtos/read-notification.dto';
import { NotificationService } from '../services/notification.service';


@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationController {

    constructor(private readonly notificationsService: NotificationService) { }

    @Post('read')
    @ApiOperation({
        summary: 'This endpoint read a notification',
        description: 'This endpoint read a notification',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @ApiBody({ type: ReadNotificationDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    read(@Body() readNotificationDto: ReadNotificationDto, @Headers('Authorization') token: string) {
        return this.notificationsService.read(readNotificationDto, token);
    }

    @Get('unread-count')
    @ApiOperation({
        summary: 'This endpoint returns the number of unread notifications',
        description: 'This endpoint returns the number of unread notifications',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    unreadNotifications(@Headers('Authorization') token: string) {
        return this.notificationsService.unreadNotifications(token);
    }

    @Get('all')
    @ApiOperation({
        summary: 'This endpoint returns all the notifications',
        description: 'This endpoint returns all the notifications',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    getNotifications(@Headers('Authorization') token: string) {
        return this.notificationsService.getAllNotifications(token);
    }

    @Delete('clear')
    @ApiOperation({
        summary: 'This endpoint clear notifications',
        description: 'This endpoint clear notifications',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @UsePipes(new ValidationPipe({ transform: true }))
    clear(@Headers('Authorization') token: string) {
        return this.notificationsService.clear(token);
    }

    // @Delete(':id')
    // @ApiOperation({
    //     summary: 'This endpoint deletes an archive',
    //     description: 'This endpoint deletes an archive',
    // })
    // @ApiHeader({ name: 'Authorization', required: false })
    // @UsePipes(new ValidationPipe({ transform: true }))
    // async removeFile(@Param('id') id: string, @Headers('Authorization') token: string) {
    //     return this.notificationsService.delete(id, token);
    // }
}
