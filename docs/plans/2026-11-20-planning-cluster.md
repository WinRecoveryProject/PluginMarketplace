# Planning Cluster Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Studio's 10 planning skills and DevSuite's `devsuite-planning` into `studio-plan` (Studio 0.6.0) and `devsuite-planning` (DevSuite 0.4.0, Codex and Claude) without losing any capability.

**Architecture:** The plan reuses the review-cluster pattern and tooling:

- **Shared mode files:** byte-identical in both packages, with hashes pinned in `shared-plan-modes.json`.
- **Studio matrix:** a fine-grained `plan-matrix.json`, checked by `consolidation-check`.
- **DevSuite matrix:** checked by a Python test that reuses the checker in `tests/test_review_consolidation.py`.
- **Routing:** rules that return a mode.

**Tech Stack:** Node ≥20 (Studio), Python 3 `unittest` (DevSuite), the Claude packager `editors/claude/package.py`, and the marketplace validator.

**Spec:** `docs/specs/2026-11-20-planning-cluster-design.md`

## Global Constraints

- **Removed names, no aliases:**
  - Studio: `brainstorming`, `writing-plans`, `grill-me`, `grill-with-docs`, `grilling`, `to-spec`, `to-tickets`, `to-questionnaire`, `goal`, `wayfinder`.
  - DevSuite: no skill is removed. `devsuite-planning` keeps its name.
- **Shared mode files** contain no package links and no names of skills that exist in only one package. Wording changes are made only by a recorded adaptation list in the generator.
- **Drops.** Only the companion files may be dropped, and only in DevSuite's matrix, with `approved:true` and the reason "needs the Node browser server; DevSuite ships no Node runtime" (owner approval, 2026-11-20). Any other drop stops the work and goes to the owner.
- **Branches and commits.** Feature branches only. One commit per task. No force-push.
- **PRs.** Three draft PRs, based on the review-cluster branches. Nothing is merged or marked ready without the owner's explicit yes.
- **Baselines.**
  - Studio `feat/review-consolidation-0.5.0`: 233 pass, 1 skipped.
  - DevSuite `feat/review-consolidation-0.3.0`: unit 40, portable 5, VS Code 4, doctor PASS.
  - Marketplace `feat/review-cluster`: validator ok, 13/13.

## Observed facts

- **Studio sources** (worktree `Zilvereyes-Plugin-Studio-0.5.0`):
  - `brainstorming` (154 lines) has `visual-companion.md` and `scripts/{frame-template.html,helper.js,server.cjs,start-server.sh,stop-server.sh}`.
  - `writing-plans` (78 lines) has `references/full-plan.md`.
  - The other 8 skills have only `SKILL.md` and `agents/openai.yaml`.
  - 22 other Studio files name these skills. Task 2 lists them with `rg`.
- **DevSuite `devsuite-planning`:**
  - Three paragraphs, then `## Optional task-boundary board` with five paragraphs.
  - `editors/claude/package.py` keeps only the text before that heading for Claude (`local_guide`, a partition on `"\n## Optional task-boundary board\n"`), and raises if the heading is missing.
  - `runtime/routing.py` line 105 routes `plan|planning|coordinate|…|board` to `devsuite-planning`, without a mode.
- **Reusable review-cluster tooling** (scratchpad, regenerated if missing):
  - `gen-review.mjs`: a verbatim mode generator with anchors and an `ADAPT` list.
  - `map-review.mjs`: maps matrix entries.
  - `sync-snapshot.mjs`: applies a commit range to a marketplace snapshot and refreshes the lock.
  - The Studio snapshot script.

---

### Task 0: Branches and baselines

- [ ] Studio worktree: `git switch -c feat/plan-consolidation-0.6.0`, from `feat/review-consolidation-0.5.0` at `a9c64ed`.
- [ ] DevSuite worktree: `git switch -c feat/plan-consolidation-0.4.0`, from `feat/review-consolidation-0.3.0` at `4c2857d`.
- [ ] Marketplace: `git switch -c feat/planning-cluster`, from `feat/review-cluster` at `044643e`. Commit the spec and plan.
- [ ] Re-run the baselines listed above. Stop on any regression.

### Task 1: Studio — `studio-plan` and shared plan modes

