# Skill: subagent-driven-development

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/subagent-driven-development/SKILL.md`

> Executes an implementation plan by dispatching one subagent per task with per-task review gates, keeping the orchestrator's context small. Use when executing plans with independent tasks in the current session.

## Instructions

Read [Studio policy](../../references/studio-policy.md) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](../../references/integration-registry.json); never load companion plugins.

### Subagent-Driven Development

Execute a plan with one fresh implementer per task, a task-scoped review after each implementation, and one whole-branch review at the end.

This workflow requires isolated worker dispatch. If the host cannot dispatch subagents, use `executing-plans` instead.

**Core principle:** Fresh implementer + spec and quality review + scoped fixes + final review.

**Narration:** Between tool calls, use at most one short line. The ledger and tool results carry the durable record.

**Continuous execution:** Run every task without asking whether to continue. Stop only for an unresolved blocker, ambiguity that prevents safe progress, or completed work.

#### When to Use

Use this workflow when all are true:

- A decision-complete implementation plan exists.
- Tasks are independent enough for one implementer at a time.
- Work stays in the current session.
- The host supports isolated workers.

Use `executing-plans` for a parallel session. Return to planning when tasks are tightly coupled or the plan is incomplete.

#### Setup

1. Verify an isolated workspace with `using-git-worktrees`. Work on `main` or `master` only with explicit user consent.
2. Invoke this skill's scripts through Bash on every platform because packaging may not preserve executable bits. On Windows, use Git Bash.
3. Resolve the plan workspace:

   ```bash
   bash <skill-dir>/scripts/sdd-workspace PLAN_FILE
   ```

   The command prints `<repo-root>/.skillquiver/sdd/<plan-basename>-<path-hash>/`. This git-ignored directory owns every artifact for this plan: ledger, briefs, reports, and review packages. Never reuse another plan's directory.
4. Inspect `<workspace>/progress.md`:
   - If its first line names this plan, treat every `Task <N>: complete` line as authoritative and resume at the first incomplete task.
   - If a task ends with a fix-round entry, resume at the next round.
   - If the ledger names another plan, or exists at the obsolete `.superpowers/sdd/progress.md`, leave it intact and create this plan's ledger.
5. Create a missing ledger with `# SDD ledger — plan: <plan file path>` as its first line.
6. Read the plan once, record its context and Global Constraints, and create one todo per task.
7. Before Task 1, scan the complete plan for contradictions between tasks, Global Constraints, and the review rubric. Present all conflicts in one batched question beside the binding plan text. Proceed immediately when the scan is clean.

The ledger is the recovery map after compaction. Trust it and `git log` over conversation memory. `git clean -fdx` destroys this scratch workspace; recover task state from git history if that happens.

Completion criterion: the workspace belongs to the active plan, its ledger identity is correct, completed tasks are not re-dispatched, and every plan conflict is resolved before implementation.

#### Before the First Dispatch

Read [dispatch-and-model-selection.md](references/dispatch-and-model-selection.md) before dispatching the first worker. Re-read its model-selection section whenever the role or task complexity changes.

Worker context is constructed, not inherited. Pass only the task's requirements, relevant interfaces, constraints, and artifact paths. Every pasted prompt and worker response remains in controller context; hand large artifacts over as files.

#### Task Loop

Run these steps sequentially for each incomplete task. Never dispatch implementation workers in parallel.

##### 1. Dispatch the Implementer

1. Record `BASE` with `git rev-parse HEAD`.
2. Generate the task brief:

   ```bash
   bash <skill-dir>/scripts/task-brief PLAN_FILE N
   ```

3. Derive the report path from the brief: `task-N-brief.md` becomes `task-N-report.md` in the same workspace.
4. Compose one task dispatch containing:
   - One line explaining where the task fits.
   - The brief path introduced as the requirements and source of exact values.
   - Interfaces and decisions from earlier tasks that the brief cannot know.
   - Any resolved ambiguity.
   - A pointer to each parked ledger finding in an area this task touches.
   - The report path and short return contract.
5. Keep exact values, signatures, and test cases in the brief. Do not paste accumulated task history or send the whole plan.
6. Dispatch with [implementer-prompt.md](implementer-prompt.md) using the host mapping and model selected from the dispatch reference.
7. Record the worker identity so fix rounds 1–3 can resume it.

Completion criterion: the worker has isolated context, one task brief, one report path, the necessary prior interfaces, and no unrelated history.

##### 2. Handle the Implementer Status

- `DONE`: generate the review package and continue to task review.
- `DONE_WITH_CONCERNS`: read the concerns. Resolve correctness or scope doubts before review; ledger observations and continue.
- `NEEDS_CONTEXT`: provide the missing information and resume the same worker.
- `BLOCKED`: change the conditions before retrying—supply missing context, choose a more capable model, split an oversized task, or escalate a defective plan to the user.

