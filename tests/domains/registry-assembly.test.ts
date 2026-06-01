import { expect, test } from 'bun:test';
import { gapRegistry } from '../../domains/swe-feature/verifiers/gaps/index.ts';

test('registry exposes all v1 rules by name', () => {
  expect([...gapRegistry.keys()].sort()).toEqual(['leftover-stub', 'skipped-tests', 'unwired-export']);
});
