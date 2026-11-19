---
name: codex-dev-workflows
description: "Codex Dev Workflows: Reusable software-development workflows and platform guidance for Codex. Use when the user asks for bug-investigation, code-review, comprehensive-qa, create-agent-instructions, feature-development, feature-testing, new-project, orchestrate-work, platform-guidance, pre-release-review, resume-interrupted-task, session-handoff work, or names the codex-dev-workflows plugin."
---

# Codex Dev Workflows

Gemini export of the `codex-dev-workflows` plugin from WinRecoveryProject/PluginMarketplace, version `0.4.2`. Source: `plugins/codex-dev-workflows`.

A skills-only library for planning, orchestration, feature work, testing, comprehensive QA, debugging, review, release readiness, and handoffs.

## How to use this skill

1. Pick the sub-skill below whose description matches the request.
2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.
3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.
4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.
5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.

## Sub-skills

| Skill | When to use | Reference |
| --- | --- | --- |
| `bug-investigation` | Reproduce, isolate, fix, and verify a software defect with evidence and minimal scope. | `references/bug-investigation.md` |
| `code-review` | Review a change set for correctness, regressions, security, maintainability, and missing tests without changing unrelated code. | `references/code-review.md` |
| `comprehensive-qa` | Perform a broad, evidence-based QA pass across software behavior, user journeys, state, regressions, accessibility, and operational risk. | `references/comprehensive-qa.md` |
| `create-agent-instructions` | Create or improve concise repository instructions that guide coding agents to authoritative project documentation and validation. | `references/create-agent-instructions.md` |
| `feature-development` | Implement a focused software feature with scoped investigation, verification, and a clear completion report. | `references/feature-development.md` |
| `feature-testing` | Test a recently implemented feature for intended behavior, edge cases, regressions, and meaningful missing coverage. | `references/feature-testing.md` |
| `new-project` | Turn a new software idea into a scoped, buildable project plan before implementation begins. | `references/new-project.md` |
| `orchestrate-work` | Coordinate complex, divisible work by planning, delegating independent tasks in parallel, integrating the results, and verifying the complete outcome. | `references/orchestrate-work.md` |
| `platform-guidance` | Load focused development and QA guidance for Flutter, JavaScript/TypeScript, Python, or Laravel/PHP projects. | `references/platform-guidance.md` |
| `pre-release-review` | Assess whether a software change is ready to release by checking scope, validation, risk, operations, and rollback readiness. | `references/pre-release-review.md` |
| `resume-interrupted-task` | Safely resume interrupted software work by reconstructing the current state from repository evidence, preserving valid changes, and making the next step explicit. | `references/resume-interrupted-task.md` |
| `session-handoff` | Create a concise, evidence-based handoff that lets the next development session continue safely without re-discovering context. | `references/session-handoff.md` |

## Example prompts

- Help me plan a new software project.
- Test the feature I just implemented.
- Review my changes for release readiness.

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
- `references/_plugin-shared.md`
