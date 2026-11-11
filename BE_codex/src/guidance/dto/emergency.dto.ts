import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, ValidateIf } from 'class-validator';
import { ScamCategory } from '../../contracts/analysis.enums';
import { EmergencyScenario, EmergencyUrgency } from '../../contracts/guidance.enums';

export class EmergencyRequestDto {
  @ApiProperty({ enum: EmergencyScenario })
  @IsEnum(EmergencyScenario)
  scenario!: EmergencyScenario;

  @ApiPropertyOptional({ enum: ScamCategory })
  @ValidateIf((_: object, value: unknown) => value !== undefined)
  @IsEnum(ScamCategory)
  scam_category?: ScamCategory;
}

export class EmergencyResponseDto {
  @ApiProperty({ enum: EmergencyScenario })
  scenario!: EmergencyScenario;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: EmergencyUrgency })
  urgency!: EmergencyUrgency;

  @ApiProperty({ type: [String] })
  steps!: string[];
}
