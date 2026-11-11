import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../../contracts/error-code.enum';

export class ErrorResponseDto {
  @ApiProperty({ type: 'integer' })
  statusCode!: number;

  @ApiProperty({ enum: ErrorCode })
  errorCode!: ErrorCode;

  @ApiProperty()
  message!: string;

  @ApiProperty({ format: 'uuid' })
  requestId!: string;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}
