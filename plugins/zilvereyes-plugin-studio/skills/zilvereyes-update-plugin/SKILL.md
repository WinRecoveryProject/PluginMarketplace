---
name: zilvereyes-update-plugin
description: Use when the user wants to inspect or update an owned local or Git-managed plugin while preserving identity, App/MCP bindings, provenance and release boundaries.
---

# Update a plugin safely

1. Identify the source that owns the requested change. Do not edit an installation cache when an editable repository exists.
2. Preserve plugin name, App IDs, MCP routes, hosting, audience and permissions unless the user explicitly requests the corresponding change.
3. Inspect both root `plugin.json` and `.codex-plugin/plugin.json`; keep shared identity and interface fields synchronized.
4. Add skills, assets, `.app.json` or `mcp.json` only when the capability requires them. Do not create parallel App and MCP routes without an explicit architecture reason.
5. Run `node scripts/plugin-studio.mjs validate <plugin-root>` and `evaluate` after editing.
6. Report what is statically proven and what still requires host, service, OAuth or deployment verification.
7. Save source without installing, committing, pushing or publishing unless the user separately authorizes those actions.
