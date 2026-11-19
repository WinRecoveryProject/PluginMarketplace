# Plugin/Skill Lifecycle Consolidation Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 20 Plugin-Skill-Studio lifecycle skills and the 5-skill `plugin-eval` plugin with two skills, `studio-build` and `studio-quality`, which together keep every capability of the skills they replace. The `improve` mode gains an autoresearch keep/discard loop.

**Architecture:** A capability matrix records every atomic capability of every source skill and where it now lives. A deterministic `consolidation-check` command fails when anything is unmapped, and the test suite runs that check. Each new skill is a short router `SKILL.md` plus one `modes/<mode>.md` file per mode. Deterministic steps stay in `scripts/studio.mjs` and `src/`. The autoresearch loop's judge is code in `src/eval/autoresearch.mjs` and reuses the existing `analyze`, `runBenchmark` and `compareReports`.

**Tech Stack:** Node ≥20 ESM using built-ins only, and `node --test`. Skills and docs are Markdown and JSON. There is no npm install and no network.

**Spec:** `docs/specs/2026-11-19-lifecycle-consolidation-design.md`

## Global Constraints

- **Scope:** Change only this repository: `plugins/`, `claude-plugins/`, the marketplace files and `docs/`. Third-party and user-level skills may be cited as sources but are never modified.
- **No silent drops:** No capability is dropped without `"approved": true` and a `reason` in the matrix. The owner gives that approval in the PR conversation. No personal names, local paths or user names go in the matrix, receipts or docs.
- **Old skill names:** These are removed, with no aliases: `create-plugin`, `create-skill`, `update-plugin`, `plugin-autopilot`, `import-plugins`, `import-gpt`, `install-skill`, `release-workflow`, `portfolio`, `catalog`, `skill-conductor`, `plugin-skill-studio`, `skill-eval`, `plugin-eval`, `skill-review`, `skill-walkthrough`, `skillquiver-doctor`, `evidence-matrix`, `metric-pack`, `improve-skill`.
- **Autoresearch rules:**
  - Work only on a candidate copy.
  - The target must be an editable source, never an install cache.
  - Web research happens only when the user opts in for the run, and no subagents are used.
  - The verdict UNKNOWN is never reported as a pass.
  - The source skill changes only after the user approves the combined diff.
- **Must keep passing:** `npm test` in `plugins/plugin-skill-studio` (baseline 179/179 on 2026-11-19), `npm run validate` (Studio self-check), and `node validate-marketplace.mjs` at the repo root (baseline `"ok": true`).
- **Delivery:** One commit per task on a feature branch, and a draft PR at the end. Nothing is merged and no draft is marked ready without the owner's explicit yes. No force-push.

## Observed repository facts

All paths are relative to `plugins/plugin-skill-studio/` unless stated otherwise.

- **Registry** (`references/integration-registry.json`): keys `sources[]`, `capabilities[]` and `baseline`.
  - Each `capabilities[]` entry is `{id, entrypoint, sourceIds, description}`.
  - Each `sources[].skills[]` entry is `{sourceSkill, sourceFile, implementation, mode, acceptanceTest}`.
- **Router and self-check** (`src/registry.mjs`):
  - `route(request)` matches regex `rules` and falls back to `'plugin-skill-studio'`. It returns `{schemaVersion, request, selected, entrypoint, reason, externalDependencies}`.
  - `selfCheck()` requires that every capability's `SKILL.md` contains `name: <id>`, that every `sources[].skills[].implementation` exists, and that every local link resolves. It also checks that versions match across `package.json`, `plugin.json`, `.codex-plugin/plugin.json` and the registry.
- **CLI** (`scripts/studio.mjs`): a `switch` on the command name. It contains `skill-eval|plugin-eval`, `benchmark-init`, `compare-reports` and others.
- **Static eval** (`src/eval/static.mjs`):
  - `scoringVersion='pss-eval-2'`.
  - A report carries `valid`, `readiness` (`BLOCKED|INCOMPLETE|STATIC_READY`), `score`, and `findings[]` with `severity` of `error|warning|info`.
- **Benchmark** (`src/eval/benchmark.mjs`):
  - `runBenchmark()` returns `status` (`PASS|FAIL|INCOMPLETE|BLOCKED`), `runs[]` with a per-run `status`, and `behavior.configFingerprint`.
- **`compareReports(before, after)`** (`src/eval/index.mjs`):
  - Returns `{scoreDelta, added, resolved, behaviorComparable}`.
  - Throws when the scoring versions differ.
