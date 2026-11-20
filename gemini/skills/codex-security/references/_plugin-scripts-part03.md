# Plugin files: codex-security — `scripts/` (part 3 of 3)

Source: `plugins/codex-security`. Files outside the `skills/*` folders, embedded as text.

## File: `scripts/workbench_scan_start.py`

```python
"""Shared scan-start helpers for the Codex Security workbench."""

from __future__ import annotations

import argparse
import errno
import json
import os
import re
import sqlite3
import sys
import tempfile
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from filesystem_identity import serialize_filesystem_identity
from finalize_scan_contract import write_scan_local_bytes
from workbench.storage import (
    archive_source_directory,
    create_private_temporary_directory,
    short_archive_prefix,
    state_dir,
)
from workbench_feedback import get_scan_feedback
from workbench_target import (
    directory_content_digest,
    git_revision,
    worktree_content_digest,
)
from workbench_validation import optional_text, read_json_object

def safe_segment(value: str) -> str:
    """Normalize a filename segment, falling back to ``scan`` for an empty result."""
    segment = re.sub(r"[^\w.-]", "-", value)
    if segment != value:
        segment = segment.strip("-")
    return segment or "scan"

def compact_timestamp() -> str:
    """Return the current UTC time in YYYYMMDDTHHMMSSZ format."""
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

def loaded_plugin_version() -> str:
    """Read the required version string from the loaded plugin's manifest."""
    manifest = read_json_object(
        Path(__file__).resolve().parents[1] / ".codex-plugin" / "plugin.json"
    )
    version = manifest.get("version")
    if not isinstance(version, str) or not version:
        raise SystemExit("plugin.json: expected a nonempty Codex Security plugin version.")
    return version

def scan_target_identity(
    target: Path,
    diff_target: dict[str, str] | None,
    *,
    metadata: os.stat_result | None = None,
    expected_digest: str | None = None,
) -> tuple[str, str | None, int | str, int | str]:
    """Return revision, content digest, device ID, and inode for scan registration.

    An explicit diff uses its head revision and a None digest. Other targets use
    the worktree or directory digest. Device and inode use the SQLite-safe representation.
    """
    if metadata is None:
        metadata = target.stat()
    revision = diff_target["headRevision"] if diff_target else git_revision(target)
    snapshot_digest = None
    if diff_target is None:
        snapshot_digest = (
            directory_content_digest(target)
            if revision == "unversioned"
            else worktree_content_digest(target, expected_digest=expected_digest)
        )
    return (
        revision,
        snapshot_digest,
        serialize_filesystem_identity(metadata.st_dev),
        serialize_filesystem_identity(metadata.st_ino),
    )

@dataclass(frozen=True)
class WindowsResumeTarget:
    path: Path
    snapshot: tuple[str, str | None, int | str, int | str]
    native_id: tuple[int, int] | None

def prepare_cli_scan_target(
    target: Path, diff_target: dict[str, str] | None, mode: str, launch_kind: str
) -> tuple[tuple[str, str | None, int | str, int | str], WindowsResumeTarget | None]:
    if os.name == "nt" and mode in {"standard", "deep"} and launch_kind == "scan":
        from windows_scan_local_files import pinned_resume_checkout

        with pinned_resume_checkout(target) as native:
            snapshot = scan_target_identity(target, diff_target)
            return snapshot, WindowsResumeTarget(target, snapshot, native)
    return scan_target_identity(target, diff_target), None

def scan_diff_identity(
    diff_target: dict[str, str] | None,
) -> tuple[str | None, str | None, str | None, str | None]:
    """Return kind, base, head, and optional digest in database order, or four nulls."""
    if diff_target is None:
        return (None, None, None, None)
    return (
        diff_target["kind"],
        diff_target["baseRevision"],
        diff_target["headRevision"],
        diff_target.get("contentDigest"),
    )

def stored_diff_target(row: sqlite3.Row) -> dict[str, str] | None:
    """Rebuild the diff target from a scan row, or return None for a full scan."""
    if not row["diff_target_kind"]:
        return None
    target = {
        "baseRevision": row["diff_base_revision"],
        "headRevision": row["diff_head_revision"],
        "kind": row["diff_target_kind"],
    }
    if row["diff_content_digest"]:
        target["contentDigest"] = row["diff_content_digest"]
    return target

@contextmanager
def archive_scan(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    scan_dir: Path,
    timestamp: str,
    canonical_directory: Callable[[Path], Path],
    *,
    before_archive: Callable[[], None] | None = None,
) -> Iterator[Path | None]:
    """Yield the archive directory while preparing the original scan path for reuse."""
    archived_scan_dir = (
        canonical_directory(Path(args.archived_scan_dir).expanduser())
        if args.archived_scan_dir is not None
        else None
    )
    if archived_scan_dir is not None and (
        not args.archive_existing
        or archived_scan_dir.parent != scan_dir.parent
        or archive_source_directory(archived_scan_dir, scan_dir) != scan_dir
    ):
        raise SystemExit("The archived scan must be a previous sibling of the scan directory.")

    previous_scan = connection.execute(
        "SELECT id, status FROM scans WHERE scan_dir = ?", (str(scan_dir),)
    ).fetchone()
    if previous_scan is not None:
        if not args.archive_existing:
            raise SystemExit(
                "The scan artifact directory belongs to an existing scan. "
                "Use --archive-existing to preserve that scan and start a new one."
            )
        if previous_scan["status"] == "running":
            raise SystemExit("Cannot archive the output of a running scan.")
    has_contents = next(scan_dir.iterdir(), None) is not None
    if has_contents and (not args.archive_existing or archived_scan_dir is not None):
        raise SystemExit("The scan artifact directory must be empty before the scan starts.")
    if previous_scan is None and not (args.archive_existing and has_contents):
        yield archived_scan_dir
        return
    has_artifacts = (
        connection.execute(
            "SELECT 1 FROM scan_artifacts WHERE scan_id = ? LIMIT 1", (previous_scan["id"],)
        ).fetchone()
        if previous_scan is not None
        else None
    )
    moved = False
    try:
        if archived_scan_dir is None:
            configured_state = state_dir(canonical=False)
            protected_directories = [
                *(path.resolve() for path in (configured_state, *configured_state.parents)),
                *(
                    Path(row[2]).resolve().parent
                    for row in connection.execute("PRAGMA database_list")
                    if row[2]
                ),
            ]
            if any(path == scan_dir or scan_dir in path.parents for path in protected_directories):
                raise SystemExit(
                    "Cannot archive output containing the workbench state or active database."
                )
            if has_artifacts and not has_contents:
                raise SystemExit(
                    "The archived scan directory is required to preserve existing scan artifacts."
                )
            if before_archive is not None:
                before_archive()
            try:
                reserved = tempfile.mkdtemp(
                    prefix=f"{scan_dir.name}.previous-", dir=scan_dir.parent
                )
            except OSError as error:
                if os.name != "posix" or error.errno != errno.ENAMETOOLONG:
                    raise
                reserved = tempfile.mkdtemp(
                    prefix=short_archive_prefix(scan_dir.name), dir=scan_dir.parent
                )
            archived_scan_dir = Path(reserved).resolve()
            archived_scan_dir.rmdir()
            scan_dir.rename(archived_scan_dir)
            moved = True
            if os.name == "nt":
                from windows_scan_local_files import create_directory_with_same_dacl

                create_directory_with_same_dacl(scan_dir, archived_scan_dir)
            else:
                scan_dir.mkdir(mode=0o700)
                scan_dir.chmod(0o700)
        if previous_scan is not None:
            connection.execute(
                "UPDATE scans SET scan_dir = ?, updated_at = ? WHERE id = ?",
                (str(archived_scan_dir), timestamp, previous_scan["id"]),
            )
            connection.execute(
                """UPDATE finding_workflows SET scan_dir = ?,
                    results_json = CASE WHEN json_extract(results_json, '$.scan.sarifPath') = ?
                        THEN json_set(results_json, '$.scan.sarifPath', ?) ELSE results_json END
                    WHERE scan_id = ? AND scan_dir = ?""",
                (
                    str(archived_scan_dir),
                    str(scan_dir / "exports" / "results.sarif"),
                    str(archived_scan_dir / "exports" / "results.sarif"),
                    previous_scan["id"],
                    str(scan_dir),
                ),
            )

            def archive_path(value: str | None) -> str | None:
                if value is None or not Path(value).is_relative_to(scan_dir):
                    return value
                return str(archived_scan_dir / Path(value).relative_to(scan_dir))

            connection.create_function("archive_path", 1, archive_path)
            try:
                for table, columns in (
                    ("scan_artifacts", ("path",)),
                    ("deep_scan_workers", ("prompt_path", "artifact_dir", "result_manifest_path")),
                    (
                        "deep_scan_runs",
                        (
                            "manifest_path",
                            "canonical_inventory_path",
                            "canonical_finding_report_path",
                            "canonical_candidates_path",
                            "dedupe_report_path",
                            "seed_research_path",
                            "work_ledger_path",
                            "raw_candidates_path",
                            "coverage_ledger_path",
                            "findings_dir",
                        ),
                    ),
                ):
                    assignments = ", ".join(
                        f"{column} = archive_path({column})" for column in columns
                    )
                    connection.execute(
                        f"UPDATE {table} SET {assignments} WHERE scan_id = ?",
                        (previous_scan["id"],),
                    )
            finally:
                connection.create_function("archive_path", 1, None)
        # The caller commits registration before leaving this context. Older SDKs
        # supplied an already-moved directory; only restore moves we own.
        yield archived_scan_dir
    except BaseException:
        if moved:
            if not connection.in_transaction:
                current_owner = connection.execute(
                    "SELECT id FROM scans WHERE scan_dir = ?", (str(scan_dir),)
                ).fetchone()
                if current_owner is not None and (
                    previous_scan is None or current_owner["id"] != previous_scan["id"]
                ):
                    # A post-commit interrupt must not undo the saved archive location.
                    raise
            try:
                scan_dir.rmdir()
            except FileNotFoundError:
                # Registration may fail before recreating the empty output directory.
                pass
            archived_scan_dir.rename(scan_dir)
        raise

def restore_cli_scan_archive(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    canonical_directory: Callable[[Path], Path],
) -> dict[str, str]:
    supplied_scan_dir = Path(args.scan_dir).expanduser().absolute()
    supplied_archive = Path(args.archived_scan_dir).expanduser().absolute()
    connection.execute("BEGIN IMMEDIATE")
    try:
        scan_dir = supplied_scan_dir.resolve()
        archived_scan_dir = supplied_archive.resolve()
        archived_owner = connection.execute(
            "SELECT id FROM scans WHERE scan_dir = ?", (str(archived_scan_dir),)
        ).fetchone()
        previous_scan = connection.execute(
            "SELECT id FROM scans WHERE scan_dir = ?", (str(scan_dir),)
        ).fetchone()
        previous_scan_id = previous_scan["id"] if previous_scan is not None else None
        if archived_owner is not None:
            disposition = "already-recorded"
        elif previous_scan_id != args.previous_scan_id:
            disposition = "ownership-changed"
        else:
            archived_scan_dir = canonical_directory(supplied_archive)
            if (
                os.path.normcase(supplied_scan_dir) != os.path.normcase(scan_dir)
                or archived_scan_dir.parent != scan_dir.parent
                or not archived_scan_dir.name.startswith(f"{scan_dir.name}.previous-")
            ):
                raise SystemExit(
                    "The archived scan must be a previous sibling of the scan directory."
                )
            try:
                supplied_scan_dir.lstat()
            except FileNotFoundError:
                pass
            else:
                canonical_directory(supplied_scan_dir).rmdir()
            archived_scan_dir.rename(scan_dir)
            disposition = "restored"
        connection.commit()
    except BaseException:
        connection.rollback()
        raise
    return {
        "disposition": disposition,
        "scanDir": str(scan_dir),
        "archivedScanDir": str(archived_scan_dir),
    }

@contextmanager
def register_windows_resume_output(
    connection: sqlite3.Connection,
    scan_id: str,
    scan_dir: Path,
    target: WindowsResumeTarget,
    before_create: Callable[[], None],
) -> Iterator[None]:
    from windows_scan_local_files import create_deep_resume_output, pinned_resume_checkout

    def committed() -> bool:
        # A signal can arrive after commit. The registered scan then owns its child.
        return (
            not connection.in_transaction
            and connection.execute("SELECT 1 FROM scans WHERE id = ?", (scan_id,)).fetchone()
            is not None
        )

    with pinned_resume_checkout(target.path) as current:
        if current != target.native_id or (
            current is None and scan_target_identity(target.path, None) != target.snapshot
        ):
            raise SystemExit(
                "The selected scan target changed while the scan was starting. Try again."
            )
        before_create()
        with create_deep_resume_output(scan_dir, committed) as identity:
            connection.execute(
                "UPDATE scans SET windows_resume_output_identity = ?, windows_resume_target_identity = ? WHERE id = ?",
                (
                    json.dumps(identity),
                    json.dumps(target.native_id) if target.native_id is not None else None,
                    scan_id,
                ),
            )
            yield

def insert_running_scan(
    connection: sqlite3.Connection,
    *,
    scan_id: str,
    workspace: sqlite3.Row,
    target: Path,
    scope: str,
    diff_target: dict[str, str] | None,
    target_identity: tuple[str, str | None, int | str, int | str],
    repository_generation: str | None,
    source_scopes: dict[str, Any],
    target_root: Path,
    target_summary: str | None,
    scope_file_count: int | None,
    timestamp: str,
    handoff_status: str = "pending",
    model: str | None = None,
    reasoning_effort: str | None = None,
    scan_dir: Path | None = None,
    surface: str | None = "plugin",
    package_version: str | None = None,
    launch_kind: str = "scan",
    hosted: bool = False,
) -> str:
    revision = target_identity[0]
    native_scan = scan_dir is None
    user_context = optional_text(workspace["user_context"])
    try:
        plugin_version = loaded_plugin_version()
    except SystemExit:
        # Missing version attribution must not prevent scan registration.
        plugin_version = None
    if scan_dir is None:
        scan_dir = create_private_temporary_directory(
            target_root,
            prefix=f"{safe_segment(revision)}_{compact_timestamp()}_",
        )
    connection.execute(
        """
        INSERT INTO scans (
            id, workspace_id, target_id, repository_generation, target_path,
            target_revision, target_snapshot_digest,
            target_device, target_inode, source_scopes_json, scope, mode, user_context,
            deep_scan_owner_thread_id, diff_target_kind, diff_base_revision,
            diff_head_revision, diff_content_digest, target_summary, scan_dir, model,
            reasoning_effort, status, phase, handoff_status, started_at, created_at, updated_at,
            launch_surface, launch_package_version, launch_plugin_version, launch_kind
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            'running', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            scan_id,
            workspace["id"],
            workspace["target_id"],
            repository_generation,
            str(target),
            *target_identity,
            json.dumps(source_scopes, allow_nan=False, separators=(",", ":"), sort_keys=True),
            scope,
            workspace["default_mode"],
            user_context,
            workspace["thread_id"] if workspace["default_mode"] == "deep" else None,
            *scan_diff_identity(diff_target or None),
            target_summary,
            str(scan_dir),
            optional_text(model, maximum=200),
            optional_text(reasoning_effort, maximum=32),
            "threat_model"
            if not hosted
            and launch_kind == "scan"
            and workspace["default_mode"] == "standard"
            and handoff_status == "delivered"
            else "preflight",
            handoff_status,
            timestamp,
            timestamp,
            timestamp,
            surface,
            package_version,
            plugin_version,
            launch_kind,
        ),
    )
    connection.execute(
        """
        INSERT INTO scan_progress (
            scan_id, scope_file_count, review_items_total, review_items_completed,
            reportable_findings_count, updated_at
        ) VALUES (?, ?, 0, 0, 0, ?)
        """,
        (scan_id, scope_file_count, timestamp),
    )
    connection.execute(
        "UPDATE workspaces SET active_scan_id = ?, updated_at = ? WHERE id = ?",
        (scan_id, timestamp, workspace["id"]),
    )
    if native_scan:
        scan = next(connection.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)))
        false_positives = get_scan_feedback(connection, scan)["falsePositives"]
        if false_positives:
            write_scan_local_bytes(
                scan_dir,
                "artifacts/01_context/false_positive_feedback.json",
                (json.dumps(false_positives, allow_nan=False) + "\n").encode(),
            )
    return scan_id

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## Not embedded

- `scripts/workbench_scan_usage.py` (64 KB, too large to embed — read it in the repository)

## File: `scripts/workbench_schema.py`

```python
"""SQLite schema history for the Codex Security workbench."""

