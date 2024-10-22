import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly title: string;
    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly message: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly type: 'like' | 'comment' | 'reply-comment' | 'addTeamMember' | 'joinTeamMember' | 'projectUpdate' | 'bookmark' | 'report';
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly projectId: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly sender: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly receiver: string;
}
