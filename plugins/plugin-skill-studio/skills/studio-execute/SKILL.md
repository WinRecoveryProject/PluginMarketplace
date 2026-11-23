---
name: studio-execute
description: "Use when executing a written implementation plan inline task by task, or by dispatching one subagent per task with review gates; building scoped code changes from an approved spec, plan or tickets (even if the user doesn't say \"implement\"); executing a full specification across ticket branches into one unified PR (\"build the whole spec\"); dispatching one subagent per independent problem that can run concurrently; or running long, interruption-prone work from a durable state file with falsifiable criteria. Do NOT use for initial architecture exploration, vague requirements, single isolated bug fixes without tickets, or planning work that has no plan yet (use studio-plan)."
---

# Studio Execute

<a id="policy"></a>
Read [Studio policy](../../references/studio-policy.md) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](../../references/integration-registry.json); never load companion plugins.

Pick one mode, read only that mode file, and follow it.

| Mode | Use when | Read |
|---|---|---|
| <a id="mode-execute"></a>execute | Execute a written plan inline, task by task, stopping only on blockers | [modes/execute.md](modes/execute.md) |
| <a id="mode-subagent"></a>subagent | Execute a plan with one subagent per task and per-task review gates | [modes/subagent.md](modes/subagent.md) |
| <a id="mode-implement"></a>implement | Build scoped code changes from an approved spec, plan or tickets and verify them | [modes/implement.md](modes/implement.md) |
| <a id="mode-spec-run"></a>spec-run | Execute a full specification across ticket branches into one unified PR | [modes/spec-run.md](modes/spec-run.md) |
| <a id="mode-parallel"></a>parallel | Dispatch one subagent per independent problem that can run concurrently | [modes/parallel.md](modes/parallel.md) |
| <a id="mode-durable"></a>durable | Run long or interruption-prone work from a durable state file with evidence | [modes/durable.md](modes/durable.md) |

In this package, the review skill is `studio-review`, the worktree and branch-finishing workflows are `using-git-worktrees` and `finishing-a-development-branch`, the debugging workflow is `diagnose-systematically`, refactoring is `refactor-safely`, research is `research-systematically`, UI automation is `automate-ui`, and the Windows process-execution reference is [windows-process-execution.md](../../references/windows-process-execution.md).

The mode files and everything under `modes/subagent/` are shared byte-for-byte with DevSuite's `devsuite-implement`. Change them only together with DevSuite, and update `references/consolidation/shared-execute-modes.json` in both packages.
