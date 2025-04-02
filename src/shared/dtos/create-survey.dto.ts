import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSurveyDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly q1: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly q2: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly q3: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly q4: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly q5: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly q6: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly q7: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly q8: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly q9: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly q10: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly recaptchaToken: string;
}
