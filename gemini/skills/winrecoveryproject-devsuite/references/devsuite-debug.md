# Skill: devsuite-debug

- Plugin: `winrecoveryproject-devsuite` (0.7.0)
- Source: `plugins/winrecoveryproject-devsuite/skills/devsuite-debug/SKILL.md`

> Use when observed software behavior differs from its expected contract and needs reproduction, root-cause diagnosis or an authorized fix; when a failure, flaky behavior, performance regression or runtime exception lacks a demonstrated root cause and needs falsifiable experiments; when the user reports broken behavior, failing tests or flaky CI, or says "debug this" / "diagnose this", even without an error message, so a tight automated feedback loop must reproduce it first; or when incoming issues, external bug reports, feature requests or contributor pull requests need classification, reproduction, out-of-scope rejection or an agent-ready brief ("triage these issues"). Do NOT use for routine test-driven feature development, internal tickets already produced by devsuite-planning (tickets mode), or security findings (use the security workflows).

## Instructions

### Find the defect mechanism

<a id="policy"></a>
Read [the policy](_plugin-references.md#file-referencespolicymd) and [platform guidance](_plugin-references.md#file-referencesplatformsmd). State expected versus actual behavior, affected version/environment, scope, frequency and reproducibility. Preserve sanitized logs, screenshots, error text and exact reproduction inputs. Diagnosis alone does not authorize source edits.

Pick one mode and read only its file. The bounded investigation below is the `investigate` mode.

| Mode | Use when | Read |
|---|---|---|
| <a id="mode-investigate"></a>investigate | Observed behavior differs from its contract: reproduce safely, trace the smallest path, test competing hypotheses, fix only when authorized, report | this file, below |
| <a id="mode-diagnose"></a>diagnose | A failure, flake or regression lacks a demonstrated cause: preserve evidence, run the evidence loop, scale lanes deliberately, fix only when authorized | [modes/diagnose.md](devsuite-debug.md#file-modesdiagnosemd) |
| <a id="mode-loop"></a>loop | A hard bug, flaky CI or performance regression first needs a fast, deterministic red loop, then minimization, 3–5 ranked hypotheses, tagged probes, a regression test and cleanup | [modes/loop.md](devsuite-debug.md#file-modesloopmd) |
| <a id="mode-triage"></a>triage | Incoming issues or external pull requests need classification, redundancy screening, reproduction, a state decision, and an agent brief or an out-of-scope record | [modes/triage.md](devsuite-debug.md#file-modestriagemd) |

Mode resources: `modes/diagnose/` holds root-cause tracing, condition-based waiting, defense in depth and `scripts/find-polluter.sh`. `modes/loop/scripts/hitl-loop.template.sh` is a template for a human-in-the-loop reproduction loop when a step can only be performed by the user. `modes/triage/` holds the agent-brief and out-of-scope formats. The scripts need bash.

In this package, test-first implementation and fixes follow [devsuite-implement](devsuite-implement.md), review is [devsuite-review](devsuite-review.md), internal tickets come from [devsuite-planning](devsuite-planning.md) (tickets mode), and security findings go to the security assessment and remediation workflows. DevSuite has no tracker-setup workflow: when triage needs label or tracker conventions that the repository lacks, ask for them or record the gap.

The mode files and everything under `modes/` are shared byte-for-byte with Plugin-Skill-Studio `studio-debug`. Change them only together with Studio, and update `references/consolidation/shared-debug-modes.json` in both packages.

<a id="src-devsuite-debug-investigate"></a>
Scope boundary: investigate the reported defect and paths sharing its demonstrated
cause. Do not use this workflow for new feature design, broad code review, unrelated
cleanup or a full security audit. Route those requests to planning, review or security
assessment. A diagnosis request remains read-only unless the conversation already
authorizes implementation; uncertainty never expands the target or permissions.

Reproduce safely in the requested environment. If unsuccessful, retain known evidence and separate hypotheses from facts. Trace the smallest likely path through inputs, contracts, validation, lifecycle/state transitions, errors, timing/concurrency, configuration and recent changes. Test competing hypotheses with distinguishing checks. A warning, correlation or stack location alone is not root cause.

For an authorized fix, identify the shared mechanism and compatibility requirements; add a useful focused regression, apply the narrowest complete fix and repeat the original path. Consider sibling callers and boundary/error cases without broad cleanup. Run affected static/tests and relevant runtime checks. If dependencies or credentials are missing, name the blocked check and continue useful source analysis.

Report reproduction status, mechanism and primary evidence, fix if authorized, test results, uncertainty and the next diagnostic observation. Security-boundary candidates route to assessment/remediation; suspicion is not confirmation.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "DevSuite · Fejlfinding"
  short_description: "Genskab fejlen, find årsagen og test rettelsen."
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  brand_color: "#00BDA5"
  default_prompt: "Brug $devsuite-debug til denne opgave, og bevar de eksisterende forbindelser og budgettet på 0 kr."
```

### File: `assets/icon.png`

_Binary asset, not embedded._

### File: `assets/triage-wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/triage-wrp-icon-256.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._

### File: `modes/diagnose/condition-based-waiting.md`

#### Condition-Based Waiting

##### Overview

Flaky tests often guess at timing with arbitrary delays. This creates race conditions where tests pass on fast machines but fail under load or in CI.

**Core principle:** Wait for the actual condition you care about, not a guess about how long it takes.

##### When to Use

If a test uses `setTimeout`/`sleep`, ask whether it is testing actual timing behavior. If it is, keep the timeout and document why it is needed. Otherwise, replace the arbitrary delay with condition-based waiting.

**Use when:**
- Tests have arbitrary delays (`setTimeout`, `sleep`, `time.sleep()`)
- Tests are flaky (pass sometimes, fail under load)
- Tests timeout when run in parallel
- Waiting for async operations to complete

**Don't use when:**
- Testing actual timing behavior (debounce, throttle intervals)
- Always document WHY if using arbitrary timeout

##### Core Pattern

```typescript
// ❌ BEFORE: Guessing at timing
await new Promise(r => setTimeout(r, 50));
const result = getResult();
expect(result).toBeDefined();

// ✅ AFTER: Waiting for condition
await waitFor(() => getResult() !== undefined);
const result = getResult();
expect(result).toBeDefined();
```

##### Quick Patterns

| Scenario | Pattern |
|----------|---------|
| Wait for event | `waitFor(() => events.find(e => e.type === 'DONE'))` |
| Wait for state | `waitFor(() => machine.state === 'ready')` |
| Wait for count | `waitFor(() => items.length >= 5)` |
| Wait for file | `waitFor(() => fs.existsSync(path))` |
| Complex condition | `waitFor(() => obj.ready && obj.value > 10)` |

##### Implementation

Generic polling function:
```typescript
async function waitFor<T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000
): Promise<T> {
  const startTime = Date.now();

  while (true) {
    const result = condition();
    if (result) return result;

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    }

    await new Promise(r => setTimeout(r, 10)); // Poll every 10ms
  }
}
```

Build domain-specific helpers such as `waitForEvent`, `waitForEventCount`, or
`waitForEventMatch` from the same polling contract; keep their event types and
failure messages specific to the project.

##### Common Mistakes

**❌ Polling too fast:** `setTimeout(check, 1)` - wastes CPU
**✅ Fix:** Poll every 10ms

**❌ No timeout:** Loop forever if condition never met
**✅ Fix:** Always include timeout with clear error

**❌ Stale data:** Cache state before loop
**✅ Fix:** Call getter inside loop for fresh data

##### When Arbitrary Timeout IS Correct

```typescript
// Tool ticks every 100ms - need 2 ticks to verify partial output
await waitForEvent(manager, 'TOOL_STARTED'); // First: wait for condition
await new Promise(r => setTimeout(r, 200));   // Then: wait for timed behavior
// 200ms = 2 ticks at 100ms intervals - documented and justified
```

**Requirements:**
1. First wait for triggering condition
2. Based on known timing (not guessing)
3. Comment explaining WHY

### File: `modes/diagnose/defense-in-depth.md`

#### Defense-in-Depth Validation

##### Overview

When you fix a bug caused by invalid data, adding validation at one place feels sufficient. But that single check can be bypassed by different code paths, refactoring, or mocks.

**Core principle:** Validate at EVERY layer data passes through. Make the bug structurally impossible.

##### Why Multiple Layers

Single validation: "We fixed the bug"
Multiple layers: "We made the bug impossible"

Different layers catch different cases:
- Entry validation catches most bugs
- Business logic catches edge cases
- Environment guards prevent context-specific dangers
- Debug logging helps when other layers fail

##### The Four Layers

###### Layer 1: Entry Point Validation
**Purpose:** Reject obviously invalid input at API boundary

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
  }
  // ... proceed
}
```

###### Layer 2: Business Logic Validation
**Purpose:** Ensure data makes sense for this operation

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir required for workspace initialization');
  }
  // ... proceed
}
```

###### Layer 3: Environment Guards
**Purpose:** Prevent dangerous operations in specific contexts

```typescript
async function gitInit(directory: string) {
  // In tests, refuse git init outside temp directories
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `Refusing git init outside temp dir during tests: ${directory}`
      );
    }
  }
  // ... proceed
}
```

###### Layer 4: Debug Instrumentation
**Purpose:** Capture context for forensics

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('About to git init', {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // ... proceed
}
```

##### Applying the Pattern

When you find a bug:

1. **Trace the data flow** - Where does bad value originate? Where used?
2. **Map all checkpoints** - List every point data passes through
3. **Add validation at each layer** - Entry, business, environment, debug
4. **Test each layer** - Try to bypass layer 1, verify layer 2 catches it

##### Worked Example

Bug: Empty `projectDir` caused `git init` in source code

**Data flow:**
1. Test setup → empty string
2. `Project.create(name, '')`
3. `WorkspaceManager.createWorkspace('')`
4. `git init` runs in `process.cwd()`

**Four layers added:**
- Layer 1: `Project.create()` validates not empty/exists/writable
- Layer 2: `WorkspaceManager` validates projectDir not empty
- Layer 3: `WorktreeManager` refuses git init outside tmpdir in tests
- Layer 4: Stack trace logging before git init

**Result:** Full suite passed, bug impossible to reproduce

##### Key Insight

All four layers were necessary. During testing, each layer caught bugs the others missed:
- Different code paths bypassed entry validation
- Mocks bypassed business logic checks
- Edge cases on different platforms needed environment guards
- Debug logging identified structural misuse

**Don't stop at one validation point.** Add checks at every layer.

### File: `modes/diagnose/root-cause-tracing.md`

#### Root Cause Tracing

##### Overview

Bugs often manifest deep in the call stack (git init in wrong directory, file created in wrong location, database opened with wrong path). Your instinct is to fix where the error appears, but that's treating a symptom.

**Core principle:** Trace backward through the call chain until you find the original trigger, then fix at the source.

##### When to Use

When a bug appears deep in the stack and the trail can be followed backwards, trace it to the original trigger and fix there. Fix at the point where the error appears only when the backward trail truly dead-ends. After fixing at the source, consider adding layered validation as well (see `defense-in-depth.md`).

**Use when:**
- Error happens deep in execution (not at entry point)
- Stack trace shows long call chain
- Unclear where invalid data originated
- Need to find which test/code triggers the problem

##### The Tracing Process

###### 1. Observe the Symptom
```
Error: git init failed in ~/project/packages/core
```

###### 2. Find Immediate Cause
**What code directly causes this?**
```typescript
await execFileAsync('git', ['init'], { cwd: projectDir });
```

###### 3. Ask: What Called This?
```typescript
WorktreeManager.createSessionWorktree(projectDir, sessionId)
  → called by Session.initializeWorkspace()
  → called by Session.create()
  → called by test at Project.create()
```

###### 4. Keep Tracing Up
**What value was passed?**
- `projectDir = ''` (empty string!)
- Empty string as `cwd` resolves to `process.cwd()`
- That's the source code directory!

###### 5. Find Original Trigger
**Where did empty string come from?**
```typescript
const context = setupCoreTest(); // Returns { tempDir: '' }
Project.create('name', context.tempDir); // Accessed before beforeEach!
```

##### Adding Stack Traces

When you can't trace manually, add instrumentation:

```typescript
// Before the problematic operation
async function gitInit(directory: string) {
  const stack = new Error().stack;
  console.error('DEBUG git init:', {
    directory,
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    stack,
  });

  await execFileAsync('git', ['init'], { cwd: directory });
}
```

**Critical:** Use `console.error()` in tests (not logger - may not show)

**Run and capture:**
```bash
npm test 2>&1 | grep 'DEBUG git init'
```

**Analyze stack traces:**
- Look for test file names
- Find the line number triggering the call
- Identify the pattern (same test? same parameter?)

##### Locating the Failing Layer in Multi-Component Systems

When the path runs through several components (CI → build → deploy, API → service → database), instrument every boundary before proposing fixes: log what enters and what exits each component, and confirm config/environment propagation at each hop. One instrumented run shows which layer the data dies in; investigate that layer.

```bash
# Layer 1: entry point - is the value present at all?
if [ -n "${API_KEY:-}" ]; then echo "API_KEY: SET"; else echo "API_KEY: UNSET"; fi

# Layer 2: intermediate script - did it propagate?
if [ "${API_KEY+x}" = x ]; then echo "API_KEY propagated: SET"; else echo "API_KEY propagated: UNSET"; fi

# Layer 3: consumer - what does the application actually see?
node -e "console.log('key seen by app:', process.env.API_KEY ? 'SET' : 'UNSET')"
```

This reveals which hop drops the value (entry ✓, intermediate ✗) instead of guessing at the whole chain.
Log only presence or absence. Never print the credential itself while tracing propagation.

##### Finding Which Test Causes Pollution

If something appears during tests but you don't know which test:

Use the polluter-finder script `scripts/find-polluter.sh` next to this file:

```bash
./scripts/find-polluter.sh '.git' 'src/**/*.test.ts'
```

Runs tests one-by-one, stops at first polluter. See script for usage.

##### Real Example: Empty projectDir

**Symptom:** `.git` created in `packages/core/` (source code)

**Trace chain:**
1. `git init` runs in `process.cwd()` ← empty cwd parameter
2. WorktreeManager called with empty projectDir
3. Session.create() passed empty string
4. Test accessed `context.tempDir` before beforeEach
5. setupCoreTest() returns `{ tempDir: '' }` initially

**Root cause:** Top-level variable initialization accessing empty value

**Fix:** Made tempDir a getter that throws if accessed before beforeEach

**Also added defense-in-depth:**
- Layer 1: Project.create() validates directory
- Layer 2: WorkspaceManager validates not empty
- Layer 3: NODE_ENV guard refuses git init outside tmpdir
- Layer 4: Stack trace logging before git init

##### Key Principle

From the immediate cause, keep asking what called this, and with what value, one level at a time, until the answer is the source rather than another caller. Fix at the source, then add validation at each layer the bad value passed through so the bug becomes structurally impossible.

**NEVER fix just where the error appears.** Trace back to find the original trigger.

##### Stack Trace Tips

**In tests:** Use `console.error()` not logger - logger may be suppressed
**Before operation:** Log before the dangerous operation, not after it fails
**Include context:** Directory, cwd, environment variables, timestamps
**Capture stack:** `new Error().stack` shows complete call chain

### File: `modes/diagnose/scripts/find-polluter.sh`

```bash
#!/usr/bin/env bash
# Linear scan to find which test creates unwanted files/state
# Requires a Bash-capable shell. On Windows, run it through Git Bash;
# it will not work under PowerShell or cmd.
# Usage: ./find-polluter.sh <file_or_dir_to_check> <test_pattern> [test_runner]
#   test_runner: command used to run a single test file (default: npm test)
# Examples:
#   ./find-polluter.sh '.git' 'src/**/*.test.ts'
#   ./find-polluter.sh '.git' 'src/**/*.test.ts' 'npx vitest run'

set -e

if [ $# -lt 2 ] || [ $# -gt 3 ]; then
  echo "Usage: $0 <file_to_check> <test_pattern> [test_runner]"
  echo "Example: $0 '.git' 'src/**/*.test.ts' 'npx vitest run'"
  exit 1
fi

POLLUTION_CHECK="$1"
TEST_PATTERN="$2"
TEST_RUNNER="${3:-npm test}"

# Each iteration detects pollution by its appearance after a test run, so the
# artifact must be absent before the scan starts.
if [ -e "$POLLUTION_CHECK" ]; then
  echo "❌ $POLLUTION_CHECK already exists before any test ran."
  echo "   Remove it first, then re-run this script."
  exit 2
fi

echo "🔍 Searching for test that creates: $POLLUTION_CHECK"
echo "Test pattern: $TEST_PATTERN"
echo "Test runner: $TEST_RUNNER"
echo ""

# Get list of test files (find . emits ./-prefixed paths, so accept the
# pattern written with or without a leading ./)
TEST_PATTERN="${TEST_PATTERN#./}"
# find -path can't match '**/' against zero directory levels, so a pattern
# like src/**/*.test.ts would skip src/top.test.ts; also try the pattern
# with '**/' collapsed to cover files directly under the base directory.
TEST_FILES=$(find . \( -path "./$TEST_PATTERN" -o -path "./${TEST_PATTERN//\*\*\//}" \) | sort -u)
if [ -z "$TEST_FILES" ]; then
  TOTAL=0
else
  TOTAL=$(printf '%s\n' "$TEST_FILES" | wc -l | tr -d ' ')
fi

echo "Found $TOTAL test files"
echo ""

if [ "$TOTAL" -eq 0 ]; then
  echo "❌ No test files matched: $TEST_PATTERN" >&2
  exit 4
fi

COUNT=0
while IFS= read -r TEST_FILE; do
  [ -n "$TEST_FILE" ] || continue
  COUNT=$((COUNT + 1))

  echo "[$COUNT/$TOTAL] Testing: $TEST_FILE"

  # Run the test (unquoted expansion is intentional: the runner may be
  # a multi-word command like 'npx vitest run')
  RUNNER_STATUS=0
  $TEST_RUNNER "$TEST_FILE" > /dev/null 2>&1 || RUNNER_STATUS=$?

  # Check if pollution appeared
  if [ -e "$POLLUTION_CHECK" ]; then
    echo ""
    echo "🎯 FOUND POLLUTER!"
    echo "   Test: $TEST_FILE"
    echo "   Created: $POLLUTION_CHECK"
    echo ""
    echo "Pollution details:"
    ls -la "$POLLUTION_CHECK"
    echo ""
    echo "To investigate:"
    echo "  $TEST_RUNNER $TEST_FILE    # Run just this test"
    echo "  cat $TEST_FILE         # Review test code"
    exit 1
  fi

  if [ "$RUNNER_STATUS" -ne 0 ]; then
    echo "❌ Test runner failed for: $TEST_FILE" >&2
    exit 3
  fi
done <<< "$TEST_FILES"

echo ""
echo "✅ No polluter found - all tests clean!"
exit 0
```

### File: `modes/diagnose.md`

#### Diagnose mode

Follow the package policy linked from this skill's router before acting.

<a id="src-diagnose-systematically-intro"></a>

<a id="src-diagnose-systematically-diagnose-systematically"></a>
##### Diagnose Systematically

Find the cause before proposing a fix. Diagnosis does not authorize implementation.

<a id="src-diagnose-systematically-preserve-evidence"></a>
###### Preserve evidence

Keep an append-only investigation log with the symptom, commands, exit codes,
decisive output, hypotheses, experiments, and verdicts. Put it in a scratch
directory unless the user requested a versioned artifact. If the user requests
read-only work or forbids edits, report that trail through command output and
the final response; do not create any file, including a scratch or temporary log.

<a id="src-diagnose-systematically-evidence-loop"></a>
###### Evidence loop

1. **State the contract.** Name the involved components, their expected
   behavior, and the exact observed symptom. Verify environment assumptions
   such as build, branch, configuration, and dependency versions.
2. **Make it fail.** Run the smallest unattended signal that reaches the real
   symptom: focused test, CLI or HTTP assertion, headless UI check, trace
   replay, minimal harness, or seeded stress runner. A process starting, a
   string existing, or a silently skipped test is not a reproduction.
3. **Minimize.** Remove one input, dependency, configuration value, or step at
   a time. Keep a removal only when the same symptom remains. For intermittent
   defects, measure a reproduction rate instead of treating one pass as proof.
4. **Form falsifiable hypotheses.** First compare a working example of the same
   pattern with the failing path. Write only credible hypotheses, each with a
   distinguishing prediction and falsifier.
5. **Probe one variable.** Observe state at the earliest boundary where the
   predictions diverge. Revert probes or instrumentation that did not explain
   the symptom before trying the next one.
6. **Claim only what discriminates.** A cause is verified only when its
   prediction is observed through the symptom-specific signal and plausible
   alternatives are ruled out. Separate verified cause, inference, and
   proposed behavior change in the report.

A useful signal is symptom-specific, red-capable, deterministic or measured,
fast enough to repeat, and agent-runnable. If no such signal can be built,
report the attempts and request the smallest missing artifact or access.

<a id="src-diagnose-systematically-scale-the-investigation-deliberately"></a>
###### Scale the investigation deliberately

Keep one investigator for a small reproduced defect. Use parallel read-only
lanes only when several components remain plausible, the regression window is
uncertain, or intermittency supports independent probes. Give every lane the
same symptom packet and one seam: reproduction scope, first code-path
divergence, recent-change regression, or proof observability. Require a
hypothesis, prediction, falsifier, evidence, missing evidence, smallest next
probe, and confidence. Merge duplicate theories and run the cheapest
discriminating probe; ranking never proves a cause.

Use these resources only when their condition matches:

- Deep call-stack symptom: [diagnose/root-cause-tracing.md](devsuite-debug.md#file-modesdiagnoseroot-cause-tracingmd).
- Arbitrary delays or flaky async tests:
  [diagnose/condition-based-waiting.md](devsuite-debug.md#file-modesdiagnosecondition-based-waitingmd).
- Test-order pollution: run [diagnose/scripts/find-polluter.sh](devsuite-debug.md#file-modesdiagnosescriptsfind-pollutersh).
- Proven source fix that needs layered guards:
  [diagnose/defense-in-depth.md](devsuite-debug.md#file-modesdiagnosedefense-in-depthmd).

<a id="src-diagnose-systematically-fix-only-when-authorized"></a>
###### Fix only when authorized

When the user requested a fix, turn the minimized reproduction into a
regression test at the highest public seam that exercises the defect. Record it
failing for the expected reason before changing production code. Implement the
smallest fix, rerun the identical test, then rerun the original unminimized
signal. Where cheap, revert the fix once to demonstrate the failure returns.

Do not substitute a shallow test when no correct seam exists; state the
limitation. Remove temporary instrumentation and harnesses. After three failed
fix attempts, stop and question the causal model or architecture instead of
stacking a fourth guess.

<a id="src-diagnose-systematically-close"></a>
###### Close

Report the supported cause, discriminating evidence, exact checks and results,
authorized fix if any, removed instrumentation, and unverified surfaces. Do not
call an unexplained recovery a fix.

### File: `modes/loop/scripts/hitl-loop.template.sh`

```bash
#!/usr/bin/env bash
# Human-in-the-loop reproduction loop.
# Copy this file, edit the steps below, and run it.
# The agent runs the script; the user follows prompts in their terminal.
#
# Usage:
#   bash hitl-loop.template.sh
#
# Two helpers:
#   step "<instruction>"          → show instruction, wait for Enter
#   capture VAR "<question>"      → show question, read response into VAR
#
# At the end, captured values are printed as KEY=VALUE for the agent to parse.
#
# `capture` prints its value back to the terminal, where the agent reads it,
# so capture observations, and leave signing in to the user as a `step`.

set -euo pipefail

step() {
  printf '\n>>> %s\n' "$1"
  read -r -p "    [Enter when done] " _
}

capture() {
  local var="$1" question="$2" answer
  printf '\n>>> %s\n' "$question"
  read -r -p "    > " answer
  printf -v "$var" '%s' "$answer"
}

# --- edit below ---------------------------------------------------------

step "Open the app at http://localhost:3000 and sign in."

capture ERRORED "Click the 'Export' button. Did it throw an error? (y/n)"

capture ERROR_MSG "Paste the error message (or 'none'):"

# --- edit above ---------------------------------------------------------

printf '\n--- Captured ---\n'
printf 'ERRORED=%s\n' "$ERRORED"
printf 'ERROR_MSG=%s\n' "$ERROR_MSG"
```

### File: `modes/loop.md`

#### Loop mode

Follow the package policy linked from this skill's router before acting.

<a id="src-diagnosing-bugs-intro"></a>

<a id="src-diagnosing-bugs-diagnosing-bugs"></a>
##### Diagnosing Bugs

A disciplined feedback-loop methodology for diagnosing and resolving hard bugs, intermittent flakes, and performance regressions.

<a id="src-diagnosing-bugs-core-principle"></a>
###### Core Principle

> **Never guess or hypothesize before establishing a fast, deterministic, automated feedback loop that reliably reproduces the red failure.**

---

<a id="src-diagnosing-bugs-core-invariants"></a>
###### Core Invariants

1. **Mandatory Red Loop Before Theory**: Construct a fast, automated repro command and see it fail before formulating or testing any hypotheses.
2. **Credential Redaction First**: Redact all keys, authorization headers, tokens, and secrets with `<REDACTED>` before displaying outputs or logs.
3. **Single Variable Instrumentation**: Change only one variable at a time when probing hypothesis boundaries.
4. **Unique Debug Tagging**: Tag all temporary diagnostic logs with a unique searchable prefix (e.g. `[DEBUG-trace]`) for complete cleanup before commit.
5. **Regression Test at Public Seam**: Lock down the fix with a permanent test at a genuine architectural seam before declaring victory.

---

<a id="src-diagnosing-bugs-architecture--map-of-content-moc"></a>
###### Architecture & Map of Content (MOC)

```
[ Build Tight Loop ] ──► [ Reproduce & Minimise ] ──► [ 3–5 Ranked Hypotheses ] ──► [ Targeted Probe ] ──► [ Fix & Regression Test ] ──► [ Clean ]
```

| Phase | Core Objective | Key Deliverable |
|---|---|---|
| **Phase 1: Build Loop** | Construct automated pass/fail signal | Single executable command that goes red on this bug |
| **Phase 2: Minimise** | Shrink failure to essential variables | Minimal load-bearing repro payload |
| **Phase 3: Hypothesise** | Formulate 3–5 falsifiable predictions | Ranked hypothesis table with testable predictions |
| **Phase 4: Instrument** | Test predictions with minimal probes | Tagged `[DEBUG-...]` logs or debugger inspection |
| **Phase 5: Fix & Test** | Lock down behavior at public seam | Permanent automated regression test |
| **Phase 6: Cleanup** | Remove diagnostic scaffolding | Verified clean git status & passing test suite |

---

<a id="src-diagnosing-bugs-step-by-step-procedure-twi"></a>
###### Step-by-Step Procedure (TWI)

<a id="src-diagnosing-bugs-step-1-construct-a-tight-feedback-loop-phase-1"></a>
###### Step 1: Construct a Tight Feedback Loop (Phase 1)
- **Action**: Build an automated runner (failing test, CLI fixture, curl script, or trace replay) that drives the bug path.
- **Key Point**: The loop must be fast (< 5s), deterministic, and assert the user's exact symptom.
- **Inline Checklist**:
  - [ ] Automated command exists and has been executed
  - [ ] Command goes red specifically on this bug symptom
  - [ ] Execution completes in seconds without manual intervention
- **Why**: Staring at code without a feedback loop leads to guessing and confirmation bias.

<a id="src-diagnosing-bugs-step-2-reproduce-and-minimise-phase-2"></a>
###### Step 2: Reproduce and Minimise (Phase 2)
- **Action**: Run the loop to confirm reproduction, then systematically remove non-essential config, data, and steps.
- **Key Point**: Every remaining line in the repro must be load-bearing (removing it turns the loop green).
- **Why**: Minimal repros shrink the hypothesis space and convert cleanly into permanent regression tests.

<a id="src-diagnosing-bugs-step-3-formulate-falsifiable-hypotheses-phase-3"></a>
###### Step 3: Formulate Falsifiable Hypotheses (Phase 3)
- **Action**: Generate 3–5 ranked hypotheses stating the explicit prediction each makes.
- **Key Point**: Use format: *"If X is the cause, then changing Y will make the symptom disappear."*
- **Why**: Single-hypothesis debugging anchors on first impressions and wastes turns.

<a id="src-diagnosing-bugs-step-4-instrument-and-isolate-phase-4"></a>
###### Step 4: Instrument and Isolate (Phase 4)
- **Action**: Insert tagged probes (`[DEBUG-xxx]`) or inspect values at key boundaries.
- **Key Point**: Change only one variable at a time; measure baselines before tuning performance bugs.
- **Why**: Changing multiple variables simultaneously confounds cause and effect.

<a id="src-diagnosing-bugs-step-5-fix-verify-and-clean-phases-5--6"></a>
###### Step 5: Fix, Verify, and Clean (Phases 5 & 6)
- **Action**: Write the regression test, apply the minimal fix, verify the full suite, and purge all debug instrumentation.
- **Inline Checklist**:
  - [ ] Regression test fails without fix and passes with fix
  - [ ] Original un-minimised repro confirmed green
  - [ ] All `[DEBUG-...]` tags purged from codebase
  - [ ] Root cause documented clearly in commit message

---

<a id="src-diagnosing-bugs-anti-rationalization-guardrails"></a>
###### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"I think I see the bug in the code, let me fix it now."* | **No edits without an automated red feedback loop.** | Fixing code based on inspection often addresses symptoms while missing root causes. |
| *"The bug is non-deterministic so we cannot automate a test."* | **Increase reproduction rate (stress, loops, pinned clocks).** | A 50% flake rate is debuggable; raise reproduction frequency until testable. |
| *"I'll add logs everywhere and inspect all outputs."* | **Targeted, tagged probes only.** | Untargeted logging floods context and creates cleanup debt. |
| *"The fix works in manual testing, skip the regression test."* | **Mandatory automated regression test at public seam.** | Without a regression test, the bug will silently return in future refactors. |

### File: `modes/triage/AGENT-BRIEF.md`

#### Writing Agent Briefs

An agent brief is a structured comment posted on a GitHub issue or PR when it moves to `ready-for-agent`. It is the authoritative specification that an AFK agent will work from. The original body and discussion are context: the agent brief is the contract.

The brief states **what the agent should do**, which stretches to both surfaces: for an issue, that's building the change from nothing; for a PR, it's what's left to do *to the existing diff*: finish it, close gaps, address review points. Same principles either way; the PR example below shows the difference.

##### Principles

###### Durability over precision

The issue may sit in `ready-for-agent` for days or weeks. The codebase will change in the meantime. Write the brief so it stays useful even as files are renamed, moved, or refactored.

- **Do** describe interfaces, types, and behavioral contracts
- **Do** name specific types, function signatures, or config shapes that the agent should look for or modify
- **Don't** reference file paths: they go stale
- **Don't** reference line numbers
- **Don't** assume the current implementation structure will remain the same

###### Behavioral, not procedural

Describe **what** the system should do, not **how** to implement it. The agent will explore the codebase fresh and make its own implementation decisions.

- **Good:** "The `SkillConfig` type should accept an optional `schedule` field of type `CronExpression`"
- **Bad:** "Open src/types/skill.ts and add a schedule field on line 42"
- **Good:** "When a user runs `/triage` with no arguments, they should see a summary of issues needing attention"
- **Bad:** "Add a switch statement in the main handler function"

###### Complete acceptance criteria

The agent needs to know when it's done. Every agent brief must have concrete, testable acceptance criteria. Each criterion should be independently verifiable.

- **Good:** "Running `gh issue list --label needs-triage` returns issues that have been through initial classification"
- **Bad:** "Triage should work correctly"

###### Explicit scope boundaries

State what is out of scope. This prevents the agent from gold-plating or making assumptions about adjacent features.

##### Template

```markdown
## Agent Brief

**Category:** bug / enhancement
**Summary:** one-line description of what needs to happen

**Current behavior:**
Describe what happens now. For bugs, this is the broken behavior.
For enhancements, this is the status quo the feature builds on.

**Desired behavior:**
Describe what should happen after the agent's work is complete.
Be specific about edge cases and error conditions.

**Key interfaces:**
- `TypeName`: what needs to change and why
- `functionName()` return type: what it currently returns vs what it should return
- Config shape: any new configuration options needed

**Acceptance criteria:**
- [ ] Specific, testable criterion 1
- [ ] Specific, testable criterion 2
- [ ] Specific, testable criterion 3

**Out of scope:**
- Thing that should NOT be changed or addressed in this issue
- Adjacent feature that might seem related but is separate
```

##### Examples

###### Good agent brief (bug)

```markdown
## Agent Brief

**Category:** bug
**Summary:** Skill description truncation drops mid-word, producing broken output

**Current behavior:**
When a skill description exceeds 1024 characters, it is truncated at exactly
1024 characters regardless of word boundaries. This produces descriptions
that end mid-word (e.g. "Use when the user wants to confi").

**Desired behavior:**
Truncation should break at the last word boundary before 1024 characters
and append "..." to indicate truncation.

**Key interfaces:**
- The `SkillMetadata` type's `description` field: no type change needed,
  but the validation/processing logic that populates it needs to respect
  word boundaries
- Any function that reads SKILL.md frontmatter and extracts the description

**Acceptance criteria:**
- [ ] Descriptions under 1024 chars are unchanged
- [ ] Descriptions over 1024 chars are truncated at the last word boundary
      before 1024 chars
- [ ] Truncated descriptions end with "..."
- [ ] The total length including "..." does not exceed 1024 chars

**Out of scope:**
- Changing the 1024 char limit itself
- Multi-line description support
```

###### Good agent brief (enhancement)

```markdown
## Agent Brief

**Category:** enhancement
**Summary:** Add `.out-of-scope/` directory support for tracking rejected feature requests

**Current behavior:**
When a feature request is rejected, the issue is closed with a `wontfix` label
and a comment. There is no persistent record of the decision or reasoning.
Future similar requests require the maintainer to recall or search for the
prior discussion.

**Desired behavior:**
Rejected feature requests should be documented in `.out-of-scope/<concept>.md`
files that capture the decision, reasoning, and links to all issues that
requested the feature. When triaging new issues, these files should be
checked for matches.

**Key interfaces:**
- Markdown file format in `.out-of-scope/`: each file should have a
  `# Concept Name` heading, a `**Decision:**` line, a `**Reason:**` line,
  and a `**Prior requests:**` list with issue links
- The triage workflow should read all `.out-of-scope/*.md` files early
  and match incoming issues against them by concept similarity

**Acceptance criteria:**
- [ ] Closing a feature as wontfix creates/updates a file in `.out-of-scope/`
- [ ] The file includes the decision, reasoning, and link to the closed issue
- [ ] If a matching `.out-of-scope/` file already exists, the new issue is
      appended to its "Prior requests" list rather than creating a duplicate
- [ ] During triage, existing `.out-of-scope/` files are checked and surfaced
      when a new issue matches a prior rejection

**Out of scope:**
- Automated matching (human confirms the match)
- Reopening previously rejected features
- Bug reports (only enhancement rejections go to `.out-of-scope/`)
```

###### Good agent brief (PR)

For a PR, "Current behavior" describes the state of the diff, and the brief asks the agent to finish or fix it rather than build from scratch.

```markdown
## Agent Brief

**Category:** enhancement
**Summary:** Finish the contributor's `--json` output flag for `triage list`

**Current behavior:**
The PR adds a `--json` flag that serializes the issue list to JSON. The happy
path works and the diff matches the project's command structure. Two gaps
remain: errors are still printed as human text (not JSON), and the new flag has
no test coverage.

**Desired behavior:**
With `--json`, all output (including errors) is well-formed JSON on stdout,
and the command's exit codes are unchanged. The existing human-readable output
is untouched when the flag is absent.

**Key interfaces:**
- The command's error path should emit `{ "error": string }` under `--json`
  instead of the plain-text error
- Reuse the existing serializer the PR already added; don't introduce a second

**Acceptance criteria:**
- [ ] `triage list --json` emits valid JSON for both success and error cases
- [ ] Exit codes match the non-JSON command
- [ ] A test covers the `--json` success output and one error case
- [ ] Default (non-JSON) output is byte-for-byte unchanged

**Out of scope:**
- Adding `--json` to any other command
- Changing the JSON shape of the success payload the PR already defined
```

###### Bad agent brief

```markdown
## Agent Brief

**Summary:** Fix the triage bug

**What to do:**
The triage thing is broken. Look at the main file and fix it.
The function around line 150 has the issue.

**Files to change:**
- src/triage/handler.ts (line 150)
- src/types.ts (line 42)
```

This is bad because:
- No category
- Vague description ("the triage thing is broken")
- References file paths and line numbers that will go stale
- No acceptance criteria
- No scope boundaries
- No description of current vs desired behavior

### File: `modes/triage/OUT-OF-SCOPE.md`

#### Out-of-Scope Knowledge Base

The `.out-of-scope/` directory in a repo stores persistent records of rejected feature requests. It serves two purposes:

1. **Institutional memory**: why a feature was rejected, so the reasoning isn't lost when the issue is closed
2. **Deduplication**: when a new issue comes in that matches a prior rejection, the skill can surface the previous decision instead of re-litigating it

##### Directory structure

```
.out-of-scope/
├── dark-mode.md
├── plugin-system.md
└── graphql-api.md
```

One file per **concept**, not per issue. Multiple issues requesting the same thing are grouped under one file.

##### File format

The file should be written in a relaxed, readable style, more like a short design document than a database entry. Use paragraphs, code samples, and examples to make the reasoning clear and useful to someone encountering it for the first time.

```markdown
# Dark Mode

This project does not support dark mode or user-facing theming.

## Why this is out of scope

The rendering pipeline assumes a single color palette defined in
`ThemeConfig`. Supporting multiple themes would require:

- A theme context provider wrapping the entire component tree
- Per-component theme-aware style resolution
- A persistence layer for user theme preferences

This is a significant architectural change that doesn't align with the
project's focus on content authoring. Theming is a concern for downstream
consumers who embed or redistribute the output.

```ts
// The current ThemeConfig interface is not designed for runtime switching:
interface ThemeConfig {
  colors: ColorPalette; // single palette, resolved at build time
  fonts: FontStack;
}
```

## Prior requests

- #42: "Add dark mode support"
- #87: "Night theme for accessibility"
- #134: "Dark theme option"
```

###### Naming the file

Use a short, descriptive kebab-case name for the concept: `dark-mode.md`, `plugin-system.md`, `graphql-api.md`. The name should be recognizable enough that someone browsing the directory understands what was rejected without opening the file.

###### Writing the reason

The reason should be substantive: not "we don't want this" but why. Good reasons reference:

- Project scope or philosophy ("This project focuses on X; theming is a downstream concern")
- Technical constraints ("Supporting this would require Y, which conflicts with our Z architecture")
- Strategic decisions ("We chose to use A instead of B because...")

The reason should be durable. Avoid referencing temporary circumstances ("we're too busy right now"); those aren't real rejections, they're deferrals.

##### When to check `.out-of-scope/`

During triage (Step 1: Gather context), read all files in `.out-of-scope/`. When evaluating a new issue:

- Check if the request matches an existing out-of-scope concept
- Matching is by concept similarity, not keyword: "night theme" matches `dark-mode.md`
- If there's a match, surface it to the maintainer: "This is similar to `.out-of-scope/dark-mode.md`. We rejected this before because [reason]. Do you still feel the same way?"

The maintainer may:

- **Confirm**: the new issue gets added to the existing file's "Prior requests" list, then closed
- **Reconsider**: the out-of-scope file gets deleted or updated, and the issue proceeds through normal triage
- **Disagree**: the issues are related but distinct, proceed with normal triage

##### When to write to `.out-of-scope/`

Only when an **enhancement** (not a bug) is *rejected* as `wontfix`. This applies to enhancement PRs exactly as it does to issues: a rejected PR is recorded here so the same request doesn't return as fresh code.

Do **not** write here when something is closed as `wontfix` because it's **already implemented**. That's a built feature, not a rejected one; recording it would poison the dedup checks with false rejections. Instead, the closing comment points to where the feature already lives.

The flow:

1. Maintainer decides a feature request is out of scope
2. Check if a matching `.out-of-scope/` file already exists
3. If yes: append the new issue to the "Prior requests" list
4. If no: create a new file with the concept name, decision, reason, and first prior request
5. Post a comment on the issue explaining the decision and mentioning the `.out-of-scope/` file
6. Close the issue with the `wontfix` label

##### Updating or removing out-of-scope files

If the maintainer changes their mind about a previously rejected concept:

- Delete the `.out-of-scope/` file
- The skill does not need to reopen old issues; they're historical records
- The new issue that triggered the reconsideration proceeds through normal triage

### File: `modes/triage.md`

#### Triage mode

Follow the package policy linked from this skill's router before acting.

<a id="src-triage-intro"></a>

<a id="src-triage-triage"></a>
##### Triage

Classify incoming issues and external pull requests, reproduce bug reports against code, reject out-of-scope requests to `.out-of-scope/`, and synthesize durable, high-context agent briefs.

---

<a id="src-triage-core-invariants"></a>
###### Core Invariants

1. **Mandatory Disclaimer**: Every comment or issue created during triage must open with `> *This was generated by AI during triage.*`
2. **Category and State Orthogonality**: Every triaged issue must possess exactly one Category (`bug`, `enhancement`) and one State (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).
3. **Reproduction Before Brief**: Verify bug claims against codebase tests and reproduction steps before promoting to `ready-for-agent`.
4. **Out-of-Scope Knowledge Base**: Rejected enhancement requests must be codified in `.out-of-scope/<slug>.md` with clear rationale to prevent recurring re-triage.
5. **Redundancy Screening**: Search codebase for existing implementations before triaging feature requests; if already implemented, close with an explanation.

---

<a id="src-triage-architecture--map-of-content-moc"></a>
###### Architecture & Map of Content (MOC)

```
[ Incoming Issue / External PR ]
                │
                ▼
┌───────────────────────────────────────┐
│ 1. Redundancy & Out-of-Scope Check    │ ──► Search code & `.out-of-scope/*.md`
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ 2. Reproduction & Verification Pass   │ ──► Verify bug or test PR diff locally
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ 3. Socratic Grilling & State Decision │ ──► Settle terms, update `CONTEXT.md`
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ 4. Outcome Publication                │ ──► Post Agent Brief or Out-of-Scope Record
└───────────────────────────────────────┘
```

| Component | Responsibility | Reference Format |
|---|---|---|
| **Agent Brief** | Self-contained instructions for AFK agents | `triage/AGENT-BRIEF.md` |
| **Out of Scope KB** | Persistent store of rejected proposals | `triage/OUT-OF-SCOPE.md` |
| **Triage State Machine** | Canonical roles and state transitions | `docs/agents/triage-labels.md` |

---

<a id="src-triage-step-by-step-procedure-twi"></a>
###### Step-by-Step Procedure (TWI)

<a id="src-triage-step-1-query-issues-needing-attention"></a>
###### Step 1: Query Issues Needing Attention
- **Action**: Query tracker for unlabeled issues, `needs-triage` issues, and `needs-info` issues with fresh reporter activity.
- **Key Point**: Include external PRs when configured as a request surface.
- **Why**: Focuses maintainer attention on actionable items requiring triage intervention.

<a id="src-triage-step-2-screen-redundancy--prior-rejections"></a>
###### Step 2: Screen Redundancy & Prior Rejections
- **Action**: Search codebase for existing capabilities and inspect `.out-of-scope/*.md` for prior rejections.
- **Key Point**: If the requested behavior already exists, close as `wontfix` pointing directly to the implementation.
- **Why**: Prevents duplicate feature implementations and wasted engineering cycles.

<a id="src-triage-step-3-reproduce-claim--formulate-recommendation"></a>
###### Step 3: Reproduce Claim & Formulate Recommendation
- **Action**: Attempt reproduction of bug reports or checkout external PR diffs to run test suites.
- **Key Point**: If reproduction fails due to missing details, move to `needs-info` with specific questions.
- **Inline Checklist**:
  - [ ] Bug reproduction attempted on local environment
  - [ ] Relevant code paths and potential root causes identified
  - [ ] Category and state recommendation presented to maintainer

<a id="src-triage-step-4-apply-state--deliver-agent-brief"></a>
###### Step 4: Apply State & Deliver Agent Brief
- **Action**: Apply maintainer-approved state:
  - `ready-for-agent`: Post structured Agent Brief with reproduction commands and suggested seams.
  - `needs-info`: Post specific question block tagging the reporter.
  - `wontfix` (enhancement): Document in `.out-of-scope/` and close issue.
- **Why**: High-fidelity agent briefs enable downstream autonomous agents to implement fixes without human intervention.

---

<a id="src-triage-anti-rationalization-guardrails"></a>
###### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"Promote a bug to `ready-for-agent` without reproducing it."* | **Mandatory reproduction pass before agent handover.** | Unverified bug reports send downstream agents on wild goose chases. |
| *"Reject a feature in a short comment without documenting it."* | **Log rejected enhancements in `.out-of-scope/`.** | Undocumented rejections lead to repeatedly re-evaluating the same request. |
| *"Ask the reporter vague questions like 'more details please'."* | **Ask specific, actionable questions in `needs-info`.** | Vague questions delay resolution and frustrate external contributors. |
