---
name: skill-eval
description: "Use when evaluating an agent skill, testing its triggers or behavior, comparing revisions, or explaining its budget."
---

# Skill Eval

Read [Studio policy](../../references/studio-policy.md) first.

Run `node scripts/studio.mjs skill-eval <target> --mode static --format markdown`. Read structural findings, risks, evidence, budget estimates and UNKNOWN measurements separately. A high score cannot override blockers. For practical testing, create a benchmark configuration with `benchmark-init <target>`, supply scenario-specific fixtures and verifiers, then use `skill-eval <target> --mode benchmark --config <config> --out <results>`. Do not execute a reviewed artifact during static analysis. Isolation and existing authentication must pass preflight. If they cannot, retain the static report and show the exact benchmark blocker. Use baseline and skill runs against identical fixtures. Use held-out trigger cases when improving descriptions. Never present a simulated runner test as a real model evaluation.
