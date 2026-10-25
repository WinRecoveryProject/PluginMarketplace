# CloudStorage skill evaluation — 2026-10-25

## Scope and method

This assessment compares the active CloudStorage Portal and CloudStorage OneDrive skills with the 18 OneDrive-, Graph- and cloud-OAuth-related candidates under `C:\Users\zilve\.agents\skills`. The generic `find-skills` helper is outside the CloudStorage scope and was not scored as a provider candidate.

Every candidate was analyzed with the installed Plugin Eval runner. The score measures structural quality, token cost, broken links and common skill conventions. It does **not** prove that a skill uses the correct backend, identity, OAuth grant, App ID or safety boundary. Architectural compatibility is therefore evaluated separately.

No candidate was installed, copied into an active plugin or allowed to execute. No account, connection, token, marketplace or installed plugin was changed.

## Current CloudStorage baseline

| Skill | Score | Grade | Risk | Lines | Trigger | Invoke | Deferred | Principal finding |
| --- | ---: | :---: | :---: | ---: | ---: | ---: | ---: | --- |
| Standalone `cloudstorage-onedrive` | 100 | A | Low | 17 | 39 | 336 | 0 | No scored defect; coverage artifact unavailable |
| Portal `cloudstorage-portal` | 67 | D | High | 43 | 78 | 1,749 | 10,126 | Excessive invoke and deferred cost; weak trigger wording |
| Portal `cloudstorage-connections` | 81 | C | High | 25 | 56 | 1,430 | Heavy invoke cost; weak trigger wording |
| Portal `cloudstorage-onedrive` | 81 | C | High | 42 | 59 | 2,267 | Heavy invoke cost; weak trigger wording |

The standalone OneDrive skill is already the cleanest routing layer. The Portal skills are functionally aligned with the owned runtime, but should later be shortened and split into narrowly selected references. That is a documentation/refactoring task; it does not justify replacing the owned runtime with a third-party skill.

## Candidate scores and disposition

| Candidate folder | Score | Grade | Risk | Invoke / deferred tokens | Architectural disposition |
| --- | ---: | :---: | :---: | ---: | --- |
| `add-onedrive` | 77 | C | High | 707 / 0 | Reject as runtime; Power Apps connector workflow. Broken shared link. |
| `add-onedrive(1)` | 81 | C | High | 164 / 0 | Reject as runtime; thin Power Apps `/add-data-source` wrapper with missing dependency. |
| `dropbox-oauth-app` | 67 | D | High | 7,140 / 0 | Reference only; extract provider-neutral OAuth checks after current-source verification. Do not import its Unified.to-specific redirect and secret workflow. |
| `google-drive-oauth-app` | 72 | C | High | 4,577 / 0 | Reference only; useful scope, verification and shared-drive checklist. It depends on a missing base registration skill. |
| `m365-onedrive` | 81 | C | High | 2,098 / 0 | Reference only; operation and version semantics may inform a backlog. Do not add the m365 CLI execution route. |
| `microsoft-graph-gateway` | 63 | D | High | 1,670 / 7,469 | Reference only; routing and exact-endpoint guidance may be adapted. Do not add its VS Code/local-runner substrate. |
| `microsoft-onedrive` | 81 | C | High | 2,378 / 0 | Reference only; Graph operation catalogue is useful. Do not add its Bash/external-connection runtime. |
| `microsoft-onedrive-oauth-app` | 67 | D | High | 8,318 / 0 | High-value security reference only; permission blast-radius, delta and upload-session guidance require source-by-source verification before adaptation. |
| `microsoft-onedrive(1)` | 40 | F | High | 4,433 / 57,247 | Test/spec donor only; Zapier connector package, broken links and very high deferred cost. Never install as a CloudStorage skill unchanged. |
| `ms-onedrive-personal-graph` | 91 | B | Medium | 813 / 0 | Reject as runtime; separate device-code flow and locally stored tokens bypass the Portal identity and connection model. |
| `onedrive` | 81 | C | High | 2,047 / 0 | Reject; Membrane account and proxy runtime. |
| `onedrive(1)` | 86 | B | Medium | 830 / 0 | Reject; ClawLink-hosted connection runtime. |
| `onedrive(2)` | 77 | C | High | 2,694 / 483 | Reference only; generic Graph capability examples, not an owned execution surface. |
| `onedrive(3)` | 95 | A | Medium | 238 / 0 | Reject despite A score; requires a raw `MICROSOFT_ACCESS_TOKEN` environment variable. |
| `onedrive(4)` | 95 | A | Medium | 237 / 68 | Reject despite A score; duplicate direct-token implementation. |
| `onedrive(5)` | 67 | D | High | 2,215 / 0 | Reject; Apideck unified API runtime and broken relative links. |
| `onedrive(6)` | 91 | B | Medium | 463 / 111 | Reject; Refly workflow and Claude-specific base dependency. |
| `onedrive-search` | 95 | A | Medium | 322 / 0 | Concept donor only; focused search flow is useful, but it depends on a raw token and missing `/snow-setup` workflow. |

## What should be reused

The following ideas are compatible with the direction of the owned CloudStorage runtime, but only after the matching MCP tool, granted scope and tests exist:

- bounded search with account, drive, query and cursor identity kept together;
- drive-item lookup by immutable ID and explicit drive ID;
- share-link resolution and clear handling of remote/shared items;
- resumable upload sessions, explicit conflict behavior and post-write read-back;
- delta cursors with full resynchronization on stale-token responses;
- version listing and restore semantics;
- separate permission inspection, sharing, invitation and revocation operations;
- explicit confirmation gates for overwrite, delete, external sharing and permission changes;
- Graph-specific handling of throttling, retry-after, partial success and asynchronous copy status;
- separate treatment of consumer OneDrive, Entra work/school OneDrive, SharePoint libraries and local sync folders.

The Zapier-derived `microsoft-onedrive(1)` package is the richest source of executable examples and tests for these concepts, but it is not a drop-in skill. Any later code adaptation needs a separate license/provenance review and must be rewritten against the CloudStorage MCP runtime.

## Immediate recommendations

1. Keep the existing standalone CloudStorage OneDrive skill as the dedicated OneDrive entry point.
2. Keep CloudStorage Portal as the three-provider router; do not add any of the duplicate `onedrive` or `microsoft-onedrive` skill names.
3. Refactor the three Portal routing skills for progressive disclosure before adding more capability prose.
4. Add future OneDrive operations backend-first: implement and verify an MCP tool, then document it in the skill. Do not promise a capability merely because a candidate skill describes it.
5. Treat the OAuth-app skills as research notes, not automation. Reverify volatile permissions, verification rules and portal behavior against primary provider documentation before changing permanent app configuration.
6. Preserve the current ChatGPT App binding `asdk_app_6ade878e235c8191b19c6f72fc31981a`; no Entra application/client ID should be converted into an `asdk_app_...` value. The earlier `asdk_app_6ade0fe240408191bd087bff2df78e79` binding was deleted and replaced on 25 October 2026.

The provider packaging comparison and controlled simplification path are documented in `provider-architecture-comparison-2026-10-25.md`.

## Decision

None of the 18 candidates should be installed or copied wholesale. The current CloudStorage skills remain canonical. Nine candidates contain useful requirements or test ideas, but those ideas should enter the project through reviewed, provider-neutral references or through new MCP implementation work—not through another competing OneDrive plugin instance.
