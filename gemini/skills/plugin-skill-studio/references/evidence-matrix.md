# Skill: evidence-matrix

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/evidence-matrix/SKILL.md`

> Use when arranging explicitly supplied evidence by skill and source with an explicit snapshot date.

## Instructions

### Skills Evidence Matrix

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) first.

Run `node scripts/studio.mjs evidence-matrix <input.json>`. Inputs are asOf, freshWithinDays, skills and evidence records containing skill, source, fact and date. This is a local worksheet for supplied evidence, including adult user-controlled competency evidence. It does not fetch private data, infer ability, rank people or make hiring decisions. Distinguish recent, older and missing evidence. Future or invalid dates are not silently counted as recent. Evaluation receipts may be summarized separately; they do not turn recency into agent quality.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Skills Evidence Matrix"
  short_description: "Use when arranging explicitly supplied evidence by skill and source with an exp"
  default_prompt: "Use $evidence-matrix for this task."
```

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
