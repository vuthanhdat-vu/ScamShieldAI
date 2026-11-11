import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../contracts/error-code.enum';

const errors = {
  [ErrorCode.INVALID_INPUT]: [HttpStatus.BAD_REQUEST, 'Dữ liệu đầu vào không hợp lệ.'],
  [ErrorCode.UNSUPPORTED_IMAGE_FORMAT]: [HttpStatus.BAD_REQUEST, 'Định dạng ảnh không được hỗ trợ.'],
  [ErrorCode.INVALID_IMAGE]: [HttpStatus.BAD_REQUEST, 'Tệp ảnh không hợp lệ.'],
  [ErrorCode.IMAGE_TOO_LARGE]: [HttpStatus.PAYLOAD_TOO_LARGE, 'Dung lượng ảnh vượt giới hạn.'],
  [ErrorCode.RATE_LIMIT_EXCEEDED]: [HttpStatus.TOO_MANY_REQUESTS, 'Đã vượt giới hạn số yêu cầu.'],
  [ErrorCode.AI_INVALID_RESPONSE]: [HttpStatus.BAD_GATEWAY, 'Phản hồi phân tích không hợp lệ.'],
  [ErrorCode.AI_PROVIDER_ERROR]: [HttpStatus.BAD_GATEWAY, 'Dịch vụ phân tích gặp lỗi.'],
  [ErrorCode.AI_TIMEOUT]: [HttpStatus.GATEWAY_TIMEOUT, 'Dịch vụ phân tích hết thời gian chờ.'],
  [ErrorCode.INTERNAL_ERROR]: [HttpStatus.INTERNAL_SERVER_ERROR, 'Đã xảy ra lỗi nội bộ.'],
} as const satisfies Record<ErrorCode, readonly [HttpStatus, string]>;

export function publicErrorMessage(errorCode: ErrorCode): string {
  return errors[errorCode][1];
}

export class ApiException extends HttpException {
  constructor(
    readonly errorCode: ErrorCode,
    options: { providerUnavailable?: boolean } = {},
  ) {
    const [status, message] = errors[errorCode];
    super(
      message,
      errorCode === ErrorCode.AI_PROVIDER_ERROR && options.providerUnavailable
        ? HttpStatus.SERVICE_UNAVAILABLE
        : status,
    );
  }
}
