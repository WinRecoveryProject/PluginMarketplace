# Changelog

## 0.8.0 — 2026-11-22

Breaking: four git skills are consolidated into `studio-git`. Every capability is mapped in `references/consolidation/git-matrix.json` (208 capabilities, none dropped).

| Removed skill | New skill | Mode |
|---|---|---|
| `using-git-worktrees` | `studio-git` | `worktree` |
| `finishing-a-development-branch` | `studio-git` | `finish` |
| `resolving-merge-conflicts` | `studio-git` | `conflicts` |
| `git-safety-guardrails` | `studio-git` | `safety` (scripts in `modes/safety/scripts/`) |

The mode files and everything under `modes/safety/` are shared byte-for-byte with WinRecoveryProject DevSuite `devsuite-git`; `references/consolidation/shared-git-modes.json` pins their hashes in both packages. The preserved upstream tools in `tools/matt/` are unchanged; their test still points at the upstream layout and was already failing before this release.

## 0.7.0 — 2026-11-22

Breaking: six execution skills are consolidated into `studio-execute`. Every capability is mapped in `references/consolidation/execute-matrix.json` (315 capabilities, none dropped).

| Removed skill | New skill | Mode |
|---|---|---|
| `executing-plans` | `studio-execute` | `execute` |
| `subagent-driven-development` | `studio-execute` | `subagent` (prompts, references and scripts in `modes/subagent/`) |
| `implement` | `studio-execute` | `implement` |
| `implement-spec` | `studio-execute` | `spec-run` |
| `dispatching-parallel-agents` | `studio-execute` | `parallel` |
| `execute-durably` | `studio-execute` | `durable` |

The mode files and everything under `modes/subagent/` are shared byte-for-byte with WinRecoveryProject DevSuite `devsuite-implement`; `references/consolidation/shared-execute-modes.json` pins their hashes in both packages. The subagent scripts now live at `skills/studio-execute/modes/subagent/scripts/`.

## 0.6.0 — 2026-11-21

Breaking: ten planning skills are consolidated into `studio-plan`. Every capability is mapped in `references/consolidation/plan-matrix.json` (429 capabilities, none dropped).

| Removed skill | New skill | Mode |
|---|---|---|
| `brainstorming` | `studio-plan` | `discover` (browser companion in `skills/studio-plan/companion/`) |
| `grill-me` | `studio-plan` | `interview` |
| `grill-with-docs` | `studio-plan` | `interview` |
| `grilling` | `studio-plan` | `interview` |
| `to-spec` | `studio-plan` | `spec` |
| `writing-plans` | `studio-plan` | `plan` (with `modes/plan-full.md`) |
| `to-tickets` | `studio-plan` | `tickets` |
| `to-questionnaire` | `studio-plan` | `questions` |
| `goal` | `studio-plan` | `goal` |
| `wayfinder` | `studio-plan` | `map` |

The eight mode files and `plan-full.md` are shared byte-for-byte with WinRecoveryProject DevSuite `devsuite-planning`; `references/consolidation/shared-plan-modes.json` pins their hashes in both packages. Tracker labels such as `wayfinder:map` and the ticket types (`research`, `prototype`, `grilling`, `task`) are unchanged.

## 0.5.0 — 2026-11-20

Breaking: seven review skills are consolidated. Every capability is mapped in `references/consolidation/review-matrix.json` (269 capabilities, none dropped).

| Removed skill | New skill | Mode |
|---|---|---|
| `code-review` | `studio-review` | `code` |
| `requesting-code-review` | `studio-review` | `request` |
| `receiving-code-review` | `studio-review` | `receive` |
| `review-decision` | `studio-review` | `decide` |
| `verification-before-completion` | `studio-review` | `verify` |
| `verify-work` | `studio-review` | `verify` |
| `risk-review` | `studio-quality` | `risk` |

The `code`, `request`, `receive`, `decide` and `verify` mode files are shared byte-for-byte with WinRecoveryProject DevSuite `devsuite-review`; `references/consolidation/shared-review-modes.json` pins their hashes in both packages. Seventeen Studio files that named the removed skills now point to the new modes.

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
