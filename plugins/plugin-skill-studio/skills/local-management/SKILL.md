---
name: local-management
description: "Use when inspecting local plugin identities, dependencies and installation evidence, or comparing installed releases with Git and other catalogs."
---

# Local Plugin Management

Read [Studio policy](../../references/studio-policy.md) first.

Run `local-inventory <root>`. Keep source, candidate, cache, installed and unknown classifications separate. An App ID or permission declaration does not prove account enablement, actual access or current global permission state. Inspect local receipts and effective supported host state where available. Make local installation changes only within explicit scope; never uninstall a source or same-name package as cleanup. Global account controls need native user-visible host settings; no Plugin Management connector is bundled.

## Complete installed inventory and history

When auditing everything installed, obtain the host's **full installed CLI list** (`codex plugin list --json` when that actual host CLI is available), the native personal/remote installed catalog, and native skill discovery. A filtered catalog slice can omit App-only wrappers; the CLI can omit personal remote packages. Merge exact `name@marketplace` identities from both installed surfaces. Do not count every cached directory as installed, or use the number of Apps as the plugin count. Report exact installation records separately from unique products and shared App bindings.

Use `node scripts/studio.mjs inventory-reconcile <input.json>` to reconcile data-only snapshots. Input has `current` snapshots (`label`, `kind: cli|catalog`, `data`), optional `historical` snapshots (`kind: historical`, with their original installed lists), and optional `apps` containing the separate App list. The command performs no discovery, installation or account changes. Missing inventory surfaces, load errors and version/state conflicts remain incomplete. An absent historical ID stays visible; matching display names or functionality adapted into Studio do not prove the original is installed. Document explicit account scope, replacements and user-approved removals separately. Never reinstall, rename, disconnect or merge connections merely to increase a count.

## Compare installed and published versions

Use the [version audit](../../references/inventory-versions.md) to collect a scoped receipt and compare exact installed versions with the observed Git manifests. Use explicit counterpart IDs for comparisons with another catalog. The command includes available releases so users can compare without reinstalling duplicates. For a managed release, use the optional installed-file verification to compare the active cache with the committed Marketplace SHA-256 ledger. A result on one host or scope does not verify another.

On a same-workspace comparison, pass the other host’s original capture as `--against <capture.json>`. Read `peerInstallation` for exact ID, version and activation differences. Review it alongside the current host’s publication status.

## Cache paths removed by an upgrade

If an injected skill path returns ENOENT after a plugin upgrade, follow the host's
existing rediscovery rule and obtain a fresh successful full CLI installed lookup.
Use `resolve-installed <request.json>` with the exact `name@namespace`, physical
cache root and relative skill. Read [the recovery contract](../../references/installed-cache-resolution.md)
for the observed snapshot envelope and bounded retry. The helper verifies the
current exact manifest/path; it never runs commands from input, selects the highest
cached version, restores an old cache, installs or changes settings/auth. Resolution
is path evidence only: per-skill enabled state and current account access remain
separate. Studio cannot rewrite the host's already injected catalog or UI.
