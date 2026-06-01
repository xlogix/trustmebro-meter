import { expect, test } from 'bun:test';
import { renderJson, renderMarkdown } from '../../core/report/render.ts';
import type { Score } from '../../core/model/types.ts';

const score: Score = {
  binaryPass: false,
  regressionGreen: true,
  dimensions: [
    { dimension: 'behavioral_coverage', evaluated: true, score: 0.5, findings: [] },
    {
      dimension: 'stubs_left',
      evaluated: true,
      score: 0.66,
      findings: [
        {
          rule: 'leftover-stub',
          dimension: 'stubs_left',
          file: 'a.ts',
          line: 2,
          severity: 'soft',
          evidence: 'TODO: x',
        },
      ],
    },
  ],
  gaps: [
    { rule: 'leftover-stub', dimension: 'stubs_left', file: 'a.ts', line: 2, severity: 'soft', evidence: 'TODO: x' },
  ],
};

test('markdown shows the verdict, each dimension, and findings with file:line', () => {
  const md = renderMarkdown(score);
  expect(md).toContain('INCOMPLETE');
  expect(md).toContain('behavioral_coverage');
  expect(md).toContain('a.ts:2');
  expect(md).toContain('TODO: x');
});

test('json round-trips the score', () => {
  expect(JSON.parse(renderJson(score)).binaryPass).toBe(false);
});
