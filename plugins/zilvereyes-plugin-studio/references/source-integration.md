# Source integration map

This document maps the four selected Codex source families to the independent Zilvereyes Plugin Studio implementation.

| Archived source | Studio capability | Implementation |
| --- | --- | --- |
| `skill-installer` | Inventory, preview and install skills | `scripts/skill-studio.mjs`; `zilvereyes-install-skill` |
| `skill-creator` | Create and validate skills | `scripts/skill-studio.mjs`; `zilvereyes-create-skill` |
| `plugin-eval` | Evaluate skills/plugins, prioritize findings, expose static budget and compare candidates | `scripts/plugin-studio.mjs`, `scripts/skill-studio.mjs`; evaluation skills |
| `plugin-creator` | Create/update/package local plugin candidates | `scripts/plugin-studio.mjs`; create/update skills |

## Improvements over the individual standard workflows

- One portfolio model distinguishes source, cache, installation, archive, candidate and marketplace state.
- Both plugin and skill scaffolds refuse overwrite.
- Skill installation has a non-mutating preview and produces a SHA-256 receipt after explicit installation.
- Local and GitHub skill sources pass the same validation before installation.
- Portable and Codex compatibility manifests are checked together.
- App IDs, MCP declarations, assets, skill layout and relative references are validated in one package.
- Scores never substitute for missing live App, MCP, OAuth, deployment or host evidence.
- Upstream sources remain untouched and attributable.

## Deliberate boundaries

- Studio does not copy or impersonate the proprietary Plugin Creator implementation.
- Studio does not automatically publish, install, connect OAuth, deploy or delete.
- A preview is not an installation, and a static evaluation is not a live benchmark.
