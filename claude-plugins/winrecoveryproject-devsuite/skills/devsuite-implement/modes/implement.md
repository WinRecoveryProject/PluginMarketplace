# Implement mode

Follow the package policy linked from this skill's router before acting.

<a id="src-implement-intro"></a>

<a id="src-implement-implement"></a>
## Implement

Execute scoped code changes and thorough verification from an approved specification, plan, or ticket set.

<a id="src-implement-core-principle"></a>
### Core Principle

> **Implement incrementally via vertical tracer slices, verify at each step, and maintain a green build at every seam.**

---

<a id="src-implement-core-invariants"></a>
### Core Invariants

1. **Approved Plan or Spec First**: Never start broad implementation on ambiguous or unapproved specs.
2. **Vertical Slice Progress**: Implement in small, testable tracer slices rather than mass horizontal file edits.
3. **Continuous Typecheck & Test Verification**: Run local typechecks and single test files after every file modification, and the full suite before completion.
4. **Pre-Commit Quality Gate**: Pass clean code review (the package's review skill (code mode)) and lint checks before committing.
5. **Zero Dead or Speculative Code**: Write strictly the code required to satisfy the spec; avoid speculative abstractions.

---

<a id="src-implement-architecture--map-of-content-moc"></a>
### Architecture & Map of Content (MOC)

```
[ Review Approved Spec ] ──► [ Order Tracer Slices ] ──► [ TDD Cycle per Slice ] ──► [ Full Suite Verification ] ──► [ Code Review & Commit ]
```

| Phase | Responsibility | Key Action |
|---|---|---|
| **1. Preparation** | Read spec, identify dependencies, check existing test seams | Verify repo builds cleanly before touching code |
| **2. Tracer Execution** | Implement slice-by-slice with TDD | Red-green cycles on target components |
| **3. Continuous Check** | Fast feedback on type errors and single tests | Run targeted test runner after each edit |
| **4. Integration Gate** | End-to-end regression validation | Full test suite, linter, and typecheck pass |
| **5. Delivery** | Review diff against standards and spec | Route to the package's review skill (code mode) and clean commit |

---

<a id="src-implement-step-by-step-procedure-twi"></a>
### Step-by-Step Procedure (TWI)

<a id="src-implement-step-1-ingest-spec--verify-baseline-cleanliness"></a>
#### Step 1: Ingest Spec & Verify Baseline Cleanliness
- **Action**: Read the spec or ticket descriptions, inspect referenced files, and verify the existing test suite passes cleanly.
- **Key Point**: Never begin adding new features to a broken or failing baseline.
- **Why**: Existing failures confound regression detection for new changes.

<a id="src-implement-step-2-implement-via-vertical-slices-tdd"></a>
#### Step 2: Implement via Vertical Slices (TDD)
- **Action**: For each ticket or component, write failing assertions at public seams, then implement minimal passing logic.
- **Key Point**: Keep edits contained and avoid touching unrelated modules.
- **Inline Checklist**:
  - [ ] Public seam identified and tested
  - [ ] Typecheck passes without errors
  - [ ] Targeted test passes cleanly

<a id="src-implement-step-3-full-test-suite--quality-verification"></a>
#### Step 3: Full Test Suite & Quality Verification
- **Action**: Run the complete project test suite, typechecker, and linter across the entire repository.
- **Key Point**: Zero failures, zero unexpected warnings, zero unformatted files.
- **Why**: Changes in one module can subtly break downstream consumers.

<a id="src-implement-step-4-code-review--final-commit"></a>
#### Step 4: Code Review & Final Commit
- **Action**: Audit the git diff against repository coding standards and original requirements using the package's review skill (code mode).
- **Key Point**: Write a clear, value-communicating commit message summarizing the change.
- **Why**: Durable commit histories preserve architectural reasoning for future maintainers.

---

<a id="src-implement-anti-rationalization-guardrails"></a>
### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"I'll edit all 10 files at once before testing anything."* | **Vertical tracer slicing: verify each file/unit immediately.** | Massive multi-file edits make errors difficult to isolate and debug. |
| *"Typechecks are slow, I'll run them at the very end."* | **Run fast targeted checks continuously.** | Catching type errors early prevents building on flawed data signatures. |
| *"The existing test suite was failing before, so ignore it."* | **Establish clean baseline before modifying code.** | Unaccounted failures hide new regressions introduced by the feature. |
| *"Skip code review since the code runs fine."* | **Mandatory diff review against spec and standards.** | Functional code can still violate repository conventions and security standards. |