Answer worker questions completely. Never repeat an unchanged dispatch after a worker reports that it is stuck.

Completion criterion: implementation is complete with a report and commit range, or the task has an explicit unresolved blocker.

##### 3. Review the Task

Before the first task review, read [review-and-fix-loop.md](references/review-and-fix-loop.md) through “Complete the Task.” Follow it for every review, finding, fix round, re-review, ledger entry, and breaker decision.

Generate the initial package with the `BASE` captured before implementation:

```bash
bash <skill-dir>/scripts/review-package PLAN_FILE BASE HEAD
```

Dispatch [task-reviewer-prompt.md](task-reviewer-prompt.md) with the printed package path, task brief, implementer report, and binding Global Constraints.

- Clean spec and quality verdicts: record task completion.
- Spec gap, Critical or Important finding, or confirmed `⚠️` gap: enter the referenced fix loop.
- Minor finding: defer it in the ledger for final review.
- Finding that conflicts with binding plan text: ask the user which governs.

Completion criterion: the ledger contains a task completion line and no Critical or Important finding remains open without a ruling at the five-round cap.

##### 4. Continue

Mark the task todo complete and move directly to the next incomplete task. The task review is the gate; controller self-review never replaces it.

#### Final Review and Finish

After every task has a completion line, read “Final Whole-Branch Review” and “Cleanup” in [review-and-fix-loop.md](references/review-and-fix-loop.md).

Generate the final review package over `MERGE_BASE..HEAD`, dispatch the most capable available reviewer, resolve at most one final fix wave, and record a ruling for every residual finding. Then remove only this plan's workspace and use `finishing-a-development-branch`.

Completion criterion: every task is complete in the ledger, the final review is clean or all residual findings have rulings, no load-bearing issue is hidden, and only the active plan's workspace is removed.

#### Calibration

When the controller stalls, rationalizes skipping a gate, or needs an end-to-end example, read [workflow-example.md](references/workflow-example.md).

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Subagent Development"
  short_description: "Execute plans through bounded subagent tasks"
  default_prompt: "Execute this plan through bounded tasks."

policy:
  allow_implicit_invocation: true
```

### File: `implementer-prompt.md`

#### Implementer Subagent Prompt Template

Use this template when dispatching an implementer subagent.

```
Host-neutral worker template (translate with references/dispatch-and-model-selection.md):
  task_label: "Implement Task N: [task name]"
  model_override: [MODEL — include only when the host supports explicit overrides;
                   choose per references/dispatch-and-model-selection.md]
  message: |
    You are implementing Task N: [task name]

    ## Task Description

    Read your task brief first: [BRIEF_FILE]
    It contains the full task text from the plan.

    ## Context

    [Scene-setting: where this fits, dependencies, architectural context]

    ## Before You Begin

    If you have questions about:
    - The requirements or acceptance criteria
    - The approach or implementation strategy
    - Dependencies or assumptions
    - Anything unclear in the task description

    **Ask them now.** Raise any concerns before starting work.

    ## Your Job

    Once you're clear on requirements:
    1. Implement exactly what the task specifies
    2. Write tests (following TDD if task says to)
    3. Verify implementation works
    4. Commit your work
    5. Self-review (see below)
    6. Report back

    Work from: [directory]

    **While you work:** If you encounter something unexpected or unclear, **ask questions**.
    It's always OK to pause and clarify. Don't guess or make assumptions.

    While iterating, run the focused test for what you're changing; run the
    full suite once before committing, not after every edit.

    ## Code Organization

    You reason best about code you can hold in context at once, and your edits are more
    reliable when files are focused. Keep this in mind:
    - Follow the file structure defined in the plan
    - Each file should have one clear responsibility with a well-defined interface
    - If a file you're creating is growing beyond the plan's intent, stop and report
      it as DONE_WITH_CONCERNS — don't split files on your own without plan guidance
    - If an existing file you're modifying is already large or tangled, work carefully
      and note it as a concern in your report
    - In existing codebases, follow established patterns. Improve code you're touching
      the way a good developer would, but don't restructure things outside your task.

    ## When You're in Over Your Head

    It is always OK to stop and say "this is too hard for me." Bad work is worse than
    no work. You will not be penalized for escalating.

    **STOP and escalate when:**
    - The task requires architectural decisions with multiple valid approaches
    - You need to understand code beyond what was provided and can't find clarity
    - You feel uncertain about whether your approach is correct
    - The task involves restructuring existing code in ways the plan didn't anticipate
    - You've been reading file after file trying to understand the system without progress

    **How to escalate:** Report back with status BLOCKED or NEEDS_CONTEXT. Describe
    specifically what you're stuck on, what you've tried, and what kind of help you need.
    The controller can provide more context, re-dispatch with a more capable model,
    or break the task into smaller pieces.

    ## Before Reporting Back: Self-Review

    Review your work with fresh eyes. Ask yourself:

    **Completeness:**
    - Did I fully implement everything in the spec?
    - Did I miss any requirements?
    - Are there edge cases I didn't handle?

    **Quality:**
    - Is this my best work?
    - Are names clear and accurate (match what things do, not how they work)?
    - Is the code clean and maintainable?

    **Discipline:**
    - Did I avoid overbuilding (YAGNI)?
    - Did I only build what was requested?
    - Did I follow existing patterns in the codebase?

    **Testing:**
    - Do tests actually verify behavior (not just mock behavior)?
    - Did I follow TDD if required?
    - Are tests comprehensive?
    - Is the test output pristine (no stray warnings or noise)?

    If you find issues during self-review, fix them now before reporting.

    ## After Review Findings

    If the task review finds issues, you will be resumed with the findings.
    Fix them, re-run the tests that cover the amended code, and append a fix
    report to your report file: what you changed, the covering tests you
    ran, the command, and the output. Reviewers will not re-run tests for
    you — your report is the test evidence. Then reply with the same short
    status contract as your first report.

    ## Report Format

    Write your full report to [REPORT_FILE]:
    - What you implemented (or what you attempted, if blocked)
    - What you tested and test results
    - **TDD Evidence** (if TDD was required for this task):
      - RED: command run, relevant failing output before implementation, and why the failure was expected
      - GREEN: command run and relevant passing output after implementation
    - Files changed
    - Self-review findings (if any)
    - Any issues or concerns

    Then report back with ONLY (under 15 lines — the detail lives in the
    report file):
    - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - Commits created (short SHA + subject)
    - One-line test summary (e.g. "14/14 passing, output pristine")
    - Your concerns, if any
    - The report file path

    If BLOCKED or NEEDS_CONTEXT, put the specifics in the final message
    itself — the controller acts on it directly.

    Use DONE_WITH_CONCERNS if you completed the work but have doubts about correctness.
    Use BLOCKED if you cannot complete the task. Use NEEDS_CONTEXT if you need
    information that wasn't provided. Never silently produce work you're unsure about.
