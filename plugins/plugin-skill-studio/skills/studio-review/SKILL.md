---
name: studio-review
description: "Use when reviewing changed code, a branch, diff or pull request against standards and spec intent (even if the user just says \"review this\"); dispatching a bounded read-only reviewer before merge; receiving review feedback and pushing back with evidence; deciding which parts of a reviewed skill or plugin need human attention; gating any claim that work is complete, fixed or passing on fresh verification output; or independently auditing a finished delivery, completion claim or release readiness. Do NOT use for authoring new code, diagnosing failing runtime bugs, or evaluating skills and plugins (use studio-quality)."
---

# Studio Review

<a id="policy"></a>
Read [Studio policy](../../references/studio-policy.md) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](../../references/integration-registry.json); never load companion plugins.

Pick one mode, read only that mode file, and follow it.

| Mode | Use when | Read |
|---|---|---|
| <a id="mode-code"></a>code | Review a branch, diff, PR or merge-base change against repository standards and spec intent | [modes/code.md](modes/code.md) |
| <a id="mode-request"></a>request | Dispatch a bounded read-only reviewer for completed work and preserve verified findings | [modes/request.md](modes/request.md) |
| <a id="mode-receive"></a>receive | Verify review feedback before implementing it and push back with evidence when a claim is wrong | [modes/receive.md](modes/receive.md) |
| <a id="mode-decide"></a>decide | Decide which parts of a reviewed skill or plugin need minimal, targeted or deep human review | [modes/decide.md](modes/decide.md) |
| <a id="mode-verify"></a>verify | Gate a completion claim on fresh verification output, or independently audit a finished delivery | [modes/verify.md](modes/verify.md) |

The mode files are shared byte-for-byte with DevSuite's `devsuite-review`. Change them only together with DevSuite, and update `references/consolidation/shared-review-modes.json` in both packages.
