---
name: powershell-workbench
description: "PowerShell Workbench: Portable PowerShell and mixed-language scaffolding, refactoring, discovery, agent harnesses, game tooling, and opt-in quality workflows. Use when the user asks for bash-docs, batch-docs, cmd-docs, csharp-docs, css-docs, game-tooling-development, html-docs, javascript-docs, json-docs, lua-docs, microsoft-dism-docs, microsoft-update-docs work, or names the powershell-workbench plugin."
---

# PowerShell Workbench

Gemini export of the `powershell-workbench` plugin from WinRecoveryProject/PluginMarketplace, version `0.9.0-beta.6`. Source: `plugins/powershell-workbench`.

Generate reusable PowerShell artifacts, discover and refactor single or multi-project workspaces, diagnose toolchains and patch transport, build safe PowerShell agent harnesses, package the plugin for another machine, and run quality or security gates only when requested.

## How to use this skill

1. Pick the sub-skill below whose description matches the request.
2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.
3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.
4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.
5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.

## Sub-skills

| Skill | When to use | Reference |
| --- | --- | --- |
| `bash-docs` | Use when researching bash syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/bash-docs.md` |
| `batch-docs` | Use when researching batch syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/batch-docs.md` |
| `cmd-docs` | Use when researching cmd syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/cmd-docs.md` |
| `csharp-docs` | Use when researching csharp syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/csharp-docs.md` |
| `css-docs` | Use when researching css syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/css-docs.md` |
| `game-tooling-development` | Use when asked to develop PowerShell-centered game tooling that combines Lua addons, VS Code extensions, Node, .NET, native tools, CASC/game data, or web documentation. | `references/game-tooling-development.md` |
| `html-docs` | Use when researching html syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/html-docs.md` |
| `javascript-docs` | Use when researching javascript syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/javascript-docs.md` |
| `json-docs` | Use when researching json syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/json-docs.md` |
| `lua-docs` | Use when researching lua syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/lua-docs.md` |
| `microsoft-dism-docs` | Use when asked to research DISM.exe, DISM PowerShell cmdlets, Windows image servicing, WIM, VHD, FFU, WinPE, and ADK behavior from official Microsoft documentation. | `references/microsoft-dism-docs.md` |
| `microsoft-update-docs` | Use when asked to research Windows Update, Microsoft Update, UUP, update policy, deployment, troubleshooting, releases, and build history from official Microsoft sources. | `references/microsoft-update-docs.md` |
| `ollama-docs` | Use when asked to research Ollama API, CLI, model, runtime, tool-calling, structured-output, context, and integration behavior from official Ollama documentation. | `references/ollama-docs.md` |
| `powershell-agent-harness-development` | Build or review PowerShell orchestration for local or hosted AI models, coding agents, capability registries, evaluations, checkpoints, session exports, and provider switching. | `references/powershell-agent-harness-development.md` |
| `powershell-centered-project-development` | Use when asked to develop mixed-language projects where Windows PowerShell 5.1 or PowerShell 7 is the primary automation, orchestration, installation, build, or recovery layer. | `references/powershell-centered-project-development.md` |
| `powershell-checkpoint-resume-contract` | Create and validate fail-closed PowerShell checkpoint and resume contracts for staged workflows without executing servicing, mounting, or recovery operations. | `references/powershell-checkpoint-resume-contract.md` |
| `powershell-docs` | Use when asked to research PowerShell language, engine, module, compatibility, and tooling questions from official Microsoft documentation with explicit version scope. | `references/powershell-docs.md` |
| `powershell-environment-bootstrap` | Use when asked to diagnose PowerShell, Codex CLI, Node/npm, Git, GitHub CLI, Docker, winget, and PATH availability on Windows before giving installation or plugin setup commands. | `references/powershell-environment-bootstrap.md` |
| `powershell-portfolio-discovery` | Use when asked to inventory several explicitly scoped project roots or a project-profile registry and route PowerShell-centered work without scanning entire drives or importing machine-specific paths into the plugin. | `references/powershell-portfolio-discovery.md` |
| `powershell-project-profile-portal` | Use when asked to show and safely update a portable PowerShell Workbench project profile through a human-readable, color-coded terminal portal. | `references/powershell-project-profile-portal.md` |
| `powershell-quality-gate` | Use when asked to run requested PowerShell parser, import, PSScriptAnalyzer, Pester, MegaLinter, or Codex Security checks and report unavailable gates without silently passing them. | `references/powershell-quality-gate.md` |
| `powershell-refactor` | Use when asked to refactor or optimize PowerShell scripts and modules while preserving behavior, exported commands, safety boundaries, and Windows PowerShell 5.1 plus PowerShell 7 compatibility. | `references/powershell-refactor.md` |
| `powershell-safe-editing` | Use when asked to make precise, low-churn edits to compact, generated, or one-line PowerShell and mixed-language files, and diagnose patch payload, encoding, or invocation failures without executing the patch. | `references/powershell-safe-editing.md` |
| `powershell-scaffold` | Use when asked to generate, extract and compose registered PowerShell components and mixed-language artifacts through archive-first lookup, dependency contracts, parser IDs and a mandatory pre-execution checkpoint. | `references/powershell-scaffold.md` |
| `powershell-workbench-portability` | Package PowerShell Workbench for another project, workstation, laptop, local marketplace, or Git-backed Codex marketplace without embedding machine-specific project paths. | `references/powershell-workbench-portability.md` |
| `python-docs` | Use when researching python syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/python-docs.md` |
| `recovery-toolkit-development` | Use when asked to develop or review the local RecoveryToolkit using its split-function architecture, contract tests, safe local path rules, and non-executable recovery-media and servicing boundaries. | `references/recovery-toolkit-development.md` |
| `sql-docs` | Use when researching sql syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/sql-docs.md` |
| `toc-docs` | Use when researching WoW TOC metadata, addon load ordering and branch/build-specific manifest behavior for Workbench components. | `references/toc-docs.md` |
| `typescript-docs` | Use when researching typescript syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/typescript-docs.md` |
| `winget-downloader-development` | Use when asked to modernize WingetDownloader with explicit exports, help, tests, structured status, cache integrity, safe paths, and recovery handoff compatibility. | `references/winget-downloader-development.md` |
| `xml-docs` | Use when researching xml syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/xml-docs.md` |
| `yaml-docs` | Use when researching yaml syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench. | `references/yaml-docs.md` |

## Example prompts

- Create a dual-compatible PowerShell function.
- Diagnose this project with the read-only Doctor, quality gate, and text-integrity checks.
- Preview a hash-bound project assessment before writing any project profile sidecar.

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets-part01.md`
- `references/_plugin-assets-part02.md`
- `references/_plugin-assets-part03.md`
- `references/_plugin-assets-part04.md`
- `references/_plugin-assets-part05.md`
- `references/_plugin-assets-part06.md`
- `references/_plugin-assets-part07.md`
- `references/_plugin-assets-part08.md`
- `references/_plugin-assets-part09.md`
- `references/_plugin-assets-part10.md`
- `references/_plugin-assets-part11.md`
- `references/_plugin-assets-part12.md`
- `references/_plugin-codex-plugin.md`
- `references/_plugin-scripts-part01.md`
- `references/_plugin-scripts-part02.md`
- `references/_plugin-tests.md`
