import { expect, test } from 'bun:test';
import { behavioralCoverage } from '../../core/scoring/coverage.ts';
import type { Criterion } from '../../core/model/types.ts';

const criteria: Criterion[] = [
  { id: 'a', description: 'A', weight: 1, critical: true },
  { id: 'b', description: 'B', weight: 0.5, critical: false },
];

test('weighted fraction of passing criteria', () => {
  const dim = behavioralCoverage(criteria, [
    { id: 'a', passed: true },
    { id: 'b', passed: false },
  ]);
  expect(dim.dimension).toBe('behavioral_coverage');
  expect(dim.evaluated).toBe(true);
  expect(dim.score).toBeCloseTo(1 / 1.5); // 0.667
});

test('missing results count as not passed', () => {
  const dim = behavioralCoverage(criteria, []);
  expect(dim.score).toBe(0);
});

test('no criteria => not evaluated', () => {
  const dim = behavioralCoverage([], []);
  expect(dim.evaluated).toBe(false);
  expect(dim.score).toBe(0);
});
