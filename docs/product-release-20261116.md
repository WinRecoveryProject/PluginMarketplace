# WinRecoveryProject developer tools — 16 November 2026

## Validated package snapshots

| Product | Version | Independent source |
| --- | --- | --- |
| WinRecoveryProjectLinter | 0.1.0 | [Source](https://github.com/WinRecoveryProject/WinRecoveryProjectLinter) |
| WinRecoveryProject DevSuite | 0.1.0 | [Source](https://github.com/WinRecoveryProject/WinRecoveryProject-DevSuite) |
| CloudStorage Portal | 0.9.3 | [Source](https://github.com/WinRecoveryProject/CloudStorage-Portal) |

`plugin-sources.lock.json` records immutable source revisions, versions and exact
SHA-256 file maps. Marketplace delivery uses the contained snapshots. A future
development version must pass the same checks before replacing a working snapshot.
Public OpenAI App Store submission and attestations have not been performed.

## Linter verification

The local CLI and its two packaged skills share the same implementation. A full
39-test run passed with zero skips. Real positive/negative checks cover PowerShell,
JavaScript, TypeScript, Batch/CMD, Bash, JSON/JSONC, Markdown, Lua **5.1**, XML,
HTML/HTM, CSS, TOC, YAML, TOML and Python. Read-only operation, executable-config
isolation, contained paths, process limits, missing tools and locked dependency
graphs are tested. Independent clean extraction and explicit dependency bootstrap
passed; a fresh Lua/HTML/CSS scan returned CLEAN.

The distribution excludes installed dependencies and external tools. Explicit
`setup` installs locked free dependencies in the product's own directory. Blinter
and ShellCheck have separate hash-checked installations. Existing Node, Python,
Bash and PowerShell/PSScriptAnalyzer requirements remain visible. Unsupported
formats, unavailable tools and failed checks return INCOMPLETE, never CLEAN.
This controlled compiler/parser profile is not a full project-framework build,
all-language semantic checker or security certification.

## DevSuite verification

The package contains 12 focused owned skills, a portable local evidence CLI and
MIT-adapted coordinator helpers. Its capability matrix maps 32 available source
skills to 207 function records, with 215 provenance hashes. No proprietary Codex
Security or internal Cloud Environment implementation is republished.

All 21 local contract/runtime tests passed, including coordinator state and locks,
migration compatibility, contained reports, deterministic packaging, missing and
insufficient provider access, and zero-cost/upload boundaries. The relocated
archive doctor passed. Native Desktop staging discovered all 12 skills, five real
existing App references, no added MCP server and authentication policy ON_USE.
The native response does not expose the `required` field; declared optionality is
not proof of consent or backend availability. Automatic hooks are not registered;
existing Coordinator hooks remain available during skill migration.

Deep Plugin-Skill-Studio static checks for both new deliverable snapshots have no
findings. Static readiness is separate from task success. Codex Security, cloud
compute and CloudConvert remain real external providers. Their presence alone
never establishes authentication, permission, free quota or execution. CloudConvert
conversion and provisioned cloud compute have not been executed in this release.

## Portal correction and preserved connections

Portal 0.9.3 documents the actual existing Dropbox MCP fallback alongside App
routes. It preserves all three existing App IDs and adds no duplicate MCP/OAuth
connection. Its provider validator now verifies one explicitly reviewed local
Google Docs trigger-text override against the original provenance and current
hash; unreviewed changes and forged source hashes still fail negative tests.
The hybrid package validator and boundary tests passed.

## Installed audit and deployment status

[The dated installed audit](current-installed-audit-20261116.md) represents all 31
plugins installed at the initial snapshot, 12 separately labeled host-provided
roots and 28 standalone skills. It retains raw findings and four installed scan
coverage limits. Host naming conventions, synthetic test strings and oversized
bundled scripts are not silently converted into passing results.

Both new products have unique generated logos, composer icons, favicons and
provenance. Repeated independent packaging produced identical artifact hashes.
Each contains five positive and three negative submission examples as drafts;
they do not claim public approval. MegaLinter is retained in source-reference
metadata and existing installations; it is absent from the installable catalog.

Marketplace publication, installed-cache checks and the authorized skill migration
are recorded as a subsequent observed deployment receipt. Provider connections
are preserved; no credentials are packaged, no account reset is required and the
paid-service budget remains **0 kr**.
