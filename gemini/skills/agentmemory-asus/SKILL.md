---
name: agentmemory-asus
description: "AgentMemory-ASUS: Use the existing AgentMemory-ASUS App for scoped memory lookup, diagnostics and user-authorized memory changes. Use when the user asks for agentmemory-asus work, or names the agentmemory-asus plugin."
---

# AgentMemory-ASUS

Gemini export of the `agentmemory-asus` plugin from WinRecoveryProject/PluginMarketplace, version `1.0.0`. Source: `plugins/agentmemory-asus`.

Find tidligere beslutninger og projektviden gennem din eksisterende AgentMemory-ASUS-forbindelse. Kontrollér forbindelsens status, og gem eller ret kun hukommelse inden for den opgave, du faktisk har godkendt. Denne Marketplace-pakke tilføjer én fokuseret arbejdsgang; den erstatter hverken Appen, serveren eller dine eksisterende forbindelser.

## How to use this skill

1. Pick the sub-skill below whose description matches the request.
2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.
3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.
4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.
5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.

## Sub-skills

| Skill | When to use | Reference |
| --- | --- | --- |
| `agentmemory-asus` | Use when the user requests shared project memory, earlier decisions, diagnostics or an explicitly authorized memory update through the existing AgentMemory-ASUS App. | `references/agentmemory-asus.md` |

## Example prompts

- Kontrollér min eksisterende AgentMemory-ASUS-forbindelse uden at ændre data.
- Find relevant tidligere projektviden i AgentMemory-ASUS.
- Gem denne konkrete beslutning i det angivne projekt uden credentials eller private nøgler.

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
- `references/_plugin-references.md`
