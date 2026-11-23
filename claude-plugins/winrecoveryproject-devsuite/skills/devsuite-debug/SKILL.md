---
name: devsuite-debug
description: "Use when observed software behavior differs from its expected contract and needs reproduction, root-cause diagnosis or an authorized fix; when a failure, flaky behavior, performance regression or runtime exception lacks a demonstrated root cause and needs falsifiable experiments; when the user reports broken behavior, failing tests or flaky CI, or says \"debug this\" / \"diagnose this\", even without an error message, so a tight automated feedback loop must reproduce it first; or when incoming issues, external bug reports, feature requests or contributor pull requests need classification, reproduction, out-of-scope rejection or an agent-ready brief (\"triage these issues\"). Do NOT use for routine test-driven feature development, internal tickets already produced by devsuite-planning (tickets mode), or security findings (use the security workflows)."
---

# Find the defect mechanism

<a id="policy"></a>
Read [the policy](../../references/policy.md) and [platform guidance](../../references/platforms.md). State expected versus actual behavior, affected version/environment, scope, frequency and reproducibility. Preserve sanitized logs, screenshots, error text and exact reproduction inputs. Diagnosis alone does not authorize source edits.

Pick one mode and read only its file. The bounded investigation below is the `investigate` mode.

| Mode | Use when | Read |
|---|---|---|
| <a id="mode-investigate"></a>investigate | Observed behavior differs from its contract: reproduce safely, trace the smallest path, test competing hypotheses, fix only when authorized, report | this file, below |
| <a id="mode-diagnose"></a>diagnose | A failure, flake or regression lacks a demonstrated cause: preserve evidence, run the evidence loop, scale lanes deliberately, fix only when authorized | [modes/diagnose.md](modes/diagnose.md) |
| <a id="mode-loop"></a>loop | A hard bug, flaky CI or performance regression first needs a fast, deterministic red loop, then minimization, 3–5 ranked hypotheses, tagged probes, a regression test and cleanup | [modes/loop.md](modes/loop.md) |
| <a id="mode-triage"></a>triage | Incoming issues or external pull requests need classification, redundancy screening, reproduction, a state decision, and an agent brief or an out-of-scope record | [modes/triage.md](modes/triage.md) |

Mode resources: `modes/diagnose/` holds root-cause tracing, condition-based waiting, defense in depth and `scripts/find-polluter.sh`. `modes/loop/scripts/hitl-loop.template.sh` is a template for a human-in-the-loop reproduction loop when a step can only be performed by the user. `modes/triage/` holds the agent-brief and out-of-scope formats. The scripts need bash.

In this package, test-first implementation and fixes follow [devsuite-implement](../devsuite-implement/SKILL.md), review is [devsuite-review](../devsuite-review/SKILL.md), internal tickets come from [devsuite-planning](../devsuite-planning/SKILL.md) (tickets mode), and security findings go to the security assessment and remediation workflows. DevSuite has no tracker-setup workflow: when triage needs label or tracker conventions that the repository lacks, ask for them or record the gap.

The mode files and everything under `modes/` are shared byte-for-byte with Plugin-Skill-Studio `studio-debug`. Change them only together with Studio, and update `references/consolidation/shared-debug-modes.json` in both packages.

<a id="src-devsuite-debug-investigate"></a>
Scope boundary: investigate the reported defect and paths sharing its demonstrated
cause. Do not use this workflow for new feature design, broad code review, unrelated
cleanup or a full security audit. Route those requests to planning, review or security
assessment. A diagnosis request remains read-only unless the conversation already
authorizes implementation; uncertainty never expands the target or permissions.

Reproduce safely in the requested environment. If unsuccessful, retain known evidence and separate hypotheses from facts. Trace the smallest likely path through inputs, contracts, validation, lifecycle/state transitions, errors, timing/concurrency, configuration and recent changes. Test competing hypotheses with distinguishing checks. A warning, correlation or stack location alone is not root cause.

For an authorized fix, identify the shared mechanism and compatibility requirements; add a useful focused regression, apply the narrowest complete fix and repeat the original path. Consider sibling callers and boundary/error cases without broad cleanup. Run affected static/tests and relevant runtime checks. If dependencies or credentials are missing, name the blocked check and continue useful source analysis.

Report reproduction status, mechanism and primary evidence, fix if authorized, test results, uncertainty and the next diagnostic observation. Security-boundary candidates route to assessment/remediation; suspicion is not confirmation.
