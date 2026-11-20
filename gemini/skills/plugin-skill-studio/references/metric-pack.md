# Skill: metric-pack

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/metric-pack/SKILL.md`

> Use when adding task-specific verifiers and metrics to a plugin or skill evaluation.

## Instructions

### Metric Pack Designer

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) first.

Define measurable requirements, representative fixtures, positive/negative cases, artifact assertions and verifier argument arrays. Keep fit, safety, quality, runtime success, latency and observed tokens separate. Run custom verifiers only for explicitly requested practical tests in copied fixtures. Do not execute metric packs while statically inspecting them. Use fixed scenario IDs and an untouched held-out set to compare revisions.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Metric Pack Designer"
  short_description: "Use when adding task-specific verifiers and metrics to a plugin or skill evalua"
  default_prompt: "Use $metric-pack for this task."
```

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
