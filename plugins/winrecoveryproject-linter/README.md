# WinRecoveryProjectLinter

Version 0.1.3. An independent MIT local CLI and Codex plugin by Zilvereyes.
Scan selected source types without running project scripts or changing source.
Paid service budget: **0 kr**. No cloud account, API key, telemetry or model API.

## Requirements and first use

Node >=24 is required. A fresh plugin extraction can run `help`, `init`,
`list-linters` and `doctor` before dependencies are installed. Missing parser
libraries produce INCOMPLETE with an explicit setup instruction.

```powershell
node ./bin/wrp-lint.mjs list-linters
node ./bin/wrp-lint.mjs doctor "C:/path with spaces/project" --format json
node ./bin/wrp-lint.mjs setup "C:/path with spaces/project" --detected
node ./bin/wrp-lint.mjs scan "C:/path with spaces/project" --format json
```

`setup` is explicit and is the only command that downloads tools. It installs
locked Node libraries into a separate per-user runtime cache using npm ci with
scripts disabled, the public registry and trusted empty npm config files.
It never runs npm in the inspected project. Node must include npm.
The cache lives outside the versioned plugin installation: Windows uses
`%LOCALAPPDATA%/WinRecoveryProjectLinter/runtimes`, macOS uses
`~/Library/Caches/WinRecoveryProjectLinter/runtimes`, and Linux uses
`$XDG_CACHE_HOME/WinRecoveryProjectLinter/runtimes` or
`~/.cache/WinRecoveryProjectLinter/runtimes`. A process-local
`WRP_LINT_RUNTIME_CACHE` override supports isolated verification; the product
never persists environment or global configuration changes.

Explicit setup prepares a private staging directory and publishes READY only
after successful verification and atomic rename. The exact locked dependency
graph, platform, architecture and Node major version select the Node runtime;
the Blinter key also includes the observed Python executable/version/base-prefix,
implementation, cache tag, SOABI and free-threaded ABI flag. A product-only
version or plugin-path change can reuse the same verified runtime. A changed
dependency lock, missing READY, changed selected entry or physical-path mismatch
cannot. Scans and doctor perform no installation, migration or repair. Explicit
setup retains a rejected cache in quarantine and never stops another setup;
a stale setup lock requires inspection rather than automatic process killing.

Staging leaves use a short kind/UUID name to keep Windows installer paths short;
the final directory and READY receipt retain the complete contract fingerprint.
Setup keeps one result per selected adapter and continues independent tools after
a preparation failure. `available` describes the observed adapter; `setupSucceeded`
also requires that the requested preparation succeeded. Any failed preparation
keeps exit code 2 even when an older working adapter remains available.

Verification checks the exact lock graph/pins and bounded selected module-entry,
package-metadata or tool hashes with contained physical paths. This is local
corruption/readiness evidence, not an authenticity attestation or a hash of every
transitive source file. It does not hash the entire dependency tree for each
family probe. An older explicitly prepared plugin-local dependency directory
remains usable only with exact versions and physically contained resolution;
it is never copied or silently migrated to the durable cache.
Marketplace distribution uses the owned native ZIP packager, which explicitly
includes both `package-lock.json` and the identical `npm-shrinkwrap.json`.
Actual npm 12.2.0 tarballs omitted both lockfiles despite the files whitelist;
an npm pack dry run was insufficient evidence. Do not use that tarball as the
Marketplace/native artifact or assume its dependency bootstrap is reproducible.
For a development checkout, `npm ci --ignore-scripts` also prepares dependencies.
No global install or global configuration change is needed. You may run the
packaged `bin/wrp-lint.mjs` directly; npm also exposes the `wrp-lint` bin.

```powershell
node ./bin/wrp-lint.mjs init "C:/my/project" --types powershell,lua,toc
node ./bin/wrp-lint.mjs scan "C:/my/project" --types powershell,lua,toc
node ./bin/wrp-lint.mjs setup "C:/my/project" --types batch,bash
```

`init` creates `.wrp-lint.json` with exclusive creation and refuses overwrites.
The JSON data schema accepts `version: 1`, optional `types`, `sqlDialect`, and `exclude`
as an array of plain relative paths. Executable configuration and custom tool
commands are unsupported. No scan command automatically creates configuration.

## Coverage

