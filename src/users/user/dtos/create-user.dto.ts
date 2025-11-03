import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEmail, isNotEmpty, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly firstName: string;
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly lastName: string;
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  readonly email: string;

  @ApiProperty()
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  readonly recoveryEmail: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly password: string;
  @IsOptional()
  @ApiProperty({ required: false })
  @IsString()
  @Transform(({ value }) => value.toLowerCase())
  readonly username: string;
  @ApiProperty({ example: 'string: (student OR lecturer)' })
  @IsNotEmpty()
  @Transform(({ value }) => value.toLowerCase())
  readonly userType: 'student' | 'lecturer';
  /// TODO Shayan : Implement email validation against institution domains
  @IsOptional()
  @ApiProperty({ required: false, example: 'HHN - Hochschule Heilbronn' })
  @IsString()
  readonly institution?: string;
  @IsOptional()
  @ApiProperty({ required: false })
  @IsString()
  @IsNotEmpty()
  readonly profilePicture: string;

  // TODO is SH: Add overview field for user bio during registration (Step 3)
  // Optional, max 500 chars, trimmed automatically via Transform
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