import argparse
import json
import sqlite3
from collections.abc import Callable
from pathlib import Path

_SHARED = Path(__file__).resolve().parents[1] / "shared"
_HISTORY = json.loads((_SHARED / "workbench-migrations.json").read_text(encoding="utf-8"))
_STATEMENTS = {migration["version"]: migration["statements"] for migration in _HISTORY}
_REPAIR_HISTORY = json.dumps(_HISTORY)
_REPAIR_PLAN = json.loads((_SHARED / "workbench-history-repairs.json").read_text(encoding="utf-8"))
MIGRATIONS = tuple(
    (migration["version"], migration["name"], "\n".join(migration["statements"]))
    for migration in _HISTORY
)

def migration_json_extract(document: str, path: str) -> str | int | float | None:
    # The fixed scalar paths in migrations 38/39 must retain embedded NULs on older SQLite.
    value = json.loads(document)
    for key in path[2:].split("."):
        value = value.get(key) if isinstance(value, dict) else None
    return value

def migrate_finding_workflow_results(connection: sqlite3.Connection) -> None:
    for row in connection.execute("SELECT id, results_json FROM finding_workflows").fetchall():
        stages = json.loads(row["results_json"])["stages"]
        results = {stage: value["result"] for stage, value in stages.items() if "result" in value}
        if "pendingWrite" in stages["dedupe"]:
            results["dedupePendingWrite"] = stages["dedupe"]["pendingWrite"]
        # SQLite JSON extraction on older runtimes truncates embedded NULs in diagnostics.
        connection.execute(
            "UPDATE finding_workflows SET scan_error = ?, publish_error = ?, dedupe_error = ?, "
            "results_json = ? WHERE id = ?",
            (
                stages["scan"].get("error"),
                stages["publish"].get("error"),
                stages["dedupe"].get("error"),
                json.dumps(results, allow_nan=False),
                row["id"],
            ),
        )

def apply_migrations(
    connection: sqlite3.Connection,
    migrations: tuple[tuple[int, str, str], ...],
    now: Callable[[], str],
    backfill_security_targets: Callable[[sqlite3.Connection], None],
    *,
    immediate: bool = False,
    discovery_roots: tuple[Path, ...] = (),
) -> None:
    """Apply missing schema versions and repair supported historical migrations.

    Commit pending work on the connection before starting the migration transaction.
    Set immediate to acquire the SQLite write lock up front. The backfill callback
    links older scans and workspaces to stable targets when required.
    """
    from workbench_target import scoped_git_discovery

    connection.commit()
    connection.execute("BEGIN IMMEDIATE" if immediate else "BEGIN")
    with (
        connection,
        scoped_git_discovery(
            lambda: [*migration_target_paths(connection), *discovery_roots],
            recorded_git_roots=lambda: recorded_git_checkout_roots(connection),
        ),
    ):
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL
            )
            """
        )
        normalize_pre_release_migrations(connection, now())
        applied = {
            row["version"] for row in connection.execute("SELECT version FROM schema_migrations")
        }
        should_backfill_targets = False
        for version, name, sql in migrations:
            if version == 6:
                # Preserve the original one-line index declaration in sqlite_schema.
                for statement in _STATEMENTS[6]:
                    apply_repair_statement(connection, statement.replace("\n", " "))
            elif version == 16:
                should_backfill_targets = repair_stable_targets_migration(connection)
            elif version == 67:
                should_backfill_targets = (
                    repair_repository_identity_migration(connection)
                    or version not in applied
                    or should_backfill_targets
                )
            elif version in applied:
                if version in (
                    2,
                    12,
                    13,
                    26,
                    28,
                    31,
                    32,
                    42,
                    47,
                    50,
                    54,
                    55,
                    58,
                    59,
                    60,
                    61,
                    69,
                    70,
                ):
                    repair_schema(connection, version)
                elif version == 11:
                    repair_deep_scan_migration(connection)
            else:
                if version in (38, 39):
                    connection.create_function("migration_json_extract", 2, migration_json_extract)
                    sql = sql.replace("json_extract(", "migration_json_extract(")
                for statement in sql_statements(sql):
                    connection.execute(statement)
                if version == 38:
                    migrate_finding_workflow_results(connection)
                elif version == 68:
                    from workbench_target_state import upgrade_linux_repository_generations

                    upgrade_linux_repository_generations(connection)
            if version not in applied:
                connection.execute(
                    "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
                    (version, name, now()),
                )
        if 27 in applied:
            repair_deep_scan_failure_counter_migration(connection)
        if should_backfill_targets:
            backfill_security_targets(connection)

def migration_target_paths(connection: sqlite3.Connection) -> list[Path]:
    paths: set[Path] = set()
    for table, column in (
        ("security_targets", "current_path"),
        ("workspaces", "target_path"),
        ("scans", "target_path"),
    ):
        columns = {row["name"] for row in connection.execute(f"PRAGMA table_info({table})")}
        if column in columns:
            condition = (
                " AND (target_path_unvalidated = 0 OR target_id IS NOT NULL)"
                if table == "workspaces" and "target_path_unvalidated" in columns
                else ""
            )
            paths.update(
                Path(row[0])
                for row in connection.execute(
                    f"SELECT DISTINCT {column} FROM {table} WHERE {column} IS NOT NULL{condition}"
                )
            )
    return list(paths)

def recorded_git_checkout_roots(connection: sqlite3.Connection) -> set[Path] | None:
    """Return saved boundaries, or None if any historical target lacks one."""
    target_columns = {
        row["name"] for row in connection.execute("PRAGMA table_info(security_targets)")
    }
    boundaries = (
        {
            Path(target): Path(root)
            for target, root in connection.execute(
                "SELECT current_path, git_checkout_root FROM security_targets "
                "WHERE git_checkout_root IS NOT NULL"
            )
        }
        if "git_checkout_root" in target_columns
        else {}
    )
    # Even an unversioned scan may have come from an unborn Git checkout.
    if any(path not in boundaries for path in migration_target_paths(connection)):
        return None
    roots = set(boundaries.values())
    columns = {row["name"] for row in connection.execute("PRAGMA table_info(workspaces)")}
    if "target_path_unvalidated" in columns:
        saved = (
            "rejected_checkout_roots_json" if "rejected_checkout_roots_json" in columns else "NULL"
        )
        for (root,) in connection.execute(
            f"SELECT DISTINCT value FROM workspaces LEFT JOIN json_each({saved}) "
            f"WHERE {saved} IS NOT NULL OR "
            "(target_path IS NOT NULL AND target_path_unvalidated = 1 AND target_id IS NULL)"
        ):
            if root is None:
                return None
            roots.add(Path(root))
    return roots

def normalize_pre_release_migrations(connection: sqlite3.Connection, timestamp: str) -> None:
    for query in _REPAIR_PLAN:
        actions = connection.execute("\n".join(query), {"history": _REPAIR_HISTORY}).fetchall()
        for action in actions:
            operation, value = action["operation"], action["value"]
            if operation == "error":
                raise SystemExit(value)
            if operation == "additive":
                repair_schema(connection, value)
            elif operation == "column":
                add_migration_column(connection, value)
            else:
                connection.execute(value, (timestamp,) if operation == "timestamp" else ())

def repair_deep_scan_migration(connection: sqlite3.Connection) -> None:
    scan_columns = {row["name"] for row in connection.execute("PRAGMA table_info(scans)")}
    owner_column_missing = "deep_scan_owner_thread_id" not in scan_columns
    expected_objects = {
        "scans_one_running_deep_per_owner_target",
        "deep_scan_runs",
        "deep_scan_workers",
        "deep_scan_workers_completion_sequence",
        "deep_scan_workers_by_scan_status",
        "deep_scan_dedup_inputs",
    }
    existing_objects = {
        row["name"]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE name LIKE 'deep_scan_%' "
            "OR name = 'scans_one_running_deep_per_owner_target'"
        )
    }
    if not owner_column_missing and expected_objects <= existing_objects:
        return

    for statement in _STATEMENTS[11]:
        if statement.startswith("UPDATE scans") and not owner_column_missing:
            continue
        apply_repair_statement(connection, statement)
        if statement.startswith("UPDATE scans") and "continuation_thread_id" in scan_columns:
            connection.execute(
                "UPDATE scans SET deep_scan_owner_thread_id = continuation_thread_id "
                "WHERE mode = 'deep' AND status = 'running' "
                "AND continuation_thread_id IS NOT NULL"
            )

def repair_deep_scan_failure_counter_migration(connection: sqlite3.Connection) -> None:
    threshold, count, backfill = _STATEMENTS[27]
    if add_migration_column(connection, threshold):
        connection.execute(backfill)
    add_migration_column(connection, count)

def repair_stable_targets_migration(connection: sqlite3.Connection) -> bool:
    """Repair a partial target-ID migration and return whether the schema required repair.

    Create missing target tables, columns, and indexes. Clear scan references
    to missing target records so they can be backfilled.
    """
    workspace_columns = {row["name"] for row in connection.execute("PRAGMA table_info(workspaces)")}
    scan_columns = {row["name"] for row in connection.execute("PRAGMA table_info(scans)")}
    existing_objects = {
        row["name"]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE name IN ('security_targets', 'scans_by_target')"
        )
    }
    if (
        "target_id" in workspace_columns
        and "target_id" in scan_columns
        and existing_objects == {"security_targets", "scans_by_target"}
    ):
        validated_workspace = (
            "workspace.target_path_unvalidated = 0 AND "
            if "target_path_unvalidated" in workspace_columns
            else ""
        )
        needs_backfill = bool(
            connection.execute(
                f"""
                SELECT EXISTS (
                    SELECT 1 FROM workspaces AS workspace
                    WHERE ({validated_workspace}workspace.target_id IS NULL
                           AND workspace.target_path IS NOT NULL)
                        OR (
                            workspace.target_id IS NOT NULL
                            AND NOT EXISTS (
                                SELECT 1 FROM security_targets
                                WHERE security_targets.id = workspace.target_id
                            )
                        )
                ) OR EXISTS (
                    SELECT 1 FROM scans AS scan
                    WHERE scan.target_id IS NULL
                        OR NOT EXISTS (
                            SELECT 1 FROM security_targets
                            WHERE security_targets.id = scan.target_id
                        )
                )
                """
            ).fetchone()[0]
        )
        if not needs_backfill:
            return False
    else:
        repair_schema(connection, 16)

    for table in ("workspaces", "scans"):
        connection.execute(
            f"""
            UPDATE {table}
            SET target_id = NULL
            WHERE target_id IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1 FROM security_targets
                    WHERE security_targets.id = {table}.target_id
                )
            """
        )
    return True

def repair_repository_identity_migration(connection: sqlite3.Connection) -> bool:
    columns = {row["name"] for row in connection.execute("PRAGMA table_info(security_targets)")}
    index_exists = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'index' "
        "AND name = 'security_targets_by_repository_identity'"
    ).fetchone()
    identity_changed = "repository_identity" not in columns or index_exists is None
    if (
        "repository_identity" in columns
        and connection.execute(
            "SELECT 1 FROM schema_migrations WHERE version = 67 AND name = ?",
            ("persist repository identities",),
        ).fetchone()
        is not None
        and not any(
            row["name"] == "repository_generation"
            for row in connection.execute("PRAGMA table_info(scans)")
        )
    ):
        from workbench_target_state import normalize_pre_release_repository_identities

        normalize_pre_release_repository_identities(connection)
    migration_sql = next(sql for version, _, sql in MIGRATIONS if version == 67)
    for statement in sql_statements(migration_sql):
        if statement.startswith(("ALTER TABLE security_targets", "ALTER TABLE scans")):
            add_migration_column(connection, statement)
            continue
        for prefix in ("CREATE UNIQUE INDEX ", "CREATE INDEX ", "CREATE TRIGGER "):
            if statement.startswith(prefix):
                statement = statement.replace(prefix, f"{prefix}IF NOT EXISTS ", 1)
                break
        connection.execute(statement)

    from workbench_scan_history import _scan_completion_order

    if connection.execute(
        "SELECT 1 FROM scans WHERE status = 'complete' AND completion_sequence IS NULL LIMIT 1"
    ).fetchone():
        # SQL preserves the recorded sequence. Both projections omit it so the merge
        # compares each pending row with the timestamp of the next recorded completion.
        recorded = connection.execute(
            "SELECT id, started_at, completed_at FROM scans "
            "WHERE status = 'complete' AND completion_sequence IS NOT NULL "
            "ORDER BY completion_sequence"
        ).fetchall()
        unsequenced = connection.execute(
            "SELECT id, started_at, completed_at FROM scans "
            "WHERE status = 'complete' AND completion_sequence IS NULL"
        ).fetchall()
        pending = iter(sorted(unsequenced, key=_scan_completion_order))
        candidate = next(pending, None)
        completed = []
        for scan in recorded:
            while candidate is not None and _scan_completion_order(
                candidate
            ) <= _scan_completion_order(scan):
                completed.append(candidate)
                candidate = next(pending, None)
            completed.append(scan)
        if candidate is not None:
            completed.append(candidate)
            completed.extend(pending)
        connection.execute("UPDATE scans SET completion_sequence = NULL WHERE status = 'complete'")
        sequence = connection.execute(
            "SELECT COALESCE(MAX(completion_sequence), 0) FROM scans"
        ).fetchone()[0]
        for scan in completed:
            sequence += 1
            connection.execute(
                "UPDATE scans SET completion_sequence = ? WHERE id = ?",
                (sequence, scan["id"]),
            )
    return identity_changed

def repair_schema(connection: sqlite3.Connection, version: int) -> None:
    for statement in _STATEMENTS[version]:
        apply_repair_statement(connection, statement)

def apply_repair_statement(connection: sqlite3.Connection, statement: str) -> None:
    if statement.startswith("ALTER TABLE "):
        add_migration_column(connection, statement)
        return
    for prefix in ("CREATE UNIQUE INDEX ", "CREATE INDEX ", "CREATE TABLE "):
        if statement.startswith(prefix):
            statement = statement.replace(prefix, f"{prefix}IF NOT EXISTS ", 1)
            break
    connection.execute(statement)

def add_migration_column(connection: sqlite3.Connection, statement: str) -> bool:
    _, _, table, _, _, column, definition = statement.removesuffix(";").split(None, 6)
    columns = {row["name"] for row in connection.execute(f"PRAGMA table_info({table})")}
    if column in columns:
        return False
    # Preserve the compact declarations used by historical repairs, including CHECK errors.
    definition = " ".join(definition.split()).replace("( ", "(").replace(" )", ")")
    connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
    return True

def sql_statements(script: str) -> list[str]:
    statements: list[str] = []
    buffer = ""
    for line in script.splitlines():
        buffer = f"{buffer}\n{line}".strip()
        if sqlite3.complete_statement(buffer):
            statements.append(buffer)
            buffer = ""
    if buffer:
        raise ValueError("Incomplete SQLite migration statement.")
    return statements

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_setup.py`

```python
"""Read-only target and setup inspection shared by the MCP server and workbench."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