```

### File: `re-review-prompt.md`

#### Scoped Re-Review Prompt Template

Use this template when dispatching a re-review after a fix round. The
re-reviewer verifies the findings were addressed and checks the fix diff for
new breakage. It is not a fresh review — the full review already happened.

**Purpose:** Verify each finding from the previous review was addressed, and
that the fix itself broke nothing.

```
Host-neutral worker template (translate with references/dispatch-and-model-selection.md):
  task_label: "Re-review Task N fix round R"
  model_override: [MODEL — include only when the host supports explicit overrides;
                   choose per references/dispatch-and-model-selection.md]
  message: |
    You are re-reviewing one task's fix round. A previous review produced
    findings; an implementer has attempted to fix them. Your job is to
    verdict each finding and inspect the fix diff — nothing else.

    ## The Task

    Read the task brief: [BRIEF_FILE]

    ## The Findings Under Verification

    [FINDINGS]

    ## The Fix

    Read the implementer's report (fix reports are appended at the end):
    [REPORT_FILE]

    **Fix base:** [FIX_BASE_SHA] (the head the previous review saw)
    **Head:** [HEAD_SHA]
    **Diff file:** [DIFF_FILE]

    Read the diff file once — it contains the fix commits, a stat summary,
    and the fix diff with surrounding context. Do not re-run git commands.
    If the diff file is missing, fetch the diff yourself:
    `git diff --stat [FIX_BASE_SHA]..[HEAD_SHA]` and
    `git diff [FIX_BASE_SHA]..[HEAD_SHA]`.

    Your review is read-only on this checkout. Do not mutate the working
    tree, the index, HEAD, or branch state in any way.

    ## Scope

    Your scope is the findings list and the fix diff. Verdict every finding.
    Inspect the fix diff for new problems the fix itself introduced. Do NOT
    re-review code the fix did not touch: if you notice an issue entirely
    outside the fix diff, report it under Out-of-Scope Observations — it
    does not block this task and does not extend the loop. A broad
    whole-branch review happens after all tasks are complete.

    ## Tests

    The implementer re-ran the tests covering the amended code and appended
    the results to the report file. Treat the report as unverified claims:
    confirm the fix report names the covering tests and shows their output,
    and verify the claims against the diff. Do not re-run the suite to
    confirm their report. Run a test only when reading the code raises a
    specific doubt that no existing run answers — and then a focused test,
    never a package-wide suite.

    ## Output Format

    Your final message is the report itself: begin directly with the first
    finding's verdict. Every line is a verdict, a finding with file:line,
    or a check you ran — no preamble, no process narration.

    ### Finding Verdicts

    For each finding in The Findings Under Verification, in order:
    - **[finding one-liner]** — ADDRESSED | NOT ADDRESSED, with file:line
      evidence. "Attempted" is not addressed: the specific defect must no
      longer exist.

    ### New Breakage in the Fix Diff

    Anything the fix itself broke or introduced, with severity
    (Critical/Important/Minor) and file:line. "None" if clean.

    ### Out-of-Scope Observations

    Issues you noticed entirely outside the fix diff. Non-blocking; the
    controller ledgers these for the final review. "None" if none.

    ### Verdict

    **Fix round:** [All findings addressed, no new Critical/Important
    breakage | Findings remain open] — list the open ones.
