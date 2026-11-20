# Skill: skill-eval

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/skill-eval/SKILL.md`

> Use when evaluating an agent skill, testing its triggers or behavior, comparing revisions, or explaining its budget.

## Instructions

### Skill Eval

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) first.

Run `node scripts/studio.mjs skill-eval <target> --mode static --format markdown`. Read structural findings, risks, evidence, budget estimates and UNKNOWN measurements separately. A high score cannot override blockers. For practical testing, create a benchmark configuration with `benchmark-init <target>`, supply scenario-specific fixtures and verifiers, then use `skill-eval <target> --mode benchmark --config <config> --out <results>`. Do not execute a reviewed artifact during static analysis. Isolation and existing authentication must pass preflight. If they cannot, retain the static report and show the exact benchmark blocker. Use baseline and skill runs against identical fixtures. Use held-out trigger cases when improving descriptions. Never present a simulated runner test as a real model evaluation.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Skill Eval"
  short_description: "Use when evaluating an agent skill, testing its triggers or behavior, comparing"
  default_prompt: "Use $skill-eval for this task."
```

### Not embedded

- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
