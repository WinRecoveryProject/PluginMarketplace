# Plugin files: plugin-eval — `references/`

Source: `plugins/plugin-eval`. Files outside the `skills/*` folders, embedded as text.

## File: `references/benchmark-harness.md`

### Benchmark Harness

The benchmark harness gives `plugin-eval` a beginner-friendly path to measured usage.

#### Goals

- help first-time skill authors collect real usage without building their own harness
- keep the workflow local-first and transparent
- produce usage logs that can be fed back into `plugin-eval analyze --observed-usage`

#### Workflow

1. Run `plugin-eval init-benchmark <path>`.
2. Edit the generated `benchmark.json` so `workspace.sourcePath`, the scenarios, and any verifier commands match real tasks.
3. Run the benchmark with `plugin-eval benchmark <path> --config <file>`.
4. Feed the usage log into `plugin-eval analyze` when usage telemetry is available.

#### Design Choices

- The generated benchmark file is meant to be edited by humans.
- Scenarios use plain-language fields such as `title`, `purpose`, `userInput`, and `successChecklist`.
- Benchmarking means real `codex exec` runs, not simulated single-turn Responses API requests.
- Each benchmark run captures raw Codex logs plus a normalized report under `.plugin-eval/runs/<timestamp>/`.
- When token usage is emitted by Codex, the benchmark also writes JSONL usage logs in a shape that `--observed-usage` already understands.

#### Commands

```bash
plugin-eval init-benchmark ./skills/my-skill
plugin-eval benchmark ./skills/my-skill
plugin-eval analyze ./skills/my-skill --observed-usage ./skills/my-skill/.plugin-eval/benchmark-usage.jsonl --format markdown
```

## File: `references/chat-first-workflows.md`

### Plugin Eval Chat-First Workflows

`plugin-eval` should feel usable from Codex chat before a user knows any CLI flags.

#### One Paved Road

If the user speaks in natural language first, use:

```bash
plugin-eval start <path> --request "<chat request>" --format markdown
```

That entrypoint recognizes the request, explains why the workflow fits, and shows the exact local command sequence behind it.

#### Recommended Beginner Requests

Use these exact phrases as the paved road:

- `Give me an analysis of the game dev skill.`
- `Evaluate this skill.`
- `Evaluate this plugin.`
- `Explain the token budget for this skill.`
- `Measure the real token usage of this skill.`
- `Help me benchmark this plugin.`
- `What should I run next?`

#### How Those Requests Map To Local Workflows

##### Give me an analysis of the game dev skill

Start with:

```bash
plugin-eval start ~/.codex/skills/game-dev --request "give me an analysis of the game dev skill" --format markdown
plugin-eval analyze ~/.codex/skills/game-dev --format markdown
plugin-eval init-benchmark ~/.codex/skills/game-dev
plugin-eval benchmark ~/.codex/skills/game-dev --config ~/.codex/skills/game-dev/.plugin-eval/benchmark.json
```

Use this when the user wants the overall report and wants Codex to set up starter benchmark scaffolding instead of stopping after the first report.

##### Evaluate this skill

Start with:

```bash
plugin-eval start <skill-path> --request "Evaluate this skill." --format markdown
plugin-eval analyze <skill-path> --format markdown
```

Use this when the user wants the overall report first.

##### Explain the token budget for this skill

Start with:

```bash
plugin-eval start <skill-path> --request "Explain the token budget for this skill." --format markdown
plugin-eval explain-budget <skill-path> --format markdown
```

Use this when the question is about cost, context pressure, or why a skill feels heavy.

##### Measure the real token usage of this skill

Start with:

```bash
plugin-eval start <skill-path> --request "Measure the real token usage of this skill." --format markdown
plugin-eval init-benchmark <skill-path>
plugin-eval benchmark <skill-path> --config <benchmark.json>
plugin-eval analyze <skill-path> --observed-usage <benchmark-usage.jsonl> --format markdown
plugin-eval measurement-plan <skill-path> --observed-usage <benchmark-usage.jsonl> --format markdown
```

Use this when the user wants measured usage from a real Codex run, not just the static estimate.

