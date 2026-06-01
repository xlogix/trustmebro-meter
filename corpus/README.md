# `corpus/` — the swappable test cases

Pure data. The engine treats the corpus as pluggable content: adding a task is
adding a folder. Tasks are **model-blind and harness-blind** — they know nothing
about who is being evaluated. This is what makes trustmebro a benchmark *machine*
rather than one frozen benchmark: keep feeding it fresh tasks (including your own
real-world agent failures) and it keeps producing meaningful measurements long
after the first batch leaks.

## Task layout

Each task is a standard **Harbor** task (Pier-compatible) **plus** one trustmebro
extension file:

```
corpus/<task-id>/
├── task.toml          # Harbor: repo, base commit, language, prebuilt image, resource limits
├── instruction.md     # the short, behavior-focused prompt given to the agent (DeepSWE style)
├── environment/       # Harbor: Dockerfile fallback if no prebuilt image
├── tests/             # Harbor: test.sh + test.patch — behavioral checks, asserting via public APIs
├── solution/          # Harbor: reference solution, WITHHELD from the agent at eval time
└── trustmebro.toml    # OURS: acceptance criteria + static-gap rules + rubric weights
```

`trustmebro.toml` is the seam between engine and corpus. It declares:

- **acceptance criteria** — `N` named behavioral checks (`id`, `description`,
  `weight`, `critical`), each producing an independent pass/fail so we can grade
  coverage instead of collapsing to one verdict;
- **static-gap rules** — which structural checks apply and their params;
- **rubric weights + binary-pass condition**.

## Provenance

Provenance is just metadata on a task. The engine treats all three sources
identically:

- **novel** — authored from scratch in a private repo, no public solution to leak;
- **oss-derived** — a novel feature on top of an active (≥500★) public repo, with
  no committed solution to cheat from;
- **harvested-failure** — a real case where an agent claimed-done-but-wasn't in our
  own work, distilled into a task.

Every task carries a canary string so we can detect training-corpus contamination
later, per DeepSWE's practice.

## Maintaining this file

Update the task layout if the Harbor format or our `trustmebro.toml` schema changes.
