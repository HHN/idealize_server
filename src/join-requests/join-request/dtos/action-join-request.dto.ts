import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ActionJoinRequestDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly action: 'accepted' | 'canceled';
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly projectId: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly userId: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly notificationId: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly type: | 'addTeamMember' | 'joinTeamMember';
}
