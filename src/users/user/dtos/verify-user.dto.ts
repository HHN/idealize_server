import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyUserDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsEmail()
    @Transform(({ value }) => value.toLowerCase())
    readonly email: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly code: string;
}
