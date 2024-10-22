import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordRequestDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsEmail()
    readonly email: string;
}

export class ResetPasswordDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly code: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly newPassword: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsEmail()
    readonly email: string;
}
