# `pier/` — the execution substrate adapter

trustmebro does not reimplement sandboxing, harness integration, or the task
format. It builds on [Pier](https://github.com/datacurve-ai/pier), Datacurve's
open-source Harbor-compatible eval runner (the substrate behind the DeepSWE
benchmark). Pier already drives **mini-swe-agent, Claude Code, Codex, Gemini CLI,
and opencode** through one interface, runs tasks in isolated **Modal sandboxes**,
and enforces **per-agent network allowlists** (which kill the git-history
cheating that plagued SWE-bench Pro).

This folder is the seam between trustmebro and Pier. It implements `core`'s
`HarnessAdapter` port by shelling out to `pier run …`, then locating and parsing
the run's outputs:

- the agent's **resulting patch / workspace** (needed for static gap-detection),
- the **per-criterion behavioral results** (needed for graded coverage),
- the **trajectory / transcript**, tokens, wall-clock, and cost.

> **Open integration risk (v1 spike).** "Build on Pier" assumes Pier surfaces
> (a) the resulting diff/workspace and (b) structured per-criterion grading
> rather than one binary verdict. Confirming both is **step 1 of the v1 plan**.
> If Pier won't surface the diff, the fallback is to have the task's `test.sh`
> dump the patch as an artifact we collect. See
> `plans/v1-completeness-bench/design.md`.

## Dependency

Pier is a Python tool installed via `uv` (`uv tool install git+https://github.com/datacurve-ai/pier`).
It is the one deliberate deviation from a pure TS/Bun stack — documented in
`AGENTS.md`.

## Maintaining this file

Update the risk note once the v1 spike resolves how Pier exposes diffs and
per-criterion results.
