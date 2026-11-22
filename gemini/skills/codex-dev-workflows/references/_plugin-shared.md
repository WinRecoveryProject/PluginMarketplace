# Plugin files: codex-dev-workflows — `shared/`

Source: `plugins/codex-dev-workflows`. Files outside the `skills/*` folders, embedded as text.

## File: `shared/platforms/batch-cmd.md`

### Batch and CMD guidance

Use this reference for `.bat` and `.cmd` launchers and scripts. First find out how each file is started (double-click, another script, a scheduled task, an installer) and which Windows versions must run it.

#### Implementation focus

- Keep `.bat`/`.cmd` files with CRLF line endings; LF-only files can break labels, `goto` and `call :label`. A `.gitattributes` rule (`*.cmd text eol=crlf`) keeps checkouts correct.
- Use `setlocal` so variables do not leak into the caller, and delayed expansion (`!var!`) for values changed inside parenthesized blocks.
- Quote paths: `"%~dp0"` for the script folder (it ends with a backslash) and `set "name=value"` to avoid trailing spaces.
- Escape `&`, `|`, `<`, `>`, `^` and parentheses outside quotes, including inside `echo` lines within blocks; quote path-bearing messages.
- Return explicit exit codes with `exit /b <code>` and check `if errorlevel 1` right after the command that matters.
- Keep launchers thin: resolve the project root, call the real PowerShell or other tool with explicit arguments, and pass its exit code back.
- Never delete with `rmdir /s /q` or `del /s` on a path built from arguments without first validating it.

#### Validation

There is no built-in parser check, and running the file is not a test. Review by reading: balanced parentheses, `%var%` inside blocks, every exit path, and quoting of every path. Exercise launchers through the project's own test harness in a simulation folder when one exists.

#### QA watch list

- paths containing spaces, parentheses, `&` or `!`
- behavior with delayed expansion on versus off
- code page (`chcp 65001`) and non-ASCII output
- `pause` in non-interactive contexts such as CI or scheduled tasks
- the command-line length limit of 8191 characters

## File: `shared/platforms/flutter.md`

### Flutter guidance

Use this reference only for Flutter/Dart projects. First inspect `pubspec.yaml`, repository instructions, CI configuration, and existing test conventions. Do not assume a state-management package or platform target.

#### Implementation focus

- Preserve null safety and use immutable state where the project convention supports it.
- Keep business/game logic testable outside widgets when practical.
- Handle asynchronous work safely: avoid using `BuildContext` across async gaps without checking lifecycle expectations.
- Dispose controllers, focus nodes, subscriptions, timers, and listeners that the owning object created.
- Make state ownership and reset behavior explicit, especially across navigation, restart/new-game, and app lifecycle transitions.
- Test accessibility-sensitive layout: text scaling, semantics, contrast, tap targets, small screens, and long/localized strings where relevant.

#### Validation

Use the project-documented commands. When no different project convention exists, the usual baseline is:

```text
dart format --output=none --set-exit-if-changed .
flutter analyze
flutter test
```

Run integration tests only when they exist or when the change requires them. Add unit tests for logic and widget tests for meaningful interactions/state transitions; avoid brittle tests tied to incidental widget structure.

#### QA watch list

- `setState` after disposal, stale listeners, and leaked timers/controllers
- incorrect rebuild or retained state across routes
- back navigation, deep links, app pause/resume, and persistence behavior
- overflow, keyboard/focus behavior, and pointer/gesture conflicts
- enabled controls that should be disabled during loading or a terminal game state

## File: `shared/platforms/javascript-typescript.md`

### JavaScript / TypeScript guidance

Use this reference for JavaScript or TypeScript projects. Inspect `package.json`, lockfiles, tool configuration, CI, and existing tests to discover the actual commands and framework. Do not assume React, Node, Vite, Jest, Playwright, or a package manager.

#### Implementation focus

- Preserve type safety and strict compiler settings already adopted by the project.
- Validate external data at boundaries; avoid silently spreading `any`, `unknown`, `null`, or `undefined` into application state.
- Make async cancellation, error handling, and loading/terminal states explicit.
- Register and clean up event listeners, timers, subscriptions, and observers exactly once.
- Avoid stale closures, duplicated handlers, mutable shared state, and browser/server environment confusion.

#### Validation

Run the configured lint, type-check, test, and production-build commands. Use existing browser automation for user-critical flows; do not introduce a large testing framework merely to satisfy a single workflow.

#### QA watch list

- uncaught/rejected promises and unhandled error paths
- rapid repeat clicks/taps/keyboard input and overlapping async requests
- focus, resize, visibility, navigation, storage, and refresh behavior
- DOM/UI state that disagrees with application state
- production build or environment-variable failures masked by development mode

## File: `shared/platforms/laravel-php.md`

### Laravel / PHP guidance

Use this reference for Laravel/PHP projects. Inspect `composer.json`, `artisan` commands, environment configuration, migrations, routes, policies, queues, CI, and existing tests. Respect the project's Laravel and PHP versions.

#### Implementation focus

- Preserve framework conventions for requests, validation, authorization, models, events, queues, and error responses.
- Validate at request boundaries and authorize every relevant action server-side.
- Use database transactions when a multi-step write must be atomic.
- Avoid N+1 queries, mass-assignment mistakes, missing tenant/account scoping, and inconsistent serialization.
- Keep secrets out of version control and logs; use the project's configuration conventions.

#### Validation

Use repository commands and existing test configuration. Typical checks may include `php artisan test`, a formatter such as Pint, static analysis, and a frontend build when applicable, but do not assume their availability.

#### QA watch list

- validation/authorization gaps and incorrect policy behavior
- migrations, seeders, factories, rollback paths, and queue failures
- cache/session behavior, locale/timezone formatting, and pagination/filtering boundaries
- HTTP status/error contracts, database constraints, and concurrency-sensitive writes

## File: `shared/platforms/lua-wow.md`

### Lua and World of Warcraft addon guidance

Use this reference for Lua code, including World of Warcraft addons. First identify the runtime: PUC Lua 5.1 to 5.4, LuaJIT, or an embedded host. World of Warcraft embeds a modified Lua 5.1 with its own API, so identify the game branch and build the addon targets (Retail or a Classic branch) and read the addon's TOC files.

#### Implementation focus

- Write for the target version: World of Warcraft code cannot use `goto`, integer division `//`, native bitwise operators or `<const>`/`<close>`.
- Keep state local. Addons share one global environment, so expose at most one addon table and avoid leaking globals.
- Respect load order: files load in the order listed in the TOC, and libraries must load before code that uses them.
- Register for events instead of polling, and unregister when no longer needed.
- Treat API availability as branch-specific; check the current API for the targeted build instead of relying on memory.
- Avoid protected or secure actions in combat unless the API allows them; tainted code paths cause blocked actions.
- Keep `SavedVariables` names in the TOC in sync with the globals the code writes, and handle missing or old saved data.

#### Validation

Use the project's configured checks, such as `luacheck` with the project's globals and a version-matched `luac -p` parse. Parse success does not prove World of Warcraft compatibility; in-game testing on the targeted build is the real check, and the user runs it.

#### QA watch list

- nil handling for API returns that differ per branch or when data is not loaded yet
- `#` on tables with gaps, and integer versus float differences between Lua versions
- per-character versus account-wide saved data and migration from older formats
- localization, UI scaling and font differences
- event order at login, reload and zoning

## File: `shared/platforms/powershell.md`

### PowerShell guidance

Use this reference for PowerShell scripts and modules. First inspect `#Requires` lines, module manifests (`.psd1`), repository instructions, CI and existing tests. Establish which hosts must run the code: Windows PowerShell 5.1, PowerShell 7, or both.

#### Implementation focus

- Keep both hosts working when both are supported: avoid PowerShell 7-only syntax (`??`, `?.`, ternary `? :`, `&&`/`||` pipeline chains, `ForEach-Object -Parallel`) in code that must run on 5.1.
- Start scripts with `Set-StrictMode -Version Latest` and `$ErrorActionPreference = 'Stop'` when the project does; non-terminating errors otherwise continue silently.
- Native commands do not throw on failure. Check `$LASTEXITCODE` after each one that matters.
- Use `-LiteralPath` for paths that can contain `[`, `]` or `*`, and resolve roots from parameters or `$PSScriptRoot`, never from the current directory or a hard-coded drive.
- Do not assign to automatic variables (`$input`, `$args`, `$PSItem`, `$Error`, `$host`, `$matches`).
- Be explicit about text encoding: Windows PowerShell 5.1 writes UTF-16 or ANSI by default and reads BOM-less files as ANSI; PowerShell 7 defaults to UTF-8 without BOM.
- Wrap single results in `@()` when the caller expects an array; a pipeline returning one item yields a scalar.
- Keep destructive actions behind `SupportsShouldProcess` (`-WhatIf`/`-Confirm`) and explicit parameters.

#### Validation

Use the project's configured checks. A common baseline is a parser check of every script in each supported host, `Invoke-ScriptAnalyzer` with the project settings, and Pester or the repository's own `Test-*.ps1` scripts run in both hosts. Do not run scripts that change the system, install drivers or touch the registry as part of validation unless the user authorized that environment.

#### QA watch list

- paths with spaces, brackets and non-ASCII characters; UNC and long paths
- 5.1 versus 7 differences in encoding, `ConvertTo-Json`/`ConvertFrom-Json`, and `Start-Process` argument quoting
- exit codes from native tools and from `exit` inside scripts called with `&`
- execution policy, elevation, and 32- versus 64-bit hosts
- scheduled-task or service contexts with a different user profile and working directory

## File: `shared/platforms/python.md`

### Python guidance

Use this reference for Python projects. Inspect `pyproject.toml`, `requirements` files, lockfiles, task runners, CI, and the test layout before selecting commands. Respect the project's Python-version and dependency-management choices.

#### Implementation focus

- Preserve type hints and validation patterns used by the project.
- Separate deterministic business logic from I/O where practical.
- Handle resources with context managers and clean up files, sessions, subprocesses, and background work.
- Make exceptions actionable; do not swallow errors without an established reason.
- Treat configuration and environment data as untrusted and avoid logging secrets.

#### Validation

Run the project's formatter, linter, type checker, and test suite. Common tools include `ruff`, `black`, `mypy`/`pyright`, and `pytest`, but use only the configured tooling. Add focused regression tests that cover behavior rather than implementation trivia.

#### QA watch list

- boundary type/value errors, encoding and timezone issues
- exception paths, retry/idempotency behavior, and cleanup after failure
- mutable defaults, global state, import-time side effects, and concurrency hazards
- differences between local and packaged/CI execution
