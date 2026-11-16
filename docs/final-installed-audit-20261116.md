# Final installed audit addendum — 16 November 2026

The final native catalog records **33 installed plugins**, up from 31: WinRecoveryProject Linter 0.1.0 and DevSuite 0.1.0 were added, and CloudStorage Portal advanced from 0.9.2 to **0.9.3**. This supersedes the earlier Portal pending-release status. Catalog metadata reports 32 enabled plugins; the older OneDrive App wrapper also has an explicit local disabled override, so catalog enable metadata and local overrides are kept separate.

## Discovery expansion and migration

The initial inventory contained 269 unique skill paths across 18 plugin roots and 28 standalone skills. The broad final inventory contains **553 unique skill paths across 49 plugin roots and the same 28 standalone skills**. The earlier final-inventory snapshot had 34 disabled skill paths. The overlap-migration configuration verification records **36 exact disabled skill flags**. An intermediate focused snapshot exposed 283 paths with 17 disabled across 20 plugin roots and 28 standalone skills. The latest two-directory collection confirms **553 distinct paths: 37 disabled and 516 enabled**, with zero loader errors. Those 37 disabled entrypoints comprise 36 overlapping source skills plus the locally mitigated CodeRabbit entrypoint. Its focused directory still reports 283 paths and 17 disabled; the broader directory reports all 553 paths and 37 disabled. Both additional overlap flags apply to byte-identical overlapping guardrails entrypoints; packages and provider connections were preserved.

The increase is 284 paths: 299 path strings appeared and 15 old Portal-version paths retired. The two new products contribute 14 skills. Other newly visible paths come from host-provided roots and previously installed packages becoming discoverable in the broader inventory. A new discovery row does not prove a new installation. Native catalogs, rather than path counts, establish the two new product installations and Portal upgrade. No catalog loading errors were reported.

All current package identities are reconciled: **55 roots = 33 catalog-installed roots + 22 host-provided roots not marked installed**. Forty-nine roots expose skill entrypoints; six catalog-installed roots have no currently discovered skill paths. The earlier audit covered 43 identities. This delta adds two product identities and ten newly surfaced host-provided identities, with the Portal version replaced.

## Static evidence and limits

| Scope | Roots represented | Raw errors | Raw warnings | Raw information |
|---|---:|---:|---:|---:|
| Installed plugins | 33 | 5 | 54 | 31 |
| All host-provided extra plugins | 22 | 2 | 39 | 8 |
| Newly surfaced host extras only, included above | 10 | 1 | 22 | 3 |
| MegaLinter skill-scope supplement, separate from root totals | 4 | 1 | 0 | 0 |
| Standalone skills | 28 | 0 | 2 | 1 |

Twenty-nine installed roots have complete bounded static or final-release evidence; **four installed root scans remain incomplete**: the whole MegaLinter repository exceeds the original repository bounds, and Browser, Chrome and disabled bundled Visualize each contain an oversized compiled text member. Curated Visualize has a corresponding per-file limit in the separate host-extra group. The original limits and raw severities were preserved. All four observed MegaLinter skill subtrees were checked separately; this does not complete the whole repository scan.

Only the ten previously unreviewed host-extra roots were newly scanned for this delta. Existing root reports were carried forward with their explicit limits. Linter, DevSuite and Portal 0.9.3 use their final clean release scans plus verified installed immutable-file parity: 41, 83 and 125 files respectively, with zero mismatches. Generated Linter dependencies, downloaded tool runtimes and cache artifacts were excluded. All 28 current standalone entrypoint hashes match previously reviewed revisions; the changing host documentation entrypoint returned to an already reviewed revision, so no redundant analysis was run.

## New source finding

CodeRabbit 1.1.4, supplied through host discovery and **not marked installed by the native catalog**, explicitly instructs running a remote installer through a shell when its CLI is missing. The upstream source still contains that instruction, so the raw execution-risk error is retained. The specific skill entrypoint is now **LOCALLY_MITIGATED**: disabled through its native exact-path flag, with the source hash, provider settings and unrelated configuration preserved. The final broad native snapshot confirms it is disabled. No installer was fetched or executed, no login was initiated, and no malicious payload or runtime failure is alleged. This is an entrypoint mitigation, not an upstream source fix or a synthetic-fixture waiver.

