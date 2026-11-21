# Skill: git-safety-guardrails

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/git-safety-guardrails/SKILL.md`

> Safeguard repositories against destructive, irreversible, or history-rewriting Git operations. Use when running force pushes, hard resets, branch deletions, cleans, destructive restores, or history re-writes — even if the user says "clean up git history". Do NOT use for routine safe git status, fetch, diff, or branch queries.

## Instructions

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#file-referencesintegration-registryjson); never load companion plugins.

### Git Safety Guardrails

Install and maintain deterministic pre-execution guardrails that intercept and block dangerous, destructive, or history-rewriting Git commands before autonomous agents can execute them.

---

#### Core Invariants

1. **Deterministic Interception**: Automatically block destructive Git commands (`git push --force`, `git reset --hard`, `git clean -f/-fd`, `git branch -D`, `git checkout .`, `git restore .`) before execution.
2. **Explicit Authority Gate**: Intercepted commands return an explicit non-zero exit code notifying the agent that it lacks authority to execute destructive operations.
3. **Scope Clarification**: Always ask the user whether to apply guardrails locally to the project (`.claude/settings.json`) or globally (`~/.claude/settings.json`).
4. **Settings Merge Safety**: Seamlessly merge guardrail hooks into existing `PreToolUse` configurations without overwriting other tools or settings.
5. **Mandatory Interception Test**: Verify that the safety hook triggers correctly on simulated forbidden commands before concluding setup.

---

#### Architecture & Map of Content (MOC)

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
| **Classifier Hook Script** | Inspect and block forbidden git patterns | `scripts/block-dangerous-git.sh` |
| **Python Command Parser** | Parse complex shell command chains | `scripts/classify_git_command.py` |
| **Settings Integration** | Hook registration in agent environment | `.claude/settings.json` or `~/.claude/settings.json` |

---

#### Step-by-Step Procedure (TWI)

##### Step 1: Confirm Guardrail Scope
- **Action**: Ask the user whether to configure guardrails for this project only or globally.
- **Key Point**: Default to project-level `.claude/settings.json` unless the user specifies global.
- **Why**: Scoped installation avoids unexpected side-effects across external personal repositories.

##### Step 2: Copy Hook Script & Make Executable
- **Action**: Copy `scripts/block-dangerous-git.sh` to `.claude/hooks/block-dangerous-git.sh` and run `chmod +x`.
- **Key Point**: Ensure parent directories exist before copying.
- **Inline Checklist**:
  - [ ] Target directory created
  - [ ] Script copied and executable permissions set (`chmod +x`)
  - [ ] Python classifier script colocated if needed

##### Step 3: Register Hook in Settings Configuration
- **Action**: Add the PreToolUse hook entry to `.claude/settings.json`, merging into existing arrays if present.
- **Key Point**: Use `"$CLAUDE_PROJECT_DIR"/.claude/hooks/block-dangerous-git.sh` path expansion.
- **Why**: Relative path expansions ensure the hook functions across different working directory contexts.

##### Step 4: Verify Guardrail Interception (Test Gate)
- **Action**: Test the hook with a simulated blocked command:
  ```bash
  echo '{"tool_input":{"command":"git push origin main --force"}}' | .claude/hooks/block-dangerous-git.sh
  ```
- **Key Point**: Verify that the command exits with code 2 and outputs a descriptive blocked message.
- **Why**: Proving the hook intercepts dangerous commands guarantees that unverified agents cannot accidentally wipe Git history.

---

#### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"Allow `git reset --hard` if the working tree has uncommitted bugs."* | **Block all hard resets; require explicit stashes or reverts.** | Hard resets permanently delete uncommitted code and worktree context. |
| *"Allow force pushes on feature branches."* | **Block all force pushes by default.** | Force pushing can overwrite teammate commits and destroy branch history. |
| *"Skip verifying the hook script with simulated input."* | **Mandatory simulated test pass.** | Syntax errors in hook scripts cause them to fail open, leaving the repo unprotected. |

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Git Safety Guardrails"
  short_description: "Protect destructive git operations"
```

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._

### File: `scripts/block-dangerous-git.sh`

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

### File: `scripts/classify_git_command.py`

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
