import { isDateTime, type HealthResponse } from './contracts.ts';
import { createConfiguredHttpClient, type HttpClient, type RequestOptions } from './httpClient.ts';

export const HEALTH_TIMEOUT_MS = 10_000;

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === 3 &&
    Object.hasOwn(record, 'status') && record.status === 'ok' &&
    Object.hasOwn(record, 'service') && typeof record.service === 'string' &&
    Object.hasOwn(record, 'timestamp') && isDateTime(record.timestamp);
}

export async function getHealth(options: RequestOptions = {}, client?: HttpClient): Promise<HealthResponse> {
  const http = client ?? createConfiguredHttpClient();
  return http.requestJson('/health', isHealthResponse, {
    signal: options.signal,
    timeoutMs: options.timeoutMs ?? HEALTH_TIMEOUT_MS,
  });
}
