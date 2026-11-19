# Skill: powershell-docs

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/powershell-docs/SKILL.md`

> Use when asked to research PowerShell language, engine, module, compatibility, and tooling questions from official Microsoft documentation with explicit version scope.

## Instructions

### PowerShell Docs

Use the `powershell` domain in `../../assets/documentation-source-catalog.json` as the discovery boundary.
Validate that catalog first with `../../scripts/Test-PowerShellWorkbenchDocumentationCatalog.ps1` and an independently
recorded catalog SHA-256. A stale, drifted, malformed, or unknown catalog is not trusted.

- Open the relevant current Microsoft Learn page before making a claim that can change between PowerShell versions.
- State the target edition and version: Windows PowerShell 5.1, a specific PowerShell 7 release, or both.
- Prefer language and module reference over blogs. Treat blogs and examples as secondary context, not contract authority.
- Separate documented behavior from locally observed behavior. Use a bounded local probe only when the user authorizes it.
- Cite the exact source page used. Do not present catalog membership as proof that the current page still says the same thing.
- Documentation research never authorizes script execution, installation, profile changes, publication, or transport.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "PowerShell Docs"
  short_description: "Research official PowerShell documentation"
  icon_small: "./assets/skill-icon.svg"
  icon_large: "./assets/skill-icon.svg"
  brand_color: "#2671BE"
  default_prompt: "Use $powershell-docs to research version-specific PowerShell language, engine and module behavior."
```

### Not embedded

- `assets/skill-icon.svg` (binary asset, not embedded)
