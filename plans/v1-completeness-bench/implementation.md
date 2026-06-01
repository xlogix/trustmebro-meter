# trustmebro v1 — Measurement Engine + Gate Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Pier-independent core of trustmebro — load a task spec, analyze an agent's diff for completeness gaps, fold that with behavioral results into a binary+rubric score, and render a report — exposed as a working `trustmebro gate` command over a local working tree.

**Architecture:** A TS/Bun measurement pipeline with a domain-agnostic `core/` (model, scoring, report) and a `domains/swe-feature/` gap-detection library. Everything operates on data we own (a unified diff + per-criterion results), so it is fully testable without Pier. Gate mode = the pipeline minus the agent-driving step. The Pier-driven benchmark loop is deliberately deferred to a follow-up plan (see "Deferred").

**Tech Stack:** Bun + TypeScript (strict), `bun:test`, `smol-toml` (parse `trustmebro.toml`), `@ast-grep/napi` (structural TS analysis), `ripgrep` (`rg`, already a project-preferred tool) for cross-file reference search.

**Scope note (read before starting):** This plan delivers dimensions **behavioral_coverage**, **integration** (unwired exports), **test_honesty** (skipped/empty tests), and **stubs_left**. The **error_path** dimension is declared in the model but reported as _not-evaluated_ in v1 — it is listed under "Deferred." This is a deliberate v1 cut of design.md §6.

**Git note:** Commit steps below produce **local** commits using conventional-commit messages. Per `AGENTS.md`, pushing or opening a PR requires explicit per-operation approval — do not push as part of executing this plan. This plan assumes the scaffold has already been committed as the repo's initial commit.

---

## File Structure

| File                                                   | Responsibility                                                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `core/model/types.ts`                                  | The shared vocabulary: `TaskSpec`, `Criterion`, `CriterionResult`, `DiffFile`, `GapFinding`, `RubricDimension`, `DimensionScore`, `Score`. Pure types. |
| `core/diff.ts`                                         | `parseUnifiedDiff()` — turn a unified diff into changed files + added line numbers.                                                                    |
| `core/task-spec.ts`                                    | `loadTaskSpec()` — parse + validate `trustmebro.toml` into a `TaskSpec`.                                                                               |
| `core/scoring/coverage.ts`                             | `behavioralCoverage()` — criteria + results → the behavioral_coverage `DimensionScore`.                                                                |
| `core/scoring/score.ts`                                | `scoreCompleteness()` — fold coverage + gap findings into the final `Score` (binary + rubric).                                                         |
| `core/report/render.ts`                                | `renderMarkdown()` + `renderJson()` — turn a `Score` into reports.                                                                                     |
| `domains/swe-feature/verifiers/gaps/types.ts`          | `GapRule` interface + the rule registry.                                                                                                               |
| `domains/swe-feature/verifiers/gaps/leftover-stub.ts`  | Detect `TODO`/`FIXME`/`NotImplemented`/"not implemented" in added lines.                                                                               |
| `domains/swe-feature/verifiers/gaps/skipped-tests.ts`  | Detect `.skip`/`.only` and assertion-free tests (ast-grep).                                                                                            |
| `domains/swe-feature/verifiers/gaps/unwired-export.ts` | Detect exported symbols in changed files referenced nowhere else (ast-grep + `rg`).                                                                    |
| `domains/swe-feature/verifiers/gaps/index.ts`          | Assemble the registry of all rules.                                                                                                                    |
| `cli/gate.ts`                                          | `runGate()` — wire spec + diff + gaps + (optional) results → score → report.                                                                           |
| `cli/index.ts`                                         | Route `trustmebro gate …` to `runGate()`. (Modify existing stub.)                                                                                      |
| `tests/fixtures/**`                                    | Fixture diffs, TS sources, and a sample `trustmebro.toml`.                                                                                             |

---

## Task 0: Pier capability spike (investigation, not TDD)

**Files:**

- Create: `plans/v1-completeness-bench/pier-spike-findings.md`

This task does not block Tasks 1–11 (they are Pier-independent). It produces the input for the _next_ plan (the benchmark loop). Time-box to ~half a day.

- [ ] **Step 1: Install Pier**

Run: `uv tool install git+https://github.com/datacurve-ai/pier`
Expected: `pier --help` works.

- [ ] **Step 2: Run one DeepSWE task and capture outputs**

