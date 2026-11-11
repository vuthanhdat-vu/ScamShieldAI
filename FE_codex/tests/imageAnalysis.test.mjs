import assert from 'node:assert/strict';
import test from 'node:test';

import { evidenceSourceLabel } from '../src/features/analysis/analysisResult.ts';
import { createRequestSubmission } from '../src/lib/api/requestSubmission.ts';
import { MAX_IMAGE_BYTES } from '../src/features/analysis/imageValidation.ts';
import { createResultHandoff } from '../src/features/analysis/resultHandoff.ts';
import { createHttpClient } from '../src/lib/api/httpClient.ts';
import { analyzeImages } from '../src/lib/api/imageAnalysis.ts';

const base = 'https://api.example.invalid';
const image = (format, size = 1024, id = format) => ({ format, size, uri: 'file:///cache/' + id });
const png = image('PNG');
const jpeg = image('JPEG');
const webp = image('WebP');
const requestId = '00000000-0000-4000-8000-000000000001';
const response = {
  analysis_id: requestId, input_type: 'IMAGE', risk_level: 'SUSPICIOUS', risk_score: 60,
  scam_category: 'NONE', summary: 'Kết quả kiểm thử.', evidence: [
    { quote: 'Chuyển tiền', reason: 'Yêu cầu chuyển tiền.', signal_type: 'MONEY_REQUEST', image_index: 0 },
  ], detected_urls: [], recommended_actions: ['Xác minh.'], speech_summary: 'Cần xác minh.',
  analyzed_at: '2026-11-11T09:20:00.000Z',
};

function mockApi(fetchImpl, inspect) {
  assert.equal(typeof fetchImpl, 'function');
  const client = createHttpClient({ baseUrl: base, fetchImpl });
  return (draft, signal) => analyzeImages(draft, signal, {
    client,
    fileAccess: {
      inspectScreenshot: inspect ?? (async (uri) => ({ image: draft.images.find((entry) => entry.uri === uri) })),
      createScreenshotUploadFile: (uri, name, type) => ({ uri, name, type }),
    },
    createFormData: () => {
      const parts = [];
      return { parts, append: (...part) => parts.push(part) };
    },
  });
}

function failure(kind, errorCode) {
  return (error) => {
    assert.equal(error.kind, kind);
    assert.equal(error.errorCode, errorCode);
    assert.ok(!error.message.includes('secret details'));
    return true;
  };
}

test('single PNG uses a URI-backed file and no context or manual Content-Type', async () => {
  const send = mockApi(async (url, request) => {
    assert.equal(url, base + '/api/v1/analysis/images');
    assert.equal(request.method, 'POST');
    assert.deepEqual(request.headers, { Accept: 'application/json' });
    assert.deepEqual(request.body.parts, [
      ['images', { uri: png.uri, name: 'screenshot-1.png', type: 'image/png' }],
    ]);
    return Response.json(response);
  });
  assert.deepEqual(await send({ images: [png], context: '' }), response);
});

test('reordered images use repeated keys and correct MIME types, then optional context', async () => {
  const send = mockApi(async (_url, { body }) => {
    assert.deepEqual(body.parts, [
      ['images', { uri: webp.uri, name: 'screenshot-1.webp', type: 'image/webp' }],
      ['images', { uri: jpeg.uri, name: 'screenshot-2.jpg', type: 'image/jpeg' }],
      ['images', { uri: png.uri, name: 'screenshot-3.png', type: 'image/png' }],
      ['context', ' Tin nhắn tiếng Việt '],
    ]);
    return Response.json(response);
  });
  await send({ images: [webp, jpeg, png], context: ' Tin nhắn tiếng Việt ' });
});

test('validates count, per-file bytes, combined bytes, and context before fetch', async () => {
  const max = (index) => image('PNG', MAX_IMAGE_BYTES, String(index));
  let calls = 0;
  const send = mockApi(async () => { calls++; return Response.json(response); });
  for (const images of [[], Array.from({ length: 6 }, (_, i) => max(i))]) {
    await assert.rejects(send({ images }), failure('invalidRequest'));
  }
  await assert.rejects(send({ images: [image('PNG', MAX_IMAGE_BYTES + 1)] }),
    failure('invalidRequest', 'IMAGE_TOO_LARGE'));
  await assert.rejects(send({ images: Array.from({ length: 5 }, (_, i) => max(i)) }),
    failure('invalidRequest', 'IMAGE_TOO_LARGE'));
  await assert.rejects(send({ images: [png], context: 'a'.repeat(1001) }), failure('invalidRequest'));
  assert.equal(calls, 0);
  await send({ images: Array.from({ length: 4 }, (_, i) => max(i)), context: 'a'.repeat(1000) });
  await send({ images: Array.from({ length: 5 }, (_, i) => image('PNG', 100, String(i))) });
  assert.equal(calls, 2);
});

