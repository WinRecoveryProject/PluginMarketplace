# Review and Verification Cluster Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the review and verification skills into `devsuite-review` (DevSuite 0.3.0, Codex and Claude) and into a self-contained `studio-review` (Studio 0.5.0), so that every capability of the 12 source skills is preserved.

**Architecture:**
- Five mode files hold the shared review procedure: `code`, `request`, `receive`, `verify` and `decide`. They are byte-identical in Studio and DevSuite, and each package pins their sha256 in a test.
- Package-specific content lives only in each package's router `SKILL.md` and in DevSuite's own `release` and `gate` modes.
- A fine-grained capability matrix in each package proves the union.
- DevSuite's existing `capability-matrix.json` keeps its function-level contract.

**Tech Stack:**
- Studio: Node ≥20 ESM and `node --test`.
- DevSuite: Python 3 `unittest` and `scripts/devsuite.py doctor`.
- The Claude variant is built by `editors/claude/package.py`.
- Marketplace: `validate-marketplace.mjs` and `plugin-sources.lock.json`.

**Spec:** `docs/specs/2026-11-20-review-cluster-design.md`

## Global Constraints

- **Scope:**
  - Change only the owned source repositories (Zilvereyes-Plugin-Studio and WinRecoveryProject-DevSuite) and this marketplace repository.
  - Do not modify the third-party snapshots `plugins/codex-dev-workflows` and `plugins/codex-engineering-guardrails`.
- **Self-contained packages:**
  - Studio and DevSuite stay self-contained. Neither references the other at runtime.
  - Shared mode files contain no package-specific links. They must not link to `references/studio-policy.md` or `references/policy.md`.
- **Drops:** No capability is dropped without `"approved": true` and a reason, approved by the owner in chat or in the PR. No personal names, local paths or user names go in any matrix or doc.
- **Removed names, no aliases:**
  - Studio: `code-review`, `requesting-code-review`, `receiving-code-review`, `review-decision`, `verification-before-completion`, `verify-work`, `risk-review`.
  - DevSuite: `devsuite-quality`.
- **Delivery:**
  - Feature branches only. Never modify a local `main`.
  - One commit per task, no force-push.
  - Three draft PRs. Nothing is merged or marked ready without the owner's explicit yes.
- **Baselines measured 2026-11-20:**
  - Studio on `feat/lifecycle-consolidation-0.4.0`: `npm test` 227 pass, 1 skipped.
  - Marketplace `node validate-marketplace.mjs`: `"ok": true`.
  - DevSuite baselines are recorded in Task 0.

## Observed repository facts

- **DevSuite source:**
  - Repo: `WinRecoveryProject/WinRecoveryProject-DevSuite`.
  - `origin/main` = `1cedd8e` (0.2.7) is the locked marketplace commit. The local clone `main` is at `d6acf11` (0.2.2) and must not be touched.
- **DevSuite `scripts/devsuite.py doctor`:**
  - Requires exactly 14 `skills/*/SKILL.md` (line 73).
  - Validates every `references/capability-matrix.json` entry (fields `source, originalSkill, function, owner, implementation, tests, availability`). Each `owner` must be an existing skill, and each `tests` entry must be `file::method` with a `def method(` in that file.
  - Checks every Markdown link in skills, references and README.
- **DevSuite `runtime/routing.py`:**
  - `LOCAL_WORKFLOWS` lists 8 Claude workflows, including `devsuite-quality`.
  - `route(request)` maps lint and quality phrases to `devsuite-quality` (line 82) and review phrases to `devsuite-review` (line 84).
- **DevSuite `capability-matrix.json`:** 214 entries. 15 are owned by `devsuite-review`, from codex-security `assess-patch-risk` and codex-dev-workflows `code-review` and `pre-release-review`. 12 are owned by `devsuite-quality`, from guardrails `code-verification` and the original `quality-integration`.
- **DevSuite `editors/claude/package.py`:**
  - Copies only `skills/<name>/SKILL.md` for `LOCAL_WORKFLOWS`, plus `LOCAL_FILES`.
  - Applies `MARKDOWN_CHANGES` to `devsuite-review` with exact single-occurrence replacements. It raises when the source text changes, by design.
