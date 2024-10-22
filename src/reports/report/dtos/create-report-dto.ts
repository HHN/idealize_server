import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateReportDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly userId: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly reportedUser: string;
    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly projectId: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly type: 'user' | 'comment' | 'project';
    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly content: string;
    
}
