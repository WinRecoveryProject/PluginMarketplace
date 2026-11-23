# Skill: wizard

- Plugin: `plugin-skill-studio` (0.9.0)
- Source: `plugins/plugin-skill-studio/skills/wizard/SKILL.md`

> Generate an interactive bash wizard to guide humans through manual setup, dashboard, or credential steps. Use when setting up API keys, third-party dashboards, CI secrets, or infrastructure where human authentication is required — even if the user says "create a setup wizard". Do NOT use for steps the AI agent can execute autonomously.

## Instructions

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#file-referencesintegration-registryjson); never load companion plugins.

### Wizard

Generate structured, interactive Bash wizards that walk human operators step-by-step through manual dashboard procedures, secret provisioning, and irreversible cutover operations.

---

#### Core Invariants

1. **Human-Only Boundary**: Wizards are strictly for tasks that require human interactive authentication, MFA, billing approval, or physical dashboard navigation.
2. **Immutable Helper Library**: Preserve the standardized UI helper library in `template.sh` above the `STAGES` marker; never modify internal screen-clearing or secret-masking logic.
3. **URL-First Navigation**: Always open target URLs (`open_url`) before prompting the human for values or confirmation.
4. **Masked Secret Input**: Use `ask_secret` for all API tokens, private keys, and passwords; persist secrets directly to `.env` or GitHub Secrets (`set_secret`).
5. **Static Syntax Validation**: Verify all generated wizard scripts with `bash -n <script>` and `shellcheck` before handing off to the user.

---

#### Architecture & Map of Content (MOC)

```
[ Manual Dashboard / Credential Prerequisite ] ──► [ Scope Stages & Target Secrets ] ──► [ Generate Wizard from template.sh ] ──► [ Operator Execution ]
```

| Component | Responsibility | Reference Template |
|---|---|---|
| **Bash Wizard Engine** | UI helpers, secret prompt, .env upsert, GitHub CLI writes | `skills/wizard/template.sh` |
| **Stage Scaffolding** | Linear step sequence with URL triggers | `scripts/setup-*.sh` |
| **Verification Pass** | Bash syntax check and dry run | `bash -n <script>` |

---

#### Step-by-Step Procedure (TWI)

##### Step 1: Scope Manual Stages & Secrets Inventory
- **Action**: Inspect `.env.example`, `.github/workflows/*`, and documentation to identify all manual inputs and secrets needed.
- **Key Point**: For every value, determine: (1) Source URL / dashboard path, (2) Destination (`.env`, `gh secret`, or both), (3) Secret visibility.
- **Why**: Thorough inventory prevents writing incomplete scripts that leave operators blocked midway.

##### Step 2: Map Operator Journey per Stage
- **Action**: Draft clear, sequential instructions: which dashboard menu to click, where keys are generated, and which variable is populated.
- **Key Point**: Clarify exact UI labels (e.g. "Settings $\rightarrow$ API Keys $\rightarrow$ Create Secret Key").
- **Inline Checklist**:
  - [ ] Every stage maps to a single focused task
  - [ ] URLs verified against official documentation
  - [ ] Secret inputs mapped to `ask_secret` and `write_env`

##### Step 3: Author Wizard Script from `template.sh`
- **Action**: Copy `skills/wizard/template.sh` to target path (e.g. `scripts/setup-provider.sh`), set `TOTAL_STAGES`, and author stages below the marker.
- **Key Point**: Do not touch the helper functions above the `STAGES` marker.
- **Why**: Consistency in UI helpers ensures uniform, robust terminal behavior across platforms (macOS, Linux, WSL).

##### Step 4: Validate Syntax & Deliver Hand-off
- **Action**: Run `bash -n <script>` and `chmod +x <script>`. Provide the user with the exact execution command.
- **Key Point**: Do not attempt to run the interactive wizard autonomously inside the agent session.
- **Why**: The wizard requires interactive terminal input and browser windows that block autonomous agent subshells.

---

#### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"Generate a wizard for steps the agent could do via CLI."* | **Execute agent-capable steps directly; reserve wizards for human-only tasks.** | Forcing humans to execute tasks an agent could run wastes human time. |
| *"Prompt for secrets with standard `read` without masking."* | **Mandatory `ask_secret` for all sensitive credentials.** | Plaintext secret prompts leak API tokens in terminal logs and shoulder surfing. |
| *"Attempt to execute the interactive bash wizard in background subshell."* | **Hand off wizard script to user with execution command.** | Background subshells hang indefinitely on interactive `read` and `open` calls. |

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Wizard"
  short_description: "Generate an interactive setup wizard"
```

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._

### File: `template.sh`

```bash
#!/usr/bin/env bash
#
# A wizard — walks a human through a manual procedure step by step.
# Generated by the wizard skill.
#
# Everything above the "STAGES" marker is the wizard library: do not hand-edit
# it. Author the per-step stages below the marker.

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────
# Wizard library — delightful, consistent UX. Identical across every wizard.
# ──────────────────────────────────────────────────────────────────────────

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); RED=$(tput setaf 1)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""; RED=""
fi

# Author sets this at the top of the stages section.
TOTAL_STAGES=0

_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env}"
WRITTEN_ENV=()    # KEYs written to ENV_FILE this run
WRITTEN_SECRET=() # secret NAMEs set this run
SKIPPED=()        # things we couldn't do (e.g. gh missing)

