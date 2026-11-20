# Skill: catalog

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/catalog/SKILL.md`

> Use when finding local skills or analyzing public directory snapshots, listing coverage and observed changes.

## Instructions

### Plugin and Skill Discovery

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) first.

Use `catalog-snapshot <source>`, `catalog-search <snapshot.json> <query>` and `catalog-compare <before.json> <after.json>`. Accept local packages, imported JSON and explicit accessible public URLs. Store observation date and source. No private endpoints, Plugins Radar connector, external skill CLI or historical database is required. Missing historical rank is UNKNOWN. Install counts and stars are popularity signals; inspect provenance, license, behavior, risk and task tests before recommending. Never auto-install search results.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Plugin and Skill Discovery"
  short_description: "Use when finding local skills or analyzing public directory snapshots, listing "
  default_prompt: "Use $catalog for this task."
```

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