##### Help me benchmark this plugin

Start with:

```bash
plugin-eval start <plugin-root> --request "Help me benchmark this plugin." --format markdown
plugin-eval init-benchmark <plugin-root>
plugin-eval benchmark <plugin-root> --config <benchmark.json>
```

Use this when the user wants starter scenarios or a repeatable real-Codex measurement harness.

##### What should I run next?

Start with:

```bash
plugin-eval start <path> --request "What should I run next?" --format markdown
```

Use this when the user is unsure whether they should evaluate, explain a budget, benchmark, or collect measured usage next.

## File: `references/evaluation-result-schema.md`

### Evaluation Result Schema

The canonical `plugin-eval` result is JSON with this top-level shape:

```json
{
  "schemaVersion": 1,
  "tool": {
    "name": "plugin-eval",
    "version": "0.1.0"
  },
  "createdAt": "2026-04-07T00:00:00.000Z",
  "target": {
    "kind": "skill",
    "path": "/abs/path/to/target",
    "entryPath": "/abs/path/to/target/SKILL.md",
    "name": "target-name",
    "relativePath": "fixtures/minimal-skill"
  },
  "summary": {
    "score": 92,
    "grade": "A",
    "riskLevel": "low",
    "topRecommendations": []
  },
  "budgets": {
    "method": "estimated-static-policy-aware",
    "invocation_policy": {
      "implicit_skill_count": 1,
      "explicit_only_skill_count": 2,
      "implicit_skills": ["router"],
      "explicit_only_skills": ["specialist-a", "specialist-b"]
    },
    "trigger_cost_tokens": {
      "value": 48,
      "band": "good",
      "thresholds": {
        "goodMax": 48,
        "moderateMax": 92,
        "heavyMax": 150
      },
      "components": []
    },
    "invoke_cost_tokens": {
      "value": 220,
      "band": "good",
      "thresholds": {
        "goodMax": 220,
        "moderateMax": 480,
        "heavyMax": 900
      },
      "components": []
    },
    "deferred_cost_tokens": {
      "value": 180,
      "band": "good",
      "thresholds": {
        "goodMax": 180,
        "moderateMax": 520,
        "heavyMax": 1200
      },
      "components": []
    },
    "explicit_only_invoke_cost_tokens": {
      "value": 900,
      "band": "heavy",
      "thresholds": {
        "goodMax": 220,
        "moderateMax": 480,
        "heavyMax": 900
      },
      "components": []
    },
    "total_tokens": {
      "value": 448,
      "band": "good"
    }
  },
  "checks": [],
  "metrics": [],
  "artifacts": [],
  "extensions": [],
  "improvementBrief": {}
}
```

The evaluation result may also include:

- `observedUsage`
- `measurementPlan`

For plugins or skills with `agents/openai.yaml` policies, `budgets.method` may be
`estimated-static-policy-aware`. In that mode, `policy.allow_implicit_invocation: false`
excludes the skill from `trigger_cost_tokens` and `invoke_cost_tokens`. The excluded skill
payloads are reported under `explicit_only_invoke_cost_tokens` for visibility, but they are
not scored as implicit active context.

Separate benchmark runs use a `benchmark-run` payload with:

- `mode`
- `config`
- `usageLogPath`
- `summary`
- `scenarios[]`
- `nextSteps[]`

#### Checks

Checks use:

- `id`
- `category`
- `severity`
- `status`
- `message`
- `evidence[]`
- `remediation[]`
- `source`

#### Metrics

Metrics use:

- `id`
- `category`
- `value`
- `unit`
- `band`
- `source`

#### Extensions

`extensions[]` holds metric-pack outputs. Each extension records:

- `name`
- `version`
- `manifestPath`
- `checks[]`
- `metrics[]`
- `artifacts[]`

## File: `references/metric-pack-manifest.md`

### Metric Pack Manifest

Metric packs are user-authored local evaluators that output `plugin-eval`-compatible findings.

#### Manifest Shape

```json
{
  "name": "team-rubric",
  "version": "1.0.0",
  "supportedTargetKinds": ["skill", "plugin"],
  "command": ["node", "./emit-team-rubric.js"]
}
```

