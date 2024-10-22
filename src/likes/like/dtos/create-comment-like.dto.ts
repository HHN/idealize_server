import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateCommentLikeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly userId: string; // Assuming this is the ID of the user who liked
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly commentId: string;
}
