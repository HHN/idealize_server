import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTagDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly name: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly type: 'course' | 'tag' | 'studyProgram';
    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly userId: string; // Assuming this is the ID of the user who created the tag
}


export class EditTagDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly name: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly type: 'course' | 'tag' | 'studyProgram';
}