The other new findings are 16 heading advisories in AgentMemory, six discovery-phrasing advisories in Knowledge for Agents, and three boundary heuristics across AgentMemory and Plugin Eval. Boundary behavior remains unproven. Previously reviewed uppercase host names, size limits, detector definitions and synthetic fixtures retain their source-specific adjudications; no rule family was globally waived.

## Post-install provider and runtime evidence

Portal 0.9.3 is now catalog-installed and matches its reviewed release files. Existing read receipts pass for Dropbox, Google Drive and OneDrive, with all three observed identities unchanged and no new login or consent flow. Provider and unrelated configuration checks passed; the 36 overlapping source-skill flags and one CodeRabbit entrypoint disable are separate from provider connections and package installation. Coordinator hooks were retained without registering duplicate hooks.

The earlier Visualize Python3 repair and four isolated fixture checks remain the established scope: valid Python/Node checks, invalid-JavaScript rejection and HTML export. Rendering, arbitrary chart correctness and every provider write operation were not established by those checks. Static scores, installation parity and selected live reads do not establish that every runtime workflow passed.

No Workspace authorization need or failure was observed. This audit delta changed no source, cache, configuration, connection or account, ran no target payload, and used no paid benchmark.

## Current root coverage

The tables reconcile all 55 current root identities. Counts are errors / warnings / information; inherited evidence is not presented as a new scan.

| Installed root | Version | Evidence | Coverage | Raw counts |
|---|---|---|---|---|
| cloudstorage-portal (winrecoveryproject-digital) | 0.9.3 | Final release + installed parity | Complete within stated scope | 0 / 0 / 0 |
| codex-engineering-guardrails (winrecoveryproject-digital) | 1.1.1 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| codex-security (winrecoveryproject-digital) | 0.1.32 | Prior bounded scan | Complete within stated scope | 0 / 0 / 3 |
| component-forge (winrecoveryproject-digital) | 0.1.2 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| computer-use (openai-bundled) | 26.1111.21308 | Prior bounded scan | Complete within stated scope | 0 / 1 / 0 |
| documents (openai-primary-runtime) | 26.1112.11011 | Prior bounded scan | Complete within stated scope | 0 / 1 / 0 |
| dropbox (winrecoveryproject-digital) | 5.0.1 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| google-drive (winrecoveryproject-digital) | 0.1.15 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| megalinter (megalinter) | 1.0.28 | Prior bounded scan | INCOMPLETE | Root scan incomplete |
| onedrive (winrecoveryproject-digital) | 1.2.0 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| pdf (openai-primary-runtime) | 26.1112.11011 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| plugin-skill-studio (winrecoveryproject-digital) | 0.3.3 | Prior bounded scan | Complete within stated scope | 0 / 13 / 2 |
| powershell-workbench (winrecoveryproject-digital) | 0.9.0-beta.2 | Prior bounded scan | Complete within stated scope | 0 / 15 / 13 |
| presentations (openai-primary-runtime) | 26.1112.11011 | Prior bounded scan | Complete within stated scope | 1 / 0 / 0 |
| spreadsheets (openai-primary-runtime) | 26.1112.11011 | Prior bounded scan | Complete within stated scope | 1 / 1 / 0 |
| template-creator (openai-primary-runtime) | 26.1112.11011 | Prior bounded scan | Complete within stated scope | 0 / 0 / 1 |
| vercel (winrecoveryproject-digital) | 0.21.4 | Prior bounded scan | Complete within stated scope | 0 / 10 / 10 |
| windows-dism-update-docs (winrecoveryproject-digital) | 0.1.3 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| winrecoveryproject-devsuite (winrecoveryproject-digital) | 0.1.0 | Final release + installed parity | Complete within stated scope | 0 / 0 / 0 |
| winrecoveryproject-linter (winrecoveryproject-digital) | 0.1.0 | Final release + installed parity | Complete within stated scope | 0 / 0 / 0 |
| codex-coordinator (created-by-me-remote) | 0.4.0 | Prior bounded scan | Complete within stated scope | 0 / 1 / 0 |
| codex-dev-workflows (created-by-me-remote) | 0.4.2 | Prior bounded scan | Complete within stated scope | 0 / 9 / 0 |
| codex-engineering-guardrails (created-by-me-remote) | 1.1.1 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| codex-process-jobs (created-by-me-remote) | 0.5.2 | Prior bounded scan | Complete within stated scope | 0 / 1 / 0 |
| OneDrive App wrapper (created-by-me-remote) | 1.2.0 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| plugin-skill-studio (created-by-me-remote) | 0.3.3 | Prior bounded scan | Complete within stated scope | 0 / 2 / 2 |
| zilvereyes-context-handoff (created-by-me-remote) | 0.3.4+zilvereyes.1 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| browser (openai-bundled) | 26.1111.21308 | Prior bounded scan | INCOMPLETE | 1 / 0 / 0 |
| unified-computer-use (openai-bundled) | 26.1111.21308 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| chrome (openai-bundled) | 26.1111.21308 | Prior bounded scan | INCOMPLETE | 1 / 0 / 0 |
| visualize (openai-bundled) | 1.0.97 | Prior bounded scan | INCOMPLETE | 1 / 0 / 0 |
| linear (winrecoveryproject-digital) | 5.0.1 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| github (winrecoveryproject-digital) | 0.1.12 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |

