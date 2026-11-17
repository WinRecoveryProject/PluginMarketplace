---
name: local-management
description: "Use when inspecting local plugin identities, dependencies, declarations and installation evidence."
---

# Local Plugin Management

Read [Studio policy](../../references/studio-policy.md) first.

Run `local-inventory <root>`. Keep source, candidate, cache, installed and unknown classifications separate. An App ID or permission declaration does not prove account enablement, actual access or current global permission state. Inspect local receipts and effective supported host state where available. Make local installation changes only within explicit scope; never uninstall a source or same-name package as cleanup. Global account controls need native user-visible host settings; no Plugin Management connector is bundled.

## Complete installed inventory and history

When auditing everything installed, obtain the host's **full installed CLI list** (`codex plugin list --json` when that actual host CLI is available), the native personal/remote installed catalog, and native skill discovery. A filtered catalog slice can omit App-only wrappers; the CLI can omit personal remote packages. Merge exact `name@marketplace` identities from both installed surfaces. Do not count every cached directory as installed, or use the number of Apps as the plugin count. Report exact installation records separately from unique products and shared App bindings.

Use `node scripts/studio.mjs inventory-reconcile <input.json>` to reconcile data-only snapshots. Input has `current` snapshots (`label`, `kind: cli|catalog`, `data`), optional `historical` snapshots (`kind: historical`, with their original installed lists), and optional `apps` containing the separate App list. The command performs no discovery, installation or account changes. Missing inventory surfaces, load errors and version/state conflicts remain incomplete. An absent historical ID stays visible; matching display names or functionality adapted into Studio do not prove the original is installed. Document explicit account scope, replacements and user-approved removals separately. Never reinstall, rename, disconnect or merge connections merely to increase a count.
