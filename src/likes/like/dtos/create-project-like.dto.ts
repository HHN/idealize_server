import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsOptional, IsIn } from "class-validator";

export class CreateProjectLikeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly userId: string; // Assuming this is the ID of the user who liked
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly projectId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly projectOwnerId: string;

  @ApiProperty({ 
    required: false,
    enum: ['basic-filtering', 'content-based', 'collaborative', 'hybrid'],
    description: 'Algorithm used for recommendation'
  })
  @IsOptional()
  @IsString()
  @IsIn(['basic-filtering', 'content-based', 'collaborative', 'hybrid'])
  readonly algorithm?: 'basic-filtering' | 'content-based' | 'collaborative' | 'hybrid';

}
