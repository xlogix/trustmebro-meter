import {
  RUBRIC_DIMENSIONS,
  type Criterion,
  type CriterionResult,
  type DimensionScore,
  type GapFinding,
  type RubricDimension,
  type Score,
} from '../model/types.ts';
import { allCriticalPass, behavioralCoverage } from './coverage.ts';

const PENALTY_CAP = 3;

export interface AppliedRule {
  name: string;
  dimension: RubricDimension;
}

export interface ScoreInput {
  criteria: Criterion[];
  results: CriterionResult[];
  regressionGreen: boolean;
  appliedRules: AppliedRule[];
  gaps: GapFinding[];
}

export function scoreCompleteness(input: ScoreInput): Score {
  const { criteria, results, regressionGreen, appliedRules, gaps } = input;

  const evaluatedStaticDims = new Set(appliedRules.map((r) => r.dimension));
  const coverage = behavioralCoverage(criteria, results);

  const dimensions: DimensionScore[] = RUBRIC_DIMENSIONS.map((dim) => {
    if (dim === 'behavioral_coverage') return coverage;
    const findings = gaps.filter((g) => g.dimension === dim);
    const evaluated = evaluatedStaticDims.has(dim);
    return {
      dimension: dim,
      evaluated,
      score: evaluated ? Math.max(0, 1 - Math.min(1, findings.length / PENALTY_CAP)) : 0,
      findings,
    };
  });

  const noHardGaps = !gaps.some((g) => g.severity === 'hard');
  const binaryPass = allCriticalPass(criteria, results) && regressionGreen && noHardGaps;

  return { binaryPass, regressionGreen, dimensions, gaps };
}
