# Skill: review-decision

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/review-decision/SKILL.md`

> Use when deciding which parts of a reviewed skill or plugin require human attention.

## Instructions

### Review Decision

Read [Studio policy](../../references/studio-policy.md) first.

Consume the actual review, tests and diff. Return minimal, targeted or deep human review with the exact cited lines and reasons. Preserve blockers even when quality scores are high. No review decision grants permission; user and host authorization remain authoritative. Lack of evidence is UNKNOWN. Own fixes do not independently clear own findings.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Review Decision"
  short_description: "Use when deciding which parts of a reviewed skill or plugin require human atten"
  default_prompt: "Use $review-decision for this task."
```

### Not embedded

- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
