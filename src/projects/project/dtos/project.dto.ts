import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Attachment } from 'src/shared/interfaces/attachment.interfaces';
import { Link } from 'src/shared/interfaces/link.interface';

export class CreateProjectDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly title: string;
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly description: string;
  @ApiProperty()
  @IsArray()
  readonly tags: string[];
  @ApiProperty()
  @IsArray()
  readonly teamMembers: string[];
  @ApiProperty()
  @IsArray()
  readonly courses: string[];
  @ApiProperty()
  @IsArray()
  readonly links: Link[];
  @ApiProperty()
  @IsArray()
  readonly attachments: Attachment[];
  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  readonly isDraft: boolean;
  @ApiProperty()
  @IsOptional()
  @IsString()
  readonly thumbnail: string;
}

export class UpdateProjectDto {
  @ApiProperty()
  @IsOptional()
  readonly title?: string;
  @ApiProperty()
  @IsOptional()
  readonly description?: string;
  @ApiProperty()
  @IsOptional()
  readonly tags?: string[];
  @ApiProperty()
  @IsOptional()
  readonly courses?: string[];
  @ApiProperty()
  @IsOptional()
  readonly links?: Link[];
  @ApiProperty()
  @IsOptional()
  readonly attachments?: Attachment[];
  @ApiProperty()
  @IsOptional()
  readonly isDraft?: boolean;
  @ApiProperty()
  @IsOptional()
  readonly owner?: string;
  @ApiProperty()
  @IsOptional()
  readonly thumbnail?: string;
  @ApiProperty()
  @IsArray()
  @IsOptional()
  readonly teamMembers: string[];
}

export class changeOwnerDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly projectId: string;
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly ownerId: string;
}
