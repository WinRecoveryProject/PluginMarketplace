---
name: winrecoveryproject-devsuite
description: "WinRecoveryProject DevSuite: One development toolkit for planning, coding, security, testing, local processes and registered Codex tasks. Use when the user asks for devsuite, devsuite-convert, devsuite-debug, devsuite-environment, devsuite-handoff, devsuite-implement, devsuite-jobs, devsuite-planning, devsuite-review, devsuite-security-assess, devsuite-security-fix, devsuite-tasks work, or names the winrecoveryproject-devsuite plugin."
---

# WinRecoveryProject DevSuite

Gemini export of the `winrecoveryproject-devsuite` plugin from WinRecoveryProject/PluginMarketplace, version `0.4.0`. Source: `plugins/winrecoveryproject-devsuite`.

Fra idé til verificeret kode: planlægning, implementering, fejlfinding, tests, kodegennemgang, sikkerhed og kvalitetskontrol i én DevSuite. Følg lokale builds og processer med Windows-kompatibel styring, eller brug eksisterende registrerede Codex Tasks-miljøer, når det er bestilt. Bevarer forbindelser og skelner mellem tilgængelige værktøjer og faktisk testede resultater. Ingen nye konti eller betalte tjenester kræves til lokale funktioner.

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
| `devsuite` | Use when development spans planning, implementation, security, verification, coordination, cloud work or conversion and needs one integrated workflow. | `references/devsuite.md` |
| `devsuite-convert` | Use for authorized file conversion through free/included CloudConvert or installed local tools, with verified output and no added charges. | `references/devsuite-convert.md` |
| `devsuite-debug` | Use when observed software behavior differs from its expected contract and needs reproduction, root-cause diagnosis or an authorized fix. | `references/devsuite-debug.md` |
| `devsuite-environment` | Use for local/cloud development, repositories, packages, Docker, networking/VPN, desktop testing and environment repair. | `references/devsuite-environment.md` |
| `devsuite-handoff` | Use when development was interrupted and must resume, or when the user requests an evidence-based session handoff and precise next step. | `references/devsuite-handoff.md` |
| `devsuite-implement` | Use when authorized to implement, refactor, migrate or maintain software with bounded changes and fresh evidence. | `references/devsuite-implement.md` |
| `devsuite-jobs` | Use when running or inspecting finite local builds, tests and background processes with exact job ownership; Windows uses real host sessions. | `references/devsuite-jobs.md` |
| `devsuite-planning` | Use for scoped project planning, architecture, concise AGENTS.md instructions, task-boundary coordination or project board lifecycle; discovering intent and design before a new feature; interviewing or grilling the user to stress-test an idea, plan or decision (even if they just say "grill me" or "poke holes in my plan"); recording domain terms and ADRs; writing a buildable technical spec or an implementation plan; breaking a spec into dependency-linked tickets; turning stakeholder unknowns into a questionnaire; crafting a /goal prompt for unattended autonomous runs; or mapping a massive multi-session project through decision tickets. Do NOT use for executing an existing plan, writing code, or trivial single-file changes the user already specified. | `references/devsuite-planning.md` |
| `devsuite-review` | Use for independent code review of a branch, diff or pull request against standards and spec intent (even if the user just says "review this"); immutable patch risk assessment and release readiness; specification and quality verdicts; dispatching a bounded read-only reviewer before merge; receiving review feedback and pushing back with evidence; deciding which reviewed parts need human attention; gating any claim that work is complete, fixed or passing on fresh verification output, or independently auditing a finished delivery; and one shared quality gate: tests, lint/type/build gates and existing Linter or MegaLinter integration. Do NOT use for authoring new code or diagnosing failing runtime bugs. | `references/devsuite-review.md` |
| `devsuite-security-assess` | Use for repository or diff security audits, threat models, discovery, static triage, attack paths and controlled validation. | `references/devsuite-security-assess.md` |
| `devsuite-security-fix` | Use when fixing security findings, verifying remediation, proposing hardening, writing policy/disclosures or tracking validated findings. | `references/devsuite-security-fix.md` |
| `devsuite-tasks` | Use to discover registered Codex environments or inspect and, when explicitly requested, create or continue a durable remote Codex task. | `references/devsuite-tasks.md` |
| `devsuite-test` | Use for feature testing, broad QA, user journeys, regression checks and evidence-based verification. | `references/devsuite-test.md` |

## Example prompts

- Planlæg og implementér denne ændring, og test resultatet.
- Gennemgå projektet og ret de godkendte fejl med friske kontrolresultater.
- Vis mine registrerede Codex-miljøer uden at oprette en opgave.

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
- `references/_plugin-licenses.md`
- `references/_plugin-references.md`
- `references/_plugin-runtime.md`
- `references/_plugin-scripts.md`
- `references/_plugin-submission.md`
- `references/_plugin-tests.md`
- `references/_index.md`
