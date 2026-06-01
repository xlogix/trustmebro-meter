export type Provenance = 'novel' | 'oss-derived' | 'harvested-failure';

export const RUBRIC_DIMENSIONS = [
  'behavioral_coverage',
  'integration',
  'error_path',
  'test_honesty',
  'stubs_left',
] as const;

export type RubricDimension = (typeof RUBRIC_DIMENSIONS)[number];

export interface Criterion {
  id: string;
  description: string;
  weight: number;
  critical: boolean;
}

export interface TaskSpec {
  provenance: Provenance;
  canary?: string;
  criteria: Criterion[];
  staticGapRules: string[];
  dimensionWeights: Record<RubricDimension, number>;
}

export interface CriterionResult {
  id: string;
  passed: boolean;
}

export interface DiffFile {
  path: string;
  addedLines: number[]; // 1-indexed line numbers in the new file
}

export type GapSeverity = 'hard' | 'soft';

export interface GapFinding {
  rule: string;
  dimension: RubricDimension;
  file: string;
  line: number; // 1-indexed
  severity: GapSeverity;
  evidence: string;
}

export interface DimensionScore {
  dimension: RubricDimension;
  evaluated: boolean;
  score: number; // 0..1; 0 when not evaluated
  findings: GapFinding[];
}

export interface Score {
  binaryPass: boolean;
  regressionGreen: boolean;
  dimensions: DimensionScore[];
  gaps: GapFinding[];
}
