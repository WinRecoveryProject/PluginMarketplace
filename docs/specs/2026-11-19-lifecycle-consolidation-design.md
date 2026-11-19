# Plugin/skill lifecycle consolidation — design

Status: approved design, not implemented
Date: 2026-11-19
Scope: sub-project 1 of the catalog consolidation (plugin/skill lifecycle cluster)

## Context and goal

The catalog has about 225 non-vendor skills across 22 plugins. Many of them overlap
in intent. For example, more than five skills create, update or improve plugins and
skills. The goal is fewer skills, each able to do the **sum** of what the skills it
replaces could do. Merging must not pick one source and discard the others.

The consolidation is split into clusters. Each cluster gets its own spec, plan and
pull request:

1. **Plugin/skill lifecycle** (this spec)
2. Review and verification
3. Planning and specs
4. Debug, TDD/test, handoff/resume, research

Only this repository's catalog (`plugins/`, `claude-plugins/`) changes. Third-party
plugins installed from other sources may be used as source material, with
provenance, but are never modified.

## Decisions

| Topic | Decision |
|---|---|
| Shape | Two skills: `studio-build` and `studio-quality`, each a short router `SKILL.md` plus one mode file per mode under `modes/`, loaded only when used |
| Old skill names | Removed. The new descriptions cover their trigger phrases. No aliases |
| Standalone `plugin-eval` plugin | Absorbed into `studio-quality`, then removed from the catalog in the same release |
| Union guarantee | Capability matrix plus `consolidation-check` (below). Nothing is dropped without the owner's explicit approval |
| Autoresearch | Becomes the `improve` mode of `studio-quality`, adapted to Studio policy |

## Skill split

### `studio-build` — create, change, move, publish

Modes: `create-plugin`, `create-skill`, `update`, `import` (plugins and GPT exports),
`install`, `release`, `portfolio`, `catalog`, `autopilot`.

Absorbs these Studio skills: `create-plugin`, `create-skill`, `update-plugin`,
`plugin-autopilot`, `import-plugins`, `import-gpt`, `install-skill`,
`release-workflow`, `portfolio`, `catalog`, `skill-conductor`, and the
`plugin-skill-studio` router skill.

### `studio-quality` — measure, review, improve

Modes: `eval` (static and benchmark, for skills and plugins), `metric-pack`, `review`,
`walkthrough`, `doctor`, `evidence`, `improve` (including the autoresearch loop).

Absorbs these Studio skills: `skill-eval`, `plugin-eval`, `skill-review`,
`skill-walkthrough`, `skillquiver-doctor`, `evidence-matrix`, `metric-pack`,
`improve-skill`.

It also absorbs all five skills of the standalone `plugin-eval` plugin:
`plugin-eval`, `evaluate-plugin`, `evaluate-skill`, `improve-skill` and
`metric-pack-designer`.

### Not in this round

These are left to later clusters: `create-agent-instructions` and
`pre-release-review` (codex-dev-workflows), and `powershell-portfolio-discovery`
(powershell-workbench). `plugins/plugin-eval/fixtures/minimal-plugin` is a test
fixture, not a skill. It moves to Studio's fixtures only if a test uses it.

The result is 25 source skills reduced to 2: 20 Studio skills plus the 5 skills of
the standalone `plugin-eval` plugin, which is removed.

## Union guarantee

### Capability matrix

File: `plugins/plugin-skill-studio/references/consolidation/lifecycle-matrix.json`

Each source skill is split into atomic capabilities, one entry each:

```json
{
  "id": "plugin-eval.evaluate-skill.held-out-triggers",
  "source": "plugin-eval/skills/evaluate-skill/SKILL.md:14",
  "text": "Use held-out trigger cases when improving descriptions.",
  "target": "studio-quality/modes/eval.md#held-out-triggers",
  "status": "covered"
}
```

- `status` is one of three values:
  - `covered`
  - `merged-with:<id>`
  - `dropped`
- A `dropped` entry must carry `"approved": true` and a `reason`. The owner gives
  that approval in the PR conversation. No personal names go in the file.
