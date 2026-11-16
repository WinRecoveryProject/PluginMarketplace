# Installed plugin audit — 16 November 2026

This dated snapshot covers all **31 unique plugins marked installed in the native catalog**, including the disabled bundled Visualize package. Thirty are enabled. Studio 0.3.3 returned 30 root reports; MegaLinter exceeded the bounded full-repository limit. **27 installed root scans completed within the configured rules; four remain incomplete.** These are static audit results, not a claim that every runtime or provider operation passed.

## Coverage and raw counts

| Scope | Roots or entrypoints | Raw errors | Raw warnings | Raw information |
|---|---:|---:|---:|---:|
| Installed plugins: returned root reports | 30 of 31 | 5 | 54 | 31 |
| MegaLinter: focused skill subtrees, separate supplement | 4 | 1 | 0 | 0 |
| Baseline host-provided extra plugin roots, excluded from installed totals | 12 | 1 | 17 | 5 |
| Standalone skills | 28 | 0 | 2 | 1 |

All 28 standalone entrypoint hashes were compared with the previous final analyses. One host-managed documentation entrypoint changed and was reanalyzed with stable before/after hashes. The fresh native skill inventory contains 269 unique paths across 18 plugin roots plus those 28 standalone skills, with zero reported loader errors. The earlier inventory count of 22 concerns installed Apps; it does not describe 22 additional installed plugins.

## Four installed scan limits

| Installed package | Remaining coverage boundary |
|---|---|
| MegaLinter | Whole repository exceeds the original 32 MiB / 5,000-file bounds. All four observed skill subtrees were separately checked; this does not complete the repository-wide scan. |
| Browser | A compiled service text member exceeds the 2 MiB per-file text limit. |
| Chrome | A compiled service text member exceeds the 2 MiB per-file text limit. |
| Bundled Visualize, disabled | A compiled chart checker exceeds the 2 MiB per-file text limit. |

The curated Visualize package has the same per-file coverage boundary in the separate host-extra group. These raw size errors are retained as **incomplete evidence**, not treated as package defects or silently converted into passes.

## Source-specific adjudications

The five raw installed root errors comprise three text-size limits and two uppercase frontmatter-name findings in host-provided Presentation and Spreadsheet skills. Native discovery confirms those two skills load; lowercase naming remains a portability advisory. The MegaLinter supplement flags a documented synthetic placeholder. Three additional credential-pattern findings in the host-extra group are upstream test fixtures. No live credential was established by those examples.

Other risk strings were localized to detector regular expressions or synthetic regression-test data. Title, entrypoint size and trigger-phrasing findings remain maintainability or discovery advisories. Boundary and host-reference heuristics retain an explicit unproven-behavior status. No rule family was globally waived, and the raw findings remain preserved. Static heuristics do not establish correct tool routing or safe end-to-end behavior.

## Verified repair and pending release

The earlier Visualize interpreter repair remains present: the Python3 executable alias resolves to the same physical executable as the existing Python installation. The prior four isolated checks passed: Python checking of a valid fixture, Node checking of a valid fixture, rejection of invalid JavaScript, and Python export to valid HTML. This audit inspected those receipts and the executable identity; it did not rerun target payloads. Rendering, interactions, chart payload correctness and arbitrary visualization requests were not established by those four checks. The obsolete bundled fallback is disabled, and the curated connection was preserved.

Installed CloudStorage Portal **0.9.2** still declares the older Dropbox App route while the available official Dropbox connection uses MCP. **Portal 0.9.3 is pending release** to reconcile that routing and record the reviewed local provider override. This snapshot does not claim that 0.9.3 has been installed or verified after installation; a later release delta must supply that evidence.

No Workspace authorization need was observed. There were no authorization failures in this read-only audit. No source, cache, configuration, provider connection or account was changed; no paid benchmark or provider payload ran. Service identity, consent, live reads and live writes remain separate evidence.

## Every installed root

Raw counts are errors / warnings / information. A complete scan means complete within Studio rules and limits.

