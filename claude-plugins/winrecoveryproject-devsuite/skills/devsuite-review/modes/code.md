# Code review mode

Follow the package policy linked from this skill's router before acting.

<a id="src-code-review-intro"></a>

<a id="src-code-review-code-review"></a>
## Code Review

Two-axis review of the diff between `HEAD` and a fixed point:
1. **Standards**: Does the code conform to documented repository standards and clean architecture smells?
2. **Spec**: Does the code faithfully and completely implement the originating issue/spec without scope creep?

Both axes execute as isolated parallel sub-agents to prevent context contamination, with findings reported side by side.

---

<a id="src-code-review-core-invariants"></a>
### Core Invariants

1. **Strict Two-Axis Separation**: Keep Standards and Spec findings isolated; never merge or cross-rank them into a blended score.
2. **Pinned Merge-Base Diff**: Always resolve refs with `git rev-parse` and review `git diff <fixed-point>...HEAD`.
3. **Evidence-Based Citations**: Every finding must quote the exact file, line range, and standard/spec clause violated.
4. **Tooling Non-Duplication**: Skip formatting, syntax, or lint errors that automated pre-commit tooling already catches.
5. **No Blind Approvals**: If the spec is missing, report "No spec provided - verified against standards only" explicitly.

---

<a id="src-code-review-architecture--map-of-content-moc"></a>
### Architecture & Map of Content (MOC)

```
[ Pin Fixed Point ] ──► [ Identify Spec & Standards ] ──► [ Parallel Review Subagents ] ──► [ Side-by-Side Synthesis ]
                                                                 │
                                ┌────────────────────────────────┴────────────────────────────────┐
                                ▼                                                                 ▼
                     [ Standards Subagent ]                                              [ Spec Subagent ]
                     - Documented repo rules                                             - Missing requirements
                     - Fowler code smells                                                - Unasked scope creep
                     - Architectural boundaries                                          - Flawed implementations
```

| Component | Responsibility | Evaluation Source |
|---|---|---|
| **Standards Axis** | Architecture smells, naming, cohesion | `CODING_STANDARDS.md`, `CONTRIBUTING.md`, smell baseline |
| **Spec Axis** | Functional completeness, scope boundaries | Issue description, `specs/*.md`, user requirements |
| **Aggregation** | Side-by-side balanced reporting | Verbatim findings categorized by axis |

---

<a id="src-code-review-step-by-step-procedure-twi"></a>
### Step-by-Step Procedure (TWI)

<a id="src-code-review-step-1-pin-the-fixed-point--diff"></a>
#### Step 1: Pin the Fixed Point & Diff
- **Action**: Resolve the base ref and confirm a non-empty diff (`git diff <base>...HEAD`).
- **Key Point**: Fail fast if the ref is invalid or the working tree is empty.
- **Why**: Reviewing against an incorrect base compares irrelevant changes.

<a id="src-code-review-step-2-extract-standards-and-spec-sources"></a>
#### Step 2: Extract Standards and Spec Sources
- **Action**: Locate repository guidelines (`CODING_STANDARDS.md`) and originating requirements/issues.
- **Key Point**: Equip the standards agent with Fowler smell baselines (Mysterious Name, Duplicated Code, Feature Envy, Primitive Obsession, Speculative Generality).
- **Inline Checklist**:
  - [ ] Diff base confirmed
  - [ ] Standards docs identified
  - [ ] Spec/issue requirements extracted

<a id="src-code-review-step-3-dispatch-parallel-sub-agents"></a>
#### Step 3: Dispatch Parallel Sub-Agents
- **Action**: Spawn Standards subagent and Spec subagent concurrently with dedicated prompts.
- **Key Point**: Restrict each subagent to its designated domain (< 400 words per report).
- **Why**: Combining standards and spec evaluation into a single pass leads to halo bias where clean code masks missing features.

<a id="src-code-review-step-4-aggregate-and-synthesize-report"></a>
#### Step 4: Aggregate and Synthesize Report
- **Action**: Present findings under `## Standards` and `## Spec` headers with actionable remediation recommendations.
- **Key Point**: State the single most severe issue within each axis clearly.
- **Why**: Clear prioritization helps authors address critical design issues first.

---

<a id="src-code-review-anti-rationalization-guardrails"></a>
### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"The code looks beautifully formatted, so it must be correct."* | **Standards pass $\neq$ Spec pass.** | Elegant code can completely fail to implement required business logic. |
| *"It does what the ticket asked, so ignore messy architecture."* | **Spec pass $\neq$ Standards pass.** | Quick hacks that bypass standards generate severe technical debt. |
| *"Merge both reviews into one combined score."* | **Strict two-axis separation.** | Blending scores obscures which dimension requires remediation. |
| *"Point out minor indentation issues in the review."* | **Skip issues handled by automated linters.** | Manual review should focus on semantics, architecture, and intent. |
