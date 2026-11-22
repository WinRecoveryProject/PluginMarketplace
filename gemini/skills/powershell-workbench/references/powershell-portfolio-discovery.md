# Skill: powershell-portfolio-discovery

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/powershell-portfolio-discovery/SKILL.md`

> Use when asked to inventory several explicitly scoped project roots or a project-profile registry and route PowerShell-centered work without scanning entire drives or importing machine-specific paths into the plugin.

## Instructions

### PowerShell Portfolio Discovery

Use this skill when work spans several repositories, project folders, cloud-synced roots, archives, or workstation profiles.

1. Use `../../scripts/Get-PowerShellWorkbenchProjectInventory.ps1` with explicit `-Root` values or a reviewed `-RegistryPath`.
2. Treat the registry as project data, not plugin configuration. Keep machine paths, model names, account names, and private storage layouts out of the portable plugin.
3. Resolve and report missing or redirected roots instead of silently substituting similarly named folders. CloudStorage, localized Documents paths, symlinks, junctions, and archive copies may differ between laptops.
4. Use bounded depth and exclude generated output, dependencies, reports, test results, and archives from initial technology discovery. Expand one relevant project only after the user request requires it.
5. Identify canonical/live source separately from sanitized Git mirrors, candidates, staging, evidence, reports, transfer bundles, and historical versions.
6. Apply the smallest matching skill or project overlay. A portfolio inventory grants read context, not permission to modify every discovered root.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "PowerShell Portfolio Discovery"
  short_description: "Inventory scoped project portfolios"
  icon_small: "./assets/skill-icon.png"
  icon_large: "./assets/skill-icon.png"
  brand_color: "#2671BE"
  default_prompt: "Use $powershell-portfolio-discovery to inventory these explicitly scoped PowerShell project roots."
```

### File: `assets/skill-icon.png`

_Binary asset, not embedded._
