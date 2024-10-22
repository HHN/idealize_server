import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class CreateAdminDto {
    @ApiProperty()
    @IsOptional()
    @IsString()
    fullname: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @IsEmail()
    email: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string;
}

export class LoginAdminDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @IsEmail()
    email: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string;
}