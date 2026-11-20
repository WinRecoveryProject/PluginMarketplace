# Skill: improve-skill

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/improve-skill/SKILL.md`

> Use when the user wants to improve an existing Codex skill from evaluation evidence while preserving intent, invocation policy, provenance and rollback.

## Instructions

### Improve a skill from evidence

1. Evaluate the current skill with `node scripts/skill-studio.mjs evaluate <skill-root>` and retain the before report.
2. Separate required structural failures from recommended clarity, budget and progressive-disclosure improvements.
3. Confirm that the selected path is an editable source rather than an installation cache or upstream snapshot.
4. Apply only changes supported by the findings and the user's intended use cases. Do not accumulate universal rules from one example.
5. Preserve frontmatter fields and `agents/openai.yaml` policy/dependencies not involved in the requested change.
6. Re-run validation and evaluation. Compare before and after evidence, including unresolved limitations.
7. Do not install, publish, delete the original or replace another same-name skill without a separate exact request.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Improve Skill"
  short_description: "Improve skills from evidence"
  brand_color: "#635BFF"
  default_prompt: "Use $improve-skill to improve this skill from evaluation evidence while preserving intent and rollback."
```

### File: `assets/plugin-studio.svg`

_Binary asset, not embedded._

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