- **Tests that name skills which will be removed:**
  - `tests/integration.test.mjs:22`: routing cases for `skill-eval`, `plugin-eval`, `catalog` and `evidence-matrix`.
  - `tests/integration.test.mjs:26`: `plugin-autopilot`.
  - `tests/integration.test.mjs:33`: `skill-eval skills/skill-eval` used as an eval target.
  - `tests/desktop-routing.test.mjs:6`: `plugin-eval`, `create-plugin` and `update-plugin`.
- **The `plugin-eval` plugin** (`plugins/plugin-eval/`, repo root):
  - Has its own code: `src/{cli.js,core,evaluators,lib,renderers}`, `scripts/plugin-eval.js` and `tests/plugin-eval.test.js`.
  - Its fixtures are `coverage-samples`, `metric-pack`, `minimal-plugin` and `minimal-skill`.
  - It is registered at `.agents/plugins/marketplace.json:412` and `docs/catalog-counterparts.json:68`.
  - It is not in `plugin-sources.lock.json`.
- **User-level source:** `~/.claude/skills/skill-autoresearch/` (created 2026-11-19, phases 1–2 only). Its judge counts passes on locked test tasks: each fixture has a command check, the lock is a sha256 file, and tasks that are too easy (`exit 0` before any change) are discarded. It is cited as a source in the matrix and is never modified.

## File map

| File | Responsibility | State |
|---|---|---|
| `src/consolidation/check.mjs` | `seedMatrix()`, `checkMatrix()` | create |
| `references/consolidation/lifecycle-matrix.json` | the capability matrix | create |
| `src/eval/autoresearch.mjs` | `startRun()`, `judgeExperiment()`, `reportRun()`, `resumeRun()` | create |
| `scripts/studio.mjs` | CLI cases `consolidation-seed`, `consolidation-check`, `autoresearch-start`, `autoresearch-judge`, `autoresearch-report` | modify |
| `src/registry.mjs` | `rules` gain a mode; `route()` returns `mode`; fallback becomes `studio-build` | modify |
| `skills/studio-quality/{SKILL.md, agents/openai.yaml, modes/*.md}` | quality skill | create |
| `skills/studio-build/{SKILL.md, agents/openai.yaml, modes/*.md}` | build skill | create |
| `skills/<20 removed>/` | old skills | delete (Tasks 4 and 5) |
| `references/integration-registry.json` | capabilities, implementations, version, new `auto-research` source | modify |
| `fixtures/plugin-eval/*` | fixtures moved from the `plugin-eval` plugin when a test uses them | create |
| `tests/consolidation.test.mjs`, `tests/autoresearch.test.mjs`, `tests/consolidation-triggers.test.mjs` | new tests | create |
| `tests/integration.test.mjs`, `tests/desktop-routing.test.mjs` | update expected routes | modify |
| repo root `.agents/plugins/marketplace.json`, `docs/catalog-counterparts.json`, `validate-marketplace.mjs` | retire `plugin-eval` | modify |
| `README.md`, `CHANGELOG.md` (Studio) | old→new mapping table, 0.4.0 notes | modify / create if absent |

---

### Task 1: Capability matrix tooling (`consolidation-seed`, `consolidation-check`)

**Files:**
- Create: `src/consolidation/check.mjs`
- Modify: `scripts/studio.mjs` (two new `case` blocks next to `compare-reports`)
- Test: `tests/consolidation.test.mjs`

**Interfaces:**
- Produces: `seedMatrix(sources: Array<{id:string, root:string, files?:string[]}>) → Promise<Matrix>`
- Produces: `checkMatrix(matrix: Matrix, {repoRoot:string}) → Promise<{ok:boolean, errors:string[], counts:{covered,merged,dropped,total}}>`

The `Matrix` shape:

```js
{
  schemaVersion: 1,
  sources: [{id, root, files: string[]}],
  entries: [{
    id,                 // e.g. "plugin-eval.evaluate-skill.L14"
    source,             // e.g. "plugin-eval/skills/evaluate-skill/SKILL.md:14"
    kind,               // 'instruction' | 'trigger' | 'file' | 'policy'
    text,
    target,             // "skills/studio-quality/modes/eval.md#held-out-triggers" | null
    status,             // 'covered' | 'merged-with:<id>' | 'dropped' | 'unmapped'
    approved?, reason?
  }]
}
```