test('rejects unsupported, unreadable or changed oversized files without fetch', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return Response.json(response); };
  await assert.rejects(mockApi(fetchImpl)({ images: [image('GIF')] }),
    failure('invalidRequest', 'UNSUPPORTED_IMAGE_FORMAT'));
  await assert.rejects(mockApi(fetchImpl)({ images: [image('PNG', 0)] }),
    failure('invalidRequest', 'INVALID_IMAGE'));
  for (const code of ['INVALID_IMAGE', 'UNSUPPORTED_IMAGE_FORMAT']) {
    const inspect = async () => ({ error: 'secret details', code });
    await assert.rejects(mockApi(fetchImpl, inspect)({ images: [png] }), failure('invalidRequest', code));
  }
  const inspect = async () => ({ image: { ...png, size: MAX_IMAGE_BYTES + 1 } });
  await assert.rejects(mockApi(fetchImpl, inspect)({ images: [png] }),
    failure('invalidRequest', 'IMAGE_TOO_LARGE'));
  assert.equal(calls, 0);
});

test('validates IMAGE responses and bounds zero-based evidence against the sent list', async () => {
  const withSecondImage = { ...response, evidence: [{ ...response.evidence[0], image_index: 1 }] };
  for (const invalid of [{ ...response, input_type: 'TEXT' }, withSecondImage, { invalid: true }]) {
    await assert.rejects(mockApi(async () => Response.json(invalid))({ images: [png] }),
      failure('invalidResponse'));
  }
  const handoff = createResultHandoff();
  const submit = createRequestSubmission(mockApi(async () => Response.json(withSecondImage)));
  await submit.submit({ images: [png, webp] }, {
    onPending: () => {}, onError: assert.fail, onResult: handoff.stage,
  });
  const result = handoff.peek();
  assert.equal(result.evidence[0].image_index, 1);
  assert.equal(evidenceSourceLabel(result.input_type, result.evidence[0].image_index), 'Ảnh 2');
});

test('accepts IMAGE UNABLE_TO_ASSESS with a null score', async () => {
  const unable = { ...response, evidence: [], risk_level: 'UNABLE_TO_ASSESS', risk_score: null };
  assert.deepEqual(await mockApi(async () => Response.json(unable))({ images: [png] }), unable);
});

test('HTTP 400 and 500 retain requestId with safe mapped copy', async () => {
  for (const [statusCode, errorCode] of [[400, 'INVALID_IMAGE'], [500, 'INTERNAL_ERROR']]) {
    const send = mockApi(async () => Response.json({
      statusCode, errorCode, requestId, message: 'secret details', timestamp: response.analyzed_at,
    }, { status: statusCode }));
    await assert.rejects(send({ images: [png] }), (error) => {
      failure('backend', errorCode)(error);
      assert.equal(error.statusCode, statusCode);
      assert.equal(error.requestId, requestId);
      return true;
    });
  }
});

test('network failure preserves the image order and context for retry', async () => {
  const draft = { images: [jpeg, png], context: 'Bối cảnh' };
  const sent = [];
  const submit = createRequestSubmission(mockApi(async (_url, { body }) => {
    sent.push(body.parts);
    if (sent.length === 1) throw new TypeError('secret details');
    return Response.json(response);
  }));
  const outcomes = [];
  const callbacks = {
    onPending: () => {},
    onError: (error) => outcomes.push(error.kind),
    onResult: () => outcomes.push('result'),
  };
  await submit.submit(draft, callbacks);
  assert.deepEqual(draft, { images: [jpeg, png], context: 'Bối cảnh' });
  await submit.submit(draft, callbacks);
  assert.deepEqual(sent[0], sent[1]);
  assert.deepEqual(outcomes, ['network', 'result']);
});

test('duplicate submit is blocked and cancellation during upload aborts fetch', async () => {
  let calls = 0;
  let markStarted;
  let uploadSignal;
  const started = new Promise((resolve) => { markStarted = resolve; });
  const submit = createRequestSubmission(mockApi((_url, { signal }) => {
    calls++;
    uploadSignal = signal;
    markStarted();
    return new Promise(() => {});
  }));
  const draft = { images: [png] };
  const callbacks = { onPending: () => {}, onError: assert.fail, onResult: assert.fail };
  const pending = submit.submit(draft, callbacks);
  await started;
  await submit.submit(draft, callbacks);
  assert.equal(calls, 1);
  submit.cancel();
  await pending;
  assert.equal(uploadSignal.aborted, true);
});

test('cancellation during file inspection prevents upload', async () => {
  const controller = new AbortController();
  let calls = 0;
  const send = mockApi(async () => { calls++; }, async () => {
    controller.abort();
    return { image: png };
  });
  await assert.rejects(send({ images: [png] }, controller.signal), failure('cancelled'));
  assert.equal(calls, 0);
});

test('upload times out at 60 seconds', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let markStarted;
  let uploadSignal;
  const started = new Promise((resolve) => { markStarted = resolve; });
  const send = mockApi((_url, { signal }) => {
    uploadSignal = signal;
    markStarted();
    return new Promise(() => {});
  });
  const rejection = assert.rejects(send({ images: [png] }), failure('timeout'));
  await started;
  t.mock.timers.tick(59_999);
  assert.equal(uploadSignal.aborted, false);
  t.mock.timers.tick(1);
  await rejection;
  assert.equal(uploadSignal.aborted, true);
});
