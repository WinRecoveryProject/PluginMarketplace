# Installed plugin, App, MCP and skill audit — 17 November 2026

Plugin-Skill-Studio 0.3.4 reviewed **56 plugin roots**: 34 catalog-installed packages and 22 host-discovered extra roots. Native discovery contains **554 unique skill paths**, 28 standalone skills, 26 Apps and 8 MCP registrations. There are zero native loader errors and zero incomplete static root scans.

## Repairs and tests

- Studio 0.3.4 detects PowerShell download-to-execution aliases in both engines, versions the changed risk rule, accepts LF/CRLF in self-check and supports explicit bounded scan budgets. All 106 tests passed.
- Workbench 0.9.0-beta.3 improves activation wording and research-only boundaries in 28 skills. All 22 component tests and structural/PowerShell parser checks passed, including the canonical release tree.
- Existing CodeRabbit 1.1.7-wrp.1 remains the active corrected entrypoint; unsafe host 1.1.4 remains disabled.
- Source, Marketplace and installed package parity and provider preservation are recorded in the delivery receipt. No Workspace switch was required.

## Coverage boundaries

The previous five repository/per-file limits are now closed under the same rules using explicit budgets of 8 MiB per text file and 128 MiB per root for those five roots. Defaults remain unchanged for other roots. Binary formats and text types outside the evaluator rules are not parsed or certified. Full static coverage is not proof that every workflow or provider operation works.

## Retained upstream evidence

The exact finding ledger preserves raw severities and source fingerprints. Detector expressions, regression inputs and documented placeholders are identified by their concrete source locations. Uppercase host-owned skill names load natively and retain portability advisories. Heading, trigger wording, context length and boundary heuristics remain visible; missing runtime behavior is not invented.

MegaLinter is a reference and is not installed by our Marketplace. Its newly completed repository scan exposes upstream download/build recipes and unrelated Claude examples. The recipes remain execution risks if run: they were not executed, are not imported into WinRecoveryProjectLinter, and need separate execution review. This report does not waive those findings or claim an upstream repair.

## Runtime and connection evidence

Read-only checks succeeded through existing OneDrive, Dropbox, Google Drive, GitHub and Vercel connections. No files were written by those checks. All existing App enabled/callable states and the MCP registration set are preserved. The daybreak-local declaration is intentionally disabled (`enabled=false`, `enabled_tools=[]`), with no enabling override observed. Its deactivation is preserved; runtime startup is not claimed. Other Apps have registration evidence, not an invented exhaustive functional test.

## Installed and host-discovered roots

