---
name: devsuite-test
description: "Use for feature testing, broad QA, user journeys, regression checks and evidence-based verification."
---

# Test behavior and state

Read [the policy](../../references/policy.md), project requirements/testing docs and [platform guidance](../../references/platforms.md). Choose feature scope for one change or broad QA for a product/service/game. Discover configured formatter check, lint, type, unit/integration/build/browser commands and inspect side effects. Use check modes for review-only work. Report excluded unsafe tests.

Map acceptance criteria and risks to independent observable checks. Exercise normal, boundary, invalid, empty/missing data, repeated/rapid actions, errors, cancellation, retry, offline/degraded dependencies, authorization and restart/reset where applicable. Trace critical journeys, navigation, persistence and terminal states. Compare UI, API response, stored state, logs and notifications. Check accessibility, supported devices/layouts, localization, resources/performance and shared-component regressions where relevant. Games additionally need rules/modes, scores/lives/timers, progression, win/loss, saves and consecutive sessions.

Inspect whether assertions detect plausible regressions: avoid tautologies, excessive mocking and expected values calculated by the implementation under test. Run narrow checks before broad gates. Isolate shared databases, devices, ports, snapshots and generated files. A green unit suite does not establish full QA.

Use the named actual browser/session for visible flows and the project's runner for a suite. [Environment](../devsuite-environment/SKILL.md) handles desktop and handoffs. Avoid production purchases, account changes, messages and destructive tests without authority.

Fix confirmed defects only if authorized; use regression/fix/recheck. Report scenarios actually performed, defects/fixes, failures, skipped/manual checks, revision/environment and PASS/PARTIAL/FAIL/INCONCLUSIVE. Keep specification and engineering-quality verdicts distinct.
