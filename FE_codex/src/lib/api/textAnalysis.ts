import { isAnalysisResponse } from '../../features/analysis/analysisResult.ts';
import { validateAnalysisText } from '../../features/analysis/textValidation.ts';
import { ApiError } from './apiError.ts';
import type { AnalysisResponse, TextRequest } from './contracts.ts';
import { createConfiguredHttpClient, DEFAULT_API_TIMEOUT_MS, type HttpClient } from './httpClient.ts';

function isTextAnalysisResponse(value: unknown): value is AnalysisResponse {
  return isAnalysisResponse(value) && value.input_type === 'TEXT';
}

export async function analyzeText(
  draft: string,
  signal?: AbortSignal,
  client?: HttpClient,
): Promise<AnalysisResponse> {
  const { text, error } = validateAnalysisText(draft);
  if (error) throw new ApiError('invalidRequest');

  const json: TextRequest = { text };
  return (client ?? createConfiguredHttpClient()).requestJson('/analysis/text', isTextAnalysisResponse, {
    method: 'POST',
    json,
    timeoutMs: DEFAULT_API_TIMEOUT_MS,
    signal,
  });
}
