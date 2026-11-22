---
name: devsuite-git
description: "Use when starting feature work that needs an isolated workspace or worktree before executing a plan; integrating a finished branch (verify tests, choose merge, PR, keep or discard, clean up worktrees); resolving in-progress merge or rebase conflicts and CONFLICT markers by traced intent (even if the user just says \"fix this merge\"); or safeguarding a repository against force pushes, hard resets, branch deletions, cleans, destructive restores and history rewrites (\"clean up git history\"). Do NOT use for routine safe git status, fetch, diff or branch queries, or for routine rebasing without conflicts."
---

# Isolate, integrate and protect git work

<a id="policy"></a>
Read [the policy](../../references/policy.md). Git writes that change shared history, delete branches or discard work need the user's explicit authorization; pushing, merging and publishing stay separate decisions.

Pick one mode, read only that mode file, and follow it.

| Mode | Use when | Read |
|---|---|---|
| <a id="mode-worktree"></a>worktree | Start isolated feature work via native tools or a git worktree fallback | [modes/worktree.md](modes/worktree.md) |
| <a id="mode-finish"></a>finish | Integrate a finished branch: verify tests, choose merge/PR/keep/discard, clean up worktrees | [modes/finish.md](modes/finish.md) |
| <a id="mode-conflicts"></a>conflicts | Resolve merge or rebase conflicts by intent traced to primary sources | [modes/conflicts.md](modes/conflicts.md) |
| <a id="mode-safety"></a>safety | Guard against destructive or history-rewriting git operations with a classifier hook | [modes/safety.md](modes/safety.md) |

In this package, the review skill is [devsuite-review](../devsuite-review/SKILL.md) (request mode before merge). The guardrail scripts live in `modes/safety/scripts/` and need bash and Python 3.

The mode files and everything under `modes/safety/` are shared byte-for-byte with Plugin-Skill-Studio `studio-git`. Change them only together with Studio, and update `references/consolidation/shared-git-modes.json` in both packages.
