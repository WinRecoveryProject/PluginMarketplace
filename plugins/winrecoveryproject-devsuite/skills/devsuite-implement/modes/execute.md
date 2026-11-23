# Execute mode

Follow the package policy linked from this skill's router before acting.

<a id="src-executing-plans-intro"></a>

<a id="src-executing-plans-executing-plans"></a>
## Executing Plans

<a id="src-executing-plans-overview"></a>
### Overview

Load plan, review critically, execute all tasks, report when complete.

**Announce at start:** "I'm using execute mode to implement this plan."

**Routing:** Use this skill when subagent dispatch is unavailable OR the user wants a separate execution session; otherwise use subagent mode.

<a id="src-executing-plans-the-process"></a>
### The Process

<a id="src-executing-plans-step-1-load-and-review-plan"></a>
#### Step 1: Load and Review Plan
1. Ensure an isolated workspace: use the package's worktree workflow to create one or verify the existing one
2. Read plan file
3. Review critically - identify any questions or concerns about the plan
4. If concerns: Raise them with the user before starting
5. If no concerns: Create todos for the plan items and proceed

<a id="src-executing-plans-step-2-execute-tasks"></a>
#### Step 2: Execute Tasks

For each task:
1. Mark as in_progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

Track completed tasks in a ledger file (reuse subagent mode's convention: `<workspace>/progress.md`, first line naming the plan file, one `Task <N>: complete` line per finished task) so a compacted session can resume where it stopped.

<a id="src-executing-plans-step-3-complete-development"></a>
#### Step 3: Complete Development

After all tasks complete and verified:
- Before claiming the work is done, apply the package's review verify mode: run the verification commands and confirm their output first
- Announce: "I'm using the branch-finishing workflow to complete this work."
- **REQUIRED SUB-SKILL:** Use the package's branch-finishing workflow
- Follow that skill to verify tests, present options, execute choice

<a id="src-executing-plans-when-to-stop-and-ask-for-help"></a>
### When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

<a id="src-executing-plans-when-to-revisit-earlier-steps"></a>
### When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- The user updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

<a id="src-executing-plans-remember"></a>
### Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent
