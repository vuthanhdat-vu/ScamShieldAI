import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { validateEnvironment } from '../src/config/environment';
import { configureApp } from '../src/configure-app';

describe('browser development CORS', () => {
  const allowed = 'http://localhost:5173';
  const denied = 'http://localhost:5174';
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    const env = validateEnvironment({ CORS_ORIGINS: allowed });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(new ConfigService({ ...env }))
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });

  afterAll(async () => { await app?.close(); });

  function preflight(origin: string): Promise<Response> {
    return fetch(base + '/api/v1/analysis/text', {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
  }

  it('accepts an allowlisted preflight and exposes request IDs on JSON responses', async () => {
    const options = await preflight(allowed);
    expect(options.status).toBe(204);
    expect(options.headers.get('access-control-allow-origin')).toBe(allowed);
    expect(options.headers.get('access-control-allow-methods')).toContain('POST');
    expect(options.headers.get('access-control-allow-headers')?.toLowerCase()).toContain('content-type');
    expect(options.headers.get('vary')).toContain('Origin');
    const response = await fetch(base + '/api/v1/analysis/text', {
      method: 'POST',
      headers: { Origin: allowed, 'Content-Type': 'application/json' },
      body: '{"text":"Hẹn gặp ở thư viện."}',
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe(allowed);
    expect(response.headers.get('access-control-expose-headers')).toBe('X-Request-Id,Retry-After');
    expect(response.headers.has('access-control-allow-credentials')).toBe(false);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(await response.json()).toMatchObject({ risk_level: 'SAFE' });
  });

  it('does not grant browser access to an unlisted origin or the null origin', async () => {
    for (const origin of [denied, 'null']) {
      const options = await preflight(origin);
      expect(options.headers.has('access-control-allow-origin')).toBe(false);
      const response = await fetch(base + '/api/v1/health', { headers: { Origin: origin } });
      expect(response.status).toBe(200);
      expect(response.headers.has('access-control-allow-origin')).toBe(false);
      await response.json();
    }
  });
});
