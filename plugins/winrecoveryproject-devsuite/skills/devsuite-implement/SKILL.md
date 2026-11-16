---
name: devsuite-implement
description: "Use when authorized to implement, refactor, migrate or maintain software with bounded changes and fresh evidence."
---

# Implement the accepted behavior

Read [the policy](../../references/policy.md) and applicable [platform guidance](../../references/platforms.md). Establish observable acceptance criteria, authorized files/interfaces/environments, preserved invariants, highest-risk failures and completion evidence. Inspect current status/diff and nearby implementation/tests. Use repository-native patterns and documented commands.

A feature starts with a thin vertical slice; a defect follows [debugging](../devsuite-debug/SKILL.md); a refactor characterizes behavior; a migration maps producers/consumers, compatibility window, data transitions and rollback. Name concurrency, persistence, security, time and network failure boundaries where relevant. Use [engineering decisions](../../references/engineering-decisions.md) when selecting test levels and investigations.

For each behavior, demonstrate the missing/wrong behavior by focused failing check or deterministic reproduction where practical; confirm the intended failure cause. Make the smallest coherent change, verify it, and improve structure while green. Expected values come from requirements or independent invariants. Prefer real collaborators when safe and stable seams when isolation is needed. Preserve valid pre-existing work even if it was not developed test-first.

Inspect each slice for accidental API/data changes, copied secrets, generated noise, weak errors and unrelated edits. Do not replace a binding decision with a workaround. Resolve material ambiguity before dependent work while continuing independent work.

For authorized parallelism, partition write surfaces, serialize shared interfaces/migrations/generated outputs and verify combined results directly. No skill automatically creates another chat or agent. Run affected regression/unit/integration tests, project lint/type/build checks and meaningful runtime/migration/recovery checks proportionate to risk. Apply [quality](../devsuite-quality/SKILL.md) once; preserve failures and classify product/test/environment/flaky/pre-existing/unresolved causes. Report behavior, checks, compatibility decisions and gaps.
