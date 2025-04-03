import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

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

}
