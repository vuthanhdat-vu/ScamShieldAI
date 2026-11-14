import { Logger, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { otpOutput, sdkResponse } from './openai-fixtures';

describe('Real provider wiring with offline OpenAI transport', () => {
  let app: INestApplication;
  let base: string;
  const upstream = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

  beforeAll(async () => {
    const loopbackFetch = globalThis.fetch.bind(globalThis);
    jest.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url === 'https://api.openai.com/v1/responses') return upstream(input, init);
      if (base && url.startsWith(base + '/')) return loopbackFetch(input, init);
      return Promise.reject(new Error('Unexpected network destination in offline test'));
    });

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(new ConfigService({
        MOCK_AI: false,
        OPENAI_API_KEY: 'offline-fixture',
        OPENAI_MODEL: 'offline-model',
        OPENAI_BASE_URL: 'https://api.openai.com/v1',
      }))
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      jest.restoreAllMocks();
    }
  });

  beforeEach(() => {
    upstream.mockReset().mockImplementation(() => Promise.resolve(Response.json(sdkResponse())));
  });

  function post(path: string, data: object): Promise<Response> {
    return fetch(base + '/api/v1' + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  it('sends a single Responses API request and returns the public analysis schema', async () => {
    const response = await post('/analysis/text', { text: 'Send OTP' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      analysis_id: expect.any(String) as unknown,
      input_type: 'TEXT',
      risk_score: 85,
      risk_level: 'DANGER',
      scam_category: 'OTP_THEFT',
      summary: 'Tin nhắn yêu cầu cung cấp mã OTP.',
      evidence: [{
        quote: 'Send OTP', reason: 'Tin nhắn yêu cầu mã xác thực.',
        signal_type: 'CREDENTIAL_REQUEST', image_index: null,
      }],
      detected_urls: [],
      recommended_actions: expect.any(Array) as unknown,
      speech_summary: 'Không cung cấp mã OTP.',
      analyzed_at: expect.any(String) as unknown,
    });
    expect(upstream).toHaveBeenCalledTimes(1);
    const request = new Request(...upstream.mock.calls[0]);
    expect(request.method).toBe('POST');
    expect(await request.json()).toMatchObject({
      model: 'offline-model',
      store: false,
      text: { format: { strict: true } },
      input: [{ role: 'user', content: [{ type: 'input_text', text: '{"inputType":"TEXT","text":"Send OTP"}' }] }],
    });
  });

  it('standardizes an upstream 429 as a temporary failure without leaking details or retrying', async () => {
    upstream.mockResolvedValueOnce(Response.json({ error: { message: 'private diagnostic' } }, { status: 429 }));
    const response = await post('/analysis/text', { text: 'Send OTP' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      statusCode: 503,
      errorCode: 'AI_PROVIDER_ERROR',
      message: 'Dịch vụ phân tích gặp lỗi.',
      requestId: response.headers.get('x-request-id'),
      timestamp: expect.any(String) as unknown,
    });
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('forwards validated screenshot bytes in multipart order and returns the public image index', async () => {
    const fixture = sharp({ create: { width: 8, height: 8, channels: 3, background: '#457dc4' } });
    const png = await fixture.clone().png().toBuffer();
    const jpeg = await fixture.clone().jpeg().toBuffer();
    const form = new FormData();
    form.append('images', new Blob([Uint8Array.from(png)], { type: 'image/jpeg' }), 'first.jpg');
    form.append('images', new Blob([Uint8Array.from(jpeg)], { type: 'image/png' }), 'second.png');
    form.append('context', 'Untrusted conversation context');
    upstream.mockResolvedValueOnce(Response.json(sdkResponse({
      ...otpOutput, evidence: [{ ...otpOutput.evidence[0], imageIndex: 1 }],
    })));

    const response = await fetch(base + '/api/v1/analysis/images', { method: 'POST', body: form });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      input_type: 'IMAGE', risk_level: 'DANGER', evidence: [{ image_index: 1 }],
    });
    expect(upstream).toHaveBeenCalledTimes(1);
    const request = new Request(...upstream.mock.calls[0]);
    expect(await request.json()).toMatchObject({
      store: false,
      input: [{
        role: 'user',
        content: [
          { text: '{"inputType":"IMAGE","context":"Untrusted conversation context"}' },
          { text: 'Screenshot 0' },
          { image_url: 'data:image/png;base64,' + png.toString('base64') },
          { text: 'Screenshot 1' },
          { image_url: 'data:image/jpeg;base64,' + jpeg.toString('base64') },
          { text: expect.stringContaining('Tin nhắn không xác định') },
        ],
      }],
    });
  });

  it('standardizes a malformed upstream JSON body', async () => {
    upstream.mockResolvedValueOnce(new Response('invalid JSON', {
      headers: { 'content-type': 'application/json' },
    }));
    const response = await post('/analysis/text', { text: 'Send OTP' });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ errorCode: 'AI_INVALID_RESPONSE' });
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('rejects a model-assigned public score in otherwise structured output', async () => {
    upstream.mockResolvedValueOnce(Response.json(sdkResponse({ ...otpOutput, risk_score: 0 })));
    const response = await post('/analysis/text', { text: 'Send OTP' });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ statusCode: 502, errorCode: 'AI_INVALID_RESPONSE' });
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('maps an upstream timeout to 504 without scoring or falling back', async () => {
    upstream.mockResolvedValueOnce(Response.json({ error: { message: 'upstream timed out' } }, { status: 504 }));
    const response = await post('/analysis/text', { text: 'Send OTP' });
    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject({ statusCode: 504, errorCode: 'AI_TIMEOUT' });
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('detects URLs locally and excludes keys, submitted data, and provider diagnostics from logs', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const fetchSpy = jest.mocked(globalThis.fetch);
    const firstCall = fetchSpy.mock.calls.length;
    const suspiciousUrl = 'http://192.0.2.1/check?token=offline-private-token';
    const text = 'Send OTP. Visit ' + suspiciousUrl;
    try {
      const success = await post('/analysis/text', { text });
      expect(success.status).toBe(200);
      expect(await success.json()).toMatchObject({
        detected_urls: [{ url: suspiciousUrl, is_verified_malicious: false }],
      });
      upstream.mockResolvedValueOnce(Response.json({
        error: { message: 'offline-private-diagnostic' },
      }, { status: 401 }));
      const failure = await post('/analysis/text', { text });
      expect(failure.status).toBe(502);
      expect(await failure.json()).toMatchObject({ errorCode: 'AI_PROVIDER_ERROR' });
      expect(upstream).toHaveBeenCalledTimes(2);

      const destinations = fetchSpy.mock.calls.slice(firstCall).map(([input]) =>
        input instanceof Request ? input.url : String(input),
      );
      expect(destinations).toEqual([
        base + '/api/v1/analysis/text', 'https://api.openai.com/v1/responses',
        base + '/api/v1/analysis/text', 'https://api.openai.com/v1/responses',
      ]);

      expect(log).toHaveBeenCalledWith(expect.stringContaining(success.headers.get('x-request-id') ?? 'missing'));
      expect(logError).toHaveBeenCalledWith(expect.stringContaining(failure.headers.get('x-request-id') ?? 'missing'));
      const logs = JSON.stringify([...log.mock.calls, ...logError.mock.calls]);
      for (const value of ['offline-fixture', 'offline-private-diagnostic', 'Send OTP', suspiciousUrl]) {
        expect(logs).not.toContain(value);
      }
    } finally {
      log.mockRestore();
      logError.mockRestore();
    }
  });

  it('keeps emergency guidance and health independent of OpenAI in real mode', async () => {
    upstream.mockRejectedValue(new Error('OpenAI offline'));
    const guidance = await post('/guidance/emergency', { scenario: 'SHARED_OTP' });
    expect(guidance.status).toBe(200);
    expect(await guidance.json()).toMatchObject({ urgency: 'HIGH' });
    const health = await fetch(base + '/api/v1/health');
    expect(health.status).toBe(200);
    await health.json();
    expect(upstream).not.toHaveBeenCalled();
  });
});
