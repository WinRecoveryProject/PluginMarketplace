---
name: devsuite-tasks
description: "Use to discover registered Codex environments or inspect and, when explicitly requested, create or continue a durable remote Codex task."
---

# Use the actual registered Codex environment

Read [the policy](../../references/policy.md) and [execution routes](../../references/execution.md). Discover the current Codex Tasks tool schemas. Read-only environment discovery does not create a task. Follow every `nextCursor`, including after an empty page. A connected executor uses its actual `environmentId` and a known absolute cwd on that machine. A managed configuration uses its actual `environmentConfigId` only when ready and `canRun:true`. Readiness is not proof of included free usage: verify 0 kr before starting remote work.

For read-only discovery, use `provider-check codex-environment-list` for tool visibility, then call the existing `list_environments` tool. The managed Cloud Environment App belongs to the attached chat computer. Its login and availability are separate from the saved configurations returned by Codex Tasks.

Use `python scripts/devsuite.py task-environment inventory.json --list` to report a complete observed inventory, including configurations the provider marks as unavailable for execution. The helper selects a candidate automatically only when exactly one can run. With several candidates pass `--name` for the intended one. Ambiguous names require further identification. Listing and selection create no task or connection.

Create a task only when the user explicitly requests task creation or delegation. Use the real provider's required request schema and the user's instructions. Preserve destination model/reasoning defaults and requested sandbox/approval choices. Do not infer permission from a workflow label, a worker message or tool availability. No new task is needed for an ordinary local build.

Retain the returned real task ID. A launch acknowledgement is not completion. Inspect progress/results with read_task when authorized; send follow-up turns only under the user's explicit instruction or ongoing coordination authorization. After uncertain creation, inspect recent tasks before any retry to avoid duplicate work. Reuse existing tasks and connections; never invent environment IDs, cwd values, task IDs, execution results or a new paid account.