- **Studio (branch of #1):**
  - The 6 review skills have these sizes:

    | Skill | Lines |
    |---|---|
    | `code-review` | 84 |
    | `requesting-code-review` | 73 |
    | `receiving-code-review` | 199 |
    | `review-decision` | 10 |
    | `verification-before-completion` | 122 |
    | `verify-work` | 131 |

  - `risk-review` (10 lines) runs `node scripts/studio.mjs risk-scan`.
  - These 11 skills name them: `implement`, `implement-spec`, `tdd`, `engineering-workflow-guide`, `executing-plans`, `finishing-a-development-branch`, `communicate-clearly`, `automate-ui`, `solve-efficiently`, `research-systematically`, `execute-durably`.
  - Studio already has `consolidation-seed`, `consolidation-check`, `redactHome` and route rules of the form `[id, mode, pattern]`.

---

### Task 0: Workspaces and baselines

**Files:** none. This task only creates worktrees and branches.

- [ ] **Step 1: DevSuite worktree.**
  `git -C <devsuite-clone> fetch origin`, then `git -C <devsuite-clone> worktree add -b feat/review-consolidation-0.3.0 ../WinRecoveryProject-DevSuite-0.3.0 origin/main`.
  Expected: HEAD is `1cedd8e`.
- [ ] **Step 2: Studio worktree.**
  `git -C <studio-clone> worktree add -b feat/review-consolidation-0.5.0 ../Zilvereyes-Plugin-Studio-0.5.0 feat/lifecycle-consolidation-0.4.0`.
  Expected: HEAD is `88883d2`.
- [ ] **Step 3: Marketplace branch.** In this worktree, run `git switch -c feat/review-cluster` from `feat/studio-lifecycle-consolidation`.
- [ ] **Step 4: Record baselines.**
  - In DevSuite, run `python -m unittest discover -s tests -v`, `python scripts/devsuite.py doctor` and `python -m unittest editors/claude/test_portable.py -v`. Record the counts in the progress ledger.
  - In Studio, run `npm test` and `npm run validate`.
  - Expected: everything passes. If a DevSuite baseline fails, stop and report; never fix unrelated baseline failures inside this plan.

---

### Task 1: Studio — shared review modes and `studio-review`

**Files** (all paths in the Studio worktree):
- Create:
  - `skills/studio-review/SKILL.md`
  - `skills/studio-review/agents/openai.yaml`
  - `skills/studio-review/assets/*` (copied icons)
  - `skills/studio-review/modes/{code,request,receive,verify,decide}.md`
- Create:
  - `references/consolidation/review-sources.json`
  - `references/consolidation/review-matrix.json`
  - `references/consolidation/shared-review-modes.json`
- Test: `tests/review-consolidation.test.mjs`

**Interfaces:**
- Consumes: `seedMatrix`, `checkMatrix`, `redactHome` (`src/consolidation/check.mjs`) and `route()`.
- Produces:
  - `shared-review-modes.json` = `{schemaVersion:1, files:{"code.md":"<sha256>", "request.md":…, "receive.md":…, "verify.md":…, "decide.md":…}}`, hashed over the exact bytes with LF line endings.
  - `route(request)` returns `{selected:'studio-review', mode:'code'|'request'|'receive'|'verify'|'decide'}`.

**Content rules:**
- **Each shared mode file:**
  - Starts with `# <Mode> mode` and carries its source text verbatim under `<a id="src-<skill>-<heading-slug>">` anchors, generated the same way as in sub-project 1 (`gen-build.mjs`).
  - Contains every policy line as plain text without package links.
  - `verify.md` holds `verification-before-completion` then `verify-work`.
  - `code.md` holds `code-review`.
  - `request.md`, `receive.md` and `decide.md` hold one source each.
- **Any source link** to `../../references/...` is rewritten to a plain-text name, for example "the package policy". Each router `SKILL.md` links its own policy.
- **`studio-review/SKILL.md`:**
  - A router under 60 lines with anchors `mode-<mode>`, a link to `../../references/studio-policy.md`, and a description that covers every removed trigger.
  - `Do NOT use for evaluating skills or plugins (studio-quality) or creating them (studio-build).`

- [ ] **Step 1: Write failing tests** in `tests/review-consolidation.test.mjs`:
  1. Every file in `shared-review-modes.json` exists under `skills/studio-review/modes/` and hashes to the recorded value. Normalise CRLF to LF before hashing.
  2. No shared mode file contains `](../../` or `studio-policy` or `policy.md`.
  3. `checkMatrix(review-matrix.json,{repoRoot:packageRoot})` returns `ok:true, unmapped:0`.
  4. Every `trigger` entry whose target is `skills/studio-review/SKILL.md#mode-<m>` routes to `studio-review` with mode `m`.
- [ ] **Step 2:** Run `node --test tests/review-consolidation.test.mjs`.
  Expected: it fails because the files are missing.
- [ ] **Step 3: Seed the matrix.**
  - Write `review-sources.json` with sources `studio.<skill>` for the 6 skills.
  - Run `node scripts/studio.mjs consolidation-seed references/consolidation/review-sources.json --repo-root . --out references/consolidation/review-matrix.json`.
  - Map every entry to its mode anchor, router trigger anchor, `agents/openai.yaml` or asset file.
  - Write the mode files and router.
  - Add route rules before the `studio-quality` rules:
    - `code`: `/code review|review .{0,20}(branch|diff|pr|pull request|change)|merge-base/`
    - `request`: `/request(ing)? (a )?code review|dispatch.{0,20}reviewer/`
    - `receive`: `/review feedback|receiving code review|push back/`
    - `verify`: `/about to claim|verification command|verify (a )?deliver|double-check|completion claim/`
    - `decide`: `/review decision|minimal, targeted or deep/`
  - Iterate the patterns until test 4 passes. Never weaken the test.
  - Write `shared-review-modes.json` from the final files.
- [ ] **Step 4:** Run `node --test tests/review-consolidation.test.mjs`.
  Expected: all pass.
- [ ] **Step 5:** Run `npm test && npm run validate`.
  Expected: 227+ pass, and self-check ok. The old skills still exist in this task.
- [ ] **Step 6:** `git commit -m "feat(studio): add studio-review with shared review modes"`

---

### Task 2: Studio — risk mode, re-pointing, removal, 0.5.0

**Files** (all paths in the Studio worktree):
- Create: `skills/studio-quality/modes/risk.md`, which carries `risk-review` verbatim with anchors. Add a `mode-risk` row to `skills/studio-quality/SKILL.md`, a `risk` mode in the registry `modes` list, and route the existing `risk-review` pattern to `['studio-quality','risk', …]`.
- Modify: the 11 dependent skills. Replace each link or name of a removed skill with the `studio-review` mode file, for example `../verification-before-completion/SKILL.md` → `../studio-review/modes/verify.md`, and `requesting-code-review` → "`studio-review` request mode".
- Delete: `skills/{code-review,requesting-code-review,receiving-code-review,review-decision,verification-before-completion,verify-work,risk-review}/`. Before deleting, add the 7 sources to the matrix as git-derived snapshots, using the snapshot script from sub-project 1.
- Modify:
  - `references/integration-registry.json`: capabilities and source implementations repointed; version `0.5.0`.
  - `package.json`, `plugin.json`, `.codex-plugin/plugin.json`, `README.md`: version `0.5.0`.
  - `CHANGELOG.md`: a 0.5.0 table mapping each old name to its new skill and mode.
  - `tests/integration.test.mjs` and `tests/desktop-routing.test.mjs`, only where they expect a removed id.
- Test: extend `tests/review-consolidation.test.mjs` with:
  - the full `checkMatrix` including `risk-review`;
  - a check that no file under `skills/` names a removed skill;
  - a routing case `'risk scan this skill'` → `studio-quality`/`risk`.

- [ ] **Step 1:** Add the tests.
  Run: `node --test tests/review-consolidation.test.mjs`
  Expected: the removed-name check fails and lists the 11 files.
- [ ] **Step 2:** Implement the changes above.
- [ ] **Step 3:** Run `npm test`, `npm run validate` and `node scripts/studio.mjs consolidation-check references/consolidation/review-matrix.json --repo-root .`.
  Expected: all pass. The lifecycle matrix also still passes.
- [ ] **Step 4:** Run `python -B tools/package.py --out <scratch>`.
  Expected: `deterministic: true`, generic validation ok, version 0.5.0.
- [ ] **Step 5:** `git commit -m "feat(studio)!: merge review skills into studio-review (0.5.0)"`

---

### Task 3: DevSuite — `devsuite-review` absorbs `devsuite-quality` and Studio review

**Files** (all paths in the DevSuite worktree):
- Create: `skills/devsuite-review/modes/{code,request,receive,verify,decide}.md`, copied **byte-identically** from Studio Task 1 with LF line endings.
- Create: `skills/devsuite-review/modes/release.md` and `modes/gate.md`. These are DevSuite-only.
  - `release.md` carries the patch-risk and release-readiness paragraphs of the current `devsuite-review`, including the sentence "For provider PRs compare head/base with local HEAD, preserve edits and report the actual revision."
  - `gate.md` carries `devsuite-quality` verbatim. It also names the Linter, CodeRabbit and `powershell-quality-gate` plugins as optional when installed.
- Modify: `skills/devsuite-review/SKILL.md`. It becomes a router: it links `../../references/policy.md`, has a mode table, and keeps the original review paragraphs that are not in `release.md` as the intro of `code` mode coverage.
- Delete: `skills/devsuite-quality/`.
- Create:
  - `references/consolidation/shared-review-modes.json`, identical to Studio's.
  - `references/consolidation/review-matrix.json`, with sources: Studio's 6 review skills as hash snapshots, `devsuite-review` and `devsuite-quality` as snapshots of commit `1cedd8e`.
- Modify `runtime/routing.py`:
  - Remove `devsuite-quality` from `LOCAL_WORKFLOWS`.
  - The quality regex at line 82 now yields `skill = "devsuite-review"` and `mode = "gate"`.
  - Review phrases yield mode `code`, or `release` for `release.readiness|pre.release|patch.risk`.
  - `route()` returns a `mode` key, which is `None` for other skills.
- Modify `scripts/devsuite.py` line 73: expect 13 skills.
- Modify `references/capability-matrix.json`:
  - The 12 entries owned by `devsuite-quality` get `owner:"devsuite-review"` and `mode:"gate"`.
  - Add one entry per Studio source function (`source:"plugin-skill-studio"`, `originalSkill:<skill>`, owner `devsuite-review`, `mode`, `implementation:"owned workflow"`, `tests:["tests/test_review_consolidation.py::test_review_matrix_union"]`, `availability:"local"`).
- Modify: every other DevSuite file that names `devsuite-quality`. Find them with `rg -l devsuite-quality`; this includes the `devsuite` router skill, README and references.
- Test: `tests/test_review_consolidation.py` with:
  - `test_shared_modes_match_hashes`
  - `test_shared_modes_have_no_package_links`
  - `test_review_matrix_union`, which is a Python port of the `checkMatrix` rules:
    - every entry is `covered` with a resolvable file and anchor, or `merged-with` a covered id, or `dropped` with `approved:true` and a reason;
    - no duplicate ids;
    - every snapshot file is represented.
  - `test_quality_routes_to_review_gate`: for example `route("run the lint gate")` gives `devsuite-review` and `gate`.
  - `test_removed_triggers_route`: every `trigger` entry in `review-matrix.json` passes through `route()` and must give `devsuite-review` with the mode named by its target anchor. Misses are fixed by widening the patterns in `runtime/routing.py`, never by weakening the test.
  - `test_removed_skill_not_named`: `devsuite-quality` appears nowhere under `skills/`, `references/` or `runtime/`, except in the matrices and the changelog.

- [ ] **Step 1:** Add the tests.
  Run: `python -m unittest tests.test_review_consolidation -v`
  Expected: it fails because the files are missing.
- [ ] **Step 2:** Implement the changes above. Build the fine-grained matrix with Studio's `consolidation-seed`, run from the Studio worktree against a temporary copy. Commit only the resulting JSON. The matrix uses package-relative paths.
- [ ] **Step 3:** Run `python -m unittest discover -s tests -v` and `python scripts/devsuite.py doctor`.
  Expected: everything passes, and doctor reports `PASS`.
- [ ] **Step 4:** `git commit -m "feat!: devsuite-review absorbs devsuite-quality and Studio review modes"`

---

### Task 4: DevSuite — Claude variant and 0.3.0

**Files** (all paths in the DevSuite worktree):
- Modify `editors/claude/package.py`:
  - Add `skills/devsuite-review/modes/*.md` to the packaged files.
  - Move the `devsuite-review` `MARKDOWN_CHANGES` entry so it targets `skills/devsuite-review/modes/release.md`, where the provider-PR sentence now lives. Apply the change through a new `local_mode(name, mode)` helper that reuses the single-occurrence guard.
  - Shared mode files are never changed by the Claude adaptation.
- Modify: `editors/claude/SKILL.md` and `editors/claude/README.md`, wherever they list `devsuite-quality`.
- Modify: `.codex-plugin/plugin.json` and `editors/claude/.claude-plugin/plugin.json`, version `0.3.0`, plus README and CHANGELOG (or the release notes file the repo uses). Use `rg -l "0\.2\.7"` to find every version string the doctor or tests check.
- Test: `editors/claude/test_portable.py`. Add a test that the built ZIP contains every `skills/devsuite-review/modes/*.md`, that the shared files' bytes match `shared-review-modes.json`, and that no `devsuite-quality` path exists.

- [ ] **Step 1:** Add the portable test.
  Run: `python -m unittest editors/claude/test_portable.py -v`
  Expected: the new assertion fails.
- [ ] **Step 2:** Implement the changes above.
- [ ] **Step 3:** Run all DevSuite tests, doctor, `python editors/claude/package.py --out <scratch>/devsuite-claude-0.3.0.zip` and `python scripts/package.py` with its documented arguments.
  Expected: all pass, and both packages report 0.3.0.
- [ ] **Step 4:** `git commit -m "feat: DevSuite 0.3.0 with consolidated review for Codex and Claude"`

---

### Task 5: Marketplace snapshots, locks and draft PRs

**Files** (marketplace branch `feat/review-cluster`):
- Replace `plugins/plugin-skill-studio/` with the Studio worktree's tracked files at the Task 2 commit.
- Replace `plugins/winrecoveryproject-devsuite/` with the DevSuite worktree's files, using the same file-set rule as the current lock entry: the lock's `files` keys define what the snapshot contains. Recompute the set from the new tree and list added and removed paths in the PR.
- Replace `claude-plugins/winrecoveryproject-devsuite/` with the extracted Task 4 ZIP.
- Modify:
  - `plugin-sources.lock.json`: Studio `commit`, `version` and `files`; DevSuite `commit`, `version` and `files`; `claudePackages.winrecoveryproject-devsuite` `commit`, `version`, `zipSha256` and `files`.
  - `.agents/plugins/marketplace.json` and `.claude-plugin/marketplace.json`, wherever versions are recorded.
  - Root `README.md` version rows.

- [ ] **Step 1:** Run `node validate-marketplace.mjs` before the lock update.
  Expected: fails only with `plugin-skill-studio:` and `winrecoveryproject-devsuite:` SHA256 or file-set failures.
- [ ] **Step 2:** Update the locks and versions.
  Run: `node validate-marketplace.mjs && node --test scripts/*.test.mjs`
  Expected: `"ok": true`, 13/13.
- [ ] **Step 3:** Commit in each repo.
- [ ] **Step 4:** Push the three feature branches without force and open three draft PRs:
  - **DevSuite** against `main`.
  - **Studio** against `feat/lifecycle-consolidation-0.4.0`, noting that it must follow #1.
  - **Marketplace** against `feat/studio-lifecycle-consolidation`, noting that it follows WinRecoveryProject/PluginMarketplace#3.

  Each PR body lists the verification results, the matrix counts, any `dropped` ids awaiting approval, and the Gemini regeneration note (`node scripts/build-gemini-skills.mjs` after merge).

---

## Unresolved externally observable decisions

1. **Drops found while mapping.** Any `dropped` entry in Tasks 1–3 needs the owner's approval before its matrix check can pass.
2. **DevSuite `route()` gains a `mode` key.** It is additive. If any external consumer of the DevSuite route JSON requires an exact key set, they must be told. No such consumer is known in this repository.
3. **The PR base for Studio.** It is planned against #1's branch. If #1 is merged first, rebase onto `main` by creating a new branch, not by force-pushing.

## Execution handoff

- **Inline Execution** (available): `plugin-skill-studio:executing-plans`, task by task, stopping at blockers.
- **Subagent-Driven** (available): `plugin-skill-studio:subagent-driven-development`. Tasks 1–2 (Studio) and Task 3 (DevSuite) share only the five shared mode files, so run Task 1 first. Task 4 needs Task 3, and Task 5 needs all of them.
