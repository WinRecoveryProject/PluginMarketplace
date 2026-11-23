---
name: devsuite
description: "Use when local software work needs coordinated planning, implementation, debugging, code review, testing, quality checks or handoff."
---

# WinRecoveryProject DevSuite

Read [the policy](../../references/policy.md). Select one guide for the current phase and carry forward the acceptance criteria and unfinished work.

- [Planning](../devsuite-planning/SKILL.md) for scope, architecture and acceptance evidence.
- [Implementation](../devsuite-implement/SKILL.md) for authorized code changes.
- [Debugging](../devsuite-debug/SKILL.md) for root-cause diagnosis.
- [Code review](../devsuite-review/SKILL.md) for an independent read of local revisions and diffs.
- [Testing](../devsuite-test/SKILL.md) for behavior, state and regressions.
- [Review gate mode](../devsuite-review/modes/gate.md) for a project-native verification gate.
- [Handoff](../devsuite-handoff/SKILL.md) for resuming or recording verified state.
- [Git](../devsuite-git/SKILL.md) for isolated worktrees, branch finishing, conflict resolution and git safety guardrails.

The bundled Python router accepts a request as one literal argument after `route --`. Pass it unchanged through a process argument array. If the host only supports shell command strings, select a guide directly instead of interpolating request text or executing it. The router selects a guide and grants no execution or external-action authority. Use `python -I -B scripts/devsuite.py doctor` from the installed plugin root to check the local package.

Return `UNAVAILABLE` for requests to use Codex Tasks, managed cloud environments, Codex Process Jobs, CloudConvert, Codex Security provider functions or a Codex App connection. Separate these requests from ordinary work on local code about those integrations. Keep the original objective and report the missing capability without substituting an unrelated workflow.
