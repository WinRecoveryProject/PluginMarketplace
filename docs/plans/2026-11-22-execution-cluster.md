# Execution Cluster Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Studio's 6 execution skills and DevSuite's `devsuite-implement` into `studio-execute` (Studio 0.7.0) and `devsuite-implement` (DevSuite 0.5.0, Codex and Claude) without losing any capability.

**Architecture:** This plan follows `docs/plans/2026-11-20-planning-cluster.md` step for step, with the differences below.

| | Planning cluster | This cluster |
|---|---|---|
| Studio skill | `studio-plan` | `studio-execute` |
| DevSuite skill | `devsuite-planning` | `devsuite-implement` |
| Shared modes | the planning modes | `execute`, `subagent`, `implement`, `spec-run`, `parallel`, `durable` |
| Shared support tree | — | `modes/subagent/`, covered by the hash list |
| DevSuite-only mode | `project` | `build` |
| Matrices | plan matrices | `execute-matrix.json` |
| Hash list | `shared-plan-modes.json` | `shared-execute-modes.json` |
| Studio version | 0.6.0 | 0.7.0 |
| DevSuite version | 0.4.0 | 0.5.0 |
| Base branches | review-cluster branches | the current `main` of each repo |

**Spec:** `docs/specs/2026-11-22-execution-cluster-design.md`

## Global Constraints

- **Removed Studio names:** `executing-plans`, `subagent-driven-development`, `implement`, `implement-spec`, `dispatching-parallel-agents`, `execute-durably`. There are no aliases.
- **Kept DevSuite name:** `devsuite-implement`.
- **Shared files:** no package links and no names of skills that exist in only one package. Rewordings come only from the generator's recorded list, which fails unless each listed sentence occurs exactly once.
- **Drops:** none are planned. Any drop stops the work and goes to the owner.
- **Git and PRs:** feature branches from `main`, one commit per task, no force-push, and three draft PRs. Nothing is merged without the owner's explicit yes.

## Tasks

### Task 0: Branches and baselines

- [ ] In each repo, create `feat/execute-consolidation-0.7.0` (Studio), `feat/execute-consolidation-0.5.0` (DevSuite) and `feat/execution-cluster` (marketplace) from `origin/main`.
- [ ] Commit the spec and this plan in the marketplace repo.
- [ ] Record baselines: Studio `npm test` and `validate`; DevSuite unit tests, `doctor`, portable and VS Code tests.

### Task 1: Studio — `studio-execute`

- [ ] Generate the shared mode files. Copy the subagent prompts, references and scripts byte-for-byte into `modes/subagent/`.
- [ ] Rewrite each link in the SDD body from `references/x` or `scripts/x` to `subagent/references/x` or `subagent/scripts/x`, so the links resolve from `modes/`.
- [ ] Write the router, the matrix, the hash list and the route rules.
- [ ] Add a test file mirroring `plan-consolidation.test.mjs`.
- [ ] Run `npm test` and `validate`, then commit.

### Task 2: Studio — re-point, remove, 0.7.0

- [ ] Re-point dependent files, and review every leftover mention by hand.
- [ ] Snapshot the 6 source skills, then delete them.
- [ ] Update the registry, set the version to 0.7.0 and add a CHANGELOG entry.
- [ ] Add a removed-name test. "implement" is an ordinary verb, so only its path, code-span and "skill" forms count.
- [ ] Run the full suite, all four matrices and the deterministic build, then commit.

### Task 3: DevSuite — `devsuite-implement`, 0.5.0

- [ ] Copy the shared files.
- [ ] Rewrite the router: policy paragraph, mode table, then the `build` text verbatim.
- [ ] Add `EXECUTE_MODES` to the router, matched before negated clauses are stripped. The existing branch yields `build`.
- [ ] Update the capability matrix and add the execute matrix.
- [ ] Add `tests/test_execute_consolidation.py`.
- [ ] Make the Claude packager ship every file under `modes/`, and add a portable test for the subagent tree.
- [ ] Set the version to 0.5.0 and update the verification record.
- [ ] Run the unit tests, `doctor`, the portable test and the VS Code tests, build both packages, then commit.

### Task 4: Marketplace and draft PRs

- [ ] Sync the Studio and DevSuite snapshots.
- [ ] Replace the Claude DevSuite package and lock all three. Update versions and README.
- [ ] Verify with the validator and the repo tests.
- [ ] Push and open three draft PRs against `main`.

## Unresolved decisions

Any drop found while mapping needs the owner's approval.
