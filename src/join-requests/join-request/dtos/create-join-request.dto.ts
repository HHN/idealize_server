import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateJoinRequestDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly projectId: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly receiver: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    readonly type: | 'addTeamMember' | 'joinTeamMember';
    @ApiProperty()
    @IsOptional()
    readonly message?: string;
}
