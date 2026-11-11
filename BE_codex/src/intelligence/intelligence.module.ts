import { Module } from '@nestjs/common';
import { UrlIntelligenceService } from './url-intelligence.service';

@Module({ providers: [UrlIntelligenceService], exports: [UrlIntelligenceService] })
export class IntelligenceModule {}
