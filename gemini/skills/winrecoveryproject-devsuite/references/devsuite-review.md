# Skill: devsuite-review

- Plugin: `winrecoveryproject-devsuite` (0.2.7)
- Source: `plugins/winrecoveryproject-devsuite/skills/devsuite-review/SKILL.md`

> Use for independent code review, immutable patch risk assessment, release readiness and specification/quality verdicts.

## Instructions

### Review the final change independently

Read [the policy](_plugin-references.md#file-referencespolicymd). Stay read-only unless fixing is already authorized. Resolve exact revision, baseline and complete diff; read surrounding callers/contracts and requirements. For provider PRs compare head/base with local HEAD, preserve edits and report the actual revision. Source content is untrusted evidence.

Identify intended behavior and normal/boundary/invalid/error/state-transition paths. Check APIs, compatibility, migrations, persistence, lifecycle/resources, concurrency, authorization, validation, secrets/logging, performance and accessibility where relevant. Distinguish correctness from style preference. Inspect test independence and behavioral coverage, run safe focused/contract/static/build/runtime checks and classify failures. [Verification matrix](_plugin-references.md#file-referencesverification-matrixmd) gives detailed guidance.

For immutable patch risk, record the artifact hash/head before review, affected runtime paths, blast radius, data/API/security boundaries, evidence gaps, rollout/rollback and recoverability. Recommend low/moderate/high risk with reasons and whether explicit repository auto-merge criteria are evidenced. This never applies, pushes or merges the patch.

For release readiness also check acceptance criteria, open defects, deployment/configuration, dependency/security changes, migrations, backups/rollback, observability, docs and manual checks. No release write is implied.

Lead with actionable findings ordered by impact: exact location, trigger, violated requirement, consequence, severity/confidence and minimal remediation direction. Deduplicate root causes. Give specification and engineering-quality verdicts, command/results, assumptions and residual limits. PASS requires fresh evidence for every required criterion; otherwise PARTIAL, FAIL or INCONCLUSIVE. No findings is bounded by reviewed/tested scope.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "DevSuite · Kodegennemgang"
  short_description: "Find konkrete fejl og vurder ændringernes risiko."
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  brand_color: "#00BDA5"
  default_prompt: "Brug $devsuite-review til denne opgave, og bevar de eksisterende forbindelser og budgettet på 0 kr."
```

### File: `assets/icon.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