Run: `pier run -p deep-swe/tasks --agent mini-swe-agent --n-tasks 1 --sample-seed 0`
(Clone `github.com/datacurve-ai/deep-swe` first if the tasks path isn't bundled.)

- [ ] **Step 3: Answer these questions in the findings doc**

Write `pier-spike-findings.md` answering, with exact file paths / command output as evidence:

1. Does Pier write the agent's **resulting patch/diff** to disk? Where? In what format (unified diff? git patch?)?
2. Does Pier expose **per-test / per-criterion** results, or only one aggregate pass/fail? Where (JSON path, schema)?
3. Where does Pier put the **trajectory/transcript**, and does it include **tokens / wall-clock / cost**?
4. Can a custom verifier (`test.sh`) **emit structured JSON** that Pier preserves as an artifact? (This is the fallback if 1–2 are "no.")
5. How is the **resulting workspace directory** accessed after a run (for static analysis)?

- [ ] **Step 4: Commit**

```bash
git add plans/v1-completeness-bench/pier-spike-findings.md
git commit -m "docs: record Pier capability spike findings"
```

---

## Task 1: Dependencies + fixtures

**Files:**

- Modify: `package.json` (add deps)
- Create: `tests/fixtures/sample.trustmebro.toml`
- Create: `tests/fixtures/diffs/add-items-list.diff`

- [ ] **Step 1: Add runtime dependencies**

Run:

```bash
cd /Users/abhishek/Synergyboat/trustmebro
bun add smol-toml @ast-grep/napi
```

Expected: both appear under `dependencies` in `package.json`.

- [ ] **Step 2: Confirm `rg` is available**

Run: `rg --version`
Expected: prints a ripgrep version. (If missing, `brew install ripgrep`.)

- [ ] **Step 3: Create a sample task spec fixture**

Create `tests/fixtures/sample.trustmebro.toml`:

```toml
[meta]
provenance = "novel"
canary = "TRUSTMEBRO-FIXTURE-0001"

[[criteria]]
id = "list-renders-from-api"
description = "The list renders items fetched from GET /api/items, not a hardcoded stub."
weight = 1.0
critical = true

[[criteria]]
id = "empty-state"
description = "When the API returns [], an empty-state message shows."
weight = 0.5
critical = false

[static_gaps]
rules = ["leftover-stub", "skipped-tests", "unwired-export"]

[scoring]
dimensions = { behavioral_coverage = 0.4, integration = 0.2, error_path = 0.15, test_honesty = 0.15, stubs_left = 0.1 }
```

- [ ] **Step 4: Create a fixture unified diff**

Create `tests/fixtures/diffs/add-items-list.diff`:

```diff
diff --git a/src/ItemsList.tsx b/src/ItemsList.tsx
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/src/ItemsList.tsx
@@ -0,0 +1,5 @@
+export function ItemsList() {
+  // TODO: fetch items from /api/items
+  return null;
+}
+export const UNUSED = 1;
@@ -0,0 +0,0 @@
diff --git a/src/ItemsList.test.tsx b/src/ItemsList.test.tsx
new file mode 100644
index 0000000..2222222
--- /dev/null
+++ b/src/ItemsList.test.tsx
@@ -0,0 +1,3 @@
+it.skip('renders items', () => {
+  expect(true).toBe(true);
+});
```

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock tests/fixtures
git commit -m "chore: add toml/ast-grep deps and gate-mode test fixtures"
```

---

## Task 2: Domain model types

**Files:**

- Create: `core/model/types.ts`
- Test: `tests/core/model.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/model.test.ts`:

```ts
import { expect, test } from 'bun:test';
import type { Score } from '../../core/model/types.ts';
import { RUBRIC_DIMENSIONS } from '../../core/model/types.ts';

test('rubric dimensions are the five canonical axes', () => {
  expect(RUBRIC_DIMENSIONS).toEqual(['behavioral_coverage', 'integration', 'error_path', 'test_honesty', 'stubs_left']);
});

test('a Score is structurally well-formed', () => {
  const s: Score = {
    binaryPass: false,
    regressionGreen: true,
    dimensions: [],
    gaps: [],
  };
  expect(s.binaryPass).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/core/model.test.ts`
Expected: FAIL — cannot resolve `../../core/model/types.ts`.

- [ ] **Step 3: Write the implementation**

Create `core/model/types.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/core/model.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add core/model/types.ts tests/core/model.test.ts
git commit -m "feat(core): add completeness measurement domain model"
```

---

## Task 3: Unified-diff parser

**Files:**

- Create: `core/diff.ts`
- Test: `tests/core/diff.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/diff.test.ts`:

```ts
import { expect, test } from 'bun:test';
import { parseUnifiedDiff } from '../../core/diff.ts';

test('extracts changed files and 1-indexed added line numbers', () => {
  const diff = [
    'diff --git a/src/a.ts b/src/a.ts',
    '--- /dev/null',
    '+++ b/src/a.ts',
    '@@ -0,0 +1,3 @@',
    '+const x = 1;',
    '+const y = 2;',
    '+const z = 3;',
  ].join('\n');

  const files = parseUnifiedDiff(diff);
  expect(files).toHaveLength(1);
  expect(files[0]!.path).toBe('src/a.ts');
  expect(files[0]!.addedLines).toEqual([1, 2, 3]);
});

test('tracks new-file line numbers across context and removals', () => {
  const diff = ['+++ b/src/b.ts', '@@ -1,2 +1,3 @@', ' keep();', '-gone();', '+added();', ' tail();'].join('\n');

  const files = parseUnifiedDiff(diff);
  // new file: line 1 ' keep()', line 2 '+added()', line 3 ' tail()'
  expect(files[0]!.addedLines).toEqual([2]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/core/diff.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `core/diff.ts`:

```ts
import type { DiffFile } from './model/types.ts';

const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function parseUnifiedDiff(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  let current: DiffFile | null = null;
  let newLine = 0;

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const path = line.slice(4).replace(/^b\//, '').trim();
      if (path === '/dev/null') continue;
      current = { path, addedLines: [] };
      files.push(current);
      continue;
    }
    const hunk = HUNK.exec(line);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (!current) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) {
      current.addedLines.push(newLine);
      newLine++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      // removal: does not advance the new-file counter
    } else if (line.startsWith(' ')) {
      newLine++;
    }
  }
  return files;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/core/diff.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add core/diff.ts tests/core/diff.test.ts
git commit -m "feat(core): parse unified diffs into changed files + added lines"
```

---

## Task 4: Task-spec loader

**Files:**

- Create: `core/task-spec.ts`
- Test: `tests/core/task-spec.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/task-spec.test.ts`:

```ts
import { expect, test } from 'bun:test';
import { loadTaskSpec } from '../../core/task-spec.ts';

const toml = await Bun.file(new URL('../fixtures/sample.trustmebro.toml', import.meta.url)).text();

test('parses criteria, rules, and dimension weights', () => {
  const spec = loadTaskSpec(toml);
  expect(spec.provenance).toBe('novel');
  expect(spec.criteria.map((c) => c.id)).toEqual(['list-renders-from-api', 'empty-state']);
  expect(spec.criteria[0]!.critical).toBe(true);
  expect(spec.staticGapRules).toContain('unwired-export');
  expect(spec.dimensionWeights.behavioral_coverage).toBeCloseTo(0.4);
});

test('rejects an unknown provenance', () => {
  expect(() => loadTaskSpec('[meta]\nprovenance = "bogus"\n')).toThrow(/provenance/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/core/task-spec.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `core/task-spec.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/core/task-spec.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add core/task-spec.ts tests/core/task-spec.test.ts
git commit -m "feat(core): load and validate trustmebro.toml task specs"
```

---

## Task 5: Gap-rule interface + registry

**Files:**

- Create: `domains/swe-feature/verifiers/gaps/types.ts`
- Test: `tests/domains/gap-registry.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/domains/gap-registry.test.ts`:

```ts
import { expect, test } from 'bun:test';
import type { GapRule } from '../../domains/swe-feature/verifiers/gaps/types.ts';
import { selectRules } from '../../domains/swe-feature/verifiers/gaps/types.ts';

const fake: GapRule = {
  name: 'fake',
  dimension: 'stubs_left',
  run: () => [],
};

test('selectRules returns only the requested rules, in request order', () => {
  const registry = new Map<string, GapRule>([['fake', fake]]);
  expect(selectRules(registry, ['fake'])).toEqual([fake]);
  expect(selectRules(registry, ['missing'])).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/domains/gap-registry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `domains/swe-feature/verifiers/gaps/types.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/domains/gap-registry.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add domains/swe-feature/verifiers/gaps/types.ts tests/domains/gap-registry.test.ts
git commit -m "feat(swe): add gap-rule interface and registry selector"
```

---

## Task 6: Rule — leftover-stub

**Files:**

- Create: `domains/swe-feature/verifiers/gaps/leftover-stub.ts`
- Test: `tests/domains/leftover-stub.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/domains/leftover-stub.test.ts`:

```ts
import { expect, test } from 'bun:test';
import { leftoverStub } from '../../domains/swe-feature/verifiers/gaps/leftover-stub.ts';

test('flags TODO and not-implemented markers on ADDED lines only', async () => {
  const dir = `/tmp/tmb-stub-${Date.now()}`;
  await Bun.write(
    `${dir}/src/a.ts`,
    ['const ok = 1;', '// TODO: wire this up', 'throw new Error("not implemented");'].join('\n'),
  );

  const findings = await leftoverStub.run({
    workspaceDir: dir,
    changedFiles: [{ path: 'src/a.ts', addedLines: [2, 3] }],
  });

  expect(findings.map((f) => f.line).sort()).toEqual([2, 3]);
  expect(findings[0]!.dimension).toBe('stubs_left');
  expect(findings.every((f) => f.rule === 'leftover-stub')).toBe(true);
});

test('ignores markers on lines that were not added', async () => {
  const dir = `/tmp/tmb-stub2-${Date.now()}`;
  await Bun.write(`${dir}/src/b.ts`, ['// TODO: pre-existing', 'const x = 1;'].join('\n'));

  const findings = await leftoverStub.run({
    workspaceDir: dir,
    changedFiles: [{ path: 'src/b.ts', addedLines: [2] }],
  });
  expect(findings).toHaveLength(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/domains/leftover-stub.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `domains/swe-feature/verifiers/gaps/leftover-stub.ts`:

```ts
import type { GapFinding } from '../../../../core/model/types.ts';
import type { GapRule } from './types.ts';

const MARKERS = /\b(TODO|FIXME|HACK|XXX)\b|not implemented|NotImplementedError|unimplemented/i;

export const leftoverStub: GapRule = {
  name: 'leftover-stub',
  dimension: 'stubs_left',
  async run({ workspaceDir, changedFiles }) {
    const findings: GapFinding[] = [];
    for (const file of changedFiles) {
      const text = await Bun.file(`${workspaceDir}/${file.path}`)
        .text()
        .catch(() => '');
      if (!text) continue;
      const lines = text.split('\n');
      const added = new Set(file.addedLines);
      lines.forEach((content, idx) => {
        const lineNo = idx + 1;
        if (!added.has(lineNo)) return;
        if (MARKERS.test(content)) {
          findings.push({
            rule: 'leftover-stub',
            dimension: 'stubs_left',
            file: file.path,
            line: lineNo,
            severity: 'soft',
            evidence: content.trim(),
          });
        }
      });
    }
    return findings;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/domains/leftover-stub.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add domains/swe-feature/verifiers/gaps/leftover-stub.ts tests/domains/leftover-stub.test.ts
git commit -m "feat(swe): detect leftover stub markers on added lines"
```

---

## Task 7: Rule — skipped-tests (ast-grep)

**Files:**

- Create: `domains/swe-feature/verifiers/gaps/skipped-tests.ts`
- Test: `tests/domains/skipped-tests.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/domains/skipped-tests.test.ts`:

```ts
import { expect, test } from 'bun:test';
import { skippedTests } from '../../domains/swe-feature/verifiers/gaps/skipped-tests.ts';

test('flags .skip / .only and assertion-free tests', async () => {
  const dir = `/tmp/tmb-skip-${Date.now()}`;
  const src = [
    "it.skip('a', () => { expect(1).toBe(1); });", // line 1: skipped
    "it('b', () => { doThing(); });", // line 2: no expect -> assertion-free
    "it('c', () => { expect(2).toBe(2); });", // line 3: fine
  ].join('\n');
  await Bun.write(`${dir}/a.test.ts`, src);

  const findings = await skippedTests.run({
    workspaceDir: dir,
    changedFiles: [{ path: 'a.test.ts', addedLines: [1, 2, 3] }],
  });

  const lines = findings.map((f) => f.line).sort();
  expect(lines).toEqual([1, 2]);
  expect(findings.every((f) => f.dimension === 'test_honesty')).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/domains/skipped-tests.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `domains/swe-feature/verifiers/gaps/skipped-tests.ts`:

```ts
import { Lang, parse } from '@ast-grep/napi';
import type { GapFinding } from '../../../../core/model/types.ts';
import type { GapRule } from './types.ts';

const TEST_FNS = ['it', 'test', 'describe'];
const MODIFIERS = ['skip', 'only'];

function langFor(path: string): Lang {
  return path.endsWith('.tsx') ? Lang.Tsx : Lang.TypeScript;
}

export const skippedTests: GapRule = {
  name: 'skipped-tests',
  dimension: 'test_honesty',
  async run({ workspaceDir, changedFiles }) {
    const findings: GapFinding[] = [];
    for (const file of changedFiles) {
      if (!/\.test\.tsx?$|\.spec\.tsx?$/.test(file.path)) continue;
      const text = await Bun.file(`${workspaceDir}/${file.path}`)
        .text()
        .catch(() => '');
      if (!text) continue;
      const added = new Set(file.addedLines);
      const root = parse(langFor(file.path), text).root();

      // .skip / .only
      for (const fn of TEST_FNS) {
        for (const mod of MODIFIERS) {
          for (const m of root.findAll(`${fn}.${mod}($$$ARGS)`)) {
            const line = m.range().start.line + 1;
            if (!added.has(line)) continue;
            findings.push({
              rule: 'skipped-tests',
              dimension: 'test_honesty',
              file: file.path,
              line,
              severity: 'soft',
              evidence: `${fn}.${mod}(...) — test disabled`,
            });
          }
        }
      }

      // assertion-free test bodies: it('...', <callback>) with no expect/assert
      for (const fn of ['it', 'test']) {
        for (const m of root.findAll(`${fn}($DESC, $FN)`)) {
          const line = m.range().start.line + 1;
          if (!added.has(line)) continue;
          const body = m.getMatch('FN')?.text() ?? '';
          if (!/\bexpect\s*\(|\bassert\b/.test(body)) {
            findings.push({
              rule: 'skipped-tests',
              dimension: 'test_honesty',
              file: file.path,
              line,
              severity: 'soft',
              evidence: `${fn}(...) has no assertion`,
            });
          }
        }
      }
    }
    return findings;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/domains/skipped-tests.test.ts`
Expected: PASS (1 test). If an ast-grep pattern doesn't match, print `root.findAll(...)` results to confirm the meta-var syntax against the installed `@ast-grep/napi` version before adjusting the pattern.

- [ ] **Step 5: Commit**

```bash
git add domains/swe-feature/verifiers/gaps/skipped-tests.ts tests/domains/skipped-tests.test.ts
git commit -m "feat(swe): detect skipped and assertion-free tests"
```

---

## Task 8: Rule — unwired-export (ast-grep + ripgrep)

**Files:**

- Create: `domains/swe-feature/verifiers/gaps/unwired-export.ts`
- Test: `tests/domains/unwired-export.test.ts`

This is the headline differentiator: a symbol the agent created but nothing references — "built but not wired in." Heuristic + deterministic: an exported name from a changed non-test file that appears in **no other file** in the workspace is flagged. False positives (public entry points, dynamic usage) are expected and handled later by a per-rule ignore list in `trustmebro.toml`; v1 reports them as `soft`.

- [ ] **Step 1: Write the failing test**

Create `tests/domains/unwired-export.test.ts`:

```ts
import { expect, test } from 'bun:test';
import { unwiredExport } from '../../domains/swe-feature/verifiers/gaps/unwired-export.ts';

test('flags an exported symbol referenced nowhere else', async () => {
  const dir = `/tmp/tmb-unwired-${Date.now()}`;
  await Bun.write(
    `${dir}/src/ItemsList.tsx`,
    'export function ItemsList() { return null; }\nexport const UNUSED = 1;\n',
  );
  await Bun.write(
    `${dir}/src/App.tsx`,
    "import { ItemsList } from './ItemsList';\nexport const App = () => ItemsList();\n",
  );

  const findings = await unwiredExport.run({
    workspaceDir: dir,
    changedFiles: [{ path: 'src/ItemsList.tsx', addedLines: [1, 2] }],
  });

  // ItemsList is imported by App; UNUSED is referenced nowhere -> only UNUSED flagged.
  expect(findings).toHaveLength(1);
  expect(findings[0]!.evidence).toContain('UNUSED');
  expect(findings[0]!.dimension).toBe('integration');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/domains/unwired-export.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `domains/swe-feature/verifiers/gaps/unwired-export.ts`:

```ts
import { Lang, parse } from '@ast-grep/napi';
import type { GapFinding } from '../../../../core/model/types.ts';
import type { GapRule } from './types.ts';

function langFor(path: string): Lang {
  return path.endsWith('.tsx') ? Lang.Tsx : Lang.TypeScript;
}

interface ExportedSymbol {
  name: string;
  line: number;
}

function exportedSymbols(code: string, lang: Lang): ExportedSymbol[] {
  const root = parse(lang, code).root();
  const out: ExportedSymbol[] = [];
  const patterns = ['export function $NAME($$$P) { $$$B }', 'export const $NAME = $RHS', 'export class $NAME { $$$B }'];
  for (const p of patterns) {
    for (const m of root.findAll(p)) {
      const name = m.getMatch('NAME')?.text();
      if (name) out.push({ name, line: m.range().start.line + 1 });
    }
  }
  return out;
}

// Count files (other than the defining file) that mention the symbol as a word.
async function referencedElsewhere(workspaceDir: string, definingPath: string, name: string): Promise<boolean> {
  const proc = Bun.spawn(['rg', '--count-matches', '--glob', '!node_modules', '--word-regexp', name, workspaceDir], {
    stdout: 'pipe',
    stderr: 'ignore',
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  for (const row of out.split('\n')) {
    if (!row.trim()) continue;
    const path = row.slice(0, row.lastIndexOf(':'));
    if (!path.endsWith(`/${definingPath}`) && !path.endsWith(definingPath)) return true;
  }
  return false;
}

export const unwiredExport: GapRule = {
  name: 'unwired-export',
  dimension: 'integration',
  async run({ workspaceDir, changedFiles }) {
    const findings: GapFinding[] = [];
    for (const file of changedFiles) {
      if (/\.test\.tsx?$|\.spec\.tsx?$/.test(file.path)) continue;
      if (!/\.tsx?$/.test(file.path)) continue;
      const code = await Bun.file(`${workspaceDir}/${file.path}`)
        .text()
        .catch(() => '');
      if (!code) continue;
      const added = new Set(file.addedLines);
      for (const sym of exportedSymbols(code, langFor(file.path))) {
        if (!added.has(sym.line)) continue;
        if (await referencedElsewhere(workspaceDir, file.path, sym.name)) continue;
        findings.push({
          rule: 'unwired-export',
          dimension: 'integration',
          file: file.path,
          line: sym.line,
          severity: 'soft',
          evidence: `export "${sym.name}" is referenced nowhere else in the workspace`,
        });
      }
    }
    return findings;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/domains/unwired-export.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add domains/swe-feature/verifiers/gaps/unwired-export.ts tests/domains/unwired-export.test.ts
git commit -m "feat(swe): detect exported symbols that are wired in nowhere"
```

---

## Task 9: Rule registry assembly

**Files:**

- Create: `domains/swe-feature/verifiers/gaps/index.ts`
- Test: `tests/domains/registry-assembly.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/domains/registry-assembly.test.ts`:

```ts
import { expect, test } from 'bun:test';
import { gapRegistry } from '../../domains/swe-feature/verifiers/gaps/index.ts';

test('registry exposes all v1 rules by name', () => {
  expect([...gapRegistry.keys()].sort()).toEqual(['leftover-stub', 'skipped-tests', 'unwired-export']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/domains/registry-assembly.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `domains/swe-feature/verifiers/gaps/index.ts`:

```ts
import { leftoverStub } from './leftover-stub.ts';
import { skippedTests } from './skipped-tests.ts';
import type { GapRule } from './types.ts';
import { unwiredExport } from './unwired-export.ts';

export const gapRegistry: Map<string, GapRule> = new Map(
  [leftoverStub, skippedTests, unwiredExport].map((r) => [r.name, r]),
);

export { selectRules } from './types.ts';
export type { GapRule, GapRuleContext } from './types.ts';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/domains/registry-assembly.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add domains/swe-feature/verifiers/gaps/index.ts tests/domains/registry-assembly.test.ts
git commit -m "feat(swe): assemble the v1 gap-rule registry"
```

---

## Task 10: Behavioral coverage

**Files:**

- Create: `core/scoring/coverage.ts`
- Test: `tests/core/coverage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/coverage.test.ts`:

```ts
import { expect, test } from 'bun:test';
import { behavioralCoverage } from '../../core/scoring/coverage.ts';
import type { Criterion } from '../../core/model/types.ts';

const criteria: Criterion[] = [
  { id: 'a', description: 'A', weight: 1, critical: true },
  { id: 'b', description: 'B', weight: 0.5, critical: false },
];

test('weighted fraction of passing criteria', () => {
  const dim = behavioralCoverage(criteria, [
    { id: 'a', passed: true },
    { id: 'b', passed: false },
  ]);
  expect(dim.dimension).toBe('behavioral_coverage');
  expect(dim.evaluated).toBe(true);
  expect(dim.score).toBeCloseTo(1 / 1.5); // 0.667
});

test('missing results count as not passed', () => {
  const dim = behavioralCoverage(criteria, []);
  expect(dim.score).toBe(0);
});

test('no criteria => not evaluated', () => {
  const dim = behavioralCoverage([], []);
  expect(dim.evaluated).toBe(false);
  expect(dim.score).toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/core/coverage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `core/scoring/coverage.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/core/coverage.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add core/scoring/coverage.ts tests/core/coverage.test.ts
git commit -m "feat(core): compute weighted behavioral coverage"
```

---

## Task 11: Scorer

**Files:**

- Create: `core/scoring/score.ts`
- Test: `tests/core/score.test.ts`

The scorer folds the behavioral dimension + gap findings into a `Score`. Per-static-dimension score = `1 - min(1, findingsCount / penaltyCap)` (penaltyCap = 3: three findings zero the dimension). A static dimension with no applicable rule is `evaluated: false`. Binary pass = all critical criteria pass **and** `regressionGreen` **and** no `hard`-severity gap.

- [ ] **Step 1: Write the failing test**

Create `tests/core/score.test.ts`:

```ts
import { expect, test } from 'bun:test';
import { scoreCompleteness } from '../../core/scoring/score.ts';
import type { Criterion, GapFinding } from '../../core/model/types.ts';

const criteria: Criterion[] = [{ id: 'a', description: 'A', weight: 1, critical: true }];

test('binary pass requires critical criteria + regression + no hard gaps', () => {
  const score = scoreCompleteness({
    criteria,
    results: [{ id: 'a', passed: true }],
    regressionGreen: true,
    appliedRules: [{ name: 'leftover-stub', dimension: 'stubs_left' }],
    gaps: [],
  });
  expect(score.binaryPass).toBe(true);
});

test('a failing critical criterion fails the binary verdict but still scores rubric', () => {
  const gaps: GapFinding[] = [
    { rule: 'leftover-stub', dimension: 'stubs_left', file: 'a.ts', line: 2, severity: 'soft', evidence: 'TODO' },
  ];
  const score = scoreCompleteness({
    criteria,
    results: [{ id: 'a', passed: false }],
    regressionGreen: true,
    appliedRules: [{ name: 'leftover-stub', dimension: 'stubs_left' }],
    gaps,
  });
  expect(score.binaryPass).toBe(false);
  const stubs = score.dimensions.find((d) => d.dimension === 'stubs_left')!;
  expect(stubs.evaluated).toBe(true);
  expect(stubs.score).toBeCloseTo(1 - 1 / 3);
  expect(stubs.findings).toHaveLength(1);
});

test('error_path is reported as not-evaluated in v1', () => {
  const score = scoreCompleteness({
    criteria,
    results: [{ id: 'a', passed: true }],
    regressionGreen: true,
    appliedRules: [],
    gaps: [],
  });
  expect(score.dimensions.find((d) => d.dimension === 'error_path')!.evaluated).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/core/score.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `core/scoring/score.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/core/score.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add core/scoring/score.ts tests/core/score.test.ts
git commit -m "feat(core): fold coverage + gaps into binary+rubric score"
```

---

## Task 12: Report renderer

**Files:**

- Create: `core/report/render.ts`
- Test: `tests/core/render.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/render.test.ts`:

```ts
import { expect, test } from 'bun:test';
import { renderJson, renderMarkdown } from '../../core/report/render.ts';
import type { Score } from '../../core/model/types.ts';

const score: Score = {
  binaryPass: false,
  regressionGreen: true,
  dimensions: [
    { dimension: 'behavioral_coverage', evaluated: true, score: 0.5, findings: [] },
    {
      dimension: 'stubs_left',
      evaluated: true,
      score: 0.66,
      findings: [
        {
          rule: 'leftover-stub',
          dimension: 'stubs_left',
          file: 'a.ts',
          line: 2,
          severity: 'soft',
          evidence: 'TODO: x',
        },
      ],
    },
  ],
  gaps: [
    { rule: 'leftover-stub', dimension: 'stubs_left', file: 'a.ts', line: 2, severity: 'soft', evidence: 'TODO: x' },
  ],
};

test('markdown shows the verdict, each dimension, and findings with file:line', () => {
  const md = renderMarkdown(score);
  expect(md).toContain('INCOMPLETE');
  expect(md).toContain('behavioral_coverage');
  expect(md).toContain('a.ts:2');
  expect(md).toContain('TODO: x');
});

test('json round-trips the score', () => {
  expect(JSON.parse(renderJson(score)).binaryPass).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/core/render.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `core/report/render.ts`:

```ts
import type { DimensionScore, Score } from '../model/types.ts';

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function dimensionLine(d: DimensionScore): string {
  const value = d.evaluated ? pct(d.score) : 'n/a (not evaluated in v1)';
  return `- **${d.dimension}**: ${value}`;
}

export function renderMarkdown(score: Score): string {
  const verdict = score.binaryPass ? '✅ COMPLETE' : '❌ INCOMPLETE';
  const lines: string[] = [
    `# trustmebro completeness report`,
    ``,
    `**Verdict:** ${verdict}  (regression: ${score.regressionGreen ? 'green' : 'red'})`,
    ``,
    `## Rubric`,
    ...score.dimensions.map(dimensionLine),
  ];
  if (score.gaps.length > 0) {
    lines.push(``, `## Gaps (${score.gaps.length})`);
    for (const g of score.gaps) {
      lines.push(`- \`${g.file}:${g.line}\` [${g.rule}/${g.severity}] — ${g.evidence}`);
    }
  }
  return lines.join('\n') + '\n';
}

export function renderJson(score: Score): string {
  return JSON.stringify(score, null, 2);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/core/render.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add core/report/render.ts tests/core/render.test.ts
git commit -m "feat(core): render completeness reports (markdown + json)"
```

---

## Task 13: Gate command — wire the pipeline

**Files:**

- Create: `cli/gate.ts`
- Modify: `cli/index.ts`
- Test: `tests/cli/gate.test.ts`

`trustmebro gate <workdir>` reads `<workdir>/trustmebro.toml`, computes the diff of `<workdir>` against its git HEAD (or accepts `--diff <file>`), runs the spec's static gap rules, optionally ingests `--results <file>` (a JSON `CriterionResult[]`), scores, and prints the markdown report. No Pier, no agent.

- [ ] **Step 1: Write the failing test**

Create `tests/cli/gate.test.ts`:

```ts
import { expect, test } from 'bun:test';
import { runGate } from '../../cli/gate.ts';

test('gate produces a report flagging stub + skipped + unwired on the fixture', async () => {
  const dir = `/tmp/tmb-gate-${Date.now()}`;
  await Bun.write(
    `${dir}/trustmebro.toml`,
    await Bun.file(new URL('../fixtures/sample.trustmebro.toml', import.meta.url)).text(),
  );
  await Bun.write(
    `${dir}/src/ItemsList.tsx`,
    'export function ItemsList() {\n  // TODO: fetch from /api/items\n  return null;\n}\nexport const UNUSED = 1;\n',
  );
  await Bun.write(`${dir}/src/ItemsList.test.tsx`, "it.skip('renders', () => { expect(true).toBe(true); });\n");

  const diff = await Bun.file(new URL('../fixtures/diffs/add-items-list.diff', import.meta.url)).text();
  const { score, markdown } = await runGate({
    workdir: dir,
    diffText: diff,
    results: [{ id: 'list-renders-from-api', passed: false }],
  });

  expect(score.binaryPass).toBe(false); // critical criterion failed
  expect(markdown).toContain('INCOMPLETE');
  // each rule fired at least once
  expect(score.gaps.some((g) => g.rule === 'leftover-stub')).toBe(true);
  expect(score.gaps.some((g) => g.rule === 'skipped-tests')).toBe(true);
  expect(score.gaps.some((g) => g.rule === 'unwired-export')).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/cli/gate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `cli/gate.ts`**

```ts
import { parseUnifiedDiff } from '../core/diff.ts';
import type { CriterionResult, Score } from '../core/model/types.ts';
import { scoreCompleteness, type AppliedRule } from '../core/scoring/score.ts';
import { renderMarkdown } from '../core/report/render.ts';
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
```

- [ ] **Step 4: Wire it into `cli/index.ts`**

Replace the body of `cli/index.ts` with a version that routes `gate`:

```ts
#!/usr/bin/env bun
import { runGate } from './gate.ts';
import type { CriterionResult } from '../core/model/types.ts';

const USAGE = `trustmebro — measure whether agent-built features are actually finished

Usage:
  trustmebro gate <workdir> [--diff <file>] [--results <file>]   Score an existing working tree
  trustmebro run <task>                                          (deferred to the Pier-loop plan)

See plans/v1-completeness-bench/design.md for the design.`;

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function gate(argv: string[]): Promise<number> {
  const workdir = argv[0];
  if (!workdir) {
    console.error('gate: missing <workdir>');
    return 1;
  }
  const diffPath = flag(argv, '--diff');
  const diffText = diffPath
    ? await Bun.file(diffPath).text()
    : await new Response(Bun.spawn(['git', '-C', workdir, 'diff', 'HEAD'], { stdout: 'pipe' }).stdout).text();

  const resultsPath = flag(argv, '--results');
  const results: CriterionResult[] = resultsPath ? JSON.parse(await Bun.file(resultsPath).text()) : [];

  const { score, markdown } = await runGate({ workdir, diffText, results });
  console.log(markdown);
  return score.binaryPass ? 0 : 2; // non-zero so CI can gate on it
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h') {
    console.log(USAGE);
    return command ? 0 : 1;
  }
  if (command === 'gate') return gate(rest);
  console.error(`trustmebro: "${command}" is not implemented yet. See plans/v1-completeness-bench/design.md.`);
  return 1;
}

process.exit(await main(process.argv.slice(2)));
```

- [ ] **Step 5: Run the gate test + the full suite + typecheck/lint**

Run:

```bash
bun test tests/cli/gate.test.ts
bun test
bun run typecheck && bun run lint && bun run format:check
```

Expected: all PASS / exit 0.

- [ ] **Step 6: Commit**

```bash
git add cli/gate.ts cli/index.ts tests/cli/gate.test.ts
git commit -m "feat(cli): add gate mode wiring spec+diff+gaps into a completeness report"
```

---

## Self-Review (run after all tasks)

- [ ] **Spec coverage:** design.md §4 architecture (core/domains split) → Tasks 2–13. §5 task contract → Task 4. §6 scoring (binary + rubric) → Tasks 10–11. §7 detection (behavioral + static, no LLM) → Tasks 6–8, 10. Gate mode (§4) → Task 13. Pier spike (§8 step 1) → Task 0. **Gap (intentional):** `error_path` dimension + the Pier benchmark loop are deferred — see below.
- [ ] **Placeholder scan:** no `TBD`/`TODO` in plan steps; every code step has complete code.
- [ ] **Type consistency:** `GapFinding`, `DimensionScore`, `Score`, `CriterionResult`, `Criterion`, `TaskSpec` used identically across Tasks 2–13; `behavioralCoverage`/`allCriticalPass`/`scoreCompleteness`/`runGate` signatures match their call sites.

---

## Deferred (explicitly out of this plan)

1. **Pier benchmark loop** — the `pier/` adapter that drives a real agent in a sandbox and feeds the diff + per-criterion results into this pipeline. Blocked on Task 0's findings; gets its own plan once we know Pier's output format.
2. **`error_path` rule** — detecting stubbed/empty error branches. Declared in the model, reported as not-evaluated in v1.
3. **Go + Python static rules** — v1 is TypeScript-only.
4. **Per-rule ignore/allow-list** in `trustmebro.toml\*\* (to suppress unwired-export false positives for known entry points).
5. **Aggregation / leaderboard** across many runs.
6. **`run` / `score` / `report` CLI subcommands** beyond `gate`.

## v1 Done = Demo

`trustmebro gate <a-local-repo-with-a-trustmebro.toml>` prints a completeness report
that catches at least one real incompleteness (an unwired export, a skipped test, a
leftover stub) which a binary pass/fail benchmark would score as "pass." That is the
proof the core idea works — achieved without Pier.
