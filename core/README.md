# `core/` — the domain-agnostic engine

The durable product. `core/` knows nothing about TypeScript, Docker, mini-swe,
Pier, or "wiring." It orchestrates abstract tasks through abstract harnesses and
verifiers, and turns their results into scores and reports. This is what survives
when a second domain (e.g. agentic/computer-use evaluation) is added beside the
SWE domain.

## Layout

| Folder       | Responsibility                                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model/`     | The vocabulary: `Task`, `Run`, `Artifact`, `CriterionResult`, `GapFinding`, `Score`. Pure types, no behavior.                                       |
| `ports/`     | The interfaces a domain/harness plugs into: `Domain`, `HarnessAdapter`, `Verifier`, `Scorer`. Everything else depends on these, not on concretions. |
| `run/`       | The run lifecycle: load task → invoke harness (via adapter) → collect artifacts → run verifiers → score.                                            |
| `scoring/`   | The binary-pass + multi-dimensional rubric scorer. Consumes verifier output, emits a `Score`.                                                       |
| `aggregate/` | Rolls many runs up into model×harness completeness profiles and a leaderboard.                                                                      |
| `report/`    | Renders scores to human (markdown) and machine (JSON) reports.                                                                                      |

## Dependency direction

`cli/` → `core/run` → `core/ports` ← `domains/*`, `pier/`. Nothing in `core/`
imports from `domains/`, `pier/`, or `cli/`. The plugins depend on `core`, never
the reverse.

## Maintaining this file

Update the layout table when you add, rename, or remove a subfolder of `core/`.
