# Local processes and durable remote tasks

| Work | Owner | Actual execution | Evidence |
| --- | --- | --- | --- |
| Plan / ownership / board | devsuite-planning | Bundled Coordinator helpers, authorized native coordination | Board and task ownership are not execution permission |
| Finite local process | devsuite-jobs | Host execution/session on Windows; optional existing CPJ POSIX controller on Linux/macOS | Exact session or verified job identity, bounded logs, final exit code |
| Remote Codex task | devsuite-tasks | Existing Codex Tasks App/native host provider | Current environment, real task ID and returned turn results |
| Source change / QA / security | Existing focused DevSuite skills | Project runners and actual authorized providers | Fresh behavior and artifacts, not provider name alone |

`process-plan` consumes JSON with platform (`windows`, `linux`, `macos`), nonempty
`argv`, absolute `cwd`, `finite:true`, `interactive:false`, and optional lifetime
(`host-session` or `detached`). It preserves argv as data and never executes it.
Windows detached execution must persist PID, process creation time, executable,
payload identity and final result. A PID alone is not success. Do not change or
cancel old jobs, preferences, launch hooks or connection settings during migration.

`task-environment` consumes the actual provider response `{data:[],nextCursor:null}`.
It deliberately handles both attached connected executors and ready managed cloud
configurations. Collect all pages first. Selection, `canRun`, consent, 0 kr usage,
launch and completion are distinct facts. An unavailable provider does not block
independent local work. The App is optional and discovered at runtime; this update
adds no App ID, MCP server, authentication flow or duplicate connection.

The Jobs and Tasks workflows are independently written integrations, not copies of
proprietary service code. Codex Process Jobs' Apache-2.0 controller remains an optional
existing POSIX provider; its source and private job state are not bundled. Local
Windows session operations use host tools directly. Codex Tasks remains an external
host service. No asynchronous work is started by selection or validation tests.