#### Runtime Contract

- The manifest is passed to `plugin-eval analyze --metric-pack <manifest.json>`.
- The command runs from the manifest directory.
- The target path and target kind are appended as CLI arguments.
- The process also receives:
  - `PLUGIN_EVAL_TARGET`
  - `PLUGIN_EVAL_TARGET_KIND`
  - `PLUGIN_EVAL_METRIC_PACK_MANIFEST`

#### Output Contract

The metric pack must print JSON to stdout in this shape:

```json
{
  "checks": [
    {
      "id": "team-style",
      "category": "custom",
      "severity": "warning",
      "status": "warn",
      "message": "Custom rubric finding",
      "evidence": ["detail"],
      "remediation": ["fix detail"]
    }
  ],
  "metrics": [
    {
      "id": "team-score",
      "category": "custom",
      "value": 4,
      "unit": "points",
      "band": "good"
    }
  ],
  "artifacts": []
}
```

#### Merge Rules

- Metric-pack findings are stored under `extensions[]`.
- Metric packs do not overwrite the core summary.
- Metric packs should use unique IDs so repeated runs remain easy to compare.

## File: `references/observed-usage.md`

### Observed Usage Inputs

`plugin-eval` can ingest local JSON or JSONL files that contain token telemetry from real runs.

#### Supported Shapes

The parser accepts these common patterns:

- a Responses API object with a top-level `usage`
- a `response.done` event with `response.usage`
- a wrapper object with `response.usage`
- arrays of the objects above
- JSONL files where each line is one object

#### Example

```json
{
  "id": "resp_123",
  "usage": {
    "input_tokens": 180,
    "output_tokens": 96,
    "total_tokens": 276,
    "input_token_details": {
      "cached_tokens": 48
    },
    "output_tokens_details": {
      "reasoning_tokens": 22
    }
  },
  "metadata": {
    "scenario": "cold-start refactor task"
  }
}
```

#### CLI

```bash
plugin-eval analyze ./skills/my-skill --observed-usage ./runs/responses.jsonl
plugin-eval measurement-plan ./skills/my-skill --observed-usage ./runs/responses.jsonl --format markdown
```

#### Interpretation

- Static budgets remain the deterministic local estimate.
- Observed usage adds a second signal based on real sessions.
- The tool compares `trigger_cost_tokens + invoke_cost_tokens` against the observed average input tokens.
- Cached and reasoning tokens are reported when present so warm-cache runs do not get mistaken for cold-start runs.

## File: `references/technical-design.md`

### Plugin Eval Technical Design

#### Overview

`plugin-eval` is a local-first Codex plugin and CLI for evaluating Codex skills and plugins. The design centers on a deterministic local engine that emits a stable `evaluation-result` JSON document. Skills orchestrate the engine. Report renderers, comparison views, workflow guides, and future app visualizations consume the same JSON contract.

The first version is intentionally static:

- No live Codex benchmarking
- No remote repository evaluation
- No automatic test execution
- No requirement for external dependencies beyond Node

#### Primary Goals

- Evaluate local skill and plugin bundles with predictable results.
- Make token and context costs visible early, especially for skill authors.
- Provide concrete quality signals for TypeScript and Python code.
- Create a normalized extension point for custom metric packs.
- Generate improvement briefs that pair naturally with the shipped `skill-creator` workflow.
- Make the recommended chat-first workflow obvious for first-time skill authors.

#### Non-Goals For V1

- Measuring actual Codex desktop host token consumption end to end
- Running a skill inside the Codex host as part of the evaluation
- Replacing model or product-level eval frameworks
- Language-specific deep analysis for every language beyond TypeScript and Python

#### Architecture

##### 1. Core Engine

The core engine lives under `src/core/` and owns:

- target resolution (`skill`, `plugin`, or generic directory/file)
- result schema creation
- budget calculation and banding
- score and risk summary generation
- metric-pack execution
- improvement brief generation

The engine is the source of truth. Other surfaces must not invent their own scoring logic.

##### 2. Evaluators

Evaluators live under `src/evaluators/` and return normalized fragments:

