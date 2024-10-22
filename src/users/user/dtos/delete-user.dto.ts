import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class DeleteUserDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly code: string;
}