- The matrix covers more than prose:
  - reference files, scripts and assets of each source skill
  - each `agents/openai.yaml` policy and dependency
  - the trigger phrases in each `description`
- **Duplicates:** when two sources say the same thing, they merge into one wording,
  and the more precise wording wins. The other entry is marked `merged-with`, not
  `dropped`.

### `consolidation-check`

Command: `node scripts/studio.mjs consolidation-check <matrix>`

It exits non-zero (FAIL) when any of these is true:

- a capability has no `target`
- a target file or `#anchor` does not exist
- a file of a source skill is not represented in the matrix
- a `dropped` entry lacks `approved: true` and a `reason`

The check runs in Studio's test suite. Packaging is blocked while it fails.

### Trigger coverage

Every removed skill's `description` becomes held-out trigger cases for skill-eval.
Each case must route to `studio-build` or `studio-quality` and name the expected mode.
A routing miss counts as a failure, not a warning.

### Provenance

`references/integration-registry.json` keeps every source and its file hashes. Only
the `integration` field and the target path change. The upstream
`gyoz-ai/auto-research` 1.0.0 (MIT) is added as an `adapt` source.

## `improve` mode with autoresearch loop

Deterministic steps live in `src/eval/autoresearch.mjs`. It uses Node built-ins only
and reuses `analyze`, `runBenchmark` and `compareReports`. It is exposed through
three commands:

1. `autoresearch-start <skill-root> [--config <bench.json>]`
   - Refuses installation caches and upstream snapshots: the target must be an
     editable source.
   - Creates a run directory outside the skill's own files:
     `<skill-root>/../.autoresearch/<timestamp>/`.
   - The run directory holds `candidate/` (a copy of the skill) and `baseline.json`
     (a static eval, plus a benchmark when a config is given).
2. **Proposals (model step).** These are written by the model, not by a command.
   - Sources: the baseline findings and a local gap analysis of the skill and its
     references.
   - Web research happens only when the user opts in for that run, and it follows
     research-systematically's source rules.
   - No subagents are used.
   - Ranking: Impact × Confidence ÷ Complexity, as in the upstream skill.
3. `autoresearch-judge <run> <experiment>`. Each experiment is one change to
   `candidate/`, judged by code:
   - **KEEP** when the static eval has no new blocker and, if a benchmark config
     exists, the benchmark result is at least equal to the last kept version on
     identical fixtures.
   - **DISCARD** otherwise. `candidate/` is restored to the last KEEP state.
   - **UNKNOWN** when no benchmark config exists. UNKNOWN is a separate verdict and
     is never reported as a pass.
   - Each experiment writes a receipt `NNN.json` with its verdict, the reports it was
     judged on and the `compareReports` output, plus a diff file `NNN.diff`.
4. `autoresearch-report <run>`
   - Produces the combined source→candidate diff, the before/after evals and all
     receipts.
   - The source skill changes only after the user approves that diff.

An interrupted run can resume from its receipts.

## Rollout

- Studio version 0.4.0. It is a breaking release: 20 Studio skill names are removed
  and replaced by `studio-build` and `studio-quality`.
- The same change removes `plugin-eval` from `.agents/plugins/marketplace.json` and
  `plugin-sources.lock.json`, and from `.claude-plugin/marketplace.json` if it is
  listed there.
- The Studio README and changelog gain a table mapping each old skill name to its
  new skill and mode.
- Delivery is a draft PR. It must pass `node validate-marketplace.mjs` and Studio's
  test suite. Nothing is merged without the owner's explicit yes.

## Error handling

- A failing `consolidation-check` blocks packaging.
- `autoresearch-start` fails clearly on a non-editable target.
- `autoresearch-judge` refuses to compare reports with different scoring versions.
  This reuses the existing `compareReports` guard.

## Testing

- `consolidation-check` tests:
  - a passing matrix
  - a missing target
  - a missing anchor
  - an unrepresented source file
  - an unapproved drop
- Held-out trigger cases for every removed skill.
- Autoresearch tests:
  - start refuses a cache path
  - KEEP
  - DISCARD with rollback verified byte-for-byte
  - UNKNOWN without a benchmark
  - resume from receipts
- All existing Studio tests still pass.
