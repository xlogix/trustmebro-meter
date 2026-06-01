import { expect, test } from 'bun:test';
import type { GapRule } from '../../domains/swe-feature/verifiers/gaps/types.ts';
import { selectRules } from '../../domains/swe-feature/verifiers/gaps/types.ts';

const fake: GapRule = {
  name: 'fake',
  dimension: 'stubs_left',
  run: () => [],
};

test('selectRules returns only the requested rules, in request order', () => {
  const registry = new Map<string, GapRule>([['fake', fake]]);
  expect(selectRules(registry, ['fake'])).toEqual([fake]);
  expect(selectRules(registry, ['missing'])).toEqual([]);
});
