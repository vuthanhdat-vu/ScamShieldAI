import { ApiProperty } from '@nestjs/swagger';
import { InputType, RiskLevel, ScamCategory, SignalType, UrlSignal } from '../../contracts/analysis.enums';

export class EvidenceDto {
  @ApiProperty()
  quote!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ enum: SignalType })
  signal_type!: SignalType;

  @ApiProperty({ type: 'integer', minimum: 0, nullable: true })
  image_index!: number | null;
}

export class DetectedUrlDto {
  @ApiProperty()
  url!: string;

  @ApiProperty({ enum: UrlSignal, isArray: true })
  signals!: UrlSignal[];

  @ApiProperty({ type: 'boolean', enum: [false] })
  is_verified_malicious!: false;
}

export class AnalysisResponseDto {
  @ApiProperty({ format: 'uuid' })
  analysis_id!: string;

  @ApiProperty({ enum: InputType })
  input_type!: InputType;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: 100, nullable: true })
  risk_score!: number | null;

  @ApiProperty({ enum: RiskLevel })
  risk_level!: RiskLevel;

  @ApiProperty({ enum: ScamCategory })
  scam_category!: ScamCategory;

  @ApiProperty()
  summary!: string;

  @ApiProperty({ type: [EvidenceDto] })
  evidence!: EvidenceDto[];

  @ApiProperty({ type: [DetectedUrlDto] })
  detected_urls!: DetectedUrlDto[];

  @ApiProperty({ type: [String] })
  recommended_actions!: string[];

  @ApiProperty()
  speech_summary!: string;

  @ApiProperty({ format: 'date-time' })
  analyzed_at!: string;
}