```

**Placeholders:**
- `[MODEL]` — reviewer model selected from [dispatch-and-model-selection.md](references/dispatch-and-model-selection.md) when the host supports explicit overrides; scoped
  re-reviews of small fix diffs take a cheap-to-mid tier
- `[BRIEF_FILE]` — the task brief file (same file the implementer worked from)
- `[FINDINGS]` — the Critical/Important findings and spec gaps from the
  previous review, copied verbatim, one per bullet
- `[REPORT_FILE]` — the implementer's report file (fix reports appended)
- `[FIX_BASE_SHA]` — the head the previous review saw
- `[HEAD_SHA]` — current commit
- `[DIFF_FILE]` — the path `scripts/review-package PLAN_FILE FIX_BASE HEAD` printed

**Re-reviewer returns:** per-finding verdicts (ADDRESSED / NOT ADDRESSED),
new breakage in the fix diff, out-of-scope observations, and a round verdict.

### File: `references/dispatch-and-model-selection.md`

#### Dispatch and Model Selection

Read this reference before the first worker dispatch and whenever a task changes role or capability needs.

##### Host Dispatch Mapping

Treat the worker templates' `task_label`, `message`, and optional `model_override` as host-neutral fields.

###### Codex

For every fresh worker, call `spawn_agent` with:

```text
task_name: task_n_implement        # stable snake_case label derived from task_label
message: <entire template message>
fork_turns: "none"                # pass only the context constructed in message
model: <model_override>            # include only when overrides are supported and selected
```

Record the returned worker target. For fix rounds 1–3, call `followup_task` with that same `target` and the findings in `message`; keep the original worker while it remains available.

###### ChatGPT and other hosts

Map `task_label` and `message` to the closest general-purpose worker dispatch fields. Include `model_override` only when the host exposes per-worker model selection.

##### Model Selection

Use the least powerful model that can complete the role reliably. Omit the model field when the host does not support overrides.

- Mechanical implementation with a complete specification or a one-to-two-file change: cheap model.
- Multi-file integration, pattern matching, or debugging: standard model.
- Architecture, design, and final whole-branch review: most capable model.
- Task review: match the model's judgment to the diff's size, complexity, and risk; use a mid-tier model as the floor for prose-defined work.
- Scoped re-review of a small fix: cheap-to-mid tier.
- Fix rounds 4–5: at least one tier above the implementer that stalled.

Turn count beats token price. Cheap models that need repeated turns can cost more overall. When the dispatch API supports an override, specify it explicitly so an expensive session default is not inherited accidentally.

Completion criterion: every fresh dispatch uses the correct host fields, isolated context, and an explicitly chosen model whenever the host supports overrides.

### File: `references/review-and-fix-loop.md`

#### Review and Fix Loop

Read this reference before the first task review. Apply every gate through task completion, then use the final-review section after all tasks finish.

##### Task Review

Per-task review is a task-scoped gate. It never replaces the broad whole-branch review.

1. Run `bash <skill-dir>/scripts/review-package PLAN_FILE BASE HEAD`, using the BASE recorded before implementation. Use the printed file path; `HEAD~1` can omit earlier commits from a multi-commit task.
2. Dispatch [task-reviewer-prompt.md](../task-reviewer-prompt.md) with the task brief, implementer report, review package, and binding global constraints.
3. Copy exact values, formats, and relationships from the plan's Global Constraints or specification. The reviewer template already carries process rules.
4. Require both verdicts: spec compliance and task quality. Implementer self-review does not replace either verdict.

The review package keeps the diff out of controller context and gives the reviewer the commit list, stat summary, and full diff in one read. Never dispatch a reviewer without it.

Do not ask the reviewer to repeat tests already evidenced in the implementer report. Add a test request only for a concrete doubt that the existing evidence does not answer. Do not pre-judge findings with instructions such as “do not flag,” “at most Minor,” or “the plan chose.” Let the reviewer raise the issue and adjudicate it through the loop.

A reviewer may return `⚠️ Cannot verify from diff` items. Resolve each one before completing the task. A confirmed gap enters the fix loop as a failed spec review.

Completion criterion: the review contains both verdicts, every `⚠️` item is resolved, and no blocking finding is silently discarded.

##### Route Findings

The fix loop starts on spec `❌`, any Critical or Important finding, or a `⚠️` item confirmed as a real gap.

Two routes leave the loop before a fix dispatch:

- Minor findings: append `Task <N>: minor (deferred): <one-liner>` to the ledger. Point the final review at all deferred minors.
- Plan-mandated defects or findings that conflict with the plan: show the finding beside the binding plan text and ask the user which governs.

Everything else enters the loop. Never fix review findings in the controller session; controller fixes pollute coordination context and skip review.

##### Fix Rounds

One round is one fix dispatch followed by one scoped re-review. Allow five rounds maximum per task.

###### Rounds 1–3

Resume the original implementer with the open findings verbatim. In Codex, use `followup_task` with the original `spawn_agent` target. If the host cannot resume a worker, dispatch a fresh implementer with the brief path, report path, and findings.

###### Rounds 4–5

Dispatch a fresh implementer, using a more capable model when supported. Include the brief path, report path, open findings, and this framing:

> A prior implementer attempted this task [N] times; you own it now. Read the report file for what was tried.

###### Every Round

1. The implementer fixes the findings, runs the focused tests covering the amended code, and appends the change, test command, and output to the existing report file.
2. Confirm that evidence exists before re-review.
3. Record `FIX_BASE`, the head seen by the previous review.
4. Run `bash <skill-dir>/scripts/review-package PLAN_FILE FIX_BASE HEAD`.
5. Dispatch [re-review-prompt.md](../re-review-prompt.md) with the findings, brief, report, and printed diff path.
6. The re-review verdicts each finding as ADDRESSED or NOT ADDRESSED and checks only the fix diff for new breakage.
7. Ledger out-of-scope observations as deferred minors; they do not extend the loop.
8. Append `Task <N>: fix round <R>/5 (<X> addressed, <Y> open — <finding one-liners>; commits <a7>..<b7>)`.

Completion criterion: the round has covering test evidence, every prior finding has a verdict, new Critical or Important breakage joins the open list, and the ledger records the result.

##### Breaker After Round 5

Stop dispatching after the fifth re-review when findings remain. Adjudicate each one:

- Wrong or contestable finding: `Task <N>: parked — <finding> — ruling: <why the code stands>`.
- Real but not load-bearing: park it with a ruling that records the deferral.
- Real and load-bearing for later tasks, or evidence that the plan is defective: append `Task <N>: BLOCKED — <reason>`, stop, and report the finding, conflicting plan text, and fix history to the user.

Adjudication happens only at the cap, and every ruling belongs in the ledger.

##### Complete the Task

When review is clean, or every remaining finding is parked at the cap, append one completion line:

- `Task <N>: complete (commits <base7>..<head7>, review clean)`
- `Task <N>: complete (commits <base7>..<head7>, <K> parked)`

Mark the task complete only after this line exists. Continue to the next task only when no unadjudicated Critical or Important issue remains.

##### Final Whole-Branch Review

After all tasks complete:

1. Run `bash <skill-dir>/scripts/review-package PLAN_FILE MERGE_BASE HEAD`, where `MERGE_BASE` is the commit from which the branch started.
2. Dispatch the most capable available model with [code-reviewer.md](../../requesting-code-review/code-reviewer.md), the printed package, and pointers to the ledger's deferred-minor and parked lines.
3. If findings remain, dispatch one fix worker with the complete findings list.
4. Run exactly one scoped re-review of that fix wave using `bash <skill-dir>/scripts/review-package PLAN_FILE FIX_BASE HEAD` and [re-review-prompt.md](../re-review-prompt.md).
5. Park residual non-load-bearing findings with rulings. Surface residual load-bearing findings when `finishing-a-development-branch` presents the integration options.

There is no second final-review fix wave.

Completion criterion: the final review is clean or every residual finding has an explicit ruling, and no load-bearing issue is hidden.

##### Cleanup

After final review and fixes are complete, remove only this plan's workspace. The git history is the record. Leave sibling plan directories intact, then use `finishing-a-development-branch`.

### File: `references/workflow-example.md`

#### Workflow Calibration

Read this reference when calibrating the controller, diagnosing a stalled loop, or checking the intended end-to-end sequence.

##### Common Failure Modes

| Rationalization | Required response |
|---|---|
| “Close enough on spec compliance” | Fix the gap or reach the cap and adjudicate it. |
| “I will fix it in the controller” | Resume or replace the implementer so the fix receives review. |
| “One more round will converge” | Stop at five rounds and adjudicate. |
| “The reviewer may find something new” | Keep re-review scoped; ledger untouched-code observations. |
| “This finding is obviously wrong” | Adjudicate only at the cap and record the ruling. |
| “The fix is small enough to skip review” | Every fix round ends with a scoped re-review. |
| “Reviews slow the loop” | Treat review as the gate that makes iteration trustworthy. |
| “Ledger bookkeeping is overhead” | Treat the ledger as the recovery source after compaction. |

##### Example Workflow

```text
Controller: use Subagent-Driven Development for the plan.