from deep_scan_config import resolve_deep_scan_setup
from workbench_cli import parse_args
from workbench_constants import DIFF_TARGET_KINDS, EMPTY_GIT_TREE, EMPTY_GIT_TREES, optional_text
from workbench_target import (
    git_bytes,
    git_output,
    git_target_metadata,
    require_git_worktree_head,
    worktree_content_digest,
)

def require_target(value: str) -> Path:
    """Return the resolved local directory or raise SystemExit if the supplied path is relative or missing."""
    expanded = Path(value).expanduser()
    if not expanded.is_absolute():
        raise SystemExit("Scan target must be an absolute local directory path.")
    target = expanded.resolve()
    if not target.is_dir():
        raise SystemExit(f"Scan target is not a readable local directory: {target}")
    return target

def inspect_target(target: Path) -> dict[str, Any]:
    """Return the target path, display name, and local Git metadata used by setup."""
    return {
        "displayName": target.name,
        "targetMetadata": git_target_metadata(target),
        "targetPath": str(target),
    }

def resolve_git_commit(target: Path, revision: str, label: str) -> str:
    """Resolve a revision to a local commit ID or raise SystemExit with the caller’s label."""
    value = optional_text(revision, maximum=512)
    if not value:
        raise SystemExit(f"{label} is required.")
    resolved = git_output(
        target,
        "rev-parse",
        "--verify",
        "--end-of-options",
        f"{value}^{{commit}}",
    )
    if resolved is None:
        raise SystemExit(f"{label} does not resolve to a local Git commit: {value}")
    return resolved

def require_diff_target(
    target: Path,
    kind: str | None,
    base_revision: str | None,
    head_revision: str | None,
    content_digest: str | None,
) -> dict[str, str]:
    """Resolve the selected Git change to its base and head commits.

    For a working-tree selection, also return the current content digest and reject
    changes since selection. Invalid or stale selections raise SystemExit.
    """
    current_head = require_review_changes_target(target)
    if kind not in DIFF_TARGET_KINDS:
        raise SystemExit("Choose which Git changes to review before starting a diff scan.")
    if kind == "working_tree":
        base = resolve_git_commit(target, base_revision or "HEAD", "Working-tree base")
        head = resolve_git_commit(target, head_revision or current_head, "Working-tree HEAD")
        current_digest = worktree_content_digest(target, expected_digest=content_digest)
        if base != current_head or head != current_head:
            raise SystemExit(
                "Repository HEAD changed after these working-tree changes were selected. "
                "Select Uncommitted changes again."
            )
        if content_digest and content_digest != current_digest:
            raise SystemExit(
                "Working-tree contents changed after they were selected. "
                "Select Uncommitted changes again."
            )
        return {
            "kind": kind,
            "baseRevision": current_head,
            "headRevision": current_head,
            "contentDigest": current_digest,
        }
    if kind == "commit":
        head = resolve_git_commit(target, head_revision or "", "Commit")
        commit = git_bytes(target, "cat-file", "-p", head)
        if commit is None:
            raise SystemExit(f"Commit is not available in the local checkout: {head}")
        parent_line = next(
            (
                line
                for line in commit.split(b"\n\n", 1)[0].splitlines()
                if line.startswith(b"parent ")
            ),
            None,
        )
        if parent_line is None:
            parent = EMPTY_GIT_TREES[git_output(target, "rev-parse", "--show-object-format")]
        else:
            parent = resolve_git_commit(
                target,
                parent_line.removeprefix(b"parent ").decode("ascii").strip(),
                "Commit parent",
            )
        if base_revision and base_revision != parent:
            supplied_base = (
                base_revision
                if base_revision == EMPTY_GIT_TREE
                else resolve_git_commit(target, base_revision, "Commit base")
            )
            if supplied_base != parent:
                raise SystemExit("Commit base revision must match the selected commit's parent.")
        return {"kind": kind, "baseRevision": parent, "headRevision": head}
    base = resolve_git_commit(target, base_revision or "", "Base revision")
    head = resolve_git_commit(target, head_revision or "", "Head revision")
    if base == head:
        raise SystemExit("Base and head revisions must identify different commits.")
    return {"kind": kind, "baseRevision": base, "headRevision": head}

def inspect_setup_values(
    target_path: str,
    scope: str,
    mode: str,
    diff_target_kind: str | None,
    diff_base_revision: str | None,
    diff_head_revision: str | None,
    diff_content_digest: str | None,
) -> dict[str, Any]:
    """Validate the target, scope, and scan mode and return their normalized values and resolved diff target."""
    target = require_target(target_path)
    inspected = require_scannable_target(target)
    normalized_scope = require_scope(scope, mode, target)
    if mode == "diff" and normalized_scope != ".":
        raise SystemExit("Review changes requires the whole target; use scope '.'.")
    if mode != "diff" and any(
        value is not None
        for value in (
            diff_target_kind,
            diff_base_revision,
            diff_head_revision,
            diff_content_digest,
        )
    ):
        raise SystemExit("A Git diff target requires Review changes mode.")
    diff_target = (
        require_diff_target(
            target,
            diff_target_kind,
            diff_base_revision,
            diff_head_revision,
            diff_content_digest,
        )
        if mode == "diff"
        else None
    )
    return {
        "diffTarget": diff_target,
        "scope": normalized_scope,
        "target": inspected,
    }

def require_review_changes_target(target: Path) -> str:
    """Return the checked-out revision or raise SystemExit if target is not the worktree root."""
    revision = require_git_worktree_head(target)
    repository_root = git_output(target, "rev-parse", "--show-toplevel")
    if repository_root is None or not Path(repository_root).samefile(target):
        raise SystemExit(
            "Review changes requires the checked-out Git repository root as the target."
        )
    return revision

def require_scannable_target(target: Path) -> dict[str, Any]:
    """Return the inspected target metadata, rejecting a Git repository that has no checked-out worktree."""
    inspected = inspect_target(target)
    metadata = inspected["targetMetadata"]
    if metadata["isGit"] and not metadata["isWorktree"]:
        raise SystemExit(
            "Codex Security requires a checked-out worktree, not a bare Git repository."
        )
    return inspected

def require_scope(scope: str, mode: str, target: Path) -> str:
    """Return the existing scan directory relative to the target, requiring the whole repository for deep mode."""
    value = scope if scope.strip() else "."
    requested_scope = Path(value)
    if "\\" in value and (os.name != "nt" or not requested_scope.is_absolute()):
        raise SystemExit("Scan scope must use repository-relative POSIX paths.")
    if ".." in requested_scope.parts:
        raise SystemExit("Scan scope must stay inside the scanned target.")
    try:
        resolved_scope = (
            requested_scope if requested_scope.is_absolute() else target / requested_scope
        ).resolve()
        relative_scope = resolved_scope.relative_to(target)
    except (RuntimeError, ValueError) as exc:
        raise SystemExit("Scan scope must stay inside the scanned target.") from exc
    normalized = relative_scope.as_posix() or "."
    if not normalized.strip():
        normalized = "./" + normalized
    if mode == "deep" and normalized != ".":
        raise SystemExit("Deep Scan is repository-wide and cannot use a scoped path.")
    if not resolved_scope.is_dir():
        raise SystemExit("Scan scope must reference an existing directory inside the target.")
    return normalized

def inspect_selected_setup(args: argparse.Namespace) -> dict[str, Any]:
    inspected = inspect_setup_values(
        args.target_path,
        args.scope,
        args.mode,
        args.diff_target_kind,
        args.diff_base_revision,
        args.diff_head_revision,
        args.diff_content_digest,
    )
    if args.mode == "deep":
        inspected["deepScanConfig"] = resolve_deep_scan_setup(
            project_json=args.deep_scan_project_json
        )
    elif args.deep_scan_project_json is not None:
        raise SystemExit("Project Deep Scan settings require Deep Scan mode.")
    return inspected