- CLI: `node scripts/studio.mjs consolidation-seed <sources.json> --out <matrix.json>`. Exits 0.
- CLI: `node scripts/studio.mjs consolidation-check <matrix.json> --repo-root <dir>`. Exits 0 when `ok`, 1 otherwise. Prints JSON.

- [ ] **Step 1: Add the focused failing tests** in `tests/consolidation.test.mjs`. Build a temporary repo in `os.tmpdir()`. Each case uses its own `fs.mkdtemp` directory and removes it in `t.after`.
  1. `seedMatrix` on a source holding `skills/a/SKILL.md` produces:
     - one `trigger` entry per sentence of the frontmatter `description`;
     - one `instruction` entry per non-empty bullet, numbered line or paragraph after the frontmatter;
     - one `file` entry per non-`SKILL.md` file under the skill;
     - one `policy` entry per top-level key of `agents/openai.yaml`.
     All entries have `status:'unmapped'` and `target:null`. An `id` has the form `<sourceId>.<skill>.L<line>`; a `file` entry's `id` ends in `.file:<relpath>`.
  2. `checkMatrix` returns ok when every entry is `covered` and its target file contains the anchor. An anchor matches a Markdown heading slugged GitHub-style, or an explicit `<a id="...">`.
  3. Each of these cases fails, with one error string naming the entry id:
     - (a) `status:'unmapped'`;
     - (b) `covered` with a target file that does not exist;
     - (c) a target file without the anchor;
     - (d) `dropped` without `approved:true` or with an empty `reason`;
     - (e) `merged-with:<id>` pointing to a non-existent id or to an entry that is not itself `covered`;
     - (f) a file present under a `sources[].root` that has no entry (the source changed after seeding);
     - (g) two entries with the same id.
  4. `counts` match the statuses.
  5. Running the CLI `consolidation-check` on a failing matrix gives exit code 1, and stdout parses as JSON with `ok:false`.

- [ ] **Step 2: Verify the relevant failure.**
  Run: `node --test tests/consolidation.test.mjs`
  Expected: fails with `ERR_MODULE_NOT_FOUND` for `src/consolidation/check.mjs`.

- [ ] **Step 3: Implement.**
  - Parse frontmatter with the existing frontmatter parsing used in `src/eval/static.mjs`. Reuse it by export if it is not exported yet; otherwise use a minimal local `---`-block parser that reads `name` and `description` only.
  - Slug rule: lowercase, strip characters other than `[a-z0-9 -]`, and turn spaces into `-`.
  - Resolve paths against `repoRoot`. Reject any `target` or `root` that escapes `repoRoot`, with the error `escapes repository: <id>`.
  - Line endings: normalise `\r\n` before parsing.

- [ ] **Step 4: Verify the focused pass.**
  Run: `node --test tests/consolidation.test.mjs`
  Expected: all cases pass.

- [ ] **Step 5: Integration check.**
  Run: `npm test && npm run validate`
  Expected: 179 existing tests plus the new ones pass, and self-check reports `ok:true`.

- [ ] **Step 6: Commit.**
  `git add src/consolidation/check.mjs scripts/studio.mjs tests/consolidation.test.mjs`
  `git commit -m "feat(studio): add capability matrix seed and check"`

---

### Task 2: Seed and fully map the lifecycle matrix (data only)

**Files:**
- Create: `references/consolidation/lifecycle-sources.json`. Source roots, all relative to the repo root:
  - the 20 Studio skills: `plugins/plugin-skill-studio/skills/<name>`;
  - the `plugin-eval` plugin root: `plugins/plugin-eval`, including `src/`, `scripts/`, `fixtures/` and `tests/`;
  - a snapshot of the user-level `skill-autoresearch`, copied into `references/consolidation/snapshots/skill-autoresearch/` (`SKILL.md` and `references/tasks-format.md`) together with their sha256. Only the snapshot is referenced, never the home-directory path.
- Create: `references/consolidation/lifecycle-matrix.json`
- Test: `tests/consolidation.test.mjs`. Add one case that loads the real matrix and asserts every entry has a status other than `unmapped` (targets are verified in Tasks 4 and 5).

**Interfaces:**
- Consumes: `seedMatrix`, `checkMatrix` (Task 1)
- Produces: `references/consolidation/lifecycle-matrix.json`, where every entry has a planned `target` in `skills/studio-build/modes/*.md` or `skills/studio-quality/modes/*.md`