| ID | Source | Checks |
| --- | --- | --- |
| powershell | ps1, psm1, psd1 | PowerShell parser plus six selected built-in PSScriptAnalyzer 1.25.0 rules |
| javascript | js, mjs, cjs, jsx | TypeScript 6.0.3 checkJs syntax/types with standard libraries; no-eval/no-debugger |
| typescript | ts, tsx, mts, cts | TypeScript 6.0.3 syntax and semantic compiler diagnostics with standard libraries |
| batch | bat, cmd | Separate Blinter 1.1.66 static analysis, never cmd /c |
| bash | sh, bash, extensionless Bash/sh shebang | Bash syntax plus ShellCheck 0.11.0 |
| json | json, jsonc | jsonc-parser 3.3.1; strict JSON or comments/trailing commas in jsonc |
| markdown | md, markdown | markdownlint 0.40.0, paired with markdownlint-cli 0.48.0 |
| lua | lua | luaparse 0.3.1 with strict Lua 5.1 grammar |
| xml | xml | saxes 6.0.0 well-formedness; DTDs rejected, no external entities |
| html | html, htm | parse5 8.0.0 WHATWG HTML document parser diagnostics |
| css | css | css-tree 3.1.0 CSS syntax parser and recovery diagnostics |
| toc | toc | Interface/Title metadata and safe file references; flavor metadata/attributes recognized |
| yaml | yaml, yml | js-yaml 4.1.1 data parsing with JSON schema |
| toml | toml | smol-toml 1.6.0 data parsing |
| python | py, pyi | Existing Python 3.11–3.15 AST syntax parser |
| sql | sql | Explicit PostgreSQL 18 SQL/PLpgSQL syntax through libpg-query 18.2.4 WebAssembly; no database execution |

SQL needs an explicit dialect. Use `--sql-dialect postgresql` with `scan`,
`doctor`, `setup` or `init`, or set `"sqlDialect": "postgresql"` in
`.wrp-lint.json`. Missing/unknown dialects, including SQLite/MySQL/SQL Server,
report INCOMPLETE rather than silently using PostgreSQL. The parser implements
PostgreSQL 18 grammar; it does not discover a server version or validate schema,
types, permissions, query plans or migration safety against a database.

SQL source is parsed in a separate fixed process with a 30-second per-file
timeout and the existing 2 MiB source limit. The V8 heap flag is not a total
WASM/RSS memory limit. Only verified local parser/loader/WASM assets are loaded;
SQL, DB clients, target configuration, templates and external URLs never execute.
SQL-language literal bodies and PL/pgSQL routines/DO blocks receive additional
static syntax checks. Unsupported routine languages or generated dynamic SQL
are explicit INCOMPLETE coverage gaps. PL/pgSQL errors without source cursors
use an identified outer-source anchor; SQL-body diagnostics include the inner
body position and identify the outer statement anchor.

The default selects detected supported source types. `--types` or config `types`
narrows this selection; omitted detected families remain visible in notices.
YAML, TOML and Python adapters run only when detected or explicitly selected.
Recognized unsupported source formats (including SCSS/Less and Bats) are
listed as INCOMPLETE. Images, archives and unknown non-source files are ignored.

PowerShell requires an existing trusted pwsh >=7.4.6 and PSScriptAnalyzer 1.25.0.
The wrapper imports only that exact version and uses parser input snapshots and
`Invoke-ScriptAnalyzer -ScriptDefinition` with a fixed built-in rule allowlist.
It does not download PowerShell modules or resolve DSC dependencies.

Batch setup creates its separate durable Python venv and installs
the pinned Blinter and charset-normalizer wheels with PyPI SHA-256 hashes.
Blinter is AGPL-3.0-or-later, independently installed, and is not included in
the MIT distributable. Python itself must already exist.

On Windows, Bash setup installs checksum-pinned official ShellCheck 0.11.0
into its selected durable runtime; Git Bash/GNU Bash must already exist. Other platforms
must provide ShellCheck 0.11.0 separately. Missing runtimes are reported with
INCOMPLETE and are never silently downloaded or replaced.

## Result contract

| Exit | Status | Meaning |
| --- | --- | --- |
| 0 | CLEAN | No findings within selected checks and documented limits |
| 1 | FINDINGS | At least one real parser/linter finding |
| 2 | INCOMPLETE | A required tool/check/file failed, unsupported source was detected, or inventory was empty |

INCOMPLETE takes precedence over findings. A missing explicitly selected tool
cannot return CLEAN even if no files of that type exist. JSON reports contain
coverage, findings, limits, skipped/deferred notices and incomplete reasons.
`doctor` checks availability only; it does not certify source correctness.
No findings are automatically fixed and all warning levels count as findings.

## Trust boundaries and limits