def inspect_command(args: argparse.Namespace) -> dict[str, Any]:
    if args.command == "inspect-target":
        return inspect_target(require_target(args.target_path))
    return inspect_selected_setup(args)

def main() -> None:
    sys.stdin.reconfigure(encoding="utf-8")
    args = parse_args("Codex Security workbench persistence.", inspection_only=True)
    print(json.dumps(inspect_command(args), allow_nan=False, sort_keys=True))
```

## File: `scripts/workbench_source_excerpt.py`

```python
"""Read bounded finding source excerpts from sealed Git revisions."""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path, PurePosixPath
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from workbench_source_scopes import (
    load_source_scopes,
    normalized_path_component,
    offline_git_bytes,
    relative_path,
    safe_source_path,
    source_object_for_path,
)
from workbench_target import clean_worktree_content_digest

CONTEXT_LINES = 3
MAX_BYTES = 16_000
MAX_LINES = 60

def finding_source_excerpt(
    scan: sqlite3.Row,
    target: Path | None,
    locations: list[dict[str, Any]],
    scopes: list[str],
) -> str | None:
    """Return numbered context from a finding location at the scanned Git revision.

    Args:
        scan: Saved scan row with its revision, snapshot digest, and scope metadata.
        target: Local target directory in which to resolve the recorded Git objects.
        locations: Displayed finding locations, using one-based line numbers.
        scopes: Selected paths used to interpret saved source scopes.

    Returns:
        A bounded excerpt, or None when a location, scope, or local blob cannot
        supply it. Root-control locations have priority.
    """
    if target is None or not locations or scan["target_revision"] == "unversioned":
        return None
    snapshot = scan["target_snapshot_digest"]
    if snapshot is not None and snapshot != clean_worktree_content_digest():
        return None
    locations = [
        location
        for location in locations
        if isinstance(path := location.get("path"), str)
        and isinstance(location.get("startLine"), int)
        and safe_source_path(target, path) is not None
    ]
    if not locations:
        return None
    try:
        context = load_source_scopes(scan, target, scopes)
    except (OSError, RuntimeError, SystemExit, UnicodeError, ValueError):
        return None
    if context is None:
        return None
    repository, tree, records = context
    indexed: dict[tuple[str, ...], list[dict[str, str]]] = {}
    for record in records:
        for name in ("path", "canonicalPath"):
            parts = tuple(
                normalized_path_component(part) for part in PurePosixPath(record[name]).parts
            )
            indexed.setdefault(parts, []).append(record)
    lengths = sorted({len(parts) for parts in indexed})

    def source_object(path: str) -> str | None:
        parsed = relative_path(path)
        if parsed is None:
            return None
        parts = tuple(normalized_path_component(part) for part in parsed.parts)
        try:
            for length in lengths:
                if length > len(parts):
                    break
                for record in indexed.get(parts[:length], []):
                    object_id = source_object_for_path(repository, tree, target, path, record)
                    if object_id is not None:
                        return object_id
        except (OSError, RuntimeError, SystemExit, UnicodeError, ValueError):
            # An unavailable source object leaves the optional excerpt absent.
            pass
        return None

    locations.sort(
        key=lambda location: (
            location.get("role") != "root_control",
            "root_control" not in str(location.get("role") or "").lower(),
        )
    )
    for location in locations:
        object_id = source_object(location["path"])
        if object_id is not None:
            break
    else:
        return None
    start_line, end_line = location["startLine"], location.get("endLine")
    source = scanned_source_text(repository, object_id)
    if not source or "\0" in source:
        return None
    # Match location validation and SARIF hashing: CR, LF, and CRLF are line breaks.
    # Keep form feeds and Unicode separators within their original source lines.
    normalized = source.replace("\r\n", "\n").replace("\r", "\n")
    lines = normalized.removesuffix("\n").split("\n")
    if start_line < 1 or start_line > len(lines):
        return None
    last_affected_line = end_line if isinstance(end_line, int) else start_line
    excerpt_start = max(1, start_line - CONTEXT_LINES)
    excerpt_end = min(
        len(lines),
        max(start_line, last_affected_line) + CONTEXT_LINES,
        excerpt_start + MAX_LINES - 1,
    )
    width = len(str(excerpt_end))
    excerpt = "\n".join(
        f"{line_number:>{width}}  {lines[line_number - 1]}"
        for line_number in range(excerpt_start, excerpt_end + 1)
    )
    return excerpt.encode("utf-8")[:MAX_BYTES].decode("utf-8", errors="ignore")

def scanned_source_text(repository: Path, object_id: str) -> str | None:
    """Decode the locally available Git blob as UTF-8 with replacement, or return None on lookup failure."""
    try:
        content = offline_git_bytes(repository, "cat-file", "blob", object_id)
    except (OSError, RuntimeError, SystemExit):
        return None
    return content.decode("utf-8", errors="replace") if content is not None else None

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_source_scopes.py`

```python
"""Bind optional finding excerpts to the Git objects selected at scan start."""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import stat
import sys
from functools import cache
from pathlib import Path, PurePosixPath
from typing import Any
from unicodedata import normalize

sys.path.insert(0, str(Path(__file__).resolve().parent))
from workbench_target import (
    clean_worktree_content_digest,
    git_command,
    git_worktree_context,
)
from workbench_validation import reject_non_finite_json

OBJECT_ID = re.compile(r"(?:[0-9a-f]{40}|[0-9a-f]{64})\Z")

def expected_target_kinds(scan: sqlite3.Row) -> list[str]:
    """Return the manifest target kinds compatible with the stored scan mode, revision, and snapshot digest."""
    if scan["mode"] == "diff":
        return ["git_diff"]
    if scan["target_revision"] == "unversioned":
        return ["directory_snapshot"]
    if scan["target_snapshot_digest"] is None:
        return ["git_worktree", "git_revision"]
    if scan["target_snapshot_digest"] == clean_worktree_content_digest():
        return ["git_revision"]
    return ["git_worktree"]

def requested_scan_paths(scan: sqlite3.Row) -> list[str]:
    """Return the explicit paths in the saved launch recipe, falling back to the scan’s original scope."""
    if "recipe_json" in scan.keys() and scan["recipe_json"] is not None:
        recipe = json.loads(scan["recipe_json"], parse_constant=reject_non_finite_json)
        target = recipe["target"]
        if target["kind"] == "paths":
            return target["paths"]
    return [scan["scope"]]

def public_scan_recipe(scan: sqlite3.Row) -> dict[str, Any]:
    """Return the decoded launch recipe with the internal file-scope metadata removed."""
    recipe = json.loads(scan["recipe_json"], parse_constant=reject_non_finite_json)
    recipe.pop("_codexSecurityFileScopes", None)
    return recipe

def normalized_path_component(value: str) -> str:
    return normalize("NFC", normalize("NFD", value).casefold())

def relative_path(value: str) -> PurePosixPath | None:
    path = PurePosixPath(value)
    return None if "\\" in value or path.is_absolute() or ".." in path.parts else path

def safe_source_path(target: Path, value: str) -> Path | None:
    """Resolve a repository-relative POSIX path and return None if it is invalid or resolves outside the target."""
    parsed = relative_path(value)
    if parsed is None:
        return None
    try:
        path = (target / parsed.as_posix()).resolve()
        path.relative_to(target)
        return path
    except (OSError, RuntimeError, ValueError):
        return None

def offline_git_bytes(repository: Path, *arguments: str) -> bytes | None:
    """Return raw stdout for a successful offline Git command with replacement objects disabled, otherwise None."""
    result = git_command(
        repository,
        *arguments,
        text=False,
        offline=True,
        environment_overrides={"GIT_NO_REPLACE_OBJECTS": "1"},
    )
    return result.stdout if result.returncode == 0 else None

@cache
def tree_entries(repository: Path, tree: str) -> dict[str, tuple[tuple[str, str, str], ...]] | None:
    """Index a Git tree by normalized name, retaining every original name, entry kind, and object ID in each group."""
    content = offline_git_bytes(repository, "ls-tree", "-z", tree)
    if content is None:
        return None
    entries: dict[str, list[tuple[str, str, str]]] = {}
    for record in content.split(b"\0"):
        if not record:
            continue
        metadata, separator, name = record.partition(b"\t")
        fields = metadata.split(b" ")
        if not separator or len(fields) != 3:
            return None
        mode, object_type, raw_object = fields
        object_id = raw_object.decode("ascii")
        if not OBJECT_ID.fullmatch(object_id):
            return None
        kind = (
            "directory"
            if mode == b"040000" and object_type == b"tree"
            else "file"
            if mode in {b"100644", b"100755"} and object_type == b"blob"
            else "other"
        )
        decoded_name = os.fsdecode(name)
        entries.setdefault(normalized_path_component(decoded_name), []).append(
            (decoded_name, kind, object_id)
        )
    return {name: tuple(matches) for name, matches in entries.items()}

def exact_tree_path(repository: Path, tree: str, value: str) -> tuple[str, str, str] | None:
    path = relative_path(value)
    if path is None:
        return None
    kind, object_id = "directory", tree
    for name in path.parts:
        if kind != "directory":
            return None
        entries = tree_entries(repository, object_id) or {}
        aliases = entries.get(normalized_path_component(name), ())
        if len(aliases) != 1:
            return None
        entry_name, kind, object_id = aliases[0]
        if entry_name != name:
            return None
    return path.as_posix(), kind, object_id

def ordinary_path(metadata: os.stat_result) -> bool:
    return not (
        getattr(metadata, "st_file_attributes", 0)
        & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0)
    ) and (stat.S_ISDIR(metadata.st_mode) or stat.S_ISREG(metadata.st_mode))

def filesystem_alias(selected: Path, candidate: Path) -> bool:
    if normalized_path_component(selected.name) != normalized_path_component(candidate.name):
        return False
    try:
        if not all(ordinary_path(path.lstat()) for path in (selected, candidate)):
            return False
        if not selected.samefile(candidate):
            return False
        with os.scandir(selected.parent) as entries:
            return (
                sum(
                    normalized_path_component(entry.name)
                    == normalized_path_component(selected.name)
                    for entry in entries
                )
                == 1
            )
    except OSError:
        return False

def existing_tree_path(
    repository: Path, tree: str, value: str, filesystem_root: Path
) -> tuple[str, str, str] | None:
    path = relative_path(value)
    if path is None:
        return None
    canonical: list[str] = []
    kind, object_id = "directory", tree
    for index, name in enumerate(path.parts, start=1):
        if kind != "directory":
            return None
        entries = tree_entries(repository, object_id) or {}
        aliases = entries.get(normalized_path_component(name), ())
        selected = filesystem_root / PurePosixPath(*path.parts[:index])
        matches = []
        try:
            if not ordinary_path(selected.lstat()):
                return None
            for entry in aliases:
                candidate = filesystem_root / PurePosixPath(*canonical, entry[0])
                # Every colliding Git name needs a filesystem witness. Missing
                # names cannot establish which entry the user selected.
                if not ordinary_path(candidate.lstat()):
                    return None
                if selected.samefile(candidate) and (
                    entry[0] == name or filesystem_alias(selected, candidate)
                ):
                    matches.append(entry)
        except OSError:
            return None
        if len(matches) != 1:
            return None
        name, kind, object_id = matches[0]
        canonical.append(name)
    return PurePosixPath(*canonical).as_posix(), kind, object_id

def target_tree(target: Path, revision: str) -> tuple[Path, str] | None:
    repository, prefix = git_worktree_context(target)
    raw_tree = offline_git_bytes(repository, "rev-parse", "--verify", f"{revision}^{{tree}}")
    tree = raw_tree.decode("ascii").strip() if raw_tree is not None else ""
    if not OBJECT_ID.fullmatch(tree):
        return None
    selected = existing_tree_path(repository, tree, prefix, repository)
    if selected is None or selected[1] != "directory":
        return None
    return repository, selected[2]

