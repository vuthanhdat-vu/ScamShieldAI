import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { Environment } from '../config/environment';
import { AI_ANALYSIS_PROVIDER, type AiAnalysisProvider, OPENAI_UPSTREAM_TIMEOUT_MS } from './ai-analysis-provider';
import { MockAiAnalysisProvider } from './mock-ai-analysis.provider';
import { OpenAiAnalysisProvider } from './openai-analysis.provider';

@Module({
  providers: [
    MockAiAnalysisProvider,
    {
      provide: AI_ANALYSIS_PROVIDER,
      inject: [ConfigService, MockAiAnalysisProvider],
      useFactory: (config: ConfigService<Environment, true>, mock: MockAiAnalysisProvider): AiAnalysisProvider => {
        if (config.get('MOCK_AI', { infer: true })) {
          return mock;
        }

        const client = new OpenAI({
          apiKey: config.getOrThrow('OPENAI_API_KEY', { infer: true }),
          baseURL: config.get('OPENAI_BASE_URL', { infer: true }) || 'https://api.openai.com/v1',
          timeout: OPENAI_UPSTREAM_TIMEOUT_MS,
          maxRetries: 0,
          logLevel: 'off',
        });
        return new OpenAiAnalysisProvider(client, config.getOrThrow('OPENAI_MODEL', { infer: true }));
      },
    },
  ],
  exports: [AI_ANALYSIS_PROVIDER],
})
export class AiModule {}
