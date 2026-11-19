# Metric-pack mode

Read [Studio policy](../../../references/studio-policy.md) first. Use this mode when the user wants their own evaluation criteria, task-specific verifiers or visualizations added to a skill or plugin evaluation.

<a id="src-metric-pack-metric-pack-designer"></a>
<a id="src-pe-metric-pack-designer-metric-pack-designer"></a>
<a id="src-pe-metric-pack-designer-workflow"></a>
## Workflow

1. Clarify the custom rubric categories and the target kinds: skill, plugin or both.
2. Define measurable requirements, representative fixtures, positive and negative cases, artifact assertions, and verifier argument arrays.
3. Define the smallest useful `checks[]` and `metrics[]` payload.
4. Create a metric-pack manifest plus a script that prints JSON to stdout.
5. Run the pack in one of two ways:
   - Plugin Eval engine: `node scripts/plugin-eval.js analyze <path> --metric-pack <manifest.json>`.
   - Studio engine: `node scripts/studio.mjs skill-eval <target> --metric-pack <manifest.json>`.

<a id="src-pe-metric-pack-designer-design-rules"></a>
## Design rules

- Keep IDs stable across runs so comparisons stay meaningful. Use fixed scenario IDs and an untouched held-out set to compare revisions.
- Emit only `checks[]`, `metrics[]` and optional `artifacts[]`. Do not try to overwrite the core score or summary.
- Prefer deterministic local signals over subjective text generation.
- Keep fit, safety, quality, runtime success, latency and observed tokens separate.
- Run custom verifiers only for explicitly requested practical tests in copied fixtures. Do not execute metric packs while statically inspecting them.

<a id="src-pe-metric-pack-designer-reference"></a>
## Reference

- [metric pack manifest](../../../references/plugin-eval/metric-pack-manifest.md)
- Example pack: `fixtures/plugin-eval/metric-pack/`
