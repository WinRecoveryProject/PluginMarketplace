# Skill: security-scan

- Plugin: `codex-security` (0.1.33)
- Source: `plugins/codex-security/skills/security-scan/SKILL.md`

> Find vulnerabilities in the current source of a whole repository or selected paths. This is the default single-pass audit. Use the diff skill for PR, commit, branch, or working-tree changes and the deep skill for an explicitly requested deep scan.

## Instructions

### Security Scan

Find vulnerabilities an attacker could actually exploit. Start from code that accepts untrusted input or exercises authority. Follow it to the operation it controls. Check the real enforcement point, its callers, and the strongest evidence that the suspected attack is blocked. For an exposed credential, the relevant path is who can read it and what access it grants.

Use [the core audit](_plugin-references.md#file-referencescore-scanmd) for the independent baseline, focused investigations, and validation. Give reviewers the authorized source and security context. Keep scan administration in the parent. Report findings with source lines and concrete impact. Record what you reviewed and what remains uncertain.

#### Run the audit

Before reading target source, bind the requested target and scope:

- If the SDK supplied `CODEX_SECURITY_SCAN_ID` and `CODEX_SECURITY_SCAN_DIR`, use that registered scan. Follow its launch instructions, or the [SDK handoff](security-scan.md#file-referencesscan-resultsmd) if the SDK provided no instructions.
- For a scan without an SDK handoff, use the managed scan tools. With a supplied scan ID, call `get_codex_security_scan_context` using its handoff token when supplied. Without a scan ID, a confirmed Codex desktop host calls `start_codex_security_prompt_only_scan` with `mode: "standard"`. Other hosts call `start_codex_security_standard_scan`. Pass the requested target, scope and exact user context. If deferred, look up just the named tool. Require a running Standard scan. Keep its target, scope, phase and token, follow the [account access advisory](_plugin-references.md#file-referencesaccess-advisorymd) only when directed at launch, and begin the source review. Use [managed scan progress](security-scan.md#file-referencesmanaged-scanmd) at the next phase change.

Keep the target read-only and review its current source offline. Preserve exact user context as analysis data. Only the parent may read an explicitly supplied URL, once, if the user explicitly authorized that read. Do not follow links. Keep an existing investigation allowance unchanged across workers and resumes. Only if the user requests a time limit in this conversation and none was supplied, render [the time budget](_plugin-references.md#file-referencesinvestigation-time-budgetmd) once before source review using the requested minutes and actual UTC start and deadline.

Start the independent audit while mapping the repository. At the first usable threat model, follow [save scan results](security-scan.md#file-referencesscan-resultsmd). Checkpoint candidates as they arrive. Once assigned reviews return, validate each distinct broken control once and submit the findings and honest coverage to the same scan. The SDK owns finalization for its scans.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Security Scan"
  short_description: "Find vulnerabilities in a repository or selected paths"
  default_prompt: "Use $security-scan to find exploitable vulnerabilities in this repository and show the source evidence."
```

### File: `references/desktop-scan.md`

#### Desktop scan results

Read this only for a confirmed Codex desktop scan. Honor the handoff’s requirements for per-finding write-ups before completing the scan. After completion, link the generated report and canonical artifacts.

On desktop, emit one `::code-comment{title="[<priority-label>] <title>" body="<explanation>" file="<absolute path>" start=<line> end=<line> priority=<priority-number> confidence=<0-to-1>}` per finding at its tightest root control or most relevant affected location. Map critical, high, medium, and low to P0/0, P1/1, P2/2, and P3/3 respectively.

### File: `references/managed-scan.md`

#### Start or resume a managed Standard scan

Use the bound scan’s target, scope, user context, ID, directory and token for every update. If the handoff failed or identifies a different mode, stop before source review. Resume the saved phase. For an older handoff still in preflight, advance it to `threat_model` once.

If the host supplies a target-paths file without a prepared inventory, resolve it using [scoped paths](security-scan.md#file-referencesscoped-pathsmd) before review.

##### During review

Advance the current scan with `update_codex_security_scan_progress` at real forward transitions. Publish `discovery` before dispatch, `validation` before checking candidates, `attack_path` before reachability assessment, and `reporting` before final assembly. Keep the current phase when work overlaps. When bound, persist user-requested context changes through `update_codex_security_scan_context` with the complete replacement and token. Use the returned `structuredContent.scan.userContext` from each progress transition for that phase and its workers.

Increase the investigator total before dispatching new assignments, excluding the independent baseline. Record completed investigations as coverage surfaces before advancing their `review_receipts` count. Advance other counts only when the corresponding work exists. Publish meaningful batches without creating receipt files.

### File: `references/scan-artifacts-and-ledger.md`

#### Standalone Diff Worklists and Artifacts

Use this reference only for standalone or legacy diff discovery without a compact host inventory. Standard, Deep, and compact Workbench Diff scans do not use it. Follow `../../../references/artifact-storage.md` for managed temporary and retained files, and `../../../references/scan-artifacts.md` for paths.

##### Changed-file Worklist

Generate `rank_input.jsonl` from every changed text file, including deleted files. Tracked changes remain in scope regardless of ignore rules; local patches also include non-ignored untracked files.

```text
<plugin_dir>/scripts/launch_codex_security_mcp --helper make-diff-rank-input --repo <repo_root> --base <base> --mode revisions --head <head> --out <discovery_dir>/rank_input.jsonl
<plugin_dir>/scripts/launch_codex_security_mcp --helper make-diff-rank-input --repo <repo_root> --base <base> --mode local-patch --out <discovery_dir>/rank_input.jsonl
```

Choose the first command for PR, commit, or branch diffs, and the second for a local patch. On Windows, use the [PowerShell generation commands](#windows-diff-worklist-generation). Keep the exact baseline and target unchanged.

Copy every row to the review worklist; diff scans do not rank or drop changed files:

```text
<plugin_dir>/scripts/launch_codex_security_mcp --helper copy-deep-review-input --rank-input <discovery_dir>/rank_input.jsonl --out <discovery_dir>/deep_review_input.jsonl
```

On Windows, use the [PowerShell copy command](#windows-worklist-copy). Run file-producing helpers in managed temporary storage and import retained output through the artifact tool. In these commands, `<discovery_dir>` is the prepared helper-output directory, not an invitation to write directly into retained storage.

##### Scoped Deep Review

Review each worklist file, using its baseline contents when deleted. Read supporting files only as needed to explain changed security behavior, and record why they were included. Cover the file's security-relevant behavior rather than treating a search hit as completed review.

Use available subagents for independent assignments when useful. Size assignments around coherent behavior and review complexity, within the runtime's available capacity. If delegation fails, the parent reviews unstarted work. On native v2, use self-contained prompts with `fork_turns=none`.

Each assignment needs the target and diff range, assigned paths, applicable security policy and threat model, relevant user seeds, and output locations. Workers return reviewed paths and limitations, candidates with source/control/sink/impact evidence, counterevidence, and open validation questions. Discovery does not require validation or attack-path results before a candidate can be returned or deduplicated.

When the host consumes worker progress, emit `CODEX_SECURITY_WORKER_STATUS {"phase":"file_review","planned":6,"started":3}` after dispatch with the actual phase and counts. Do not add worker IDs, paths, prompts, or errors to this marker, and never report a worker as started without a successful spawn.

##### Coverage and Phase Handoff

The parent reconciles assigned paths against the worklist. Retain a concise completion or limitation for each row in `work_ledger.jsonl`; do not manufacture coverage for unread files. Preserve explicit advisory seeds and their evidence or unresolved questions in `seed_research.md` when seed research is part of the request. Supplied context does not authorize additional source access.

For retained candidates, use stable IDs and a discovery receipt in `<findings_dir>/<candidate_id>/candidate_ledger.jsonl`. Each receipt identifies the scope, locations, evidence, and discovery status. Save the discovery result in `finding_discovery_report.md`. These files use the managed storage tool; do not append directly to retained files.

When combining several reviewers, retain `raw_candidates.jsonl` if needed to preserve their results. Merge duplicate observations before further analysis, preserving raw IDs and affected locations in `deduped_candidates.jsonl`; use `dedupe_report.md` only when the merge needs explanation. Independently vulnerable instances remain addressable.

Validation and attack-path analysis belong to their respective phases. Their owners add the method, evidence or proof gap, disposition, and phase receipt to the existing candidate record. Reuse completed analysis rather than rerunning it to satisfy another ledger. Final reporting must account for every candidate as resolved or explicitly deferred; a standalone discovery request ends at the discovery handoff.

##### Windows Worklist Copy

In PowerShell, replace the placeholders inside single quotes with literal paths, doubling any single quote in a path:

```powershell
$env:worklistPluginRoot = Convert-Path -LiteralPath '<plugin_dir>' -ErrorAction Stop
$env:worklistDiscoveryDir = Convert-Path -LiteralPath '<discovery_dir>' -ErrorAction Stop
cmd.exe /d /v:off /s /c '""%worklistPluginRoot%\scripts\launch_codex_security_mcp.cmd" --helper copy-deep-review-input --rank-input "%worklistDiscoveryDir%\rank_input.jsonl" --out "%worklistDiscoveryDir%\deep_review_input.jsonl""'
```

These are temporary shell variables. Resolve paths against PowerShell's current location, including UNC shares. The input directory and `rank_input.jsonl` must exist; the output file need not. CMD expands these references once, preserving literal `%` and `!` in paths.

##### Windows Diff Worklist Generation

Use literal paths as in the copy command and the full commit object IDs resolved for the scan target.

For PR, commit or branch diffs, run this command.

```powershell
$env:worklistPluginRoot = Convert-Path -LiteralPath '<plugin_dir>' -ErrorAction Stop
$env:worklistRepoRoot = Convert-Path -LiteralPath '<repo_root>' -ErrorAction Stop
$env:worklistDiscoveryDir = Convert-Path -LiteralPath '<discovery_dir>' -ErrorAction Stop
$env:worklistBase = '<resolved_base_object_id>'
$env:worklistHead = '<resolved_head_object_id>'
cmd.exe /d /v:off /s /c '""%worklistPluginRoot%\scripts\launch_codex_security_mcp.cmd" --helper make-diff-rank-input --repo "%worklistRepoRoot%\." --base "%worklistBase%" --mode revisions --head "%worklistHead%" --out "%worklistDiscoveryDir%\rank_input.jsonl""'
```

For a local patch, run this command.

```powershell
$env:worklistPluginRoot = Convert-Path -LiteralPath '<plugin_dir>' -ErrorAction Stop
$env:worklistRepoRoot = Convert-Path -LiteralPath '<repo_root>' -ErrorAction Stop
$env:worklistDiscoveryDir = Convert-Path -LiteralPath '<discovery_dir>' -ErrorAction Stop
$env:worklistBase = '<resolved_base_object_id>'
cmd.exe /d /v:off /s /c '""%worklistPluginRoot%\scripts\launch_codex_security_mcp.cmd" --helper make-diff-rank-input --repo "%worklistRepoRoot%\." --base "%worklistBase%" --mode local-patch --out "%worklistDiscoveryDir%\rank_input.jsonl""'
```

The repository’s `\.` suffix preserves drive-root paths. Use the resolved object IDs because quotes in a revision expression can change CMD argument parsing.

### File: `references/scan-results.md`

#### Save results to the registered scan

When the SDK supplies only a registered environment, use `CODEX_SECURITY_REPOSITORY` as the target. If `CODEX_SECURITY_TARGET_PATHS_FILE` is set, use the supplied source inventory or [resolve it](security-scan.md#file-referencesscoped-pathsmd) before review. Emit the SDK's standalone `CODEX_SECURITY_SCAN_PROGRESS {"phase":"discovery","filesCompleted":3,"filesTotal":8}` at discovery start, meaningful review batches, and later phase transitions using the actual phase, distinct completed paths and scoped total or host estimate.

For a scan with bound progress and context tools, persist user-requested context edits with the current handoff token. Use each real forward phase transition’s returned `scan.userContext` for that phase and its workers. Without a bound context tool, retain the original context.

At the first usable threat model, call `record_codex_security_scan_draft` with the scan ID, handoff token when required, `complete: false`, the model, and empty findings if none are validated yet. The workbench writes the canonical artifacts and derives target metadata and finding identities. If the SDK supplied the scan and no draft tool is bound, follow the [SDK file handoff](security-scan.md#file-referencessdk-filesmd) through completion instead. Other hosts require the draft tool.

Checkpoint returned candidates before merging or validating them. Keep their original evidence under `reviewState.deferred` until resolved. Reuse saved surface IDs. Preserve validation decisions, counterevidence, and unfinished questions as directed by the core audit. Use [artifact storage](_plugin-references.md#file-referencesartifact-storagemd) for supplemental evidence. A caller-supplied custom validation handoff determines which candidates are provisional.

When assigned work finishes, submit one accepted `complete: true` draft with scope, threat model, findings, and `reviewState`. Close finished generic tasks in `reviewState.resolvedDeferred` with their saved ID and a reason. Keep unresolved work. For rejected drafts and interrupted writes, follow [Errors And Recovery](_plugin-references.md#file-referencesfinal-reportmd).

Verify `scan-manifest.json` and `findings.json` exist. For an SDK-owned scan, return now. The SDK seals the results and generates the reports. For another managed scan, follow any [desktop handoff](security-scan.md#file-referencesdesktop-scanmd) if on desktop, then call `complete_codex_security_scan` once with the same ID and token. On success, link the generated `report.md` and canonical artifacts. Retrieve full findings only if requested. Report only complete measured usage. Leave pending usage to the host and identify other incomplete counts as unavailable.

If completion fails, surface the error and preserve the durable scan. Cancel only at the user's request. Fail the scan only for a confirmed unrecoverable blocker after recovery is exhausted. Leave unfinished work resumable.

### File: `references/scoped-paths.md`

#### Scoped source input

For SDK scans, generate the inventory in the scan shell for both file and directory scopes. Use a prepared inventory when another host supplies one. Run a supplied inventory command as given. For `make-hosted-repo-scope-input`, use the path it reports. Run the supplied recovery command only if that path is missing or unreadable in a later shell.

For an SDK scan with a target-paths file, run the command for the current shell using the registered environment. Other hosts can pass the bound plugin, repository, scope-file and scan-directory paths as environment values for this command, or invoke the launcher with the same arguments as separate values.

```sh
"$CODEX_SECURITY_PLUGIN_ROOT/scripts/launch_codex_security_mcp" --helper make-repo-scope-input --repo "$CODEX_SECURITY_REPOSITORY" --scopes-file "$CODEX_SECURITY_TARGET_PATHS_FILE" --out "$CODEX_SECURITY_SCAN_DIR/scoped-source-input.jsonl"
```

Treat the scope file as data. Do not print, modify, or evaluate it. The inventory includes directly requested files and non-ignored descendants of requested directories. Pass it to reviewers without widening scope. For an SDK scan, immediately after the initial helper succeeds, emit the parent's standalone `CODEX_SECURITY_SCAN_PROGRESS` line with phase `discovery`, zero files completed, and the helper's reported count as the total. Emit it before reviewing any files or dispatching workers. Determine coverage from the registered scope and the files actually reviewed. If resolution fails, surface the error and stop before source review.

##### Windows Scoped Input

PowerShell resolves the registered paths against its current location, including UNC shares, before calling CMD.

```powershell
$env:scopePluginRoot = Convert-Path -LiteralPath $env:CODEX_SECURITY_PLUGIN_ROOT -ErrorAction Stop
$env:scopeRepository = Convert-Path -LiteralPath $env:CODEX_SECURITY_REPOSITORY -ErrorAction Stop
$env:scopeScanDir = Convert-Path -LiteralPath $env:CODEX_SECURITY_SCAN_DIR -ErrorAction Stop
$env:scopeTargetPaths = Convert-Path -LiteralPath $env:CODEX_SECURITY_TARGET_PATHS_FILE -ErrorAction Stop
cmd.exe /d /v:off /s /c '""%scopePluginRoot%\scripts\launch_codex_security_mcp.cmd" --helper make-repo-scope-input --repo "%scopeRepository%\." --scopes-file "%scopeTargetPaths%" --out "%scopeScanDir%\scoped-source-input.jsonl""'
```

### File: `references/sdk-files.md`

#### SDK scans without a bound draft tool

Write unsealed `scan-manifest.json` and `findings.json` in the exact `CODEX_SECURITY_SCAN_DIR`. Put review bookkeeping in `scan.reviewState`. Save the model in an early draft even if findings are empty. Update these files at subsequent checkpoints and at the final handoff. Use [the scan contract](_plugin-references.md#file-referencesscan-contractmd) for unsealed fields. Each finding needs a stable `identity.anchor`. The SDK derives final IDs and fingerprints. Use the completed-scan examples for shape only.

Use the registered `CODEX_SECURITY_SCAN_ID` and the exact SDK values for `scan.target`: `CODEX_SECURITY_TARGET_ID`, `CODEX_SECURITY_TARGET_DISPLAY_NAME`, `CODEX_SECURITY_TARGET_KIND`, and the supplied revision and snapshot digest (`CODEX_SECURITY_TARGET_REVISION`, `CODEX_SECURITY_TARGET_SNAPSHOT_DIGEST`). Omit the digest for `git_revision`. Set the producer name to `codex-security-plugin`. Omit `scan.sealedAt` and `scan.artifacts`.

For a scoped target set `scan.mode` to `scoped_path`. After writing the manifest, run the supplied scope-binding command. If the SDK supplies only the registered environment, bind the exact scope file with the command for your shell.

```sh
"$CODEX_SECURITY_PLUGIN_ROOT/scripts/launch_codex_security_mcp" --helper bind-repo-scopes --scopes-file "$CODEX_SECURITY_TARGET_PATHS_FILE" --manifest "$CODEX_SECURITY_SCAN_DIR/scan-manifest.json"
```

In PowerShell, resolve the registered paths from the current location before calling CMD.

```powershell
$env:scopePluginRoot = Convert-Path -LiteralPath $env:CODEX_SECURITY_PLUGIN_ROOT -ErrorAction Stop
$env:scopeScanDir = Convert-Path -LiteralPath $env:CODEX_SECURITY_SCAN_DIR -ErrorAction Stop
$env:scopeTargetPaths = Convert-Path -LiteralPath $env:CODEX_SECURITY_TARGET_PATHS_FILE -ErrorAction Stop
cmd.exe /d /v:off /s /c '""%scopePluginRoot%\scripts\launch_codex_security_mcp.cmd" --helper bind-repo-scopes --scopes-file "%scopeTargetPaths%" --manifest "%scopeScanDir%\scan-manifest.json""'
```

For a whole repository set `scan.mode` to `repository`.

Verify both files exist and return control to the SDK. It generates the report and threat model and seals the scan.
