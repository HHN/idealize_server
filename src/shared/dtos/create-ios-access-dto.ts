import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateReqIosAccessDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsEmail()
    readonly email: string;
    
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly firstName: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly lastName: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly recaptchaToken: string;
}
