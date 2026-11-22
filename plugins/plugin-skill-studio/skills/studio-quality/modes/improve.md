# Improve mode

Read [Studio policy](../../../references/studio-policy.md) first. This mode has two depths:

- **Evidence rewrite:** a single, reviewed improvement from eval findings.
- **Autoresearch loop:** measured keep/discard experiments in which code, never self-assessment, decides what is kept.

<a id="src-ar-input"></a>
<a id="src-sar-phase-1--find-and-copy-the-skill"></a>
## Resolve the target

Resolve the argument in this order and stop at the first hit:

1. A path to `SKILL.md`, or to a folder containing it.
2. `~/.claude/skills/<name>/SKILL.md`, then `~/.codex/skills/<name>/SKILL.md`.
3. `.claude/skills/<name>/SKILL.md` or `skills/<name>/SKILL.md` in the current project.
4. `<plugin>:<skill>`: find installed plugins whose manifest has that name, then their `skills/<skill>/SKILL.md`.

If nothing matches or more than one path matches, show the candidates and ask the user to pick. Do not guess.

Show the target name, source path, `SKILL.md` line count, its section count, its domain, and whether the path is an install cache.

- **Cache rule:** a path under `.claude/plugins/`, `AppData/Roaming/Claude/rpm/` or `plugins/cache/` is an install cache. Caches are never edited.
- **Cache with a source:** if an editable source exists (the plugin's repository), switch to it.
- **Cache without a source:** say so and stop. The autoresearch engine refuses cache paths.

Confirm that the selected path is an editable source rather than an installation cache or an upstream snapshot.

<a id="src-improve-skill-improve-a-skill-from-evidence"></a>
<a id="src-pe-improve-skill-improve-skill"></a>
<a id="src-pe-improve-skill-workflow"></a>
<a id="src-pe-improve-skill-chat-requests-to-recognize"></a>
<a id="src-pe-improve-skill-commands"></a>
## Evidence rewrite

Typical requests: "Improve this skill based on the evaluation.", "Rewrite this skill using the plugin-eval findings.", "What should I fix first in this skill?"

1. Evaluate the current skill and keep the before report:
   - `node scripts/studio.mjs skill-eval <skill-root> --format json > before.json`
   - `node scripts/plugin-eval.js analyze <skill-path> --brief-out ./skill-brief.json`, which writes a rewrite brief.
2. Separate required structural failures from recommended clarity, budget and progressive-disclosure improvements. Group the brief into required fixes and recommended fixes.
3. Apply only changes supported by the findings and the user's intended use cases. Do not accumulate universal rules from one example. Follow `studio-build` create-skill mode for authoring rules.
4. Preserve frontmatter fields, and preserve `agents/openai.yaml` policy and dependencies that the requested change does not involve.
5. Re-run validation and evaluation. Compare the before and after evidence, including unresolved limitations: `compare-reports before.json after.json` or `node scripts/plugin-eval.js compare before.json after.json`.
6. Do not install, publish, delete the original or replace another same-name skill without a separate, exact request.

<a id="src-pe-improve-skill-reference"></a>
Reference: [chat-first workflows](../../../references/plugin-eval/chat-first-workflows.md).

<a id="src-pe-improve-skill-focus-areas"></a>
Focus areas:

- reduce trigger and invoke token costs
- keep `SKILL.md` compact
- move bulky details into references or scripts
- improve trigger descriptions
- fix broken links and manifest/frontmatter issues

<a id="src-ar-auto-research-autonomous-skill-improvement"></a>
<a id="src-sar-skill-autoresearch"></a>
<a id="src-sar-rules"></a>
## Autoresearch loop

Use this when the user asks to auto-research, benchmark or measurably improve a skill.

The loop follows the autoresearch methodology (Karpathy): propose → change one thing → measure → keep or discard. The model proposes and edits. The engine in `src/eval/autoresearch.mjs` judges.

**Rules:**

- Never edit the target skill during the loop. Work only in the run's `candidate/` copy.
- Check commands and verifiers must not use the network.
- Run the loop without asking between experiments. The user approves only the final diff.

<a id="src-sar-phase-2--propose-and-lock-test-tasks"></a>
### 1. Locked benchmark tasks (strongly recommended)

Without a benchmark config, every verdict is UNKNOWN. Build one before starting.

1. **Propose tasks.** Read the skill and its references, then propose 5–8 tasks.
   - Tie each task to one concrete instruction in the skill (`targets`).
   - Put each fixture in its own folder. The format is described in [locked task format](../references/locked-tasks-format.md).
2. **Convert them to benchmark scenarios.** Run `node scripts/studio.mjs benchmark-init <skill-root>`. Each task becomes one scenario: its fixture becomes the scenario fixture, and its `check` becomes a verifier command.
3. **Validate each check** on an untouched copy of its fixture:
   - Exit 0 means the task is too easy. Discard it and say so.
   - Exit 127 or `command not found` means the check tool is missing. Fix the check or tell the user; do not keep the task.
   - Any other non-zero exit means the task is valid.
4. **Too few tasks.** If fewer than 5 valid tasks remain, ask the user whether to continue.
5. **Approval.** Show every task (id, prompt, check, targets) and wait for approval. Apply the user's edits, then re-run step 3 for changed tasks.
6. **Lock.** After approval, write the sha256 of the config and of every fixture file to `bench.lock`.
7. **Verify the lock** before every later experiment. A mismatch means the tasks or fixtures were edited, added or removed, so stop.

<a id="src-sar-phase-3--estimate-approval-and-baseline"></a>
### 2. Estimate, approval and baseline

**Estimate.** A benchmark run costs model runs: one baseline run and one skill run per scenario, for the baseline and for each experiment.

- Show the formula with numbers: runs = N × 2 for the baseline, plus E × N × 2 for E experiments, where N is the number of scenarios. The default E is 5.
- Ask the user to approve a maximum E, and ask separately whether research may use web search.
- Do nothing more until both are approved. Never exceed the approved E.

**Baseline.** Run `node scripts/studio.mjs autoresearch-start <skill-root> --config <bench.json>`. It:

- copies the skill to `candidate/` and `kept/` in `<parent>/.autoresearch/<timestamp>-<name>/`;
- records the static eval, the benchmark and the source hash in `baseline.json`.

The benchmark's baseline mode, which runs without the skill, is the no-skill control.

**Outcome of one run:**

- A verifier exit of 0 is a pass.
- An agent that errored, stopped or never finished is a fail. Its verifier is not run.
- A timeout or any other non-zero exit is a fail.
- A missing tool is not a fail. Stop the phase and report it, because it would make the score wrong.
- The agent's own claim of success does not count.

**Integrity:**

- Benchmark preflight must pass isolation, so agents work only in their scenario workspace.
- After each batch, verify the lock and confirm that the source still matches `baseline.json` (`sourceHash`).
- On a mismatch, stop: something wrote outside its folder.

**Score:** passes ÷ runs. Each experiment's receipt keeps the pass counts, failed runs' verifier output and the agent summaries. The proposals step uses them.

<a id="src-ar-phase-1-discovery"></a>
### 3. Discovery

Read the entire skill file and every file it references. Extract:

- its name and description
- its domain or technology area
- its current structure: sections and subsections
- the tools, APIs or frameworks it references
- its examples and templates

The run's `kept/` copy is the backup that reverts use.

<a id="src-ar-phase-2-parallel-research-5-agents"></a>
<a id="src-ar-agent-1-domain-best-practices-researcher"></a>
<a id="src-ar-agent-2-skill-structure--quality-auditor"></a>
<a id="src-ar-agent-3-competitive-analysis--example-hunter"></a>
<a id="src-ar-agent-4-gap-analysis--missing-scenarios"></a>
<a id="src-ar-agent-5-technology--ecosystem-scout"></a>
### 4. Research lenses

Work through five lenses in this thread. Do not use subagents. Lenses 1, 3 and 5 search the web only when the user approved web research for this run. Without approval they use local files, the skill's references and the eval findings, and the missing web evidence is reported as UNKNOWN.

1. **Domain best practices.** Look for authoritative patterns, conventions, official guidance and anti-patterns for the domain, and for outdated advice in the skill. With web research, cite sources.
2. **Structure and quality audit.** Score actionability, clarity, completeness, examples, edge cases, conciseness and trigger accuracy from 1 to 10. Explain each score and suggest specific improvements. Use the static eval findings as evidence. These scores rank proposals only and never decide KEEP.
3. **Comparable guides and examples.** Look at how others write similar instructions: cheatsheets, AI coding rules, high-quality READMEs. Note patterns, unique techniques, adaptable snippets and structural patterns.
4. **Gap analysis.** Look for gaps in the user journey, error handling, integration, prerequisites and output specification. Order them by impact.
5. **Technology and ecosystem.** Look for outdated references, deprecated patterns, new tools and breaking changes that affect the skill's advice.

<a id="src-ar-phase-3-synthesis"></a>
### 5. Synthesis

1. Collect and de-duplicate the findings, and merge overlapping suggestions.
2. Score each proposal:
   - Impact (1–5)
   - Confidence (1–5)
   - Complexity (1–5, where lower is simpler and better)
3. Priority = Impact × Confidence ÷ Complexity. Rank proposals in descending order.
4. Show the quality baseline (the lens 2 scores and the static and benchmark baselines) and the ranked proposals.
5. Proposals that remove content while keeping value rank above additions.

<a id="src-ar-phase-4-iterative-improvement-loop"></a>
<a id="src-ar-step-1-describe-the-experiment"></a>
<a id="src-ar-step-2-apply-the-change"></a>
<a id="src-ar-step-3-evaluate-self-critique"></a>
<a id="src-ar-step-4-keep-or-discard"></a>
<a id="src-ar-step-5-continue"></a>
### 6. Experiment loop

Process proposals one at a time in priority order, up to the approved maximum E.

1. **Describe** the experiment: number, short description, priority score, and category (best-practice, structure, example, gap or update).
2. **Apply** one logical change to `candidate/`.
   - Re-read the file first, because earlier experiments changed it.
   - Never combine improvements in one experiment.
3. **Self-check** before judging: is the change accurate, clearer, a genuine value-add and lean? If you are uncertain whether it is correct, revert it yourself and log it as discarded. Accuracy beats coverage.
4. **Judge** with `node scripts/studio.mjs autoresearch-judge <run-dir> --description "<text>"`. Exit codes:
   - **KEEP (0):** no new static blocker, and the benchmark is at least as good as the last kept version on identical fixtures.
   - **DISCARD (3):** the engine has already restored `candidate/` from `kept/`.
   - **UNKNOWN (2):** no benchmark config. The change stays in `candidate/` as an unverified stack and is never reported as a pass.
5. **Log** the outcome from the receipt: `KEEP|DISCARD|UNKNOWN Experiment #N: <description> (<reasons>)`.
6. **Continue** with the next proposal. A change that makes the file much longer without proportional value should be discarded before judging. Process all approved experiments unless the user interrupts.

To resume an interrupted run, use `resumeRun`. It refuses a `kept/` snapshot that no longer matches its last receipt.

<a id="src-ar-phase-5-results-report"></a>
### 7. Results report

Run `node scripts/studio.mjs autoresearch-report <run-dir>`. It writes:

- `report.json`, with the experiment counts (kept, discarded, unknown), the before/after static and benchmark results, and the experiment log;
- `combined.diff`, comparing the source with `kept/`;
- `unverified-stack.diff`, when UNKNOWN changes exist.

Show the target, the number of experiments run, kept and discarded, every change with its reason, and the score change from before to after.

Then offer three choices:

1. Review the changes in detail.
2. Run another cycle.
3. Discard the run.

**The source changes only after the user approves `combined.diff`.** Apply that diff to the editable source, then re-run validation.

<a id="src-ar-key-principles-adapted-from-autoresearch"></a>
### Key principles

1. **Single metric focus:** the benchmark pass count, guarded by the static eval. Every change must justify itself.
2. **Fixed scope:** modify only the skill's files, never other infrastructure.
3. **Autonomous operation** between the approval of E and the final diff.
4. **Simplicity criterion:** a small gain that adds ugly complexity is not worth it. Removing something while keeping results is a great outcome.
5. **Results tracking:** a receipt and a diff for every experiment.
6. **Git-like semantics:** keep (advance) or discard (revert), with no half-measures.
7. **Never stop early:** process every approved experiment unless the user interrupts.