[Verify isolated workspace]
[Read the plan once]
[Resolve scripts/sdd-workspace PLAN_FILE]
[Create or resume the plan-owned ledger]
[Scan the plan for contradictions]

Task 1
[Record BASE]
[Generate task brief]
[Dispatch implementer with brief and report paths]

Implementer: DONE; committed; focused and final tests pass; report written.

[Generate review package BASE..HEAD]
[Dispatch task reviewer with brief, report, package, and global constraints]

Reviewer: spec compliant; task quality approved.

[Ledger: Task 1 complete with commit range]

Task 2
[Repeat implementation]

Reviewer: spec gap and one Important finding.

[Fix round 1: resume implementer with both findings]
[Implementer appends fix and test evidence]
[Generate scoped FIX_BASE..HEAD review package]
[Dispatch re-reviewer]

Re-reviewer: both findings addressed; no new breakage.

[Ledger fix round and task completion]

[After every task: generate MERGE_BASE..HEAD review package]
[Dispatch final whole-branch reviewer]
[Resolve one final fix wave if needed]
[Remove only this plan's workspace]
[Use finishing-a-development-branch]
```

The sequence is complete when every task has a ledger completion line, the final review has no unruled findings, and cleanup targets only the active plan's workspace.

### File: `scripts/review-package`

```text
#!/usr/bin/env bash
# Generate a review package: commit list, stat summary, and the net
# diff with extended context, written to a file the reviewer reads in one
# call. Using the recorded per-task BASE (not HEAD~1) keeps multi-commit
# tasks intact.
#
# Usage: review-package PLAN_FILE BASE HEAD [OUTFILE]
# Default OUTFILE: <repo-root>/.skillquiver/sdd/<plan-basename>/review-<base7>..<head7>.diff
# (named per range, so a re-review after fixes gets a distinct fresh file).
set -euo pipefail

if [ $# -lt 3 ] || [ $# -gt 4 ]; then
  echo "usage: review-package PLAN_FILE BASE HEAD [OUTFILE]" >&2
  exit 2
fi

plan=$1
base=$2
head=$3
[ -f "$plan" ] || { echo "no such plan file: $plan" >&2; exit 2; }

git rev-parse --verify --quiet "$base" >/dev/null || { echo "bad BASE: $base" >&2; exit 2; }
git rev-parse --verify --quiet "$head" >/dev/null || { echo "bad HEAD: $head" >&2; exit 2; }

if [ $# -eq 4 ]; then
  out=$4
else
  dir=$(bash "$(cd "$(dirname "$0")" && pwd)/sdd-workspace" "$plan")
  out="$dir/review-$(git rev-parse --short "$base")..$(git rev-parse --short "$head").diff"
fi

{
  echo "# Review package: ${base}..${head}"
  echo
  echo "## Commits"
  git log --oneline "${base}..${head}"
  echo
  echo "## Files changed"
  git diff --stat "${base}..${head}"
  echo
  echo "## Diff"
  git diff -U10 "${base}..${head}"
} > "$out"

commits=$(git rev-list --count "${base}..${head}")
echo "wrote ${out}: ${commits} commit(s), $(wc -c < "$out" | tr -d ' ') bytes"
```

### File: `scripts/sdd-workspace`

```text
#!/usr/bin/env bash
# Resolve and ensure the working-tree directory SDD uses for one plan's
# short-lived artifacts: task briefs, implementer reports, review packages,
# and the progress ledger. Print the plan directory's absolute path.
#
# One directory per plan (.skillquiver/sdd/<plan-basename>-<path-hash>/) so
# plans with the same filename can never read or overwrite each other's
# artifacts. A stale ledger misread as current progress makes controllers
# skip whole task sequences — plan-scoping removes that failure structurally.
#
# The workspace lives in the working tree (not under .git/) because Claude Code
# treats .git/ as a protected path and denies agent writes there — which blocks
# an implementer subagent from writing its report file. A self-ignoring
# .gitignore at .skillquiver/sdd/ keeps every plan's workspace out of
# `git status` and out of accidental commits without modifying any tracked file.
#
# Single source of truth for the workspace location, so task-brief and
# review-package cannot drift to different directories.
#
# Usage: sdd-workspace PLAN_FILE
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: sdd-workspace PLAN_FILE" >&2
  exit 2
fi

plan=$1
[ -f "$plan" ] || { echo "no such plan file: $plan" >&2; exit 2; }

plan_name=$(basename "$plan" .md)
[ -n "$plan_name" ] && [ "$plan_name" != "." ] && [ "$plan_name" != ".." ] \
  || { echo "cannot derive a workspace name from: $plan" >&2; exit 2; }

root=$(git rev-parse --show-toplevel)
root=$(cd "$root" && pwd -P)
plan_path=$(cd "$(dirname "$plan")" && pwd -P)/$(basename "$plan")
case "$plan_path" in
  "$root"/*) plan_key=${plan_path#"$root"/} ;;
  *) plan_key=$plan_path ;;
esac
plan_hash=$(printf '%s' "$plan_key" | git hash-object --stdin)
slug="$plan_name-${plan_hash:0:12}"
base="$root/.skillquiver/sdd"
dir="$base/$slug"
mkdir -p "$dir"
printf '*\n' > "$base/.gitignore"
cd "$dir" && pwd
```

### File: `scripts/task-brief`

````text
#!/usr/bin/env bash
# Extract one task's full text from an implementation plan into a file the
# implementer reads in one call, so the task text never has to be pasted
# through the controller's context.
#
# Usage: task-brief PLAN_FILE TASK_NUMBER [OUTFILE]
# Default OUTFILE: <repo-root>/.skillquiver/sdd/<plan-basename>/task-<N>-brief.md
# (per plan and per worktree; concurrent runs of the SAME plan in the same
# working tree share it).
set -euo pipefail

if [ $# -lt 2 ] || [ $# -gt 3 ]; then
  echo "usage: task-brief PLAN_FILE TASK_NUMBER [OUTFILE]" >&2
  exit 2
fi

plan=$1
n=$2
[ -f "$plan" ] || { echo "no such plan file: $plan" >&2; exit 2; }

if [ $# -eq 3 ]; then
  out=$3
else
  dir=$(bash "$(cd "$(dirname "$0")" && pwd)/sdd-workspace" "$plan")
  out="$dir/task-${n}-brief.md"
fi

awk -v n="$n" '
  /^```/ { infence = !infence }
  !infence && /^#+[ \t]+Task[ \t]+[0-9]+/ {
    intask = ($0 ~ ("^#+[ \t]+Task[ \t]+" n "([^0-9]|$)"))
  }
  intask { print }
' "$plan" > "$out"

if [ ! -s "$out" ]; then
  echo "task ${n} not found in ${plan} (no heading matching 'Task ${n}')" >&2
  exit 3
fi

echo "wrote ${out}: $(wc -l < "$out" | tr -d ' ') lines"
````

### File: `task-reviewer-prompt.md`

#### Task Reviewer Prompt Template

Use this template when dispatching a task reviewer subagent. The reviewer
reads the task's diff once and returns two verdicts: spec compliance and
code quality.

**Purpose:** Verify one task's implementation matches its requirements (nothing
more, nothing less) and is well-built (clean, tested, maintainable)

```
Host-neutral worker template (translate with references/dispatch-and-model-selection.md):
  task_label: "Review Task N (spec + quality)"
  model_override: [MODEL — include only when the host supports explicit overrides;
                   choose per references/dispatch-and-model-selection.md]
  message: |
    You are reviewing one task's implementation: first whether it matches its
    requirements, then whether it is well-built. This is a task-scoped gate,
    not a merge review — a broad whole-branch review happens separately after
    all tasks are complete.

    ## What Was Requested

    Read the task brief: [BRIEF_FILE]

    Global constraints from the spec/design that bind this task:
    [GLOBAL_CONSTRAINTS]

    ## What the Implementer Claims They Built

    Read the implementer's report: [REPORT_FILE]

    ## Diff Under Review

    **Base:** [BASE_SHA]
    **Head:** [HEAD_SHA]
    **Diff file:** [DIFF_FILE]

    Read the diff file once — it contains the commit list, a stat summary,
    and the full diff with surrounding context, and it is your view of the
    change. The diff's context lines ARE the changed files: do not Read a
    changed file separately unless a hunk you must judge is cut off
    mid-function — and say so in your report. Do not re-run git commands.
    If the diff file is missing, fetch the diff yourself:
    `git diff --stat [BASE_SHA]..[HEAD_SHA]` and `git diff [BASE_SHA]..[HEAD_SHA]`.
    Do not crawl the broader codebase. Inspect code outside the diff only
    to evaluate a concrete risk you can name — one focused check per named
    risk, and name both the risk and what you checked in your report.
    Cross-cutting changes are legitimate named risks: if the diff changes
    lock ordering, a function or API contract, or shared mutable state,
    checking the call sites is the right method.

    Your review is read-only on this checkout. Do not mutate the working
    tree, the index, HEAD, or branch state in any way.

    ## Do Not Trust the Report

    Treat the implementer's report as unverified claims about the code. It
    may be incomplete, inaccurate, or optimistic. Verify the claims against
    the diff. Design rationales in the report are claims too: "left it per
    YAGNI," "kept it simple deliberately," or any other justification is the
    implementer grading their own work. Judge the code on its merits — a
    stated rationale never downgrades a finding's severity.

    ## Tests

    The implementer already ran the tests and reported results with TDD
    evidence for exactly this code. Do not re-run the suite to confirm their
    report. Run a test only when reading the code raises a specific doubt
    that no existing run answers — and then a focused test, never a
    package-wide suite, race detector run, or repeated/high-count loop. If
    heavy validation seems warranted, recommend it in your report instead of
    running it. If you cannot run commands in this environment, name the
    test you would run.

    Warnings or other noise in the implementer's reported test output are
    findings — test output should be pristine.

    ## Part 1: Spec Compliance

    Compare the diff against What Was Requested:

    - **Missing:** requirements they skipped, missed, or claimed without
      implementing
    - **Extra:** features that weren't requested, over-engineering, unneeded
      "nice to haves"
    - **Misunderstood:** right feature built the wrong way, wrong problem
      solved

    If a requirement cannot be verified from this diff alone (it lives in
    unchanged code or spans tasks), report it as a ⚠️ item instead of
    broadening your search.

    ## Part 2: Code Quality

    **Code quality:**
    - Clean separation of concerns?
    - Proper error handling?
    - DRY without premature abstraction?
    - Edge cases handled?

    **Tests:**
    - Do the new and changed tests verify real behavior, not mocks?
    - Are the task's edge cases covered?

    **Structure:**
    - Does each file have one clear responsibility with a well-defined interface?
    - Are units decomposed so they can be understood and tested independently?
    - Is the implementation following the file structure from the plan?
    - Did this change create new files that are already large, or
      significantly grow existing files? (Don't flag pre-existing file
      sizes — focus on what this change contributed.)

    Your report should point at evidence: file:line references for every
    finding and for any check you would otherwise answer with a bare
    "yes." A tight report that cites lines gives the controller everything
    it needs.

    Your final message is the report itself: begin directly with the
    spec-compliance verdict. Every line is a verdict, a finding with
    file:line, or a check you ran — no preamble, no process narration,
    no closing summary.

    ## Calibration

    Categorize issues by actual severity. Not everything is Critical.
    Important means this task cannot be trusted until it is fixed: incorrect
    or fragile behavior, a missed requirement, or maintainability damage you
    would block a merge over — verbatim duplication of a logic block,
    swallowed errors, tests that assert nothing. "Coverage could be broader"
    and polish suggestions are Minor.
    If the plan or brief explicitly mandates something this rubric calls a
    defect (a test that asserts nothing, verbatim duplication of a logic
    block), that IS a finding — report it as Important, labeled
    plan-mandated. The plan's authorship does not grade its own work; the
    human decides.
    Acknowledge what was done well before listing issues — accurate praise
    helps the implementer trust the rest of the feedback.

    ## Output Format

    ### Spec Compliance

    - ✅ Spec compliant | ❌ Issues found: [what's missing/extra/misunderstood,
      with file:line references]
    - ⚠️ Cannot verify from diff: [requirements you could not verify from the
      diff alone, and what the controller should check — report alongside the
      ✅/❌ verdict for everything you could verify]

    ### Strengths
    [What's well done? Be specific.]

    ### Issues

    #### Critical (Must Fix)
    #### Important (Should Fix)
    #### Minor (Nice to Have)

    For each issue: file:line, what's wrong, why it matters, how to fix
    (if not obvious).

    ### Assessment

    **Task quality:** [Approved | Needs fixes]

    **Reasoning:** [1-2 sentence technical assessment]
```

**Placeholders:**
- `[MODEL]` — reviewer model selected from [dispatch-and-model-selection.md](references/dispatch-and-model-selection.md); include only when the host supports explicit overrides
- `[BRIEF_FILE]` — REQUIRED: the task brief file (`scripts/task-brief PLAN N`
  prints the path; same file the implementer worked from)
- `[GLOBAL_CONSTRAINTS]` — the binding requirements copied verbatim from
  the plan's Global Constraints section or the spec: exact values, formats,
  and stated relationships between components (not process rules — those
  are already in this template)
- `[REPORT_FILE]` — REQUIRED: the file the implementer wrote its detailed
  report to
- `[BASE_SHA]` — commit before this task
- `[HEAD_SHA]` — current commit
- `[DIFF_FILE]` — REQUIRED: the path the controller wrote the review
  package to (`scripts/review-package PLAN_FILE BASE HEAD` prints the unique
  path it wrote; the package never enters the controller's context)

**Reviewer returns:** Spec Compliance verdict (✅/❌/⚠️), Strengths, Issues
(Critical/Important/Minor), Task quality verdict

### Not embedded

- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
