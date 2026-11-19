# Skill: toc-docs

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/toc-docs/SKILL.md`

> Use when researching WoW TOC metadata, addon load ordering and branch/build-specific manifest behavior for Workbench components.

## Instructions

### TOC Docs

Read ../game-tooling-development/references/wow-ecosystem.md and ../powershell-scaffold/references/file-types.md. Identify WoW branch/build and addon-loading behavior before making claims. Warcraft Wiki TOC_format is a community discovery seed, not official product documentation; open it before relying on it and corroborate with versioned game/source evidence when available. Never infer live Interface values from memory. Link notes to component IDs and preserve file ordering, path/encoding and metadata contracts. TOC parser support is reserved and unavailable in this release; do not report manifest validation as Lua runtime or API validation.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "WoW TOC Docs"
  short_description: "Research WoW addon manifests"
  icon_small: "./assets/skill-icon.svg"
  icon_large: "./assets/skill-icon.svg"
  brand_color: "#6B7280"
  default_prompt: "Use $toc-docs to research branch-specific WoW TOC metadata and addon load behavior."
```

### Not embedded

- `assets/skill-icon.svg` (binary asset, not embedded)
