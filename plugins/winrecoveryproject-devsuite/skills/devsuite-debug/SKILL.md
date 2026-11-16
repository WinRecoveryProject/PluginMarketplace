---
name: devsuite-debug
description: "Use when observed software behavior differs from its expected contract and needs reproduction, root-cause diagnosis or an authorized fix."
---

# Find the defect mechanism

Read [the policy](../../references/policy.md) and [platform guidance](../../references/platforms.md). State expected versus actual behavior, affected version/environment, scope, frequency and reproducibility. Preserve sanitized logs, screenshots, error text and exact reproduction inputs. Diagnosis alone does not authorize source edits.

Scope boundary: investigate the reported defect and paths sharing its demonstrated
cause. Do not use this workflow for new feature design, broad code review, unrelated
cleanup or a full security audit. Route those requests to planning, review or security
assessment. A diagnosis request remains read-only unless the conversation already
authorizes implementation; uncertainty never expands the target or permissions.

Reproduce safely in the requested environment. If unsuccessful, retain known evidence and separate hypotheses from facts. Trace the smallest likely path through inputs, contracts, validation, lifecycle/state transitions, errors, timing/concurrency, configuration and recent changes. Test competing hypotheses with distinguishing checks. A warning, correlation or stack location alone is not root cause.

For an authorized fix, identify the shared mechanism and compatibility requirements; add a useful focused regression, apply the narrowest complete fix and repeat the original path. Consider sibling callers and boundary/error cases without broad cleanup. Run affected static/tests and relevant runtime checks. If dependencies or credentials are missing, name the blocked check and continue useful source analysis.

Report reproduction status, mechanism and primary evidence, fix if authorized, test results, uncertainty and the next diagnostic observation. Security-boundary candidates route to assessment/remediation; suspicion is not confirmation.
