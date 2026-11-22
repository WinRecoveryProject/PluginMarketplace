# Skill: microsoft-dism-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/microsoft-dism-docs/SKILL.md`

> Use when asked to research DISM.exe, DISM PowerShell cmdlets, Windows image servicing, WIM, VHD, FFU, WinPE, and ADK behavior from official Microsoft documentation.

## Instructions

### Microsoft DISM Docs

Use the `microsoft-dism` domain in `../../assets/documentation-source-catalog.json` as the discovery boundary.
Validate that catalog first with `../../scripts/Test-PowerShellWorkbenchDocumentationCatalog.ps1` and an independently
recorded catalog SHA-256. A stale, drifted, malformed, or unknown catalog is not trusted.

- Resolve the target host, image type, online or offline state, Windows release, ADK or WinPE context, and tool surface.
- Distinguish `dism.exe` syntax from the DISM PowerShell module; do not assume every option has an identical cmdlet mapping.
- Prefer the version-selected technical reference and cmdlet reference. Cite the exact page and documented applicability.
- Treat servicing, mounting, image repair, capture, apply, commit, and discard as potentially mutating operations.
- Documentation research and command composition do not authorize execution, elevation, mounting, servicing, or file writes.
- When documentation and an observed host differ, report the conflict and retain the raw version and command evidence.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Microsoft DISM Docs"
  short_description: "Research official DISM documentation"
  icon_small: "./assets/skill-icon.webp"
  icon_large: "./assets/skill-icon.webp"
  brand_color: "#0078D4"
  default_prompt: "Use $microsoft-dism-docs to research version-specific DISM and Windows image servicing documentation."
```

### File: `assets/skill-icon.webp`

_Binary asset, not embedded._
