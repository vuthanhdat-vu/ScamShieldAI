import assert from 'node:assert/strict';
import test from 'node:test';

import { emergencyScenarios } from '../src/features/guidance/emergencyGuidance.ts';
import { getEmergencyGuidance } from '../src/lib/api/emergency.ts';
import { createHttpClient } from '../src/lib/api/httpClient.ts';
import { createRequestSubmission } from '../src/lib/api/requestSubmission.ts';

const baseUrl = 'https://api.example.invalid';
const requestId = '00000000-0000-4000-8000-000000000001';
const guidance = (scenario) => ({
  scenario,
  title: 'Các bước cần làm',
  urgency: 'HIGH',
  steps: ['Liên hệ qua kênh chính thức.', 'Kiểm tra tài khoản.', 'Lưu thông tin liên quan.'],
});
const mockApi = (fetchImpl) => {
  const client = createHttpClient({ baseUrl, fetchImpl });
  return (input, signal) => getEmergencyGuidance(input, signal, client);
};
function hasKind(kind) {
  return (error) => error.kind === kind;
}

for (const scenario of emergencyScenarios) {
  test(`POST uses the exact enum and preserves step order for ${scenario}`, async () => {
    const expected = guidance(scenario);
    const request = mockApi(async (url, options) => {
      assert.equal(url, baseUrl + '/api/v1/guidance/emergency');
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), { scenario });
      return Response.json(expected);
    });
    assert.deepEqual(await request({ scenario }), expected);
  });
}

test('includes a valid category and omits invalid or unavailable values', async () => {
  const scenario = 'CLICKED_LINK';
  const bodies = [];
  const request = mockApi(async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return Response.json(guidance(scenario));
  });
  for (const scam_category of ['PHISHING', 'NONE', 'fake', undefined, null, ['PHISHING']]) {
    await request({ scenario, scam_category });
  }
  assert.deepEqual(bodies, [
    { scenario, scam_category: 'PHISHING' }, { scenario, scam_category: 'NONE' },
    { scenario }, { scenario }, { scenario }, { scenario },
  ]);
});

test('rejects invalid scenario before fetch', async () => {
  let requests = 0;
  const request = mockApi(async () => { requests++; return Response.json({}); });
  await assert.rejects(request({ scenario: 'UNKNOWN' }), hasKind('invalidRequest'));
  assert.equal(requests, 0);
});

test('rejects mismatched, empty, and malformed responses without a fixture fallback', async () => {
  const scenario = 'SHARED_OTP';
  for (const response of [
    new Response('not json'),
    Response.json(guidance('CLICKED_LINK')),
    Response.json({ ...guidance(scenario), steps: [] }),
    Response.json({ ...guidance(scenario), steps: [' ', 'Kiểm tra tài khoản.'] }),
    Response.json({ ...guidance(scenario), urgency: 'CRITICAL' }),
    Response.json({ ...guidance(scenario), unexpected: true }),
  ]) {
    await assert.rejects(mockApi(async () => response)({ scenario }), hasKind('invalidResponse'));
  }
});

test('HTTP error retains the request ID and never exposes the backend message', async () => {
  const request = mockApi(async () => Response.json({
    statusCode: 500, errorCode: 'INTERNAL_ERROR', message: 'internal-only details',
    requestId, timestamp: '2026-11-11T10:00:00.000Z',
  }, { status: 500 }));
  await assert.rejects(request({ scenario: 'CLICKED_LINK' }), (error) => {
    assert.equal(error.kind, 'backend');
    assert.equal(error.requestId, requestId);
    assert.ok(!error.message.includes('internal-only details'));
    return true;
  });
});

test('network failure permits retry of the same scenario and category', async () => {
  const sent = [];
  const draft = { scenario: 'TRANSFERRED_MONEY', scam_category: 'FINANCIAL_FRAUD' };
  const submission = createRequestSubmission(mockApi(async (_url, options) => {
    sent.push(JSON.parse(options.body));
    if (sent.length === 1) throw new TypeError('network unavailable');
    return Response.json(guidance(draft.scenario));
  }));
  const events = [];
  const callbacks = {
    onPending: () => events.push('pending'),
    onError: (error) => events.push(error.kind),
    onResult: (response) => events.push(response),
  };
  await submission.submit(draft, callbacks);
  await submission.submit(draft, callbacks);
  assert.deepEqual(sent, [draft, draft]);
  assert.deepEqual(events, ['pending', 'network', 'pending', guidance(draft.scenario)]);
});

test('deadline is 10 seconds and aborts the transport', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  const request = mockApi((_url, options) => {
    signal = options.signal;
    return new Promise(() => {});
  });
  const rejection = assert.rejects(request({ scenario: 'CLICKED_LINK' }), hasKind('timeout'));
  t.mock.timers.tick(9_999);
  assert.equal(signal.aborted, false);
  t.mock.timers.tick(1);
  await rejection;
  assert.equal(signal.aborted, true);
});

test('duplicate loads are ignored and leaving cancels without a UI error', async () => {
  let calls = 0;
  let signal;
  const submission = createRequestSubmission(mockApi((_url, options) => {
    calls++;
    signal = options.signal;
    return new Promise(() => {});
  }));
  const callbacks = { onPending() {}, onError: assert.fail, onResult: assert.fail };
  const draft = { scenario: 'INSTALLED_APP' };
  const pending = submission.submit(draft, callbacks);
  await submission.submit(draft, callbacks);
  assert.equal(calls, 1);
  submission.cancel();
  await pending;
  assert.equal(signal.aborted, true);
});
