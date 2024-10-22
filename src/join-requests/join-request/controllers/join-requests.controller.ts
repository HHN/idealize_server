import { Controller, Post, Headers, UseGuards, UsePipes, ValidationPipe, Delete, Param, Body, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiHeader, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ActionJoinRequestDto } from '../dtos/action-join-request.dto';
import { CreateJoinRequestDto } from '../dtos/create-join-request.dto';
import { JoinRequestsService } from '../services/join-requests.service';


@ApiTags('JoinRequests')
@Controller('join-requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class JoinRequestsController {

    constructor(private readonly joinRequestsService: JoinRequestsService) { }

    @Post()
    @ApiOperation({
        summary: 'This endpoint create a new join Request',
        description: 'This endpoint create a new join Request',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @ApiBody({ type: CreateJoinRequestDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    createNew(@Body() createJoinRequest: CreateJoinRequestDto, @Headers('Authorization') token: string) {
        return this.joinRequestsService.createNew(createJoinRequest, token, false);
    }

    @Post('join')
    @ApiOperation({
        summary: 'This endpoint uses for joining a project',
        description: 'This endpoint uses for joining a project',
    })
    @ApiHeader({ name: 'Authorization', required: false })
    @ApiBody({ type: ActionJoinRequestDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    joinProject(@Body() actionJoinRequestDto: ActionJoinRequestDto, @Headers('Authorization') token: string) {
        return this.joinRequestsService.actionJoinRequest(actionJoinRequestDto, token);
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
