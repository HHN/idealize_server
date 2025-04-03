import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateArchiveDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly userId: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly projectId: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly projectOwnerId: string
}