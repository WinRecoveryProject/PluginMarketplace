# Git lifecycle cluster consolidation — design and plan

Status: approved design (owner, 2026-11-22), not yet implemented
Scope: sub-project 5 of the catalog consolidation. It follows the execution cluster and uses the same mechanisms.

## Decisions

| Topic | Decision |
|---|---|
| Sources | Studio `using-git-worktrees`, `finishing-a-development-branch`, `resolving-merge-conflicts` and `git-safety-guardrails` (including `scripts/block-dangerous-git.sh` and `scripts/classify_git_command.py`) |
| Hosts | Studio gets a self-contained `studio-git`. DevSuite gets a new skill, `devsuite-git`, which brings it to 14 skills. Both carry the same four modes, byte-identical and hash-pinned. |
| Old names | Removed, with no aliases |
| Base branches | The execution-cluster branches (Studio #4, DevSuite #6, marketplace #8), because their routers name the git skills |

## Modes

The four modes and their scripts are shared:

| Mode | Source |
|---|---|
| `worktree` | `using-git-worktrees` |
| `finish` | `finishing-a-development-branch` |
| `conflicts` | `resolving-merge-conflicts` |
| `safety` | `git-safety-guardrails`, with its scripts in `modes/safety/scripts/` |

Shared files carry no package links and no names of skills that exist in only one package. Rewordings come from the generator's recorded list.

## Studio 0.8.0

- **New skill.** `studio-git` uses `references/consolidation/git-matrix.json` and `shared-git-modes.json`.
- **Re-pointing.** The `studio-execute` router and the dependent files point to `studio-git` modes.
- **Tooling.** `tools/matt/test_git_safety_guardrails.py` and `tools/matt/route_skill.py` follow the new paths.
- **Removed skills.** The 4 old skills are snapshotted, then deleted. The version becomes 0.8.0, with a CHANGELOG entry.

## DevSuite 0.6.0

- **New skill.** `devsuite-git` consists of a router, the shared modes and an `agents/openai.yaml` that uses the DevSuite icons.
- **Registration.** The skill is added to:
  - `runtime/routing.py`: `GIT_MODES`, plus `LOCAL_WORKFLOWS` for Claude;
  - the doctor count, which becomes 14;
  - the VS Code `knownSkills` list;
  - the capability matrix;
  - `references/consolidation/git-matrix.json`, checked by a Python test.
- **Router update.** The `devsuite-implement` router stops saying DevSuite has no worktree or branch-finishing workflow and points to `devsuite-git`.
- **Version.** 0.6.0 in every version field. The README and editor counts update to 14 workflow guides, and the Claude package gets seven local workflows plus the start guide.

## Verification

- All existing tests stay green.
- The new matrices, hash, trigger and removed-name tests pass in both packages.
- Studio's deterministic build passes, and both DevSuite packages build.
- Marketplace: `validate-marketplace.mjs`, `scripts/*.test.mjs`, and Gemini `--check` after regeneration.

## Delivery

Three draft PRs, stacked on the execution-cluster PRs. Nothing is merged without the owner's explicit yes, and nothing is force-pushed.
