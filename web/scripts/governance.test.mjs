import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMockAnalysis, isPendingDecision } from '../src/lib/governance-analysis.ts';

test('renovation advice preserves the decision and explicitly mocks an 8% uplift', () => {
  const result = createMockAnalysis({ kind: 'renovation', decision: 'Renovate the kitchen.', estimatedCost: '3500.25' });
  assert.equal(result.description, 'Renovate the kitchen.');
  assert.equal(result.estimatedCost, 3500.25);
  assert.equal(result.mode, 'mock');
  assert.match(result.reasoning, /SIMULATED AI ANALYSIS:.*8%/);
  assert.match(result.reasoning, /not a valuation/);
});
test('rental review states a mock regional gap and distinguishes the catch-up percentage', () => {
  const result = createMockAnalysis({ kind: 'rent_update', decision: 'Review the rent.' });
  assert.match(result.reasoning, /3% below the regional average/);
  assert.match(result.reasoning, /3.09% increase/);
  assert.match(result.reasoning, /No regional listings or live market data/);
});
test('unknown, malformed and oversized proposals fail before publication', () => {
  for (const value of [null, [], {}, { kind: 'other', decision: '😀'.repeat(251) }, { kind: 'bad', decision: 'Test' }]) {
    assert.throws(() => createMockAnalysis(value));
  }
  for (const estimatedCost of [-1, '-1', 'Infinity', 'NaN', '1e6', '0.0000001', '1000000001']) {
    assert.throws(() => createMockAnalysis({ kind: 'other', decision: 'Test', estimatedCost }));
  }
});
test('all mock outputs fit the smart contract byte limits', () => {
  for (const kind of ['renovation', 'rent_update', 'other']) {
    const result = createMockAnalysis({ kind, decision: '😀'.repeat(250), estimatedCost: '0' });
    assert.ok(Buffer.byteLength(result.title) <= 120);
    assert.ok(Buffer.byteLength(result.description) <= 1000);
    assert.ok(Buffer.byteLength(result.reasoning) <= 2000);
  }
});
test('pending includes open voting and results awaiting finalization, not resolved decisions', () => {
  assert.deepEqual([0, 1, 2, 3, 4].filter(isPendingDecision), [0, 1]);
});
