import assert from 'node:assert/strict';
import test from 'node:test';

import { evidenceSourceLabel, isAnalysisResponse } from '../src/features/analysis/analysisResult.ts';
import { getResultFixture } from '../src/features/analysis/dev/resultFixtures.ts';

test('all four development fixtures match the contract and their risk bands', () => {
  const ranges = { SAFE: [0, 39], SUSPICIOUS: [40, 74], DANGER: [75, 100] };
  for (const [level, [min, max]] of Object.entries(ranges)) {
    const response = getResultFixture(level);
    assert.equal(response.risk_level, level);
    assert.ok(isAnalysisResponse(response));
    for (const score of [min, max]) assert.ok(isAnalysisResponse({ ...response, risk_score: score }));
    for (const score of [min - 1, max + 1, null]) {
      assert.equal(isAnalysisResponse({ ...response, risk_score: score }), false);
    }
  }
  const insufficient = getResultFixture('UNABLE_TO_ASSESS');
  assert.ok(isAnalysisResponse(insufficient));
  assert.equal(insufficient.risk_score, null);
  assert.equal(isAnalysisResponse({ ...insufficient, risk_score: 0 }), false);
});

test('empty evidence and URLs are valid', () => {
  const response = getResultFixture('SAFE');
  assert.deepEqual(response.evidence, []);
  assert.deepEqual(response.detected_urls, []);
  assert.ok(isAnalysisResponse(response));
});

test('evidence labels use the wire index, including zero and null', () => {
  const response = getResultFixture('SUSPICIOUS');
  assert.deepEqual(response.evidence.map((item) => evidenceSourceLabel(response.input_type, item.image_index)),
    ['Ảnh 3', 'Ảnh 1']);
  assert.equal(evidenceSourceLabel('IMAGE', null), 'Chưa xác định ảnh nguồn');
  assert.equal(evidenceSourceLabel('TEXT', null), 'Tin nhắn');
});

test('long Vietnamese summary and quotes remain intact', () => {
  const text = 'Đây là nội dung tiếng Việt dài, có dấu và xuống dòng.\n'.repeat(100);
  const base = getResultFixture('DANGER');
  const response = { ...base, summary: text, evidence: [{ ...base.evidence[0], quote: text }] };
  assert.ok(isAnalysisResponse(response));
  assert.equal(response.summary, text);
  assert.equal(response.evidence[0].quote, text);
});

test('malformed or unknown input never passes the result guard', () => {
  const image = getResultFixture('SUSPICIOUS');
  const { speech_summary: omitted, ...incomplete } = image;
  assert.equal(typeof omitted, 'string');
  for (const input of [
    undefined, null, [], {}, incomplete, { ...image, unexpected: true },
    { ...image, risk_level: 'UNKNOWN' }, { ...image, risk_score: '61' },
    { ...image, analyzed_at: 'yesterday' }, { ...image, analysis_id: 'bad-id' },
    { ...image, input_type: 'TEXT' }, { ...image, evidence: [null] },
    { ...image, evidence: [{ ...image.evidence[0], image_index: -1 }] },
    { ...image, evidence: [{ ...image.evidence[0], image_index: 5 }] },
    { ...image, detected_urls: [{ ...image.detected_urls[0], is_verified_malicious: true }] },
    { ...image, detected_urls: [{ ...image.detected_urls[0], signals: ['UNKNOWN'] }] },
  ]) assert.equal(isAnalysisResponse(input), false);
  for (const key of [undefined, 'toString', '__proto__', 'UNKNOWN', ['SAFE']]) {
    assert.equal(getResultFixture(key), undefined);
  }
});