- [ ] **Step 1:** Run `node scripts/studio.mjs consolidation-seed references/consolidation/lifecycle-sources.json --out references/consolidation/lifecycle-matrix.json`.
- [ ] **Step 2:** Add the real-matrix test.
  Run: `node --test tests/consolidation.test.mjs`
  Expected: it fails and lists the unmapped ids.
- [ ] **Step 3: Map every entry.** Fill in `target` and `status` using this mode allocation:
  - **`studio-build` modes**, under `skills/studio-build/modes/`:
    - `create-plugin.md` ← create-plugin
    - `create-skill.md` ← create-skill
    - `update.md` ← update-plugin
    - `import.md` ← import-plugins, import-gpt
    - `install.md` ← install-skill
    - `release.md` ← release-workflow
    - `portfolio.md` ← portfolio
    - `catalog.md` ← catalog
    - `autopilot.md` ← plugin-autopilot
    - `lifecycle.md` ← skill-conductor
    - the router `SKILL.md` ← the plugin-skill-studio router
  - **`studio-quality` modes**, under `skills/studio-quality/modes/`:
    - `eval.md` ← skill-eval, plugin-eval (Studio), and plugin-eval's plugin-eval, evaluate-plugin and evaluate-skill
    - `metric-pack.md` ← metric-pack, metric-pack-designer
    - `review.md` ← skill-review
    - `walkthrough.md` ← skill-walkthrough
    - `doctor.md` ← skillquiver-doctor
    - `evidence.md` ← evidence-matrix
    - `improve.md` ← improve-skill (both copies), the skill-autoresearch snapshot, and the upstream auto-research loop
  - **Code files of `plugin-eval`:**
    - Each evaluator or renderer whose behaviour Studio's `src/eval` already implements is `covered`. Its target is `skills/studio-quality/modes/eval.md#engine-coverage`, a table that names the Studio function that replaces it.
    - A behaviour with no Studio equivalent gets `target: "skills/studio-quality/modes/eval.md#not-yet-ported"` with `status:'covered'`, and it is listed there explicitly. Porting it is out of scope here, but it must stay visible.
    - Fixtures that a moved test uses get `target: "fixtures/plugin-eval/<name>"`, and `checkMatrix` accepts a directory target without an anchor.
  - **Duplicates:** wording that repeats across sources becomes `merged-with:<id of the most precise wording>`.
  - **Drops:** an entry that should be dropped is set to `dropped` with a `reason` and no `approved` field. Those ids are listed in the PR description for the owner's decision.
- [ ] **Step 4:** Run `node --test tests/consolidation.test.mjs`.
  Expected: the "no unmapped" case passes. The full `consolidation-check` still fails on missing targets until Tasks 4 and 5 create the mode files.
- [ ] **Step 5:** Run `npm test`.
  Expected: all tests pass. The full `checkMatrix` on the real matrix is asserted first in Task 4 (quality targets) and fully in Task 5.
- [ ] **Step 6:** `git commit -m "docs(studio): map lifecycle capability matrix"`

---

### Task 3: Autoresearch engine (`autoresearch-start | -judge | -report`)

**Files:**
- Create: `src/eval/autoresearch.mjs`
- Modify: `scripts/studio.mjs` (three `case` blocks)
- Test: `tests/autoresearch.test.mjs`

**Interfaces:**
- Consumes: `analyze(target, options)`, `runBenchmark(target, options)` and `compareReports(before, after)` from `src/eval/index.mjs`
- Produces:
  - `startRun(skillRoot, {configPath?, runsRoot?}) → Promise<{runDir, candidateDir, baseline}>`
  - `judgeExperiment(runDir, {description}) → Promise<{n, verdict:'KEEP'|'DISCARD'|'UNKNOWN', reasons:string[], receiptPath, diffPath}>`
  - `reportRun(runDir) → Promise<{experiments, kept, discarded, unknown, combinedDiffPath, before, after}>`
  - `resumeRun(runDir) → Promise<{lastKeptN, nextN}>`

- CLI forms:
  - `autoresearch-start <skill-root> [--config <bench.json>] [--runs-root <dir>]`
  - `autoresearch-judge <run-dir> --description "<text>"`
  - `autoresearch-report <run-dir>`

  Each prints JSON. Exit codes: start 0 or 1; judge 0 for KEEP, 3 for DISCARD, 2 for UNKNOWN, 1 for an error; report 0.

