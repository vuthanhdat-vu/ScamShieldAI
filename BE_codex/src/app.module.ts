import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysisModule } from './analysis/analysis.module';
import { validateEnvironment } from './config/environment';
import { GuidanceModule } from './guidance/guidance.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    AnalysisModule,
    GuidanceModule,
    HealthModule,
  ],
})
export class AppModule {}
