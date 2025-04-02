import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSurveyDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @MaxLength(1000)
    readonly q1: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @MaxLength(1000)
    readonly q2: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @MaxLength(1000)
    readonly q3: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    readonly q4: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    readonly q5: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    readonly q6: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    readonly q7: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    readonly q8: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    readonly q9: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    readonly q10: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly recaptchaToken: string;
}