**Behaviour:**
- **`startRun`**
  - Refuses a `skillRoot` whose resolved path contains a path segment `.claude/plugins/` or `AppData/Roaming/Claude/rpm/`, or matches `plugins/cache`, with the error `not an editable source: install cache`. Separators are normalised to `/` before matching.
  - Refuses when `SKILL.md` is missing.
  - The default `runsRoot` is `path.join(path.dirname(skillRoot), '.autoresearch')`. The run directory is `<runsRoot>/<YYYYMMDD-HHMMSS>-<skill-name>/`.
  - Copies `skillRoot` to `candidate/` and to `kept/`, the last-KEEP snapshot.
  - Writes `baseline.json`: `{static: analyze(...), benchmark: configPath ? runBenchmark(...) : null, configPath, sourceRoot, sourceHash}`. `sourceHash` is the sha256 of the sorted relative paths and file bytes.
- **`judgeExperiment`**
  - `n` is the next 3-digit number after the existing receipts.
  - Runs `analyze(candidateDir)` and `compareReports(lastKeptStatic, candidateStatic)`.
  - The change is **blocked** when `candidateStatic.valid === false` or `added` contains a finding with `severity==='error'`.
  - If a benchmark config exists, it runs `runBenchmark(candidateDir, {configPath})`. **Benchmark-worse** means the candidate's count of PASS runs is below the last kept count, or the candidate's `status` is `INCOMPLETE` or `BLOCKED`.
  - **Verdict:**
    - blocked or benchmark-worse → `DISCARD`;
    - no config → `UNKNOWN`;
    - otherwise → `KEEP`.
  - **On KEEP:** copy `candidate/` to `kept/` and store the static and benchmark results as the new last-kept reports.
  - **On DISCARD:** restore `candidate/` from `kept/`, removing files that are not in `kept/`.
  - **On UNKNOWN:** `candidate/` and `kept/` stay as they are. The next experiment starts from the current candidate, so changes stack and are flagged in the report as `unverified-stack`.
  - Writes `receipts/NNN.json` with `{n, description, verdict, reasons, staticCompare, benchmarkSummary, candidateHash, keptHash, at}` and `receipts/NNN.diff`, a unified diff of `kept/` before → `candidate/`. The diff is produced by a small line-based LCS diff in Node with no external `diff` binary, and per file it reports `binary changed` for non-UTF-8 files.
- **`reportRun`**
  - Writes `combined.diff`, comparing the source at `baseline.sourceRoot` with `kept/`, and `report.json`.
  - If the source's current hash differs from `baseline.sourceHash`, it adds the warning `source changed since start`.
  - It never writes to `sourceRoot`.
- **`resumeRun`**
  - Reads `receipts/*.json`. `lastKeptN` is the highest `n` with verdict KEEP, or 0.
  - Verifies `kept/` against that receipt's `keptHash`. On a mismatch it throws `kept snapshot does not match receipt <n>`.

- [ ] **Step 1: Add the failing tests.** Each test makes a temporary editable skill (`SKILL.md` with valid frontmatter) under `fs.mkdtemp`.
  1. `startRun` on a path under `<tmp>/.claude/plugins/x/skills/s` throws `not an editable source: install cache`.
  2. `startRun` creates `candidate/`, `kept/` and `baseline.json`, and the source is byte-identical before and after.
  3. Without a config, appending a harmless line to `candidate/SKILL.md` gives verdict `UNKNOWN` and exit code 2 through the CLI.
  4. Deleting the frontmatter `name` in the candidate (which makes `valid:false`) gives `DISCARD`, and `candidate/` is restored byte-for-byte to `kept/`.
  5. With a benchmark config, `runBenchmark` is injected through an optional `{benchmarkRunner}` parameter so the tests need no Codex binary. A stubbed runner returning 2/2 PASS for baseline and 2/2 for the candidate gives `KEEP`, and `kept/` equals the candidate. A runner returning 1/2 gives `DISCARD`.
  6. After a KEEP, editing `kept/` by hand makes `resumeRun` throw `kept snapshot does not match receipt 001`.
  7. `reportRun` writes `combined.diff` that contains the kept change, and it does not modify the source.
- [ ] **Step 2:** Run `node --test tests/autoresearch.test.mjs`.
  Expected: `ERR_MODULE_NOT_FOUND`.
- [ ] **Step 3:** Implement as specified. `judgeExperiment` and `startRun` accept the optional `{analyzer, benchmarkRunner}` parameters, which default to the real ones from `src/eval/index.mjs`.
- [ ] **Step 4:** Run `node --test tests/autoresearch.test.mjs`.
  Expected: all 7 pass.
