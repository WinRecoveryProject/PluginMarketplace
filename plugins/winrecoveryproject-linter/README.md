# WinRecoveryProjectLinter

Version 0.1.0. An independent MIT local CLI and Codex plugin by Zilvereyes.
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
locked Node libraries into this product's own directory using npm ci with
scripts disabled, the public registry and trusted empty npm config files.
It never runs npm in the inspected project. Node must include npm.
The npm distributable carries `npm-shrinkwrap.json`, identical to the source
`package-lock.json`, because npm excludes package-lock from published packages.
For a development checkout, `npm ci --ignore-scripts` also prepares dependencies.
No global install or global configuration change is needed. You may run the
packaged `bin/wrp-lint.mjs` directly; npm also exposes the `wrp-lint` bin.

```powershell
node ./bin/wrp-lint.mjs init "C:/my/project" --types powershell,lua,toc
node ./bin/wrp-lint.mjs scan "C:/my/project" --types powershell,lua,toc
node ./bin/wrp-lint.mjs setup "C:/my/project" --types batch,bash
```

`init` creates `.wrp-lint.json` with exclusive creation and refuses overwrites.
The JSON data schema accepts only `version: 1`, optional `types`, and `exclude`
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

The default selects detected supported source types. `--types` or config `types`
narrows this selection; omitted detected families remain visible in notices.
YAML, TOML and Python adapters run only when detected or explicitly selected.
Recognized unsupported source formats (including SCSS/Less, Bats and SQL) are
listed as INCOMPLETE. Images, archives and unknown non-source files are ignored.

PowerShell requires an existing trusted pwsh >=7.4.6 and PSScriptAnalyzer 1.25.0.
The wrapper imports only that exact version and uses parser input snapshots and
`Invoke-ScriptAnalyzer -ScriptDefinition` with a fixed built-in rule allowlist.
It does not download PowerShell modules or resolve DSC dependencies.

Batch setup creates `.tools/blinter` as a separate Python venv and installs
the pinned Blinter and charset-normalizer wheels with PyPI SHA-256 hashes.
Blinter is AGPL-3.0-or-later, independently installed, and is not included in
the MIT distributable. Python itself must already exist.

On Windows, Bash setup installs checksum-pinned official ShellCheck 0.11.0
into `.tools/shellcheck`; Git Bash/GNU Bash must already exist. Other platforms
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
npm pack --ignore-scripts
```

Tests exercise real parsers and installed external tools with positive/negative
fixtures, CRLF, Danish names, paths with spaces, TOC tokens, dependency failures,
fresh extraction, read-only behavior, process limits and symlink containment.
`verify:runtime` performs a separate temporary fresh extraction, proves missing
library failures, explicitly bootstraps its locked dependencies and then scans.
It never borrows the original checkout's node_modules.
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
