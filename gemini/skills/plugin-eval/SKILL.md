---
name: plugin-eval
description: "Plugin Eval: Evaluate Codex skills and plugins from chat with a beginner-friendly start command, local-first reports, token budget explanations, and guided benchmarking. Use when the user asks for minimal-plugin-skill, alpha, beta, evaluate-plugin, evaluate-skill, improve-skill, metric-pack-designer, plugin-eval work, or names the plugin-eval plugin."
---

# Plugin Eval

Gemini export of the `plugin-eval` plugin from WinRecoveryProject/PluginMarketplace, version `0.1.3`. Source: `plugins/plugin-eval`.

Ask Codex to evaluate a plugin or skill, give you a full analysis of a named plugin such as game-studio, explain why it scored that way, show what to fix first, explain its token budget, measure real token usage, benchmark a plugin, or tell you what to run next. Plugin Eval keeps the path engineer-friendly: start with a natural chat request, then use the local `plugin-eval start` entrypoint or the routed workflow command it recommends.

## How to use this skill

1. Pick the sub-skill below whose description matches the request.
2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.
3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.
4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.
5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.

## Sub-skills

| Skill | When to use | Reference |
| --- | --- | --- |
| `minimal-plugin-skill` | Minimal plugin skill fixture. Use when a test needs a valid plugin skill. | `references/minimal-plugin-skill.md` |
| `alpha` | Alpha fixture skill. Use when plugin-eval tests need one of two bundled skills. | `references/alpha.md` |
| `beta` | Beta fixture skill. Use when plugin-eval tests need the second bundled skill. | `references/beta.md` |
| `evaluate-plugin` | Evaluate a local Codex plugin in engineer-friendly language. Use when the user says "evaluate this plugin", "audit this plugin", "why did this score that way", "what should I fix first", "help me benchmark this plugin", or asks for a plugin-wide report before comparing versions. | `references/evaluate-plugin.md` |
| `evaluate-skill` | Evaluate a local Codex skill in engineer-friendly terms. Use when the user says "evaluate this skill", "give me an analysis of the game dev skill", "audit this skill", "why did this score that way", "what should I fix first", or asks for a skill-specific report before benchmarking it. | `references/evaluate-skill.md` |
| `improve-skill` | Turn plugin-eval findings into a concrete rewrite brief for a Codex skill. Use when the user already evaluated a skill and now wants Codex to improve it, especially after asking what to fix first. | `references/improve-skill.md` |
| `metric-pack-designer` | Design custom metric packs for plugin-eval so teams can add local evaluation rubrics that emit schema-compatible checks and metrics. Use when the user wants their own evaluation criteria or visualizations. | `references/metric-pack-designer.md` |
| `plugin-eval` | Help engineers evaluate a local skill or plugin, explain why it scored that way, show what to fix first, measure real token usage, benchmark starter scenarios, or decide what to run next. Use when the user says things like "evaluate this skill", "give me an analysis of the game dev skill", "why did this score that way", "what should I fix first", "measure the real token usage of this skill", or "what should I run next?". | `references/plugin-eval.md` |

## Example prompts

- Give me an analysis of the game studio plugin.
- Evaluate this plugin.
- Why did this score that way?

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
- `references/_plugin-fixtures.md`
- `references/_plugin-references.md`
- `references/_plugin-scripts.md`
- `references/_plugin-src.md`
- `references/_plugin-tests.md`
