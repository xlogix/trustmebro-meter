import { parseUnifiedDiff } from '../core/diff.ts';
import type { CriterionResult, Score } from '../core/model/types.ts';
import { renderMarkdown } from '../core/report/render.ts';
import { scoreCompleteness, type AppliedRule } from '../core/scoring/score.ts';
import { loadTaskSpec } from '../core/task-spec.ts';
import { gapRegistry, selectRules } from '../domains/swe-feature/verifiers/gaps/index.ts';

export interface GateInput {
  workdir: string;
  diffText: string;
  results?: CriterionResult[];
  regressionGreen?: boolean;
}

export async function runGate(input: GateInput): Promise<{ score: Score; markdown: string }> {
  const spec = loadTaskSpec(await Bun.file(`${input.workdir}/trustmebro.toml`).text());
  const changedFiles = parseUnifiedDiff(input.diffText);

  const rules = selectRules(gapRegistry, spec.staticGapRules);
  const gaps = (await Promise.all(rules.map((r) => r.run({ workspaceDir: input.workdir, changedFiles })))).flat();
  const appliedRules: AppliedRule[] = rules.map((r) => ({ name: r.name, dimension: r.dimension }));

  const score = scoreCompleteness({
    criteria: spec.criteria,
    results: input.results ?? [],
    regressionGreen: input.regressionGreen ?? true,
    appliedRules,
    gaps,
  });

  return { score, markdown: renderMarkdown(score) };
}
