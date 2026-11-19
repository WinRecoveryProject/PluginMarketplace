---
name: codex-coordinator
description: "Codex Coordinator: Coordinate parallel Codex tasks in one shared checkout with a small active-only boundary board. Use when the user asks for codex-coordinator work, or names the codex-coordinator plugin."
---

# Codex Coordinator

Gemini export of the `codex-coordinator` plugin from WinRecoveryProject/PluginMarketplace, version `0.4.0`. Source: `plugins/codex-coordinator`.

Keep parallel Codex tasks moving in one shared checkout without duplicate work or crossed edits. Codex Coordinator gives each task a visible, bounded lane, reuses related tasks before creating new ones, and stays lightweight—no background manager, polling loop, transcript store, extra worktrees, or required pull requests. An optional manual, read-only Doctor checks package compatibility and recommends update or reinstall when something is broken.

## How to use this skill

1. Pick the sub-skill below whose description matches the request.
2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.
3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.
4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.
5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.

## Sub-skills

| Skill | When to use | Reference |
| --- | --- | --- |
| `codex-coordinator` | Keeps parallel Codex tasks in one shared Git checkout inside clear, visible boundaries. Uses a small local active-claim board and an optional user-invoked, goal-scoped Coordinator; it does not create background management, a heartbeat, scheduler, transcript store, or mandatory pull-request workflow. | `references/codex-coordinator.md` |

## Example prompts

- Help my Codex tasks move in parallel with less duplicate work and fewer crossed edits
- Show me who is working on what and flag work that may collide
- Coordinate this goal across the right existing tasks and keep each task focused

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
- `references/_plugin-hooks.md`
- `references/_plugin-scripts.md`
