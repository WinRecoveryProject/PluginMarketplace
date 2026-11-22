# Conflicts mode

Follow the package policy linked from this skill's router before acting.

<a id="src-resolving-merge-conflicts-intro"></a>

<a id="src-resolving-merge-conflicts-resolving-merge-conflicts"></a>
## Resolving Merge Conflicts

Systematically resolve in-progress Git merge and rebase conflicts by identifying the semantic intent of both branches and verifying integration integrity with automated test gates.

---

<a id="src-resolving-merge-conflicts-core-invariants"></a>
### Core Invariants

1. **3-Way Intent Reconstruction**: Understand the common merge-base ancestor, the incoming changes (`THEIRS`), and the target branch changes (`OURS`) before altering conflicted code.
2. **Never Blindly Choose Ours or Theirs**: Inspect every conflict hunk individually; synthesize solutions that preserve the functional requirements of both branches.
3. **Zero Orphaned Conflict Markers**: Verify that all `<<<<<<<`, `=======`, and `>>>>>>>` markers are completely eliminated before staging.
4. **Non-Destructive Resolution**: Preserve adjacent unchanged code, comments, and docstrings; avoid accidental line deletions outside conflict hunks.
5. **Mandatory Post-Resolution Test Pass**: Execute the full build, typecheck, and test suite before concluding the merge (`git commit`) or rebase (`git rebase --continue`).

---

<a id="src-resolving-merge-conflicts-architecture--map-of-content-moc"></a>
### Architecture & Map of Content (MOC)

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
### Step-by-Step Procedure (TWI)

<a id="src-resolving-merge-conflicts-step-1-identify-conflicted-files-and-merge-context"></a>
#### Step 1: Identify Conflicted Files and Merge Context
- **Action**: Run `git status` to enumerate all conflicted files and inspect recent commit logs on both branches:
  ```bash
  git log --oneline -n 5 HEAD
  git log --oneline -n 5 MERGE_HEAD # or REBASE_HEAD
  ```
- **Key Point**: Determine what feature or bug fix each branch was attempting to deliver.
- **Why**: Understanding developer intent prevents resolving conflicts with syntax-valid but semantically broken hybrids.

<a id="src-resolving-merge-conflicts-step-2-resolve-conflicting-hunks-semantically"></a>
#### Step 2: Resolve Conflicting Hunks Semantically
- **Action**: Open each conflicted file, analyze the diff hunks between `HEAD` (Ours) and incoming (Theirs), and rewrite the block to satisfy both requirements.
- **Key Point**: If both branches added new imports, dependencies, or routes, combine them cleanly without duplicates.
- **Inline Checklist**:
  - [ ] All conflict markers (`<<<`, `===`, `>>>`) removed
  - [ ] Duplicate imports and exports deduplicated
  - [ ] New functionality from both branches retained

<a id="src-resolving-merge-conflicts-step-3-verify-with-build--test-suite"></a>
#### Step 3: Verify with Build & Test Suite
- **Action**: Run the repository's typechecker, linter, and test suite across the resolved working tree.
- **Key Point**: If tests fail, investigate whether resolving the conflict broke subtle runtime assumptions.
- **Why**: Many merge conflicts compile cleanly but introduce logical regressions that only tests catch.

<a id="src-resolving-merge-conflicts-step-4-stage-and-conclude-mergerebase"></a>
#### Step 4: Stage and Conclude Merge/Rebase
- **Action**: Stage the resolved files (`git add <files>`) and complete the operation:
  - For merge: `git commit` (preserving standard merge commit message).
  - For rebase: `git rebase --continue`.
- **Key Point**: Check `git status` to ensure the working tree is clean.
- **Why**: Clean conclusion ensures upstream CI pipelines can build the merged branch without human intervention.

---

<a id="src-resolving-merge-conflicts-anti-rationalization-guardrails"></a>
### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"Accept 'ours' or 'theirs' completely with `git checkout --ours` to be fast."* | **Forbidden on semantic conflicts.** | Blanket checkouts overwrite valid work and revert critical bug fixes from one branch. |
| *"Delete the failing test to get the merge commit through."* | **Fix the code to make tests pass.** | Deleting tests lowers coverage and introduces regressions into production. |
| *"Assume the code is fine without running the full test suite."* | **Mandatory test pass before committing merge.** | Resolving conflicts manually frequently introduces syntax errors and broken imports. |
