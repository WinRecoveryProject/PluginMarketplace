# Loop mode

Follow the package policy linked from this skill's router before acting.

<a id="src-diagnosing-bugs-intro"></a>

<a id="src-diagnosing-bugs-diagnosing-bugs"></a>
## Diagnosing Bugs

A disciplined feedback-loop methodology for diagnosing and resolving hard bugs, intermittent flakes, and performance regressions.

<a id="src-diagnosing-bugs-core-principle"></a>
### Core Principle

> **Never guess or hypothesize before establishing a fast, deterministic, automated feedback loop that reliably reproduces the red failure.**

---

<a id="src-diagnosing-bugs-core-invariants"></a>
### Core Invariants

1. **Mandatory Red Loop Before Theory**: Construct a fast, automated repro command and see it fail before formulating or testing any hypotheses.
2. **Credential Redaction First**: Redact all keys, authorization headers, tokens, and secrets with `<REDACTED>` before displaying outputs or logs.
3. **Single Variable Instrumentation**: Change only one variable at a time when probing hypothesis boundaries.
4. **Unique Debug Tagging**: Tag all temporary diagnostic logs with a unique searchable prefix (e.g. `[DEBUG-trace]`) for complete cleanup before commit.
5. **Regression Test at Public Seam**: Lock down the fix with a permanent test at a genuine architectural seam before declaring victory.

---

<a id="src-diagnosing-bugs-architecture--map-of-content-moc"></a>
### Architecture & Map of Content (MOC)

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
### Step-by-Step Procedure (TWI)

<a id="src-diagnosing-bugs-step-1-construct-a-tight-feedback-loop-phase-1"></a>
#### Step 1: Construct a Tight Feedback Loop (Phase 1)
- **Action**: Build an automated runner (failing test, CLI fixture, curl script, or trace replay) that drives the bug path.
- **Key Point**: The loop must be fast (< 5s), deterministic, and assert the user's exact symptom.
- **Inline Checklist**:
  - [ ] Automated command exists and has been executed
  - [ ] Command goes red specifically on this bug symptom
  - [ ] Execution completes in seconds without manual intervention
- **Why**: Staring at code without a feedback loop leads to guessing and confirmation bias.

<a id="src-diagnosing-bugs-step-2-reproduce-and-minimise-phase-2"></a>
#### Step 2: Reproduce and Minimise (Phase 2)
- **Action**: Run the loop to confirm reproduction, then systematically remove non-essential config, data, and steps.
- **Key Point**: Every remaining line in the repro must be load-bearing (removing it turns the loop green).
- **Why**: Minimal repros shrink the hypothesis space and convert cleanly into permanent regression tests.

<a id="src-diagnosing-bugs-step-3-formulate-falsifiable-hypotheses-phase-3"></a>
#### Step 3: Formulate Falsifiable Hypotheses (Phase 3)
- **Action**: Generate 3–5 ranked hypotheses stating the explicit prediction each makes.
- **Key Point**: Use format: *"If X is the cause, then changing Y will make the symptom disappear."*
- **Why**: Single-hypothesis debugging anchors on first impressions and wastes turns.

<a id="src-diagnosing-bugs-step-4-instrument-and-isolate-phase-4"></a>
#### Step 4: Instrument and Isolate (Phase 4)
- **Action**: Insert tagged probes (`[DEBUG-xxx]`) or inspect values at key boundaries.
- **Key Point**: Change only one variable at a time; measure baselines before tuning performance bugs.
- **Why**: Changing multiple variables simultaneously confounds cause and effect.

<a id="src-diagnosing-bugs-step-5-fix-verify-and-clean-phases-5--6"></a>
#### Step 5: Fix, Verify, and Clean (Phases 5 & 6)
- **Action**: Write the regression test, apply the minimal fix, verify the full suite, and purge all debug instrumentation.
- **Inline Checklist**:
  - [ ] Regression test fails without fix and passes with fix
  - [ ] Original un-minimised repro confirmed green
  - [ ] All `[DEBUG-...]` tags purged from codebase
  - [ ] Root cause documented clearly in commit message

---

<a id="src-diagnosing-bugs-anti-rationalization-guardrails"></a>
### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"I think I see the bug in the code, let me fix it now."* | **No edits without an automated red feedback loop.** | Fixing code based on inspection often addresses symptoms while missing root causes. |
| *"The bug is non-deterministic so we cannot automate a test."* | **Increase reproduction rate (stress, loops, pinned clocks).** | A 50% flake rate is debuggable; raise reproduction frequency until testable. |
| *"I'll add logs everywhere and inspect all outputs."* | **Targeted, tagged probes only.** | Untargeted logging floods context and creates cleanup debt. |
| *"The fix works in manual testing, skip the regression test."* | **Mandatory automated regression test at public seam.** | Without a regression test, the bug will silently return in future refactors. |
