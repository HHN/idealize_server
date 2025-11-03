import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateUserByAdminDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    readonly firstName: string;
    @ApiProperty()
    @IsString()
    @IsOptional()
    readonly lastName: string;
    // TODO is SH: Add overview field for admin user editing capability
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