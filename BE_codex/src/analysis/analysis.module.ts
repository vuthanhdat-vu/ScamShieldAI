import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { OcrModule } from '../ocr/ocr.module';
import { PreprocessingModule } from '../preprocessing/preprocessing.module';
import { RiskModule } from '../risk/risk.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { EvidenceValidator } from './evidence-validator';

@Module({
  imports: [
    AiModule,
    RiskModule,
    IntelligenceModule,
    OcrModule,
    PreprocessingModule,
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService, EvidenceValidator],
  exports: [AnalysisService],
})
export class AnalysisModule {}

