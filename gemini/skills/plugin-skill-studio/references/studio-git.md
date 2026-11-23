# Skill: studio-git

- Plugin: `plugin-skill-studio` (0.9.0)
- Source: `plugins/plugin-skill-studio/skills/studio-git/SKILL.md`

> Use when starting feature work that needs an isolated workspace or worktree before executing a plan; integrating a finished branch (verify tests, choose merge, PR, keep or discard, clean up worktrees); resolving in-progress merge or rebase conflicts and CONFLICT markers by traced intent (even if the user just says "fix this merge"); or safeguarding a repository against force pushes, hard resets, branch deletions, cleans, destructive restores and history rewrites ("clean up git history"). Do NOT use for routine safe git status, fetch, diff or branch queries, or for routine rebasing without conflicts.

## Instructions

### Studio Git

<a id="policy"></a>
Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#file-referencesintegration-registryjson); never load companion plugins.

Pick one mode, read only that mode file, and follow it.

| Mode | Use when | Read |
|---|---|---|
| <a id="mode-worktree"></a>worktree | Start isolated feature work via native tools or a git worktree fallback | [modes/worktree.md](studio-git.md#file-modesworktreemd) |
| <a id="mode-finish"></a>finish | Integrate a finished branch: verify tests, choose merge/PR/keep/discard, clean up worktrees | [modes/finish.md](studio-git.md#file-modesfinishmd) |
| <a id="mode-conflicts"></a>conflicts | Resolve merge or rebase conflicts by intent traced to primary sources | [modes/conflicts.md](studio-git.md#file-modesconflictsmd) |
| <a id="mode-safety"></a>safety | Guard against destructive or history-rewriting git operations with a classifier hook | [modes/safety.md](studio-git.md#file-modessafetymd) |

In this package, the review skill is `studio-review` (request mode before merge). The guardrail scripts live in `modes/safety/scripts/`.

The mode files and everything under `modes/safety/` are shared byte-for-byte with DevSuite's `devsuite-git`. Change them only together with DevSuite, and update `references/consolidation/shared-git-modes.json` in both packages.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Studio Git"
  short_description: "Worktrees, branch finishing, conflicts, git safety"
  default_prompt: "Use $studio-git for this task."
policy:
  allow_implicit_invocation: true
```

### File: `assets/finishing-a-development-branch-wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/finishing-a-development-branch-wrp-icon-256.png`

_Binary asset, not embedded._

### File: `assets/git-safety-guardrails-wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/git-safety-guardrails-wrp-icon-256.png`

_Binary asset, not embedded._

### File: `assets/resolving-merge-conflicts-wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/resolving-merge-conflicts-wrp-icon-256.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._

### File: `modes/conflicts.md`

#### Conflicts mode

Follow the package policy linked from this skill's router before acting.

<a id="src-resolving-merge-conflicts-intro"></a>

<a id="src-resolving-merge-conflicts-resolving-merge-conflicts"></a>
##### Resolving Merge Conflicts

Systematically resolve in-progress Git merge and rebase conflicts by identifying the semantic intent of both branches and verifying integration integrity with automated test gates.

---

<a id="src-resolving-merge-conflicts-core-invariants"></a>
###### Core Invariants

1. **3-Way Intent Reconstruction**: Understand the common merge-base ancestor, the incoming changes (`THEIRS`), and the target branch changes (`OURS`) before altering conflicted code.
2. **Never Blindly Choose Ours or Theirs**: Inspect every conflict hunk individually; synthesize solutions that preserve the functional requirements of both branches.
3. **Zero Orphaned Conflict Markers**: Verify that all `<<<<<<<`, `=======`, and `>>>>>>>` markers are completely eliminated before staging.
4. **Non-Destructive Resolution**: Preserve adjacent unchanged code, comments, and docstrings; avoid accidental line deletions outside conflict hunks.
5. **Mandatory Post-Resolution Test Pass**: Execute the full build, typecheck, and test suite before concluding the merge (`git commit`) or rebase (`git rebase --continue`).

---

<a id="src-resolving-merge-conflicts-architecture--map-of-content-moc"></a>
###### Architecture & Map of Content (MOC)

```
[ Merge/Rebase Conflict Detected ] ──► [ Identify 3-Way Merge Base & Commits ] ──► [ Hunk-by-Hunk Semantic Synthesis ] ──► [ Build & Test Gate ]
```

| Phase | Responsibility | Verification Command |
|---|---|---|
| **Conflict Discovery** | Identify all unmerged files | `git status --porcelain | grep "^UU\|^AA\|^DU\|^UD"` |
| **Ancestor Inspection** | View base version of conflicted file | `git show :1:<file>` (Base), `:2:<file>` (Ours), `:3:<file>` (Theirs) |
| **Integration Gate** | Run compiler, linter, and unit tests | Project build / test command |

---

<a id="src-resolving-merge-conflicts-step-by-step-procedure-twi"></a>
###### Step-by-Step Procedure (TWI)

<a id="src-resolving-merge-conflicts-step-1-identify-conflicted-files-and-merge-context"></a>
###### Step 1: Identify Conflicted Files and Merge Context
- **Action**: Run `git status` to enumerate all conflicted files and inspect recent commit logs on both branches:
  ```bash
  git log --oneline -n 5 HEAD
  git log --oneline -n 5 MERGE_HEAD # or REBASE_HEAD
  ```
- **Key Point**: Determine what feature or bug fix each branch was attempting to deliver.
- **Why**: Understanding developer intent prevents resolving conflicts with syntax-valid but semantically broken hybrids.

<a id="src-resolving-merge-conflicts-step-2-resolve-conflicting-hunks-semantically"></a>
###### Step 2: Resolve Conflicting Hunks Semantically
- **Action**: Open each conflicted file, analyze the diff hunks between `HEAD` (Ours) and incoming (Theirs), and rewrite the block to satisfy both requirements.
- **Key Point**: If both branches added new imports, dependencies, or routes, combine them cleanly without duplicates.
- **Inline Checklist**:
  - [ ] All conflict markers (`<<<`, `===`, `>>>`) removed
  - [ ] Duplicate imports and exports deduplicated
  - [ ] New functionality from both branches retained

<a id="src-resolving-merge-conflicts-step-3-verify-with-build--test-suite"></a>
###### Step 3: Verify with Build & Test Suite
- **Action**: Run the repository's typechecker, linter, and test suite across the resolved working tree.
- **Key Point**: If tests fail, investigate whether resolving the conflict broke subtle runtime assumptions.
- **Why**: Many merge conflicts compile cleanly but introduce logical regressions that only tests catch.

<a id="src-resolving-merge-conflicts-step-4-stage-and-conclude-mergerebase"></a>
###### Step 4: Stage and Conclude Merge/Rebase
- **Action**: Stage the resolved files (`git add <files>`) and complete the operation:
  - For merge: `git commit` (preserving standard merge commit message).
  - For rebase: `git rebase --continue`.
- **Key Point**: Check `git status` to ensure the working tree is clean.
- **Why**: Clean conclusion ensures upstream CI pipelines can build the merged branch without human intervention.

---

<a id="src-resolving-merge-conflicts-anti-rationalization-guardrails"></a>
###### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"Accept 'ours' or 'theirs' completely with `git checkout --ours` to be fast."* | **Forbidden on semantic conflicts.** | Blanket checkouts overwrite valid work and revert critical bug fixes from one branch. |
| *"Delete the failing test to get the merge commit through."* | **Fix the code to make tests pass.** | Deleting tests lowers coverage and introduces regressions into production. |
| *"Assume the code is fine without running the full test suite."* | **Mandatory test pass before committing merge.** | Resolving conflicts manually frequently introduces syntax errors and broken imports. |

### File: `modes/finish.md`

#### Finish mode

Follow the package policy linked from this skill's router before acting.

<a id="src-finishing-a-development-branch-intro"></a>

<a id="src-finishing-a-development-branch-finishing-a-development-branch"></a>
##### Finishing a Development Branch

<a id="src-finishing-a-development-branch-overview"></a>
###### Overview

**Core principle:** Verify tests → Detect environment → Present options → Execute choice → Clean up.

Shell commands below use Bash syntax — run them in a Bash-capable shell such as Git Bash on Windows.

**Announce at start:** "I'm using finish mode to complete this work."

<a id="src-finishing-a-development-branch-step-1-verify-tests"></a>
###### Step 1: Verify Tests

Run the project's full test suite (`npm test` / `cargo test` / `pytest` / `go test ./...`). If the project has no test suite, verification is whatever check the project does have (build, lint, smoke run); if there is none, ask the user what should gate completion.

**If tests fail**, report the failures and stop — the menu comes after a green suite:

```
Tests failing (<N> failures). Must fix before completing:

[Show failures]
```

**If tests pass:** continue to Step 2.

<a id="src-finishing-a-development-branch-step-2-detect-environment"></a>
###### Step 2: Detect Environment

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
# Capture now, while still inside the workspace — Step 5 changes directory
# before cleanup (Step 6) needs this value
WORKTREE_PATH=$(git rev-parse --show-toplevel)
BRANCH=$(git branch --show-current)
echo "GIT_DIR=$GIT_DIR"
echo "GIT_COMMON=$GIT_COMMON"
echo "WORKTREE_PATH=$WORKTREE_PATH"
echo "BRANCH=${BRANCH:-<detached>}"
```

Note the printed values — shell variables do not persist between tool calls, and Step 6 needs them.

This determines which menu to show and how cleanup works:

| State | Menu | Cleanup |
|-------|------|---------|
| `GIT_DIR == GIT_COMMON` (normal repo) | Standard 3 options | No worktree to clean up |
| `GIT_DIR != GIT_COMMON`, named branch | Standard 3 options | Provenance-based (see Step 6) |
| `GIT_DIR != GIT_COMMON`, detached HEAD | Reduced 2 options (no merge) | Externally managed — leave in place |

<a id="src-finishing-a-development-branch-step-3-determine-base-branch"></a>
###### Step 3: Determine Base Branch

The base branch is whatever this work forked from — usually named in the
plan, the conversation, or the branch's upstream. If it is not already
known, ask: "This branch split from <your best guess> - is that correct?"
Confirm before merging: merging into the wrong base is expensive to undo.

<a id="src-finishing-a-development-branch-step-4-present-options"></a>
###### Step 4: Present Options

**Review checkpoint:** the package's review request mode makes review mandatory before merge ("When to Request Review"). If this work has not been reviewed yet, dispatch a review per that mode before offering the merge option.

**Normal repo and named-branch worktree — present exactly these 3 options:**

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)

Which option?
```

**Detached HEAD — present exactly these 2 options:**

```
Implementation complete. You're on a detached HEAD (externally managed workspace).

1. Push as new branch and create a Pull Request
2. Keep as-is (I'll handle it later)

Which option?
```

Present the menu exactly as written — concise, with every option coming
from the list above. Discarding the work happens only in response to the user explicitly asking for it (see "If the user asks to
discard the work" below). Wait for their answer; the integration decision
is theirs.

<a id="src-finishing-a-development-branch-step-5-execute-choice"></a>
###### Step 5: Execute Choice

<a id="src-finishing-a-development-branch-option-1-merge-locally"></a>
###### Option 1: Merge Locally

```bash
# Get main repo root for CWD safety
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

# Merge first — verify success before removing anything
git checkout <base-branch>
git pull
git merge <feature-branch>

# Verify tests on merged result
<test command>
```

If tests fail on the merged result: stop, leave the worktree and branch in
place, and investigate — nothing has been pushed, so the merge is local
and recoverable.

Once the merged result is green: clean up the worktree (Step 6), then
delete the branch:

```bash
git branch -d <feature-branch>
```

<a id="src-finishing-a-development-branch-option-2-push-and-create-pr"></a>
###### Option 2: Push and Create PR

```bash
git push -u origin <feature-branch>
# From a detached HEAD, name the new branch on the remote:
# git push origin HEAD:refs/heads/<new-branch>
```

Then create the pull/merge request against <base-branch> with the forge's
tooling — its CLI if one is available, or the creation URL most forges
print when you push — following the repo's PR template and conventions if
present, and report the URL to the user.

Keep the worktree — the user iterates on PR feedback there.

<a id="src-finishing-a-development-branch-option-3-keep-as-is"></a>
###### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

<a id="src-finishing-a-development-branch-if-the-user-asks-to-discard-the-work"></a>
###### If the user asks to discard the work

This path exists only as a response to an explicit request to throw the
work away. Confirm first:

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for that exact confirmation. When it arrives:

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

Then clean up the worktree (Step 6) and force-delete the branch:

```bash
git branch -D <feature-branch>
```

If Step 6 left the worktree in place (externally managed), git refuses to
delete a branch still checked out there. Detach it first — `git -C
"$WORKTREE_PATH" checkout --detach` or the platform's workspace-exit tool —
then re-run the branch delete.

<a id="src-finishing-a-development-branch-step-6-cleanup-workspace"></a>
###### Step 6: Cleanup Workspace

**Runs for Option 1 and confirmed discards.** Options 2 and 3 always
preserve the worktree. Both callers have already changed directory to the
main repo root — worktree removal must run from outside the worktree —
and use the `GIT_DIR`/`GIT_COMMON`/`WORKTREE_PATH` values captured in
Step 2, from before that directory change.

**If `GIT_DIR == GIT_COMMON`:** Normal repo, no worktree to clean up. Done.

**If `WORKTREE_PATH` is under `.worktrees/` or `worktrees/`** (the ownership
convention from worktree mode): This workflow created this
worktree — we own cleanup:

```bash
git worktree remove "$WORKTREE_PATH"
git worktree prune  # Self-healing: clean up any stale registrations
```

**Otherwise:** The host environment owns this workspace — leave it in
place. If your platform provides a workspace-exit tool, use it.

<a id="src-finishing-a-development-branch-quick-reference"></a>
###### Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | yes | - | - | yes |
| 2. Create PR | - | yes | yes | - |
| 3. Keep as-is | - | - | yes | - |
| Discard (explicit request only) | - | - | - | yes (force) |

<a id="src-finishing-a-development-branch-common-rationalizations"></a>
###### Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Tests passed earlier this session" | Run the suite on the tree you are about to integrate. A green run only proves the tree it ran on. |
| "They obviously want it merged" | Integration is the user's decision. Present the menu and wait. |
| "They seem done with this feature — I'll offer to discard it" | The menu is complete as written. Discard happens only when the user asks for it in so many words. |
| "'Yeah, get rid of it' counts as confirmation" | Only the typed word `discard` authorizes deletion. |
| "The PR is up, so the worktree is clutter now" | PR feedback gets fixed in that worktree. It stays until the work lands. |
| "This other worktree looks stale — I'll clean it too" | Clean up only worktrees under `.worktrees/` or `worktrees/`. Everything else belongs to the host. |
| "The merged-result failure is probably flaky" | A failing merged result stops everything. Branch and worktree stay put while you investigate. |
| "The base branch is obviously main" | Confirm the fork point or ask. Merging into the wrong base is expensive to undo. |
| "The push was rejected — force-push will fix it" | A rejected push means the remote moved. Investigate; force-push only on the user's explicit request. |

### File: `modes/safety/scripts/block-dangerous-git.sh`

```bash
#!/bin/bash

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

DANGEROUS_PATTERNS=(
  "git push"
  "git reset --hard"
  "git clean -fd"
  "git clean -f"
  "git branch -D"
  "git checkout \."
  "git restore \."
  "push --force"
  "reset --hard"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "BLOCKED: '$COMMAND' matches dangerous pattern '$pattern'. The user has prevented you from doing this." >&2
    exit 2
  fi
done

exit 0
```

### File: `modes/safety/scripts/classify_git_command.py`

```python
#!/usr/bin/env python3
import json, re, shlex, sys

command = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else sys.stdin.read().strip()
patterns = [
    (r"(?:^|[;&|]\s*)git\s+push\b.*(?:--force(?:-with-lease)?|-f\b)", "force push rewrites remote history"),
    (r"(?:^|[;&|]\s*)git\s+reset\s+--hard\b", "hard reset can discard local work"),
    (r"(?:^|[;&|]\s*)git\s+clean\b[^;&|]*(?:\s-f|\s--force)", "git clean can delete untracked files"),
    (r"(?:^|[;&|]\s*)git\s+branch\s+-D\b", "forced branch deletion can discard unmerged work"),
    (r"(?:^|[;&|]\s*)git\s+(?:checkout|restore)\s+(?:--\s+)?\.\s*(?:$|[;&|])", "whole-worktree restore can discard changes"),
    (r"(?:^|[;&|]\s*)git\s+rebase\b", "rebase rewrites commit history"),
]
reason = next((reason for pattern, reason in patterns if re.search(pattern, command)), None)
print(json.dumps({"command": command, "classification": "review" if reason else "allow", "reason": reason}, separators=(",", ":")))
sys.exit(2 if reason else 0)
```

### File: `modes/safety.md`

#### Safety mode

Follow the package policy linked from this skill's router before acting.

<a id="src-git-safety-guardrails-intro"></a>

<a id="src-git-safety-guardrails-git-safety-guardrails"></a>
##### Git Safety Guardrails

Install and maintain deterministic pre-execution guardrails that intercept and block dangerous, destructive, or history-rewriting Git commands before autonomous agents can execute them.

---

<a id="src-git-safety-guardrails-core-invariants"></a>
###### Core Invariants

1. **Deterministic Interception**: Automatically block destructive Git commands (`git push --force`, `git reset --hard`, `git clean -f/-fd`, `git branch -D`, `git checkout .`, `git restore .`) before execution.
2. **Explicit Authority Gate**: Intercepted commands return an explicit non-zero exit code notifying the agent that it lacks authority to execute destructive operations.
3. **Scope Clarification**: Always ask the user whether to apply guardrails locally to the project (`.claude/settings.json`) or globally (`~/.claude/settings.json`).
4. **Settings Merge Safety**: Seamlessly merge guardrail hooks into existing `PreToolUse` configurations without overwriting other tools or settings.
5. **Mandatory Interception Test**: Verify that the safety hook triggers correctly on simulated forbidden commands before concluding setup.

---

<a id="src-git-safety-guardrails-architecture--map-of-content-moc"></a>
###### Architecture & Map of Content (MOC)

```
[ Agent Tool Call (Bash/Git) ] ──► [ PreToolUse Hook: `block-dangerous-git.sh` ]
                                                  │
                        ┌─────────────────────────┴─────────────────────────┐
                        ▼                                                   ▼
            [ Safe Git Operation ]                              [ Destructive Command ]
            - `git status`, `git diff`                          - `git push --force`, `reset --hard`
            - ALLOWED to execute                                - BLOCKED (Exit Code 2)
```

| Component | Responsibility | Location |
|---|---|---|
| **Classifier Hook Script** | Inspect and block forbidden git patterns | `safety/scripts/block-dangerous-git.sh` |
| **Python Command Parser** | Parse complex shell command chains | `safety/scripts/classify_git_command.py` |
| **Settings Integration** | Hook registration in agent environment | `.claude/settings.json` or `~/.claude/settings.json` |

---

<a id="src-git-safety-guardrails-step-by-step-procedure-twi"></a>
###### Step-by-Step Procedure (TWI)

<a id="src-git-safety-guardrails-step-1-confirm-guardrail-scope"></a>
###### Step 1: Confirm Guardrail Scope
- **Action**: Ask the user whether to configure guardrails for this project only or globally.
- **Key Point**: Default to project-level `.claude/settings.json` unless the user specifies global.
- **Why**: Scoped installation avoids unexpected side-effects across external personal repositories.

<a id="src-git-safety-guardrails-step-2-copy-hook-script--make-executable"></a>
###### Step 2: Copy Hook Script & Make Executable
- **Action**: Copy `safety/scripts/block-dangerous-git.sh` to `.claude/hooks/block-dangerous-git.sh` and run `chmod +x`.
- **Key Point**: Ensure parent directories exist before copying.
- **Inline Checklist**:
  - [ ] Target directory created
  - [ ] Script copied and executable permissions set (`chmod +x`)
  - [ ] Python classifier script colocated if needed

<a id="src-git-safety-guardrails-step-3-register-hook-in-settings-configuration"></a>
###### Step 3: Register Hook in Settings Configuration
- **Action**: Add the PreToolUse hook entry to `.claude/settings.json`, merging into existing arrays if present.
- **Key Point**: Use `"$CLAUDE_PROJECT_DIR"/.claude/hooks/block-dangerous-git.sh` path expansion.
- **Why**: Relative path expansions ensure the hook functions across different working directory contexts.

<a id="src-git-safety-guardrails-step-4-verify-guardrail-interception-test-gate"></a>
###### Step 4: Verify Guardrail Interception (Test Gate)
- **Action**: Test the hook with a simulated blocked command:
  ```bash
  echo '{"tool_input":{"command":"git push origin main --force"}}' | .claude/hooks/block-dangerous-git.sh
  ```
- **Key Point**: Verify that the command exits with code 2 and outputs a descriptive blocked message.
- **Why**: Proving the hook intercepts dangerous commands guarantees that unverified agents cannot accidentally wipe Git history.

---

<a id="src-git-safety-guardrails-anti-rationalization-guardrails"></a>
###### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"Allow `git reset --hard` if the working tree has uncommitted bugs."* | **Block all hard resets; require explicit stashes or reverts.** | Hard resets permanently delete uncommitted code and worktree context. |
| *"Allow force pushes on feature branches."* | **Block all force pushes by default.** | Force pushing can overwrite teammate commits and destroy branch history. |
| *"Skip verifying the hook script with simulated input."* | **Mandatory simulated test pass.** | Syntax errors in hook scripts cause them to fail open, leaving the repo unprotected. |

### File: `modes/worktree.md`

#### Worktree mode

Follow the package policy linked from this skill's router before acting.

<a id="src-using-git-worktrees-intro"></a>

<a id="src-using-git-worktrees-using-git-worktrees"></a>
##### Using Git Worktrees

<a id="src-using-git-worktrees-overview"></a>
###### Overview

Ensure work happens in an isolated workspace. Prefer your platform's native worktree tools. Fall back to manual git worktrees only when no native tool is available.

On Windows run all snippets in a Bash-capable shell such as Git Bash; do not translate them to PowerShell.

**Core principle:** Detect existing isolation first. Then use native tools. Then fall back to git. Never fight the harness.

**Announce at start:** "I'm using worktree mode to set up an isolated workspace."

<a id="src-using-git-worktrees-step-0-detect-existing-isolation"></a>
###### Step 0: Detect Existing Isolation

**Before creating anything, check if you are already in an isolated workspace.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** As a belt-and-braces check before concluding "already in a worktree," confirm you are not inside a git submodule:

```bash
# If this returns a path, you're in a submodule, not a worktree — treat as normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**If `GIT_DIR != GIT_COMMON` (and not a submodule):** You are already in a linked worktree. Skip to Step 2 (Project Setup). Do NOT create another worktree.

Report with branch state:
- On a branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD, externally managed). Branch creation needed at finish time."

**If `GIT_DIR == GIT_COMMON` (or in a submodule):** You are in a normal repo checkout.

Has the user already indicated their worktree preference in your instructions? If not, ask for consent before creating a worktree:

> "Would you like me to set up an isolated worktree? It protects your current branch from changes."

Honor any existing declared preference without asking. If the user declines consent, work in place and skip to Step 2.

<a id="src-using-git-worktrees-step-1-create-isolated-workspace"></a>
###### Step 1: Create Isolated Workspace

**You have two mechanisms. Try them in this order.**

<a id="src-using-git-worktrees-1a-native-worktree-tools-preferred"></a>
###### 1a. Native Worktree Tools (preferred)

The user has asked for an isolated workspace (Step 0 consent). Do you already have a way to create a worktree? It might be a tool with a name like `EnterWorktree`, `WorktreeCreate`, a `/worktree` command, or a `--worktree` flag. If you do, use it and skip to Step 2.

Native tools handle directory placement, branch creation, and cleanup automatically. Using `git worktree add` when you have a native tool creates phantom state your harness can't see or manage.

Only proceed to Step 1b if you have no native worktree tool available.

<a id="src-using-git-worktrees-1b-git-worktree-fallback"></a>
###### 1b. Git Worktree Fallback

**Only use this if Step 1a does not apply** — you have no native worktree tool available. Create a worktree manually using git.

<a id="src-using-git-worktrees-directory-selection"></a>
###### Directory Selection

Follow this priority order. Explicit user preference always beats observed filesystem state.

1. **Check your instructions for a declared worktree directory preference.** If the user has already specified one, use it without asking.

2. **Check for an existing project-local worktree directory:**
   ```bash
   ls -d .worktrees 2>/dev/null     # Preferred (hidden)
   ls -d worktrees 2>/dev/null      # Alternative
   ```
   If found, use it. If both exist, `.worktrees` wins.

3. **If there is no other guidance available**, default to `.worktrees/` at the project root.

<a id="src-using-git-worktrees-safety-verification-project-local-directories-only"></a>
###### Safety Verification (project-local directories only)

**MUST verify the chosen directory is ignored before creating worktree** — test a child path so the check works before the directory exists and with both `dir` and `dir/` gitignore styles:

```bash
# $LOCATION is the worktree parent chosen in Directory Selection
git check-ignore -q "$LOCATION/x"
```

**If NOT ignored:** Add to .gitignore, stage the change, and ask the user whether to commit it before proceeding.

**Why critical:** Prevents accidentally committing worktree contents to repository.

<a id="src-using-git-worktrees-create-the-worktree"></a>
###### Create the Worktree

```bash
# Determine path based on chosen location
path="$LOCATION/$BRANCH_NAME"

git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Sandbox fallback:** If `git worktree add` fails with a permission error (sandbox denial), tell the user the sandbox blocked worktree creation and you're working in the current directory instead. Then run setup and baseline tests in place.

<a id="src-using-git-worktrees-step-2-project-setup"></a>
###### Step 2: Project Setup

Auto-detect and run appropriate setup:

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ] && grep -q '\[tool\.poetry\]' pyproject.toml; then poetry install
elif [ -f pyproject.toml ] && [ ! -f requirements.txt ]; then pip install -e .; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

<a id="src-using-git-worktrees-step-3-verify-clean-baseline"></a>
###### Step 3: Verify Clean Baseline

Run tests to ensure workspace starts clean:

```bash
# Use project-appropriate command
npm test / cargo test / pytest / go test ./...
```

**If tests fail:** Report failures, ask whether to proceed or investigate.

**If tests pass:** Report ready.

<a id="src-using-git-worktrees-report"></a>
###### Report

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

<a id="src-using-git-worktrees-quick-reference"></a>
###### Quick Reference

| Situation | Action |
|-----------|--------|
| Already in linked worktree | Skip creation (Step 0) |
| In a submodule | Treat as normal repo (Step 0 guard) |
| Native worktree tool available | Use it (Step 1a) |
| No native tool | Git worktree fallback (Step 1b) |
| `.worktrees/` exists | Use it (verify ignored) |
| `worktrees/` exists | Use it (verify ignored) |
| Both exist | Use `.worktrees/` |
| Neither exists | Check instruction file, then default `.worktrees/` |
| Directory not ignored | Add to .gitignore, stage, ask before commit |
| Permission error on create | Sandbox fallback, work in place |
| Tests fail during baseline | Report failures + ask |
| No recognized manifest (package.json/Cargo.toml/requirements.txt/pyproject.toml/go.mod) | Skip dependency install |

<a id="src-using-git-worktrees-common-rationalizations"></a>
###### Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'm obviously not in a worktree — no need to check" | Run Step 0. Harness-created isolation fools eyeballing; the detection commands settle it. |
| "`git worktree add` is quicker than hunting for a native tool" | A native tool (e.g. `EnterWorktree`) owns placement, branching, and cleanup. Bypassing it is the #1 mistake — it creates phantom state your harness can't see or manage. |
| "The worktree directory is surely ignored already" | Run `git check-ignore`. An unignored worktree directory commits the whole tree into the repo. |
| "Any directory name works" | Explicit instructions beat an existing project-local directory, which beats the `.worktrees/` default. |
| "The workspace is fresh — baseline tests can wait" | A dirty baseline makes every later failure ambiguous. Run the tests now; proceeding past failures is the user's call. |
