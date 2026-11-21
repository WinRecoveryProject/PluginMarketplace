# Skill: release-workflow

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/release-workflow/SKILL.md`

> Use when preparing, packaging or resuming a plugin release with evidence and bounded retries.

## Instructions

### Plugin Release Workflow

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) first.

Use local validator and `tools/package.py` for deterministic packaging. Keep a checkpoint through prepared, uploading, scanning, failed, passed, submitted and published. Run `release-checkpoint` and `release-advance` to validate recorded transitions. A checkpoint records external observations; it does not itself upload or prove publication. Use native authorized host browser access for remote operations, inspect existing draft identity before retrying, and bound retries. Preserve package/developer identity on updates. Public URLs and account facts must be verified. No Keybook, ego-browser or other companion plugin is required. Stop only at actual authorization, authentication, compliance or capability boundaries.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Plugin Release Workflow"
  short_description: "Use when preparing, packaging or resuming a plugin release with evidence and bo"
  default_prompt: "Use $release-workflow for this task."
```

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
