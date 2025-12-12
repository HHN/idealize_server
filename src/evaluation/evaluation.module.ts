import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';

@Module({
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
