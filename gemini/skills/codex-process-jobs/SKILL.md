---
name: codex-process-jobs
description: "Codex Process Jobs: Launch and manage durable, detached local process jobs from Codex. Use when the user asks for cancel, rerun, result, start, status, tail work, or names the codex-process-jobs plugin."
---

# Codex Process Jobs

Gemini export of the `codex-process-jobs` plugin from WinRecoveryProject/PluginMarketplace, version `0.5.3-wrp.2`. Source: `plugins/codex-process-jobs`.

Launch long-running local commands as tracked detached process groups, inspect bounded output, wait for completion, retrieve results, and cancel safely on macOS or Linux. On Windows, use the bundled host-managed execution fallback; the CPJ controller remains macOS/Linux-only.

## How to use this skill

1. Pick the sub-skill below whose description matches the request.
2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.
3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.
4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.
5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.
6. Instructions sometimes name another file by its original path (for example `../../shared/x.md` or `references/y.md`). Those paths do not exist in this upload: resolve them against the `Source:`/`File:` path of the text you are reading and look them up in `references/_index.md`, which says which reference file and section holds the content.

## Sub-skills

| Skill | When to use | Reference |
| --- | --- | --- |
| `cancel` | Safely request termination of a tracked detached process group using PID identity validation and a SIGTERM-to-SIGKILL grace period. Use only when the user asks to stop a job; critical repair, migration, firmware, or destructive jobs require explicit risk-aware approval and --force. | `references/cancel.md` |
| `rerun` | Launch a finished Codex Process Jobs record again as a new detached job using its validated persisted argv, working directory, and execution mode. Use only when the user explicitly asks or approves rerunning a specific completed, failed, or cancelled build, test, benchmark, inference run, data job, or repair. | `references/rerun.md` |
| `result` | Retrieve output for jobs and automatic CPJ completion notices. | `references/result.md` |
| `start` | Launch an ordinary finite local workload as a durable detached process job, then release the assigning Codex turn instead of monitoring it. Use proactively for downloads, builds, test suites, evaluations, benchmarks, inference/model A/B runs, data jobs, and repairs whose underlying work may exceed 60 seconds or has uncertain duration. The user-visible parent must launch the job directly; never delegate local process execution or monitoring to a subagent. | `references/start.md` |
| `status` | Inspect active and recent detached process jobs in a later user-requested turn, retrieve a lightweight activity preview, or wait once when explicitly requested. Use for questions such as "how's the build going?", later user-requested checks of test, inference, data-processing, or repair progress, or diagnosis of a disappeared worker. Never use it to monitor a job from the same turn that launched it or merely because an automatic Goal continuation arrived. | `references/status.md` |
| `tail` | Read the latest bounded stdout or stderr from a tracked detached process job. Use to inspect live build progress, benchmark output, test failures, repair diagnostics, or other command output without loading the entire persisted log. | `references/tail.md` |

## Example prompts

- Run this build as a tracked background job.
- Show my active and recent process jobs.
- Open the result of the latest finished job.

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
- `references/_plugin-references.md`
- `references/_plugin-scripts.md`
- `references/_index.md`