# _clear — wipe the terminal so only the current step is on screen. No-op when
# output isn't a terminal, so piped logs stay readable.
_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1; then tput clear; else printf '\033[2J\033[3J\033[H'; fi
}

# banner "Title" — opening frame: what this wizard does.
banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '%s  You drive the browser; this wizard tells you exactly what to do and\n' "$DIM"
  printf '  captures the values you copy back. Stop any time with Ctrl-C and re-run\n'
  printf '  later — it remembers values already saved.%s\n' "$RESET"
  pause "Ready to start?"
}

# stage "Name" — clear the screen, then announce a stage and show progress.
# Clearing keeps only the current step on screen.
stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

# say "..." — a plain instruction line.
say()  { printf '  %s\n' "$1"; }
# step "..." — a numbered-feeling action the human takes in the browser.
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

# open_url URL — open in the human's browser, cross-platform incl. WSL.
open_url() {
  local url="$1"
  printf '  %s↗ opening%s %s\n' "$GREEN" "$RESET" "$url"
  if command -v wslview >/dev/null 2>&1; then
    wslview "$url" >/dev/null 2>&1 || warn "couldn't open a browser — visit it manually: $url"
  elif command -v explorer.exe >/dev/null 2>&1; then
    explorer.exe "$url" >/dev/null 2>&1 || warn "couldn't open a browser — visit it manually: $url"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || warn "couldn't open a browser — visit it manually: $url"
  elif command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || warn "couldn't open a browser — visit it manually: $url"
  else
    warn "couldn't open a browser — visit it manually: $url"
  fi
}

# pause "msg" — wait for the human to confirm they've done the manual part.
pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _ || true
}

# confirm "question" — y/N gate; returns success on yes.
confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

# _existing KEY — current value of KEY in ENV_FILE, if any.
_existing() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line; line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

# ask KEY "Prompt" — read a value into $KEY. Offers the existing .env value as
# a default on re-runs (Enter keeps it). Visible input (non-secret).
ask() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -r input || true
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# ask_secret KEY "Prompt" — like ask, but input is hidden.
ask_secret() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -rs input || true
  printf '\n'
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# write_env KEY VALUE — upsert KEY=VALUE into ENV_FILE (creates it; replaces
# any existing line). Idempotent.
write_env() {
  local key="$1" value="$2" tmp
  [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || { warn "invalid environment key: $key"; return 1; }
  [[ "$value" != *$'\n'* && "$value" != *$'\r'* ]] || { warn "refusing multiline value for $key"; return 1; }
  touch "$ENV_FILE"
  tmp=$(mktemp)
  if grep -vE "^${key}=" "$ENV_FILE" > "$tmp"; then
    :
  else
    local grep_status=$?
    if [[ "$grep_status" -ne 1 ]]; then
      rm -f "$tmp"
      warn "couldn't read $ENV_FILE safely; leaving it unchanged"
      return "$grep_status"
    fi
  fi
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  WRITTEN_ENV+=("$key")
  printf '  %s✓ wrote%s %s → %s\n' "$GREEN" "$RESET" "$key" "$ENV_FILE"
}

# set_secret NAME VALUE — set a GitHub Actions repo secret via gh. Falls back
# to a warning (and records it) if gh is unavailable or unauthenticated.
set_secret() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh secret set "$name" >/dev/null 2>&1; then
      WRITTEN_SECRET+=("$name")
      printf '  %s✓ set%s GitHub secret %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub secret $name (set it manually: gh secret set $name)")
  warn "skipped GitHub secret $name — gh not ready; set it later"
}

# set_var NAME VALUE — set a GitHub Actions repo variable (non-secret).
set_var() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if gh variable set "$name" --body "$value" >/dev/null 2>&1; then
      printf '  %s✓ set%s GitHub variable %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub variable $name")
  warn "skipped GitHub variable $name — gh not ready; set it later"
}

# finish — clear, then a closing summary of everything configured.
finish() {
  _clear
  printf '\n%s%s  ✓ Setup complete%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} ))    && note "wrote ${#WRITTEN_ENV[@]} value(s) to $ENV_FILE: ${WRITTEN_ENV[*]}"
  (( ${#WRITTEN_SECRET[@]} )) && note "set ${#WRITTEN_SECRET[@]} GitHub secret(s): ${WRITTEN_SECRET[*]}"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "still to do by hand:"
    for s in "${SKIPPED[@]}"; do note "  - $s"; done
  fi
  printf '\n'
}

# ──────────────────────────────────────────────────────────────────────────
# STAGES — author this section. One stage() per step the human takes.
# Replace the example below. Set TOTAL_STAGES to match the stages you write.
# ──────────────────────────────────────────────────────────────────────────

TOTAL_STAGES=1

banner "Stripe setup"

# ── Example stage: replace with your real steps ───────────────────────────
stage "Stripe — API keys"
say "We'll grab your Stripe test keys and store them for local dev + CI."
open_url "https://dashboard.stripe.com/test/apikeys"
step "On the API keys page, copy the Publishable key (starts pk_test_)."
ask STRIPE_PUBLISHABLE_KEY "Paste the publishable key:"
step "Click 'Reveal test key' on the Secret key row, then copy it."
ask_secret STRIPE_SECRET_KEY "Paste the secret key:"
write_env STRIPE_PUBLISHABLE_KEY "$STRIPE_PUBLISHABLE_KEY"
write_env STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"
set_secret STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"   # CI needs this one
# ──────────────────────────────────────────────────────────────────────────

finish
```
