# Skill: skill-walkthrough

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/skill-walkthrough/SKILL.md`

> Use when explaining what a skill does, what it can touch, and how to review it.

## Instructions

### Skill Walkthrough

Read [Studio policy](../../references/studio-policy.md) first.

Explain in the user's language: purpose and triggers; required inputs; workflow and outputs; tools/files/network it may touch; verification and authorization boundaries. Distinguish promises from demonstrated behavior. Cite local lines. Do not execute the skill or replace a technical review with an explanation.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Skill Walkthrough"
  short_description: "Use when explaining what a skill does, what it can touch, and how to review it."
  default_prompt: "Use $skill-walkthrough for this task."
```

### Not embedded

- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
