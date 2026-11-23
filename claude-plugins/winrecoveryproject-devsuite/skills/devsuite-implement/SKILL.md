---
name: devsuite-implement
description: "Use when authorized to implement, refactor, migrate or maintain software with bounded changes and fresh evidence; executing a written implementation plan inline task by task, or by dispatching one subagent per task with review gates; building scoped code changes from an approved spec, plan or tickets (even if the user doesn't say \"implement\"); executing a full specification across ticket branches into one unified PR (\"build the whole spec\"); dispatching one subagent per independent problem that can run concurrently; or running long, interruption-prone work from a durable state file with falsifiable criteria. Do NOT use for initial architecture exploration, vague requirements, or planning work that has no plan yet (use devsuite-planning)."
---

# Implement the accepted behavior

<a id="policy"></a>
Read [the policy](../../references/policy.md) and applicable [platform guidance](../../references/platforms.md). Establish observable acceptance criteria, authorized files/interfaces/environments, preserved invariants, highest-risk failures and completion evidence. Inspect current status/diff and nearby implementation/tests. Use repository-native patterns and documented commands.

Pick one mode and read only its file. Bounded implementation, refactoring, migration and maintenance below is the `build` mode.

| Mode | Use when | Read |
|---|---|---|
| <a id="mode-execute"></a>execute | Execute a written plan inline, task by task, stopping only on blockers | [modes/execute.md](modes/execute.md) |
| <a id="mode-subagent"></a>subagent | Execute a plan with one subagent per task and per-task review gates | [modes/subagent.md](modes/subagent.md) |
| <a id="mode-implement"></a>implement | Build scoped code changes from an approved spec, plan or tickets and verify them | [modes/implement.md](modes/implement.md) |
| <a id="mode-spec-run"></a>spec-run | Execute a full specification across ticket branches into one unified PR | [modes/spec-run.md](modes/spec-run.md) |
| <a id="mode-parallel"></a>parallel | Dispatch one subagent per independent problem that can run concurrently | [modes/parallel.md](modes/parallel.md) |
| <a id="mode-durable"></a>durable | Run long or interruption-prone work from a durable state file with evidence | [modes/durable.md](modes/durable.md) |
| <a id="mode-build"></a>build | Authorized bounded implementation, refactor, migration or maintenance with fresh evidence | this file, below |

In this package, the review skill is [devsuite-review](../devsuite-review/SKILL.md) (code and verify modes), the debugging workflow is [devsuite-debug](../devsuite-debug/SKILL.md), handoff is [devsuite-handoff](../devsuite-handoff/SKILL.md), and the worktree and branch-finishing workflows are [devsuite-git](../devsuite-git/SKILL.md) (worktree and finish modes). DevSuite has no dedicated refactoring, research or UI-automation workflow and no Windows process-execution reference: use the platform guidance instead, and report those layers as unavailable when a mode asks for them.

The mode files and everything under `modes/subagent/` are shared byte-for-byte with Plugin-Skill-Studio `studio-execute`. Change them only together with Studio, and update `references/consolidation/shared-execute-modes.json` in both packages. The subagent scripts need bash and git.

<a id="src-devsuite-implement-build"></a>
A feature starts with a thin vertical slice; a defect follows [debugging](../devsuite-debug/SKILL.md); a refactor characterizes behavior; a migration maps producers/consumers, compatibility window, data transitions and rollback. Name concurrency, persistence, security, time and network failure boundaries where relevant. Use [engineering decisions](../../references/engineering-decisions.md) when selecting test levels and investigations.

For each behavior, demonstrate the missing/wrong behavior by focused failing check or deterministic reproduction where practical; confirm the intended failure cause. Make the smallest coherent change, verify it, and improve structure while green. Expected values come from requirements or independent invariants. Prefer real collaborators when safe and stable seams when isolation is needed. Preserve valid pre-existing work even if it was not developed test-first.

Inspect each slice for accidental API/data changes, copied secrets, generated noise, weak errors and unrelated edits. Do not replace a binding decision with a workaround. Resolve material ambiguity before dependent work while continuing independent work.

For authorized parallelism, partition write surfaces, serialize shared interfaces/migrations/generated outputs and verify combined results directly. No skill automatically creates another chat or agent. Run affected regression/unit/integration tests, project lint/type/build checks and meaningful runtime/migration/recovery checks proportionate to risk. Apply [review gate mode](../devsuite-review/modes/gate.md) once; preserve failures and classify product/test/environment/flaky/pre-existing/unresolved causes. Report behavior, checks, compatibility decisions and gaps.
