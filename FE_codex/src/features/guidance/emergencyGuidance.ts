import type { ScamCategory } from '../analysis/analysisResult';

export const scenarioLabels = {
  NOT_INTERACTED: 'Chưa tương tác',
  CLICKED_LINK: 'Đã bấm vào liên kết',
  SHARED_CREDENTIALS: 'Đã cung cấp thông tin đăng nhập',
  SHARED_OTP: 'Đã cung cấp mã OTP',
  TRANSFERRED_MONEY: 'Đã chuyển tiền',
  INSTALLED_APP: 'Đã cài ứng dụng đáng ngờ',
} as const;

export type EmergencyScenario = keyof typeof scenarioLabels;

export const emergencyScenarios = Object.keys(scenarioLabels) as EmergencyScenario[];

export const urgencyLabels = {
  LOW: 'Cần lưu ý',
  MEDIUM: 'Nên xử lý sớm',
  HIGH: 'Cần xử lý ngay',
} as const;

export type EmergencyUrgency = keyof typeof urgencyLabels;

export interface EmergencyRequest {
  scenario: EmergencyScenario;
  scam_category?: ScamCategory;
}

export interface EmergencyResponse {
  scenario: EmergencyScenario;
  title: string;
  urgency: EmergencyUrgency;
  steps: string[];
}

export function readEmergencyScenario(value: unknown): EmergencyScenario | undefined {
  return typeof value === 'string' && Object.hasOwn(scenarioLabels, value)
    ? value as EmergencyScenario
    : undefined;
}

function isEmergencyResponse(value: unknown): value is EmergencyResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = ['scenario', 'title', 'urgency', 'steps'];
  return Object.keys(record).length === keys.length && keys.every((key) => Object.hasOwn(record, key)) &&
    readEmergencyScenario(record.scenario) !== undefined &&
    typeof record.title === 'string' &&
    typeof record.urgency === 'string' && Object.hasOwn(urgencyLabels, record.urgency) &&
    Array.isArray(record.steps) && record.steps.every((step) => typeof step === 'string');
}

export function readGuidance(scenario: EmergencyScenario | undefined, response: unknown) {
  if (!scenario) return { status: 'noScenario' } as const;
  if (response === undefined) return { status: 'missing' } as const;
  if (!isEmergencyResponse(response) || response.scenario !== scenario) {
    return { status: 'invalid' } as const;
  }
  if (!response.title.trim() || response.steps.length === 0 || response.steps.some((step) => !step.trim())) {
    return { status: 'empty' } as const;
  }
  return { status: 'ready', guidance: response } as const;
}
