# Skill: devsuite-handoff

- Plugin: `winrecoveryproject-devsuite` (0.5.0)
- Source: `plugins/winrecoveryproject-devsuite/skills/devsuite-handoff/SKILL.md`

> Use when development was interrupted and must resume, or when the user requests an evidence-based session handoff and precise next step.

## Instructions

### Resume or hand over actual state

Read [the policy](_plugin-references.md#file-referencespolicymd). Recover original goal, accepted decisions and authorized scope from conversation, instructions and authoritative docs. Inspect status/diff, relevant commits, untracked files, incomplete markers, outputs and focused tests. Check previous summaries against evidence. Preserve valid user changes.

Distinguish completed from unfinished work with the smallest safe verification. If already complete, report evidence without speculative edits. Otherwise continue the smallest coherent milestone. Prefer observed behavior/current evidence over stale notes; clarify only when conflicting intent or data-loss risk changes the next step. Do not reset edits, rewrite history, upgrade dependencies or broadly clean temporary files.

A handoff contains goal, revision/environment, files/behavior changed, accepted architecture/contracts, commands/outcomes, verified/unverified claims, ordered remaining tasks, blockers/risks and exact next safe action. Link artifacts without credentials/full logs. Keep stable project docs separate from private transcripts. When board coordination is enabled, release own exact completed/stopped claim or explicitly retain bounded unfinished ownership; time or silence never proves another owner stale.

Report what was resumed/handed off and evidence. A summary alone is not completion. Native chat handoff/create/message actions require user authorization; producing a local handoff never automatically sends it.

Use the integrated [process jobs](devsuite-jobs.md) for local workload lifecycle and [Codex Tasks](devsuite-tasks.md) for registered remote tasks. Discover actual capabilities and retain existing handles; never restart from a missing receipt alone.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "DevSuite · Fortsættelse"
  short_description: "Genoptag fra verificeret status og bevar arbejdet."
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  brand_color: "#00BDA5"
  default_prompt: "Brug $devsuite-handoff til denne opgave, og bevar de eksisterende forbindelser og budgettet på 0 kr."
```

### File: `assets/icon.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
