---
name: component-forge
description: "Component Forge: Archive-first PowerShell component extraction, dependency contracts, composition and evidence-based documentation workflows. Use when the user asks for component-archive, component-docs work, or names the component-forge plugin."
---

# Component Forge

Gemini export of the `component-forge` plugin from WinRecoveryProject/PluginMarketplace, version `0.1.3`. Source: `plugins/component-forge`.

Guide an agent through scoped source inventory, dependency-aware component extraction, archive-first generation and composition. Includes contracts and evaluation scenarios. Does not supply an automatic parser or servicing engine.

## How to use this skill

1. Pick the sub-skill below whose description matches the request.
2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.
3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.
4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.
5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.

## Sub-skills

| Skill | When to use | Reference |
| --- | --- | --- |
| `component-archive` | Use when extracting reusable PowerShell fragments, untangling shared variables, generating code from a component archive, or composing registered functions, scripts and modules. | `references/component-archive.md` |
| `component-docs` | Use when researching documentation for PowerShell components or extending XML, Batch, CMD and Lua documentation with verified applicability and source records. | `references/component-docs.md` |

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
