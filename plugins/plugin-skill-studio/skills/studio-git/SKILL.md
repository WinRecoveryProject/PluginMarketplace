---
name: studio-git
description: "Use when starting feature work that needs an isolated workspace or worktree before executing a plan; integrating a finished branch (verify tests, choose merge, PR, keep or discard, clean up worktrees); resolving in-progress merge or rebase conflicts and CONFLICT markers by traced intent (even if the user just says \"fix this merge\"); or safeguarding a repository against force pushes, hard resets, branch deletions, cleans, destructive restores and history rewrites (\"clean up git history\"). Do NOT use for routine safe git status, fetch, diff or branch queries, or for routine rebasing without conflicts."
---

# Studio Git

<a id="policy"></a>
Read [Studio policy](../../references/studio-policy.md) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](../../references/integration-registry.json); never load companion plugins.

Pick one mode, read only that mode file, and follow it.

| Mode | Use when | Read |
|---|---|---|
| <a id="mode-worktree"></a>worktree | Start isolated feature work via native tools or a git worktree fallback | [modes/worktree.md](modes/worktree.md) |
| <a id="mode-finish"></a>finish | Integrate a finished branch: verify tests, choose merge/PR/keep/discard, clean up worktrees | [modes/finish.md](modes/finish.md) |
| <a id="mode-conflicts"></a>conflicts | Resolve merge or rebase conflicts by intent traced to primary sources | [modes/conflicts.md](modes/conflicts.md) |
| <a id="mode-safety"></a>safety | Guard against destructive or history-rewriting git operations with a classifier hook | [modes/safety.md](modes/safety.md) |

In this package, the review skill is `studio-review` (request mode before merge). The guardrail scripts live in `modes/safety/scripts/`.

The mode files and everything under `modes/safety/` are shared byte-for-byte with DevSuite's `devsuite-git`. Change them only together with DevSuite, and update `references/consolidation/shared-git-modes.json` in both packages.
