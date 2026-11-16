# Bundled task-boundary board

The MIT-adapted runtime is contained under `runtime/coordinator/`. It uses Python
standard library, installed Git for lifecycle checkout verification, and compatible
existing `.codex/coordination/` schema 2 state.
No source plugin installation is required. Local state helpers do not call task APIs,
read private Codex databases, start workers or send messages.

Resolve the Git common repository and primary worktree before board operations.
Read marker first; false is opt-out and no active board/archive should be inspected.
Absent marker stays absent unless enabling is requested. Schema 1 is legacy and must
be disabled/migrated before schema 2 writes. Migration preserves old data and an exact
marker backup, creates an empty new board and leaves coordination disabled.

Lifecycle commands are dry-run first:

```text
python runtime/coordinator/project.py project init --project-root <repo> --project-id <id> --project-name <name> --task-prefix <PREFIX>
python runtime/coordinator/project.py project deactivate --project-root <repo>
python runtime/coordinator/project.py project migrate --project-root <repo> --confirm-project-id <id>
python runtime/coordinator/project.py project reactivate --project-root <repo>
python runtime/coordinator/project.py project purge --project-root <repo> --confirm-project-id <id>
```

Inspect the concrete plan. Add `--apply` only within the user's existing lifecycle
authorization. Purge is a separate destructive request; it is never routine disable.
Legacy cleanup can require `--confirm-legacy-runtime-stopped`; do not assert it without
evidence. The helper refuses unknown/unmarked state, links and project mismatches.
Preserve all unrelated files/bytes. Migration of existing discovery text is proposed
separately; never replace arbitrary AGENTS.md content to make a board command pass.

State commands use exact native thread identity and optimistic revisions:

```text
python runtime/coordinator/state.py list --project-root <primary-repo>
python runtime/coordinator/state.py claim --project-root <primary-repo> --thread-id <uuid> --title <title> --goal <bounded-goal> --path <relative-path> --expected-revision 0
python runtime/coordinator/state.py release --project-root <primary-repo> --thread-id <uuid> --expected-revision <current> --status completed
```

Claim accepts repeated `--path`, narrow `--action`, `--blocked-by`, active/blocked
status and an explicit `--user-approved-over-limit` only with actual user decision.
Allowed release states: completed, stopped, superseded, stale-owner-confirmed.
Path overlap only warns; exclusive action overlap conflicts. Generated CURRENT.md
is active-only and non-authoritative. Do not store transcripts or progress diaries.
Malformed/oversized records, project/identity mismatch, links, unsupported schema and
lost revision fail closed without discarding valid work. Recovery of another owner's
claim requires exact native terminal/archived/unusable evidence; silence is insufficient.

Native chat tools own task creation/messages. Default one task; create chats only when
the human explicitly asks. Reuse suitable related tasks, keep same primary checkout/
branch, assign two or three substantial verticals and one writer per boundary when
authorized. No automatic fan-in or background process exists. Integration is explicit
and verified after workers finish. Shared generated writes are serialized; commits use
explicit reviewed paths and preserve foreign staged changes, only when authorized.

Sparse notice kinds are GOAL_ASSIGNMENT, COLLISION, DEPENDENCY and RELEASED. Verify
same repository/project, exact sender/recipient UUID and active claims before acting.
Only an explicitly appointed goal-coordination owner may assign bounded in-repo work;
no notice grants external/destructive authority. Host human-message authorization
still applies. Notices contain project, kind, sender, recipient, boundary and effect;
never a transport envelope, transcript, code or log. No acknowledgment/status chains.

## Optional hook preservation without duplicate registration

`runtime/coordinator/session_start.py` retains bounded marker-only guidance.
`runtime/coordinator/stop_guard.py` reads only the exact current claim and uses the
host stop-hook circuit breaker. Neither writes state, scans histories or launches
children. They can be tested/manually invoked without the source package. Hooks are
deliberately not auto-registered: the current Coordinator's hooks may remain active.
The migration owner can replace that registration with the [optional blueprint](hooks-blueprint.json)
after disabling the old registration exactly once. Never activate both. No scheduler,
observer, heartbeat, interpreter installation or in-place self-repair is introduced.

DevSuite `doctor` replaces source-specific package doctor with contained package,
reference, syntax, App, matrix and asset validation. It is manual/read-only, reports
failure without repairs and cannot validate provider health or another installation.