- [ ] **Step 5:** Run `npm test && npm run validate`.
  Expected: all pass.
- [ ] **Step 6:** `git commit -m "feat(studio): add autoresearch start/judge/report engine"`

---

### Task 4: `studio-quality` skill; remove the 8 quality skills

**Files:**
- Create: `skills/studio-quality/SKILL.md`
- Create: `skills/studio-quality/agents/openai.yaml`, holding the union of the removed skills' interface fields. Its `display_name` is `Studio Quality`; icons are reused from `skill-eval`.
- Create: `skills/studio-quality/modes/{eval,metric-pack,review,walkthrough,doctor,evidence,improve}.md`
- Delete: `skills/{skill-eval,plugin-eval,skill-review,skill-walkthrough,skillquiver-doctor,evidence-matrix,metric-pack,improve-skill}/`. Assets that other skills reference move to `skills/studio-quality/assets/` first.
- Modify:
  - `references/integration-registry.json`: one `studio-quality` capability replaces the 8, and every `sources[].skills[].implementation` pointing at a removed path is repointed to `skills/studio-quality/SKILL.md`;
  - `src/registry.mjs` `rules`;
  - `tests/integration.test.mjs:22` and `:33`;
  - `tests/desktop-routing.test.mjs:6`.
- Test: `tests/consolidation-triggers.test.mjs` (new)

**Interfaces:**
- Consumes: the matrix (Task 2), `autoresearch-*` CLI (Task 3), `route()`
- Produces: `route(request) → {..., selected:'studio-quality', mode:'eval'|'metric-pack'|'review'|'walkthrough'|'doctor'|'evidence'|'improve'}`. The `mode` field is added to the return object and is `null` for capabilities without modes.

**Content rules:**
- **The router `SKILL.md`:**
  - Has frontmatter `name: studio-quality` and a `description` that covers every `trigger` entry mapped to this skill: evaluate, test triggers, benchmark, compare revisions, budget, review agent instructions, walkthrough, doctor, evidence matrix, metric pack, improve, and autoresearch.
  - Its body holds the policy link `[Studio policy](../../references/studio-policy.md)`, a mode table (mode → when to use it → link to `modes/<mode>.md`), and one rule: read only the selected mode file.
  - It stays under 60 lines.
- **Mode files:**
  - Every `covered` matrix entry with this skill as target appears under its anchor heading.
  - `improve.md` contains the loop: `autoresearch-start` → propose (local by default, web only when opted in for the run, no subagents, ranked by Impact × Confidence ÷ Complexity) → one change per experiment → `autoresearch-judge` → `autoresearch-report` → apply to the source only after the user approves `combined.diff`.
  - `improve.md` also adds the skill-autoresearch snapshot's capabilities as an optional benchmark-authoring path: locked tasks with command checks, discarding a too-easy task when its check exits 0 before any change, and treating a lock mismatch as a stop condition. It maps them onto `benchmark-init` plus a sha256 lock of the config and fixtures.

- [ ] **Step 1: Add the failing tests.**
  - `consolidation-triggers.test.mjs`: for every matrix entry with `kind:'trigger'` whose target is in `skills/studio-quality/`, `route(entry.text)` must return `selected:'studio-quality'` and the `mode` named by the target file's basename.
  - Update `integration.test.mjs:22` to expect `studio-quality` for 'Vurder denne skill', 'Analyze this plugin' and 'evidence matrix'.
  - Update `integration.test.mjs:33` to evaluate `skills/studio-quality`.
  - Update `desktop-routing.test.mjs:6` to expect `studio-quality` for 'Vurder dette Desktop-plugin'.
  - Add to `tests/consolidation.test.mjs`: `checkMatrix` passes for every entry whose target is under `skills/studio-quality/`.
- [ ] **Step 2:** Run `npm test`.
  Expected: the new and updated cases fail with `selected: 'skill-eval'` vs `'studio-quality'` and with missing target files.
- [ ] **Step 3: Implement.**
  - Write the skill and mode files, update `rules` (each rule becomes `[id, mode, pattern]`), make `route()` return `mode`, update the registry, and delete the 8 directories.
  - Trigger misses are fixed by widening the description and the rules. Tests are never weakened.
- [ ] **Step 4:** Run `npm test`.
  Expected: everything passes, including the trigger cases for every studio-quality trigger.
- [ ] **Step 5:** Run `npm run validate` and `node scripts/studio.mjs skill-eval skills/studio-quality --format json`.
  Expected: self-check `ok:true`, and skill-eval `valid:true` with no `error` findings.