| Host-provided extra root, not catalog-installed | Version | Evidence | Coverage | Raw counts |
|---|---|---|---|---|
| advisor (openai-curated-remote) | 1.4.10 | New static scan | Complete within stated scope | 0 / 0 / 0 |
| agentmemory (openai-curated-remote) | 0.9.30 | New static scan | Complete within stated scope | 0 / 16 / 1 |
| Knowledge for Agents (openai-curated-remote) | 0.7.4 | New static scan | Complete within stated scope | 0 / 6 / 0 |
| cloud-environment (openai-curated-remote) | 0.2.1 | Prior bounded scan | Complete within stated scope | 0 / 3 / 1 |
| coderabbit (openai-curated-remote) | 1.1.4 | New static scan | Complete within stated scope | 1 / 0 / 0 |
| codex-engineering-guardrails (openai-curated-remote) | 1.1.1 | New static scan | Complete within stated scope | 0 / 0 / 0 |
| defense-factory (openai-curated-remote) | 0.1.11 | Prior bounded scan | Complete within stated scope | 0 / 0 / 3 |
| game-development-studio (openai-curated-remote) | 1.0.2 | New static scan | Complete within stated scope | 0 / 0 / 0 |
| google-drive (openai-curated-remote) | 0.1.23 | Prior bounded scan | Complete within stated scope | 0 / 1 / 0 |
| openai-developers (openai-curated-remote) | 1.3.16 | Prior bounded scan | Complete within stated scope | 0 / 4 / 0 |
| openai-templates (openai-curated-remote) | 0.1.1 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| pages (openai-curated-remote) | 0.1.26 | Prior bounded scan | Complete within stated scope | 0 / 1 / 0 |
| plugin-creator-plus (openai-curated-remote) | 0.1.1 | New static scan | Complete within stated scope | 0 / 0 / 0 |
| plugin-creator (openai-curated-remote) | 0.1.28 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| plugin-eval (openai-curated-remote) | 0.1.2 | New static scan | Complete within stated scope | 0 / 0 / 2 |
| plugin-management (openai-curated-remote) | 0.1.0 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| sites (openai-curated-remote) | 1.1.6 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
| skill-craft (openai-curated-remote) | 1.3.0 | New static scan | Complete within stated scope | 0 / 0 / 0 |
| skillquiver (openai-curated-remote) | 2.1.0 | New static scan | Complete within stated scope | 0 / 0 / 0 |
| vercel (openai-curated-remote) | 0.54.1 | Prior bounded scan | Complete within stated scope | 0 / 8 / 1 |
| visualize (openai-curated-remote) | 1.0.103 | Prior bounded scan | INCOMPLETE | 1 / 0 / 0 |
| work-pets (openai-curated-remote) | 0.1.6 | Prior bounded scan | Complete within stated scope | 0 / 0 / 0 |
