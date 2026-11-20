---
name: zilvereyes-context-handoff
description: "Zilvereyes Context Handoff: Zilvereyes Context Handoff: MIT-derived personal candidate with preserved provenance and evidence-led workflows. Use when the user asks for zilvereyes-context-handoff work, or names the zilvereyes-context-handoff plugin."
---

# Zilvereyes Context Handoff

Gemini export of the `zilvereyes-context-handoff` plugin from WinRecoveryProject/PluginMarketplace, version `0.3.5+zilvereyes.1`. Source: `plugins/zilvereyes-context-handoff`.

Zilvereyes Context Handoff: MIT-derived personal candidate with preserved provenance and evidence-led workflows. Local validation, installation and publication are separate states.

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
| `zilvereyes-context-handoff` | Detect context-window pressure and transfer an in-progress Codex task into a fresh thread without weakening acceptance criteria or evidence. Use automatically when a Context Handoff lifecycle message reports compaction, and whenever the user asks to hand off, continue in a new session or thread, avoid context overflow, or an active task shows high context usage, compaction, summary reliance, lost decisions, repeated rereads, or context-caused rework. Supports cross-repository use, safe checkpointing, validated handoff packets, Codex thread creation and navigation when authorized, and destination regression sentinels. | `references/zilvereyes-context-handoff.md` |

## Example prompts

- Lav et verificerbart checkpoint for denne opgave.
- Forbered en handoff-pakke med alle accepterede krav.

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
- `references/_plugin-hooks.md`
- `references/_index.md`
