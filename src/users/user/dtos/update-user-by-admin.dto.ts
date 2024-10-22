import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateUserByAdminDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    readonly firstName: string;
    @ApiProperty()
    @IsString()
    @IsOptional()
    readonly lastName: string;
}