def capture_source_scopes(
    target: Path,
    target_identity: tuple[str, str | None, int | str, int | str],
    paths: list[str],
    *,
    diff_target_kind: str | None = None,
) -> dict[str, Any]:
    """Bind requested paths to the local Git objects that may supply excerpts later.

    Return the revision and the file or tree IDs that can be verified locally.
    A working-tree diff, dirty snapshot, or replacement ref leaves the scope list
    empty. A path that cannot be bound adds no authority to read other paths.
    """
    revision, snapshot = target_identity[:2]
    result: dict[str, Any] = {"version": 1, "revision": revision, "scopes": []}
    # HEAD cannot represent the uncommitted bytes reviewed by a working-tree scan.
    if diff_target_kind == "working_tree":
        return result
    if revision == "unversioned" or (
        snapshot is not None and snapshot != clean_worktree_content_digest()
    ):
        return result
    try:
        repository, _ = git_worktree_context(target)
        if offline_git_bytes(repository, "replace", "--list") != b"":
            # A revision alone does not identify the replacement view scanned.
            return result
        context = target_tree(target, revision)
        if context is None:
            return result
        repository, tree = context
        result["targetTree"] = tree
        for requested in paths:
            selected = safe_source_path(target, requested)
            if selected is None:
                continue
            canonical = existing_tree_path(repository, tree, requested, target)
            if canonical is None or canonical[1] not in {"file", "directory"}:
                continue
            try:
                metadata = selected.stat()
            except OSError:
                continue
            if (canonical[1] == "directory") != stat.S_ISDIR(metadata.st_mode):
                continue
            result["scopes"].append(
                {
                    "path": PurePosixPath(requested).as_posix(),
                    "canonicalPath": canonical[0],
                    "kind": canonical[1],
                    "objectId": canonical[2],
                }
            )
    except (OSError, RuntimeError, SystemExit, UnicodeError, ValueError):
        # Excerpts are optional. Failure to bind a scope never widens it and
        # must not prevent the scan itself from starting.
        pass
    return result

def load_source_scopes(
    scan: sqlite3.Row, target: Path, requested: list[str]
) -> tuple[Path, str, list[dict[str, str]]] | None:
    """Return the repository, tree ID, and valid source scopes, or None when none can be established.

    Use saved object IDs for current records. For a legacy scan, reconstruct only
    unambiguous entries from its original revision and respect any recorded file kinds.
    """
    kind = scan["diff_target_kind"] if "diff_target_kind" in scan.keys() else None
    if kind == "working_tree" or (
        "mode" in scan.keys() and scan["mode"] == "diff" and kind not in ("commit", "range")
    ):
        return None
    saved = scan["source_scopes_json"] if "source_scopes_json" in scan.keys() else None
    paths = {PurePosixPath(path).as_posix() for path in requested}
    if saved is not None:
        metadata = json.loads(saved)
        if (
            not isinstance(metadata, dict)
            or metadata.get("version") != 1
            or metadata.get("revision") != scan["target_revision"]
        ):
            return None
        tree = metadata.get("targetTree")
        records = metadata.get("scopes")
        if (
            not isinstance(tree, str)
            or not OBJECT_ID.fullmatch(tree)
            or not isinstance(records, list)
        ):
            return None
        scopes = [
            record
            for record in records
            if isinstance(record, dict)
            and isinstance(record.get("path"), str)
            and record.get("path") in paths
            and isinstance(record.get("canonicalPath"), str)
            and relative_path(record["canonicalPath"]) is not None
            and record.get("kind") in ("file", "directory")
            and isinstance(record.get("objectId"), str)
            and OBJECT_ID.fullmatch(record["objectId"])
        ]
        return (git_worktree_context(target)[0], tree, scopes) if scopes else None

    # Exact, unambiguous historical entries establish legacy scope kinds.
    # Keep any previously recorded file kinds as an additional constraint.
    recipe = scan["recipe_json"] if "recipe_json" in scan.keys() else None
    legacy_recipe = json.loads(recipe) if recipe else None
    legacy_files = (
        legacy_recipe.get("_codexSecurityFileScopes") if isinstance(legacy_recipe, dict) else None
    )
    repository, _ = git_worktree_context(target)
    if offline_git_bytes(repository, "replace", "--list") != b"":
        # Old records do not say which replacement view was scanned.
        return None
    context = target_tree(target, scan["target_revision"])
    if context is None:
        return None
    repository, tree = context
    scopes = []
    for path in paths:
        entry = exact_tree_path(repository, tree, path)
        if entry is None or entry[1] not in {"file", "directory"}:
            continue
        kind = entry[1]
        if isinstance(legacy_files, list) and kind != (
            "file" if path in legacy_files else "directory"
        ):
            continue
        scopes.append(
            {
                "path": path,
                "canonicalPath": path,
                "kind": kind,
                "objectId": entry[2],
            }
        )
    return (repository, tree, scopes) if scopes else None

def source_object_for_path(
    repository: Path, tree: str, target: Path, value: str, scope: dict[str, str]
) -> str | None:
    """Return the Git blob ID for a file covered by the recorded scope, or None if the path cannot be verified."""
    path = relative_path(value)
    if path is None or safe_source_path(target, value) is None:
        return None
    prefixes = {PurePosixPath(scope[name]).parts for name in ("path", "canonicalPath")}
    suffix: tuple[str, ...] | None = None
    for prefix in sorted(prefixes, key=len, reverse=True):
        if path.parts[: len(prefix)] == prefix:
            suffix = path.parts[len(prefix) :]
            break
    if suffix is None:
        for length in {len(prefix) for prefix in prefixes}:
            if length > len(path.parts) or scope["kind"] == "file" and length != len(path.parts):
                continue
            selected = existing_tree_path(
                repository, tree, PurePosixPath(*path.parts[:length]).as_posix(), target
            )
            if selected == (scope["canonicalPath"], scope["kind"], scope["objectId"]):
                suffix = path.parts[length:]
                break
    if suffix is None:
        return None
    if scope["kind"] == "file":
        return scope["objectId"] if not suffix else None
    relative = PurePosixPath(*suffix).as_posix()
    entry = exact_tree_path(repository, scope["objectId"], relative)
    if entry is None:
        selected = safe_source_path(target, scope["canonicalPath"])
        if selected is not None:
            entry = existing_tree_path(repository, scope["objectId"], relative, selected)
    return entry[2] if entry is not None and entry[1] == "file" else None

def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()

if __name__ == "__main__":
    main()
```

## Not embedded

- `scripts/workbench_target.py` (70 KB, too large to embed — read it in the repository)

## File: `scripts/workbench_target_state.py`

```python
"""Persist stable Codex Security target identities."""

from __future__ import annotations

import argparse
import ctypes
import hashlib
import os
import platform
import re
import sqlite3
import stat
import sys
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from decimal import Decimal
from fractions import Fraction
from pathlib import Path
from urllib.parse import urlsplit

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from filesystem_identity import (
    serialize_filesystem_identity,
    stored_filesystem_identity_matches,
)
from workbench_target import (
    _protected_repository_root,
    git_bytes,
    git_output,
    git_worktree_context,
    pin_scoped_git,
)

def stable_target_id(target: Path) -> str:
    """Hash the supplied path spelling into the workbench ID for a local workspace."""
    digest = hashlib.sha256(f"local-workspace\0{target}".encode()).hexdigest()
    return f"target_sha256_{digest}"

def repository_relative_path(target: Path) -> str | None:
    """Return the target's normalized location within its own Git worktree."""
    worktree = _repository_worktree(target)
    return worktree[1] if worktree is not None else None

def _repository_worktree(target: Path) -> tuple[Path, str] | None:
    try:
        return git_worktree_context(target)
    except SystemExit:
        return None

def _path_from_git_bytes(
    value: bytes, relative_to: Path, *, strip_line_feed: bool = True
) -> Path | None:
    if strip_line_feed and value.endswith(b"\n"):
        value = value[:-2] if sys.platform == "win32" and value.endswith(b"\r\n") else value[:-1]
    if not value or b"\0" in value:
        return None
    path = Path(os.fsdecode(value))
    return Path(os.path.realpath(path if path.is_absolute() else relative_to / path))

def _git_path(target: Path, *args: str) -> Path | None:
    value = git_bytes(target, *args)
    return _path_from_git_bytes(value, target) if value is not None else None

def _same_existing_path(first: Path | None, second: Path | None) -> bool:
    if first is None or second is None:
        return False
    try:
        return first.samefile(second)
    except OSError:
        return False

def _registered_worktree(target: Path, root: Path, common: Path) -> bool:
    registered = git_bytes(target, "worktree", "list", "--porcelain", "-z")
    if registered is not None:
        return any(
            os.path.realpath(os.fsdecode(record[len(b"worktree ") :])) == str(root)
            for record in registered.split(b"\0")
            if record.startswith(b"worktree ")
        )
    # Git before 2.36 emits unquoted newline-delimited paths. Repository-side
    # ownership records are unambiguous even when a checkout path has newlines.
    gitdir = _git_path(target, "rev-parse", "--absolute-git-dir")
    dotgit = root / ".git"
    try:
        mode = dotgit.lstat().st_mode
        if stat.S_ISDIR(mode):
            return _same_existing_path(gitdir, common) and _same_existing_path(gitdir, dotgit)
        if not stat.S_ISREG(mode) or gitdir is None or not gitdir.is_dir():
            return False
        forward = dotgit.read_bytes()
        if not forward.startswith(b"gitdir: ") or not _same_existing_path(
            _path_from_git_bytes(forward[len(b"gitdir: ") :], root), gitdir
        ):
            return False
        if _same_existing_path(gitdir, common):
            configured = git_bytes(
                target,
                "config",
                "--null",
                "--show-scope",
                "--no-includes",
                "--get",
                "core.worktree",
            )
            fields = configured.split(b"\0") if configured is not None else []
            if (
                len(fields) != 3
                or fields[0] not in (b"local", b"worktree")
                or not fields[1]
                or fields[2]
            ):
                return False
            configured_root = _path_from_git_bytes(fields[1], gitdir, strip_line_feed=False)
            return _same_existing_path(configured_root, root)
        return _same_existing_path(gitdir.parent, common / "worktrees") and _same_existing_path(
            _path_from_git_bytes((gitdir / "gitdir").read_bytes(), gitdir), dotgit
        )
    except (OSError, ValueError):
        return False

class _LinuxStatxTimestamp(ctypes.Structure):
    _fields_ = (
        ("seconds", ctypes.c_int64),
        ("nanoseconds", ctypes.c_uint32),
        ("_reserved", ctypes.c_int32),
    )

class _LinuxStatx(ctypes.Structure):
    # Linux's statx UAPI keeps birth time at offset 0x50 in a 0x100-byte buffer.
    _fields_ = (
        ("mask", ctypes.c_uint32),
        ("_before_birth_time", ctypes.c_ubyte * 76),
        ("birth_time", _LinuxStatxTimestamp),
        ("_after_birth_time", ctypes.c_ubyte * 160),
    )

def _linux_repository_birth_time_ns(path: str) -> int | None:
    if ctypes.sizeof(_LinuxStatx) != 256 or _LinuxStatx.birth_time.offset != 80:
        return None
    metadata = _LinuxStatx()
    birth_time_mask = 0x800
    arguments = (-100, os.fsencode(path), 0, birth_time_mask, ctypes.byref(metadata))
    try:
        libc = ctypes.CDLL(None, use_errno=True)
        try:
            statx = libc.statx
        except AttributeError:
            # Older musl has the syscall but no statx wrapper. Only use known LP64 ABIs.
            if ctypes.sizeof(ctypes.c_void_p) != 8 or ctypes.sizeof(ctypes.c_long) != 8:
                return None
            number = {"x86_64": 332, "aarch64": 291}.get(platform.machine())
            if number is None:
                return None
            statx = libc.syscall
            statx.argtypes = (
                ctypes.c_long,
                ctypes.c_long,
                ctypes.c_char_p,
                ctypes.c_long,
                ctypes.c_ulong,
                ctypes.POINTER(_LinuxStatx),
            )
            statx.restype = ctypes.c_long
            status = statx(number, *arguments)
        else:
            statx.argtypes = (
                ctypes.c_int,
                ctypes.c_char_p,
                ctypes.c_int,
                ctypes.c_uint,
                ctypes.POINTER(_LinuxStatx),
            )
            statx.restype = ctypes.c_int
            status = statx(*arguments)
    except (AttributeError, OSError):
        return None
    birth_time = metadata.birth_time
    if (
        status != 0
        or not metadata.mask & birth_time_mask
        or not 0 <= birth_time.nanoseconds < 1_000_000_000
    ):
        return None
    birth_time_ns = birth_time.seconds * 1_000_000_000 + birth_time.nanoseconds
    return birth_time_ns if birth_time_ns > 0 else None

def _repository_birth_time_ns(path: str, metadata: os.stat_result) -> int | None:
    birth_time_ns = getattr(metadata, "st_birthtime_ns", None)
    if birth_time_ns is not None:
        return birth_time_ns if birth_time_ns > 0 else None
    if os.name == "nt":
        return metadata.st_ctime_ns if metadata.st_ctime_ns > 0 else None
    birth_time = getattr(metadata, "st_birthtime", None)
    if birth_time is not None:
        return int(birth_time * 1_000_000_000) if birth_time > 0 else None
    if not sys.platform.startswith("linux"):
        return None
    return _linux_repository_birth_time_ns(path)

@dataclass(frozen=True)
class GitRepositoryIdentity:
    value: str
    relative_path: str
    common_directory: str
    device: int | str
    inode: int | str
    birth_time_ns: int
    object_birth_time_ns: int
    previous_value: str | None = None

    @property
    def legacy_value(self) -> str:
        return _identity_digest(
            f"git-common-dir\0{self.common_directory}\0{self.device}\0{self.inode}\0"
            f"{self.birth_time_ns}\0{self.relative_path}"
        )

def _identity_digest(material: str, prefix: str = "repository_sha256_") -> str:
    return f"{prefix}{hashlib.sha256(material.encode(errors='surrogateescape')).hexdigest()}"

