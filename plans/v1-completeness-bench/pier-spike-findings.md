# Pier capability spike — findings (Task 0)

Date: 2026-06-01 · Status: **the "build on Pier" bet is validated**

This is the deliverable for Task 0 of the v1 plan: confirm whether Pier exposes what
trustmebro needs (the agent's diff + per-criterion results), so we can build the
benchmark loop on top of it instead of reimplementing sandboxing/harness/verification.

## Environment

- **Pier `0.2.1`**, installed via `uv tool install git+https://github.com/datacurve-ai/pier`. Works.
- **Docker required** for local sandboxes (`--env docker`, the default — no Modal needed). Confirmed working on macOS / Docker 29.4.3.
- **DeepSWE corpus** cloned (`github.com/datacurve-ai/deep-swe`): **115 tasks** — 35 TypeScript / 34 Go / 34 Python / 5 JavaScript / 5 Rust. Each task: `task.toml` (incl. `repository_url`, `base_commit_hash`, prebuilt ECR `docker_image`, `allow_internet=false`, cpu/mem limits), `instruction.md`, `tests/` (`test.sh` + `test.patch`), `solution/`.

## Real CLI (vs. the second-hand flags)

`pier run -p <task-or-dataset> --agent <a> --model <m> --env docker -l <N> [--sample-seed S] [--ae KEY=VAL] [-n concurrency] [--debug] -o <jobsdir>`

- Agents: `oracle | nop | claude-code | gemini-cli | mini-swe-agent | swe-agent | opencode | …`.
- `--ae/--agent-env KEY=VAL` injects env into the agent — this is how we pass GLM creds.
- Commands: `run · check · analyze · view · job · critique`.

## Output structure

```
jobs/<timestamp>/
├── result.json            # job-level: stats.evals.<agent>__<source>.reward_stats, token/cost rollups
└── <task>__<hash>/        # one per trial
    ├── result.json        # agent_result, verifier_result, agent/verifier/env timing, config
    ├── artifacts/model.patch   # ★ the agent's full git diff
    ├── verifier/test-stdout.txt  # raw test-runner output (per-test PASS/FAIL)
    ├── verifier/reward.txt       # scalar reward
    ├── agent/claude-code.txt     # full stream-json trajectory (for claude-code agent)
    ├── docker-compose-mounts.json
    └── docker-compose-egress-proxy.json  # per-agent network allowlist proxy
```

## The five questions — answered

1. **Does Pier write the agent's resulting patch/diff?** **YES.** `artifacts/model.patch` — a real unified git patch (repo-root-relative). The verifier explicitly does `Step 0: Capturing model.patch artifact → /logs/artifacts/model.patch`. This is exactly what trustmebro's static gap-detection consumes. **This was the make-or-break question; it's a clean yes.**
2. **Per-test / per-criterion results, or one aggregate?** **Aggregate by default.** `verifier_result.rewards.reward` is a single scalar (1.0 = all hidden tests passed). The _raw_ per-test output is preserved in `verifier/test-stdout.txt` (e.g. `Tests: 161 passed, 161 total`, per-suite `PASS`). For structured per-criterion grading, author the task's `test.sh` to emit a JSON artifact (the `config.json → artifacts[]` hook supports custom artifacts). → **Our planned "test.sh emits per-criterion JSON" approach is the path; confirmed supported.**
3. **Trajectory / tokens / cost?** **YES.** `agent_result` carries `n_input_tokens`, `n_output_tokens`, `n_cache_tokens`, `cost_usd`, `peak_context_tokens`, `summarization_count`, `rollout_details` (null for the `oracle` agent; populated for real models). Full transcript at `agent/claude-code.txt`.
4. **Can `test.sh` emit structured artifacts Pier preserves?** **YES** — `/logs/artifacts/` is mounted out; `config.json` has an `artifacts` list. This is the fallback for richer per-criterion results.
5. **How to access the resulting workspace for static analysis?** The live sandbox is torn down, but `model.patch` + `task.toml`'s `base_commit_hash` let us **reconstruct** it: clone the repo at the base commit, apply `model.patch`, run trustmebro's gap rules. This is exactly what `bench/run-bridge.ts` now does, validated against the oracle gold patch (applied cleanly, scored complete).

## Network model (important)

Tasks set `allow_internet=false`, but the agent still needs to reach its model API. Pier
solves this with a **per-agent egress proxy** (`docker-compose-egress-proxy.json` +
`egress-proxy/`) that allowlists the model endpoint. Empirically, passing
`ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic` + `ANTHROPIC_AUTH_TOKEN` via `--ae`
let **claude-code reach GLM through the proxy** inside the locked-down sandbox. So the
**GLM subscription path works end-to-end** (no API credits; uses the GLM Coding Plan).

## Agent execution model

Pier runs the harness CLI **inside a dedicated agent sandbox image** (separate from the
task env). For claude-code it invokes:
`claude --verbose --output-format=stream-json --permission-mode=bypassPermissions --print -- '<instruction>'`
with the injected env. So no host-side auth leakage; the agent runs headless in-sandbox.

## Observations that affect the benchmark plan

- **GLM-4.6 via claude-code is slow on hard tasks** — a single TypeScript task ran 17+
  minutes and produced a ~2 MB trajectory before the verifier even started. Batching many
  tasks on the full flagship model is time- and quota-expensive. Mitigations: run with
  concurrency (`-n`), use faster GLM variants (`glm-4.5-air`/`-flash`) for breadth, and
  keep flagship runs to a smaller sample. The GLM Coding Plan also has quota limits
  (`glm-4-plus` already returns 429 "insufficient balance").

## Implications for trustmebro

- **The deferred "benchmark loop" is no longer high-risk.** Pier hands us the diff, the
  scalar behavioral verdict, and tokens/cost; `bench/run-bridge.ts` reconstructs the
  workspace and runs our completeness scoring on top. We add the axis Pier/DeepSWE omit:
  the static-gap rubric.
- **For DeepSWE tasks**, behavioral coverage = the DeepSWE scalar reward (1 criterion);
  the static dimensions (wiring, test-honesty, stubs) are trustmebro's value-add. Authoring
  graded per-criterion behavioral checks is reserved for our own corpus tasks.
