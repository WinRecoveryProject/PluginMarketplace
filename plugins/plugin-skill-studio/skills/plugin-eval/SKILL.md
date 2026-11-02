---
name: plugin-eval
description: "Use when assessing a plugin package, its skills, runtime declarations, budget or release readiness."
---

# Plugin Eval

Read [Studio policy](../../references/studio-policy.md) first.

Run legacy manifest checks with `node scripts/plugin-studio.mjs validate <target>` and `evaluate`. Run deeper analysis with `node scripts/studio.mjs plugin-eval <target> --format markdown`. Separate the strongest/weakest skill evidence, package blockers, observed behavior, declared permissions and unavailable host evidence. Compare reports with `compare-reports <before.json> <after.json>`. Use the local Skill Eval workflow for focused skill experiments. No external evaluator plugin is needed.
