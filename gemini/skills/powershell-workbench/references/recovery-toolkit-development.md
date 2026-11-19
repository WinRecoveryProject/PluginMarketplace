# Skill: recovery-toolkit-development

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/recovery-toolkit-development/SKILL.md`

> Use when asked to develop or review the local RecoveryToolkit using its split-function architecture, contract tests, safe local path rules, and non-executable recovery-media and servicing boundaries.

## Instructions

### RecoveryToolkit Development

Resolve the active source with `../../scripts/Resolve-PowerShellWorkbenchContext.ps1 -RequestedProfile RecoveryToolkit`. Use live source and tests as the primary authority. Read `../powershell-scaffold/references/project-profiles.md` before generating or refactoring code. If discovery fails, ask for the current project root instead of falling back to another laptop's path.

- Keep public functions in the matching domain directory and reusable implementation helpers under `Private`.
- Preserve the explicit export surface in `RecoveryToolkit.psd1` and `RecoveryToolkit.psm1`.
- Add or update contract-first tests using the existing `Basic`, `Synthetic`, and source-contract conventions.
- Keep report paths local and outside OneDrive, mapped network locations, protected runners, and reparse-point ancestors when existing code requires that boundary.
- Treat servicing, staging, and build-plan objects as non-executable contracts unless a separately authorized executor is in scope.
- Do not reopen frozen recovery-media workflows, mount images, register tasks, elevate, modify ACLs, write real game data, or alter preserved payloads without an explicit request.
- Keep Windows PowerShell 5.1 and PowerShell 7 compatibility. Run quality gates only when requested.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Recovery Toolkit Development"
  short_description: "Develop RecoveryToolkit safely"
  icon_small: "./assets/skill-icon.webp"
  icon_large: "./assets/skill-icon.webp"
  brand_color: "#0078D4"
  default_prompt: "Use $recovery-toolkit-development to develop or review RecoveryToolkit within its non-executable safety boundaries."
```

### Not embedded

- `assets/skill-icon.webp` (binary asset, not embedded)
