# Skill: powershell-workbench-portability

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/powershell-workbench-portability/SKILL.md`

> Package PowerShell Workbench for another project, workstation, laptop, local marketplace, or Git-backed Codex marketplace without embedding machine-specific project paths.

## Instructions

### PowerShell Workbench Portability

Use this skill when the user wants to reuse, move, share, install, or update PowerShell Workbench on another project or computer.

1. Keep project discovery portable. Use `../../scripts/Resolve-PowerShellWorkbenchContext.ps1`; never copy a source path from one workstation into required plugin behavior.
2. For a folder, archive, or future Git repository, preview
   `../../scripts/New-PortablePowerShellWorkbenchMarketplace.ps1 -Destination <path> -WhatIf` first. Execution creates
   `.agents/plugins/marketplace.json` and `plugins/powershell-workbench` under one portable root. Existing targets require
   explicit `-Force`; the upgrade stages and validates both artifacts, backs up both existing targets, and restores them
   if replacement fails.
3. Validate the packaged plugin before distribution.
4. A second computer can add a local package with `codex plugin marketplace add <marketplace-root>`, or a Git-backed package with `codex plugin marketplace add owner/repository --ref <ref>`.
5. GitHub access is required only to create, push, or update the remote repository. Local packaging and local installation require no GitHub credentials.
6. Do not install third-party GitHub Marketplace Actions by default. Prefer direct PowerShell, Pester, and PSScriptAnalyzer commands plus pinned official actions; add a third-party action only after a specific review and explicit request.

When moving to another machine, optionally create `%USERPROFILE%\.config\powershell-workbench\projects.json` for projects that cannot be found by walking up from the active workspace.

For a movable project configuration, create `.powershell-workbench/project-profile.json` with `../../scripts/New-PowerShellWorkbenchProjectProfile.ps1`. Keep project and component roots relative to that file; use `Resolve-PowerShellWorkbenchProjectProfile.ps1` to resolve and validate them before work. Use the existing `Show-PowerShellWorkbenchProjectPortal.ps1` portal to preview or explicitly update this versioned profile rather than embedding paths in scripts.

#### Shared release source

Use Zilvereyes/PowerShellWorkbench as the known Git marketplace source; inspect its current revision and owning instructions before edits. Its root .agents/plugins/marketplace.json points to plugins/powershell-workbench. Build account-plugin updates and portable packages from the same reviewed commit. Record commit, version and tree hashes separately; an account plugin ID is not a Git ref. Read references/release-channels.md before refreshing or publishing either channel.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Workbench Portability"
  short_description: "Package PowerShell Workbench portably"
  icon_small: "./assets/skill-icon.png"
  icon_large: "./assets/skill-icon.png"
  brand_color: "#2671BE"
  default_prompt: "Use $powershell-workbench-portability to prepare this PowerShell Workbench package for another machine or marketplace."
```

### File: `assets/skill-icon.png`

_Binary asset, not embedded._

### File: `references/release-channels.md`

#### Release channels

Canonical repository: https://github.com/Zilvereyes/PowerShellWorkbench
Marketplace: .agents/plugins/marketplace.json -> plugins/powershell-workbench.
Keep that portable path and marketplace/plugin names stable.

1. Start from current main on a dedicated branch. Review applicable repository guidance.
2. Update source, docs, native adapters, fixtures, component catalogs and both manifests together.
3. Run Python contract tests, Windows PowerShell 5.1/PowerShell 7 tests, PSScriptAnalyzer and required CI. Missing hosts remain unverified; do not tag a validated release before required CI passes.
4. Merge the reviewed change, then select an immutable reviewed commit/tag. Build the account-plugin archive from that exact plugin directory, excluding Git metadata, caches and machine-specific evidence. Upload it to the existing account plugin with a guarded release ID; never create another Workbench identity.
5. On each computer inspect codex --version, codex plugin marketplace --help and the configured marketplace list before refresh. Use the documented marketplace add/upgrade operations supported by that installed host. Immutable pins do not advance to a new release tag automatically: select the new reviewed ref explicitly. Do not silently switch a pinned source to main.
6. In ChatGPT Desktop/Codex local clients refresh the chosen marketplace and start a new task; verify the installed version and tree identity using the existing health/status tools. An account plugin update and a Git marketplace upgrade are separate operations. Do not claim either machine updated without observed evidence. Web/account installations cannot directly launch a Windows-local runtime from a skill alone.

Official host documentation checked 2026-10-20: https://developers.openai.com/plugins/build/plugins
This documents local marketplace add/list/upgrade/remove and Desktop discovery. Check the installed CLI help before any add/remove sequence; do not uninstall merely to refresh.

Private project archives, registry paths and host settings are not bundled into the public plugin repository. Synchronize reusable project component archives through a deliberately selected Git project separately. Keep account channel and marketplace channel provenance visible if both installations are enabled, and diagnose duplicate roots instead of editing version caches.
