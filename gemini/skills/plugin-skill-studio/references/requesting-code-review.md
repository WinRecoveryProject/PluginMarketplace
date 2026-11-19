# Skill: requesting-code-review

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/requesting-code-review/SKILL.md`

> Dispatches a bounded reviewer and preserves verified findings. Use when completed work needs read-only review before merge.

## Instructions

Read [Studio policy](../../references/studio-policy.md) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](../../references/integration-registry.json); never load companion plugins.

### Requesting Code Review

Review completed work against its requirements before it cascades. Give the
reviewer the work product and exact review range, never the whole session
history.

#### Choose the path

Handle a standalone bounded read-only code review directly.

- For a user's standalone bounded read-only review, inspect and report it
  directly. Read only the named file and directly required context. Do not edit
  the code. Do not enumerate the workspace.
- For completed implementation work, dispatch a reviewer after a meaningful
  task, major feature, complex fix, or before merge.
- For one small file, use at most one reviewer unless its result lacks named
  evidence; explain the missing evidence to any follow-up reviewer.

For the direct path, format each finding as
`- <Severity>: <path>:<line> - <defect>. <impact and reasoning>.` Use a plain
`path:line` when a valid clickable absolute path is unavailable.
Every finding must name the defect, impact, and reasoning.
Never output a placeholder, empty link, or unfinished finding.

#### Define the review range

Prefer the base commit recorded before implementation. Otherwise derive it from
the confirmed base branch:

```bash
BASE_SHA=$(git merge-base <base-branch> HEAD)
HEAD_SHA=$(git rev-parse HEAD)
```

Never default to `HEAD~1`; it silently omits earlier commits in a multi-commit
task. On Windows, run these Bash commands in a Bash-capable shell or use their
PowerShell equivalents.

#### Dispatch

Fill [code-reviewer.md](code-reviewer.md) with:

- `[DESCRIPTION]`: concise summary of the completed work;
- `[PLAN_OR_REQUIREMENTS]`: authoritative behavior and constraints;
- `[BASE_SHA]` and `[HEAD_SHA]`: complete range to inspect.

Use the host's general-purpose worker or closest equivalent. Keep the review
read-only and require exact file/line evidence, calibrated severity, reasoning,
and a merge verdict.

#### Preserve and resolve findings

Maintain one accumulator of verified findings across every reviewer response.
A later "no additional findings" must never erase an earlier verified issue.

Verify each finding against the code and requirements before acting. Fix
Critical and Important defects before continuing. When a finding is wrong,
respond with technical evidence from code or tests rather than deference. After
a material fix, request a focused re-review of the changed evidence, not an
unbounded restart.

The final user-facing review is the severity-ordered synthesis of the
accumulator with exact file and line references. Do not forward an intermediate
reviewer message as the final verdict. State reviewed scope and any unverified
surface explicitly.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Request Code Review"
  short_description: "Review code changes with evidence-backed findings"
  default_prompt: "Review these changes for actionable defects."

policy:
  allow_implicit_invocation: true
```

### File: `code-reviewer.md`

#### Code Reviewer Prompt Template

Use this template when dispatching a code reviewer subagent.

**Purpose:** Review completed work against requirements and code quality standards before it cascades into more work.

