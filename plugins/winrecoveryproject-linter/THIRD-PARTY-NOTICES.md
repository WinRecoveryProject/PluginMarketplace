# Third-party notices and provenance

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