- [ ] **Step 6:** `git commit -m "feat(studio)!: merge quality skills into studio-quality"`

---

### Task 5: `studio-build` skill; remove the 12 build skills

**Files:**
- Create: `skills/studio-build/SKILL.md`
- Create: `skills/studio-build/agents/openai.yaml`
- Create: `skills/studio-build/modes/{create-plugin,create-skill,update,import,install,release,portfolio,catalog,autopilot,lifecycle}.md`
- Delete: `skills/{create-plugin,create-skill,update-plugin,plugin-autopilot,import-plugins,import-gpt,install-skill,release-workflow,portfolio,catalog,skill-conductor,plugin-skill-studio}/`
- Modify:
  - `references/integration-registry.json`;
  - `src/registry.mjs`: the rules, and the fallback changes from `'plugin-skill-studio'` to `'studio-build'` with `mode:null`;
  - `tests/integration.test.mjs:22` (catalog) and `:26` (plugin-autopilot existence → `skills/studio-build/modes/autopilot.md` exists);
  - `tests/desktop-routing.test.mjs:6` (create-plugin, update-plugin).
- Test: `tests/consolidation-triggers.test.mjs` (extend to studio-build)

**Interfaces:**
- Consumes: `route()` with `mode` (Task 4), the matrix (Task 2)
- Produces: `route(request) → {selected:'studio-build', mode:'create-plugin'|'create-skill'|'update'|'import'|'install'|'release'|'portfolio'|'catalog'|'autopilot'|'lifecycle'|null}`

**Content rules:**
- The router `SKILL.md` follows the same structure as in Task 4 and stays under 60 lines.
- `autopilot.md` carries the full content of the 272-line `plugin-autopilot`, split by heading so each matrix anchor resolves. Content is never summarised away. Wording may be shortened only when the matrix marks the shorter form `merged-with` the original.
- `lifecycle.md` carries skill-conductor's lifecycle discipline. The other build modes link to it instead of repeating it.

- [ ] **Step 1: Add the failing tests.** Extend the trigger test to the studio-build targets. Update `integration.test.mjs:22` and `:26` and `desktop-routing.test.mjs:6` to expect `studio-build` with modes `catalog`, `create-plugin` and `update`. Add to `tests/consolidation.test.mjs`: the whole matrix passes `checkMatrix`.
- [ ] **Step 2:** Run `npm test`.
  Expected: the cases expecting `studio-build` fail.
- [ ] **Step 3:** Implement as for Task 4.
- [ ] **Step 4:** Run `npm test`.
  Expected: everything passes, including `checkMatrix` on the full matrix (`ok:true`, `unmapped:0`).
- [ ] **Step 5:** Run `npm run validate`, `node scripts/studio.mjs skill-eval skills/studio-build --format json` and `node scripts/studio.mjs consolidation-check references/consolidation/lifecycle-matrix.json --repo-root ../..`.
  Expected: all exit 0.
- [ ] **Step 6:** `git commit -m "feat(studio)!: merge build skills into studio-build"`

---

### Task 6: Retire the `plugin-eval` plugin from the catalog

**Files:**
- Modify (repo root): `.agents/plugins/marketplace.json` (remove the entry at :412), `docs/catalog-counterparts.json` (remove the `plugin-eval@winrecoveryproject-digital` row at :68), and `validate-marketplace.mjs`. In the validator, add `check(!names.includes('plugin-eval'),'plugin-eval is absorbed into plugin-skill-studio')`, following the existing `zilvereyes-plugin-studio` pattern.
- Move: the `plugins/plugin-eval/fixtures/*` directories whose matrix target is `fixtures/plugin-eval/<name>` go to `plugins/plugin-skill-studio/fixtures/plugin-eval/`.
- Delete: `plugins/plugin-eval/`. This happens only after the matrix check passes with targets that no longer point into it.
- Modify: `references/consolidation/lifecycle-sources.json`. The `plugin-eval` source root changes to a snapshot `references/consolidation/snapshots/plugin-eval-0.1.2.json`, a file list with sha256 per file generated before deletion, so check (f) still has a frozen source to compare against.
- Modify: `src/consolidation/check.mjs`. Accept a `snapshot` source kind with `{id, snapshot:<json path>}`. Rule (f) then compares against the snapshot's file list instead of the disk.
- Test: `tests/consolidation.test.mjs`. Add a snapshot-source case: an entry missing for a snapshot file fails.

**Interfaces:**
- Consumes: `checkMatrix` (Task 1)
- Produces: a catalog without `plugin-eval`

- [ ] **Step 1:** Add the snapshot test and the validator check.
  Run: `node --test tests/consolidation.test.mjs; node validate-marketplace.mjs`
  Expected: the snapshot case fails, and the validator reports the `plugin-eval is absorbed` failure.
- [ ] **Step 2:** Generate the snapshot, move the fixtures, update the matrix targets, remove the marketplace and counterparts entries, and delete `plugins/plugin-eval/`.
- [ ] **Step 3:** Run `node --test tests/consolidation.test.mjs`.
  Expected: pass.
- [ ] **Step 4:** Run `npm test` (Studio) and `node validate-marketplace.mjs` (root).
  Expected: all tests pass and the validator reports `"ok": true`.
- [ ] **Step 5:** `git commit -m "feat(catalog)!: retire plugin-eval, absorbed by studio-quality"`

---

### Task 7: Release 0.4.0 metadata, docs and draft PR

**Files:**
- Modify: `package.json`, `plugin.json`, `.codex-plugin/plugin.json` and `references/integration-registry.json` (`version` → `0.4.0`). In the registry, add the source `{id:'auto-research', sourcePath:'gyoz-ai/auto-research/1.0.0', license:'MIT', integration:'adapt', role:'preserved reference', files:{SKILL.md:<sha256>}, skills:[{sourceSkill:'auto-research', implementation:'skills/studio-quality/SKILL.md', mode:'adapted', acceptanceTest:'tests/autoresearch.test.mjs'}]}`, with the hash taken from the installed upstream file. Update the `defaultPrompt` entries in both manifests so they still name valid workflows.
- Modify: `README.md` (Studio). Add the table "Old skill → new skill + mode" with all 20 Studio rows and 5 plugin-eval rows.
- Create or modify: `CHANGELOG.md` (Studio). The 0.4.0 entry lists the breaking changes: the removed names, the `route()` `mode` field and the new commands.
- Repo root: `.agents/plugins/marketplace.json` gets the Studio version if it is recorded there, and the lock/claudePackages entries get the Studio version if it is recorded there. Change only fields the validator checks.

**Interfaces:** none new.

- [ ] **Step 1:** Bump `package.json` alone first.
  Run: `npm run validate`
  Expected: `Package/integration registry version mismatch`, which proves the guard.
- [ ] **Step 2:** Bump all four files and write the README/CHANGELOG and registry source.
- [ ] **Step 3:** Run `npm test && npm run validate` (Studio) and `node validate-marketplace.mjs` (root).
  Expected: all pass, with self-check `version:'0.4.0'` and the validator `"ok": true`.
- [ ] **Step 4:** `git commit -m "chore(studio): release 0.4.0 consolidated lifecycle skills"`
- [ ] **Step 5:** Push the feature branch with `git push -u origin <branch>` (no force) and open a **draft** PR.
  - The PR body lists the test counts, the validator result, the `consolidation-check` counts, every `dropped` id awaiting approval, and every entry under `#not-yet-ported`.
  - It ends with the "Generated with Claude Code" line.
  - Do not mark it ready and do not merge it without the owner's explicit yes.

---

## Unresolved externally observable decisions

1. **Drops:** Each `dropped` id found in Task 2 needs the owner's approval in the PR. Until then the matrix check fails, which keeps packaging blocked.
2. **Unported `plugin-eval` behaviour:** If Task 2 finds `plugin-eval` code behaviour with no Studio equivalent (`#not-yet-ported`), the owner decides whether to port it in this release or in a follow-up. The plan keeps it listed in either case and never silently drops it.
3. **The user-level `skill-autoresearch`:** After this release, the owner decides whether to retire it, since `studio-quality` improve covers it, or to keep developing it separately. This plan only snapshots and cites it.
4. **Claude variant:** `claude-plugins/` has no Plugin-Skill-Studio package today. Whether a Claude Code variant of `studio-build` and `studio-quality` should be published is outside this plan.

## Execution handoff

- **Inline Execution** (available): this session executes task by task using the `plugin-skill-studio:executing-plans` workflow and stops at blockers.
- **Subagent-Driven** (available): the `plugin-skill-studio:subagent-driven-development` workflow runs a fresh worker per task with review between tasks. Task 3 is independent of Tasks 1–2. Task 2 needs Task 1. Tasks 4–7 are sequential and need Tasks 1–3.