```
Worker dispatch (use the host's general-purpose or closest equivalent role):
  description: "Review code changes"
  prompt: |
    You are a Senior Code Reviewer with expertise in software architecture,
    design patterns, and best practices. Your job is to review completed work
    against its plan or requirements and identify issues before they cascade.

    ## What Was Implemented

    [DESCRIPTION]

    ## Requirements / Plan

    [PLAN_OR_REQUIREMENTS]

    ## Git Range to Review

    **Base:** [BASE_SHA]
    **Head:** [HEAD_SHA]

    ```bash
    git diff --stat [BASE_SHA]..[HEAD_SHA]
    git diff [BASE_SHA]..[HEAD_SHA]
    ```

    ## Read-Only Review

    Your review is read-only on this checkout. Do not mutate the working tree, the index, HEAD, or branch state in any way. Use tools like `git show`, `git diff`, and `git log` to inspect history. If you need a working copy of a different revision, check it out into a temporary directory outside the repo (`git worktree add <temp-dir-outside-repo> [SHA]`) — never move HEAD on this checkout.

    ## What to Check

    **Plan alignment:**
    - Does the implementation match the plan / requirements?
    - Are deviations justified improvements, or problematic departures?
    - Is all planned functionality present?

    **Code quality:**
    - Clean separation of concerns?
    - Proper error handling?
    - Type safety where applicable?
    - DRY without premature abstraction?
    - Edge cases handled?

    **Architecture:**
    - Sound design decisions?
    - Reasonable scalability and performance?
    - Security concerns?
    - Integrates cleanly with surrounding code?

    **Testing:**
    - Tests verify real behavior, not mocks?
    - Edge cases covered?
    - Integration tests where they matter?
    - All tests passing?

    **Production readiness:**
    - Migration strategy if schema changed?
    - Backward compatibility considered?
    - Documentation complete?
    - No obvious bugs?

    ## Calibration

    Categorize issues by actual severity. Not everything is Critical.
    Acknowledge what was done well before listing issues — accurate praise
    helps the implementer trust the rest of the feedback.

    If you find significant deviations from the plan, flag them specifically
    so the implementer can confirm whether the deviation was intentional.
    If you find issues with the plan itself rather than the implementation,
    say so.

    ## Output Format

    ### Strengths
    [What's well done? Be specific.]

    ### Issues

    #### Critical (Must Fix)
    [Bugs, security issues, data loss risks, broken functionality]

    #### Important (Should Fix)
    [Architecture problems, missing features, poor error handling, test gaps]

    #### Minor (Nice to Have)
    [Code style, optimization opportunities, documentation polish]

    For each issue:
    - File:line reference
    - What's wrong
    - Why it matters
    - How to fix (if not obvious)

    ### Recommendations
    [Improvements for code quality, architecture, or process]

    ### Assessment

    **Ready to merge?** [Yes | No | With fixes]

    **Reasoning:** [1-2 sentence technical assessment]

    ## Critical Rules

    **DO:**
    - Categorize by actual severity
    - Be specific (file:line, not vague)
    - Explain WHY each issue matters
    - Acknowledge strengths
    - Give a clear verdict

    **DON'T:**
    - Say "looks good" without checking
    - Mark nitpicks as Critical
    - Give feedback on code you didn't actually read
    - Be vague ("improve error handling")
    - Avoid giving a clear verdict
```

**Placeholders:**
- `[DESCRIPTION]` — brief summary of what was built
- `[PLAN_OR_REQUIREMENTS]` — what it should do (plan file path, task text, or requirements)
- `[BASE_SHA]` — starting commit
- `[HEAD_SHA]` — ending commit

**Reviewer returns:** Strengths, Issues (Critical / Important / Minor), Recommendations, Assessment

##### Example Output

```
###### Strengths
- Clean database schema with proper migrations (db.ts:15-42)
- Comprehensive test coverage (18 tests, all edge cases)
- Good error handling with fallbacks (summarizer.ts:85-92)

###### Issues

###### Important
1. **Missing help text in CLI wrapper**
   - File: index-conversations:1-31
   - Issue: No --help flag, users won't discover --concurrency
   - Fix: Add --help case with usage examples

2. **Date validation missing**
   - File: search.ts:25-27
   - Issue: Invalid dates silently return no results
   - Fix: Validate ISO format, throw error with example

###### Minor
1. **Progress indicators**
   - File: indexer.ts:130
   - Issue: No "X of Y" counter for long operations
   - Impact: Users don't know how long to wait

###### Recommendations
- Add progress reporting for user experience
- Consider config file for excluded projects (portability)

###### Assessment

**Ready to merge: With fixes**

**Reasoning:** Core implementation is solid with good architecture and tests. Important issues (help text, date validation) are easily fixed and don't affect core functionality.
```

### Not embedded

- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
