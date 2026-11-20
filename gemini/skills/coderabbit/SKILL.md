---
name: coderabbit
description: "CodeRabbit: AI-powered code review in Codex, powered by CodeRabbit. Use when the user asks for code-review work, or names the coderabbit plugin."
---

# CodeRabbit

Gemini export of the `coderabbit` plugin from WinRecoveryProject/PluginMarketplace, version `1.1.7-wrp.1`. Source: `plugins/coderabbit`.

Run CodeRabbit review workflows in Codex to inspect diffs, surface actionable findings, and turn review output into follow-up fixes.

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
| `code-review` | Run CodeRabbit code reviews and interpret their findings, scope, authentication failures, and completion status. Use for code reviews, PR feedback, and authorized fix-review cycles. | `references/code-review.md` |

## Example prompts

- Review my current changes and provide feedback

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
- `references/_index.md`