| Installed plugin root | Version | Enabled | Static coverage | Raw counts |
|---|---|---:|---|---|
| documents (openai-primary-runtime) | 26.1112.11011 | Yes | Complete within configured rules | 0 / 1 / 0 |
| pdf (openai-primary-runtime) | 26.1112.11011 | Yes | Complete within configured rules | 0 / 0 / 0 |
| spreadsheets (openai-primary-runtime) | 26.1112.11011 | Yes | Complete within configured rules | 1 / 1 / 0 |
| presentations (openai-primary-runtime) | 26.1112.11011 | Yes | Complete within configured rules | 1 / 0 / 0 |
| template-creator (openai-primary-runtime) | 26.1112.11011 | Yes | Complete within configured rules | 0 / 0 / 1 |
| browser (openai-bundled) | 26.1111.21308 | Yes | INCOMPLETE | 1 / 0 / 0 |
| unified-computer-use (openai-bundled) | 26.1111.21308 | Yes | Complete within configured rules | 0 / 0 / 0 |
| chrome (openai-bundled) | 26.1111.21308 | Yes | INCOMPLETE | 1 / 0 / 0 |
| computer-use (openai-bundled) | 26.1111.21308 | Yes | Complete within configured rules | 0 / 1 / 0 |
| visualize (openai-bundled) | 1.0.97 | No | INCOMPLETE | 1 / 0 / 0 |
| megalinter (megalinter) | 1.0.28 | Yes | INCOMPLETE | No complete root report |
| onedrive (winrecoveryproject-digital) | 1.2.0 | Yes | Complete within configured rules | 0 / 0 / 0 |
| cloudstorage-portal (winrecoveryproject-digital) | 0.9.2 | Yes | Complete within configured rules | 0 / 0 / 0 |
| component-forge (winrecoveryproject-digital) | 0.1.2 | Yes | Complete within configured rules | 0 / 0 / 0 |
| plugin-skill-studio (winrecoveryproject-digital) | 0.3.3 | Yes | Complete within configured rules | 0 / 13 / 2 |
| powershell-workbench (winrecoveryproject-digital) | 0.9.0-beta.2 | Yes | Complete within configured rules | 0 / 15 / 13 |
| windows-dism-update-docs (winrecoveryproject-digital) | 0.1.3 | Yes | Complete within configured rules | 0 / 0 / 0 |
| codex-security (winrecoveryproject-digital) | 0.1.32 | Yes | Complete within configured rules | 0 / 0 / 3 |
| linear (winrecoveryproject-digital) | 5.0.1 | Yes | Complete within configured rules | 0 / 0 / 0 |
| codex-engineering-guardrails (winrecoveryproject-digital) | 1.1.1 | Yes | Complete within configured rules | 0 / 0 / 0 |
| vercel (winrecoveryproject-digital) | 0.21.4 | Yes | Complete within configured rules | 0 / 10 / 10 |
| github (winrecoveryproject-digital) | 0.1.12 | Yes | Complete within configured rules | 0 / 0 / 0 |
| google-drive (winrecoveryproject-digital) | 0.1.15 | Yes | Complete within configured rules | 0 / 0 / 0 |
| dropbox (winrecoveryproject-digital) | 5.0.1 | Yes | Complete within configured rules | 0 / 0 / 0 |
| codex-dev-workflows (created-by-me-remote) | 0.4.2 | Yes | Complete within configured rules | 0 / 9 / 0 |
| codex-coordinator (created-by-me-remote) | 0.4.0 | Yes | Complete within configured rules | 0 / 1 / 0 |
| zilvereyes-context-handoff (created-by-me-remote) | 0.3.4+zilvereyes.1 | Yes | Complete within configured rules | 0 / 0 / 0 |
| codex-process-jobs (created-by-me-remote) | 0.5.2 | Yes | Complete within configured rules | 0 / 1 / 0 |
| plugin-skill-studio (created-by-me-remote) | 0.3.3 | Yes | Complete within configured rules | 0 / 2 / 2 |
| codex-engineering-guardrails (created-by-me-remote) | 1.1.1 | Yes | Complete within configured rules | 0 / 0 / 0 |
| OneDrive App wrapper (created-by-me-remote) | 1.2.0 | Yes | Complete within configured rules | 0 / 0 / 0 |

## Separately reviewed host-extra roots

These roots were supplied by the earlier full host inventory and remain outside the fresh native installed-plugin set. Their cache contents were inspected again. This table does not establish that their tools are currently active.

| Host-extra plugin root | Version | Static coverage | Raw counts |
|---|---|---|---|
| cloud-environment (openai-curated-remote) | 0.2.1 | Complete within configured rules | 0 / 3 / 1 |
| defense-factory (openai-curated-remote) | 0.1.11 | Complete within configured rules | 0 / 0 / 3 |
| google-drive (openai-curated-remote) | 0.1.23 | Complete within configured rules | 0 / 1 / 0 |
| openai-developers (openai-curated-remote) | 1.3.16 | Complete within configured rules | 0 / 4 / 0 |
| openai-templates (openai-curated-remote) | 0.1.1 | Complete within configured rules | 0 / 0 / 0 |
| pages (openai-curated-remote) | 0.1.26 | Complete within configured rules | 0 / 1 / 0 |
| plugin-creator (openai-curated-remote) | 0.1.28 | Complete within configured rules | 0 / 0 / 0 |
| plugin-management (openai-curated-remote) | 0.1.0 | Complete within configured rules | 0 / 0 / 0 |
| sites (openai-curated-remote) | 1.1.6 | Complete within configured rules | 0 / 0 / 0 |
| vercel (openai-curated-remote) | 0.54.1 | Complete within configured rules | 0 / 8 / 1 |
| visualize (openai-curated-remote) | 1.0.103 | INCOMPLETE | 1 / 0 / 0 |
| work-pets (openai-curated-remote) | 0.1.6 | Complete within configured rules | 0 / 0 / 0 |

Forty package fingerprints matched the previous audit. The newly installed marketplace guardrails root has no earlier root report; MegaLinter has no complete root fingerprint. The OneDrive App wrapper fingerprint changed, and a repeated fresh static scan was stable with zero findings. The initiating process and changed historical member were not attributed. No cache rewrite or package merge was performed.

Snapshot limitation: installation state and provider availability can change after this dated catalog export. Any subsequent Portal or product release requires its own post-install delta.