- `checks[]`
- `metrics[]`
- `artifacts[]`

Built-in evaluators:

- skill structure and frontmatter checks
- plugin manifest and path checks
- token and context budget analysis
- TypeScript metrics
- Python metrics
- coverage artifact ingestion

##### 3. Renderers

Renderers live under `src/renderers/` and consume the canonical evaluation payload.

Supported report formats:

- JSON
- Markdown
- HTML

The report output is deliberately thin. It should present the existing result cleanly, not compute new conclusions.

##### 4. Codex Skills

The plugin exposes lightweight skills that route users into the engine:

- `plugin-eval`
- `evaluate-skill`
- `evaluate-plugin`
- `metric-pack-designer`
- `improve-skill`

These skills stay small and point users to references and CLI commands instead of embedding bulky logic.

The beginner paved road is:

1. User asks in chat: "Evaluate this skill." or "What should I run next?"
2. The umbrella skill or focused skill can run `plugin-eval start <path> --request "<user request>" --format markdown` to route that request intentionally.
3. The rendered output shows the routed chat request, the quick local entrypoint, and the first underlying workflow command side by side.

#### Canonical Result Shape

The canonical result is a JSON object with:

- `target`
- `summary`
- `budgets`
- `checks[]`
- `metrics[]`
- `artifacts[]`
- `extensions[]`
- `improvementBrief`

##### Summary

`summary` includes:

- `score`
- `grade`
- `riskLevel`
- `topRecommendations[]`

The summary is calculated from built-in checks only. Extension metric packs are stored under `extensions[]` and do not overwrite the core summary.

##### Checks

Every check uses the normalized fields:

- `id`
- `category`
- `severity`
- `status`
- `message`
- `evidence[]`
- `remediation[]`
- `source`

##### Metrics

Every metric uses the normalized fields:

- `id`
- `category`
- `value`
- `unit`
- `band`
- `source`

#### Budget Model

The budget model is a first-class part of the evaluation result and uses three scored buckets:

- `trigger_cost_tokens`
- `invoke_cost_tokens`
- `deferred_cost_tokens`

Policy-aware plugin analyses may also include an unscored visibility bucket:

- `explicit_only_invoke_cost_tokens`

##### Definitions

- `trigger_cost_tokens`: text likely to matter before explicit invocation, such as names, descriptions, and starter prompts
- `invoke_cost_tokens`: core instruction payloads that are likely loaded when the skill or plugin is invoked
- `deferred_cost_tokens`: supporting references, scripts, and related text assets that are only pulled in later
- `explicit_only_invoke_cost_tokens`: skill payloads marked `policy.allow_implicit_invocation: false` in `agents/openai.yaml`; these remain visible as explicit load ceilings but are excluded from implicit trigger/invoke scoring

##### Measurement Mode In V1

The current implementation labels budget analysis as `estimated-static` or `estimated-static-policy-aware`.

That means:

- token counts are estimated locally from file contents
- the estimate is deterministic and repeatable
- budget bands are calibrated against a baseline corpus of shipped Codex skills and plugins when available locally
- `estimated-static-policy-aware` honors `agents/openai.yaml` invocation policy, so explicit-only skills do not inflate implicit active-context findings

##### Why Static Estimation First

We do not currently assume that the Codex plugin runtime exposes per-skill or per-plugin host token telemetry to plugins. The official OpenAI docs do show token usage support at the Responses API layer, but that is different from host-level Codex plugin execution telemetry.

#### OpenAI Token Telemetry Notes

##### What The Official Docs Do Show

As of April 7, 2026:

- the Responses API returns a `usage` object with `input_tokens`, `output_tokens`, and `total_tokens`
- the Responses API exposes `POST /v1/responses/input_tokens` to count request input tokens without running a full generation
- reasoning-capable responses expose extra token detail such as reasoning token counts

##### What We Did Not Confirm

We did not find official documentation showing that a Codex plugin or skill can directly inspect the host runtime's own per-skill token usage from inside Codex.

##### Design Consequence

V1 keeps token analysis local and estimated.

V2 can add an optional measured harness that:

