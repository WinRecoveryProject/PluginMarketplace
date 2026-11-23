# Debugging cluster consolidation: design and plan

Status: design approved by the owner on 2026-11-23. Not yet implemented.

Scope: this is sub-project 6 of the catalog consolidation. It follows the git cluster and uses the same mechanisms: a capability matrix, shared mode files pinned by hash, a generator with a recorded list of rewordings, and routing tests.

## Decisions

| Topic | Decision |
|---|---|
| Sources | Studio `diagnose-systematically` (with `root-cause-tracing.md`, `defense-in-depth.md`, `condition-based-waiting.md` and `find-polluter.sh`), Studio `diagnosing-bugs` (with `scripts/hitl-loop.template.sh`), and Studio `triage` (with `AGENT-BRIEF.md` and `OUT-OF-SCOPE.md`). |
| Hosts | Studio gets a new self-contained skill, `studio-debug`. DevSuite extends its existing `devsuite-debug`, so its skill count stays 14. Both skills carry the same three modes, byte-identical and pinned by hash. |
| Triage | Becomes the `triage` mode of the debug skill, as the owner chose. |
| Other packages | `codex-dev-workflows:bug-investigation` stays unchanged. Its capabilities are mapped as covered by `devsuite-debug`. `codex-security:triage-finding` belongs to the security domain and is not touched. |
| Old names | Removed, with no aliases. Their triggers, including each `Do NOT use for…` boundary, route to the new modes. |
| Base branches | The git-cluster branches: Studio #5, DevSuite #7 and marketplace #11. |

## Modes

The three modes and their companion files are shared between the packages.

| Mode | Source | Companion files, under `modes/<mode>/` |
|---|---|---|
| `diagnose` | `diagnose-systematically` | `root-cause-tracing.md`, `defense-in-depth.md`, `condition-based-waiting.md`, `scripts/find-polluter.sh` |
| `loop` | `diagnosing-bugs` | `scripts/hitl-loop.template.sh` |
| `triage` | `triage` | `AGENT-BRIEF.md`, `OUT-OF-SCOPE.md` |

- Shared files carry no package links and no names of skills that exist in only one package.
- Every rewording comes from the generator's recorded list `[file, from, to, count]`. The generator fails unless each `from` occurs exactly `count` times.
- Each mode keeps its source text in full: invariants, procedures and the guardrails against rationalizing away a failure.

## Studio 0.9.0

- **New skill.** `skills/studio-debug/SKILL.md` contains the guide, the mode map with `mode-` anchors and the authorization rule. Diagnosis never authorizes edits on its own. Studio also gets the files `references/consolidation/debug-matrix.json` and `shared-debug-modes.json`.
- **Routing.** In `src/registry.mjs`, the current `diagnose-systematically` rule is replaced by `studio-debug` rules for each mode:
  - `triage` comes before `loop`, so that reports from an issue intake are not taken as live debugging.
  - The broad pattern (`fejlsøg|debug|diagnos|failing|fejler`) routes to `diagnose`.
- **Re-pointing.** Mentions of the old skill names are pointed at the matching `studio-debug` mode in:
  - the `studio-execute` router;
  - `automate-ui`, `refactor-safely`, `research-systematically` and `solve-efficiently`;
  - `engineering-workflow-guide` and its references;
  - `setup-engineering-workflows`;
  - `tools/matt/route_skill.py`;
  - the earlier matrices, where their targets name the removed skills.

  The word "triage" is only changed where it names the skill, not in generic phrases such as triage labels.
- **Shared plan modes.** If `studio-plan/modes/spec.md` or `tickets.md` name the skill `triage`, the change is made through the planning generator. Studio and DevSuite then re-pin the planning hashes in the same change.
- **Removal.** The three old skills are snapshotted, then deleted. The version becomes 0.9.0 in every version field, with a CHANGELOG entry.

## DevSuite 0.7.0

- **Guide.** `skills/devsuite-debug/SKILL.md` keeps all of its current guidance:
  - the policy and platform links;
  - the scope boundary towards planning, review and security;
  - the read-only default;
  - the authorized-fix procedure;
  - the report contract.

  It also gets a mode map with `mode-` anchors and the shared `modes/` tree.
- **Registration.**
  - `runtime/routing.py` gets `DEBUG_MODES`, matched on the raw request, as for the git, execution and planning modes. `route()` returns the mode.
  - The Claude packager already ships nested mode files.
  - `editors/claude/test_portable.py` checks that the debug mode files are in the package and match the pinned hashes.
  - The capability matrix and `references/consolidation/debug-matrix.json` are checked by a Python test, `tests/test_debug_consolidation.py`.
- **Version.** 0.7.0 in every version field.

## Matrix

- **Seeding.** `consolidation-seed` builds the matrix from the git snapshots of the three Studio sources and of `devsuite-debug` 0.6.0.
- **Bug-investigation.** The entries for `codex-dev-workflows:bug-investigation` are added as covered by `devsuite-debug`.
- **Status rule.** Every entry must be `covered` or `merged-with`. No entry may be `dropped` without the owner's `approved:true` and a reason.

## Plan

1. **Studio branch.** Create `feat/debug-consolidation-0.9.0` from `feat/git-consolidation-0.8.0`. Write failing tests first: matrix union, shared hashes, no package links, removed triggers route to `studio-debug/<mode>`, and old names are absent.
2. **Generator.** `gen-debug.mjs` writes the shared mode tree from the source skills, using the recorded list of rewordings.
3. **Studio skill and routing.** Write `studio-debug`, the registry entry and the routing rules, then re-point the dependents. Seed and fill the matrix, snapshot and delete the old skills, and bump to 0.9.0. Run all tests and the deterministic build, then commit.
4. **DevSuite branch.** Create `feat/debug-consolidation-0.7.0` from `feat/git-consolidation-0.6.0`. Write failing tests first. Then copy the shared modes byte-identical, extend the guide, add `DEBUG_MODES`, write the matrix and bump to 0.7.0. Run unittest, doctor and both package builds, then commit.
5. **Marketplace branch.** Create `feat/debug-cluster` from `feat/git-cluster`. Sync the plugin snapshots, lock entries and zip hashes. Regenerate the Gemini export. Run the validator, `scripts/*.test.mjs` and Gemini `--check`, then commit this document.
6. **Delivery.** Push and open three draft PRs stacked on #5, #7 and #11.

## Verification

- All existing tests stay green.
- The new matrix, hash, trigger and removed-name tests pass in both packages.
- Studio's deterministic build passes, and both DevSuite packages build.
- Marketplace: `validate-marketplace.mjs`, `scripts/*.test.mjs`, and Gemini `--check` after regeneration.

## Delivery

Three draft PRs. Nothing is merged without the owner's explicit yes, and nothing is force-pushed.
