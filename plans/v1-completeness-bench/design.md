# trustmebro — Design (v1: feature-completeness bench + gate)

Status: **Draft for review** · Date: 2026-06-01 · Owner: Abhishek

---

## 1. Problem

Coding agents routinely declare a feature _done_ when it merely _looks_ done. The
component renders but isn't wired to the endpoint; the endpoint exists but nothing
calls it; the error branch is a stub; a migration was written but never run; a test
is green because it asserts nothing; a `TODO: implement` was left behind. The agent
"assumes it is working but it actually doesn't."

Existing benchmarks cannot see this. They score a task as a flat **pass/fail**, so a
half-finished feature and a never-started one both read as "fail," and a feature that
passes a weak test reads as "done" even if it's hollow. **trustmebro measures the gap
between _looks done_ and _is done_.**

## 2. Goal

A reusable evaluation **machine** that, given a feature-build task and an agent's
attempt, measures **how finished the result is** — and that works in two modes:

- **Benchmark** — run a corpus across many models × harnesses → a _completeness_
  leaderboard.
- **Gate** — score a single agent-produced change → a per-change completeness report
  enumerating the specific unfinished pieces.

The engine is the durable product; the corpus is swappable data fed into it.

## 3. Prior art & differentiation

|                          | DeepSWE (Datacurve)   | FeatureBench (ICLR 2026)                  | **trustmebro**                    |
| ------------------------ | --------------------- | ----------------------------------------- | --------------------------------- |
| Unit                     | novel feature task    | feature task w/ explicit signatures       | feature task (terse, behavioral)  |
| Verdict                  | **binary pass/fail**  | **binary** + "Passed Rate" (F2P fraction) | **binary + multi-dim rubric**     |
| LLM judge                | no (execution)        | no (execution)                            | **no (execution + static)**       |
| Static gap-detection     | **none (deliberate)** | **none**                                  | **core feature**                  |
| Completeness as a metric | no                    | partial (test fraction only)              | **yes (the point)**               |
| Per-change gate          | no (offline)          | no (offline)                              | **yes**                           |
| Prompt style             | terse, behavioral     | overspecified (signatures, imports)       | terse, behavioral (DeepSWE-style) |

**Verified against primary sources** (datacurve.ai blog + `arxiv 2602.10975`):

- DeepSWE: _"the score reflects whether the agent solved the task"_ — strictly binary;
  _"accepts any solution that implements the requested behavior, regardless of code
  structure, unused helpers"_ — **no static analysis at all.**
- FeatureBench: binary "Resolved Rate" + soft "Passed Rate" (fraction of fail-to-pass
  tests); **zero static analysis**; offline only.

