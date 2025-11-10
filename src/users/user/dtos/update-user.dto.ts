import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly firstName: string;
    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly lastName: string;
    @ApiProperty()
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value.toLowerCase())
    readonly username: string;

    @ApiProperty()
    @IsOptional()
    @IsEmail()
    @Transform(({ value }) => value.toLowerCase())
    readonly recoveryEmail: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly profilePicture: string;
    /// TODO Shayan : Implement email validation against institution domains
    @ApiProperty({ required: false, example: 'HHN - Hochschule Heilbronn' })
    @IsOptional()
    @IsString()
    readonly institution?: string;
    @IsOptional()
    @ApiProperty({ required: false })
    @IsArray()
    readonly interestedTags: string[];
    @IsOptional()
    @ApiProperty({ required: false })
    @IsArray()
    readonly interestedCourses: string[];
    @IsOptional()
    @ApiProperty({ required: false })
    @IsArray()
    readonly studyPrograms: string[];

    // TODO is SH: Add overview field for profile settings updates
    // Optional, max 500 chars, trimmed automatically
    @ApiProperty({ 
        required: false, 
        description: 'User bio/overview (max 500 characters)',
        maxLength: 500 
    })
    @IsOptional()
    @IsString()
    @MaxLength(500, { message: 'Overview must not exceed 500 characters' })
    @Transform(({ value }) => value?.trim())
    readonly overview?: string;

}
