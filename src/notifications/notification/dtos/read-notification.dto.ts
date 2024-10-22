import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class ReadNotificationDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly userId: string;
    @ApiProperty()
    @IsArray()
    readonly notificationsId: string[];
}