- Scans read Git tracked and nonignored untracked paths using `git ls-files`;
  Git hooks/fsmonitor are disabled. Outside Git, a bounded filesystem walk is used.
- Symlinks/reparse paths are skipped. `.git`, `node_modules`, `.venv`, `.tools`,
  vendor/build/dist/generated/archive/coverage directories and `old_`/`old-`
  directories are excluded. Exact config path exclusions are additive.
- Limits are 10,000 source files, 2 MiB per source snapshot, 30-second external
  process deadlines and 4 MiB combined process output. Limit failures are visible.
- External processes use absolute trusted executable discovery, argument arrays,
  `shell: false`, hidden windows and a sanitized environment. Target code,
  project scripts, executable configuration and custom linter rules never run.
- JS/TS uses fixed compiler options, snapshots, relative source imports, trusted
  TypeScript standard libraries and pinned Node 24 declarations. It ignores
  tsconfig and project node_modules.
  Framework and third-party package types are not loaded; unresolved dependencies
  are compiler findings, not fabricated coverage. This is a controlled compiler
  profile rather than full ESLint/React/project-build equivalence.
- Markdown custom configs/rules and inline suppression directives are disabled;
  MD013 is off and MD024 checks siblings. JSON schema validation and full Lua
  semantic/global analysis are outside this release's parser coverage.
- HTML uses the WHATWG document parser, including missing-DOCTYPE and duplicate
  attribute diagnostics. Legal HTML recovery and omitted end tags are not
  invented errors. This is parser coverage, not accessibility or browser testing;
  embedded JS/CSS is not separately linted. CSS reports syntax/parser recovery
  errors, not property-value compatibility with every browser. Script tags,
  stylesheets, imports, URLs and project configurations are never executed or
  fetched by either parser. HTML/CSS run only when detected or explicitly selected.
- TOC `[Game]` and `[TextLocale]` token paths are deferred notices, since their
  runtime substitutions cannot be proven statically. They are not called missing.
- Files are not an operating-system snapshot: avoid changing them during scans.
  Large repositories should use a narrower root or explicit exclusions.

## Development

```powershell
npm ci --ignore-scripts
npm test
npm run check
npm run verify:runtime
npm run package:native
```

Tests exercise real parsers and installed external tools with positive/negative
fixtures, CRLF, Danish names, paths with spaces, TOC tokens, dependency failures,
fresh extraction, read-only behavior, process limits and symlink containment.
`package:native` uses Python >=3.11 standard library only. The explicit file
whitelist in `config/native-package.json` includes both locks, native metadata,
skills, CLI, source, tests, branding and legal files. It rejects symlinks/reparse
paths, path traversal, private user paths, changed files and inconsistent locks.
ZIP members are sorted, timestamps/modes fixed, and storage uncompressed to
avoid zlib-version-dependent output. It writes the native ZIP and a SHA-256
file manifest into `outputs/`; dependencies, tools, receipts and unlisted files
are excluded. Repeated packaging of identical source bytes produces identical
ZIP bytes. Publish this native ZIP after reviewing its actual member manifest.

`verify:runtime` builds the real native ZIP, validates its actual members,
extracts that ZIP to a new directory, proves missing library failures, explicitly
bootstraps its locked dependencies and then scans Lua/HTML/CSS fixtures. It never
copies locks around a broken artifact or borrows the original node_modules.
To prove a specific built ZIP, run
`node scripts/verify-fresh-runtime.mjs outputs/winrecoveryproject-linter-0.1.3.zip`.
Unavailable external tools are explicitly skipped by the portable test suite;
check the actual test receipt before claiming coverage for a machine.

No MegaLinter implementation was copied. Its public catalog/descriptors and
upstream language documentation informed adapter selection. See
[third-party notices](THIRD-PARTY-NOTICES.md), [privacy](PRIVACY.md) and
[terms](TERMS.md).

Public source metadata targets
[WinRecoveryProject/WinRecoveryProjectLinter](https://github.com/WinRecoveryProject/WinRecoveryProjectLinter).
Remote repository availability and publication are verified separately from the
local CLI tests. [Privacy](https://github.com/WinRecoveryProject/WinRecoveryProjectLinter/blob/main/PRIVACY.md)
and [terms](https://github.com/WinRecoveryProject/WinRecoveryProjectLinter/blob/main/TERMS.md)
use that same public source location.

Version 0.1.1 returns INCOMPLETE when no source types are selected or no selected source files can be checked. A zero-check scan never reports CLEAN. Run the explicit local setup after a fresh installation to prepare the selected tools.
