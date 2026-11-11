import assert from 'node:assert/strict';
import test from 'node:test';

import { createResultHandoff } from '../src/features/analysis/resultHandoff.ts';
import { createRequestSubmission } from '../src/lib/api/requestSubmission.ts';
import { ApiError } from '../src/lib/api/apiError.ts';
import { createHttpClient } from '../src/lib/api/httpClient.ts';
import { analyzeText } from '../src/lib/api/textAnalysis.ts';

const draft = '  Gửi mã OTP ngay để tránh khóa tài khoản.\n  ';
const requestId = '00000000-0000-4000-8000-000000000001';
const timestamp = '2026-11-11T09:10:00.000Z';
const sensitive = 'private provider detail';
const baseUrl = 'https://api.example.invalid';

function result(risk_level = 'DANGER', risk_score = 90) {
  return {
    analysis_id: requestId,
    input_type: 'TEXT',
    risk_level,
    risk_score,
    scam_category: risk_level === 'DANGER' ? 'OTP_THEFT' : 'NONE',
    summary: 'Kết quả dùng để kiểm thử.',
    evidence: risk_level === 'DANGER'
      ? [{ quote: 'Gửi mã OTP ngay', reason: 'Yêu cầu mã xác thực.', signal_type: 'CREDENTIAL_REQUEST', image_index: null }]
      : [],
    detected_urls: [],
    recommended_actions: ['Xác minh qua kênh chính thức.'],
    speech_summary: 'Kiểm tra lại thông tin qua kênh chính thức.',
    analyzed_at: timestamp,
  };
}

function apiWith(fetchImpl) {
  assert.equal(typeof fetchImpl, 'function');
  const client = createHttpClient({ baseUrl, fetchImpl });
  return (text, signal) => analyzeText(text, signal, client);
}

function expectError(kind, details = {}) {
  return (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.kind, kind);
    for (const [key, value] of Object.entries(details)) assert.equal(error[key], value);
    assert.ok(!error.message.includes(sensitive));
    return true;
  };
}

for (const [level, score] of [['SAFE', 12], ['SUSPICIOUS', 61], ['DANGER', 90], ['UNABLE_TO_ASSESS', null]]) {
  test(`POST text preserves all response fields for ${level}`, async () => {
    const expected = result(level, score);
    const analyze = apiWith(async (url, options) => {
      assert.equal(url, baseUrl + '/api/v1/analysis/text');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['Content-Type'], 'application/json');
      assert.deepEqual(JSON.parse(options.body), { text: draft.trim() });
      return Response.json(expected);
    });
    assert.deepEqual(await analyze(draft), expected);
  });
}

test('empty and over-limit drafts never reach fetch', async () => {
  let requests = 0;
  const analyze = apiWith(async () => { requests++; return Response.json(result()); });
  for (const text of ['   ', 'a'.repeat(5001)]) {
    await assert.rejects(analyze(text), expectError('invalidRequest'));
  }
  assert.equal(requests, 0);
});

for (const [statusCode, errorCode] of [[400, 'INVALID_INPUT'], [500, 'INTERNAL_ERROR'], [503, 'AI_PROVIDER_ERROR']]) {
  test(`HTTP ${statusCode} yields a safe backend error`, async () => {
    const analyze = apiWith(async () => Response.json({
      statusCode, errorCode, message: sensitive, requestId, timestamp,
    }, { status: statusCode }));
    await assert.rejects(analyze(draft), expectError('backend', { statusCode, errorCode, requestId }));
  });
}

test('network failure and malformed or incompatible success responses are distinct', async () => {
  await assert.rejects(apiWith(async () => { throw new TypeError(sensitive); })(draft), expectError('network'));
  for (const response of [
    new Response('invalid json'),
    Response.json({ ...result(), input_type: 'IMAGE' }),
    Response.json({ ...result(), risk_level: 'UNABLE_TO_ASSESS' }),
    Response.json({ ...result(), evidence: [{ ...result().evidence[0], image_index: 0 }] }),
  ]) {
    await assert.rejects(apiWith(async () => response)(draft), expectError('invalidResponse'));
  }
});

test('text request times out at exactly 60 seconds', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  const analyze = apiWith((_url, options) => {
    signal = options.signal;
    return new Promise(() => {});
  });
  const pending = analyze(draft);
  const rejection = assert.rejects(pending, expectError('timeout'));
  t.mock.timers.tick(59_999);
  assert.equal(signal.aborted, false);
  t.mock.timers.tick(1);
  await rejection;
  assert.equal(signal.aborted, true);
});

test('duplicate submissions do not fetch and successful handoff precedes opening the result', async () => {
  let calls = 0;
  let finish;
  const analyze = apiWith(() => {
    calls++;
    return new Promise((resolve) => { finish = resolve; });
  });
  const submission = createRequestSubmission(analyze);
  const handoff = createResultHandoff();
  const events = [];
  const callbacks = {
    onPending: () => events.push('pending'),
    onError: assert.fail,
    onResult: (response) => {
      handoff.stage(response);
      assert.deepEqual(handoff.peek(), result());
      events.push('open result');
      handoff.clear(response);
    },
  };
  const first = submission.submit(draft, callbacks);
  await submission.submit(draft, callbacks);
  assert.equal(calls, 1);
  assert.deepEqual(events, ['pending']);
  finish(Response.json(result()));
  await first;
  assert.deepEqual(events, ['pending', 'open result']);
  assert.equal(handoff.peek(), undefined);
});

test('leaving or cancelling aborts the request and suppresses late updates and navigation', async () => {
  let signal;
  let finish;
  const submission = createRequestSubmission(apiWith((_url, options) => {
    signal = options.signal;
    return new Promise((resolve) => { finish = resolve; });
  }));
  const pending = submission.submit(draft, {
    onPending: () => {},
    onError: assert.fail,
    onResult: assert.fail,
  });
  submission.cancel();
  assert.equal(signal.aborted, true);
  finish(Response.json(result()));
  await pending;
});

test('a failure leaves the draft intact for retry and does not stage a result', async () => {
  const sent = [];
  const handoff = createResultHandoff();
  const submission = createRequestSubmission(apiWith(async (_url, options) => {
    sent.push(JSON.parse(options.body).text);
    if (sent.length === 1) throw new TypeError(sensitive);
    return Response.json(result());
  }));
  const callbacks = {
    onPending: () => {},
    onError: expectError('network'),
    onResult: handoff.stage,
  };
  await submission.submit(draft, callbacks);
  assert.equal(handoff.peek(), undefined);
  assert.match(draft, /^  .*\n  $/);
  await submission.submit(draft, callbacks);
  assert.deepEqual(sent, [draft.trim(), draft.trim()]);
  assert.deepEqual(handoff.peek(), result());
});
