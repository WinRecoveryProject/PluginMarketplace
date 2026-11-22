# Skill: powershell-checkpoint-resume-contract

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/powershell-checkpoint-resume-contract/SKILL.md`

> Create and validate fail-closed PowerShell checkpoint and resume contracts for staged workflows without executing servicing, mounting, or recovery operations.

## Instructions

### PowerShell Checkpoint and Resume Contract

Use this skill for resilient, reviewable PowerShell workflows that need to pause and later resume safely. It is a contract and validation layer, not a servicing or recovery executor.

#### Rules

- Use stable step IDs such as `servicing.stage` or `download.verify`.
- Record absolute artifact paths and SHA256 hashes.
- Record executable tool path, file version when available, and SHA256 hash.
- Record explicit preconditions, postconditions, status, and mount state.
- Validate the checkpoint before any resume attempt. Missing artifacts, hash drift, tool drift, malformed data, or token mismatch must fail closed.
- Use `-NoWrite` to preview a checkpoint document without creating directories or files.
- Keep declared mutation intent separate from observed target mutation.
- Do not mount images, discard changes, run installers, write recovery media, delete caches, or elevate unless the user explicitly requests an executor and its safety gates.

#### Commands

```powershell
.\scripts\New-PowerShellWorkbenchCheckpoint.ps1 `
    -CheckpointPath .\state\servicing-stage.json `
    -StepId servicing.stage `
    -ArtifactPath .\input\install.wim `
    -ToolPath $env:ComSpec `
    -NoWrite

.\scripts\Test-PowerShellWorkbenchCheckpoint.ps1 `
    -CheckpointPath .\state\servicing-stage.json
```

Only a passing validation result is eligible for a later, explicitly approved resume operation.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Checkpoint Resume Contract"
  short_description: "Design fail-closed workflow checkpoints"
  icon_small: "./assets/skill-icon.png"
  icon_large: "./assets/skill-icon.png"
  brand_color: "#2671BE"
  default_prompt: "Use $powershell-checkpoint-resume-contract to create or validate this checkpoint and resume contract."
```

### File: `assets/skill-icon.png`

_Binary asset, not embedded._
