import { leftoverStub } from './leftover-stub.ts';
import { skippedTests } from './skipped-tests.ts';
import type { GapRule } from './types.ts';
import { unwiredExport } from './unwired-export.ts';

export const gapRegistry: Map<string, GapRule> = new Map(
  [leftoverStub, skippedTests, unwiredExport].map((r) => [r.name, r]),
);

export { selectRules } from './types.ts';
export type { GapRule, GapRuleContext } from './types.ts';
