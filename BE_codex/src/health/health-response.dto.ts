import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok'] })
  status!: 'ok';

  @ApiProperty({ example: 'scamshield-backend' })
  service!: string;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}
