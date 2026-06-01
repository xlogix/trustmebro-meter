#!/usr/bin/env bun
/**
 * Assemble all per-trial bridge records into the dashboard's data file.
 *
 * `run-bridge.ts` writes one record per (model, task) under bench/out/records/.
 * This reads ALL of them, rebuilds per-model aggregates, and emits:
 *   - bench/out/results.json   (machine copy, gitignored)
 *   - docs/results.js          (committed; `window.TRUSTMEBRO_RESULTS = {...}`)
 *
 * CLI: bun run bench/assemble.ts [--now <iso>]
 */

import { Glob } from 'bun';
import type { RubricDimension } from '../core/model/types.ts';

const RUBRIC_DIMS: RubricDimension[] = [
  'behavioral_coverage',
  'integration',
  'error_path',
  'test_honesty',
  'stubs_left',
];

interface DimensionRecord {
  score: number;
  evaluated: boolean;
  findingsCount: number;
}

interface BridgeRecord {
  task_id: string;
  language: string;
  model: string;
  reward: number;
  patch_applied: boolean;
  binaryPass: boolean;
  dimensions: Record<RubricDimension, DimensionRecord>;
  gaps: Array<{ rule: string; file: string; line: number; severity: string; evidence: string }>;
  tokens: { input: number | null; output: number | null; cache: number | null };
  cost_usd: number | null;
}

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function aggregate(records: BridgeRecord[]) {
  const n_trials = records.length;
  const scored = records.filter((r) => r.patch_applied);
  const n_patch_applied = scored.length;
  const pass_rate = n_trials > 0 ? records.filter((r) => r.reward >= 1).length / n_trials : 0;

  const avg_dimension = Object.fromEntries(
    RUBRIC_DIMS.map((d) => {
      const evaluated = scored.filter((r) => r.dimensions[d]?.evaluated);
      const mean =
        evaluated.length > 0 ? evaluated.reduce((s, r) => s + r.dimensions[d].score, 0) / evaluated.length : 0;
      return [d, mean];
    }),
  ) as Record<RubricDimension, number>;

  const total_gaps = scored.reduce((s, r) => s + r.gaps.length, 0);
  const gaps_per_trial = n_patch_applied > 0 ? total_gaps / n_patch_applied : 0;
  const costs = records.map((r) => r.cost_usd).filter((c): c is number => c !== null);
  const avg_cost_usd = costs.length > 0 ? costs.reduce((s, c) => s + c, 0) / costs.length : null;

  return { n_trials, n_patch_applied, pass_rate, avg_dimension, total_gaps, gaps_per_trial, avg_cost_usd };
}

async function main(): Promise<void> {
  const generatedAt = flag(process.argv.slice(2), '--now') ?? 'unknown';
  const benchDir = import.meta.dir;
  const recordsDir = `${benchDir}/out/records`;

  const records: BridgeRecord[] = [];
  const glob = new Glob('*.json');
  for await (const name of glob.scan({ cwd: recordsDir, onlyFiles: true })) {
    records.push((await Bun.file(`${recordsDir}/${name}`).json()) as BridgeRecord);
  }
  if (records.length === 0) {
    console.error('assemble: no records found under bench/out/records/');
    process.exit(1);
  }

  // Stable order: by model, then task.
  records.sort((a, b) => a.model.localeCompare(b.model) || a.task_id.localeCompare(b.task_id));

  const models: Record<string, ReturnType<typeof aggregate>> = {};
  for (const model of [...new Set(records.map((r) => r.model))].sort()) {
    models[model] = aggregate(records.filter((r) => r.model === model));
  }

  const results = { generated_at: generatedAt, models, records };

  await Bun.write(`${benchDir}/out/results.json`, JSON.stringify(results, null, 2) + '\n');
  const repoRoot = `${benchDir}/..`;
  await Bun.write(`${repoRoot}/docs/results.js`, `window.TRUSTMEBRO_RESULTS = ${JSON.stringify(results, null, 2)};\n`);

  console.log(`✓ assembled ${records.length} records across ${Object.keys(models).length} model(s)`);
  for (const [m, a] of Object.entries(models)) {
    console.log(
      `  ${m}: trials=${a.n_trials} pass_rate=${(a.pass_rate * 100).toFixed(0)}% gaps/trial=${a.gaps_per_trial.toFixed(1)} avg_cost=${a.avg_cost_usd === null ? '—' : '$' + a.avg_cost_usd.toFixed(2)}`,
    );
  }
  console.log(`  → docs/results.js + bench/out/results.json`);
}

await main();
