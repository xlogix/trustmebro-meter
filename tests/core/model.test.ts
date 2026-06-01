import { expect, test } from 'bun:test';
import type { Score } from '../../core/model/types.ts';
import { RUBRIC_DIMENSIONS } from '../../core/model/types.ts';

test('rubric dimensions are the five canonical axes', () => {
  expect(RUBRIC_DIMENSIONS).toEqual(['behavioral_coverage', 'integration', 'error_path', 'test_honesty', 'stubs_left']);
});

test('a Score is structurally well-formed', () => {
  const s: Score = {
    binaryPass: false,
    regressionGreen: true,
    dimensions: [],
    gaps: [],
  };
  expect(s.binaryPass).toBe(false);
});
