import { Controller, Get, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationService } from '../../recommendation.service';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { RecommendationQueryDto } from '../dtos/recommendation-query.dto';

@ApiTags('Recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('for-you')
  @ApiOperation({
    summary: 'Get personalized "For You" recommendations',
    description: 'Returns personalized project recommendations based on content-based filtering (user interests)',
  })
  async getForYouRecommendations(
    @Headers('Authorization') token: string,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationService.getContentBasedRecommendations(
      token,
      query.page,
      query.limit,
    );
  }

  @Get('basic')
  @ApiOperation({
    summary: 'Get basic filtered recommendations',
    description: 'Returns projects matching user\'s interested tags and courses (simple filtering)',
  })
  async getBasicRecommendations(
    @Headers('Authorization') token: string,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationService.getBasicFilteredRecommendations(
      token,
      query.page,
      query.limit,
    );
  }

  @Get('hybrid')
  @ApiOperation({
    summary: 'Get hybrid recommendations',
    description: 'Returns recommendations combining content-based filtering with popularity metrics',
  })
  async getHybridRecommendations(
    @Headers('Authorization') token: string,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationService.getHybridRecommendations(
      token,
      query.page,
      query.limit,
    );
  }
}
