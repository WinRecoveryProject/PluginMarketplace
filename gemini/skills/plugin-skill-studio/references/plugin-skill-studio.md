# Skill: plugin-skill-studio

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/plugin-skill-studio/SKILL.md`

> Use when building, discovering, reviewing, importing or managing plugins and skills with the self-contained Studio.

## Instructions

### Plugin-Skill-Studio

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) first.

Read the local capability registry first. Route only the relevant workflow; do not load the complete catalog. Use `node scripts/studio.mjs capabilities` and `route <request>` to locate the local skill and supporting module. All required workflows are bundled. Never resolve companion plugins or external skills. A missing host terminal/browser is a missing host capability, not a reason to install a plugin. Source records in references/integration-registry.json distinguish adapted and independently implemented behavior. Preserve user intent and the entire worklist. Context Handoff is a separate product and is not bundled.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Plugin-Skill-Studio"
  short_description: "Use when building, discovering, reviewing, importing or managing plugins and sk"
  default_prompt: "Use $plugin-skill-studio for this task."
```

### Not embedded

- `assets/plugin-studio.svg` (binary asset, not embedded)
- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
