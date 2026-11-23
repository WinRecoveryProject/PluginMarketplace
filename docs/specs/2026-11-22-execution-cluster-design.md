# Execution cluster consolidation — design

Status: approved design, not implemented
Date: 2026-11-22
Scope: sub-project 4 of the catalog consolidation. It uses the same mechanisms as the review and planning clusters.

## Decisions (owner, 2026-11-22)

| Topic | Decision |
|---|---|
| Scope | Core execution: Studio `executing-plans`, `subagent-driven-development`, `implement`, `implement-spec`, `dispatching-parallel-agents` and `execute-durably`, plus DevSuite `devsuite-implement`. Git lifecycle is the next cluster. |
| Hosts | DevSuite `devsuite-implement` holds the whole union. Studio gets a self-contained `studio-execute`. The mode files they share are byte-identical and hash-pinned in both packages. |
| Subagent-driven development scripts | The three bash + git scripts, the prompts and the references ship in both packages under `modes/subagent/`. No capability is dropped. |
| Old names | Removed, with no aliases. |

## Modes

| Mode | Studio source | Shared |
|---|---|---|
| `execute` | `executing-plans` | yes |
| `subagent` | `subagent-driven-development`, with `modes/subagent/{implementer-prompt.md,re-review-prompt.md,task-reviewer-prompt.md,references/*,scripts/*}` | yes |
| `implement` | `implement` | yes |
| `spec-run` | `implement-spec` | yes |
| `parallel` | `dispatching-parallel-agents` | yes |
| `durable` | `execute-durably` | yes |
| `build` | DevSuite's own `devsuite-implement` text, which already carries codex-dev-workflows `feature-development` and `platform-guidance` and guardrails `code-work` | DevSuite only |

### Shared files

- **No package-specific content.** Shared files carry no package links and no names of skills that exist in only one package. Package-neutral rewordings come from a recorded list in the generator, as in the planning cluster.
- **Relative links stay valid.** Links between the subagent support files keep working because the whole `modes/subagent/` tree moves together.
- **Hash list.** `shared-execute-modes.json` covers every shared file, including those under `modes/subagent/`, hashed with LF line endings.

### Router and tests

- **Studio router.** `studio-execute/SKILL.md` keeps the Studio policy line.
- **DevSuite router.** `devsuite-implement/SKILL.md` keeps its policy paragraph, a mode table, and the `build` text under `<a id="src-devsuite-implement-build">`.
- **Claude package.** The Claude packager ships every file under `skills/<name>/modes/` for packaged skills, not just `*.md`. A portable test checks the subagent scripts and prompts against the hashes.

## Union guarantee

- **Matrices.** `references/consolidation/execute-matrix.json` exists in both packages. Deleted Studio sources are kept as git-derived snapshots. No drop is planned. Any drop needs owner approval.
- **Routing.** Every removed trigger routes to the new skill and mode: Studio through `route()`, DevSuite through `runtime/routing.py` with `EXECUTE_MODES`. DevSuite checks its patterns on the request before negated clauses are stripped, as in the planning cluster.
- **Re-pointing.** Studio files that name the removed skills are re-pointed. A removed-name test checks paths, code spans and "skill" forms. "Implement" is an ordinary verb, so only those reference forms count for it.

## Rollout

- **Branches** come from the current mains: Studio `main`, DevSuite `main` and marketplace `main`.
- **Versions:** Studio 0.7.0, DevSuite 0.5.0 (Codex and Claude).
- **Delivery:** three draft PRs. Nothing is merged without the owner's explicit yes. No force-push.
- **Tests:** all existing tests stay green, along with Studio's deterministic build and DevSuite's packages.
