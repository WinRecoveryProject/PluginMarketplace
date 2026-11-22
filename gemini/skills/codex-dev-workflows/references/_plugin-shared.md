# Plugin files: codex-dev-workflows — `shared/`

Source: `plugins/codex-dev-workflows`. Files outside the `skills/*` folders, embedded as text.

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
