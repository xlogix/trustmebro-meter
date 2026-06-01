#!/usr/bin/env bun
/**
 * Pier → trustmebro completeness bridge.
 *
 * Converts a Pier job directory into per-trial completeness records (binary
 * pass/fail + five-dimension rubric) by reconstructing each agent workspace,
 * writing a synthetic trustmebro.toml, and calling runGate.
 *
 * CLI: bun run bench/run-bridge.ts --job <jobDir> --tasks <tasksDir> --model <label> [--now <iso>]
 */

import { existsSync } from 'node:fs';
import { parse as parseToml } from 'smol-toml';
import { runGate } from '../cli/gate.ts';
import type { RubricDimension } from '../core/model/types.ts';

// ---------------------------------------------------------------------------
// CLI arg parsing (matches cli/index.ts style)
// ---------------------------------------------------------------------------

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function requireFlag(argv: string[], name: string): string {
  const v = flag(argv, name);
  if (!v) {
    console.error(`run-bridge: missing required flag ${name}`);
    process.exit(1);
  }
  return v;
}

const argv = process.argv.slice(2);
const jobDir = requireFlag(argv, '--job');
const tasksDir = requireFlag(argv, '--tasks');
const modelLabel = requireFlag(argv, '--model');
// Deliberately NOT calling Date.now() / new Date() — determinism requirement.
const generatedAt = flag(argv, '--now') ?? 'unknown';

// ---------------------------------------------------------------------------
// Pier result shape (what we actually read from result.json)
// ---------------------------------------------------------------------------

interface PierAgentResult {
  n_input_tokens: number | null;
  n_cache_tokens: number | null;
  n_output_tokens: number | null;
  cost_usd: number | null;
}

interface PierResult {
  task_name: string;
  trial_name: string;
  agent_result: PierAgentResult | null;
  verifier_result: {
    rewards: {
      reward: number;
    };
  };
}

// ---------------------------------------------------------------------------
// task.toml metadata shape
// ---------------------------------------------------------------------------

interface TaskMeta {
  language: string;
  repository_url: string;
  base_commit_hash: string;
}

// ---------------------------------------------------------------------------
// Output record shape
// ---------------------------------------------------------------------------

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
  gaps: Array<{
    rule: string;
    file: string;
    line: number;
    severity: string;
    evidence: string;
  }>;
  tokens: { input: number | null; output: number | null; cache: number | null };
  cost_usd: number | null;
}

// ---------------------------------------------------------------------------
// Synthetic trustmebro.toml — the same shape for every DeepSWE trial
// ---------------------------------------------------------------------------

const SYNTHETIC_TOML = `\
[meta]
provenance = "oss-derived"

[[criteria]]
id = "deepswe-verifier"
description = "DeepSWE hidden behavioral test suite passes"
weight = 1.0
critical = true

[static_gaps]
rules = ["leftover-stub", "skipped-tests", "unwired-export"]

[scoring]
dimensions = { behavioral_coverage = 0.4, integration = 0.2, error_path = 0.15, test_honesty = 0.15, stubs_left = 0.1 }
`;

// ---------------------------------------------------------------------------
// Shell helpers (Bun.$ / Bun.spawn)
// ---------------------------------------------------------------------------

