import { validateEnvironment } from '../src/config/environment';

describe('configuration validation', () => {
  it('starts in mock mode with no key by default', () => {
    expect(validateEnvironment({})).toEqual({
      PORT: 3000,
      MOCK_AI: true,
      OPENAI_API_KEY: undefined,
      OPENAI_MODEL: undefined,
      OPENAI_TIMEOUT_MS: 45_000,
      CORS_ORIGINS: [],
    });
  });

  it.each(['0', '65536', '3.5', '0xBB8', ''])('rejects invalid PORT %j', (PORT) => {
    expect(() => validateEnvironment({ PORT })).toThrow('PORT must be an integer');
  });

  it('requires a literal boolean setting and a nonblank key when configured for real mode', () => {
    expect(() => validateEnvironment({ MOCK_AI: 'yes' })).toThrow('MOCK_AI must be true or false');
    expect(() => validateEnvironment({ MOCK_AI: 'false', OPENAI_API_KEY: '  ' })).toThrow(
      'OPENAI_API_KEY is required',
    );
    expect(() => validateEnvironment({ MOCK_AI: 'false', OPENAI_API_KEY: 'key', OPENAI_MODEL: ' ' })).toThrow(
      'OPENAI_MODEL is required',
    );
    expect(validateEnvironment({ PORT: '3001', MOCK_AI: 'false', OPENAI_API_KEY: ' key ', OPENAI_MODEL: ' model ' }))
      .toEqual({
        PORT: 3001, MOCK_AI: false, OPENAI_API_KEY: 'key', OPENAI_MODEL: 'model',
        OPENAI_TIMEOUT_MS: 45_000, CORS_ORIGINS: [],
      });
  });

  it.each(['0', '44999', '45001', '45000ms', ''])('rejects timeout %j outside v1.2', (OPENAI_TIMEOUT_MS) => {
    expect(() => validateEnvironment({ OPENAI_TIMEOUT_MS })).toThrow('OPENAI_TIMEOUT_MS must be 45000');
  });

  it('accepts and deduplicates explicit browser origins', () => {
    expect(validateEnvironment({
      OPENAI_TIMEOUT_MS: '45000',
      CORS_ORIGINS: 'http://localhost:5173, https://dev.example.test, http://localhost:5173',
    })).toMatchObject({
      OPENAI_TIMEOUT_MS: 45_000,
      CORS_ORIGINS: ['http://localhost:5173', 'https://dev.example.test'],
    });
  });

  it.each(['*', 'null', 'http://user@localhost:5173', 'http://localhost:5173/path', 'http://localhost:5173,'])(
    'rejects unsafe or invalid CORS origin %j', (CORS_ORIGINS) => {
      expect(() => validateEnvironment({ CORS_ORIGINS })).toThrow('CORS_ORIGINS must contain');
    },
  );
});
