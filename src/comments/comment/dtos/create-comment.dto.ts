import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateCommentDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly userId: string; // ID of the user who left the comment
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly projectId: string; // ID of the project the comment belongs to
    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly parentCommentId?: string; // ID of the parent comment (if it's a reply)
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly content: string; // Content of the comment

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly projectOwnerId: string
}