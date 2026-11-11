export type { AnalysisResponse, DetectedUrl, Evidence, RiskLevel, ScamCategory, SignalType, UrlSignal }
  from '../../features/analysis/analysisResult';
export type { EmergencyRequest, EmergencyResponse, EmergencyScenario, EmergencyUrgency }
  from '../../features/guidance/emergencyGuidance';

export interface TextRequest {
  text: string;
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

export const errorCodes = [
  'INVALID_INPUT', 'UNSUPPORTED_IMAGE_FORMAT', 'INVALID_IMAGE', 'IMAGE_TOO_LARGE',
  'RATE_LIMIT_EXCEEDED', 'AI_INVALID_RESPONSE', 'AI_PROVIDER_ERROR', 'AI_TIMEOUT', 'INTERNAL_ERROR',
] as const;

export type ErrorCode = typeof errorCodes[number];

export interface ErrorResponse {
  statusCode: number;
  errorCode: ErrorCode;
  message: string;
  requestId: string;
  timestamp: string;
}

export function isDateTime(value: unknown): value is string {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value) &&
    Number.isFinite(Date.parse(value));
}

export function readRequestId(value: unknown): string | undefined {
  if (typeof value === 'string' && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)) {
    return value;
  }
}
