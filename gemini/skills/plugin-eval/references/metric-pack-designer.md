# Skill: metric-pack-designer

- Plugin: `plugin-eval` (0.1.3)
- Source: `plugins/plugin-eval/skills/metric-pack-designer/SKILL.md`

> Design custom metric packs for plugin-eval so teams can add local evaluation rubrics that emit schema-compatible checks and metrics. Use when the user wants their own evaluation criteria or visualizations.

## Instructions

### Metric Pack Designer

Use this skill when the user wants to extend `plugin-eval` with a local rubric.

#### Workflow

1. Clarify the custom rubric categories and target kinds.
2. Define the smallest useful `checks[]` and `metrics[]` payload.
3. Create a metric-pack manifest plus a script that prints JSON to stdout.
4. Run the pack through `plugin-eval analyze <path> --metric-pack <manifest.json>`.

#### Design Rules

- Keep IDs stable across runs so comparisons stay meaningful.
- Emit only `checks[]`, `metrics[]`, and optional `artifacts[]`.
- Do not try to overwrite the core score or summary.
- Prefer deterministic local signals over subjective text generation.

#### Reference

- `../../references/metric-pack-manifest.md`

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Metric Pack Designer"
  short_description: "Design custom metric packs for plugin-eval"
```
