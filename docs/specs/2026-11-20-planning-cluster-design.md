# Planning and specification cluster consolidation — design

Status: approved design, not implemented
Date: 2026-11-20
Scope: sub-project 3 of the catalog consolidation. It follows the lifecycle cluster (sub-project 1) and the review cluster (sub-project 2), and it uses the same mechanisms as the review cluster.

## Decisions (owner, 2026-11-20)

| Topic | Decision |
|---|---|
| Scope | Planning only. Execution (`executing-plans`, `subagent-driven-development`, `implement`, `implement-spec`, `devsuite-implement`) is the next cluster. |
| Hosts | DevSuite `devsuite-planning` holds the whole union. Studio gets a self-contained `studio-plan`. The modes they share are byte-identical and hash-pinned in both packages. |
| Visual companion | Brainstorming's browser companion (Node server, shell scripts and companion guide) stays in Studio only. DevSuite's matrix records those files as dropped, with owner approval given on 2026-11-20 and the reason "needs the Node browser server; DevSuite ships no Node runtime". |
| Old names | Removed, with no aliases. |
| Out of scope | `workflow-designer`, `wizard` and `workflow-compiler` serve other purposes and are not part of this cluster. |

## Skills

### Studio 0.6.0: `studio-plan`

| Mode | Absorbs |
|---|---|
| `discover` | `brainstorming` (its `visual-companion.md` and `scripts/` move to `skills/studio-plan/companion/`) |
| `interview` | `grill-me`, `grill-with-docs`, `grilling` |
| `spec` | `to-spec` |
| `plan` | `writing-plans`, plus its `references/full-plan.md`, which becomes the shared `modes/plan-full.md` |
| `tickets` | `to-tickets` |
| `questions` | `to-questionnaire` |
| `goal` | `goal` |
| `map` | `wayfinder` |

The 22 Studio files that name a removed skill are re-pointed to `studio-plan` modes.

### DevSuite 0.4.0: `devsuite-planning`

`devsuite-planning` keeps its name. It gains the 8 shared modes plus a DevSuite-only `project` mode, which carries its current text: architecture, concise AGENTS.md, task-boundary coordination and the project board. The material it has already absorbed (codex-coordinator, and codex-dev-workflows `new-project`, `orchestrate-work` and `create-agent-instructions`) stays mapped in `capability-matrix.json`.

### Shared mode files

The shared files are:

- `discover.md`
- `interview.md`
- `spec.md`
- `plan.md`
- `plan-full.md`
- `tickets.md`
- `questions.md`
- `goal.md`
- `map.md`

They must be byte-identical in both packages and contain no package-specific links or skill names. Each package's `references/consolidation/shared-plan-modes.json` pins their sha256, hashed with LF line endings.

The companion is optional and Studio-only. `discover.md` therefore mentions it as a feature that exists only when the package ships it, with no link. Studio's router links the companion guide.

## Union guarantee

- Each package has `references/consolidation/plan-matrix.json`. Deleted sources are kept as git-derived snapshots.
- Studio checks its matrix with `consolidation-check`. DevSuite checks its own with a Python test that ports the same rules, as in the review cluster.
- The only planned drops are the companion files in DevSuite's matrix. Any other drop needs a separate owner approval.
- Every removed trigger is a routing test case. Studio uses `route()`. DevSuite uses `runtime/routing.py`, and `route()` returns `mode`.

## Rollout

1. The Studio branch is based on `feat/review-consolidation-0.5.0`.
2. The DevSuite branch is based on `feat/review-consolidation-0.3.0`.
3. The marketplace branch is based on `feat/review-cluster`.
4. There will be three draft PRs. Nothing is merged without the owner's explicit yes, and nothing is force-pushed.

## Testing

All existing tests stay green. That covers Studio, DevSuite (unit, `doctor`, Claude portable and VS Code) and the marketplace (validator and `scripts/*.test.mjs`).

New tests:

- the matrix checks;
- the shared-hash checks, in both the Codex and the Claude package;
- the routing tests for removed triggers;
- a check that no remaining file names a removed skill;
- Studio's deterministic package build.
