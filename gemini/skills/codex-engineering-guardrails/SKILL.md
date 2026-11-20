---
name: codex-engineering-guardrails
description: "Codex Engineering Guardrails: Skills-only bundle for scoped software implementation and independent code verification in Codex. Use when the user asks for code-verification, code-work work, or names the codex-engineering-guardrails plugin."
---

# Codex Engineering Guardrails

Gemini export of the `codex-engineering-guardrails` plugin from WinRecoveryProject/PluginMarketplace, version `1.1.1`. Source: `plugins/codex-engineering-guardrails`.

Pairs code-work and code-verification for strict scope control, test-backed changes, adaptive parallelism, and fresh independent evidence.

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
| `code-verification` | Independently review, test, diagnose, and verify software against explicit requirements, repository standards, and material risks using traceable fresh evidence. Use when Codex is asked to review code or a diff, inspect a pull request, diagnose a failing check without changing code, run or assess tests, validate a bug fix or feature, audit code quality, identify coverage gaps, judge release readiness, or report whether an implementation is correct. Default to read-only source inspection and existing checks; create or change tests only when explicitly requested, and do not modify production code unless the user separately authorizes a fix. | `references/code-verification.md` |
| `code-work` | Implement, modify, refactor, debug, and maintain software with strict scope control, repository-aware planning, root-cause analysis, incremental test-backed changes, adaptive parallelism, and fresh verification evidence. Use when Codex is asked to write or change production code, fix a defect, implement a feature, refactor a component, perform a migration, or complete another coding task that authorizes source changes. Use code-verification instead when the primary request is read-only review, testing, diagnosis, audit, or validation. | `references/code-work.md` |

## Example prompts

- Implement this change with strict scope control and fresh verification.
- Review this code independently and report evidence-backed findings.
- Plan safe parallel work, then verify the integrated result.

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
- `references/_index.md`
