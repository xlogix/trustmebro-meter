# Claude Code — trustmebro

All project context, conventions, architecture, and agent guidelines are in
[AGENTS.md](AGENTS.md). Read that file first.

## Quick Reference

- **What:** trustmebro — a benchmark machine that measures whether agent-built
  features are _actually finished end-to-end_, not just whether they pass a test.
- **Two modes:** benchmark (model×harness completeness leaderboard) + gate
  (per-change completeness report).
- **Differentiator:** graded binary+rubric completeness **and** deterministic static
  gap-detection (stubs, unwired code, skipped tests, dead error paths), **no LLM judge**.
- **Architecture:** a TS/Bun _measurement_ layer on top of **Pier** (Python/`uv`,
  the open-source DeepSWE execution substrate). Pier runs; trustmebro measures.

## Before You Start

1. `bun install` and `uv tool install git+https://github.com/datacurve-ai/pier` if deps are stale
2. Use `bun run typecheck` and `bun run lint` to validate changes
3. Follow conventional commits (`feat:`, `fix:`, `chore:`, etc.); never `--no-verify`
4. No automated git actions — each commit/push/PR needs explicit approval

## Key Files

| What                                | Where                                   |
| ----------------------------------- | --------------------------------------- |
| Design / spec                       | `plans/v1-completeness-bench/design.md` |
| Engine (domain-agnostic)            | `core/`                                 |
| Pier adapter                        | `pier/`                                 |
| SWE domain (gap-detection + rubric) | `domains/swe-feature/`                  |
| Corpus (tasks)                      | `corpus/<task-id>/`                     |
| CLI                                 | `cli/index.ts`                          |
