# Agent Guidelines — trustmebro

This document provides everything an AI agent needs to work effectively in this
codebase. Read it first.

---

## Project Overview

**trustmebro** is a benchmark _machine_ that measures whether agent-built features
are **actually finished end-to-end** — not just whether they pass a test. It exists
because coding agents routinely declare victory on a feature that looks done (the
component renders, the endpoint exists, the tests are green) while the UI isn't
wired to the endpoint, the error path is a stub, a migration was never run, or a
`TODO` was left behind.

It is two things at once:

1. **A benchmark** — run a corpus of feature-build tasks across many models ×
   harnesses and produce a _completeness_ leaderboard.
2. **A gate** — point it at a single agent-produced change and get a per-change
   completeness report with the specific gaps enumerated.

### What makes it different

The closest benchmarks — **DeepSWE** (Datacurve) and **FeatureBench** (ICLR 2026) —
both score **binary pass/fail by execution** and do **zero static analysis** of the
result. trustmebro adds the axis they ignore:

- **graded, multi-dimensional completeness** (binary verdict _and_ a rubric), and
- **deterministic static gap-detection** (stubs, unwired code, skipped tests, dead
  error paths) with **no LLM judge** — the literature flags LLM-as-judge partial
  credit as the single largest source of benchmark noise.

See [plans/v1-completeness-bench/design.md](plans/v1-completeness-bench/design.md)
for the authoritative design, prior-art comparison, and v1 scope.

---

## Architecture

trustmebro is a thin **measurement** layer on top of
[Pier](https://github.com/datacurve-ai/pier) (Datacurve's open-source Harbor-compatible
eval runner). **Pier owns execution** — sandboxing, harness adapters, Modal
isolation, network allowlists. **trustmebro owns measurement** — graded behavioral
coverage, static gap-detection, the binary+rubric scorer, reporting, and gate mode.

```
trustmebro/
├── core/                # domain-agnostic engine (orchestration, model, scoring, reporting)
├── pier/                # adapter: drives `pier run`, parses diff + per-criterion results + trajectory
├── domains/swe-feature/ # domain #1: static gap-detection lib + behavioral runner + rubric
├── corpus/<task-id>/    # Harbor task + our trustmebro.toml extension (swappable data)
└── cli/                 # run · score · report · gate
```

Each folder has a `README.md` explaining what lives there and the dependency
direction. **`core/` never imports from `domains/`, `pier/`, or `cli/`** — plugins
depend on `core`, never the reverse. A future `domains/agentic/` slots in beside
`swe-feature/` without touching `core`.

---

## Stack & Tooling

| Concern                   | Choice                                                              |
| ------------------------- | ------------------------------------------------------------------- |
| Engine language / runtime | TypeScript on **Bun**                                               |
| Execution substrate       | **Pier** (Python, installed via `uv`) — shelled out to from `pier/` |
| Static analysis           | `ast-grep` / tree-sitter (per-language; TS first)                   |
| Lint                      | `eslint.config.mjs` (flat config)                                   |
| Format                    | Prettier (`.prettierrc`)                                            |
| Hooks                     | Husky — pre-commit `lint-staged`, pre-push `typecheck`              |
| Node (for tooling)        | v24 (`.nvmrc`)                                                      |

### The one deliberate deviation

Unlike Draftly (pure TS/Bun + pnpm), trustmebro depends on a **Python/`uv`** tool
(Pier) for execution. This was a deliberate "leverage existing infra" decision —
Datacurve already built and battle-tested the sandbox/harness substrate, and
rebuilding it in TS would be weeks of plumbing before touching the actual idea. The
boundary is contained entirely within `pier/`; the rest of the codebase is TS/Bun.

---

## Quick Start

```bash
bun install                                                  # JS deps
uv tool install git+https://github.com/datacurve-ai/pier     # execution substrate
bun run typecheck && bun run lint                            # validate
bun run trustmebro --help                                    # CLI (subcommands are WIP)
```

## Common Commands

| Task      | Command                    |
| --------- | -------------------------- |
| Typecheck | `bun run typecheck`        |
| Lint      | `bun run lint`             |
| Lint fix  | `bun run lint:fix`         |
| Format    | `bun run format`           |
| Test      | `bun test`                 |
| CLI       | `bun run trustmebro <cmd>` |

---

## Preferred CLI Tools

Prefer built-in Grep/Glob over shelling out. When you must shell out, use `rg` (not
`grep -R`), `fd` (not `find`), `jq` (not `python -c` for JSON), and `ast-grep` for
structural code patterns where regex is brittle — `ast-grep` is also the engine
behind our static gap-detection, so it is a first-class dependency here.

---

## Code Conventions

### TypeScript

- Strict mode everywhere (`tsconfig.base.json`); additionally
  `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.
- Bun resolves `.ts` extensions in imports (`allowImportingTsExtensions`).
- Path aliases: `@core/*`, `@domains/*`, `@pier/*` (see `tsconfig.json`).

### Comments

Comments explain what the code can't — not the diff that produced it. Write one when
the WHY is non-obvious (hidden constraint, trade-off, vendor quirk, workaround) or an
invariant isn't visible from the types. Don't narrate changes, attribute authorship,
restate the code, or apologize. Intentionally surprising code (an empty `catch`, a
`void`-ed promise) gets a load-bearing comment.

### Git

- Branch from `main`.
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `ci:`.
- Do **not** use `--no-verify` to skip hooks — fix the issue instead.
- **No automated git actions.** Never commit, push, or open a PR without explicit
  per-operation approval from the maintainer.

---

## Plans & Specs

Design + implementation docs live in `plans/<feature>/` (`design.md` +
`implementation.md`) — never in `docs/specs/`.

---

## Folder READMEs

`core/`, `pier/`, `domains/swe-feature/`, and `corpus/` each carry a `README.md`
that explains what lives there and why. **When adding, moving, or removing a file in
any folder that has a README, update the README in the same commit.** Skipping this
turns the README into a lie within ~5 changes.

---

## Glossary

| Term                     | Meaning                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Pier**                 | Datacurve's open-source sandboxed eval runner (the execution substrate).                                                                 |
| **Harbor**               | The task format Pier consumes (`task.toml`, `tests/`, `solution/`, …).                                                                   |
| **DeepSWE**              | Datacurve's binary pass/fail behavioral coding benchmark (the inspiration; _not_ the older Agentica/Together RL model of the same name). |
| **Behavioral coverage**  | Fraction of a task's acceptance criteria that execute green.                                                                             |
| **Static gap-detection** | Deterministic, no-LLM analysis of the agent's diff for structural incompleteness.                                                        |
| **Gate mode**            | Scoring one existing working tree (skip the agent-driving step).                                                                         |
