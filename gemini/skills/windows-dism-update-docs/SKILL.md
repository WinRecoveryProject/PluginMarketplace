---
name: windows-dism-update-docs
description: "Windows Dism Update Docs: Local Windows servicing knowledge assistant for DISM, .NET, Defender, ESU and Home/Pro integration evidence. Use when the user asks for windows-dism-update-docs work, or names the windows-dism-update-docs plugin."
---

# Windows Dism Update Docs

Gemini export of the `windows-dism-update-docs` plugin from WinRecoveryProject/PluginMarketplace, version `0.1.4`. Source: `plugins/windows-dism-update-docs`.

Find and maintain the private Windows-Dism-Update-Docs library, verify Microsoft sources and distinguish documented methods from tested image results. Documentation only; no automatic servicing or activation.

## How to use this skill

1. Pick the sub-skill below whose description matches the request.
2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.
3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.
4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.
5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.

## Sub-skills

| Skill | When to use | Reference |
| --- | --- | --- |
| `windows-dism-update-docs` | Find, verify and maintain Windows DISM and update-integration documentation for WindowsMaintainanceToolkit, including Windows 10 Home/Pro, .NET, Defender, ESU and setup automation. Use for source audits, integration requirements and interpreting servicing or VM evidence; not as authorization to install updates or modify images. | `references/windows-dism-update-docs.md` |

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
