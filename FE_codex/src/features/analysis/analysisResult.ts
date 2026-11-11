const inputTypes = ['TEXT', 'IMAGE'] as const;
const riskLevels = ['SAFE', 'SUSPICIOUS', 'DANGER', 'UNABLE_TO_ASSESS'] as const;
const scamCategories = [
  'BANK_IMPERSONATION', 'GOVERNMENT_IMPERSONATION', 'PHISHING', 'OTP_THEFT', 'FINANCIAL_FRAUD',
  'FAKE_RECRUITMENT', 'FAKE_DELIVERY', 'SOCIAL_ENGINEERING', 'OTHER', 'NONE',
] as const;
const signalTypes = [
  'URGENCY', 'THREAT', 'CREDENTIAL_REQUEST', 'MONEY_REQUEST', 'IMPERSONATION',
  'SUSPICIOUS_URL', 'TOO_GOOD_TO_BE_TRUE', 'OTHER',
] as const;
const urlSignals = [
  'IP_HOST', 'PUNYCODE', 'SHORTENER', 'MISLEADING_SUBDOMAIN', 'USERINFO_AT', 'LONG_URL', 'HTTP_ONLY',
] as const;

export type RiskLevel = typeof riskLevels[number];
export type ScamCategory = typeof scamCategories[number];

export function isScamCategory(value: unknown): value is ScamCategory {
  return isOneOf(value, scamCategories);
}
export type SignalType = typeof signalTypes[number];
export type UrlSignal = typeof urlSignals[number];

export interface Evidence {
  quote: string;
  reason: string;
  signal_type: SignalType;
  image_index: number | null;
}

export interface DetectedUrl {
  url: string;
  signals: UrlSignal[];
  is_verified_malicious: false;
}

export interface AnalysisResponse {
  analysis_id: string;
  input_type: typeof inputTypes[number];
  risk_score: number | null;
  risk_level: RiskLevel;
  scam_category: ScamCategory;
  summary: string;
  evidence: Evidence[];
  detected_urls: DetectedUrl[];
  recommended_actions: string[];
  speech_summary: string;
  analyzed_at: string;
}

const scoreRanges = {
  SAFE: [0, 39],
  SUSPICIOUS: [40, 74],
  DANGER: [75, 100],
} as const;

const responseKeys = [
  'analysis_id', 'input_type', 'risk_score', 'risk_level', 'scam_category', 'summary',
  'evidence', 'detected_urls', 'recommended_actions', 'speech_summary', 'analyzed_at',
] as const satisfies readonly (keyof AnalysisResponse)[];

function hasShape(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.some((option) => option === value);
}

function isEvidence(value: unknown): value is Evidence {
  return hasShape(value, ['quote', 'reason', 'signal_type', 'image_index']) &&
    typeof value.quote === 'string' && typeof value.reason === 'string' &&
    isOneOf(value.signal_type, signalTypes) &&
    (value.image_index === null || (typeof value.image_index === 'number' &&
      Number.isInteger(value.image_index) && value.image_index >= 0 && value.image_index < 5));
}

function isDetectedUrl(value: unknown): value is DetectedUrl {
  return hasShape(value, ['url', 'signals', 'is_verified_malicious']) &&
    typeof value.url === 'string' && value.is_verified_malicious === false &&
    Array.isArray(value.signals) && value.signals.every((signal) => isOneOf(signal, urlSignals));
}

function hasValidScore(level: RiskLevel, score: unknown) {
  if (level === 'UNABLE_TO_ASSESS') return score === null;
  const [min, max] = scoreRanges[level];
  return typeof score === 'number' && Number.isInteger(score) && score >= min && score <= max;
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value) &&
    Number.isFinite(Date.parse(value));
}

export function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  return hasShape(value, responseKeys) &&
    typeof value.analysis_id === 'string' &&
    /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value.analysis_id) &&
    isOneOf(value.input_type, inputTypes) && isOneOf(value.risk_level, riskLevels) &&
    hasValidScore(value.risk_level, value.risk_score) && isScamCategory(value.scam_category) &&
    typeof value.summary === 'string' && typeof value.speech_summary === 'string' &&
    isDateTime(value.analyzed_at) &&
    Array.isArray(value.evidence) && value.evidence.every(isEvidence) &&
    (value.input_type !== 'TEXT' || value.evidence.every(({ image_index }) => image_index === null)) &&
    Array.isArray(value.detected_urls) && value.detected_urls.every(isDetectedUrl) &&
    Array.isArray(value.recommended_actions) &&
    value.recommended_actions.every((action) => typeof action === 'string');
}

export function evidenceSourceLabel(inputType: AnalysisResponse['input_type'], imageIndex: number | null) {
  if (inputType === 'TEXT') return 'Tin nhắn';
  return imageIndex === null ? 'Chưa xác định ảnh nguồn' : `Ảnh ${imageIndex + 1}`;
}
