---
name: studio-debug
description: "Use when a failure, flaky behavior, performance regression or runtime exception lacks a demonstrated root cause and needs reproduction and falsifiable experiments; when the user reports broken behavior, failing tests or flaky CI, or says \"debug this\" / \"diagnose this\", even without an error message, so a tight automated feedback loop must reproduce it first; or when incoming issues, external bug reports, feature requests or contributor pull requests need classification, reproduction, out-of-scope rejection or an agent-ready brief (\"triage these issues\"). Do NOT use for routine test-driven feature development, or for internal tickets already produced by the planning tickets workflow."
---

# Studio Debug

<a id="policy"></a>
Read [Studio policy](../../references/studio-policy.md) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](../../references/integration-registry.json); never load companion plugins.

Pick one mode, read only that mode file, and follow it. Diagnosis alone never authorizes source edits.

| Mode | Use when | Read |
|---|---|---|
| <a id="mode-diagnose"></a>diagnose | A failure, flake or regression lacks a demonstrated cause: preserve evidence, run the evidence loop, scale lanes deliberately, fix only when authorized | [modes/diagnose.md](modes/diagnose.md) |
| <a id="mode-loop"></a>loop | A hard bug, flaky CI or performance regression first needs a fast, deterministic red loop, then minimization, 3–5 ranked hypotheses, tagged probes, a regression test and cleanup | [modes/loop.md](modes/loop.md) |
| <a id="mode-triage"></a>triage | Incoming issues or external pull requests need classification, redundancy screening, reproduction, a state decision, and an agent brief or an out-of-scope record | [modes/triage.md](modes/triage.md) |

Mode resources: `modes/diagnose/` holds root-cause tracing, condition-based waiting, defense in depth and `scripts/find-polluter.sh`. `modes/loop/scripts/hitl-loop.template.sh` is a template for a human-in-the-loop reproduction loop when a step can only be performed by the user. `modes/triage/` holds the agent-brief and out-of-scope formats.

In this package, test-first implementation is `tdd`, review is `studio-review`, internal tickets come from `studio-plan` (tickets mode), and tracker and triage-label conventions are set up by `setup-engineering-workflows`.

The mode files and everything under `modes/` are shared byte-for-byte with DevSuite's `devsuite-debug`. Change them only together with DevSuite, and update `references/consolidation/shared-debug-modes.json` in both packages.
