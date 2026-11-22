# Skill: microsoft-update-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/microsoft-update-docs/SKILL.md`

> Use when asked to research Windows Update, Microsoft Update, UUP, update policy, deployment, troubleshooting, releases, and build history from official Microsoft sources.

## Instructions

### Microsoft Update Docs

Use the `microsoft-update` domain in `../../assets/documentation-source-catalog.json` as the discovery boundary.
Validate that catalog first with `../../scripts/Test-PowerShellWorkbenchDocumentationCatalog.ps1` and an independently
recorded catalog SHA-256. A stale, drifted, malformed, or unknown catalog is not trusted.

- Identify Windows edition, release, build, servicing channel, update type, management plane, and date before answering.
- Separate Windows Update, Microsoft Update, WSUS, Windows Update client policy, Intune or MDM, and release-history claims.
- Re-open the current Microsoft page for build, KB, policy, support, applicability, or lifecycle facts; those facts drift.
- Prefer Microsoft Learn for architecture and policy, and Microsoft Support update history for exact release or KB history.
- Cite the exact page used and state when a conclusion is an inference across multiple official pages.
- Research never authorizes scanning, downloading, installing, hiding, uninstalling, or approving an update or policy change.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Microsoft Update Docs"
  short_description: "Research Windows Update documentation"
  icon_small: "./assets/skill-icon.svg"
  icon_large: "./assets/skill-icon.svg"
  brand_color: "#0078D4"
  default_prompt: "Use $microsoft-update-docs to research Windows Update, UUP and build history from official Microsoft sources."
```

### File: `assets/skill-icon.svg`

_Binary asset, not embedded._
