# Changelog

## 0.4.0 — 2026-11-20

Breaking: 20 lifecycle skills and the standalone `plugin-eval` plugin are consolidated into two skills, each with one file per mode. Every capability of every removed skill is mapped in `references/consolidation/lifecycle-matrix.json` and verified by `node scripts/studio.mjs consolidation-check references/consolidation/lifecycle-matrix.json`.

| Removed skill | New skill | Mode |
|---|---|---|
| `create-plugin` | `studio-build` | `create-plugin` |
| `create-skill` | `studio-build` | `create-skill` |
| `update-plugin` | `studio-build` | `update` |
| `import-plugins` | `studio-build` | `import` |
| `import-gpt` | `studio-build` | `import` |
| `install-skill` | `studio-build` | `install` |
| `plugin-autopilot` | `studio-build` | `autopilot` |
| `release-workflow` | `studio-build` | `release` |
| `portfolio` | `studio-build` | `portfolio` |
| `catalog` | `studio-build` | `catalog` |
| `skill-conductor` | `studio-build` | `lifecycle` |
| `plugin-skill-studio` (router) | `studio-build` | router (`SKILL.md`) |
| `skill-eval` | `studio-quality` | `eval` |
| `plugin-eval` | `studio-quality` | `eval` |
| `skill-review` | `studio-quality` | `review` |
| `skill-walkthrough` | `studio-quality` | `walkthrough` |
| `skillquiver-doctor` | `studio-quality` | `doctor` (explicit request only) |
| `evidence-matrix` | `studio-quality` | `evidence` |
| `metric-pack` | `studio-quality` | `metric-pack` |
| `improve-skill` | `studio-quality` | `improve` |
| plugin-eval: `plugin-eval`, `evaluate-plugin`, `evaluate-skill` | `studio-quality` | `eval` |
| plugin-eval: `improve-skill` | `studio-quality` | `improve` |
| plugin-eval: `metric-pack-designer` | `studio-quality` | `metric-pack` |

Added:

- The plugin-eval 0.1.2 engine is vendored as `src/eval/plugin-eval/` with `scripts/plugin-eval.js`: start router, code and coverage metrics, observed usage, measurement plans, improvement briefs and HTML reports. Two Windows path-separator fixes are recorded in the registry.
- An autoresearch loop: `autoresearch-start`, `autoresearch-judge` and `autoresearch-report`.
  - Code decides KEEP, DISCARD or UNKNOWN.
  - DISCARD rolls the candidate back.
  - UNKNOWN is never a pass.
  - The source changes only after the user approves `combined.diff`.
- `consolidation-seed` and `consolidation-check` for capability matrices.
- `route()` now also returns a `mode`. The fallback route is `studio-build`.

Upstream sources added to the registry: `gyoz-ai/auto-research` 1.0.0 (MIT, adapted).

Known: the vendored engine estimates its budget baseline by reading local `~/.codex` skill and plugin caches, which can make analysis slow on machines with large caches.
