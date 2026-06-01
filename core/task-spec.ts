import { parse as parseToml } from 'smol-toml';
import { RUBRIC_DIMENSIONS, type Provenance, type RubricDimension, type TaskSpec } from './model/types.ts';

const PROVENANCES: Provenance[] = ['novel', 'oss-derived', 'harvested-failure'];

export function loadTaskSpec(tomlText: string): TaskSpec {
  const raw = parseToml(tomlText) as Record<string, any>;

  const provenance = raw.meta?.provenance;
  if (!PROVENANCES.includes(provenance)) {
    throw new Error(`Invalid provenance: ${String(provenance)} (expected one of ${PROVENANCES.join(', ')})`);
  }

  const criteria = (raw.criteria ?? []).map((c: any) => {
    if (!c.id || typeof c.description !== 'string') {
      throw new Error(`Each criterion needs an id and description; got ${JSON.stringify(c)}`);
    }
    return {
      id: String(c.id),
      description: String(c.description),
      weight: typeof c.weight === 'number' ? c.weight : 1,
      critical: Boolean(c.critical),
    };
  });

  const weightsRaw = raw.scoring?.dimensions ?? {};
  const dimensionWeights = Object.fromEntries(
    RUBRIC_DIMENSIONS.map((d) => [d, typeof weightsRaw[d] === 'number' ? weightsRaw[d] : 0]),
  ) as Record<RubricDimension, number>;

  return {
    provenance,
    canary: raw.meta?.canary ? String(raw.meta.canary) : undefined,
    criteria,
    staticGapRules: Array.isArray(raw.static_gaps?.rules) ? raw.static_gaps.rules.map(String) : [],
    dimensionWeights,
  };
}
