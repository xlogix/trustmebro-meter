import type { DiffFile, GapFinding, RubricDimension } from '../../../../core/model/types.ts';

export interface GapRuleContext {
  workspaceDir: string;
  changedFiles: DiffFile[];
}

export interface GapRule {
  name: string;
  dimension: RubricDimension;
  run: (ctx: GapRuleContext) => Promise<GapFinding[]> | GapFinding[];
}

export function selectRules(registry: Map<string, GapRule>, names: string[]): GapRule[] {
  return names.map((n) => registry.get(n)).filter((r): r is GapRule => r !== undefined);
}
