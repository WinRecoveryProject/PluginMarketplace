# Skill: diagnose-systematically

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/diagnose-systematically/SKILL.md`

> Finds root causes through reproduction and falsifiable experiments. Use when a failure, flaky behavior, or regression lacks a demonstrated cause.

## Instructions

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#not-embedded); never load companion plugins.

### Diagnose Systematically

Find the cause before proposing a fix. Diagnosis does not authorize implementation.

#### Preserve evidence

Keep an append-only investigation log with the symptom, commands, exit codes,
decisive output, hypotheses, experiments, and verdicts. Put it in a scratch
directory unless the user requested a versioned artifact. If the user requests
read-only work or forbids edits, report that trail through command output and
the final response; do not create any file, including a scratch or temporary log.

#### Evidence loop

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

#### Scale the investigation deliberately

Keep one investigator for a small reproduced defect. Use parallel read-only
lanes only when several components remain plausible, the regression window is
uncertain, or intermittency supports independent probes. Give every lane the
same symptom packet and one seam: reproduction scope, first code-path
divergence, recent-change regression, or proof observability. Require a
hypothesis, prediction, falsifier, evidence, missing evidence, smallest next
probe, and confidence. Merge duplicate theories and run the cheapest
discriminating probe; ranking never proves a cause.

Use these resources only when their condition matches:

- Deep call-stack symptom: [root-cause-tracing.md](diagnose-systematically.md#file-root-cause-tracingmd).
- Arbitrary delays or flaky async tests:
  [condition-based-waiting.md](diagnose-systematically.md#file-condition-based-waitingmd).
- Test-order pollution: run [find-polluter.sh](diagnose-systematically.md#file-find-pollutersh).
- Proven source fix that needs layered guards:
  [defense-in-depth.md](diagnose-systematically.md#file-defense-in-depthmd).

#### Fix only when authorized

When the user requested a fix, turn the minimized reproduction into a
regression test at the highest public seam that exercises the defect. Record it
failing for the expected reason before changing production code. Implement the
smallest fix, rerun the identical test, then rerun the original unminimized
signal. Where cheap, revert the fix once to demonstrate the failure returns.

Do not substitute a shallow test when no correct seam exists; state the
limitation. Remove temporary instrumentation and harnesses. After three failed
fix attempts, stop and question the causal model or architecture instead of
stacking a fourth guess.

#### Close

Report the supported cause, discriminating evidence, exact checks and results,
authorized fix if any, removed instrumentation, and unverified surfaces. Do not
call an unexplained recovery a fix.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Diagnose Systematically"
  short_description: "Find root causes with evidence-first diagnosis"
  default_prompt: "Diagnose this failure from evidence."

policy:
  allow_implicit_invocation: true
```

### File: `condition-based-waiting.md`

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

### File: `defense-in-depth.md`

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

### File: `find-polluter.sh`

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

### File: `root-cause-tracing.md`

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
#### Layer 1: entry point - is the value present at all?
if [ -n "${API_KEY:-}" ]; then echo "API_KEY: SET"; else echo "API_KEY: UNSET"; fi

#### Layer 2: intermediate script - did it propagate?
if [ "${API_KEY+x}" = x ]; then echo "API_KEY propagated: SET"; else echo "API_KEY propagated: UNSET"; fi

#### Layer 3: consumer - what does the application actually see?
node -e "console.log('key seen by app:', process.env.API_KEY ? 'SET' : 'UNSET')"
```

This reveals which hop drops the value (entry ✓, intermediate ✗) instead of guessing at the whole chain.
Log only presence or absence. Never print the credential itself while tracing propagation.

##### Finding Which Test Causes Pollution

If something appears during tests but you don't know which test:

Use the polluter-finder script `find-polluter.sh` in this directory:

```bash
./find-polluter.sh '.git' 'src/**/*.test.ts'
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

### Not embedded

- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
