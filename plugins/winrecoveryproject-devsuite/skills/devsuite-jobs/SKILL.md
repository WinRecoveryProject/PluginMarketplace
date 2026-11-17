---
name: devsuite-jobs
description: "Use when running or inspecting finite local builds, tests and background processes with exact job ownership; Windows uses real host sessions."
---

# Run once, follow the real process

Read [the policy](../../references/policy.md) and [execution routes](../../references/execution.md). Recover the approved workload, foreground argv and absolute working directory. An optional `python scripts/devsuite.py process-plan request.json` checks the proposed route without executing it. Never put credentials in arguments or logs.

On Windows use the actual host execution tool and its returned session handle. Resume that handle for output and final exit status. A timeout is an observation limit: do not launch a duplicate. For deliberate native detachment use a reviewed foreground payload with hidden window, private output/error paths, final exit receipt and PID plus creation time/executable identity. Do not claim POSIX CPJ support, a CPJ job ID, automatic notification, reboot survival or proven host-exit durability.

On Linux/macOS a qualifying detached workload may use the existing verified Codex Process Jobs controller. Discover the real installed controller and current schema; preserve its private state. Its controller owns start/status/tail/result/rerun/cancel and completion delivery. Respect its launch-turn release boundary; continue only independent work after launch. Do not transplant its POSIX process groups to Windows.

For status, bounded logs and results, require the exact previously observed handle/job identity and distinguish running, failed, finished and unknown. Check identity before cancellation; never kill an inferred tree or a reused PID. Critical work needs explicit cancellation authority. Rerun only after a terminal result and a current request authorizing the workload; a lost receipt or timeout never justifies retrying the launch.

Keep process lifecycle separate from [remote Codex Tasks](../devsuite-tasks/SKILL.md) and [planning/coordination](../devsuite-planning/SKILL.md). Existing local work needs no new App connection or companion skill package.
