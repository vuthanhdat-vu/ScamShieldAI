import { OPENAI_UPSTREAM_TIMEOUT_MS } from '../ai/ai-analysis-provider';

export interface Environment {
  PORT: number;
  MOCK_AI: boolean;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_TIMEOUT_MS: typeof OPENAI_UPSTREAM_TIMEOUT_MS;
  CORS_ORIGINS: string[];
}

export class ConfigurationError extends Error {}

export function validateEnvironment(raw: Record<string, unknown>): Environment {
  const portValue = raw.PORT ?? '3000';
  const port = typeof portValue === 'string' && /^\d+$/.test(portValue)
    ? Number(portValue)
    : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new ConfigurationError('PORT must be an integer between 1 and 65535.');
  }

  const mockValue = raw.MOCK_AI ?? 'true';
  if (mockValue !== 'true' && mockValue !== 'false') {
    throw new ConfigurationError('MOCK_AI must be true or false.');
  }

  const key = typeof raw.OPENAI_API_KEY === 'string' ? raw.OPENAI_API_KEY.trim() : '';
  const model = typeof raw.OPENAI_MODEL === 'string' ? raw.OPENAI_MODEL.trim() : '';
  if (mockValue === 'false' && !key) {
    throw new ConfigurationError('OPENAI_API_KEY is required when MOCK_AI is false.');
  }
  if (mockValue === 'false' && !model) {
    throw new ConfigurationError('OPENAI_MODEL is required when MOCK_AI is false.');
  }

  const timeout = raw.OPENAI_TIMEOUT_MS ?? String(OPENAI_UPSTREAM_TIMEOUT_MS);
  if (timeout !== String(OPENAI_UPSTREAM_TIMEOUT_MS)) {
    throw new ConfigurationError('OPENAI_TIMEOUT_MS must be 45000 under API Contract v1.2.');
  }

  const cors = raw.CORS_ORIGINS ?? '';
  if (typeof cors !== 'string') {
    throw new ConfigurationError('CORS_ORIGINS must contain comma-separated HTTP(S) origins.');
  }
  const origins = cors.trim() ? cors.split(',').map((origin) => origin.trim()) : [];
  for (const origin of origins) {
    if (!/^https?:\/\//u.test(origin) || !URL.canParse(origin) || new URL(origin).origin !== origin) {
      throw new ConfigurationError('CORS_ORIGINS must contain comma-separated HTTP(S) origins.');
    }
  }

  return {
    PORT: port,
    MOCK_AI: mockValue === 'true',
    OPENAI_API_KEY: key || undefined,
    OPENAI_MODEL: model || undefined,
    OPENAI_TIMEOUT_MS: OPENAI_UPSTREAM_TIMEOUT_MS,
    CORS_ORIGINS: [...new Set(origins)],
  };
}
