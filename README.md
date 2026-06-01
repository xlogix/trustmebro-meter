# trustmebro

> _"It works, trust me bro."_ — every coding agent, right before it doesn't.

**trustmebro** measures whether agent-built features are **actually finished
end-to-end** — not just whether they pass a test.

Coding agents routinely declare a feature done when it merely _looks_ done: the
component renders but isn't wired to the endpoint, the endpoint exists but is never
called, the tests are green because they assert nothing, a migration was written but
never run, a `TODO: implement` was left behind. Existing benchmarks score this as a
flat pass or fail and miss the gap entirely. trustmebro measures the gap.

## What it does

- **Benchmark mode** — run a corpus of feature-build tasks across many models ×
  harnesses and produce a _completeness_ leaderboard.
- **Gate mode** — point it at a single agent-produced change and get a completeness
  report with the specific unfinished pieces enumerated.

It measures completeness two ways at once, both **without an LLM judge**:

1. **Graded behavioral coverage** — the fraction of a task's acceptance criteria that
   actually execute green (via real sandboxed execution).
2. **Deterministic static gap-detection** — `ast-grep`/tree-sitter analysis of the
   agent's diff for unwired code, skipped/empty tests, dead error paths, and leftover
   stubs.

Output: a **binary** "did it land" verdict **plus** a **multi-dimensional rubric**
(behavioral coverage · integration/wiring · error-path · test honesty · stubs left).

## How it's built

trustmebro is a thin **measurement** layer (TypeScript/Bun) on top of
[**Pier**](https://github.com/datacurve-ai/pier), Datacurve's open-source
Harbor-compatible eval runner — the substrate behind the
[DeepSWE](https://deepswe.datacurve.ai/) benchmark. Pier handles the hard parts
(sandboxing, harness adapters for mini-swe / Claude Code / Codex / Gemini CLI / opencode,
Modal isolation, network allowlists); trustmebro adds the completeness measurement
that Pier and DeepSWE deliberately leave out.

## Status

Early. See [`plans/v1-completeness-bench/design.md`](plans/v1-completeness-bench/design.md)
for the design and the v1 scope. A personal side project.

## Quick start

```bash
bun install
uv tool install git+https://github.com/datacurve-ai/pier
bun run trustmebro --help
```