**Files:**
- Create: `skills/studio-plan/{SKILL.md,agents/openai.yaml,assets/*}`.
- Create: `skills/studio-plan/modes/{discover,interview,spec,plan,plan-full,tickets,questions,goal,map}.md`.
- Create: `skills/studio-plan/companion/{visual-companion.md,scripts/*}`, copied byte-for-byte.
- Create: `references/consolidation/{plan-sources.json,plan-matrix.json,shared-plan-modes.json}`.
- Modify: `src/registry.mjs` rules (`studio-plan` mode rules, placed before `studio-review`), and `references/integration-registry.json` (a `studio-plan` capability).
- Test: `tests/plan-consolidation.test.mjs`. It mirrors `tests/review-consolidation.test.mjs`:
  1. the shared hashes match;
  2. the shared files have no package links;
  3. the matrix is ok, with 0 unmapped;
  4. every removed trigger routes to `studio-plan` and its mode.

**Generator rules** (`gen-plan.mjs`, a copy of `gen-review.mjs`):
- Modes in order:
  - `discover` ← brainstorming
  - `interview` ← grill-me, grill-with-docs, grilling, as three sections
  - `spec` ← to-spec
  - `plan` ← writing-plans
  - `tickets` ← to-tickets
  - `questions` ← to-questionnaire
  - `goal` ← goal
  - `map` ← wayfinder
- Strip the policy line.
- `plan-full.md` is `writing-plans/references/full-plan.md`. Rewrite the link `[references/full-plan.md](references/full-plan.md)` in `plan.md` to `[the full-plan reference](plan-full.md)`.
- In `discover.md`, replace every markdown link to `visual-companion.md` and every `scripts/` path with plain text: "the visual companion, when this package ships it (see this skill's router)".
- Build the `ADAPT` list after running `rg` over the generated files for the names of other Studio skills, both removed skills and Studio-only ones such as `executing-plans`, `subagent-driven-development`, `design-ui` and `using-git-worktrees`. Replace each with a package-neutral phrase, for example "the package's plan-execution workflow" or "this skill's plan mode". Fail the generator if a listed source sentence is not found exactly once.

**Router:** `studio-plan/SKILL.md` is under 70 lines. It has:
- `<a id="policy">` with the Studio policy line;
- `mode-<mode>` anchors;
- a "Visual companion" section, linking `companion/visual-companion.md` and stating that it starts a local Node server only on approval;
- a description that covers every removed trigger, plus `Do NOT use for executing an existing plan or writing code`.

**Steps:**
- [ ] 1. Write the test. Run `node --test tests/plan-consolidation.test.mjs`. Expected: 4 failures.
- [ ] 2. Generate the files, then seed and map the matrix:
  - Use `map-review.mjs` with a `modeOf` for the 10 skills.
  - Map `brainstorming` files `visual-companion.md` and `scripts/*` to `skills/studio-plan/companion/...`.
  - Map `writing-plans/references/full-plan.md` to `skills/studio-plan/modes/plan-full.md`.
- [ ] 3. Iterate the route rules until test 4 passes. Never weaken a test.
- [ ] 4. Run `npm test && npm run validate`. Expected: all pass. The old skills still exist.
- [ ] 5. `git commit -m "feat(studio): add studio-plan with shared planning modes"`

### Task 2: Studio — re-point, remove, 0.6.0

- [ ] **Re-point.** Run the re-point script with these rules:
  - `brainstorming` → `studio-plan` discover mode
  - `writing-plans` → `studio-plan` plan mode
  - each grill skill → interview mode
  - `to-spec` → spec mode
  - `to-tickets` → tickets mode
  - `to-questionnaire` → questions mode
  - `goal` → goal mode. This uses word boundaries and is skipped inside code spans that name a slash command; review each hit by hand.
  - `wayfinder` → map mode

  Link paths become `../studio-plan/modes/<mode>.md`. The script prints `LEFT` for every remaining mention. Fix each by hand until there are none.
- [ ] **Snapshot and delete.** Snapshot the 10 sources from the Task 1 commit, then delete them. Update the registry: remove the capabilities, repoint `implementation` to `skills/studio-plan/SKILL.md`, and set the version to `0.6.0`.
- [ ] **Version and docs.** Set version `0.6.0` in `package.json`, `plugin.json`, `.codex-plugin/plugin.json` and README. Add a CHANGELOG 0.6.0 table mapping old names to new modes.
- [ ] **Tests.** Extend the test file:
  - the full `checkMatrix`;
  - no removed name in `skills/`;
  - `route('Lav en plan')` gives `studio-plan` and `plan`, which replaces the old `writing-plans` expectation in `tests/integration.test.mjs:22`.
- [ ] **Verify.** Run `npm test`, `npm run validate`, both earlier matrices and `consolidation-check` on `plan-matrix.json`, and `python -B tools/package.py`. Expected: all pass, and the build is deterministic.
- [ ] `git commit -m "feat(studio)!: merge planning skills into studio-plan (0.6.0)"`

### Task 3: DevSuite — `devsuite-planning` union and 0.4.0

