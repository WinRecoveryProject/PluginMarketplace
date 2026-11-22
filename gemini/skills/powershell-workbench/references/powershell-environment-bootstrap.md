# Skill: powershell-environment-bootstrap

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/powershell-environment-bootstrap/SKILL.md`

> Use when asked to diagnose PowerShell, Codex CLI, Node/npm, Git, GitHub CLI, Docker, winget, and PATH availability on Windows before giving installation or plugin setup commands.

## Instructions

### PowerShell Environment Bootstrap

Use this skill for missing-command, PATH, workstation bootstrap, plugin-installation, or cross-laptop setup problems.

1. Run `../../scripts/Get-PowerShellWorkbenchEnvironment.ps1` before prescribing a fix.
2. Distinguish `missing executable`, `installed but not on PATH`, `current shell has stale PATH`, and `application-private binary`. Adding a directory to PATH never installs a program.
3. Treat version-specific Codex Desktop binary folders as diagnostic evidence, not stable persistent PATH targets. Prefer the current supported standalone Codex CLI installation when a terminal command is required.
4. Keep installation optional and explicit. Diagnose first; install, change persistent PATH, authenticate, or add a marketplace only when requested.
5. After an approved install, verify with `Get-Command`, the tool's version command, and a newly opened shell when persistent environment variables changed.
6. For another laptop, separate three prerequisites: Codex CLI availability, Git/network access to the marketplace, and plugin installation. Do not assume Codex Desktop exposes `codex` globally.
7. Use `../../scripts/Test-PowerShellWorkbenchHealth.ps1` with explicit source/cache distribution pairs and an expected version to diagnose installation identity. Add catalog manifests only when their freshness and hashes are in scope. The validator is read-only, preserves exact failed-gate names, and never discovers or rewrites marketplace paths implicitly.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Environment Bootstrap"
  short_description: "Diagnose the Windows toolchain"
  icon_small: "./assets/skill-icon.png"
  icon_large: "./assets/skill-icon.png"
  brand_color: "#2671BE"
  default_prompt: "Use $powershell-environment-bootstrap to inspect this Windows development environment before suggesting setup changes."
```

### File: `assets/skill-icon.png`

_Binary asset, not embedded._