async function run(
  cmd: string[],
  opts: { cwd?: string; failOk?: boolean } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(cmd, {
    cwd: opts.cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0 && !opts.failOk) {
    throw new Error(`Command failed (exit ${code}): ${cmd.join(' ')}\n${stderr.trim()}`);
  }
  return { code, stdout, stderr };
}

async function pathExists(p: string): Promise<boolean> {
  return Bun.file(p).exists();
}

// ---------------------------------------------------------------------------
// Repo clone + worktree helpers
// ---------------------------------------------------------------------------

async function ensureClone(repoUrl: string, cacheDir: string): Promise<void> {
  // `.git` is a directory; Bun.file().exists() only reports files, so use a
  // real directory check here — otherwise we re-clone over an existing repo.
  if (existsSync(`${cacheDir}/.git`)) {
    // Already cloned — nothing to do.
    return;
  }
  console.log(`  clone ${repoUrl} → ${cacheDir}`);
  await run(['git', 'clone', '--quiet', repoUrl, cacheDir]);
}

/**
 * Sets up a per-trial workspace directory at the given base commit, then
 * attempts to apply the patch.  Returns which strategy succeeded (or null if
 * all failed).
 */
async function setupWorkspace(
  cloneDir: string,
  workDir: string,
  baseCommit: string,
  patchPath: string,
): Promise<'clean' | '3way' | 'patch-p1' | null> {
  // Create a fresh copy of the repo at the base commit.
  // We copy instead of using worktrees so each trial is fully independent.
  // Remove any stale workdir from a prior run so the local clone is idempotent.
  if (existsSync(workDir)) {
    await run(['rm', '-rf', workDir]);
  }
  await run(['git', 'clone', '--quiet', '--local', cloneDir, workDir]);
  await run(['git', 'checkout', '--quiet', baseCommit], { cwd: workDir });

  // Try applying the patch using three fallback strategies.
  const patchText = await Bun.file(patchPath).text();
  if (!patchText.trim()) {
    // Empty patch — treat as "applied" with no changes.
    return 'clean';
  }

  // Strategy 1: git apply
  const r1 = await run(['git', 'apply', patchPath], { cwd: workDir, failOk: true });
  if (r1.code === 0) return 'clean';

  // Strategy 2: git apply --3way (tries merge when context doesn't match exactly)
  await run(['git', 'checkout', '--quiet', baseCommit], { cwd: workDir });
  const r2 = await run(['git', 'apply', '--3way', patchPath], { cwd: workDir, failOk: true });
  if (r2.code === 0) return '3way';

  // Strategy 3: patch -p1 (less strict context matching)
  await run(['git', 'checkout', '--quiet', baseCommit], { cwd: workDir });
  const r3 = await run(['patch', '-p1', '--input', patchPath], { cwd: workDir, failOk: true });
  if (r3.code === 0) return 'patch-p1';

  return null;
}

// ---------------------------------------------------------------------------
// Task metadata
// ---------------------------------------------------------------------------

async function loadTaskMeta(tasksDir: string, taskName: string): Promise<TaskMeta> {
  const tomlPath = `${tasksDir}/${taskName}/task.toml`;
  const text = await Bun.file(tomlPath).text();
  const raw = parseToml(text) as Record<string, unknown>;
  const meta = raw['metadata'] as Record<string, unknown> | undefined;
  if (!meta) throw new Error(`task.toml for "${taskName}" has no [metadata] section`);

  const language = meta['language'];
  const repository_url = meta['repository_url'];
  const base_commit_hash = meta['base_commit_hash'];

  if (typeof language !== 'string') throw new Error(`task "${taskName}": metadata.language is not a string`);
  if (typeof repository_url !== 'string')
    throw new Error(`task "${taskName}": metadata.repository_url is not a string`);
  if (typeof base_commit_hash !== 'string')
    throw new Error(`task "${taskName}": metadata.base_commit_hash is not a string`);

  return { language, repository_url, base_commit_hash };
}

// ---------------------------------------------------------------------------
// Aggregate helpers
// ---------------------------------------------------------------------------

const RUBRIC_DIMS: RubricDimension[] = [
  'behavioral_coverage',
  'integration',
  'error_path',
  'test_honesty',
  'stubs_left',
];

interface ModelAggregate {
  n_trials: number;
  n_patch_applied: number;
  pass_rate: number;
  avg_dimension: Record<RubricDimension, number>;
  total_gaps: number;
  gaps_per_trial: number;
  avg_cost_usd: number | null;
}

function buildAggregate(records: BridgeRecord[]): ModelAggregate {
  const n_trials = records.length;
  const n_patch_applied = records.filter((r) => r.patch_applied).length;
  const passed = records.filter((r) => r.reward >= 1).length;
  const pass_rate = n_trials > 0 ? passed / n_trials : 0;

  const dimSums: Record<RubricDimension, number> = {
    behavioral_coverage: 0,
    integration: 0,
    error_path: 0,
    test_honesty: 0,
    stubs_left: 0,
  };
  const dimCounts: Record<RubricDimension, number> = {
    behavioral_coverage: 0,
    integration: 0,
    error_path: 0,
    test_honesty: 0,
    stubs_left: 0,
  };

  let total_gaps = 0;
  let costSum = 0;
  let costCount = 0;

  for (const rec of records) {
    if (!rec.patch_applied) continue; // only count scored trials for dimension avgs
    for (const dim of RUBRIC_DIMS) {
      const ds = rec.dimensions[dim];
      if (ds.evaluated) {
        dimSums[dim] += ds.score;
        dimCounts[dim] += 1;
      }
    }
    total_gaps += rec.gaps.length;
    if (rec.cost_usd !== null) {
      costSum += rec.cost_usd;
      costCount += 1;
    }
  }

  const avg_dimension = Object.fromEntries(
    RUBRIC_DIMS.map((d) => [d, dimCounts[d] > 0 ? dimSums[d] / dimCounts[d] : 0]),
  ) as Record<RubricDimension, number>;

  const gaps_per_trial = n_patch_applied > 0 ? total_gaps / n_patch_applied : 0;
  const avg_cost_usd = costCount > 0 ? costSum / costCount : null;

  return { n_trials, n_patch_applied, pass_rate, avg_dimension, total_gaps, gaps_per_trial, avg_cost_usd };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Resolve absolute paths so relative callers work from any cwd.
  const absJobDir = jobDir.startsWith('/') ? jobDir : `${process.cwd()}/${jobDir}`;
  const absTasksDir = tasksDir.startsWith('/') ? tasksDir : `${process.cwd()}/${tasksDir}`;

  // bench/ is the directory containing this script.
  const benchDir = import.meta.dir;
  const cacheDir = `${benchDir}/.cache`;
  const outDir = `${benchDir}/out`;

  // Ensure output dirs exist.
  await Bun.write(`${outDir}/records/.keep`, '');

  // Discover trials: subdirs of jobDir that contain result.json.
  const jobGlob = new Bun.Glob('*/result.json');
  const trialResultPaths: string[] = [];
  for await (const p of jobGlob.scan({ cwd: absJobDir, onlyFiles: true })) {
    trialResultPaths.push(p);
  }

  if (trialResultPaths.length === 0) {
    console.error(`run-bridge: no trial result.json files found under ${absJobDir}`);
    process.exit(1);
  }

  const allRecords: BridgeRecord[] = [];

  for (const relPath of trialResultPaths) {
    const trialDir = `${absJobDir}/${relPath.replace('/result.json', '')}`;
    const trialName = relPath.split('/')[0];

    console.log(`\n=== trial: ${trialName} ===`);

    // 1. Parse result.json
    const resultJson = (await Bun.file(`${trialDir}/result.json`).json()) as PierResult;
    const taskName = resultJson.task_name;
    const reward = resultJson.verifier_result.rewards.reward;
    const agentResult = resultJson.agent_result;

    console.log(`  task: ${taskName}, reward: ${reward}`);

    // 2. Load task metadata
    let taskMeta: TaskMeta;
    try {
      taskMeta = await loadTaskMeta(absTasksDir, taskName);
    } catch (err) {
      console.error(`  SKIP: failed to load task.toml — ${String(err)}`);
      continue;
    }

    const { language, repository_url, base_commit_hash } = taskMeta;

    // 3. Clone repo (once) and set up per-trial workspace
    const repoCacheDir = `${cacheDir}/repos/${taskName}`;
    try {
      await ensureClone(repository_url, repoCacheDir);
    } catch (err) {
      console.error(`  SKIP: clone failed — ${String(err)}`);
      allRecords.push(makeSkippedRecord(taskName, language, reward, agentResult, 'clone_failed'));
      continue;
    }

    const workDir = `${cacheDir}/work/${trialName}`;
    const patchPath = `${trialDir}/artifacts/model.patch`;

    const patchExists = await pathExists(patchPath);
    let applyStrategy: 'clean' | '3way' | 'patch-p1' | null = null;

    if (patchExists) {
      try {
        applyStrategy = await setupWorkspace(repoCacheDir, workDir, base_commit_hash, patchPath);
      } catch (err) {
        console.error(`  WARN: workspace setup error — ${String(err)}`);
      }
    } else {
      console.warn(`  WARN: no model.patch found at ${patchPath}`);
    }

    const patchApplied = applyStrategy !== null;
    if (!patchApplied) {
      console.warn(`  patch_failed — skipping scoring`);
      allRecords.push(makeSkippedRecord(taskName, language, reward, agentResult, 'patch_failed'));
      continue;
    }

    console.log(`  patch applied via: ${applyStrategy}`);

    // 4. Write synthetic trustmebro.toml into the workspace
    await Bun.write(`${workDir}/trustmebro.toml`, SYNTHETIC_TOML);

    // 5. Call runGate
    const patchText = await Bun.file(patchPath).text();
    const { score } = await runGate({
      workdir: workDir,
      diffText: patchText,
      results: [{ id: 'deepswe-verifier', passed: reward >= 1 }],
      regressionGreen: true,
    });

    // 6. Build record
    const dimensions = Object.fromEntries(
      score.dimensions.map((ds) => [
        ds.dimension,
        { score: ds.score, evaluated: ds.evaluated, findingsCount: ds.findings.length },
      ]),
    ) as Record<RubricDimension, DimensionRecord>;

    const record: BridgeRecord = {
      task_id: taskName,
      language,
      model: modelLabel,
      reward,
      patch_applied: true,
      binaryPass: score.binaryPass,
      dimensions,
      gaps: score.gaps.map((g) => ({
        rule: g.rule,
        file: g.file,
        line: g.line,
        severity: g.severity,
        evidence: g.evidence,
      })),
      tokens: {
        input: agentResult?.n_input_tokens ?? null,
        output: agentResult?.n_output_tokens ?? null,
        cache: agentResult?.n_cache_tokens ?? null,
      },
      cost_usd: agentResult?.cost_usd ?? null,
    };

    console.log(`  binaryPass=${record.binaryPass}, gaps=${record.gaps.length}`);

    // Write per-trial record
    const recordPath = `${outDir}/records/${modelLabel}__${taskName}.json`;
    await Bun.write(recordPath, JSON.stringify(record, null, 2) + '\n');
    console.log(`  → ${recordPath}`);

    allRecords.push(record);
  }

  // Build aggregate keyed by model
  const modelRecords = allRecords.filter((r) => r.model === modelLabel);
  const aggregate = buildAggregate(modelRecords);

  const results = {
    generated_at: generatedAt,
    models: { [modelLabel]: aggregate },
    records: allRecords,
  };

  const resultsPath = `${outDir}/results.json`;
  await Bun.write(resultsPath, JSON.stringify(results, null, 2) + '\n');
  console.log(`\n✓ results.json → ${resultsPath}`);
  console.log(
    `  trials=${aggregate.n_trials}, patch_applied=${aggregate.n_patch_applied}, pass_rate=${aggregate.pass_rate}`,
  );
}

function makeSkippedRecord(
  taskName: string,
  language: string,
  reward: number,
  agentResult: PierAgentResult | null,
  reason: string,
): BridgeRecord {
  const emptyDims = Object.fromEntries(
    RUBRIC_DIMS.map((d) => [d, { score: 0, evaluated: false, findingsCount: 0 }]),
  ) as Record<RubricDimension, DimensionRecord>;
  return {
    task_id: taskName,
    language,
    model: modelLabel,
    reward,
    patch_applied: false,
    binaryPass: false,
    dimensions: emptyDims,
    gaps: [{ rule: reason, file: '', line: 0, severity: 'soft', evidence: reason }],
    tokens: {
      input: agentResult?.n_input_tokens ?? null,
      output: agentResult?.n_output_tokens ?? null,
      cache: agentResult?.n_cache_tokens ?? null,
    },
    cost_usd: agentResult?.cost_usd ?? null,
  };
}

await main();
