import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../src/lib/api/apiError.ts';
import { getHealth } from '../src/lib/api/health.ts';
import { createHttpClient, normalizeApiBaseUrl } from '../src/lib/api/httpClient.ts';

const baseUrl = 'http://10.0.2.2:3000';
const health = { status: 'ok', service: 'scamshield-backend', timestamp: '2026-11-11T09:02:22.990Z' };
const requestId = '00000000-0000-4000-8000-000000000001';
const sensitive = 'private provider detail';
const clientWith = (fetchImpl) => createHttpClient({ baseUrl, allowHttp: true, fetchImpl });

function expectKind(kind, details = {}) {
  return (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.kind, kind);
    for (const [key, value] of Object.entries(details)) assert.equal(error[key], value);
    assert.ok(!error.message.includes(sensitive));
    assert.equal(error.cause, undefined);
    return true;
  };
}

test('normalizes the documented bases and rejects invalid or insecure production URLs', () => {
  assert.equal(normalizeApiBaseUrl(baseUrl + '/api/v1/', true), baseUrl);
  assert.equal(normalizeApiBaseUrl('https://api.example.test/'), 'https://api.example.test');
  for (const value of [undefined, baseUrl, 'https://user:pass@api.example.test', 'https://api.example.test?']) {
    assert.throws(() => normalizeApiBaseUrl(value), expectKind('configuration'));
  }
});

test('health uses the versioned GET URL and returns typed JSON', async () => {
  const client = clientWith(async (url, options) => {
    assert.equal(url, baseUrl + '/api/v1/health');
    assert.equal(options.method, 'GET');
    assert.equal(options.body, undefined);
    assert.deepEqual(options.headers, { Accept: 'application/json' });
    return Response.json(health);
  });
  assert.deepEqual(await getHealth({}, client), health);
});

test('generic POST serializes JSON with the proper content type', async () => {
  const json = { label: 'Tiếng Việt' };
  const client = clientWith(async (url, options) => {
    assert.equal(url, baseUrl + '/api/v1/test');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), json);
    return Response.json('ok');
  });
  assert.equal(await client.requestJson('/test', (value) => typeof value === 'string', { method: 'POST', json }), 'ok');
});

test('HTTP error maps the contract code and keeps requestId without provider details', async () => {
  const client = clientWith(async () => Response.json({
    statusCode: 504, errorCode: 'AI_TIMEOUT', message: sensitive, requestId, timestamp: health.timestamp,
  }, { status: 504 }));
  await assert.rejects(getHealth({}, client), (error) => {
    expectKind('backend', { statusCode: 504, errorCode: 'AI_TIMEOUT', requestId })(error);
    assert.equal(error.message, 'Dịch vụ phân tích xử lý quá lâu. Bạn có thể thử lại.');
    assert.ok(!JSON.stringify(error).includes(sensitive));
    return true;
  });
});

test('malformed HTTP error envelopes fall back to status and the safe request ID header', async () => {
  const options = { status: 503, headers: { 'X-Request-Id': requestId } };
  for (const response of [
    new Response(sensitive, options),
    Response.json({ statusCode: 500, errorCode: 'INTERNAL_ERROR', message: sensitive, requestId,
      timestamp: health.timestamp }, options),
    Response.json({ statusCode: 503, errorCode: 'UNKNOWN', message: sensitive, requestId,
      timestamp: health.timestamp }, options),
  ]) {
    await assert.rejects(getHealth({}, clientWith(async () => response)),
      expectKind('backend', { statusCode: 503, errorCode: undefined, requestId }));
  }
});

test('invalid JSON and invalid health shapes are invalid responses', async () => {
  for (const response of [new Response(sensitive), Response.json({ ...health, status: 'unavailable' })]) {
    await assert.rejects(getHealth({}, clientWith(async () => response)), expectKind('invalidResponse'));
  }
});

test('rejected fetch produces a safe network error', async () => {
  const client = clientWith(async () => { throw new TypeError(sensitive); });
  await assert.rejects(getHealth({}, client), expectKind('network'));
});

test('pre-aborted requests do not call fetch', async () => {
  let calls = 0;
  const client = clientWith(async () => { calls++; return Response.json(health); });
  const controller = new AbortController();
  controller.abort(sensitive);
  await assert.rejects(getHealth({ signal: controller.signal }, client), expectKind('cancelled'));
  assert.equal(calls, 0);
});

test('caller cancellation aborts transport even if fetch does not cooperate', async () => {
  let fetchSignal;
  const client = clientWith((_url, options) => {
    fetchSignal = options.signal;
    return new Promise(() => {});
  });
  const controller = new AbortController();
  const pending = getHealth({ signal: controller.signal }, client);
  controller.abort(sensitive);
  await assert.rejects(pending, expectKind('cancelled'));
  assert.equal(fetchSignal.aborted, true);
});

test('timeout stays active during body consumption', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let fetchSignal;
  let reading = false;
  const client = clientWith(async (_url, options) => {
    fetchSignal = options.signal;
    return {
      ok: true, status: 200, headers: new Headers({ 'X-Request-Id': requestId }),
      text: () => { reading = true; return new Promise(() => {}); },
    };
  });
  const pending = getHealth({ timeoutMs: 25 }, client);
  await Promise.resolve();
  assert.equal(reading, true);
  t.mock.timers.tick(25);
  await assert.rejects(pending, expectKind('timeout', { requestId }));
  assert.equal(fetchSignal.aborted, true);
});

test('invalid paths and unserializable JSON never call fetch', async () => {
  let calls = 0;
  const client = clientWith(async () => { calls++; return Response.json(health); });
  for (const path of ['https://example.test', '//example.test', '/api/v1/health', '/health/../other']) {
    await assert.rejects(client.requestJson(path, () => true), expectKind('invalidRequest'));
  }
  const circular = {};
  circular.self = circular;
  await assert.rejects(client.requestJson('/test', () => true, { method: 'POST', json: circular }),
    expectKind('invalidRequest'));
  assert.equal(calls, 0);
});
