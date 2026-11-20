# Skill: devsuite

- Plugin: `winrecoveryproject-devsuite` (0.2.7)
- Source: `plugins/winrecoveryproject-devsuite/skills/devsuite/SKILL.md`

> Use when development spans planning, implementation, security, verification, coordination, cloud work or conversion and needs one integrated workflow.

## Instructions

### WinRecoveryProject DevSuite

Read [the policy](_plugin-references.md#file-referencespolicymd). Select one owned workflow for the current phase. Use `python scripts/devsuite.py route "request"` from the plugin root for deterministic suggestions and `capabilities` for the preservation map. The helper never executes user text. Load only the selected skill and relevant references.

- Project discovery, specifications, agent guidance, task ownership: [planning](devsuite-planning.md).
- Authorized coding and refactoring: [implementation](devsuite-implement.md). Defect diagnosis: [debugging](devsuite-debug.md).
- Feature tests or broad QA: [testing](devsuite-test.md). Independent review, patch risk or release readiness: [review](devsuite-review.md).
- Repository/diff audit, threat modeling, discovery, triage and validation: [security assessment](devsuite-security-assess.md).
- Security fixes, hardening, policy, writeups and tracking: [security remediation](devsuite-security-fix.md).
- Shared checks and existing Linter integration: [quality](devsuite-quality.md).
- Interrupted work and session handoff: [handoff](devsuite-handoff.md).
- Local/cloud workspaces, desktop, networking and tools: [environment](devsuite-environment.md).
- Local builds, background job status/logs/results and safe cancellation: [process jobs](devsuite-jobs.md).
- Registered environments and explicitly requested remote tasks: [Codex Tasks](devsuite-tasks.md).
- File transformation: [conversion](devsuite-convert.md).

Carry acceptance criteria and remaining work across phases. Avoid duplicate source workflows and repeated planning/review ceremonies. Local implementation, provider completion, installation and publication are separate claims. [Providers](_plugin-references.md#file-referencesprovidersmd) describes real connections and limitations.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "DevSuite"
  short_description: "Planlæg, byg og kontrollér kode i ét værktøj."
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  brand_color: "#00BDA5"
  default_prompt: "Brug $devsuite til denne opgave, og bevar de eksisterende forbindelser og budgettet på 0 kr."
```

### File: `assets/icon.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
