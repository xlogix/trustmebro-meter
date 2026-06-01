# `domains/swe-feature/` — domain #1: software-engineering feature completeness

A `Domain` plugin (implements `core/ports`). Everything SWE-specific lives here so
that `core/` stays domain-agnostic and a future `domains/agentic/` can slot in
beside it without touching the engine.

This domain answers one question better than any existing benchmark: **not "did
the feature pass a test" but "how finished is it"** — including the structural
incompleteness (stubs, unwired code, skipped tests, dead error paths) that
behavioral pass/fail benches (DeepSWE, FeatureBench) deliberately ignore.

## Layout

| Folder       | Responsibility                                                                                                                                                                                                                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verifiers/` | The two detection mechanisms. **Behavioral**: run the task's per-criterion checks via Pier and collect graded coverage. **Static gap-detection**: deterministic `ast-grep`/tree-sitter analysis of the agent's diff — unwired components, endpoints never called, `.skip`/empty/assertion-free tests, leftover `TODO`/`NotImplemented`, dead error branches. No LLM judge. |
| `rubric/`    | The SWE completeness dimensions and how verifier output maps to each sub-score, plus the binary-pass condition.                                                                                                                                                                                                                                                            |

## Scoring dimensions (see design doc for the authoritative spec)

- **Behavioral coverage** — fraction of acceptance criteria that execute green.
- **Integration / wiring** — defined-but-never-referenced code.
- **Error-path handling** — stubbed/empty error branches.
- **Test honesty** — skipped, empty, or assertion-free tests.
- **Stubs left** — `TODO`/`FIXME`/`NotImplemented`/`panic("todo")` in changed files.

## Per-language note

Static gap-detection is the per-language labor we accepted by going polyglot
(TS + Go + Python). v1 implements **TypeScript checks only**; Go and Python are
fan-out work. Behavioral checks are language-agnostic (they run via Pier).

## Maintaining this file

Keep the dimensions list in sync with `rubric/` and the design doc. Note which
languages `verifiers/` static checks currently cover as they are added.
