# Eval mode

Read [Studio policy](../../../references/studio-policy.md) first. Two local engines are bundled and need no external evaluator plugin:

- **Studio eval**, `node scripts/studio.mjs skill-eval|plugin-eval ...`: static readiness, risks, budget estimates, benchmark runs and compare-reports.
- **Plugin Eval engine**, `node scripts/plugin-eval.js ...`, vendored from plugin-eval 0.1.2: a chat-first start router, fix-first reports, code/coverage metrics for TypeScript and Python, budget explanations, observed-usage measurement plans, improvement briefs and HTML reports.

<a id="src-pe-plugin-eval-plugin-eval"></a>
<a id="src-pe-plugin-eval-start-here"></a>
## Start here

1. Resolve whether the target path is a skill, a plugin, or another local folder.
   - If the user names a skill instead of giving a path, resolve it locally before running commands. Check `~/.codex/skills/<skill-name>` first, then `~/.claude/skills/<skill-name>`, then any repo-local `skills/<skill-name>` directory.
   - If the name is still ambiguous, ask one short clarifying question before continuing.
2. When the user speaks naturally or is not sure which command they need, prefer the chat-first router:
   `node scripts/plugin-eval.js start <path> --request "<user request>" --format markdown`
3. Route natural chat requests to the matching workflow:
   - "Give me an analysis of the game dev skill." Resolve the named skill path and run `analyze <path> --format markdown`. Then initialize a benchmark and show the setup questions needed to tailor `benchmark.json`.
   - "Evaluate this skill." / "Why did this score that way?" / "What should I fix first?" → `analyze <path> --format markdown`.
   - "Explain the token budget for this skill." → `explain-budget <path> --format markdown`.
   - "Measure the real token usage of this skill." → run the benchmark flow, then `measurement-plan`.
   - "Help me benchmark this plugin." → the starter benchmark flow.
   - "What should I run next?" → `start <path> --request "What should I run next?" --format markdown`.
4. If the user wants rewrite help after evaluation, switch to [improve mode](improve.md). If the user wants a custom rubric, switch to [metric-pack mode](metric-pack.md).
5. When the request sounds like "analysis" rather than just "evaluate", take the fuller path:
   1. Run the report.
   2. Initialize `.plugin-eval/benchmark.json`.
   3. Surface the setup questions that will refine the starter scenarios.
   4. Preview the dry-run command the user can execute next.

<a id="src-skill-eval-skill-eval"></a>
## Skill eval with the Studio engine

Run `node scripts/studio.mjs skill-eval <target> --mode static --format markdown`.

- Read structural findings, risks, evidence, budget estimates and UNKNOWN measurements separately. A high score cannot override blockers.
- **Practical testing:**
  1. Create a benchmark configuration with `benchmark-init <target>`.
  2. Supply scenario-specific fixtures and verifiers.
  3. Run `skill-eval <target> --mode benchmark --config <config> --out <results>`.
- Do not execute a reviewed artifact during static analysis.
- Isolation and existing authentication must pass preflight. If they cannot, keep the static report and show the exact benchmark blocker.
- Run baseline and skill against identical fixtures, and use held-out trigger cases when improving descriptions.
- Never present a simulated runner test as a real model evaluation.

<a id="src-plugin-eval-plugin-eval"></a>
## Plugin eval with the Studio engine

Run the legacy manifest checks with `node scripts/plugin-studio.mjs validate <target>` and `evaluate`. Run deeper analysis with `node scripts/studio.mjs plugin-eval <target> --format markdown`.

- Report these separately:
  - the strongest and weakest skill evidence;
  - package blockers;
  - observed behavior;
  - declared permissions;
  - unavailable host evidence.
- Compare reports with `compare-reports <before.json> <after.json>`. Use the skill eval above for focused skill experiments.
- **Claude packages:** for a package with `.claude-plugin/plugin.json`, use `plugin-eval --mode static`.
  - Studio inventories local skills, commands, agents, hook events and MCP declarations, and checks their packaged references.
  - MCP bundles and other opaque declarations produce incomplete coverage.
  - Report runtime installation and activation using separate Claude evidence.
- The Studio benchmark runner uses Codex.

<a id="src-pe-evaluate-skill-evaluate-skill"></a>
<a id="src-pe-evaluate-skill-workflow"></a>
## Evaluate a skill with the Plugin Eval engine

Use this when the target is a local skill directory or `SKILL.md` file.

1. Treat "Evaluate this skill." as the default entrypoint.
2. If the user names a skill instead of giving a path, resolve it locally first, as in step 1 of Start here.
3. If the user states the request in natural language first, use `node scripts/plugin-eval.js start <skill-path> --request "<user request>" --format markdown` to show the routed path clearly.
4. Run `node scripts/plugin-eval.js analyze <skill-path> --format markdown`.
5. Review `At a Glance`, `Why It Matters`, `Fix First` and `Recommended Next Step` before drilling into details.
6. Explain which findings are structural, which are budget-related and which are code-related.
7. If the user asks for an "analysis" of the skill, do not stop at the report. Also run `init-benchmark <skill-path>` and show the setup questions for refining the starter scenarios in `.plugin-eval/benchmark.json`.
8. If the user wants real usage numbers, switch to "Measure the real token usage of this skill." and run the benchmark flow.
9. After observed usage is available, use `measurement-plan <skill-path> --observed-usage <usage.jsonl> --format markdown` to recommend what to instrument or improve next.
10. If the user wants a rewrite plan, switch to [improve mode](improve.md).

