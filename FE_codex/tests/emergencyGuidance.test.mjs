import assert from 'node:assert/strict';
import test from 'node:test';

import {
  emergencyScenarios, readEmergencyScenario, readGuidance, urgencyLabels,
} from '../src/features/guidance/emergencyGuidance.ts';
import { getEmergencyFixture } from '../src/features/guidance/dev/emergencyFixtures.ts';

test('exactly six scenarios are selectable, in the approved order', () => {
  assert.deepEqual(emergencyScenarios, [
    'NOT_INTERACTED', 'CLICKED_LINK', 'SHARED_CREDENTIALS', 'SHARED_OTP',
    'TRANSFERRED_MONEY', 'INSTALLED_APP',
  ]);
  for (const scenario of emergencyScenarios) assert.equal(readEmergencyScenario(scenario), scenario);
});

test('missing, repeated, or unknown route parameters cannot select a scenario', () => {
  for (const value of [undefined, '', 'UNKNOWN', '__proto__', ['SHARED_OTP'], null]) {
    assert.equal(readEmergencyScenario(value), undefined);
  }
  assert.deepEqual(readGuidance(undefined, undefined), { status: 'noScenario' });
});

test('each selection produces a ready view with its urgency, title, and ordered steps', () => {
  for (const scenario of emergencyScenarios) {
    const guidance = getEmergencyFixture(scenario);
    assert.equal(guidance.scenario, scenario);
    assert.ok(urgencyLabels[guidance.urgency]);
    assert.deepEqual(readGuidance(scenario, guidance), { status: 'ready', guidance });
  }
  for (const scenario of ['SHARED_OTP', 'TRANSFERRED_MONEY', 'INSTALLED_APP']) {
    assert.equal(getEmergencyFixture(scenario).urgency, 'HIGH');
  }
});

test('guidance is unavailable when missing, invalid, empty, or for a different selection', () => {
  const scenario = 'CLICKED_LINK';
  const base = getEmergencyFixture(scenario);
  assert.deepEqual(readGuidance(scenario, undefined), { status: 'missing' });
  for (const input of [
    null, [], {}, { ...base, urgency: 'UNKNOWN' }, { ...base, extra: true },
    { ...base, steps: [5] }, getEmergencyFixture('SHARED_OTP'),
  ]) assert.deepEqual(readGuidance(scenario, input), { status: 'invalid' });

  for (const input of [{ ...base, steps: [] }, { ...base, steps: [' '] }, { ...base, title: '' }]) {
    assert.deepEqual(readGuidance(scenario, input), { status: 'empty' });
  }
});

test('long Vietnamese titles and steps retain their text and order', () => {
  const text = 'Kiểm tra thông tin qua ứng dụng chính thức.\n'.repeat(100);
  const scenario = 'TRANSFERRED_MONEY';
  const guidance = { ...getEmergencyFixture(scenario), title: text, steps: [text, 'Bước tiếp theo.'] };
  assert.deepEqual(readGuidance(scenario, guidance), { status: 'ready', guidance });
});
