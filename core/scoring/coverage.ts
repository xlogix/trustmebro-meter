import type { Criterion, CriterionResult, DimensionScore } from '../model/types.ts';

export function behavioralCoverage(criteria: Criterion[], results: CriterionResult[]): DimensionScore {
  const passed = new Map(results.map((r) => [r.id, r.passed]));
  const total = criteria.reduce((sum, c) => sum + c.weight, 0);
  const got = criteria.reduce((sum, c) => sum + (passed.get(c.id) ? c.weight : 0), 0);
  return {
    dimension: 'behavioral_coverage',
    evaluated: criteria.length > 0,
    score: total > 0 ? got / total : 0,
    findings: [],
  };
}

export function allCriticalPass(criteria: Criterion[], results: CriterionResult[]): boolean {
  const passed = new Map(results.map((r) => [r.id, r.passed]));
  return criteria.filter((c) => c.critical).every((c) => passed.get(c.id) === true);
}