**What is genuinely ours:** deterministic static gap-detection, the multi-dimensional
completeness rubric, and the per-change gate. **What has prior art:** behavioral
coverage as a fraction (FeatureBench's "Passed Rate"). The combination is novel.

**What the landscape validates about our choices:** both nearest benches refuse the
LLM judge and score by execution, and the literature calls LLM-as-judge partial credit
_"the single largest source of noise in published numbers."_ Our execution + static,
no-LLM-judge stance is the emerging best practice, not a quirk.

## 4. Architecture

A thin **measurement** layer on top of **Pier** (Datacurve's open-source,
Harbor-compatible, sandboxed eval runner). **Pier owns execution; trustmebro owns
measurement.**

```
trustmebro/
├── core/                # domain-agnostic engine — the durable product
│   ├── model/           # Task, Run, Artifact, CriterionResult, GapFinding, Score
│   ├── ports/           # Domain, HarnessAdapter, Verifier, Scorer interfaces
│   ├── run/             # load task → invoke harness → collect artifacts → verify → score
│   ├── scoring/         # binary-pass + multi-dim rubric scorer
│   ├── aggregate/       # model×harness rollups + leaderboard
│   └── report/          # markdown + JSON reports
├── pier/                # HarnessAdapter impl: drives `pier run`, parses diff + per-criterion results + trajectory
├── domains/swe-feature/ # Domain #1: static gap-detection lib + behavioral runner + rubric dimensions
├── corpus/<task-id>/    # Harbor task + trustmebro.toml extension (swappable data)
└── cli/                 # run · score · report · gate
```

**Invariant:** `core/` depends only on `core/`. `domains/*`, `pier/`, and `cli/`
depend on `core/ports`, never the reverse. This keeps **domain** a pluggable axis: a
future `domains/agentic/` (computer-use / multi-step tool workflows) slots in beside
`swe-feature/` without touching the engine. SWE-feature-completeness is **domain #1**,
not the whole thing.

**Pipeline (benchmark mode):**

```
task ──> pier/ (pier run --agent <h> --model <m> --env modal) ──> artifacts (diff, per-criterion results, trajectory, tokens, cost, wall-clock)
                                                                      │
                                          ┌───────────────────────────┴───────────────────────────┐
                              behavioral coverage (from per-criterion results)         static gap-detection (over the diff)
                                          └───────────────────────────┬───────────────────────────┘
                                                                   scorer ──> Score (binary + rubric) ──> report / aggregate
```

**Gate mode** = the same pipeline with the Pier/agent step skipped: point at an
existing working tree + a `trustmebro.toml`, run behavioral checks + static
gap-detection, emit the completeness report. Same verifiers, same scorer, no harness.

## 5. The task contract (engine ↔ corpus seam)

A standard **Harbor** task (so Pier can run it unmodified) **plus** one trustmebro
extension file:

```
corpus/<task-id>/
├── task.toml          # Harbor: repo, base commit, language, prebuilt image, resource limits
├── instruction.md     # the short, behavior-focused prompt (DeepSWE style)
├── environment/       # Harbor: Dockerfile fallback
├── tests/             # Harbor: test.sh + test.patch — behavioral checks asserting via public APIs
├── solution/          # Harbor: reference solution, withheld from the agent
└── trustmebro.toml    # OURS
```

`trustmebro.toml` (illustrative shape — finalized during implementation):

```toml
[meta]
provenance = "novel"         # novel | oss-derived | harvested-failure
canary = "TRUSTMEBRO-<guid>" # contamination tripwire

[[criteria]] # graded behavioral coverage
id = "list-renders-from-api"
description = "The list view renders items fetched from GET /api/items, not a hardcoded stub."
weight = 1.0
critical = true                                                                                # must pass for a binary PASS

[[criteria]]
id = "empty-state"
description = "When the API returns [], an empty-state message shows instead of a spinner."
weight = 0.5
critical = false

[static_gaps] # which deterministic checks apply
rules = ["unwired-component", "endpoint-never-called", "skipped-or-empty-tests", "leftover-stub", "dead-error-path"]

[scoring]
binary_pass = "all_critical_criteria_pass AND regression_green AND no_hard_cap_gaps"
dimensions = { behavioral_coverage = 0.4, integration = 0.2, error_path = 0.15, test_honesty = 0.15, stubs_left = 0.1 }
```

The behavioral test code lives in `tests/` (extends the repo's existing test infra and
asserts through public APIs — DeepSWE's discipline) but is structured so each
criterion yields an **independent** pass/fail we can parse, rather than one verdict.

## 6. Scoring model

Two outputs per task — **binary** and **rubric** — as decided.

**Binary pass** — the headline "did it actually land" verdict: all `critical` criteria
pass **and** repo regression tests stay green **and** no hard-cap static gap is present
(e.g. a `NotImplemented` left in a changed feature file).

**Rubric** — each dimension scored `0..1` with attached evidence:

| Dimension                | Mechanism                 | What it catches                                                                                 |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------- |
| **Behavioral coverage**  | execution (per-criterion) | weighted fraction of acceptance criteria that run green                                         |
| **Integration / wiring** | static                    | endpoint defined but never called; component exported but never imported/rendered               |
| **Error-path handling**  | static                    | error branches stubbed/empty; only the happy path implemented                                   |
| **Test honesty**         | static                    | `.skip`/`.only`, empty test bodies, tests that assert nothing                                   |
| **Stubs left**           | static                    | `TODO`/`FIXME`/`NotImplementedError`/`throw "not implemented"`/`panic("todo")` in changed files |

Static dimensions run over the agent's resulting diff+workspace using **ast-grep /
tree-sitter** — structural, deterministic, **no LLM**. Behavioral coverage runs via
Pier's execution.

## 7. Detection mechanics

- **Behavioral (execution).** Per-criterion checks run inside Pier's sandbox against
  the agent's result. Assert through public APIs / observable outputs only — never
  private helpers — so any reasonable implementation is accepted.
- **Static gap-detection (deterministic).** Analyze the agent's diff against the base
  commit. Scope checks to changed/added files plus their immediate references. Each
  rule is an `ast-grep` pattern (or small tree-sitter query) per language emitting
  structured `GapFinding`s (rule, file, line, severity, evidence). v1 ships
  **TypeScript checks only**; Go and Python are fan-out work.

## 8. v1 scope (thin vertical slice)

Prove the whole loop on the narrowest path, then fan out.

1. **Spike (de-risk first):** confirm Pier surfaces (a) the agent's resulting
   patch/workspace and (b) per-criterion results — not just one binary verdict. If
   not, fall back to having `test.sh` emit the patch + structured per-criterion output
   as artifacts we collect.
2. **One TypeScript task** with a `trustmebro.toml` (3–5 criteria + a few gap rules).
3. **Pier adapter** driving **mini-swe + one model**.
4. **Static gap-detection: TypeScript only** (ast-grep).
5. **Scorer** (binary + rubric) + **single-task report** (markdown + JSON).

**Then fan out (each independent):** Go/Python gap-checks → more harness adapters
(free via Pier: Claude Code, Codex, Gemini CLI, opencode) → more tasks → aggregation
/ leaderboard → gate mode polish.

**Explicitly OUT of v1 (YAGNI):** the agentic domain, a leaderboard UI, Go/Python
static checks, a large corpus, public hosting.

## 9. Risks & open questions

- **Pier integration risk (highest).** The whole "build on Pier" bet assumes Pier
  exposes the diff and per-criterion results. Mitigated by making the spike step 1.
- **Pier maturity.** Pier is new (May 2026). If it proves unstable, the fallback is to
  use the Harbor task format + Modal directly and replace only the runner. The task
  contract (§5) is designed to survive that swap.
- **Per-language static labor.** Going polyglot means hand-writing gap-detection per
  language; v1 deliberately limits this to TypeScript.
- **Static-check false positives.** Deterministic checks can misfire (e.g. a component
  wired via a registry/string lookup looks "unwired"). Each rule needs an allow/ignore
  escape hatch in `trustmebro.toml`, and findings carry evidence so they're auditable.
- **Behavioral-coverage overlap.** This one dimension overlaps FeatureBench's "Passed
  Rate"; the differentiation rests on the static dimensions + gate. Acceptable.
- **Python/uv dependency.** Documented deviation from the pure TS/Bun house style; the
  boundary is contained in `pier/`.

## 10. Success criteria for v1

- A single TS task runs end-to-end through Pier and produces a `Score` with a binary
  verdict **and** all five rubric dimensions populated with evidence.
- At least one rubric dimension demonstrably catches a real incompleteness that a
  binary pass/fail bench would score as "pass" (the proof the idea works).
- The same scorer runs in gate mode against a local working tree with no harness.
