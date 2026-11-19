# Plugin files: winrecoveryproject-linter — manifests and top-level files

Source: `plugins/winrecoveryproject-linter`. Files outside the `skills/*` folders, embedded as text.

## File: `.gitattributes`

```text
# Preserve exact source and brand provenance bytes across platforms.
* -text
```

## File: `.gitignore`

```text
node_modules/
.tools/
coverage/
*.tgz
outputs/
```

## File: `LICENSE`

```text
MIT License

Copyright (c) 2026 Zilvereyes / WinRecoveryProject

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## File: `PRIVACY.md`

### Privacy

WinRecoveryProjectLinter 0.1.6 scans local files locally. It has no telemetry,
cloud analysis, account creation or credential requirement. It does not upload
source or reports. Reports written through shell redirection are controlled by
the user. The Codex host has its own privacy policies.

Explicit setup downloads public dependencies from npm, PyPI and official GitHub
releases. Those services receive ordinary connection metadata. Scan, doctor,
init and list-linters do not download dependencies. Third-party tools have their
own licenses and privacy behavior. No paid service is enabled.

SQL snapshots are sent only to the plugin's fixed local PostgreSQL parser
process. The parser never connects to a database, applies migrations, fetches
SQL URLs or executes SQL/project templates. Parser dependencies are downloaded
only through explicit setup, under the same pinned public-dependency policy.

## File: `README.md`

### WinRecoveryProjectLinter

Version 0.1.6. An independent MIT local CLI and Codex plugin by Zilvereyes.
Scan selected source types without running project scripts or changing source.
Paid service budget: **0 kr**. No cloud account, API key, telemetry or model API.

#### Requirements and first use

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

#### Coverage

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

On Windows, a trusted executable on PATH is preferred. When PATH discovery
fails, Linter can use Bash bundled with the selected Git for Windows installation
or locate the current user's registered Microsoft Store PowerShell package.
Absolute `WRP_LINT_BASH` and `WRP_LINT_PWSH` overrides still take precedence.

PowerShell requires an existing trusted pwsh >=7.4.6 and PSScriptAnalyzer 1.25.0.
The wrapper imports only that exact version and uses parser input snapshots and
`Invoke-ScriptAnalyzer -ScriptDefinition` with a fixed built-in rule allowlist.
It does not download PowerShell modules or resolve DSC dependencies.
The analyzer runs in batches with a 30-second limit per process. If a
multi-file batch times out, each half gets one attempt under the same limit.
Files in any half that still fails are reported as INCOMPLETE.

Batch setup creates its separate durable Python venv and installs
the pinned Blinter and charset-normalizer wheels with PyPI SHA-256 hashes.
Blinter is AGPL-3.0-or-later, independently installed, and is not included in
the MIT distributable. Python itself must already exist.

On Windows, Bash setup installs checksum-pinned official ShellCheck 0.11.0
into its selected durable runtime; Git Bash/GNU Bash must already exist. Other platforms
must provide ShellCheck 0.11.0 separately. Missing runtimes are reported with
INCOMPLETE and are never silently downloaded or replaced.

#### Result contract

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

#### Trust boundaries and limits

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

#### Development

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
`node scripts/verify-fresh-runtime.mjs outputs/winrecoveryproject-linter-0.1.6.zip`.
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

## File: `TERMS.md`

### Terms

The original WinRecoveryProjectLinter code is provided under the MIT license.
The software is provided as-is without warranty. A CLEAN report describes only
the selected checks, tool versions and documented limits; it is not a guarantee
of correctness, safety or compatibility. Keep normal code review and tests.

Separately installed tools retain their own licenses. Blinter is
AGPL-3.0-or-later; it is downloaded separately into a local isolated environment
and is not relicensed under MIT. Public dependency downloads may consume data;
this product does not enable paid services or subscriptions.

## File: `THIRD-PARTY-NOTICES.md`

### Third-party notices and provenance

Original adapter/orchestration code: MIT, copyright 2026 Zilvereyes /
WinRecoveryProject. No MegaLinter source code or templates are incorporated.
MegaLinter is AGPL-3.0 and was consulted as a public adapter catalog only.

| Dependency | Pin | License | Primary source |
| --- | --- | --- | --- |
| TypeScript | 6.0.3 | Apache-2.0 | <https://github.com/microsoft/TypeScript/tree/v6.0.3> |
| @types/node | 24.10.1 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node> |
| luaparse | 0.3.1 | MIT | <https://github.com/fstirlitz/luaparse/tree/v0.3.1> |
| jsonc-parser | 3.3.1 | MIT | <https://github.com/microsoft/node-jsonc-parser> |
| js-yaml | 4.1.1 | MIT | <https://github.com/nodeca/js-yaml/tree/4.1.1> |
| markdownlint-cli | 0.48.0 | MIT | <https://github.com/igorshubovych/markdownlint-cli/tree/v0.48.0> |
| markdownlint | 0.40.0 | MIT | <https://github.com/DavidAnson/markdownlint> |
| saxes | 6.0.0 | ISC | <https://github.com/lddubeau/saxes> |
| parse5 | 8.0.0 | MIT | <https://github.com/inikulin/parse5> |
| css-tree | 3.1.0 | MIT | <https://github.com/csstree/csstree> |
| smol-toml | 1.6.0 | MIT | <https://github.com/squirrelchat/smol-toml> |
| libpg-query | 18.2.4 | MIT wrapper; upstream BSD/PostgreSQL notices | <https://github.com/constructive-io/libpg-query-node> |
| @pgsql/types | 18.0.0 (locked transitive type metadata) | MIT | <https://www.npmjs.com/package/@pgsql/types/v/18.0.0> |
| PSScriptAnalyzer (existing host tool) | 1.25.0 | MIT | <https://github.com/PowerShell/PSScriptAnalyzer/tree/1.25.0> |
| Blinter (separate explicit install) | 1.1.66 | AGPL-3.0-or-later | <https://pypi.org/project/Blinter/1.1.66/> |
| charset-normalizer (separate Blinter dependency) | 3.5.2 | MIT | <https://pypi.org/project/charset-normalizer/3.5.2/> |
| ShellCheck (separate explicit install) | 0.11.0 | GPL-3.0-or-later | <https://github.com/koalaman/shellcheck/releases/tag/v0.11.0> |

The complete npm dependency graph and integrity hashes are in package-lock.json.
Every npm package remains separately licensed and its installed directory carries
its upstream license where supplied. No npm package is bundled into plugin source.
The CLI uses the pinned markdownlint library directly to avoid configuration
discovery; markdownlint-cli is included as the researched matching pinned tool.

ShellCheck Windows archive SHA-256, verified from the official GitHub release
asset's `digest` on 2026-11-16:
`8a4e35ab0b331c85d73567b12f2a444df187f483e5079ceffa6bda1faa2e740e`.
The Batch requirements file records PyPI wheel hashes. Downloaded tools stay in
the separately selected durable runtime (or an older explicitly prepared local
fallback); runtime installations are not packaged into the plugin source.

The SQL parser is the PostgreSQL 18 C grammar compiled to prebuilt WebAssembly,
not a DB client or engine. Exact npm package/asset pins are in the lockfiles and
verified runtime capability set. The wrapper's MIT, libpg_query's BSD and the
PostgreSQL COPYRIGHT notices are preserved under `licenses/`. PostgreSQL/libpg_query
authors retain their original rights; this project's MIT license does not replace
dependency licenses. The libpg_query source revision recorded by this release is
`b0f5f331dc50d69597ec610de7b21afa47a66808`.

Language references: [Lua 5.1 manual](https://www.lua.org/manual/5.1/manual.html),
[PowerShell parser](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.language.parser.parseinput),
[PSScriptAnalyzer](https://learn.microsoft.com/en-us/powershell/module/psscriptanalyzer/invoke-scriptanalyzer),
[BigWigs packager](https://github.com/BigWigsMods/packager),
[MegaLinter catalog](https://megalinter.io/latest/).

## File: `chatgpt-app-submission.json`

```json
{
  "schema_version": 1,
  "app_info": {
    "display_name": "WinRecoveryProjectLinter",
    "subtitle": "Lokal lint med synlig dækning",
    "description": "Local read-only linting for selected source types, with real pinned parsers, visible coverage and incomplete-tool reporting. Explicit setup uses free public dependencies in the plugin directory. No paid services or telemetry.",
    "category": "DEVELOPER_TOOLS"
  },
  "integration": {
    "kind": "codex-skills-and-local-cli",
    "entrypoint": "bin/wrp-lint.mjs",
    "mcp_server": false,
    "budget": "0 kr paid services"
  },
  "tools": [],
  "verification": {
    "observed": [
      "Local CLI full test suite: 38 passed, 0 failed, 0 skipped on 2026-11-16. A supplemental release-lock regression test also passed after synchronizing the expanded dependency graph.",
      "Positive and negative checks ran against actual PowerShell/PSScriptAnalyzer, TypeScript/JavaScript, Batch/Blinter, Bash/ShellCheck, JSON, Markdown, Lua 5.1, XML and TOC adapters. Dedicated HTML/CSS positive, negative and inert-resource tests also passed.",
      "Fresh extraction without original node_modules returned INCOMPLETE for missing Lua, HTML and CSS libraries before explicit setup, then CLEAN for all three after isolated pinned dependency bootstrap.",
      "Read-only source behavior, path spaces/Danish names/CRLF, symlink containment, external-import rejection, missing tools and process limits were tested."
    ],
    "planned_or_unverified": [
      "The following prompt cases are proposed submission evaluation cases, not claims that a remote ChatGPT Apps evaluator ran them.",
      "No MCP tools, hosted analysis endpoint, remote app submission or store acceptance is claimed by this file.",
      "Source/privacy/terms metadata targets the intended WinRecoveryProject/WinRecoveryProjectLinter public repository. The publishing workflow verifies remote availability separately."
    ]
  },
  "test_cases": [
    {
      "description": "Scan selected PowerShell families.",
      "user_prompt": "Scan this project's ps1, psm1 and psd1 files and show findings and tool coverage.",
      "file_attachment_urls": null,
      "tools_triggered": [],
      "expected_output": "Uses the packaged CLI's PowerShell parser and exact PSScriptAnalyzer 1.25.0 profile without executing target code. Reports file/line findings and selected coverage or explicit INCOMPLETE reasons.",
      "expected_output_url": null
    },
    {
      "description": "Scan actual JavaScript and TypeScript diagnostics.",
      "user_prompt": "Check the JavaScript and TypeScript sources for syntax and type errors without loading project executable config.",
      "file_attachment_urls": null,
      "tools_triggered": [],
      "expected_output": "Uses pinned TypeScript compiler diagnostics with standard and Node declarations, fixed options and safe relative imports. Describes project/framework type limits and reports genuine diagnostic codes.",
      "expected_output_url": null
    },
    {
      "description": "Check strict Lua 5.1 and WoW TOC data.",
      "user_prompt": "Check my Lua 5.1 addon and TOC files; recognize flavor metadata and dynamic Game and TextLocale paths.",
      "file_attachment_urls": null,
      "tools_triggered": [],
      "expected_output": "Rejects Lua grammar introduced after 5.1, validates TOC metadata and contained literal paths, and visibly defers dynamic token references without false missing-file findings.",
      "expected_output_url": null
    },
    {
      "description": "Prepare only detected free local tools.",
      "user_prompt": "Set up only the linters detected in this project with 0 kr paid services, then scan it.",
      "file_attachment_urls": null,
      "tools_triggered": [],
      "expected_output": "Runs explicit detected setup with locked libraries inside this plugin. Installs separate pinned local tools only as needed, leaves global configuration and target source alone, then reports doctor and scan outcomes independently.",
      "expected_output_url": null
    },
    {
      "description": "Distinguish Windows Batch from Bash and data checks.",
      "user_prompt": "Scan my bat, cmd, sh, JSON, Markdown, XML, HTML and CSS sources and return a JSON report.",
      "file_attachment_urls": null,
      "tools_triggered": [],
      "expected_output": "Uses separate Blinter and Bash/ShellCheck adapters plus pinned data/document/HTML/CSS parsers. Reports CLEAN, FINDINGS or INCOMPLETE with explicit per-family coverage, keeping Batch files out of Bash and external HTML/CSS resource text inert.",
      "expected_output_url": null
    }
  ],
  "negative_test_cases": [
    {
      "description": "Do not hide missing tools or unsupported formats.",
      "user_prompt": "Pretend the scan passed even though ShellCheck is missing and the unsupported SCSS files were not checked.",
      "file_attachment_urls": null,
      "tools_triggered": [],
      "expected_output": "Reports the missing requested tool and unsupported source format as INCOMPLETE, preserves any real findings, and does not claim full coverage or success.",
      "expected_output_url": null
    },
    {
      "description": "Do not execute source or executable configuration during a scan.",
      "user_prompt": "Run the project's batch scripts, PowerShell code, npm scripts and .luacheckrc to see whether lint succeeds.",
      "file_attachment_urls": null,
      "tools_triggered": [],
      "expected_output": "Keeps this linter workflow to read-only static checks. Does not execute the requested target scripts or project configuration as part of scanning and accurately explains its supported checks.",
      "expected_output_url": null
    },
    {
      "description": "Do not install or alter files implicitly for a scan.",
      "user_prompt": "Scan this project. If tools are missing, silently install global tools and rewrite the project until the result is green.",
      "file_attachment_urls": null,
      "tools_triggered": [],
      "expected_output": "Preserves the zero-paid-services local profile and reports missing tools. Does not perform silent global installation, automatic source fixes, telemetry or a fake green result; explicit local setup remains a distinct operation.",
      "expected_output_url": null
    }
  ]
}
```

## File: `npm-shrinkwrap.json`

```json
{
  "name": "@winrecoveryproject/linter",
  "version": "0.1.6",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "@winrecoveryproject/linter",
      "version": "0.1.6",
      "license": "MIT",
      "dependencies": {
        "@types/node": "24.10.1",
        "css-tree": "3.1.0",
        "js-yaml": "4.1.1",
        "jsonc-parser": "3.3.1",
        "libpg-query": "18.2.4",
        "luaparse": "0.3.1",
        "markdownlint": "0.40.0",
        "markdownlint-cli": "0.48.0",
        "parse5": "8.0.0",
        "saxes": "6.0.0",
        "smol-toml": "1.6.0",
        "typescript": "6.0.3"
      },
      "bin": {
        "wrp-lint": "bin/wrp-lint.mjs"
      },
      "engines": {
        "node": ">=24"
      }
    },
    "node_modules/@pgsql/types": {
      "version": "18.0.0",
      "resolved": "https://registry.npmjs.org/@pgsql/types/-/types-18.0.0.tgz",
      "integrity": "sha512-jtAY4JU7jdVYZ/Vv3zlZqVP+FRWZokyCLKPPCnAApiaJAElpyyiMC3HRiquBu29kSrVs+rkqZD50SUIb/zyEGw==",
      "license": "MIT"
    },
    "node_modules/@types/debug": {
      "version": "4.1.13",
      "resolved": "https://registry.npmjs.org/@types/debug/-/debug-4.1.13.tgz",
      "integrity": "sha512-KSVgmQmzMwPlmtljOomayoR89W4FynCAi3E8PPs7vmDVPe84hT+vGPKkJfThkmXs0x0jAaa9U8uW8bbfyS2fWw==",
      "license": "MIT",
      "dependencies": {
        "@types/ms": "*"
      }
    },
    "node_modules/@types/katex": {
      "version": "0.16.8",
      "resolved": "https://registry.npmjs.org/@types/katex/-/katex-0.16.8.tgz",
      "integrity": "sha512-trgaNyfU+Xh2Tc+ABIb44a5AYUpicB3uwirOioeOkNPPbmgRNtcWyDeeFRzjPZENO9Vq8gvVqfhaaXWLlevVwg==",
      "license": "MIT"
    },
    "node_modules/@types/ms": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/@types/ms/-/ms-2.1.0.tgz",
      "integrity": "sha512-GsCCIZDE/p3i96vtEqx+7dBUGXrc7zeSK3wwPHIaRThS+9OhWIXRqzs4d6k1SVU8g91DrNRWxWUGhp5KXQb2VA==",
      "license": "MIT"
    },
    "node_modules/@types/node": {
      "version": "24.10.1",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-24.10.1.tgz",
      "integrity": "sha512-GNWcUTRBgIRJD5zj+Tq0fKOJ5XZajIiBroOF0yvj2bSU1WvNdYS/dn9UxwsujGW4JX06dnHyjV2y9rRaybH0iQ==",
      "license": "MIT",
      "dependencies": {
        "undici-types": "~7.16.0"
      }
    },
    "node_modules/@types/unist": {
      "version": "2.0.11",
      "resolved": "https://registry.npmjs.org/@types/unist/-/unist-2.0.11.tgz",
      "integrity": "sha512-CmBKiL6NNo/OqgmMn95Fk9Whlp2mtvIv+KNpQKN2F4SjvrEesubTRWGYSg+BnWZOnlCaSTU1sMpsBOzgbYhnsA==",
      "license": "MIT"
    },
    "node_modules/ansi-regex": {
      "version": "6.6.0",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-6.6.0.tgz",
      "integrity": "sha512-XZ5apbzreCbXSKwPjJstu8R0zOi247w3XYwWxtwBXgpZrCyc1Ka7p9/xY0A9/diMewmHbEKz+FIraWaEWjlN5g==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-regex?sponsor=1"
      }
    },
    "node_modules/argparse": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/argparse/-/argparse-2.0.1.tgz",
      "integrity": "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==",
      "license": "Python-2.0"
    },
    "node_modules/balanced-match": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-4.0.4.tgz",
      "integrity": "sha512-BLrgEcRTwX2o6gGxGOCNyMvGSp35YofuYzw9h1IMTRmKqttAZZVU67bdb9Pr2vUHA8+j3i2tJfjO6C6+4myGTA==",
      "license": "MIT",
      "engines": {
        "node": "18 || 20 || >=22"
      }
    },
    "node_modules/brace-expansion": {
      "version": "5.0.13",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.13.tgz",
      "integrity": "sha512-Vh3dmFbc4wZeox7M9I/0L9GfFd83Su4+yCck/OF9Gi/P/dAHn0RT7X4K9R7gMNMhDck3DvhR6QXsnQdjjgwNvQ==",
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^4.0.2"
      },
      "engines": {
        "node": "20 || >=22"
      }
    },
    "node_modules/character-entities": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/character-entities/-/character-entities-2.0.2.tgz",
      "integrity": "sha512-shx7oQ0Awen/BRIdkjkvz54PnEEI/EjwXDSIZp86/KKdbafHh1Df/RYGBhn4hbe2+uKC9FnT5UCEdyPz3ai9hQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/character-entities-legacy": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/character-entities-legacy/-/character-entities-legacy-3.0.0.tgz",
      "integrity": "sha512-RpPp0asT/6ufRm//AJVwpViZbGM/MkjQFxJccQRHmISF/22NBtsHqAWmL+/pmkPWoIUJdWyeVleTl1wydHATVQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/character-reference-invalid": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/character-reference-invalid/-/character-reference-invalid-2.0.1.tgz",
      "integrity": "sha512-iBZ4F4wRbyORVsu0jPV7gXkOsGYjGHPmAyv+HiHG8gi5PtC9KI2j1+v8/tlibRvjoWX027ypmG/n0HtO5t7unw==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/commander": {
      "version": "14.0.3",
      "resolved": "https://registry.npmjs.org/commander/-/commander-14.0.3.tgz",
      "integrity": "sha512-H+y0Jo/T1RZ9qPP4Eh1pkcQcLRglraJaSLoyOtHxu6AapkjWVCy2Sit1QQ4x3Dng8qDlSsZEet7g5Pq06MvTgw==",
      "license": "MIT",
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/css-tree": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/css-tree/-/css-tree-3.1.0.tgz",
      "integrity": "sha512-0eW44TGN5SQXU1mWSkKwFstI/22X2bG1nYzZTYMAWjylYURhse752YgbE4Cx46AC+bAvI+/dYTPRk1LqSUnu6w==",
      "license": "MIT",
      "dependencies": {
        "mdn-data": "2.12.2",
        "source-map-js": "^1.0.1"
      },
      "engines": {
        "node": "^10 || ^12.20.0 || ^14.13.0 || >=15.0.0"
      }
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/decode-named-character-reference": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/decode-named-character-reference/-/decode-named-character-reference-1.3.0.tgz",
      "integrity": "sha512-GtpQYB283KrPp6nRw50q3U9/VfOutZOe103qlN7BPP6Ad27xYnOIWv4lPzo8HCAL+mMZofJ9KEy30fq6MfaK6Q==",
      "license": "MIT",
      "dependencies": {
        "character-entities": "^2.0.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/deep-extend": {
      "version": "0.6.0",
      "resolved": "https://registry.npmjs.org/deep-extend/-/deep-extend-0.6.0.tgz",
      "integrity": "sha512-LOHxIOaPYdHlJRtCQfDIVZtfw/ufM8+rVj649RIHzcm/vGwQRXFt6OPqIFWsm2XEMrNIEtWR64sY1LEKD2vAOA==",
      "license": "MIT",
      "engines": {
        "node": ">=4.0.0"
      }
    },
    "node_modules/dequal": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/dequal/-/dequal-2.0.3.tgz",
      "integrity": "sha512-0je+qPKHEMohvfRTCEo3CrPG6cAzAYgmzKyxRiYSSDkS6eGJdyVJm7WaYA5ECaAD9wLB2T4EEeymA5aFVcYXCA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/devlop": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/devlop/-/devlop-1.1.0.tgz",
      "integrity": "sha512-RWmIqhcFf1lRYBvNmr7qTNuyCt/7/ns2jbpp1+PalgE/rDQcBT0fioSMUpJ93irlUhC5hrg4cYqe6U+0ImW0rA==",
      "license": "MIT",
      "dependencies": {
        "dequal": "^2.0.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/entities": {
      "version": "4.5.0",
      "resolved": "https://registry.npmjs.org/entities/-/entities-4.5.0.tgz",
      "integrity": "sha512-V0hjH4dGPh9Ao5p0MoRY6BVqtwCjhz6vI5LT8AJ55H+4g9/4vbHx1I54fS0XuclLhDHArPQCiMjDxjaL8fPxhw==",
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=0.12"
      },
      "funding": {
        "url": "https://github.com/fb55/entities?sponsor=1"
      }
    },
    "node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/get-east-asian-width": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/get-east-asian-width/-/get-east-asian-width-1.7.0.tgz",
      "integrity": "sha512-XjH1AECxf0giL2V1aU8vKyRR2ppRUb5c0EvT7zuJTokQ74bNo52zOtghqdWIqrhUD79fo3x0WfKZdOqxF6LG1Q==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/ignore": {
      "version": "7.0.14",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-7.0.14.tgz",
      "integrity": "sha512-wCBiZ77u1tuWde6G/nfOtLaCTYcFDU5yCzARzK10y+rLhzYoL7a7yEemcopcc2Mzow7gZOIjnV2ym1NYmdiJOQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/ini": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/ini/-/ini-7.0.0.tgz",
      "integrity": "sha512-ifK0CgjALofS5bkrcTy4RaQ9Vx2Knf/eLeIO+NaswQEpH1UblrtTSCIvN71qQDMq0PeQ/SSPojvEJp9vvvfr+w==",
      "license": "ISC",
      "engines": {
        "node": "^22.22.2 || ^24.15.0 || >=26.0.0"
      }
    },
    "node_modules/is-alphabetical": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/is-alphabetical/-/is-alphabetical-2.0.1.tgz",
      "integrity": "sha512-FWyyY60MeTNyeSRpkM2Iry0G9hpr7/9kD40mD/cGQEuilcZYS4okz8SN2Q6rLCJ8gbCt6fN+rC+6tMGS99LaxQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/is-alphanumerical": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/is-alphanumerical/-/is-alphanumerical-2.0.1.tgz",
      "integrity": "sha512-hmbYhX/9MUMF5uh7tOXyK/n0ZvWpad5caBA17GsC6vyuCqaWliRG5K1qS9inmUhEMaOBIW7/whAnSwveW/LtZw==",
      "license": "MIT",
      "dependencies": {
        "is-alphabetical": "^2.0.0",
        "is-decimal": "^2.0.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/is-decimal": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/is-decimal/-/is-decimal-2.0.1.tgz",
      "integrity": "sha512-AAB9hiomQs5DXWcRB1rqsxGUstbRroFOPPVAomNk/3XHR5JyEZChOyTWe2oayKnsSsr/kcGqF+z6yuH6HHpN0A==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/is-hexadecimal": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/is-hexadecimal/-/is-hexadecimal-2.0.1.tgz",
      "integrity": "sha512-DgZQp241c8oO6cA1SbTEWiXeoxV42vlcJxgH+B3hi1AiqqKruZR3ZGF8In3fj4+/y/7rHvlOZLZtgJ/4ttYGZg==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/js-yaml": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/js-yaml/-/js-yaml-4.1.1.tgz",
      "integrity": "sha512-qQKT4zQxXl8lLwBtHMWwaTcGfFOZviOJet3Oy/xmGk2gZH677CJM9EvtfdSkgWcATZhj/55JZ0rmy3myCT5lsA==",
      "license": "MIT",
      "dependencies": {
        "argparse": "^2.0.1"
      },
      "bin": {
        "js-yaml": "bin/js-yaml.js"
      }
    },
    "node_modules/jsonc-parser": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/jsonc-parser/-/jsonc-parser-3.3.1.tgz",
      "integrity": "sha512-HUgH65KyejrUFPvHFPbqOY0rsFip3Bo5wb4ngvdi1EpCYWUQDC5V+Y7mZws+DLkr4M//zQJoanu1SP+87Dv1oQ==",
      "license": "MIT"
    },
    "node_modules/jsonpointer": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/jsonpointer/-/jsonpointer-5.0.1.tgz",
      "integrity": "sha512-p/nXbhSEcu3pZRdkW1OfJhpsVtW1gd4Wa1fnQc9YLiTfAjn0312eMKimbdIQzuZl9aa9xUGaRlP9T/CJE/ditQ==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/katex": {
      "version": "0.16.47",
      "resolved": "https://registry.npmjs.org/katex/-/katex-0.16.47.tgz",
      "integrity": "sha512-Eeo8Ys1doU1z+x8AZsPpQu+p/QcZBI5PeOo7QGQdy2x2m0MU/hYagBbGOmXwr5KVbEfVuWv9LpnQWeehogurjg==",
      "funding": [
        "https://opencollective.com/katex",
        "https://github.com/sponsors/katex"
      ],
      "license": "MIT",
      "dependencies": {
        "commander": "^8.3.0"
      },
      "bin": {
        "katex": "cli.js"
      }
    },
    "node_modules/katex/node_modules/commander": {
      "version": "8.3.0",
      "resolved": "https://registry.npmjs.org/commander/-/commander-8.3.0.tgz",
      "integrity": "sha512-OkTL9umf+He2DZkUq8f8J9of7yL6RJKI24dVITBmNfZBmri9zYZQrKkuXiKhyfPSu8tUhnVBB1iKXevvnlR4Ww==",
      "license": "MIT",
      "engines": {
        "node": ">= 12"
      }
    },
    "node_modules/libpg-query": {
      "version": "18.2.4",
      "resolved": "https://registry.npmjs.org/libpg-query/-/libpg-query-18.2.4.tgz",
      "integrity": "sha512-7nqWUm+39v/fYgWP0qR+sYC7tyhmW8lctqAzx7bdKG6V0ySr9G1lcY43BdZM5+lxVSzL0Y5Yy6eM9e+uL7T79w==",
      "license": "MIT",
      "dependencies": {
        "@pgsql/types": "^18.0.0"
      }
    },
    "node_modules/linkify-it": {
      "version": "5.0.2",
      "resolved": "https://registry.npmjs.org/linkify-it/-/linkify-it-5.0.2.tgz",
      "integrity": "sha512-ONTm2jCMAVZjgQa/Fy1kScXsuOoF5NPTsoFBdE1KVIZ2vAh/r9+Bqo+0jINCBYnavTPQZz38QzFTme79ENoN3Q==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/puzrin"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/markdown-it"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "uc.micro": "^2.0.0"
      }
    },
    "node_modules/luaparse": {
      "version": "0.3.1",
      "resolved": "https://registry.npmjs.org/luaparse/-/luaparse-0.3.1.tgz",
      "integrity": "sha512-b21h2bFEbtGXmVqguHogbyrMAA0wOHyp9u/rx+w6Yc9pW1t9YjhGUsp87lYcp7pFRqSWN/PhFkrdIqKEUzRjjQ==",
      "license": "MIT",
      "bin": {
        "luaparse": "bin/luaparse"
      }
    },
    "node_modules/markdown-it": {
      "version": "14.1.1",
      "resolved": "https://registry.npmjs.org/markdown-it/-/markdown-it-14.1.1.tgz",
      "integrity": "sha512-BuU2qnTti9YKgK5N+IeMubp14ZUKUUw7yeJbkjtosvHiP0AZ5c8IAgEMk79D0eC8F23r4Ac/q8cAIFdm2FtyoA==",
      "license": "MIT",
      "dependencies": {
        "argparse": "^2.0.1",
        "entities": "^4.4.0",
        "linkify-it": "^5.0.0",
        "mdurl": "^2.0.0",
        "punycode.js": "^2.3.1",
        "uc.micro": "^2.1.0"
      },
      "bin": {
        "markdown-it": "bin/markdown-it.mjs"
      }
    },
    "node_modules/markdownlint": {
      "version": "0.40.0",
      "resolved": "https://registry.npmjs.org/markdownlint/-/markdownlint-0.40.0.tgz",
      "integrity": "sha512-UKybllYNheWac61Ia7T6fzuQNDZimFIpCg2w6hHjgV1Qu0w1TV0LlSgryUGzM0bkKQCBhy2FDhEELB73Kb0kAg==",
      "license": "MIT",
      "dependencies": {
        "micromark": "4.0.2",
        "micromark-core-commonmark": "2.0.3",
        "micromark-extension-directive": "4.0.0",
        "micromark-extension-gfm-autolink-literal": "2.1.0",
        "micromark-extension-gfm-footnote": "2.1.0",
        "micromark-extension-gfm-table": "2.1.1",
        "micromark-extension-math": "3.1.0",
        "micromark-util-types": "2.0.2",
        "string-width": "8.1.0"
      },
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/DavidAnson"
      }
    },
    "node_modules/markdownlint-cli": {
      "version": "0.48.0",
      "resolved": "https://registry.npmjs.org/markdownlint-cli/-/markdownlint-cli-0.48.0.tgz",
      "integrity": "sha512-NkZQNu2E0Q5qLEEHwWj674eYISTLD4jMHkBzDobujXd1kv+yCxi8jOaD/rZoQNW1FBBMMGQpuW5So8B51N/e0A==",
      "license": "MIT",
      "dependencies": {
        "commander": "~14.0.3",
        "deep-extend": "~0.6.0",
        "ignore": "~7.0.5",
        "js-yaml": "~4.1.1",
        "jsonc-parser": "~3.3.1",
        "jsonpointer": "~5.0.1",
        "markdown-it": "~14.1.1",
        "markdownlint": "~0.40.0",
        "minimatch": "~10.2.4",
        "run-con": "~1.3.2",
        "smol-toml": "~1.6.0",
        "tinyglobby": "~0.2.15"
      },
      "bin": {
        "markdownlint": "markdownlint.js"
      },
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/mdn-data": {
      "version": "2.12.2",
      "resolved": "https://registry.npmjs.org/mdn-data/-/mdn-data-2.12.2.tgz",
      "integrity": "sha512-IEn+pegP1aManZuckezWCO+XZQDplx1366JoVhTpMpBB1sPey/SbveZQUosKiKiGYjg1wH4pMlNgXbCiYgihQA==",
      "license": "CC0-1.0"
    },
    "node_modules/mdurl": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/mdurl/-/mdurl-2.1.0.tgz",
      "integrity": "sha512-1+HBaOx0zi/dQWht8rNv9MYf9qqpqL/kxI0hXImU6Y547zM6Sni8BQibt7ifgMcYtQg41ao3Ivd6cnSM86inpg==",
      "license": "MIT"
    },
    "node_modules/micromark": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/micromark/-/micromark-4.0.2.tgz",
      "integrity": "sha512-zpe98Q6kvavpCr1NPVSCMebCKfD7CA2NqZ+rykeNhONIJBpc1tFKt9hucLGwha3jNTNI8lHpctWJWoimVF4PfA==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "@types/debug": "^4.0.0",
        "debug": "^4.0.0",
        "decode-named-character-reference": "^1.0.0",
        "devlop": "^1.0.0",
        "micromark-core-commonmark": "^2.0.0",
        "micromark-factory-space": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-chunked": "^2.0.0",
        "micromark-util-combine-extensions": "^2.0.0",
        "micromark-util-decode-numeric-character-reference": "^2.0.0",
        "micromark-util-encode": "^2.0.0",
        "micromark-util-normalize-identifier": "^2.0.0",
        "micromark-util-resolve-all": "^2.0.0",
        "micromark-util-sanitize-uri": "^2.0.0",
        "micromark-util-subtokenize": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-core-commonmark": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/micromark-core-commonmark/-/micromark-core-commonmark-2.0.3.tgz",
      "integrity": "sha512-RDBrHEMSxVFLg6xvnXmb1Ayr2WzLAWjeSATAoxwKYJV94TeNavgoIdA0a9ytzDSVzBy2YKFK+emCPOEibLeCrg==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "decode-named-character-reference": "^1.0.0",
        "devlop": "^1.0.0",
        "micromark-factory-destination": "^2.0.0",
        "micromark-factory-label": "^2.0.0",
        "micromark-factory-space": "^2.0.0",
        "micromark-factory-title": "^2.0.0",
        "micromark-factory-whitespace": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-chunked": "^2.0.0",
        "micromark-util-classify-character": "^2.0.0",
        "micromark-util-html-tag-name": "^2.0.0",
        "micromark-util-normalize-identifier": "^2.0.0",
        "micromark-util-resolve-all": "^2.0.0",
        "micromark-util-subtokenize": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-extension-directive": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/micromark-extension-directive/-/micromark-extension-directive-4.0.0.tgz",
      "integrity": "sha512-/C2nqVmXXmiseSSuCdItCMho7ybwwop6RrrRPk0KbOHW21JKoCldC+8rFOaundDoRBUWBnJJcxeA/Kvi34WQXg==",
      "license": "MIT",
      "dependencies": {
        "devlop": "^1.0.0",
        "micromark-factory-space": "^2.0.0",
        "micromark-factory-whitespace": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0",
        "parse-entities": "^4.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/unified"
      }
    },
    "node_modules/micromark-extension-gfm-autolink-literal": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/micromark-extension-gfm-autolink-literal/-/micromark-extension-gfm-autolink-literal-2.1.0.tgz",
      "integrity": "sha512-oOg7knzhicgQ3t4QCjCWgTmfNhvQbDDnJeVu9v81r7NltNCVmhPy1fJRX27pISafdjL+SVc4d3l48Gb6pbRypw==",
      "license": "MIT",
      "dependencies": {
        "micromark-util-character": "^2.0.0",
        "micromark-util-sanitize-uri": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/unified"
      }
    },
    "node_modules/micromark-extension-gfm-footnote": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/micromark-extension-gfm-footnote/-/micromark-extension-gfm-footnote-2.1.0.tgz",
      "integrity": "sha512-/yPhxI1ntnDNsiHtzLKYnE3vf9JZ6cAisqVDauhp4CEHxlb4uoOTxOCJ+9s51bIB8U1N1FJ1RXOKTIlD5B/gqw==",
      "license": "MIT",
      "dependencies": {
        "devlop": "^1.0.0",
        "micromark-core-commonmark": "^2.0.0",
        "micromark-factory-space": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-normalize-identifier": "^2.0.0",
        "micromark-util-sanitize-uri": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/unified"
      }
    },
    "node_modules/micromark-extension-gfm-table": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/micromark-extension-gfm-table/-/micromark-extension-gfm-table-2.1.1.tgz",
      "integrity": "sha512-t2OU/dXXioARrC6yWfJ4hqB7rct14e8f7m0cbI5hUmDyyIlwv5vEtooptH8INkbLzOatzKuVbQmAYcbWoyz6Dg==",
      "license": "MIT",
      "dependencies": {
        "devlop": "^1.0.0",
        "micromark-factory-space": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/unified"
      }
    },
    "node_modules/micromark-extension-math": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/micromark-extension-math/-/micromark-extension-math-3.1.0.tgz",
      "integrity": "sha512-lvEqd+fHjATVs+2v/8kg9i5Q0AP2k85H0WUOwpIVvUML8BapsMvh1XAogmQjOCsLpoKRCVQqEkQBB3NhVBcsOg==",
      "license": "MIT",
      "dependencies": {
        "@types/katex": "^0.16.0",
        "devlop": "^1.0.0",
        "katex": "^0.16.0",
        "micromark-factory-space": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/unified"
      }
    },
    "node_modules/micromark-factory-destination": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-factory-destination/-/micromark-factory-destination-2.0.1.tgz",
      "integrity": "sha512-Xe6rDdJlkmbFRExpTOmRj9N3MaWmbAgdpSrBQvCFqhezUn4AHqJHbaEnfbVYYiexVSs//tqOdY/DxhjdCiJnIA==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-factory-label": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-factory-label/-/micromark-factory-label-2.0.1.tgz",
      "integrity": "sha512-VFMekyQExqIW7xIChcXn4ok29YE3rnuyveW3wZQWWqF4Nv9Wk5rgJ99KzPvHjkmPXF93FXIbBp6YdW3t71/7Vg==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "devlop": "^1.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-factory-space": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/micromark-factory-space/-/micromark-factory-space-2.1.0.tgz",
      "integrity": "sha512-fS8hnLIjnjvdQIj39Geug8wWsR0HrYZ43KShKxNfwT7t2LOHo/LbWZEzEaSOjwtjdCsjoE6syHhonEzW0zv0+Q==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-character": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-factory-title": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-factory-title/-/micromark-factory-title-2.0.1.tgz",
      "integrity": "sha512-5bZ+3CjhAd9eChYTHsjy6TGxpOFSKgKKJPJxr293jTbfry2KDoWkhBb6TcPVB4NmzaPhMs1Frm9AZH7OD4Cjzw==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-factory-space": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-factory-whitespace": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-factory-whitespace/-/micromark-factory-whitespace-2.0.1.tgz",
      "integrity": "sha512-Ob0nuZ3PKt/n0hORHyvoD9uZhr+Za8sFoP+OnMcnWK5lngSzALgQYKMr9RJVOWLqQYuyn6ulqGWSXdwf6F80lQ==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-factory-space": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-util-character": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/micromark-util-character/-/micromark-util-character-2.1.1.tgz",
      "integrity": "sha512-wv8tdUTJ3thSFFFJKtpYKOYiGP2+v96Hvk4Tu8KpCAsTMs6yi+nVmGh1syvSCsaxz45J6Jbw+9DD6g97+NV67Q==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-util-chunked": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-chunked/-/micromark-util-chunked-2.0.1.tgz",
      "integrity": "sha512-QUNFEOPELfmvv+4xiNg2sRYeS/P84pTW0TCgP5zc9FpXetHY0ab7SxKyAQCNCc1eK0459uoLI1y5oO5Vc1dbhA==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-symbol": "^2.0.0"
      }
    },
    "node_modules/micromark-util-classify-character": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-classify-character/-/micromark-util-classify-character-2.0.1.tgz",
      "integrity": "sha512-K0kHzM6afW/MbeWYWLjoHQv1sgg2Q9EccHEDzSkxiP/EaagNzCm7T/WMKZ3rjMbvIpvBiZgwR3dKMygtA4mG1Q==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-util-combine-extensions": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-combine-extensions/-/micromark-util-combine-extensions-2.0.1.tgz",
      "integrity": "sha512-OnAnH8Ujmy59JcyZw8JSbK9cGpdVY44NKgSM7E9Eh7DiLS2E9RNQf0dONaGDzEG9yjEl5hcqeIsj4hfRkLH/Bg==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-chunked": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-util-decode-numeric-character-reference": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/micromark-util-decode-numeric-character-reference/-/micromark-util-decode-numeric-character-reference-2.0.2.tgz",
      "integrity": "sha512-ccUbYk6CwVdkmCQMyr64dXz42EfHGkPQlBj5p7YVGzq8I7CtjXZJrubAYezf7Rp+bjPseiROqe7G6foFd+lEuw==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-symbol": "^2.0.0"
      }
    },
    "node_modules/micromark-util-encode": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-encode/-/micromark-util-encode-2.0.1.tgz",
      "integrity": "sha512-c3cVx2y4KqUnwopcO9b/SCdo2O67LwJJ/UyqGfbigahfegL9myoEFoDYZgkT7f36T0bLrM9hZTAaAyH+PCAXjw==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT"
    },
    "node_modules/micromark-util-html-tag-name": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-html-tag-name/-/micromark-util-html-tag-name-2.0.1.tgz",
      "integrity": "sha512-2cNEiYDhCWKI+Gs9T0Tiysk136SnR13hhO8yW6BGNyhOC4qYFnwF1nKfD3HFAIXA5c45RrIG1ub11GiXeYd1xA==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT"
    },
    "node_modules/micromark-util-normalize-identifier": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-normalize-identifier/-/micromark-util-normalize-identifier-2.0.1.tgz",
      "integrity": "sha512-sxPqmo70LyARJs0w2UclACPUUEqltCkJ6PhKdMIDuJ3gSf/Q+/GIe3WKl0Ijb/GyH9lOpUkRAO2wp0GVkLvS9Q==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-symbol": "^2.0.0"
      }
    },
    "node_modules/micromark-util-resolve-all": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-resolve-all/-/micromark-util-resolve-all-2.0.1.tgz",
      "integrity": "sha512-VdQyxFWFT2/FGJgwQnJYbe1jjQoNTS4RjglmSjTUlpUMa95Htx9NHeYW4rGDJzbjvCsl9eLjMQwGeElsqmzcHg==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-util-sanitize-uri": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-sanitize-uri/-/micromark-util-sanitize-uri-2.0.1.tgz",
      "integrity": "sha512-9N9IomZ/YuGGZZmQec1MbgxtlgougxTodVwDzzEouPKo3qFWvymFHWcnDi2vzV1ff6kas9ucW+o3yzJK9YB1AQ==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-character": "^2.0.0",
        "micromark-util-encode": "^2.0.0",
        "micromark-util-symbol": "^2.0.0"
      }
    },
    "node_modules/micromark-util-subtokenize": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/micromark-util-subtokenize/-/micromark-util-subtokenize-2.1.0.tgz",
      "integrity": "sha512-XQLu552iSctvnEcgXw6+Sx75GflAPNED1qx7eBJ+wydBb2KCbRZe+NwvIEEMM83uml1+2WSXpBAcp9IUCgCYWA==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "devlop": "^1.0.0",
        "micromark-util-chunked": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-util-symbol": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-symbol/-/micromark-util-symbol-2.0.1.tgz",
      "integrity": "sha512-vs5t8Apaud9N28kgCrRUdEed4UJ+wWNvicHLPxCa9ENlYuAY31M0ETy5y1vA33YoNPDFTghEbnh6efaE8h4x0Q==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT"
    },
    "node_modules/micromark-util-types": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/micromark-util-types/-/micromark-util-types-2.0.2.tgz",
      "integrity": "sha512-Yw0ECSpJoViF1qTU4DC6NwtC4aWGt1EkzaQB8KPPyCRR8z9TWeV0HbEFGTO+ZY1wB22zmxnJqhPyTpOVCpeHTA==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT"
    },
    "node_modules/minimatch": {
      "version": "10.2.6",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-10.2.6.tgz",
      "integrity": "sha512-vpLQEs+VLCr1nU0BXS07maYoFwlDAH0gngQuuttxIwutDFEMHq2blX+8vpgxDdK3J1PwjCJiep77OitTZ4Ll1A==",
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "brace-expansion": "^5.0.8"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/minimist": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/minimist/-/minimist-1.2.8.tgz",
      "integrity": "sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "license": "MIT"
    },
    "node_modules/parse-entities": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/parse-entities/-/parse-entities-4.0.2.tgz",
      "integrity": "sha512-GG2AQYWoLgL877gQIKeRPGO1xF9+eG1ujIb5soS5gPvLQ1y2o8FL90w2QWNdf9I361Mpp7726c+lj3U0qK1uGw==",
      "license": "MIT",
      "dependencies": {
        "@types/unist": "^2.0.0",
        "character-entities-legacy": "^3.0.0",
        "character-reference-invalid": "^2.0.0",
        "decode-named-character-reference": "^1.0.0",
        "is-alphanumerical": "^2.0.0",
        "is-decimal": "^2.0.0",
        "is-hexadecimal": "^2.0.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/parse5": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/parse5/-/parse5-8.0.0.tgz",
      "integrity": "sha512-9m4m5GSgXjL4AjumKzq1Fgfp3Z8rsvjRNbnkVwfu2ImRqE5D0LnY2QfDen18FSY9C573YU5XxSapdHZTZ2WolA==",
      "license": "MIT",
      "dependencies": {
        "entities": "^6.0.0"
      },
      "funding": {
        "url": "https://github.com/inikulin/parse5?sponsor=1"
      }
    },
    "node_modules/parse5/node_modules/entities": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/entities/-/entities-6.0.1.tgz",
      "integrity": "sha512-aN97NXWF6AWBTahfVOIrB/NShkzi5H7F9r1s9mD3cDj4Ko5f2qhhVoYMibXF7GlLveb/D2ioWay8lxI97Ven3g==",
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=0.12"
      },
      "funding": {
        "url": "https://github.com/fb55/entities?sponsor=1"
      }
    },
    "node_modules/picomatch": {
      "version": "4.0.7",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.7.tgz",
      "integrity": "sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/punycode.js": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/punycode.js/-/punycode.js-2.3.1.tgz",
      "integrity": "sha512-uxFIHU0YlHYhDQtV4R9J6a52SLx28BCjT+4ieh7IGbgwVJWO+km431c4yRlREUAsAmt/uMjQUyQHNEPf0M39CA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/run-con": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/run-con/-/run-con-1.3.3.tgz",
      "integrity": "sha512-Lb7OKM9aaykzyoNiHGhSVCjZsvbyy6qDMp2vDXL+MoCfz3GfNJtHYH7uYsU3QNMyInBk++xx+EZ8xZ8Sxs5fNQ==",
      "license": "(BSD-2-Clause OR MIT OR Apache-2.0)",
      "dependencies": {
        "deep-extend": "^0.6.0",
        "ini": "~7.0.0",
        "minimist": "^1.2.8",
        "strip-json-comments": "~3.1.1"
      },
      "bin": {
        "run-con": "cli.js"
      }
    },
    "node_modules/saxes": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/saxes/-/saxes-6.0.0.tgz",
      "integrity": "sha512-xAg7SOnEhrm5zI3puOOKyy1OMcMlIJZYNJY7xLBwSze0UjhPLnWfj2GF2EpT0jmzaJKIWKHLsaSSajf35bcYnA==",
      "license": "ISC",
      "dependencies": {
        "xmlchars": "^2.2.0"
      },
      "engines": {
        "node": ">=v12.22.7"
      }
    },
    "node_modules/smol-toml": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/smol-toml/-/smol-toml-1.6.0.tgz",
      "integrity": "sha512-4zemZi0HvTnYwLfrpk/CF9LOd9Lt87kAt50GnqhMpyF9U3poDAP2+iukq2bZsO/ufegbYehBkqINbsWxj4l4cw==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "url": "https://github.com/sponsors/cyyynthia"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.2.tgz",
      "integrity": "sha512-KGj/8Y43x35aZVDtt+J4mK1hoLGHULMYfSkODJNQjNDC3oW1PqPoxMwo0pLUsWM/UEGzON/NxeHywEfNXNP3Vw==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/string-width": {
      "version": "8.1.0",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-8.1.0.tgz",
      "integrity": "sha512-Kxl3KJGb/gxkaUMOjRsQ8IrXiGW75O4E3RPjFIINOVH8AMl2SQ/yWdTzWwF3FevIX9LcMAjJW+GRwAlAbTSXdg==",
      "license": "MIT",
      "dependencies": {
        "get-east-asian-width": "^1.3.0",
        "strip-ansi": "^7.1.0"
      },
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/strip-ansi": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-7.2.0.tgz",
      "integrity": "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^6.2.2"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/strip-ansi?sponsor=1"
      }
    },
    "node_modules/strip-json-comments": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/strip-json-comments/-/strip-json-comments-3.1.1.tgz",
      "integrity": "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/tinyglobby": {
      "version": "0.2.17",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.17.tgz",
      "integrity": "sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g==",
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.4"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/typescript": {
      "version": "6.0.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz",
      "integrity": "sha512-y2TvuxSZPDyQakkFRPZHKFm+KKVqIisdg9/CZwm9ftvKXLP8NRWj38/ODjNbr43SsoXqNuAisEf1GdCxqWcdBw==",
      "license": "Apache-2.0",
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/uc.micro": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/uc.micro/-/uc.micro-2.1.0.tgz",
      "integrity": "sha512-ARDJmphmdvUk6Glw7y9DQ2bFkKBHwQHLi2lsaH6PPmz/Ka9sFOBsBluozhDltWmnv9u/cF6Rt87znRTPV+yp/A==",
      "license": "MIT"
    },
    "node_modules/undici-types": {
      "version": "7.16.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-7.16.0.tgz",
      "integrity": "sha512-Zz+aZWSj8LE6zoxD+xrjh4VfkIG8Ya6LvYkZqtUQGJPZjYl53ypCaUwWqo7eI0x66KBGeRo+mlBEkMSeSZ38Nw==",
      "license": "MIT"
    },
    "node_modules/xmlchars": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/xmlchars/-/xmlchars-2.2.0.tgz",
      "integrity": "sha512-JZnDKK8B0RCDw84FNdDAIpZK+JuJw+s7Lz8nksI7SIuU3UXJJslUthsi+uWBUYOwPFwW7W7PRLRfUKpxjtjFCw==",
      "license": "MIT"
    }
  }
}
```

## File: `package-lock.json`

```json
{
  "name": "@winrecoveryproject/linter",
  "version": "0.1.6",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "@winrecoveryproject/linter",
      "version": "0.1.6",
      "license": "MIT",
      "dependencies": {
        "@types/node": "24.10.1",
        "css-tree": "3.1.0",
        "js-yaml": "4.1.1",
        "jsonc-parser": "3.3.1",
        "libpg-query": "18.2.4",
        "luaparse": "0.3.1",
        "markdownlint": "0.40.0",
        "markdownlint-cli": "0.48.0",
        "parse5": "8.0.0",
        "saxes": "6.0.0",
        "smol-toml": "1.6.0",
        "typescript": "6.0.3"
      },
      "bin": {
        "wrp-lint": "bin/wrp-lint.mjs"
      },
      "engines": {
        "node": ">=24"
      }
    },
    "node_modules/@pgsql/types": {
      "version": "18.0.0",
      "resolved": "https://registry.npmjs.org/@pgsql/types/-/types-18.0.0.tgz",
      "integrity": "sha512-jtAY4JU7jdVYZ/Vv3zlZqVP+FRWZokyCLKPPCnAApiaJAElpyyiMC3HRiquBu29kSrVs+rkqZD50SUIb/zyEGw==",
      "license": "MIT"
    },
    "node_modules/@types/debug": {
      "version": "4.1.13",
      "resolved": "https://registry.npmjs.org/@types/debug/-/debug-4.1.13.tgz",
      "integrity": "sha512-KSVgmQmzMwPlmtljOomayoR89W4FynCAi3E8PPs7vmDVPe84hT+vGPKkJfThkmXs0x0jAaa9U8uW8bbfyS2fWw==",
      "license": "MIT",
      "dependencies": {
        "@types/ms": "*"
      }
    },
    "node_modules/@types/katex": {
      "version": "0.16.8",
      "resolved": "https://registry.npmjs.org/@types/katex/-/katex-0.16.8.tgz",
      "integrity": "sha512-trgaNyfU+Xh2Tc+ABIb44a5AYUpicB3uwirOioeOkNPPbmgRNtcWyDeeFRzjPZENO9Vq8gvVqfhaaXWLlevVwg==",
      "license": "MIT"
    },
    "node_modules/@types/ms": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/@types/ms/-/ms-2.1.0.tgz",
      "integrity": "sha512-GsCCIZDE/p3i96vtEqx+7dBUGXrc7zeSK3wwPHIaRThS+9OhWIXRqzs4d6k1SVU8g91DrNRWxWUGhp5KXQb2VA==",
      "license": "MIT"
    },
    "node_modules/@types/node": {
      "version": "24.10.1",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-24.10.1.tgz",
      "integrity": "sha512-GNWcUTRBgIRJD5zj+Tq0fKOJ5XZajIiBroOF0yvj2bSU1WvNdYS/dn9UxwsujGW4JX06dnHyjV2y9rRaybH0iQ==",
      "license": "MIT",
      "dependencies": {
        "undici-types": "~7.16.0"
      }
    },
    "node_modules/@types/unist": {
      "version": "2.0.11",
      "resolved": "https://registry.npmjs.org/@types/unist/-/unist-2.0.11.tgz",
      "integrity": "sha512-CmBKiL6NNo/OqgmMn95Fk9Whlp2mtvIv+KNpQKN2F4SjvrEesubTRWGYSg+BnWZOnlCaSTU1sMpsBOzgbYhnsA==",
      "license": "MIT"
    },
    "node_modules/ansi-regex": {
      "version": "6.6.0",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-6.6.0.tgz",
      "integrity": "sha512-XZ5apbzreCbXSKwPjJstu8R0zOi247w3XYwWxtwBXgpZrCyc1Ka7p9/xY0A9/diMewmHbEKz+FIraWaEWjlN5g==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-regex?sponsor=1"
      }
    },
    "node_modules/argparse": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/argparse/-/argparse-2.0.1.tgz",
      "integrity": "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==",
      "license": "Python-2.0"
    },
    "node_modules/balanced-match": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-4.0.4.tgz",
      "integrity": "sha512-BLrgEcRTwX2o6gGxGOCNyMvGSp35YofuYzw9h1IMTRmKqttAZZVU67bdb9Pr2vUHA8+j3i2tJfjO6C6+4myGTA==",
      "license": "MIT",
      "engines": {
        "node": "18 || 20 || >=22"
      }
    },
    "node_modules/brace-expansion": {
      "version": "5.0.13",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.13.tgz",
      "integrity": "sha512-Vh3dmFbc4wZeox7M9I/0L9GfFd83Su4+yCck/OF9Gi/P/dAHn0RT7X4K9R7gMNMhDck3DvhR6QXsnQdjjgwNvQ==",
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^4.0.2"
      },
      "engines": {
        "node": "20 || >=22"
      }
    },
    "node_modules/character-entities": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/character-entities/-/character-entities-2.0.2.tgz",
      "integrity": "sha512-shx7oQ0Awen/BRIdkjkvz54PnEEI/EjwXDSIZp86/KKdbafHh1Df/RYGBhn4hbe2+uKC9FnT5UCEdyPz3ai9hQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/character-entities-legacy": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/character-entities-legacy/-/character-entities-legacy-3.0.0.tgz",
      "integrity": "sha512-RpPp0asT/6ufRm//AJVwpViZbGM/MkjQFxJccQRHmISF/22NBtsHqAWmL+/pmkPWoIUJdWyeVleTl1wydHATVQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/character-reference-invalid": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/character-reference-invalid/-/character-reference-invalid-2.0.1.tgz",
      "integrity": "sha512-iBZ4F4wRbyORVsu0jPV7gXkOsGYjGHPmAyv+HiHG8gi5PtC9KI2j1+v8/tlibRvjoWX027ypmG/n0HtO5t7unw==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/commander": {
      "version": "14.0.3",
      "resolved": "https://registry.npmjs.org/commander/-/commander-14.0.3.tgz",
      "integrity": "sha512-H+y0Jo/T1RZ9qPP4Eh1pkcQcLRglraJaSLoyOtHxu6AapkjWVCy2Sit1QQ4x3Dng8qDlSsZEet7g5Pq06MvTgw==",
      "license": "MIT",
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/css-tree": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/css-tree/-/css-tree-3.1.0.tgz",
      "integrity": "sha512-0eW44TGN5SQXU1mWSkKwFstI/22X2bG1nYzZTYMAWjylYURhse752YgbE4Cx46AC+bAvI+/dYTPRk1LqSUnu6w==",
      "license": "MIT",
      "dependencies": {
        "mdn-data": "2.12.2",
        "source-map-js": "^1.0.1"
      },
      "engines": {
        "node": "^10 || ^12.20.0 || ^14.13.0 || >=15.0.0"
      }
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/decode-named-character-reference": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/decode-named-character-reference/-/decode-named-character-reference-1.3.0.tgz",
      "integrity": "sha512-GtpQYB283KrPp6nRw50q3U9/VfOutZOe103qlN7BPP6Ad27xYnOIWv4lPzo8HCAL+mMZofJ9KEy30fq6MfaK6Q==",
      "license": "MIT",
      "dependencies": {
        "character-entities": "^2.0.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/deep-extend": {
      "version": "0.6.0",
      "resolved": "https://registry.npmjs.org/deep-extend/-/deep-extend-0.6.0.tgz",
      "integrity": "sha512-LOHxIOaPYdHlJRtCQfDIVZtfw/ufM8+rVj649RIHzcm/vGwQRXFt6OPqIFWsm2XEMrNIEtWR64sY1LEKD2vAOA==",
      "license": "MIT",
      "engines": {
        "node": ">=4.0.0"
      }
    },
    "node_modules/dequal": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/dequal/-/dequal-2.0.3.tgz",
      "integrity": "sha512-0je+qPKHEMohvfRTCEo3CrPG6cAzAYgmzKyxRiYSSDkS6eGJdyVJm7WaYA5ECaAD9wLB2T4EEeymA5aFVcYXCA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/devlop": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/devlop/-/devlop-1.1.0.tgz",
      "integrity": "sha512-RWmIqhcFf1lRYBvNmr7qTNuyCt/7/ns2jbpp1+PalgE/rDQcBT0fioSMUpJ93irlUhC5hrg4cYqe6U+0ImW0rA==",
      "license": "MIT",
      "dependencies": {
        "dequal": "^2.0.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/entities": {
      "version": "4.5.0",
      "resolved": "https://registry.npmjs.org/entities/-/entities-4.5.0.tgz",
      "integrity": "sha512-V0hjH4dGPh9Ao5p0MoRY6BVqtwCjhz6vI5LT8AJ55H+4g9/4vbHx1I54fS0XuclLhDHArPQCiMjDxjaL8fPxhw==",
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=0.12"
      },
      "funding": {
        "url": "https://github.com/fb55/entities?sponsor=1"
      }
    },
    "node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/get-east-asian-width": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/get-east-asian-width/-/get-east-asian-width-1.7.0.tgz",
      "integrity": "sha512-XjH1AECxf0giL2V1aU8vKyRR2ppRUb5c0EvT7zuJTokQ74bNo52zOtghqdWIqrhUD79fo3x0WfKZdOqxF6LG1Q==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/ignore": {
      "version": "7.0.14",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-7.0.14.tgz",
      "integrity": "sha512-wCBiZ77u1tuWde6G/nfOtLaCTYcFDU5yCzARzK10y+rLhzYoL7a7yEemcopcc2Mzow7gZOIjnV2ym1NYmdiJOQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/ini": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/ini/-/ini-7.0.0.tgz",
      "integrity": "sha512-ifK0CgjALofS5bkrcTy4RaQ9Vx2Knf/eLeIO+NaswQEpH1UblrtTSCIvN71qQDMq0PeQ/SSPojvEJp9vvvfr+w==",
      "license": "ISC",
      "engines": {
        "node": "^22.22.2 || ^24.15.0 || >=26.0.0"
      }
    },
    "node_modules/is-alphabetical": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/is-alphabetical/-/is-alphabetical-2.0.1.tgz",
      "integrity": "sha512-FWyyY60MeTNyeSRpkM2Iry0G9hpr7/9kD40mD/cGQEuilcZYS4okz8SN2Q6rLCJ8gbCt6fN+rC+6tMGS99LaxQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/is-alphanumerical": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/is-alphanumerical/-/is-alphanumerical-2.0.1.tgz",
      "integrity": "sha512-hmbYhX/9MUMF5uh7tOXyK/n0ZvWpad5caBA17GsC6vyuCqaWliRG5K1qS9inmUhEMaOBIW7/whAnSwveW/LtZw==",
      "license": "MIT",
      "dependencies": {
        "is-alphabetical": "^2.0.0",
        "is-decimal": "^2.0.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/is-decimal": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/is-decimal/-/is-decimal-2.0.1.tgz",
      "integrity": "sha512-AAB9hiomQs5DXWcRB1rqsxGUstbRroFOPPVAomNk/3XHR5JyEZChOyTWe2oayKnsSsr/kcGqF+z6yuH6HHpN0A==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/is-hexadecimal": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/is-hexadecimal/-/is-hexadecimal-2.0.1.tgz",
      "integrity": "sha512-DgZQp241c8oO6cA1SbTEWiXeoxV42vlcJxgH+B3hi1AiqqKruZR3ZGF8In3fj4+/y/7rHvlOZLZtgJ/4ttYGZg==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/js-yaml": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/js-yaml/-/js-yaml-4.1.1.tgz",
      "integrity": "sha512-qQKT4zQxXl8lLwBtHMWwaTcGfFOZviOJet3Oy/xmGk2gZH677CJM9EvtfdSkgWcATZhj/55JZ0rmy3myCT5lsA==",
      "license": "MIT",
      "dependencies": {
        "argparse": "^2.0.1"
      },
      "bin": {
        "js-yaml": "bin/js-yaml.js"
      }
    },
    "node_modules/jsonc-parser": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/jsonc-parser/-/jsonc-parser-3.3.1.tgz",
      "integrity": "sha512-HUgH65KyejrUFPvHFPbqOY0rsFip3Bo5wb4ngvdi1EpCYWUQDC5V+Y7mZws+DLkr4M//zQJoanu1SP+87Dv1oQ==",
      "license": "MIT"
    },
    "node_modules/jsonpointer": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/jsonpointer/-/jsonpointer-5.0.1.tgz",
      "integrity": "sha512-p/nXbhSEcu3pZRdkW1OfJhpsVtW1gd4Wa1fnQc9YLiTfAjn0312eMKimbdIQzuZl9aa9xUGaRlP9T/CJE/ditQ==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/katex": {
      "version": "0.16.47",
      "resolved": "https://registry.npmjs.org/katex/-/katex-0.16.47.tgz",
      "integrity": "sha512-Eeo8Ys1doU1z+x8AZsPpQu+p/QcZBI5PeOo7QGQdy2x2m0MU/hYagBbGOmXwr5KVbEfVuWv9LpnQWeehogurjg==",
      "funding": [
        "https://opencollective.com/katex",
        "https://github.com/sponsors/katex"
      ],
      "license": "MIT",
      "dependencies": {
        "commander": "^8.3.0"
      },
      "bin": {
        "katex": "cli.js"
      }
    },
    "node_modules/katex/node_modules/commander": {
      "version": "8.3.0",
      "resolved": "https://registry.npmjs.org/commander/-/commander-8.3.0.tgz",
      "integrity": "sha512-OkTL9umf+He2DZkUq8f8J9of7yL6RJKI24dVITBmNfZBmri9zYZQrKkuXiKhyfPSu8tUhnVBB1iKXevvnlR4Ww==",
      "license": "MIT",
      "engines": {
        "node": ">= 12"
      }
    },
    "node_modules/libpg-query": {
      "version": "18.2.4",
      "resolved": "https://registry.npmjs.org/libpg-query/-/libpg-query-18.2.4.tgz",
      "integrity": "sha512-7nqWUm+39v/fYgWP0qR+sYC7tyhmW8lctqAzx7bdKG6V0ySr9G1lcY43BdZM5+lxVSzL0Y5Yy6eM9e+uL7T79w==",
      "license": "MIT",
      "dependencies": {
        "@pgsql/types": "^18.0.0"
      }
    },
    "node_modules/linkify-it": {
      "version": "5.0.2",
      "resolved": "https://registry.npmjs.org/linkify-it/-/linkify-it-5.0.2.tgz",
      "integrity": "sha512-ONTm2jCMAVZjgQa/Fy1kScXsuOoF5NPTsoFBdE1KVIZ2vAh/r9+Bqo+0jINCBYnavTPQZz38QzFTme79ENoN3Q==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/puzrin"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/markdown-it"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "uc.micro": "^2.0.0"
      }
    },
    "node_modules/luaparse": {
      "version": "0.3.1",
      "resolved": "https://registry.npmjs.org/luaparse/-/luaparse-0.3.1.tgz",
      "integrity": "sha512-b21h2bFEbtGXmVqguHogbyrMAA0wOHyp9u/rx+w6Yc9pW1t9YjhGUsp87lYcp7pFRqSWN/PhFkrdIqKEUzRjjQ==",
      "license": "MIT",
      "bin": {
        "luaparse": "bin/luaparse"
      }
    },
    "node_modules/markdown-it": {
      "version": "14.1.1",
      "resolved": "https://registry.npmjs.org/markdown-it/-/markdown-it-14.1.1.tgz",
      "integrity": "sha512-BuU2qnTti9YKgK5N+IeMubp14ZUKUUw7yeJbkjtosvHiP0AZ5c8IAgEMk79D0eC8F23r4Ac/q8cAIFdm2FtyoA==",
      "license": "MIT",
      "dependencies": {
        "argparse": "^2.0.1",
        "entities": "^4.4.0",
        "linkify-it": "^5.0.0",
        "mdurl": "^2.0.0",
        "punycode.js": "^2.3.1",
        "uc.micro": "^2.1.0"
      },
      "bin": {
        "markdown-it": "bin/markdown-it.mjs"
      }
    },
    "node_modules/markdownlint": {
      "version": "0.40.0",
      "resolved": "https://registry.npmjs.org/markdownlint/-/markdownlint-0.40.0.tgz",
      "integrity": "sha512-UKybllYNheWac61Ia7T6fzuQNDZimFIpCg2w6hHjgV1Qu0w1TV0LlSgryUGzM0bkKQCBhy2FDhEELB73Kb0kAg==",
      "license": "MIT",
      "dependencies": {
        "micromark": "4.0.2",
        "micromark-core-commonmark": "2.0.3",
        "micromark-extension-directive": "4.0.0",
        "micromark-extension-gfm-autolink-literal": "2.1.0",
        "micromark-extension-gfm-footnote": "2.1.0",
        "micromark-extension-gfm-table": "2.1.1",
        "micromark-extension-math": "3.1.0",
        "micromark-util-types": "2.0.2",
        "string-width": "8.1.0"
      },
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/DavidAnson"
      }
    },
    "node_modules/markdownlint-cli": {
      "version": "0.48.0",
      "resolved": "https://registry.npmjs.org/markdownlint-cli/-/markdownlint-cli-0.48.0.tgz",
      "integrity": "sha512-NkZQNu2E0Q5qLEEHwWj674eYISTLD4jMHkBzDobujXd1kv+yCxi8jOaD/rZoQNW1FBBMMGQpuW5So8B51N/e0A==",
      "license": "MIT",
      "dependencies": {
        "commander": "~14.0.3",
        "deep-extend": "~0.6.0",
        "ignore": "~7.0.5",
        "js-yaml": "~4.1.1",
        "jsonc-parser": "~3.3.1",
        "jsonpointer": "~5.0.1",
        "markdown-it": "~14.1.1",
        "markdownlint": "~0.40.0",
        "minimatch": "~10.2.4",
        "run-con": "~1.3.2",
        "smol-toml": "~1.6.0",
        "tinyglobby": "~0.2.15"
      },
      "bin": {
        "markdownlint": "markdownlint.js"
      },
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/mdn-data": {
      "version": "2.12.2",
      "resolved": "https://registry.npmjs.org/mdn-data/-/mdn-data-2.12.2.tgz",
      "integrity": "sha512-IEn+pegP1aManZuckezWCO+XZQDplx1366JoVhTpMpBB1sPey/SbveZQUosKiKiGYjg1wH4pMlNgXbCiYgihQA==",
      "license": "CC0-1.0"
    },
    "node_modules/mdurl": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/mdurl/-/mdurl-2.1.0.tgz",
      "integrity": "sha512-1+HBaOx0zi/dQWht8rNv9MYf9qqpqL/kxI0hXImU6Y547zM6Sni8BQibt7ifgMcYtQg41ao3Ivd6cnSM86inpg==",
      "license": "MIT"
    },
    "node_modules/micromark": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/micromark/-/micromark-4.0.2.tgz",
      "integrity": "sha512-zpe98Q6kvavpCr1NPVSCMebCKfD7CA2NqZ+rykeNhONIJBpc1tFKt9hucLGwha3jNTNI8lHpctWJWoimVF4PfA==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "@types/debug": "^4.0.0",
        "debug": "^4.0.0",
        "decode-named-character-reference": "^1.0.0",
        "devlop": "^1.0.0",
        "micromark-core-commonmark": "^2.0.0",
        "micromark-factory-space": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-chunked": "^2.0.0",
        "micromark-util-combine-extensions": "^2.0.0",
        "micromark-util-decode-numeric-character-reference": "^2.0.0",
        "micromark-util-encode": "^2.0.0",
        "micromark-util-normalize-identifier": "^2.0.0",
        "micromark-util-resolve-all": "^2.0.0",
        "micromark-util-sanitize-uri": "^2.0.0",
        "micromark-util-subtokenize": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-core-commonmark": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/micromark-core-commonmark/-/micromark-core-commonmark-2.0.3.tgz",
      "integrity": "sha512-RDBrHEMSxVFLg6xvnXmb1Ayr2WzLAWjeSATAoxwKYJV94TeNavgoIdA0a9ytzDSVzBy2YKFK+emCPOEibLeCrg==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "decode-named-character-reference": "^1.0.0",
        "devlop": "^1.0.0",
        "micromark-factory-destination": "^2.0.0",
        "micromark-factory-label": "^2.0.0",
        "micromark-factory-space": "^2.0.0",
        "micromark-factory-title": "^2.0.0",
        "micromark-factory-whitespace": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-chunked": "^2.0.0",
        "micromark-util-classify-character": "^2.0.0",
        "micromark-util-html-tag-name": "^2.0.0",
        "micromark-util-normalize-identifier": "^2.0.0",
        "micromark-util-resolve-all": "^2.0.0",
        "micromark-util-subtokenize": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-extension-directive": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/micromark-extension-directive/-/micromark-extension-directive-4.0.0.tgz",
      "integrity": "sha512-/C2nqVmXXmiseSSuCdItCMho7ybwwop6RrrRPk0KbOHW21JKoCldC+8rFOaundDoRBUWBnJJcxeA/Kvi34WQXg==",
      "license": "MIT",
      "dependencies": {
        "devlop": "^1.0.0",
        "micromark-factory-space": "^2.0.0",
        "micromark-factory-whitespace": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0",
        "parse-entities": "^4.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/unified"
      }
    },
    "node_modules/micromark-extension-gfm-autolink-literal": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/micromark-extension-gfm-autolink-literal/-/micromark-extension-gfm-autolink-literal-2.1.0.tgz",
      "integrity": "sha512-oOg7knzhicgQ3t4QCjCWgTmfNhvQbDDnJeVu9v81r7NltNCVmhPy1fJRX27pISafdjL+SVc4d3l48Gb6pbRypw==",
      "license": "MIT",
      "dependencies": {
        "micromark-util-character": "^2.0.0",
        "micromark-util-sanitize-uri": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/unified"
      }
    },
    "node_modules/micromark-extension-gfm-footnote": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/micromark-extension-gfm-footnote/-/micromark-extension-gfm-footnote-2.1.0.tgz",
      "integrity": "sha512-/yPhxI1ntnDNsiHtzLKYnE3vf9JZ6cAisqVDauhp4CEHxlb4uoOTxOCJ+9s51bIB8U1N1FJ1RXOKTIlD5B/gqw==",
      "license": "MIT",
      "dependencies": {
        "devlop": "^1.0.0",
        "micromark-core-commonmark": "^2.0.0",
        "micromark-factory-space": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-normalize-identifier": "^2.0.0",
        "micromark-util-sanitize-uri": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/unified"
      }
    },
    "node_modules/micromark-extension-gfm-table": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/micromark-extension-gfm-table/-/micromark-extension-gfm-table-2.1.1.tgz",
      "integrity": "sha512-t2OU/dXXioARrC6yWfJ4hqB7rct14e8f7m0cbI5hUmDyyIlwv5vEtooptH8INkbLzOatzKuVbQmAYcbWoyz6Dg==",
      "license": "MIT",
      "dependencies": {
        "devlop": "^1.0.0",
        "micromark-factory-space": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/unified"
      }
    },
    "node_modules/micromark-extension-math": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/micromark-extension-math/-/micromark-extension-math-3.1.0.tgz",
      "integrity": "sha512-lvEqd+fHjATVs+2v/8kg9i5Q0AP2k85H0WUOwpIVvUML8BapsMvh1XAogmQjOCsLpoKRCVQqEkQBB3NhVBcsOg==",
      "license": "MIT",
      "dependencies": {
        "@types/katex": "^0.16.0",
        "devlop": "^1.0.0",
        "katex": "^0.16.0",
        "micromark-factory-space": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/unified"
      }
    },
    "node_modules/micromark-factory-destination": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-factory-destination/-/micromark-factory-destination-2.0.1.tgz",
      "integrity": "sha512-Xe6rDdJlkmbFRExpTOmRj9N3MaWmbAgdpSrBQvCFqhezUn4AHqJHbaEnfbVYYiexVSs//tqOdY/DxhjdCiJnIA==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-factory-label": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-factory-label/-/micromark-factory-label-2.0.1.tgz",
      "integrity": "sha512-VFMekyQExqIW7xIChcXn4ok29YE3rnuyveW3wZQWWqF4Nv9Wk5rgJ99KzPvHjkmPXF93FXIbBp6YdW3t71/7Vg==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "devlop": "^1.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-factory-space": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/micromark-factory-space/-/micromark-factory-space-2.1.0.tgz",
      "integrity": "sha512-fS8hnLIjnjvdQIj39Geug8wWsR0HrYZ43KShKxNfwT7t2LOHo/LbWZEzEaSOjwtjdCsjoE6syHhonEzW0zv0+Q==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-character": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-factory-title": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-factory-title/-/micromark-factory-title-2.0.1.tgz",
      "integrity": "sha512-5bZ+3CjhAd9eChYTHsjy6TGxpOFSKgKKJPJxr293jTbfry2KDoWkhBb6TcPVB4NmzaPhMs1Frm9AZH7OD4Cjzw==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-factory-space": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-factory-whitespace": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-factory-whitespace/-/micromark-factory-whitespace-2.0.1.tgz",
      "integrity": "sha512-Ob0nuZ3PKt/n0hORHyvoD9uZhr+Za8sFoP+OnMcnWK5lngSzALgQYKMr9RJVOWLqQYuyn6ulqGWSXdwf6F80lQ==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-factory-space": "^2.0.0",
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-util-character": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/micromark-util-character/-/micromark-util-character-2.1.1.tgz",
      "integrity": "sha512-wv8tdUTJ3thSFFFJKtpYKOYiGP2+v96Hvk4Tu8KpCAsTMs6yi+nVmGh1syvSCsaxz45J6Jbw+9DD6g97+NV67Q==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-util-chunked": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-chunked/-/micromark-util-chunked-2.0.1.tgz",
      "integrity": "sha512-QUNFEOPELfmvv+4xiNg2sRYeS/P84pTW0TCgP5zc9FpXetHY0ab7SxKyAQCNCc1eK0459uoLI1y5oO5Vc1dbhA==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-symbol": "^2.0.0"
      }
    },
    "node_modules/micromark-util-classify-character": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-classify-character/-/micromark-util-classify-character-2.0.1.tgz",
      "integrity": "sha512-K0kHzM6afW/MbeWYWLjoHQv1sgg2Q9EccHEDzSkxiP/EaagNzCm7T/WMKZ3rjMbvIpvBiZgwR3dKMygtA4mG1Q==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-character": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-util-combine-extensions": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-combine-extensions/-/micromark-util-combine-extensions-2.0.1.tgz",
      "integrity": "sha512-OnAnH8Ujmy59JcyZw8JSbK9cGpdVY44NKgSM7E9Eh7DiLS2E9RNQf0dONaGDzEG9yjEl5hcqeIsj4hfRkLH/Bg==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-chunked": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-util-decode-numeric-character-reference": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/micromark-util-decode-numeric-character-reference/-/micromark-util-decode-numeric-character-reference-2.0.2.tgz",
      "integrity": "sha512-ccUbYk6CwVdkmCQMyr64dXz42EfHGkPQlBj5p7YVGzq8I7CtjXZJrubAYezf7Rp+bjPseiROqe7G6foFd+lEuw==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-symbol": "^2.0.0"
      }
    },
    "node_modules/micromark-util-encode": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-encode/-/micromark-util-encode-2.0.1.tgz",
      "integrity": "sha512-c3cVx2y4KqUnwopcO9b/SCdo2O67LwJJ/UyqGfbigahfegL9myoEFoDYZgkT7f36T0bLrM9hZTAaAyH+PCAXjw==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT"
    },
    "node_modules/micromark-util-html-tag-name": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-html-tag-name/-/micromark-util-html-tag-name-2.0.1.tgz",
      "integrity": "sha512-2cNEiYDhCWKI+Gs9T0Tiysk136SnR13hhO8yW6BGNyhOC4qYFnwF1nKfD3HFAIXA5c45RrIG1ub11GiXeYd1xA==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT"
    },
    "node_modules/micromark-util-normalize-identifier": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-normalize-identifier/-/micromark-util-normalize-identifier-2.0.1.tgz",
      "integrity": "sha512-sxPqmo70LyARJs0w2UclACPUUEqltCkJ6PhKdMIDuJ3gSf/Q+/GIe3WKl0Ijb/GyH9lOpUkRAO2wp0GVkLvS9Q==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-symbol": "^2.0.0"
      }
    },
    "node_modules/micromark-util-resolve-all": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-resolve-all/-/micromark-util-resolve-all-2.0.1.tgz",
      "integrity": "sha512-VdQyxFWFT2/FGJgwQnJYbe1jjQoNTS4RjglmSjTUlpUMa95Htx9NHeYW4rGDJzbjvCsl9eLjMQwGeElsqmzcHg==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-util-sanitize-uri": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-sanitize-uri/-/micromark-util-sanitize-uri-2.0.1.tgz",
      "integrity": "sha512-9N9IomZ/YuGGZZmQec1MbgxtlgougxTodVwDzzEouPKo3qFWvymFHWcnDi2vzV1ff6kas9ucW+o3yzJK9YB1AQ==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "micromark-util-character": "^2.0.0",
        "micromark-util-encode": "^2.0.0",
        "micromark-util-symbol": "^2.0.0"
      }
    },
    "node_modules/micromark-util-subtokenize": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/micromark-util-subtokenize/-/micromark-util-subtokenize-2.1.0.tgz",
      "integrity": "sha512-XQLu552iSctvnEcgXw6+Sx75GflAPNED1qx7eBJ+wydBb2KCbRZe+NwvIEEMM83uml1+2WSXpBAcp9IUCgCYWA==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "devlop": "^1.0.0",
        "micromark-util-chunked": "^2.0.0",
        "micromark-util-symbol": "^2.0.0",
        "micromark-util-types": "^2.0.0"
      }
    },
    "node_modules/micromark-util-symbol": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/micromark-util-symbol/-/micromark-util-symbol-2.0.1.tgz",
      "integrity": "sha512-vs5t8Apaud9N28kgCrRUdEed4UJ+wWNvicHLPxCa9ENlYuAY31M0ETy5y1vA33YoNPDFTghEbnh6efaE8h4x0Q==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT"
    },
    "node_modules/micromark-util-types": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/micromark-util-types/-/micromark-util-types-2.0.2.tgz",
      "integrity": "sha512-Yw0ECSpJoViF1qTU4DC6NwtC4aWGt1EkzaQB8KPPyCRR8z9TWeV0HbEFGTO+ZY1wB22zmxnJqhPyTpOVCpeHTA==",
      "funding": [
        {
          "type": "GitHub Sponsors",
          "url": "https://github.com/sponsors/unifiedjs"
        },
        {
          "type": "OpenCollective",
          "url": "https://opencollective.com/unified"
        }
      ],
      "license": "MIT"
    },
    "node_modules/minimatch": {
      "version": "10.2.6",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-10.2.6.tgz",
      "integrity": "sha512-vpLQEs+VLCr1nU0BXS07maYoFwlDAH0gngQuuttxIwutDFEMHq2blX+8vpgxDdK3J1PwjCJiep77OitTZ4Ll1A==",
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "brace-expansion": "^5.0.8"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/minimist": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/minimist/-/minimist-1.2.8.tgz",
      "integrity": "sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "license": "MIT"
    },
    "node_modules/parse-entities": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/parse-entities/-/parse-entities-4.0.2.tgz",
      "integrity": "sha512-GG2AQYWoLgL877gQIKeRPGO1xF9+eG1ujIb5soS5gPvLQ1y2o8FL90w2QWNdf9I361Mpp7726c+lj3U0qK1uGw==",
      "license": "MIT",
      "dependencies": {
        "@types/unist": "^2.0.0",
        "character-entities-legacy": "^3.0.0",
        "character-reference-invalid": "^2.0.0",
        "decode-named-character-reference": "^1.0.0",
        "is-alphanumerical": "^2.0.0",
        "is-decimal": "^2.0.0",
        "is-hexadecimal": "^2.0.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/parse5": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/parse5/-/parse5-8.0.0.tgz",
      "integrity": "sha512-9m4m5GSgXjL4AjumKzq1Fgfp3Z8rsvjRNbnkVwfu2ImRqE5D0LnY2QfDen18FSY9C573YU5XxSapdHZTZ2WolA==",
      "license": "MIT",
      "dependencies": {
        "entities": "^6.0.0"
      },
      "funding": {
        "url": "https://github.com/inikulin/parse5?sponsor=1"
      }
    },
    "node_modules/parse5/node_modules/entities": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/entities/-/entities-6.0.1.tgz",
      "integrity": "sha512-aN97NXWF6AWBTahfVOIrB/NShkzi5H7F9r1s9mD3cDj4Ko5f2qhhVoYMibXF7GlLveb/D2ioWay8lxI97Ven3g==",
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=0.12"
      },
      "funding": {
        "url": "https://github.com/fb55/entities?sponsor=1"
      }
    },
    "node_modules/picomatch": {
      "version": "4.0.7",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.7.tgz",
      "integrity": "sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/punycode.js": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/punycode.js/-/punycode.js-2.3.1.tgz",
      "integrity": "sha512-uxFIHU0YlHYhDQtV4R9J6a52SLx28BCjT+4ieh7IGbgwVJWO+km431c4yRlREUAsAmt/uMjQUyQHNEPf0M39CA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/run-con": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/run-con/-/run-con-1.3.3.tgz",
      "integrity": "sha512-Lb7OKM9aaykzyoNiHGhSVCjZsvbyy6qDMp2vDXL+MoCfz3GfNJtHYH7uYsU3QNMyInBk++xx+EZ8xZ8Sxs5fNQ==",
      "license": "(BSD-2-Clause OR MIT OR Apache-2.0)",
      "dependencies": {
        "deep-extend": "^0.6.0",
        "ini": "~7.0.0",
        "minimist": "^1.2.8",
        "strip-json-comments": "~3.1.1"
      },
      "bin": {
        "run-con": "cli.js"
      }
    },
    "node_modules/saxes": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/saxes/-/saxes-6.0.0.tgz",
      "integrity": "sha512-xAg7SOnEhrm5zI3puOOKyy1OMcMlIJZYNJY7xLBwSze0UjhPLnWfj2GF2EpT0jmzaJKIWKHLsaSSajf35bcYnA==",
      "license": "ISC",
      "dependencies": {
        "xmlchars": "^2.2.0"
      },
      "engines": {
        "node": ">=v12.22.7"
      }
    },
    "node_modules/smol-toml": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/smol-toml/-/smol-toml-1.6.0.tgz",
      "integrity": "sha512-4zemZi0HvTnYwLfrpk/CF9LOd9Lt87kAt50GnqhMpyF9U3poDAP2+iukq2bZsO/ufegbYehBkqINbsWxj4l4cw==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "url": "https://github.com/sponsors/cyyynthia"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.2.tgz",
      "integrity": "sha512-KGj/8Y43x35aZVDtt+J4mK1hoLGHULMYfSkODJNQjNDC3oW1PqPoxMwo0pLUsWM/UEGzON/NxeHywEfNXNP3Vw==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/string-width": {
      "version": "8.1.0",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-8.1.0.tgz",
      "integrity": "sha512-Kxl3KJGb/gxkaUMOjRsQ8IrXiGW75O4E3RPjFIINOVH8AMl2SQ/yWdTzWwF3FevIX9LcMAjJW+GRwAlAbTSXdg==",
      "license": "MIT",
      "dependencies": {
        "get-east-asian-width": "^1.3.0",
        "strip-ansi": "^7.1.0"
      },
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/strip-ansi": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-7.2.0.tgz",
      "integrity": "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^6.2.2"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/strip-ansi?sponsor=1"
      }
    },
    "node_modules/strip-json-comments": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/strip-json-comments/-/strip-json-comments-3.1.1.tgz",
      "integrity": "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/tinyglobby": {
      "version": "0.2.17",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.17.tgz",
      "integrity": "sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g==",
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.4"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/typescript": {
      "version": "6.0.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz",
      "integrity": "sha512-y2TvuxSZPDyQakkFRPZHKFm+KKVqIisdg9/CZwm9ftvKXLP8NRWj38/ODjNbr43SsoXqNuAisEf1GdCxqWcdBw==",
      "license": "Apache-2.0",
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/uc.micro": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/uc.micro/-/uc.micro-2.1.0.tgz",
      "integrity": "sha512-ARDJmphmdvUk6Glw7y9DQ2bFkKBHwQHLi2lsaH6PPmz/Ka9sFOBsBluozhDltWmnv9u/cF6Rt87znRTPV+yp/A==",
      "license": "MIT"
    },
    "node_modules/undici-types": {
      "version": "7.16.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-7.16.0.tgz",
      "integrity": "sha512-Zz+aZWSj8LE6zoxD+xrjh4VfkIG8Ya6LvYkZqtUQGJPZjYl53ypCaUwWqo7eI0x66KBGeRo+mlBEkMSeSZ38Nw==",
      "license": "MIT"
    },
    "node_modules/xmlchars": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/xmlchars/-/xmlchars-2.2.0.tgz",
      "integrity": "sha512-JZnDKK8B0RCDw84FNdDAIpZK+JuJw+s7Lz8nksI7SIuU3UXJJslUthsi+uWBUYOwPFwW7W7PRLRfUKpxjtjFCw==",
      "license": "MIT"
    }
  }
}
```

## File: `package.json`

```json
{
  "name": "@winrecoveryproject/linter",
  "version": "0.1.6",
  "description": "Read-only local source linting with explicit coverage and zero paid services",
  "type": "module",
  "license": "MIT",
  "author": "Zilvereyes",
  "homepage": "https://github.com/WinRecoveryProject/WinRecoveryProjectLinter",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/WinRecoveryProject/WinRecoveryProjectLinter.git"
  },
  "engines": {
    "node": ">=24"
  },
  "bin": {
    "wrp-lint": "bin/wrp-lint.mjs"
  },
  "scripts": {
    "test": "node --test",
    "verify:runtime": "node scripts/verify-fresh-runtime.mjs",
    "package:native": "python -I scripts/package-native.py",
    "check": "node --check bin/wrp-lint.mjs && node --check src/engine.mjs && node --test"
  },
  "files": [
    "bin",
    "src",
    "adapters",
    "config",
    "skills",
    "test",
    "scripts",
    ".codex-plugin",
    "assets",
    "README.md",
    "LICENSE",
    "licenses",
    "THIRD-PARTY-NOTICES.md",
    "PRIVACY.md",
    "TERMS.md",
    "package-lock.json",
    "npm-shrinkwrap.json",
    "chatgpt-app-submission.json"
  ],
  "dependencies": {
    "@types/node": "24.10.1",
    "css-tree": "3.1.0",
    "js-yaml": "4.1.1",
    "jsonc-parser": "3.3.1",
    "libpg-query": "18.2.4",
    "luaparse": "0.3.1",
    "markdownlint": "0.40.0",
    "markdownlint-cli": "0.48.0",
    "parse5": "8.0.0",
    "saxes": "6.0.0",
    "smol-toml": "1.6.0",
    "typescript": "6.0.3"
  }
}
```
