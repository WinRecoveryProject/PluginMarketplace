---
name: devsuite-planning
description: "Use for scoped project planning, architecture, concise AGENTS.md instructions, task-boundary coordination or project board lifecycle."
---

# Plan and coordinate a bounded outcome

Read [the policy](../../references/policy.md). For a new product, identify users, smallest useful release, platforms, integrations, privacy, accessibility, budget, data ownership and deployment constraints. Separate requirements, assumptions, non-goals and material open decisions. Planning alone does not start implementation.

Inspect entry points, architecture, manifests, CI and current changes. Produce observable acceptance criteria, stable interfaces, data flow, risky assumptions, dependency-ordered milestones, validation and rollback conditions. Each milestone names its user-visible result, files/resources, dependencies and evidence. Keep one integration step active. Test security and irreversible data assumptions early.

For AGENTS.md, preserve useful policy; route to authoritative architecture/testing/domain docs instead of duplicating them. Confirm commands against the project. Include boundaries, generated files, dependency/migration rules, relevant tests and completion expectations. Project instructions never expand user authority.
