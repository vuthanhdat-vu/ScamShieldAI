import { isScamCategory } from '../../features/analysis/analysisResult.ts';
import { readEmergencyScenario, readGuidance } from '../../features/guidance/emergencyGuidance.ts';
import { ApiError } from './apiError.ts';
import type { EmergencyRequest, EmergencyResponse } from './contracts.ts';
import { createConfiguredHttpClient, type HttpClient } from './httpClient.ts';

export const EMERGENCY_TIMEOUT_MS = 10_000;

export async function getEmergencyGuidance(
  input: EmergencyRequest,
  signal?: AbortSignal,
  client?: HttpClient,
): Promise<EmergencyResponse> {
  const scenario = readEmergencyScenario(input.scenario);
  if (!scenario) throw new ApiError('invalidRequest');

  const json: EmergencyRequest = { scenario };
  if (isScamCategory(input.scam_category)) json.scam_category = input.scam_category;
  return (client ?? createConfiguredHttpClient()).requestJson(
    '/guidance/emergency',
    (value): value is EmergencyResponse => readGuidance(scenario, value).status === 'ready',
    { method: 'POST', json, signal, timeoutMs: EMERGENCY_TIMEOUT_MS },
  );
}
