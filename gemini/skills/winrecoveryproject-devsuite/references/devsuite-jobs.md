# Skill: devsuite-jobs

- Plugin: `winrecoveryproject-devsuite` (0.7.0)
- Source: `plugins/winrecoveryproject-devsuite/skills/devsuite-jobs/SKILL.md`

> Use when running or inspecting finite local builds, tests and background processes with exact job ownership; Windows uses real host sessions.

## Instructions

### Run once, follow the real process

Read [the policy](_plugin-references.md#file-referencespolicymd) and [execution routes](_plugin-references.md#file-referencesexecutionmd). Recover the approved workload, foreground argv and absolute working directory. An optional `python scripts/devsuite.py process-plan request.json` checks the proposed route without executing it. Never put credentials in arguments or logs.

On Windows use the actual host execution tool and its returned session handle. Resume that handle for output and final exit status. A timeout is an observation limit: do not launch a duplicate. For deliberate native detachment use a reviewed foreground payload with hidden window, private output/error paths, final exit receipt and PID plus creation time/executable identity. Do not claim POSIX CPJ support, a CPJ job ID, automatic notification, reboot survival or proven host-exit durability.

On Linux/macOS a qualifying detached workload may use the existing verified Codex Process Jobs controller. Discover the real installed controller and current schema; preserve its private state. Its controller owns start/status/tail/result/rerun/cancel and completion delivery. Respect its launch-turn release boundary; continue only independent work after launch. Do not transplant its POSIX process groups to Windows.

For status, bounded logs and results, require the exact previously observed handle/job identity and distinguish running, failed, finished and unknown. Check identity before cancellation; never kill an inferred tree or a reused PID. Critical work needs explicit cancellation authority. Rerun only after a terminal result and a current request authorizing the workload; a lost receipt or timeout never justifies retrying the launch.

Keep process lifecycle separate from [remote Codex Tasks](devsuite-tasks.md) and [planning/coordination](devsuite-planning.md). Existing local work needs no new App connection or companion skill package.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "DevSuite · Processer"
  short_description: "Følg builds, logs og resultater med korrekt ejerskab."
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  brand_color: "#00BDA5"
  default_prompt: "Brug $devsuite-jobs til denne opgave, og bevar de eksisterende forbindelser og budgettet på 0 kr."
```

### File: `assets/icon.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
