import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBugReportDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly userId: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly content: string;
    
}