**Files and changes:**
- **Shared modes.** Copy them into `skills/devsuite-planning/modes/`, byte-identical. Copy `shared-plan-modes.json` from Studio.
- **Router.** Rewrite `skills/devsuite-planning/SKILL.md` in this order:
  1. frontmatter, with a description that covers every removed trigger;
  2. `# Plan and coordinate a bounded outcome`;
  3. `<a id="policy">` followed by the original paragraph 1 verbatim;
  4. a mode table: the 8 shared modes plus `project` (`#mode-project`);
  5. `<a id="src-devsuite-planning-project">` followed by the original paragraphs 2–3 verbatim;
  6. the unchanged `## Optional task-boundary board` section.

  This keeps the Claude cutoff working, so Claude still gets the policy, the table and the project text.
- **Routing.** In `runtime/routing.py`, add `PLAN_MODES` patterns, checked after `REVIEW_MODES`. The existing line-105 branch yields mode `project`.
- **Capability matrix.** Add one entry per Studio source (owner `devsuite-planning`, `mode`, `externalProvider:""`, test `tests/test_plan_consolidation.py::test_plan_matrix_union`). Give existing `devsuite-planning` entries `mode:"project"`.
- **Plan matrix.** `references/consolidation/plan-matrix.json` contains:
  - 11 sources: 10 Studio snapshots and `devsuite-planning` at `4c2857d`;
  - the companion files as `dropped` with `approved:true` and the agreed reason.
- **Test.** `tests/test_plan_consolidation.py` imports `check_matrix`, `slug` and `anchors` from `tests.test_review_consolidation` and checks:
  - the shared hashes;
  - no package links;
  - the union, asserting that the only dropped ids are companion files;
  - the trigger routing;
  - that `route("lav en projektplan")` gives `devsuite-planning` and `project`.
- **Claude packager.** In `editors/claude/package.py`, ship `skills/<name>/modes/*.md` for every `LOCAL_WORKFLOWS` skill that has a modes directory, replacing the review-only line. In `test_portable.py`, add a check that the planning modes ship and match the hashes.
- **Version 0.4.0** in the same files as the 0.3.0 bump, and in the README release line. `submission/verification.json` records the new local test count and keeps the provider evidence marked as not re-run.

**Steps:**
- [ ] 1. Write the tests. Expected: they fail.
- [ ] 2. Implement the changes above.
- [ ] 3. Run `python -m unittest discover -s tests`, `python scripts/devsuite.py doctor`, `python -m unittest editors/claude/test_portable.py` and `node --test` in `editors/vscode`. Then build both packages. Expected: all pass, and the builds report version 0.4.0.
- [ ] 4. `git commit -m "feat: DevSuite 0.4.0 devsuite-planning absorbs Studio planning modes"`

### Task 4: Marketplace, locks and draft PRs

- [ ] **Sync.** Run `sync-snapshot.mjs` twice:
  - Studio: `a9c64ed..<Task 2 commit>` into `plugins/plugin-skill-studio`, version 0.6.0.
  - DevSuite: `4c2857d..<Task 3 commit>` into `plugins/winrecoveryproject-devsuite`, excluding `editors`, version 0.4.0.
- [ ] **Claude package.** Replace `claude-plugins/winrecoveryproject-devsuite` with the 0.4.0 zip, and lock `claudePackages` (`commit`, `version`, `zipSha256`, `files`).
- [ ] **Versions.** Update `.claude-plugin/marketplace.json` and the README version rows. Update the Claude workflow count sentence only if it changed. It stays at six workflows plus the start guide.
- [ ] **Verify.** Run `node validate-marketplace.mjs` (expected `"ok": true`), `node --test scripts/*.test.mjs` (expected 13/13), and all three Studio matrices.
- [ ] **Commit and push.** Commit, then push the three branches without force.
- [ ] **Draft PRs:**
  - Studio, against `feat/review-consolidation-0.5.0`.
  - DevSuite, against `feat/review-consolidation-0.3.0`.
  - Marketplace, against `feat/review-cluster`.

  Each body lists the verification results, the matrix counts, the approved companion drop, the merge order and the Gemini regeneration note.

## Unresolved externally observable decisions

1. **Drops other than the companion files.** If mapping finds a capability that cannot be covered, that drop needs the owner's approval before the matrix can pass.
2. **`goal` name collisions.** The word `goal` is common, so the re-point step uses reviewed matches only. Any ambiguous mention is listed in the PR.

## Execution handoff

- **Inline Execution** (available): `plugin-skill-studio:executing-plans`.
- **Subagent-Driven** (available): `plugin-skill-studio:subagent-driven-development`. Run Task 1 before Task 3, because Task 3 needs the shared files.