def _repository_worktree_location(target: Path) -> tuple[Path, str] | None:
    common_directory = _git_path(target, "rev-parse", "--path-format=absolute", "--git-common-dir")
    worktree = _repository_worktree(target)
    if common_directory is None or worktree is None:
        return None
    worktree_root, relative = worktree
    if not _registered_worktree(target, worktree_root, common_directory):
        return None
    return common_directory, relative

def same_repository_worktree(before: Path, after: Path) -> bool:
    before_location = _repository_worktree_location(before)
    after_location = _repository_worktree_location(after)
    return (
        before_location is not None
        and after_location is not None
        and before_location[1] == after_location[1]
        and _same_existing_path(before_location[0], after_location[0])
    )

def _repository_identity_details(target: Path | str) -> GitRepositoryIdentity | None:
    target = Path(target)
    location = _repository_worktree_location(target)
    if location is None:
        return None
    common_directory, relative = location
    object_directory = _git_path(
        target, "rev-parse", "--path-format=absolute", "--git-path", "objects"
    )
    if object_directory is None:
        return None
    canonical_directory = str(common_directory)
    try:
        metadata = common_directory.stat()
        object_metadata = object_directory.stat()
    except OSError:
        return None
    if not stat.S_ISDIR(metadata.st_mode) or not stat.S_ISDIR(object_metadata.st_mode):
        return None
    birth_time_ns = _repository_birth_time_ns(canonical_directory, metadata)
    object_birth_time_ns = _repository_birth_time_ns(str(object_directory), object_metadata)
    if birth_time_ns is None or object_birth_time_ns is None:
        return None
    device = serialize_filesystem_identity(metadata.st_dev)
    inode = serialize_filesystem_identity(metadata.st_ino)
    material = (
        f"git-generation-v2\0{canonical_directory}\0{device}\0{inode}\0"
        f"{birth_time_ns}\0{object_directory}\0"
        f"{serialize_filesystem_identity(object_metadata.st_dev)}\0"
        f"{serialize_filesystem_identity(object_metadata.st_ino)}\0"
        f"{object_birth_time_ns}\0{relative}"
    )
    previous_value = None
    value = _identity_digest(material)
    if sys.platform == "linux":
        try:
            common_filesystem = os.statvfs(common_directory).f_fsid
            object_filesystem = os.statvfs(object_directory).f_fsid
        except OSError:
            return None
        previous_value = value
        value = _identity_digest(
            f"git-generation-v3\0{canonical_directory}\0{common_filesystem}\0{inode}\0"
            f"{birth_time_ns}\0{object_directory}\0{object_filesystem}\0"
            f"{serialize_filesystem_identity(object_metadata.st_ino)}\0"
            f"{object_birth_time_ns}\0{relative}",
            "repository_v3_sha256_",
        )
    return GitRepositoryIdentity(
        value,
        relative,
        canonical_directory,
        device,
        inode,
        birth_time_ns,
        object_birth_time_ns,
        previous_value,
    )

def repository_identity(target: Path | str) -> str | None:
    """Identify matching Git worktree targets without storing remote credentials."""
    identity = _repository_identity_details(target)
    return identity.value if identity is not None else None

def repository_origin(target: Path) -> tuple[str, str] | None:
    remote = git_output(target, "remote", "get-url", "origin")
    if remote is None:
        return None
    if "://" in remote:
        try:
            parsed = urlsplit(remote)
            port = parsed.port
        except ValueError:
            return None
        if parsed.scheme not in {"https", "ssh"} or parsed.hostname is None:
            return None
        if parsed.query or parsed.fragment:
            return None
        host = parsed.hostname
        if port is not None and port != {"https": 443, "ssh": 22}[parsed.scheme]:
            host = f"{host}:{port}"
        path = parsed.path
    else:
        authority, separator, path = remote.partition(":")
        if not separator or "?" in path or "#" in path:
            return None
        host = authority.rsplit("@", 1)[-1]
    path = path.strip("/").removesuffix(".git")
    return (host.lower(), path) if host and path else None

def supports_repository_identity(connection: sqlite3.Connection) -> bool:
    return any(
        row["name"] == "repository_identity"
        for row in connection.execute("PRAGMA table_info(security_targets)")
    )

@dataclass(frozen=True)
class RepositoryTargetState:
    target_id: str
    target_path: str
    stored_identity: str | None
    resolved_path: str | None = None
    metadata: os.stat_result | None = None
    repository: GitRepositoryIdentity | None = None
    ownership_matches: bool = False
    strict_owner_matches: bool = False
    generation_predates_history: bool = False
    has_historical_scans: bool = False
    missing: bool = False
    previous_generation: str | None = None

    @property
    def live_identity(self) -> str | None:
        return (
            self.previous_generation or self.repository.value
            if self.repository is not None
            else None
        )

    @property
    def verified_identity(self) -> str | None:
        if not self.ownership_matches or self.repository is None:
            return None
        if self.stored_identity is None:
            # Checkout ownership and repository age cannot identify an older Git generation.
            return (
                self.live_identity
                if self.strict_owner_matches
                and self.generation_predates_history
                and not self.has_historical_scans
                else None
            )
        return self.live_identity if self.live_identity == self.stored_identity else None

    def require_owner(self) -> None:
        if not self.ownership_matches:
            raise SystemExit(
                f"The repository checkout at {self.target_path} no longer matches its recorded "
                "security scan history; refusing to reuse its target."
            )

def _inspect_repository_target(
    connection: sqlite3.Connection,
    target_id: str,
    target_path: str,
    stored_identity: str | None,
    *,
    scan_columns: set[str] | None = None,
) -> RepositoryTargetState:
    target = Path(target_path)
    try:
        resolved_path = str(target.resolve())
    except (OSError, RuntimeError):
        return RepositoryTargetState(target_id, target_path, stored_identity)
    try:
        metadata = target.stat()
    except (FileNotFoundError, NotADirectoryError):
        return RepositoryTargetState(
            target_id,
            target_path,
            stored_identity,
            resolved_path=resolved_path,
            ownership_matches=True,
            missing=True,
        )
    except OSError:
        return RepositoryTargetState(
            target_id, target_path, stored_identity, resolved_path=resolved_path
        )
    repository = _repository_identity_details(target)
    if scan_columns is None:
        scan_columns = {row["name"] for row in connection.execute("PRAGMA table_info(scans)")}
    historical_scan = False
    recorded_owner = False
    malformed_owner = False
    mismatch = False
    strict_owner_matches = False
    generation_predates_history = False
    ownership_matches = True
    if {"target_id", "target_path"} <= scan_columns:
        recorded_generations = (
            {
                row[0]
                for row in connection.execute(
                    "SELECT DISTINCT repository_generation FROM scans "
                    "WHERE (target_id = ? OR target_path = ?) AND repository_generation IS NOT NULL",
                    (target_id, target_path),
                )
            }
            if "repository_generation" in scan_columns
            else set()
        )
        generation_conflict = bool(recorded_generations) and (
            repository is None
            or recorded_generations not in ({repository.value}, {repository.previous_value})
        )
        if not {"target_device", "target_inode"} <= scan_columns:
            historical_scan = (
                connection.execute(
                    "SELECT 1 FROM scans WHERE target_id = ? OR target_path = ? LIMIT 1",
                    (target_id, target_path),
                ).fetchone()
                is not None
            )
            strict_owner_matches = not historical_scan
            generation_predates_history = repository is not None and not historical_scan
        else:
            strict_owner_matches = True
            timestamps = (
                ", started_at, created_at" if {"started_at", "created_at"} <= scan_columns else ""
            )
            revisions = ", target_revision" if "target_revision" in scan_columns else ""
            scans = connection.execute(
                f"""
                SELECT target_device, target_inode{timestamps}{revisions} FROM scans
                WHERE target_id = ? OR target_path = ?
                """,
                (target_id, target_path),
            ).fetchall()
            git_scans = [
                scan
                for scan in scans
                if "target_revision" not in scan.keys() or scan["target_revision"] != "unversioned"
            ]
            generation_predates_history = repository is not None and _repository_predates_history(
                repository, git_scans
            )
            for scan in scans:
                historical_scan = True
                device, inode = scan["target_device"], scan["target_inode"]
                if device is None and inode is None:
                    strict_owner_matches = False
                    continue
                if device is None or inode is None:
                    malformed_owner = True
                    strict_owner_matches = False
                    continue
                recorded_owner = True
                if not stored_filesystem_identity_matches(device, metadata.st_dev):
                    strict_owner_matches = False
                    mismatch = mismatch or sys.platform != "linux"
                if not stored_filesystem_identity_matches(inode, metadata.st_ino):
                    mismatch = True
                    strict_owner_matches = False
            stored_matches = repository is not None and (
                stored_identity
                in {
                    repository.value,
                    repository.legacy_value,
                    repository.previous_value or repository.value,
                }
                or (
                    repository.value.startswith("repository_v3_sha256_")
                    and recorded_generations == {repository.value}
                    and isinstance(stored_identity, str)
                    and re.fullmatch(r"repository_sha256_[0-9a-f]{64}", stored_identity) is not None
                )
            )
            verified_repository = repository is not None and (
                stored_matches
                or recorded_generations in ({repository.value}, {repository.previous_value})
            )
            ownership_matches = not (
                malformed_owner
                or mismatch
                and (
                    not verified_repository or repository is None or repository.relative_path == "."
                )
                or stored_identity is not None
                and (not stored_matches or historical_scan and not recorded_owner)
                or stored_identity is None
                and repository is not None
                and historical_scan
                and not verified_repository
                and not generation_predates_history
            )
        ownership_matches = ownership_matches and not generation_conflict
    previous_generation = None
    if (
        ownership_matches
        and repository is not None
        and repository.previous_value is not None
        and supports_repository_identity(connection)
        and "repository_generation" in scan_columns
        and connection.execute(
            "SELECT 1 FROM security_targets WHERE repository_identity = ? "
            "UNION ALL SELECT 1 FROM scans WHERE repository_generation = ? LIMIT 1",
            (repository.previous_value, repository.previous_value),
        ).fetchone()
        is not None
    ):
        previous_generation = repository.previous_value
    return RepositoryTargetState(
        target_id,
        target_path,
        stored_identity,
        resolved_path,
        metadata,
        repository,
        ownership_matches,
        strict_owner_matches,
        generation_predates_history,
        historical_scan,
        previous_generation=previous_generation,
    )

def verified_repository_identity(
    connection: sqlite3.Connection,
    target_id: str,
    target_path: str,
    *,
    stored_identity: str | None = None,
) -> str | None:
    try:
        return _inspect_repository_target(
            connection, target_id, target_path, stored_identity
        ).verified_identity
    except SystemExit:
        # Historical identity enrichment is optional; active registration stays strict.
        return None

def scan_repository_generation(scan: sqlite3.Row | dict) -> str | None:
    return scan["repository_generation"] if "repository_generation" in scan.keys() else None

def scan_repository_group(scan: sqlite3.Row | dict) -> tuple[str, str]:
    generation = scan_repository_generation(scan)
    return ("repository", generation) if generation is not None else ("target", scan["target_id"])

@dataclass(frozen=True)
class RepositoryScanScope:
    """A verified generation and, separately, its exact target's legacy scans."""

    generation: str | None = None
    target_id: str | None = None
    exact_target: bool = False
    available: bool = True

    def sql(
        self, alias: str = "scans", *, supports_generation: bool = True
    ) -> tuple[str, tuple[str, ...]]:
        if not self.available:
            return "0", ()
        if self.exact_target:
            return (f"{alias}.target_id = ?", (self.target_id,)) if self.target_id else ("0", ())
        clauses, values = [], []
        if self.generation is not None and supports_generation:
            clauses.append(f"{alias}.repository_generation = ?")
            values.append(self.generation)
        if self.target_id:
            legacy = f"{alias}.repository_generation IS NULL AND " if supports_generation else ""
            clauses.append(f"({legacy}{alias}.target_id = ?)")
            values.append(self.target_id)
        return (f"({' OR '.join(clauses)})", tuple(values)) if clauses else ("0", ())

    def contains(self, scan: sqlite3.Row | dict) -> bool:
        if not self.available:
            return False
        if self.exact_target:
            return bool(self.target_id) and scan["target_id"] == self.target_id
        generation = scan_repository_generation(scan)
        if generation is not None:
            return generation == self.generation
        return bool(self.target_id) and scan["target_id"] == self.target_id

