import { expect, test } from 'bun:test';
import { loadTaskSpec } from '../../core/task-spec.ts';

const toml = await Bun.file(new URL('../fixtures/sample.trustmebro.toml', import.meta.url)).text();

test('parses criteria, rules, and dimension weights', () => {
  const spec = loadTaskSpec(toml);
  expect(spec.provenance).toBe('novel');
  expect(spec.criteria.map((c) => c.id)).toEqual(['list-renders-from-api', 'empty-state']);
  expect(spec.criteria[0]!.critical).toBe(true);
  expect(spec.staticGapRules).toContain('unwired-export');
  expect(spec.dimensionWeights.behavioral_coverage).toBeCloseTo(0.4);
});

test('rejects an unknown provenance', () => {
  expect(() => loadTaskSpec('[meta]\nprovenance = "bogus"\n')).toThrow(/provenance/);
});
