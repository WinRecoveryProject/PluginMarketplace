# Review and verification cluster consolidation — design

Status: approved design, not implemented
Date: 2026-11-20
Scope: sub-project 2 of the catalog consolidation. Sub-project 1 is `2026-11-19-lifecycle-consolidation-design.md`.

## Context and goal

Code review and verification is the largest overlap in the catalog and the installed set: 103 skills across 32 packages (`docs/CAPABILITY-OVERVIEW-20261120.md`).

This sub-project merges the review and verification skills of your own plugins into one skill per self-contained plugin. The merged skills must keep the **sum** of every source: nothing is dropped without the owner's explicit approval.

## Decisions (owner, 2026-11-20)

| Topic | Decision |
|---|---|
| Host of the full union | WinRecoveryProject DevSuite, in both its Codex and its Claude variant |
| Third-party snapshots (`codex-dev-workflows`, `codex-engineering-guardrails`) | Left unchanged. Their review capabilities are absorbed with provenance now. Each plugin retires as a whole only after every one of its skills has been absorbed by some cluster. |
| Studio dependency | Both plugins stay self-contained. Studio keeps its own merged `studio-review`. The modes the two plugins share are byte-identical, and drift between them fails a test. |
| Old skill names | Removed, with no aliases. This is the same rule as sub-project 1. |
| Out of scope now | Security skills (`devsuite-security-assess`, `devsuite-security-fix`, codex-security) belong to the security cluster. Linter, CodeRabbit and `powershell-quality-gate` stay as tool plugins. |

## Skill split

### DevSuite 0.3.0: `devsuite-review` holds the whole union

| Mode | Absorbs |
|---|---|
| `code` | Studio `code-review`; codex-dev-workflows `code-review`; guardrails `code-verification`; DevSuite `devsuite-review` (code review part) |
| `request` | Studio `requesting-code-review` |
| `receive` | Studio `receiving-code-review` |
| `verify` | Studio `verification-before-completion`, Studio `verify-work` |
| `release` | codex-dev-workflows `pre-release-review`; DevSuite `devsuite-review` (patch risk and release readiness) |
| `decide` | Studio `review-decision` |
| `gate` | DevSuite `devsuite-quality` |

The skill keeps the name `devsuite-review`, so existing DevSuite users keep their entry point. `devsuite-quality` is removed. The DevSuite router skill `devsuite` and every other DevSuite skill that names `devsuite-quality` or `devsuite-review` are re-pointed to the new modes.

The `gate` mode may name the Linter, CodeRabbit and `powershell-quality-gate` plugins as optional tools when they are installed. It never requires them.

### Studio 0.5.0: `studio-review`

| Mode | Absorbs |
|---|---|
| `code` | Studio `code-review` |
| `request` | Studio `requesting-code-review` |
| `receive` | Studio `receiving-code-review` |
| `verify` | Studio `verification-before-completion`, Studio `verify-work` |
| `decide` | Studio `review-decision` |

The 11 Studio skills that name the removed skills are re-pointed to `studio-review` modes. They are:

- `implement`
- `implement-spec`
- `tdd`
- `engineering-workflow-guide`
- `executing-plans`
- `finishing-a-development-branch`
- `communicate-clearly`
- `automate-ui`
- `solve-efficiently`
- `research-systematically`
- `execute-durably`

Studio `risk-review` becomes the `risk` mode of `studio-quality`, because it is backed by Studio's `risk-scan` engine and reviews skill and plugin artifacts.

The result is 12 source skills reduced to 2, plus one new mode in `studio-quality`. The 12 are Studio's 6 review skills and `risk-review`, codex-dev-workflows' 2, guardrails' 1 and DevSuite's 2.

## Union guarantee

Both plugins get a capability matrix in the format of sub-project 1:

- DevSuite: `references/consolidation/review-matrix.json`
- Studio: `references/consolidation/review-matrix.json`

Deleted sources are frozen as file-hash snapshots.

- **Studio** checks its matrix with its existing `consolidation-check`.
- **DevSuite** cannot depend on Studio at runtime. It gets a test in its own test framework that applies the same rules:
  - every entry has a target that resolves;
  - no drop is unapproved;
  - every source file is represented.
- **Shared modes.** The `code`, `request`, `receive`, `verify` and `decide` mode files are byte-identical in the two plugins. Each matrix records the sha256 of its shared mode files, and each plugin's test fails when a shared file no longer matches the recorded hash. Changing a shared mode therefore means updating both plugins in the same release pair.
- **Triggers.** Every removed skill's description sentences become routing test cases. In Studio they go through `route()`. In DevSuite they go through its router, if it has one; otherwise the description of `devsuite-review` must contain each removed trigger phrase.

## Rollout

1. **DevSuite source repository.**
   1. Bring the local clone up to the locked commit `1cedd8e` (0.2.7). The clone is at `d6acf11` today.
   2. Implement 0.3.0 on a feature branch for both the Codex package and the Claude variant (`editors/claude`).
   3. Open a draft PR.
2. **Studio source repository.**
   1. Implement 0.5.0 on a branch based on `feat/lifecycle-consolidation-0.4.0` (WinRecoveryProject/Zilvereyes-Plugin-Studio#1).
   2. Open a draft PR.
3. **Marketplace.**
   1. Update the snapshots of `plugins/winrecoveryproject-devsuite`, `claude-plugins/winrecoveryproject-devsuite` and `plugins/plugin-skill-studio`.
   2. Lock all three to their source commits.
   3. Bump the versions in both marketplace files and in README.
   4. Open a draft PR based on WinRecoveryProject/PluginMarketplace#3.
4. Nothing is merged or marked ready without the owner's explicit yes. No force-push.

## Error handling

A failing matrix check, shared-mode hash check, or trigger test blocks packaging in the plugin concerned.

## Testing

- All existing Studio, DevSuite (Codex and Claude) and marketplace tests still pass.
- The new checks:
  - each matrix passes its own check;
  - the shared-mode hashes match in both plugins;
  - the trigger cases route correctly;
  - the 11 re-pointed Studio skills have no broken local links (`self-check`).
- Studio's deterministic package build passes, and DevSuite's own package script (`scripts/package.py`) passes.