class RepositoryIdentityCache:
    """One request's saved identities and verified live aliases."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection
        self.supports_identity = supports_repository_identity(connection)
        self.scan_columns = {row["name"] for row in connection.execute("PRAGMA table_info(scans)")}
        self.supports_generation = "repository_generation" in self.scan_columns
        identity_column = "repository_identity" if self.supports_identity else "NULL"
        self.targets = {
            row["target_id"]: row
            for row in connection.execute(
                "SELECT id AS target_id, current_path AS target_path, "
                f"{identity_column} AS repository_identity FROM security_targets"
            )
        }
        self.targets_by_path = {row["target_path"]: row for row in self.targets.values()}
        self._states: dict[tuple[str, str, str | None], RepositoryTargetState] = {}
        self._origins: dict[str, tuple[str, str] | None] = {}

    def for_row(self, row: sqlite3.Row | dict) -> RepositoryTargetState:
        target = self.targets.get(row["target_id"])
        stored = (
            row["repository_identity"]
            if "repository_identity" in row.keys()
            else target["repository_identity"]
            if target is not None
            else None
        )
        key = (
            row["target_id"] or "",
            row["target_path"],
            stored,
        )
        if key not in self._states:
            self._states[key] = _inspect_repository_target(
                self.connection, *key, scan_columns=self.scan_columns
            )
        return self._states[key]

    def for_path(self, target_path: str) -> RepositoryTargetState:
        path = Path(target_path)
        if os.name != "nt" and ".." in path.parts:
            last_parent = len(path.parts) - 1 - path.parts[::-1].index("..")
            try:
                # A missing final checkout can retain history. Every component
                # traversed before a parent segment must still exist.
                Path(*path.parts[: last_parent + 1]).stat()
            except (OSError, RuntimeError):
                return RepositoryTargetState("", target_path, None)
        row = self.targets_by_path.get(target_path)
        if row is None:
            try:
                canonical = str(Path(target_path).resolve())
            except (OSError, RuntimeError):
                canonical = None
            row = self.targets_by_path.get(canonical)
        if row is None:
            row = next(
                (
                    target
                    for target in self.targets.values()
                    if _same_existing_path(Path(target["target_path"]), Path(target_path))
                ),
                None,
            )
        return self.for_row(
            row
            if row is not None
            else {
                "target_id": "",
                "target_path": target_path,
                "repository_identity": None,
            }
        )

    def scope(self, target_id: str) -> RepositoryScanScope:
        target = self.targets.get(target_id)
        return (
            self._scope_for_state(self.for_row(target))
            if target is not None
            else RepositoryScanScope(target_id=target_id)
        )

    def history_path(self, target_path: str) -> str:
        """Use the worktree root when a subdirectory has no saved history of its own."""
        requested = self.for_path(target_path)
        if (
            not requested.ownership_matches
            or requested.target_id
            or requested.repository is None
            or requested.repository.relative_path == "."
        ):
            return target_path
        if (
            self.supports_generation
            and self.connection.execute(
                "SELECT 1 FROM scans WHERE repository_generation = ? LIMIT 1",
                (requested.live_identity,),
            ).fetchone()
        ):
            return target_path
        worktree = _repository_worktree(Path(target_path))
        return str(worktree[0]) if worktree is not None else target_path

    def scope_for_path(self, target_path: str) -> RepositoryScanScope:
        return self._scope_for_state(self.for_path(target_path))

    def scope_for_scan(self, scan: sqlite3.Row | dict) -> RepositoryScanScope:
        requested = self.for_row(scan)
        generation = scan_repository_generation(scan)
        if not requested.ownership_matches or (
            generation is not None and generation != requested.live_identity
        ):
            return RepositoryScanScope(available=False)
        return RepositoryScanScope(generation, requested.target_id)

    def _scope_for_state(self, requested: RepositoryTargetState) -> RepositoryScanScope:
        if not requested.ownership_matches:
            return RepositoryScanScope(available=False)
        return RepositoryScanScope(
            requested.live_identity if not requested.missing else None,
            requested.target_id or None,
            exact_target=requested.missing,
        )

    def origin(self, state: RepositoryTargetState) -> tuple[str, str] | None:
        if state.target_path not in self._origins:
            self._origins[state.target_path] = repository_origin(Path(state.target_path))
        return self._origins[state.target_path]

def require_scan_checkout_owner(connection: sqlite3.Connection, scan: sqlite3.Row | dict) -> None:
    identities = RepositoryIdentityCache(connection)
    owner = identities.for_row(scan)
    owner.require_owner()
    if owner.missing or not identities.scope_for_scan(scan).contains(scan):
        raise SystemExit("The saved scan no longer matches the selected repository checkout.")

def upgrade_linux_repository_generations(connection: sqlite3.Connection) -> None:
    """Convert only old digests authenticated before their device evidence changes."""
    if sys.platform != "linux":
        return
    targets = connection.execute(
        "SELECT id, current_path, repository_identity FROM security_targets "
        "WHERE repository_identity GLOB 'repository_sha256_*' OR EXISTS ("
        "SELECT 1 FROM scans WHERE (scans.target_id = security_targets.id "
        "OR scans.target_path = security_targets.current_path) "
        "AND repository_generation GLOB 'repository_sha256_*')"
    ).fetchall()
    for target in targets:
        try:
            state = _inspect_repository_target(
                connection, target["id"], target["current_path"], target["repository_identity"]
            )
        except SystemExit:
            continue
        _upgrade_repository_generation(connection, state)

def _upgrade_repository_generation(
    connection: sqlite3.Connection, state: RepositoryTargetState
) -> RepositoryTargetState:
    identity = state.repository
    if (
        identity is None
        or identity.previous_value is None
        or state.stored_identity not in (None, identity.value, identity.previous_value)
        or not state.ownership_matches
        or not state.strict_owner_matches
    ):
        return state
    connection.execute(
        "UPDATE security_targets SET repository_identity = ? WHERE repository_identity = ?",
        (identity.value, identity.previous_value),
    )
    connection.execute(
        "UPDATE scans SET repository_generation = ? WHERE repository_generation = ?",
        (identity.value, identity.previous_value),
    )
    return replace(
        state,
        stored_identity=(
            identity.value
            if state.stored_identity == identity.previous_value
            else state.stored_identity
        ),
        previous_generation=None,
    )

def _pre_release_repository_identities(identity: GitRepositoryIdentity) -> set[str]:
    directory = os.path.normcase(identity.common_directory)
    relative = os.path.normcase(os.fspath(Path(identity.relative_path))).replace(os.sep, "/")
    prefix = f"git-common-dir\0{directory}\0{identity.device}\0{identity.inode}\0"
    identities = {_identity_digest(f"{prefix}{relative}")}
    try:
        generation = (Path(identity.common_directory) / "description").lstat()
    except OSError:
        return identities
    if stat.S_ISREG(generation.st_mode):
        identities.add(
            _identity_digest(
                f"{prefix}git-description\0"
                f"{serialize_filesystem_identity(generation.st_dev)}\0"
                f"{serialize_filesystem_identity(generation.st_ino)}\0"
                f"{generation.st_ctime_ns}\0{relative}"
            )
        )
    return identities

def _timestamp_ns(value: str) -> int | Fraction | None:
    try:
        # Python 3.10 requires three or six fractional digits; stored timestamps
        # can come from newer runtimes that accept any RFC 3339 precision.
        fraction = re.search(r"\.(\d+)(?:[Zz]|[+-]\d{2}:\d{2})$", value)
        normalized = value
        if (
            fraction is not None
            and fraction[1].isascii()
            and re.search(r"[0-9]{2}:[0-9]{2}:[0-9]{2}$", value[: fraction.start()]) is not None
        ):
            normalized = (
                value[: fraction.start(1)]
                + fraction[1][:6].ljust(6, "0")
                + value[fraction.end(1) :]
            )
        if normalized.endswith(("Z", "z")):
            normalized = normalized[:-1] + "+00:00"
        timestamp = datetime.fromisoformat(normalized)
    except (TypeError, ValueError):
        return None
    if timestamp.tzinfo is None:
        return None
    delta = timestamp - datetime(1970, 1, 1, tzinfo=timezone.utc)
    nanoseconds = (delta.days * 86400 + delta.seconds) * 1_000_000_000 + delta.microseconds * 1000
    # datetime truncates RFC 3339 fractions after six digits; sealed timestamps retain them.
    if fraction is not None and len(fraction[1]) > 6:
        return nanoseconds + Fraction(Decimal("0." + fraction[1][6:])) * 1000
    return nanoseconds

def _repository_predates_history(
    identity: GitRepositoryIdentity,
    scans: list[sqlite3.Row],
    *,
    empty_timestamp: str | None = None,
) -> bool:
    if not scans and empty_timestamp is None:
        return True
    if any(not {"started_at", "created_at"} <= set(scan.keys()) for scan in scans):
        return False
    timestamps = (
        [_timestamp_ns(scan[column]) for scan in scans for column in ("started_at", "created_at")]
        if scans
        else [_timestamp_ns(empty_timestamp)]
    )
    repository_birth = max(identity.birth_time_ns, identity.object_birth_time_ns)
    return all(value is not None for value in timestamps) and repository_birth <= min(timestamps)

def normalize_pre_release_repository_identities(connection: sqlite3.Connection) -> None:
    """Retain only individually established pre-release identity bindings."""
    if not supports_repository_identity(connection):
        return
    identities = RepositoryIdentityCache(connection)
    targets = connection.execute(
        "SELECT id AS target_id, current_path AS target_path, created_at, repository_identity "
        "FROM security_targets WHERE repository_identity IS NOT NULL"
    ).fetchall()
    states = {target["target_id"]: identities.for_row(target) for target in targets}
    anchors = {
        state.stored_identity: state.repository
        for state in states.values()
        if state.repository is not None
        and state.ownership_matches
        and state.stored_identity
        in {
            state.repository.value,
            state.repository.legacy_value,
            state.repository.previous_value or state.repository.value,
        }
    }
    for target in targets:
        stored = target["repository_identity"]
        state = states[target["target_id"]]
        scans = connection.execute(
            "SELECT started_at, created_at FROM scans WHERE target_id = ? OR target_path = ?",
            (target["target_id"], target["target_path"]),
        ).fetchall()
        anchor = anchors.get(stored)
        identity = state.repository
        replacement = None
        if anchor is not None:
            if _repository_predates_history(anchor, scans, empty_timestamp=target["created_at"]):
                replacement = stored
        elif (
            identity is not None
            and state.strict_owner_matches
            and stored in _pre_release_repository_identities(identity)
            and _repository_predates_history(identity, scans, empty_timestamp=target["created_at"])
        ):
            replacement = identity.legacy_value
        if replacement != stored:
            connection.execute(
                "UPDATE security_targets SET repository_identity = ? "
                "WHERE id = ? AND repository_identity = ?",
                (replacement, target["target_id"], stored),
            )

def _bind_unscanned_repository_identity(
    connection: sqlite3.Connection,
    target_id: str,
    target_path: str,
    identity: str | None,
    *,
    previous_identity: str | None = None,
) -> bool:
    return (
        connection.execute(
            """
        UPDATE security_targets
        SET repository_identity = ?
        WHERE id = ? AND current_path = ? AND repository_identity IS ?
            AND NOT EXISTS (
                SELECT 1 FROM scans
                WHERE scans.target_id = security_targets.id
                    OR scans.target_path = security_targets.current_path
            )
        """,
            (identity, target_id, target_path, previous_identity),
        ).rowcount
        == 1
    )

def backfill_repository_identities(connection: sqlite3.Connection) -> None:
    if not supports_repository_identity(connection):
        return
    targets = connection.execute(
        """
        SELECT targets.id, targets.current_path
        FROM security_targets AS targets
        WHERE targets.repository_identity IS NULL
            AND NOT EXISTS (
                SELECT 1 FROM scans
                WHERE scans.target_id = targets.id OR scans.target_path = targets.current_path
            )
        """
    ).fetchall()
    for target in targets:
        identity = verified_repository_identity(
            connection, str(target["id"]), target["current_path"]
        )
        if identity is not None:
            _bind_unscanned_repository_identity(
                connection, str(target["id"]), target["current_path"], identity
            )

def backfill_security_targets(connection: sqlite3.Connection) -> None:
    """Fill missing target IDs on scans and workspaces in the caller’s transaction."""
    workspace_columns = {row["name"] for row in connection.execute("PRAGMA table_info(workspaces)")}
    validated_workspace = (
        " AND target_path_unvalidated = 0" if "target_path_unvalidated" in workspace_columns else ""
    )
    rows = connection.execute(
        f"""
        SELECT target_path FROM workspaces WHERE target_path IS NOT NULL{validated_workspace}
        UNION
        SELECT target_path FROM scans
        """
    ).fetchall()
    for row in rows:
        target_path = row["target_path"]
        target_id = ensure_security_target(connection, target_path, verify_ownership=False)
        connection.execute(
            "UPDATE workspaces SET target_id = ? WHERE target_path = ? AND target_id IS NULL"
            + validated_workspace,
            (target_id, target_path),
        )
        connection.execute(
            "UPDATE scans SET target_id = ? WHERE target_path = ? AND target_id IS NULL",
            (target_id, target_path),
        )
    backfill_repository_identities(connection)

@dataclass(frozen=True)
class RegisteredRepositoryTarget:
    target_id: str
    repository_generation: str | None

def _record_checkout_root(
    connection: sqlite3.Connection, row: sqlite3.Row, state: RepositoryTargetState, inserted: bool
) -> None:
    if "git_checkout_root" not in row.keys():
        return
    previous = row["git_checkout_root"]
    # Migrations and old rows cannot attest to the former boundary of a checkout.
    if previous is None and (not inserted or state.has_historical_scans):
        return
    target = Path(state.target_path)
    if (
        state.metadata is None
        or not stat.S_ISDIR(state.metadata.st_mode)
        or state.resolved_path != state.target_path
    ):
        return
    try:
        root = _protected_repository_root(target)
    except (OSError, RuntimeError):
        return
    if previous is None or root in Path(previous).parents:
        connection.execute(
            "UPDATE security_targets SET git_checkout_root = ? "
            "WHERE id = ? AND current_path = ? AND git_checkout_root IS ?",
            (str(root), state.target_id, state.target_path, previous),
        )

def register_security_target(
    connection: sqlite3.Connection, target_path: str, *, verify_ownership: bool = True
) -> RegisteredRepositoryTarget:
    target_query = "SELECT * FROM security_targets WHERE current_path = ?"
    existing = connection.execute(target_query, (target_path,)).fetchone()
    inserted = False
    if existing is None:
        if verify_ownership:
            # Pin ambient Git before the new row temporarily lacks a checkout boundary.
            pin_scoped_git(Path(target_path))
        target_id = stable_target_id(Path(target_path))
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        # Leave repository_identity NULL until the guarded binding below succeeds.
        insert = connection.execute(
            """
            INSERT OR IGNORE INTO security_targets (
                id, current_path, display_name, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (target_id, target_path, Path(target_path).name, timestamp, timestamp),
        )
        inserted = insert.rowcount == 1
        existing = connection.execute(target_query, (target_path,)).fetchone()
        if existing is None:
            existing = connection.execute(
                "SELECT * FROM security_targets WHERE id = ?", (target_id,)
            ).fetchone()
            if existing is None or Path(existing["current_path"]) != Path(target_path):
                raise SystemExit("The repository target changed while it was being registered.")
            target_path = existing["current_path"]
    target_id = str(existing["id"])
    if "repository_identity" not in existing.keys():
        return RegisteredRepositoryTarget(target_id, None)
    try:
        state = _inspect_repository_target(
            connection, target_id, target_path, existing["repository_identity"]
        )
    except SystemExit:
        if verify_ownership:
            raise
        return RegisteredRepositoryTarget(target_id, None)
    if not state.has_historical_scans and state.live_identity != state.stored_identity:
        _bind_unscanned_repository_identity(
            connection,
            target_id,
            target_path,
            state.live_identity,
            previous_identity=existing["repository_identity"],
        )
        existing = connection.execute(target_query, (target_path,)).fetchone()
        if existing is None:
            raise SystemExit("The repository target changed while it was being registered.")
        target_id = str(existing["id"])
        state = _inspect_repository_target(
            connection, target_id, target_path, existing["repository_identity"]
        )
    state = _upgrade_repository_generation(connection, state)
    if verify_ownership:
        state.require_owner()
    if existing["repository_identity"] is None:
        identity = state.verified_identity
        if identity is not None and not _bind_unscanned_repository_identity(
            connection, target_id, target_path, identity
        ):
            # A writer may have registered history or bound this target after inspection.
            existing = connection.execute(target_query, (target_path,)).fetchone()
            if existing is None:
                raise SystemExit("The repository target changed while it was being registered.")
            target_id = str(existing["id"])
            state = _inspect_repository_target(
                connection, target_id, target_path, existing["repository_identity"]
            )
            if verify_ownership:
                state.require_owner()
    if verify_ownership:
        _record_checkout_root(connection, existing, state, inserted)
    return RegisteredRepositoryTarget(
        target_id, state.live_identity if state.ownership_matches and not state.missing else None
    )