| Root | Version | Installed | Static errors / warnings / info |
|---|---|---:|---|
| documents@openai-primary-runtime | 26.1112.11011 | Yes | 0 / 1 / 0 |
| pdf@openai-primary-runtime | 26.1112.11011 | Yes | 0 / 0 / 0 |
| spreadsheets@openai-primary-runtime | 26.1112.11011 | Yes | 1 / 1 / 0 |
| presentations@openai-primary-runtime | 26.1112.11011 | Yes | 1 / 0 / 0 |
| template-creator@openai-primary-runtime | 26.1112.11011 | Yes | 0 / 0 / 1 |
| browser@openai-bundled | 26.1111.21308 | Yes | 0 / 0 / 0 |
| unified-computer-use@openai-bundled | 26.1111.21308 | Yes | 0 / 0 / 0 |
| chrome@openai-bundled | 26.1111.21308 | Yes | 0 / 0 / 0 |
| computer-use@openai-bundled | 26.1111.21308 | Yes | 0 / 1 / 0 |
| visualize@openai-bundled | 1.0.97 | Yes | 0 / 0 / 0 |
| megalinter@megalinter | 1.0.28 | Yes | 24 / 0 / 0 |
| onedrive@winrecoveryproject-digital | 1.2.0 | Yes | 0 / 0 / 0 |
| cloudstorage-portal@winrecoveryproject-digital | 0.9.3 | Yes | 0 / 0 / 0 |
| component-forge@winrecoveryproject-digital | 0.1.2 | Yes | 0 / 0 / 0 |
| plugin-skill-studio@winrecoveryproject-digital | 0.3.4 | Yes | 0 / 14 / 0 |
| powershell-workbench@winrecoveryproject-digital | 0.9.0-beta.3 | Yes | 0 / 0 / 0 |
| windows-dism-update-docs@winrecoveryproject-digital | 0.1.3 | Yes | 0 / 0 / 0 |
| codex-security@winrecoveryproject-digital | 0.1.32 | Yes | 0 / 0 / 3 |
| linear@winrecoveryproject-digital | 5.0.1 | Yes | 0 / 0 / 0 |
| codex-engineering-guardrails@winrecoveryproject-digital | 1.1.1 | Yes | 0 / 0 / 0 |
| vercel@winrecoveryproject-digital | 0.21.4 | Yes | 0 / 10 / 10 |
| github@winrecoveryproject-digital | 0.1.12 | Yes | 0 / 0 / 0 |
| google-drive@winrecoveryproject-digital | 0.1.15 | Yes | 0 / 0 / 0 |
| dropbox@winrecoveryproject-digital | 5.0.1 | Yes | 0 / 0 / 0 |
| winrecoveryproject-linter@winrecoveryproject-digital | 0.1.0 | Yes | 0 / 0 / 0 |
| winrecoveryproject-devsuite@winrecoveryproject-digital | 0.1.0 | Yes | 0 / 0 / 0 |
| coderabbit@winrecoveryproject-digital | 1.1.7-wrp.1 | Yes | 0 / 0 / 0 |
| codex-dev-workflows@created-by-me-remote | 0.4.2 | Yes | 0 / 9 / 0 |
| codex-coordinator@created-by-me-remote | 0.4.0 | Yes | 0 / 1 / 0 |
| zilvereyes-context-handoff@created-by-me-remote | 0.3.4+zilvereyes.1 | Yes | 0 / 0 / 0 |
| codex-process-jobs@created-by-me-remote | 0.5.2 | Yes | 0 / 1 / 0 |
| plugin-skill-studio@created-by-me-remote | 0.3.4 | Yes | 0 / 2 / 0 |
| codex-engineering-guardrails@created-by-me-remote | 1.1.1 | Yes | 0 / 0 / 0 |
| dev-6ae8b541a3d08191ae893ea0925a2fe5@created-by-me-remote | 1.2.0 | Yes | 0 / 0 / 0 |
| advisor@openai-curated-remote | 1.4.10 | Host extra | 0 / 0 / 0 |
| agentmemory@openai-curated-remote | 0.9.30 | Host extra | 0 / 16 / 1 |
| app-6aa47394ea708191bcef52a7c4bda7a2@openai-curated-remote | 0.7.4 | Host extra | 0 / 6 / 0 |
| cloud-environment@openai-curated-remote | 0.2.1 | Host extra | 0 / 3 / 1 |
| coderabbit@openai-curated-remote | 1.1.4 | Host extra | 1 / 0 / 0 |
| codex-engineering-guardrails@openai-curated-remote | 1.1.1 | Host extra | 0 / 0 / 0 |
| defense-factory@openai-curated-remote | 0.1.11 | Host extra | 0 / 0 / 3 |
| game-development-studio@openai-curated-remote | 1.0.2 | Host extra | 0 / 0 / 0 |
| google-drive@openai-curated-remote | 0.1.23 | Host extra | 0 / 1 / 0 |
| openai-developers@openai-curated-remote | 1.3.16 | Host extra | 0 / 4 / 0 |
| openai-templates@openai-curated-remote | 0.1.1 | Host extra | 0 / 0 / 0 |
| pages@openai-curated-remote | 0.1.26 | Host extra | 0 / 1 / 0 |
| plugin-creator-plus@openai-curated-remote | 0.1.1 | Host extra | 0 / 0 / 0 |
| plugin-creator@openai-curated-remote | 0.1.28 | Host extra | 0 / 0 / 0 |
| plugin-eval@openai-curated-remote | 0.1.2 | Host extra | 0 / 0 / 2 |
| plugin-management@openai-curated-remote | 0.1.0 | Host extra | 0 / 0 / 0 |
| sites@openai-curated-remote | 1.1.6 | Host extra | 0 / 0 / 0 |
| skill-craft@openai-curated-remote | 1.3.0 | Host extra | 0 / 0 / 0 |
| skillquiver@openai-curated-remote | 2.1.0 | Host extra | 0 / 0 / 0 |
| vercel@openai-curated-remote | 0.54.1 | Host extra | 0 / 8 / 1 |
| visualize@openai-curated-remote | 1.0.103 | Host extra | 0 / 0 / 0 |
| work-pets@openai-curated-remote | 0.1.6 | Host extra | 0 / 0 / 0 |

## Apps

| App | Enabled | Callable |
|---|---:|---:|
| Code Tytor: Python | true | true |
| Linear | true | true |
| Pocket FM | true | true |
| Create State | true | true |
| Remote Desktop Commander | true | true |
| Knowledge for Agents | true | true |
| OneDrive | true | true |
| Microsoft SharePoint | true | true |
| Sites | true | true |
| Gmail | true | true |
| OpenAI Platform | true | true |
| Google Drive | true | true |
| Vercel | true | true |
| GitHub | true | true |
| Google Calendar | true | true |
| Google Contacts | true | true |
| Pets | true | true |
| Codex Document Control | true | true |
| Codex Security Access | true | true |
| Daybreak Defense Factory | true | true |
| Hotline | true | true |
| ChatGPT Space | true | true |
| Plugin Creator | true | true |
| Plugin Management | true | true |
| Safety Settings | true | true |
| Search Service | true | true |

## MCP registrations

| Server | Tools | Observed scope |
|---|---:|---|
| codex-security | 47 | Tool discovery |
| codex_apps | 925 | Tool discovery |
| cua_repl | 3 | Tool discovery |
| daybreak-local | 0 | Intentionally disabled by vendor declaration; deactivation preserved |
| dropbox | 41 | Tool discovery |
| node_repl | 4 | Tool discovery |
| openai-api-credit-promo | 3 | Tool discovery |
| openai-api-key-local-confirmation | 3 | Tool discovery |

[Machine-readable summary](installed-audit-20261117.json) · [Exact finding ledger](installed-audit-findings-20261117.json) · [Delivery receipt](installed-audit-delivery-20261117.json)

Budget: **0 kr.** No paid service, trial, credits, new account or new consent was used.

## Goal follow-up

The [active worklist](GOAL-WORKLIST-20261117.md) tracks the remaining authorized
tasks. Four previously grouped upstream credential-pattern findings are explicit
documentation placeholders, verified at exact source locations. The 13 actual
download/build recipes were each rejected by Studio before any installation
destination was created; no recipe or endpoint was executed.

A separate safe temporary installation reproduced a new metadata defect: Studio
0.3.4 writes installerVersion 0.3.0 in its receipt. This is an open product
finding, tracked as G03, alongside the stale Portal setup wording tracked as G07.
The earlier 128 passing tests remain their recorded scope and do not establish
that these new cases passed.