- wraps a skill or plugin task in a controlled Responses API request
- captures `usage` from the response object
- optionally calls the input-token-count endpoint before execution
- records measured results beside static estimates instead of replacing them

#### Future Harness Design

The future measured harness should be a separate execution mode, not the default.

Recommended shape:

- `static` mode: current default, zero network requirement
- `measured` mode: explicit opt-in, requires API credentials and a harness config

Measured harness outputs should live next to the static budget fields, for example:

- `budgets.method: "estimated-static"` or `"measured-responses-api"`
- `artifacts[]` entry for raw usage snapshots
- `extensions[]` or a dedicated measured-budget artifact for side-by-side comparison

This keeps the schema forward-compatible.

##### Observed Usage In The Current Implementation

The current CLI now supports an intermediate step between purely static analysis and a fully managed harness:

- users can pass one or more `--observed-usage` files to `plugin-eval analyze`
- the files can contain Responses API usage payloads or Codex-like local session exports
- the result stores an `observedUsage` summary with averages, min/max values, cached tokens, and estimate drift
- the tool emits a built-in measurement plan so teams can decide what else to instrument beyond tokens

This keeps the default local-first while giving teams a way to calibrate the estimate against reality.

#### Benchmark Harness For New Skill Authors

The next layer is a guided benchmark harness designed to be approachable for first-time skill authors:

- `plugin-eval init-benchmark <path>` writes a starter benchmark config with editable plain-language scenarios
- `plugin-eval benchmark <path> --dry-run` previews the exact Requests API payload shape before any network call
- `plugin-eval benchmark <path>` runs the scenarios, captures `usage`, and writes a local JSONL usage log
- the resulting usage log can be fed directly back into `plugin-eval analyze --observed-usage ...`

The benchmark harness is intentionally not framed as a full scientific eval system. It is the paved road for collecting:

- representative token usage
- first-pass scenario coverage
- a reusable scenario file that teams can gradually improve

This keeps the workflow intuitive:

1. Generate starter scenarios.
2. Edit them to match the real task.
3. Dry-run to preview.
4. Run live.
5. Feed the usage file back into analysis.

#### Chat-First Workflow Guide

The CLI now includes a beginner router:

- `plugin-eval start <path>`

It is intentionally small and deterministic. It does not replace the engine or invent new scoring. It only maps natural user intents such as:

- `Evaluate this skill.`
- `Measure the real token usage of this skill.`
- `Help me benchmark this plugin.`
- `What should I run next?`

to the existing local command sequences.

#### Metric Packs

Metric packs are external evaluators that produce schema-compatible findings.

Manifest responsibilities:

- `name`
- `version`
- `supportedTargetKinds`
- `command`

Runtime contract:

- the pack executes locally
- the pack receives target path and target kind
- the pack writes JSON to stdout
- the JSON may contain `checks[]`, `metrics[]`, and optional `artifacts[]`

The core engine stores the result under `extensions[]` without allowing packs to rewrite the main summary.

#### Improvement Loop

The improvement loop is:

1. Evaluate a skill or plugin.
2. Review the prioritized checks and budget findings.
3. Generate an improvement brief.
4. Use `improve-skill` together with `skill-creator` guidance to refactor the skill.
5. Re-run evaluation and compare results.

#### Testing Strategy

Fixture-driven tests verify:

- valid result JSON generation
- Markdown and HTML report rendering
- oversized descriptions and bloated `SKILL.md` detection
- broken plugin manifests and missing paths
- TypeScript and Python metrics
- coverage artifact ingestion
- custom metric-pack merging
- improvement brief generation
- comparison output

#### References

- Responses API reference: [https://platform.openai.com/docs/api-reference/responses/create?api-mode=responses](https://platform.openai.com/docs/api-reference/responses/create?api-mode=responses)
- Responses input items and input token counts: [https://platform.openai.com/docs/api-reference/responses/input-items?lang=node.js](https://platform.openai.com/docs/api-reference/responses/input-items?lang=node.js)
- Reasoning token usage example: [https://platform.openai.com/docs/guides/reasoning/reasoning%3B.docx](https://platform.openai.com/docs/guides/reasoning/reasoning%3B.docx)
