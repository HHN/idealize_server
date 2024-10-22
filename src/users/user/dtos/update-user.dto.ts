import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

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
    @IsString()
    readonly profilePicture: string;
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
    
}
