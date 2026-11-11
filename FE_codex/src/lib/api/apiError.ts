import { errorCodes, isDateTime, readRequestId, type ErrorCode, type ErrorResponse } from './contracts.ts';

const localMessages = {
  configuration: 'Chưa cấu hình được địa chỉ dịch vụ. Hãy kiểm tra cài đặt ứng dụng.',
  invalidRequest: 'Không thể chuẩn bị yêu cầu. Hãy thử lại.',
  network: 'Không kết nối được với dịch vụ. Hãy kiểm tra kết nối và thử lại.',
  timeout: 'Đã hết thời gian chờ phản hồi. Bạn có thể thử lại.',
  cancelled: 'Yêu cầu đã được hủy.',
  invalidResponse: 'Phản hồi từ dịch vụ không hợp lệ. Bạn có thể thử lại.',
} as const;

const backendMessages: Record<ErrorCode, string> = {
  INVALID_INPUT: 'Vui lòng kiểm tra lại thông tin đã nhập.',
  UNSUPPORTED_IMAGE_FORMAT: 'Hãy chọn ảnh JPEG, PNG hoặc WebP.',
  INVALID_IMAGE: 'Không đọc được ảnh. Hãy thử chọn ảnh khác.',
  IMAGE_TOO_LARGE: 'Dung lượng ảnh vượt giới hạn. Hãy bỏ bớt ảnh hoặc chọn ảnh nhỏ hơn.',
  RATE_LIMIT_EXCEEDED: 'Bạn đã gửi nhiều yêu cầu. Hãy đợi một lát rồi thử lại.',
  AI_INVALID_RESPONSE: 'Dịch vụ phân tích chưa trả được kết quả. Bạn có thể thử lại.',
  AI_PROVIDER_ERROR: 'Dịch vụ phân tích tạm thời gián đoạn. Bạn có thể thử lại sau.',
  AI_TIMEOUT: 'Dịch vụ phân tích xử lý quá lâu. Bạn có thể thử lại.',
  INTERNAL_ERROR: 'Dịch vụ gặp lỗi. Bạn có thể thử lại sau.',
};

export type ApiErrorKind = keyof typeof localMessages | 'backend';

type ErrorDetails = {
  statusCode?: number;
  errorCode?: ErrorCode;
  requestId?: string;
};

function backendMessage(statusCode: number | undefined) {
  if (statusCode === 429) return backendMessages.RATE_LIMIT_EXCEEDED;
  if (statusCode === 413) return 'Dữ liệu gửi lên vượt giới hạn dung lượng.';
  if (statusCode === 504) return 'Dịch vụ xử lý quá lâu. Bạn có thể thử lại.';
  if (statusCode !== undefined && statusCode >= 500) return backendMessages.INTERNAL_ERROR;
  return 'Dịch vụ chưa thể xử lý yêu cầu. Bạn có thể thử lại.';
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly statusCode?: number;
  readonly errorCode?: ErrorCode;
  readonly requestId?: string;

  constructor(kind: ApiErrorKind, details: ErrorDetails = {}) {
    super(details.errorCode && (kind === 'backend' || kind === 'invalidRequest')
      ? backendMessages[details.errorCode]
      : kind === 'backend' ? backendMessage(details.statusCode) : localMessages[kind]);
    this.name = 'ApiError';
    this.kind = kind;
    this.statusCode = details.statusCode;
    this.errorCode = details.errorCode;
    this.requestId = details.requestId;
  }
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const fields = ['statusCode', 'errorCode', 'message', 'requestId', 'timestamp'];
  return Object.keys(record).length === fields.length && fields.every((key) => Object.hasOwn(record, key)) &&
    Number.isInteger(record.statusCode) && errorCodes.some((code) => code === record.errorCode) &&
    typeof record.message === 'string' && readRequestId(record.requestId) !== undefined &&
    isDateTime(record.timestamp);
}

export function createBackendError(statusCode: number, payload: unknown, requestId?: string) {
  const envelope = isErrorResponse(payload) && payload.statusCode === statusCode ? payload : undefined;
  return new ApiError('backend', {
    statusCode,
    errorCode: envelope?.errorCode,
    requestId: envelope?.requestId ?? requestId,
  });
}
