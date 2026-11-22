# Spec-run mode

Follow the package policy linked from this skill's router before acting.

<a id="src-implement-spec-intro"></a>

<a id="src-implement-spec-implement-spec"></a>
## Implement Spec

Orchestrate the parallel implementation of an approved specification and its DAG task graph across isolated subagent branches, culminating in a single unified, code-reviewed pull request.

---

<a id="src-implement-spec-core-invariants"></a>
### Core Invariants

1. **DAG Frontier Concurrency**: Implementer subagents work exclusively on unblocked frontier tickets; merge completions immediately unlock newly unblocked tickets.
2. **Strict Worktree Isolation**: Every implementer subagent executes in its own dedicated, isolated Git worktree and branch to prevent file collision.
3. **Context Pointers Exclusively**: Communicate to subagents strictly via context pointers (spec path, ticket IDs, ADRs); avoid dumping giant walls of text.
4. **Dedicated Merger Verification**: Merging completed worktree branches into the main PR branch is handled by a merger subagent with full test suite verification.
5. **Unified Code-Review Quality Gate**: Run the package's review skill (code mode) across the unified PR branch before marking it ready for human review, fixing all findings in a final pass.

---

<a id="src-implement-spec-architecture--map-of-content-moc"></a>
### Architecture & Map of Content (MOC)

```
[ Approved Spec & DAG Tickets ] ──► [ Create PR Branch ] ──► [ Parallel Worktree Subagents ]
                                                                       │
                                      ┌────────────────────────────────┴────────────────────────────────┐
                                      ▼                                                                 ▼
                            [ Ticket #01 Worktree ]                                           [ Ticket #02 Worktree ]
                            - Isolated branch                                                 - Isolated branch
                            - Red/Green TDD cycle                                             - Red/Green TDD cycle
                                      │                                                                 │
                                      └────────────────────────────────┬────────────────────────────────┘
                                                                       ▼
                                                       [ Merge & Verify on PR Branch ]
                                                                       │
                                                                       ▼
                                                       [ Code Review & Worktree Cleanup ]
```

| Role | Responsibility | Execution Mode |
|---|---|---|
| **Exploration Agent** | Pre-read external documentation and shared schemas | Background subagent (`research`) |
| **Implementer Agents** | Execute single tickets inside isolated worktrees | Parallel subagents (`implement`) |
| **Merger Agent** | Merge feature branches into PR branch & verify tests | Serial integration pass |
| **Review Gate** | Run two-axis code review on final PR branch | The package's review skill, code mode |

---

<a id="src-implement-spec-step-by-step-procedure-twi"></a>
### Step-by-Step Procedure (TWI)

<a id="src-implement-spec-step-1-ingest-task-graph--initialize-pr-branch"></a>
#### Step 1: Ingest Task Graph & Initialize PR Branch
- **Action**: Read the specification and associated tickets to compute the initial unblocked frontier.
- **Key Point**: Create a dedicated PR branch (`feat/<spec-slug>`) and draft pull request linking all target tickets.
- **Why**: Linking tickets upfront ensures automated status tracking and traceability.

<a id="src-implement-spec-step-2-dispatch-parallel-implementer-subagents"></a>
#### Step 2: Dispatch Parallel Implementer Subagents
- **Action**: For each ticket on the unblocked frontier, spawn an implementer subagent in an isolated worktree (`.worktrees/<ticket-slug>`).
- **Key Point**: Pass context pointers to the spec and ticket without duplicating instructions.
- **Inline Checklist**:
  - [ ] Worktrees isolated from main repository workspace
  - [ ] Implementers follow strict TDD red-green cycle
  - [ ] Each implementer works on a single assigned ticket

<a id="src-implement-spec-step-3-merge-completed-tickets--advance-frontier"></a>
#### Step 3: Merge Completed Tickets & Advance Frontier
- **Action**: When an implementer completes, merge its branch into the PR branch, run the test suite, and delete the worktree.
- **Key Point**: Recompute the task graph frontier to launch newly unblocked tickets immediately.
- **Why**: Continuous merging keeps integration diffs small and surfaces conflicts early.

<a id="src-implement-spec-step-4-run-two-axis-code-review--cleanup"></a>
#### Step 4: Run Two-Axis Code Review & Cleanup
- **Action**: Once all tickets are merged, run the package's review skill (code mode) on `feat/<spec-slug>`.
- **Key Point**: Remediate all Standards and Spec findings before marking the PR ready for human review.
- **Why**: Comprehensive pre-merge review guarantees production-grade architecture and full spec compliance.

---

<a id="src-implement-spec-anti-rationalization-guardrails"></a>
### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"Run all implementers in the same shared working tree."* | **Mandatory isolated git worktrees per subagent.** | Shared workspaces cause file lock contention, overwrites, and git index corruption. |
| *"Skip code review since all unit tests passed."* | **Mandatory two-axis code review on the final PR branch.** | Passing tests do not catch architectural smells, Fowler anti-patterns, or missed spec clauses. |
| *"Implement blocked tickets before their dependencies merge."* | **Strictly adhere to the DAG frontier.** | Implementing blocked tickets prematurely results in massive merge conflicts and rework. |