def ensure_security_target(
    connection: sqlite3.Connection, target_path: str, *, verify_ownership: bool = True
) -> str:
    """Return the stable ID for the registered target and its verified ownership."""
    return register_security_target(
        connection, target_path, verify_ownership=verify_ownership
    ).target_id

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_validation.py`

```python
"""Shared validation helpers for Codex Security workbench commands."""

from __future__ import annotations

import argparse
import json
import math
import re
import sqlite3
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import finalize_scan_contract as finalizer
from workbench_constants import optional_text as optional_text
from workbench_scan_usage import TOKEN_FIELDS, valid_account_rate_limit
from workbench_scan_usage import (
    _reject_nonstandard_json_number as reject_nonstandard_json_number,
)
from workbench_scan_usage import _timestamp as usage_timestamp

reject_non_finite_json = finalizer._reject_non_finite_json

def read_json_object(path: Path) -> dict[str, Any]:
    """Read a UTF-8 JSON object from path, raising SystemExit on read errors, malformed JSON, or another top-level type."""
    try:
        payload = json.loads(
            path.read_text(encoding="utf-8"),
            parse_constant=reject_non_finite_json,
        )
    except (OSError, ValueError) as exc:
        raise SystemExit(f"{path.name}: invalid JSON: {exc}") from exc
    if not isinstance(payload, dict):
        raise SystemExit(f"{path.name}: expected a JSON object.")
    return payload

def javascript_utf8(value: str) -> bytes:
    """Match Node's UTF-8 encoding of UTF-16 strings without changing stored text."""
    return (
        value.encode("utf-16-le", errors="surrogatepass")
        .decode("utf-16-le", errors="replace")
        .encode("utf-8")
    )

def timestamp_key(value: str) -> datetime:
    return finalizer.parse_timestamp(value)

def require_uuid(value: str, label: str) -> str:
    """Return the standard hyphenated UUID text or raise SystemExit using label to identify the invalid argument."""
    try:
        return str(uuid.UUID(value))
    except ValueError as exc:
        raise SystemExit(f"{label} must be a UUID.") from exc

def sqlite_busy(error: sqlite3.OperationalError) -> bool:
    return "locked" in str(error).lower() or "busy" in str(error).lower()

path_within_scope = finalizer.path_within_scope

def require_close_note(close_reason: str | None, note: str | None) -> None:
    """Require a note when closing a finding as a false positive or when declining a fix."""
    if note is None and close_reason == "false_positive":
        raise SystemExit("Explain why this finding is a false positive.")
    if note is None and close_reason == "wont_fix":
        raise SystemExit("Explain why this finding will not be fixed.")

def user_context_argument(args: argparse.Namespace) -> str | None:
    value = sys.stdin.read() if getattr(args, "user_context_stdin", False) else args.user_context
    return optional_text(value)

SCAN_USAGE_TOKEN_KEYS = tuple(TOKEN_FIELDS.values())

def _valid_legacy_scan_cost(cost: object) -> bool:
    token_keys = ("inputTokens", "cachedInputTokens", "cacheWriteInputTokens", "outputTokens")
    try:
        return (
            isinstance(cost, dict)
            and isinstance(cost.get("model"), str)
            and bool(cost["model"])
            and all(type(cost.get(key)) is int and cost[key] >= 0 for key in token_keys)
            and cost["cachedInputTokens"] + cost["cacheWriteInputTokens"] <= cost["inputTokens"]
            and type(cost.get("estimatedUsd")) in (int, float)
            and math.isfinite(cost["estimatedUsd"])
            and cost["estimatedUsd"] >= 0
        )
    except OverflowError:
        return False

def _valid_measured_scan_usage(usage: object) -> bool:
    if not isinstance(usage, dict):
        return False
    coverage = usage.get("coverage")
    thread_count = usage.get("threadCount")
    if (
        coverage not in ("complete", "partial", "unavailable")
        or usage.get("source") not in ("codex_rollout", "codex_runtime")
        or type(thread_count) is not int
        or thread_count < 0
    ):
        return False
    completion = usage.get("completion")
    if "completion" in usage and (
        not isinstance(completion, dict)
        or set(completion) != {"threadId", "turnId", "finalized"}
        or not isinstance(completion["threadId"], str)
        or not completion["threadId"]
        or not isinstance(completion["turnId"], str)
        or not completion["turnId"]
        or type(completion["finalized"]) is not bool
        or not completion["finalized"]
        and coverage == "complete"
    ):
        return False
    warnings = usage.get("warnings", [])
    if (
        not isinstance(warnings, list)
        or len(warnings) > 32
        or any(
            not isinstance(warning, str) or re.fullmatch(r"[a-z][a-z0-9_]{0,63}", warning) is None
            for warning in warnings
        )
        or len(set(warnings)) != len(warnings)
    ):
        return False
    if "accountRateLimits" in usage:
        limits = usage["accountRateLimits"]
        if not isinstance(limits, list) or not all(
            valid_account_rate_limit(limit) for limit in limits
        ):
            return False
    if coverage == "unavailable":
        return thread_count == 0 and set(usage).issubset(
            {"coverage", "source", "threadCount", "warnings", "completion", "accountRateLimits"}
        )

    allowed_keys = {
        "coverage",
        "coverageScope",
        "source",
        "threadCount",
        "missingThreadCount",
        "warnings",
        "completion",
        "byRole",
        "window",
        "observedAt",
        "tokensUpdatedAt",
        "accountRateLimits",
        "cacheWriteInputTokensReported",
        *SCAN_USAGE_TOKEN_KEYS,
    }
    if thread_count == 0 or not set(usage).issubset(allowed_keys):
        return False
    if "coverageScope" in usage:
        scope = usage["coverageScope"]
        if (
            not isinstance(scope, list)
            or any(not isinstance(identity, str) or not identity for identity in scope)
            or len(set(scope)) != len(scope)
        ):
            return False
    if (
        not all(type(usage.get(key)) is int and usage[key] >= 0 for key in SCAN_USAGE_TOKEN_KEYS)
        or usage["cachedInputTokens"] + usage["cacheWriteInputTokens"] > usage["inputTokens"]
        or "cacheWriteInputTokensReported" in usage
        and type(usage["cacheWriteInputTokensReported"]) is not bool
    ):
        return False
    missing = usage.get("missingThreadCount", 0)
    if type(missing) is not int or missing < 0:
        return False
    if coverage == "complete" and (
        any(warning != "cost_estimate_covers_earlier_usage" for warning in warnings) or missing
    ):
        return False
    if coverage == "partial" and not (warnings or missing):
        return False
    for field in ("observedAt", "tokensUpdatedAt"):
        if field in usage and usage_timestamp(usage[field]) is None:
            return False
    if "window" in usage:
        window = usage["window"]
        if not isinstance(window, dict) or set(window) != {"startedAt", "endedAt"}:
            return False
        start, end = (usage_timestamp(window[key]) for key in ("startedAt", "endedAt"))
        if start is None or end is None or start > end:
            return False
    if "byRole" in usage:
        roles = usage["byRole"]
        keys = {*SCAN_USAGE_TOKEN_KEYS, "threadCount"}
        if not isinstance(roles, dict) or set(roles) != {"parent", "workers"}:
            return False
        if any(
            not isinstance(role, dict)
            or not keys.issubset(role)
            or not set(role).issubset({*keys, "cacheWriteInputTokensReported"})
            or any(type(role[key]) is not int or role[key] < 0 for key in keys)
            or "cacheWriteInputTokensReported" in role
            and type(role["cacheWriteInputTokensReported"]) is not bool
            for role in roles.values()
        ):
            return False
        if any(sum(role[key] for role in roles.values()) != usage[key] for key in keys):
            return False
    return True

def parse_scan_cost(value: str | None) -> str | None:
    """Return compact JSON for valid measured usage or a legacy cost estimate.

    None means cost data was omitted. Invalid JSON, nonfinite numbers, or an
    unsupported cost record raise SystemExit.
    """
    if value is None:
        return None
    try:
        cost = json.loads(value, parse_constant=reject_nonstandard_json_number)
    except (TypeError, UnicodeError, ValueError) as exc:
        raise SystemExit("Scan cost must be a valid JSON object.") from exc
    if isinstance(cost, dict) and "usage" in cost:
        if (
            not set(cost).issubset({"usage", "cost"})
            or not _valid_measured_scan_usage(cost["usage"])
            or "cost" in cost
            and not _valid_legacy_scan_cost(cost["cost"])
        ):
            raise SystemExit("Scan cost includes invalid measured token usage.")
    elif not _valid_legacy_scan_cost(cost):
        raise SystemExit(
            "Scan cost must include a model, nonnegative token counts, and an estimated USD amount."
        )
    return json.dumps(cost, separators=(",", ":"), allow_nan=False)

def bounded_output_text(value: Any, maximum_bytes: int) -> str:
    """Return the prefix of the stringified value that fits in maximum_bytes of UTF-8 without splitting a character."""
    encoded = str(value).encode("utf-8")[:maximum_bytes]
    return encoded.decode("utf-8", errors="ignore")

def require_occurrence(connection: sqlite3.Connection, occurrence_id: str) -> sqlite3.Row:
    """Return the finding occurrence row or raise SystemExit if its ID is missing or unknown."""
    occurrence_id = optional_text(occurrence_id, maximum=256)
    if occurrence_id is None:
        raise SystemExit("occurrence-id is required.")
    row = connection.execute(
        "SELECT * FROM finding_occurrences WHERE id = ?", (occurrence_id,)
    ).fetchone()
    if row is None:
        raise SystemExit("Codex Security finding occurrence not found.")
    return row

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```
