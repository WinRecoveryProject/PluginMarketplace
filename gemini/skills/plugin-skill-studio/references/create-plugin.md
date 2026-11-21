# Skill: create-plugin

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/create-plugin/SKILL.md`

> Use when the user wants a new local or marketplace plugin candidate built from selected sources with provenance, compatibility and no-overwrite guarantees.

## Instructions

### Create a Zilvereyes plugin candidate

1. Read `../../references/preservation-policy.md` and identify every selected source and its license.
2. Choose a new lowercase kebab-case package name rather than reusing an upstream name.
3. Create a portable root `plugin.json` and, when Codex compatibility is needed, a synchronized `.codex-plugin/plugin.json`.
4. Put reusable workflows under `skills/<unique-name>/SKILL.md`. Keep all supporting references inside the package.
5. Add `.app.json` only for verified existing App IDs. Add `mcp.json` only for an actual server route. Do not duplicate both routes without an explicit architecture reason.
6. Include contained icons and verify every referenced asset.
7. Use `node scripts/plugin-studio.mjs scaffold ...` only for a new target. It refuses overwrite.
8. Run `validate` and `evaluate`, then inspect all blocking findings before installation or publication.
9. Preserve the candidate locally until the user separately authorizes commit, push, installation, upload or replacement.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Create Plugin"
  short_description: "Create preserved plugin candidates"
  brand_color: "#635BFF"
  default_prompt: "Use $create-plugin to create a new plugin candidate without overwriting existing sources."
```

### File: `assets/plugin-studio.svg`

_Binary asset, not embedded._

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