<a id="src-pe-evaluate-skill-skill-specific-priorities"></a>
Skill-specific priorities:

- frontmatter validity
- `name` and `description` quality
- progressive disclosure and reference usage
- broken relative links
- oversized `SKILL.md` or descriptions
- helper script quality for TypeScript and Python files

<a id="src-pe-evaluate-plugin-evaluate-plugin"></a>
<a id="src-pe-evaluate-plugin-workflow"></a>
## Evaluate a plugin with the Plugin Eval engine

Use this when the target is a plugin root with `.codex-plugin/plugin.json`.

1. Treat "Evaluate this plugin." as the default entrypoint.
2. If the request comes in as natural chat language, run `node scripts/plugin-eval.js start <plugin-root> --request "<user request>" --format markdown` first, so the user sees the routed local path.
3. Run `node scripts/plugin-eval.js analyze <plugin-root> --format markdown`.
4. Read `Fix First` before drilling into manifest findings, nested skill findings, and code or coverage details.
5. If the plugin contains multiple skills, summarize the strongest and weakest ones explicitly.
6. If the user wants measured usage, switch to "Help me benchmark this plugin." and use the starter benchmark flow.
7. If the user wants trend data, compare two JSON outputs with `node scripts/plugin-eval.js compare`.

<a id="src-pe-plugin-eval-chat-requests-to-recognize"></a>
<a id="src-pe-evaluate-skill-chat-requests-to-recognize"></a>
<a id="src-pe-evaluate-plugin-chat-requests-to-recognize"></a>
<a id="src-pe-manifest"></a>
## Chat requests to recognize

- `Give me an analysis of the game dev skill.` / `Give me an analysis of the game studio plugin.`
- `Evaluate this skill.` / `Evaluate this plugin.`
- `Audit this skill.` / `Audit this plugin.`
- `Why did this score that way?` / `Why did this skill score that way?`
- `What should I fix first?`
- `Explain the token budget for this skill.`
- `Measure the real token usage of this skill.`
- `Help me benchmark this plugin.`
- `What should I run next?`

<a id="src-pe-plugin-eval-matching-commands"></a>
<a id="src-pe-evaluate-skill-commands"></a>
<a id="src-pe-evaluate-plugin-commands"></a>
<a id="src-pe-commands"></a>
## Commands

Every Plugin Eval command is `node scripts/plugin-eval.js <command>`:

```bash
node scripts/plugin-eval.js start <path> --request "Evaluate this skill." --format markdown
node scripts/plugin-eval.js start <path> --request "Give me a full analysis of this skill, including benchmark setup." --format markdown
node scripts/plugin-eval.js start <plugin-root> --request "What should I run next?" --format markdown
node scripts/plugin-eval.js analyze <path> --format markdown
node scripts/plugin-eval.js analyze <path> --metric-pack <manifest.json>
node scripts/plugin-eval.js analyze <skill-path> --brief-out ./skill-brief.json
node scripts/plugin-eval.js explain-budget <path> --format markdown
node scripts/plugin-eval.js measurement-plan <path> --format markdown
node scripts/plugin-eval.js measurement-plan <path> --observed-usage <usage.jsonl> --format markdown
node scripts/plugin-eval.js init-benchmark <path>
node scripts/plugin-eval.js benchmark <path> --dry-run
node scripts/plugin-eval.js benchmark <path>
node scripts/plugin-eval.js compare before.json after.json
node scripts/plugin-eval.js report result.json --format html --output ./plugin-eval-report.html
node scripts/plugin-eval.js guide <path>
```

<a id="src-pe-plugin-eval-output-expectations"></a>
## Output expectations

- Prefer the JSON result as the source of truth.
- Lead with `At a Glance`, `Why It Matters`, `Fix First` and `Recommended Next Step`. Keep the "why" content terse and easy to skim.
- Call out whether budget numbers are static estimates or measured harness results.
- Show the user the exact chat phrase they can reuse next, the `start` command that routes it, and the first local workflow command behind it.
- When the user asks for an analysis of a named skill, do not stop at the report if benchmark setup is still missing.
- A question about a skill follows "Evaluate a skill"; a question about a plugin bundle follows "Evaluate a plugin".

<a id="src-pe-workspace-files"></a>
## Workspace files

Plugin Eval writes local working files that should not be committed:

- `.plugin-eval/`
- `.tmp/`
- `*.analysis.json`, `*.report.html`, `*.report.md`

`node_modules/` and `.DS_Store` are also ignored. Add these patterns to the target project's ignore file when the user wants that.

<a id="src-pe-plugin-eval-references"></a>
<a id="src-pe-evaluate-skill-reference"></a>
<a id="src-pe-evaluate-plugin-reference"></a>
<a id="engine-coverage"></a>
## References

- [chat-first workflows](../../../references/plugin-eval/chat-first-workflows.md)
- [technical design](../../../references/plugin-eval/technical-design.md)
- [evaluation result schema](../../../references/plugin-eval/evaluation-result-schema.md)
- [benchmark harness](../../../references/plugin-eval/benchmark-harness.md)
- [observed usage](../../../references/plugin-eval/observed-usage.md)
- [metric pack manifest](../../../references/plugin-eval/metric-pack-manifest.md)
- [upstream README](../../../references/plugin-eval/README.md)
