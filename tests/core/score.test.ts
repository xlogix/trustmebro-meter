import { expect, test } from 'bun:test';
import { scoreCompleteness } from '../../core/scoring/score.ts';
import type { Criterion, GapFinding } from '../../core/model/types.ts';

const criteria: Criterion[] = [{ id: 'a', description: 'A', weight: 1, critical: true }];

test('binary pass requires critical criteria + regression + no hard gaps', () => {
  const score = scoreCompleteness({
    criteria,
    results: [{ id: 'a', passed: true }],
    regressionGreen: true,
    appliedRules: [{ name: 'leftover-stub', dimension: 'stubs_left' }],
    gaps: [],
  });
  expect(score.binaryPass).toBe(true);
});

test('a failing critical criterion fails the binary verdict but still scores rubric', () => {
  const gaps: GapFinding[] = [
    { rule: 'leftover-stub', dimension: 'stubs_left', file: 'a.ts', line: 2, severity: 'soft', evidence: 'TODO' },
  ];
  const score = scoreCompleteness({
    criteria,
    results: [{ id: 'a', passed: false }],
    regressionGreen: true,
    appliedRules: [{ name: 'leftover-stub', dimension: 'stubs_left' }],
    gaps,
  });
  expect(score.binaryPass).toBe(false);
  const stubs = score.dimensions.find((d) => d.dimension === 'stubs_left')!;
  expect(stubs.evaluated).toBe(true);
  expect(stubs.score).toBeCloseTo(1 - 1 / 3);
  expect(stubs.findings).toHaveLength(1);
});

test('error_path is reported as not-evaluated in v1', () => {
  const score = scoreCompleteness({
    criteria,
    results: [{ id: 'a', passed: true }],
    regressionGreen: true,
    appliedRules: [],
    gaps: [],
  });
  expect(score.dimensions.find((d) => d.dimension === 'error_path')!.evaluated).toBe(false);
});
