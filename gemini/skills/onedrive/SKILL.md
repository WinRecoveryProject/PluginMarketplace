---
name: onedrive
description: "OneDrive: OneDrive files through the existing registered App and its hosted CloudStorage Portal MCP connection. Use when the user asks for onedrive, onedrive-setup work, or names the onedrive plugin."
---

# OneDrive

Gemini export of the `onedrive` plugin from WinRecoveryProject/PluginMarketplace, version `1.2.2`. Source: `plugins/onedrive`.

Læs og administrér OneDrive-filer: mapper, søgning, download, upload, flytning, kopiering, versioner og deling gennem den eksisterende CloudStorage Portal-server.

## How to use this skill

1. Pick the sub-skill below whose description matches the request.
2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.
3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.
4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.
5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.
6. Instructions sometimes name another file by its original path (for example `../../shared/x.md` or `references/y.md`). Those paths do not exist in this upload: resolve them against the `Source:`/`File:` path of the text you are reading and look them up in `references/_index.md`, which says which reference file and section holds the content.

## Sub-skills

| Skill | When to use | Reference |
| --- | --- | --- |
| `onedrive` | Use when reading or managing the authenticated OneDrive account through its existing App: files, folders, search, transfers, sharing, versions and quota. | `references/onedrive.md` |
| `onedrive-setup` | Use when configuring, verifying or diagnosing the existing OneDrive App's Microsoft login, hosted MCP tools, account identity or drive access without creating another connection. | `references/onedrive-setup.md` |

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
- `references/_plugin-references.md`
- `references/_index.md`
