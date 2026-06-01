# bench/

Pier → trustmebro completeness bridge.

This folder converts a Pier job directory (produced by `pier run`) into
trustmebro completeness records — binary pass/fail plus the full five-dimension
rubric — without re-executing any agent or verifier.

## What lives here

| Path            | Purpose                                                   |
| --------------- | --------------------------------------------------------- |
| `run-bridge.ts` | Main CLI entry point                                      |
| `.cache/`       | Clone + worktree cache (gitignored)                       |
| `out/`          | Generated records and aggregate results.json (gitignored) |

## How it works

For each trial in the Pier job directory the bridge:

1. Parses `result.json` → `task_name`, `reward`, token/cost metadata.
2. Reads `tmp/deep-swe/tasks/<task_name>/task.toml` → `language`,
   `repository_url`, `base_commit_hash`.
3. Reconstructs the agent's workspace: clones the repo once into
   `.cache/repos/<task_name>`, then creates a per-trial worktree under
   `.cache/work/<trial>` at the base commit, and applies `artifacts/model.patch`
   (`git apply` → `git apply --3way` → `patch -p1` cascade).
4. Writes a synthetic `trustmebro.toml` into the workspace so `runGate` has
   task metadata.
5. Calls `runGate` from `cli/gate.ts` with the reconstructed workspace and
   patch text, mapping `reward >= 1` to the single `deepswe-verifier` criterion.
6. Emits one record per trial to `out/records/<model>__<task>.json` and an
   aggregate to `out/results.json`.

## Usage

```sh
bun run bench/run-bridge.ts \
  --job tmp/deep-swe/jobs/<timestamp> \
  --tasks tmp/deep-swe/tasks \
  --model <label> \
  [--now <iso>]
```

- `--job` — path to the Pier job directory (contains `<task>__<hash>/` subdirs).
- `--tasks` — path to the tasks directory (contains `<task_name>/task.toml`).
- `--model` — short label for the model/agent being benchmarked (used in
  output file names and the aggregate keyed by model).
- `--now` — ISO timestamp for `generated_at` in `results.json`. **Do not omit
  in CI** — the default is the string `"unknown"` to keep outputs deterministic.

## Caches

`.cache/repos/` holds bare-ish clones; `.cache/work/` holds per-trial
checkouts. Both are gitignored and safe to delete to force a fresh clone.

## Output

`out/records/<model>__<task>.json` — per-trial completeness record.

`out/results.json` — aggregate across all trials for the run, keyed by model.
