import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { RiskModule } from '../risk/risk.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { EvidenceValidator } from './evidence-validator';

@Module({
  imports: [AiModule, RiskModule, IntelligenceModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, EvidenceValidator],
})
export class AnalysisModule {}
