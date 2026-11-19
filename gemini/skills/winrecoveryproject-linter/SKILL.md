---
name: winrecoveryproject-linter
description: "WinRecoveryProjectLinter: Local read-only linting for selected source types with visible coverage, pinned tools and no paid services. Use when the user asks for lint-project, setup-linters work, or names the winrecoveryproject-linter plugin."
---

# WinRecoveryProjectLinter

Gemini export of the `winrecoveryproject-linter` plugin from WinRecoveryProject/PluginMarketplace, version `0.1.6`. Source: `plugins/winrecoveryproject-linter`.

Read-only local source checks with actual language parsers, explicit missing-tool reports and a zero-paid-services default. Explicit setup prepares only detected or selected tools in a verified per-user runtime cache that survives plugin replacement.

## How to use this skill

1. Pick the sub-skill below whose description matches the request.
2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.
3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.
4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.
5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.

## Sub-skills

| Skill | When to use | Reference |
| --- | --- | --- |
| `lint-project` | Use when linting a local project's selected source types without executing scripts or changing source, with real parser findings and explicit coverage gaps. | `references/lint-project.md` |
| `setup-linters` | Use when explicitly setting up the locally detected or selected pinned linter tools, with no paid service and no global configuration changes. | `references/setup-linters.md` |

## Example prompts

- Scan dette projekts valgte filtyper og vis dækning og fund.
- Kontrollér hvilke lokale lintværktøjer projektet behøver.
- Opsæt kun de detekterede lintværktøjer med 0 kr i tjenester.

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-adapters.md`
- `references/_plugin-assets.md`
- `references/_plugin-bin.md`
- `references/_plugin-codex-plugin.md`
- `references/_plugin-config.md`
- `references/_plugin-licenses.md`
- `references/_plugin-scripts.md`
- `references/_plugin-src.md`
- `references/_plugin-test.md`
