---
name: devsuite
description: "Use when development spans planning, implementation, security, verification, coordination, cloud work or conversion and needs one integrated workflow."
---

# WinRecoveryProject DevSuite

Read [the policy](../../references/policy.md). Select one owned workflow for the current phase. Use `python scripts/devsuite.py route "request"` from the plugin root for deterministic suggestions and `capabilities` for the preservation map. The helper never executes user text. Load only the selected skill and relevant references.

- Project discovery, specifications, agent guidance, task ownership: [planning](../devsuite-planning/SKILL.md).
- Authorized coding and refactoring: [implementation](../devsuite-implement/SKILL.md). Defect diagnosis: [debugging](../devsuite-debug/SKILL.md).
- Feature tests or broad QA: [testing](../devsuite-test/SKILL.md). Independent review, patch risk or release readiness: [review](../devsuite-review/SKILL.md).
- Repository/diff audit, threat modeling, discovery, triage and validation: [security assessment](../devsuite-security-assess/SKILL.md).
- Security fixes, hardening, policy, writeups and tracking: [security remediation](../devsuite-security-fix/SKILL.md).
- Shared checks and existing Linter integration: [review gate mode](../devsuite-review/modes/gate.md).
- Interrupted work and session handoff: [handoff](../devsuite-handoff/SKILL.md).
- Isolated worktrees, branch finishing, conflicts and git safety: [git](../devsuite-git/SKILL.md).
- Local/cloud workspaces, desktop, networking and tools: [environment](../devsuite-environment/SKILL.md).
- Local builds, background job status/logs/results and safe cancellation: [process jobs](../devsuite-jobs/SKILL.md).
- Registered environments and explicitly requested remote tasks: [Codex Tasks](../devsuite-tasks/SKILL.md).
- File transformation: [conversion](../devsuite-convert/SKILL.md).

Carry acceptance criteria and remaining work across phases. Avoid duplicate source workflows and repeated planning/review ceremonies. Local implementation, provider completion, installation and publication are separate claims. [Providers](../../references/providers.md) describes real connections and limitations.
