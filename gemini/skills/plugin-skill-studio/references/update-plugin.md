# Skill: update-plugin

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/update-plugin/SKILL.md`

> Use when the user wants to inspect or update an owned local or Git-managed plugin while preserving identity, App/MCP bindings, provenance and release boundaries.

## Instructions

### Update a plugin safely

1. Identify the source that owns the requested change. Do not edit an installation cache when an editable repository exists.
2. Preserve plugin name, App IDs, MCP routes, hosting, audience and permissions unless the user explicitly requests the corresponding change.
3. Inspect both root `plugin.json` and `.codex-plugin/plugin.json`; keep shared identity and interface fields synchronized.
4. Add skills, assets, `.app.json` or `mcp.json` only when the capability requires them. Do not create parallel App and MCP routes without an explicit architecture reason.
5. Run `node scripts/plugin-studio.mjs validate <plugin-root>` and `evaluate` after editing.
6. Report what is statically proven and what still requires host, service, OAuth or deployment verification.
7. Save source without installing, committing, pushing or publishing unless the user separately authorizes those actions.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Update Plugin"
  short_description: "Update owned plugins safely"
  brand_color: "#635BFF"
  default_prompt: "Use $update-plugin to update this owned plugin while preserving identity, bindings and release boundaries."
```

### Not embedded

- `assets/plugin-studio.svg` (binary asset, not embedded)
- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
