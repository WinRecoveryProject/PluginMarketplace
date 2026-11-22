# Plugin files: winrecoveryproject-devsuite — `runtime/`

Source: `plugins/winrecoveryproject-devsuite`. Files outside the `skills/*` folders, embedded as text.

## File: `runtime/__init__.py`

```python
"""Owned DevSuite runtime; standard library only."""
```

## File: `runtime/coordinator/__init__.py`

```python
"""MIT adaptations of Six Ideas Coordinator 0.4.0; see licenses/coordinator.txt."""
```

## File: `runtime/coordinator/project.py`

```python
#!/usr/bin/env python3
"""Dry-run-first lifecycle changes for Coordinator project markers.

Schema 2 lifecycle operations create, pin, poll, or stop no Coordinator task
and own no heartbeat, schedule, or Mission Control runtime. Legacy schema-1
cleanup actions are reported only when old project state proves that those
components may still exist.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

DISCOVERY_HEADING = "## Codex task-boundary board"
DISCOVERY_BLOCK = """## Codex task-boundary board

- This repository uses the opt-in Codex task-boundary board in `.codex/coordination/project.yaml`.
- Before substantial writes, load the installed `devsuite-planning` skill, list active claims from the primary worktree, and publish only this task's bounded claim.
- Native Codex tasks remain the execution, messaging, and transcript authority; an explicitly requested goal Coordinator is on demand, with no heartbeat or mandatory pull-request workflow.
- Reject cross-project notices and never store transcripts, reasoning, prompts, or tool output in Coordinator state."""

LEGACY_DISCOVERY_BLOCKS = (
    # Recognize the previous schema-2 discovery block when an authorized lifecycle
    # change adopts this runtime; preserve all unrelated AGENTS.md bytes.
    DISCOVERY_BLOCK.replace("`devsuite-planning`", "`codex-coordinator`"),
    """## Codex Coordinator

- This repository is Codex Coordinator-enabled.
- Project identity is in `.codex/coordination/project.yaml`; current coordination state is in `.codex/coordination/CURRENT.md`.
- Load the globally installed `codex-coordinator` skill at the start of every task in this repository; all same-repository tasks are managed by default unless the user explicitly excludes one.
- Respect the project ID and assigned task boundary; reject missing or mismatched cross-thread project bindings.
- Treat Coordinator internals as protected; only an explicitly user-authorised `COORDINATOR_MAINTAINER` may modify them.""",
    """## Codex Coordinator

- This repository is Codex Coordinator-enabled.
- Project identity is in `.codex/coordination/project.yaml`; current coordination state is in `.codex/coordination/CURRENT.md`.
- Load the globally installed `codex-coordinator` skill before substantial, overlapping, parallel, or cross-thread work.
- Respect the project ID and assigned task boundary; reject missing or mismatched cross-thread project bindings.
- Treat Coordinator internals as protected; only an explicitly user-authorised `COORDINATOR_MAINTAINER` may modify them.""",
)

IGNORE_BLOCK = ".codex/coordination/*\n!.codex/coordination/project.yaml"
QUARANTINE_NAME = "coordination.codex-coordinator-purge"
MARKER_KEYS = ("schema_version", "coordination_enabled", "project_id")
TASK_PREFIX = re.compile(r"[A-Z][A-Z0-9-]{0,15}")
MIGRATION_BACKUP_NAME = "project.schema-1.yaml"
MAX_LEGACY_FILES = 10_000
MAX_TASK_TAIL_BYTES = 4096
TERMINAL_TASK_STATUSES = {
    "CANCELED",
    "CANCELLED",
    "COMPLETE",
    "COMPLETED",
    "STOPPED",
    "SUPERSEDED",
}

class LifecycleError(RuntimeError):
    """Raised when a lifecycle precondition is unsafe or ambiguous."""

@dataclass(frozen=True)
class Document:
    path: Path
    raw: bytes
    text: str
    newline: str
    bom: bool
    existed: bool = True

    def encode(self, text: str) -> bytes:
        payload = text.encode("utf-8")
        return (b"\xef\xbb\xbf" + payload) if self.bom else payload

@dataclass(frozen=True)
class Project:
    root: Path
    coordination: Path
    marker: Document
    fields: dict[str, str]
    resumed_purge: bool

    @property
    def project_id(self) -> str:
        return self.fields["project_id"]

    @property
    def enabled(self) -> bool:
        return self.fields["coordination_enabled"] == "true"

    @property
    def schema(self) -> int:
        return int(self.fields["schema_version"])

def _read_document(path: Path, *, required: bool = True) -> Document | None:
    if not path.exists():
        if required:
            raise LifecycleError(f"required file is missing: {path}")
        return None
    if not path.is_file():
        raise LifecycleError(f"expected a file: {path}")
    raw = path.read_bytes()
    bom = raw.startswith(b"\xef\xbb\xbf")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise LifecycleError(f"file is not UTF-8: {path}") from error
    newline = "\r\n" if b"\r\n" in raw else "\n"
    return Document(
        path=path,
        raw=raw,
        text=text,
        newline=newline,
        bom=bom,
        existed=True,
    )

def _same_path(left: Path, right: Path) -> bool:
    return os.path.normcase(str(left.resolve())) == os.path.normcase(str(right.resolve()))

def _is_linklike(path: Path) -> bool:
    return path.is_symlink() or (
        hasattr(path, "is_junction") and path.exists() and path.is_junction()
    )

def _require_contained_directory(root: Path, path: Path, *, label: str) -> None:
    if _is_linklike(path):
        raise LifecycleError(f"{label} must not be a symlink or junction: {path}")
    if path.exists() and not path.is_dir():
        raise LifecycleError(f"{label} must be a directory: {path}")
    try:
        path.resolve(strict=False).relative_to(root)
    except ValueError as error:
        raise LifecycleError(f"{label} escapes the project root: {path}") from error

def _git_output(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(root), *args],
        text=True,
        capture_output=True,
        timeout=10,
        check=False,
    )
    if result.returncode != 0:
        raise LifecycleError(f"Git validation failed for {root}")
    return result.stdout

def _validate_primary_worktree(root: Path) -> None:
    top = Path(_git_output(root, "rev-parse", "--show-toplevel").strip())
    if not _same_path(root, top):
        raise LifecycleError("project root must equal the Git worktree root")
    listing = _git_output(root, "worktree", "list", "--porcelain").splitlines()
    first = next((line[9:] for line in listing if line.startswith("worktree ")), None)
    if not first or not _same_path(root, Path(first)):
        raise LifecycleError("lifecycle changes must run from the primary Git worktree")

def _parse_marker(document: Document) -> dict[str, str]:
    fields: dict[str, str] = {}
    for key in MARKER_KEYS:
        matches = re.findall(rf"(?m)^{re.escape(key)}:\s*([^\r\n#]+?)\s*$", document.text)
        if len(matches) != 1:
            raise LifecycleError(f"marker must contain exactly one {key}")
        fields[key] = matches[0].strip()
    if fields["schema_version"] not in {"1", "2"}:
        raise LifecycleError("only marker schema 1 and 2 are supported")
    if fields["coordination_enabled"] not in {"true", "false"}:
        raise LifecycleError("coordination_enabled must be true or false")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", fields["project_id"]):
        raise LifecycleError("project_id is invalid")
    return fields

def _marker_scalar(
    document: Document, key: str, *, required: bool = False
) -> str | None:
    matches = re.findall(
        rf"(?m)^\s*{re.escape(key)}:\s*([^\r\n#]+?)\s*$", document.text
    )
    if len(matches) > 1:
        raise LifecycleError(f"marker contains duplicate {key}")
    if not matches:
        if required:
            raise LifecycleError(f"schema-1 marker is missing {key}")
        return None
    return matches[0].strip()

def _validate_schema_one_migration(document: Document) -> None:
    expected = {
        "current": ".codex/coordination/CURRENT.md",
        "tasks": ".codex/coordination/tasks",
        "cross_project_task_access": "false",
        "cross_project_state_changes": "false",
    }
    for key, value in expected.items():
        if _marker_scalar(document, key, required=True) != value:
            raise LifecycleError(f"schema-1 marker has incompatible {key}")

def _schema_two_marker(project: Project) -> str:
    _validate_schema_one_migration(project.marker)
    lines = [
        "schema_version: 2",
        "coordination_enabled: false",
        f"project_id: {project.project_id}",
    ]
    for key in ("project_name", "task_prefix"):
        value = _marker_scalar(project.marker, key)
        if value is not None:
            lines.append(f"{key}: {value}")
    lines.extend(
        [
            "canonical_paths:",
            "  active: .codex/coordination/active",
            "  archive: .codex/coordination/archive",
            "access:",
            "  cross_project_task_access: false",
            "  cross_project_state_changes: false",
            "",
        ]
    )
    return project.marker.newline.join(lines)

def _load_project(root_value: str, *, allow_resumed_purge: bool = False) -> Project:
    root = Path(root_value).expanduser().resolve()
    if not root.is_dir():
        raise LifecycleError(f"project root is not a directory: {root}")
    _validate_primary_worktree(root)
    codex_directory = root / ".codex"
    coordination = codex_directory / "coordination"
    quarantine = codex_directory / QUARANTINE_NAME
    _require_contained_directory(root, codex_directory, label=".codex directory")
    _require_contained_directory(root, coordination, label="coordination directory")
    _require_contained_directory(root, quarantine, label="purge quarantine")
    resumed = False
    if not coordination.exists() and allow_resumed_purge and quarantine.is_dir():
        coordination = quarantine
        resumed = True
    elif quarantine.exists():
        raise LifecycleError(f"purge quarantine already exists: {quarantine}")
    marker = _read_document(coordination / "project.yaml")
    assert marker is not None
    return Project(root, coordination, marker, _parse_marker(marker), resumed)

def _replace_marker_enabled(document: Document, enabled: bool) -> str:
    replacement = "true" if enabled else "false"
    updated, count = re.subn(
        r"(?m)^coordination_enabled:\s*(?:true|false)\s*$",
        f"coordination_enabled: {replacement}",
        document.text,
    )
    if count != 1:
        raise LifecycleError("marker enablement field is ambiguous")
    return updated

def _validate_schema_two_reactivation(document: Document) -> None:
    expected = {
        "active": ".codex/coordination/active",
        "archive": ".codex/coordination/archive",
        "cross_project_task_access": "false",
        "cross_project_state_changes": "false",
    }
    for key, value in expected.items():
        matches = re.findall(
            rf"(?m)^\s*{re.escape(key)}:\s*([^\r\n#]+?)\s*$", document.text
        )
        if len(matches) != 1 or matches[0].strip() != value:
            raise LifecycleError(f"schema-2 marker has incompatible {key}")

def _block_for(document: Document, block: str) -> str:
    return block.replace("\n", document.newline)

def _remove_exact_block(document: Document, block: str, label: str) -> str:
    rendered = _block_for(document, block)
    count = document.text.count(rendered)
    if count > 1:
        raise LifecycleError(f"duplicate {label} blocks found")
    if count == 0:
        if label == "Coordinator discovery" and DISCOVERY_HEADING in document.text:
            raise LifecycleError("Coordinator discovery block differs from the packaged contract")
        return document.text
    start = document.text.index(rendered)
    end = start + len(rendered)
    if start >= len(document.newline) and document.text[:start].endswith(document.newline * 2):
        start -= len(document.newline)
    if document.text[end:].startswith(document.newline):
        end += len(document.newline)
    return document.text[:start] + document.text[end:]

def _remove_discovery_block(document: Document) -> str:
    matches: list[str] = []
    for block in (DISCOVERY_BLOCK, *LEGACY_DISCOVERY_BLOCKS):
        count = document.text.count(_block_for(document, block))
        if count > 1:
            raise LifecycleError("duplicate Coordinator discovery blocks found")
        if count == 1:
            matches.append(block)
    if len(matches) > 1:
        raise LifecycleError("multiple supported Coordinator discovery blocks found")
    if not matches:
        if DISCOVERY_HEADING in document.text:
            raise LifecycleError("Coordinator discovery block differs from the packaged contract")
        return document.text
    return _remove_exact_block(document, matches[0], "supported Coordinator discovery")

def _ensure_current_discovery(document: Document | None, path: Path) -> tuple[Document, str]:
    if document is None:
        return _add_exact_block(None, path, DISCOVERY_BLOCK, "Coordinator discovery")
    if document.text.count(_block_for(document, DISCOVERY_BLOCK)) == 1:
        return document, document.text
    normalized = _remove_discovery_block(document)
    source = Document(document.path, document.raw, normalized, document.newline, document.bom)
    return _add_exact_block(source, path, DISCOVERY_BLOCK, "Coordinator discovery")

def _add_exact_block(document: Document | None, path: Path, block: str, label: str) -> tuple[Document, str]:
    if document is None:
        empty = Document(path, b"", "", "\n", False, False)
        return empty, block + "\n"
    rendered = _block_for(document, block)
    count = document.text.count(rendered)
    if count > 1:
        raise LifecycleError(f"duplicate {label} blocks found")
    if count == 1:
        return document, document.text
    if label == "Coordinator discovery" and DISCOVERY_HEADING in document.text:
        raise LifecycleError("Coordinator discovery block differs from the packaged contract")
    separator = "" if not document.text else (document.newline if document.text.endswith(document.newline) else document.newline * 2)
    if document.text.endswith(document.newline) and not document.text.endswith(document.newline * 2):
        separator = document.newline
    return document, document.text + separator + rendered + document.newline

def _coordinator_id(project: Project) -> str | None:
    current = _read_document(project.coordination / "CURRENT.md", required=False)
    if current is None:
        return None
    matches = re.findall(r"(?m)^\*\*Coordinator thread ID:\*\*\s*(\S+)\s*$", current.text)
    return matches[0] if len(matches) == 1 and matches[0] != "NONE" else None

def _bounded_files(path: Path) -> list[Path]:
    if _is_linklike(path):
        raise LifecycleError(f"legacy state must not be a symlink or junction: {path}")
    if path.is_file():
        return [path]
    if not path.is_dir():
        raise LifecycleError(f"legacy state is not a normal file or directory: {path}")
    files: list[Path] = []
    entries = 0
    for child in path.rglob("*"):
        entries += 1
        if entries > MAX_LEGACY_FILES:
            raise LifecycleError(
                f"legacy inventory exceeds {MAX_LEGACY_FILES} entries: {path}"
            )
        if _is_linklike(child):
            raise LifecycleError(
                f"legacy state must not contain a symlink or junction: {child}"
            )
        if child.is_file():
            files.append(child)
    return files

def _tail_text(path: Path) -> str | None:
    size = path.stat().st_size
    with path.open("rb") as stream:
        if size > MAX_TASK_TAIL_BYTES:
            stream.seek(-MAX_TASK_TAIL_BYTES, os.SEEK_END)
        raw = stream.read(MAX_TASK_TAIL_BYTES)
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return None

def _legacy_inventory(project: Project) -> dict[str, object]:
    entries: list[dict[str, object]] = []
    task_files: list[Path] = []
    total_files = 0
    total_bytes = 0
    protected_names = {"project.yaml", MIGRATION_BACKUP_NAME, "active", "archive"}
    for path in sorted(project.coordination.iterdir(), key=lambda item: item.name.casefold()):
        if path.name in protected_names:
            continue
        files = _bounded_files(path)
        size = sum(item.stat().st_size for item in files)
        total_files += len(files)
        total_bytes += size
        relative = path.relative_to(project.root).as_posix()
        entries.append(
            {
                "path": relative,
                "kind": "directory" if path.is_dir() else "file",
                "fileCount": len(files),
                "bytes": size,
                "action": "preserve-ignored",
            }
        )
        if path.name == "tasks" and path.is_dir():
            task_files = files

    terminal_counts: dict[str, int] = {}
    unclassified = 0
    for path in task_files:
        tail = _tail_text(path)
        match = (
            re.search(r"(?mi)^\*\*Task status:\*\*\s*([A-Z-]+)\s*$", tail)
            if tail is not None
            else None
        )
        status = match.group(1).upper() if match else None
        if status in TERMINAL_TASK_STATUSES:
            terminal_counts[status] = terminal_counts.get(status, 0) + 1
        else:
            unclassified += 1

    return {
        "entries": entries,
        "fileCount": total_files,
        "bytes": total_bytes,
        "taskRecords": len(task_files),
        "explicitTerminalTaskRecords": sum(terminal_counts.values()),
        "terminalStatuses": dict(sorted(terminal_counts.items())),
        "unclassifiedTaskRecords": unclassified,
        "legacyCoordinatorThreadId": _coordinator_id(project),
        "ownershipImported": False,
    }

def _atomic_write(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = tempfile.NamedTemporaryFile(prefix=path.name + ".", suffix=".tmp", dir=path.parent, delete=False)
    temp = Path(handle.name)
    try:
        with handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp, path)
    finally:
        if temp.exists():
            temp.unlink()

def _apply_documents(changes: Iterable[tuple[Document, str]]) -> None:
    prepared = [(document, document.encode(text)) for document, text in changes if document.raw != document.encode(text)]
    written: list[Document] = []
    try:
        for document, payload in prepared:
            _atomic_write(document.path, payload)
            written.append(document)
    except Exception:
        for document in reversed(written):
            if document.existed:
                _atomic_write(document.path, document.raw)
            else:
                document.path.unlink(missing_ok=True)
        raise

def _initialization_root(root_value: str) -> tuple[Path, Path]:
    root = Path(root_value).expanduser().resolve()
    if not root.is_dir():
        raise LifecycleError(f"project root is not a directory: {root}")
    _validate_primary_worktree(root)
    codex_directory = root / ".codex"
    coordination = codex_directory / "coordination"
    _require_contained_directory(root, codex_directory, label=".codex directory")
    _require_contained_directory(root, coordination, label="coordination directory")
    marker = coordination / "project.yaml"
    if marker.exists():
        raise LifecycleError(
            "project marker already exists; use deactivate, migrate, or reactivate"
        )
    if coordination.exists() and any(coordination.iterdir()):
        raise LifecycleError(
            "coordination directory is not empty; preserve and reconcile it before init"
        )
    return root, coordination

def _initial_marker(
    *, project_id: str, project_name: str, task_prefix: str
) -> str:
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", project_id):
        raise LifecycleError("--project-id must be a stable lowercase slug")
    project_name = project_name.strip()
    if not 1 <= len(project_name) <= 120 or any(
        character in "\r\n" or ord(character) < 32 for character in project_name
    ):
        raise LifecycleError("--project-name must be one plain-text line")
    if not TASK_PREFIX.fullmatch(task_prefix):
        raise LifecycleError(
            "--task-prefix must be 1 to 16 uppercase letters, digits, or hyphens"
        )
    return "\n".join(
        [
            "schema_version: 2",
            "coordination_enabled: true",
            f"project_id: {project_id}",
            f"project_name: {json.dumps(project_name, ensure_ascii=True)}",
            f"task_prefix: {task_prefix}",
            "canonical_paths:",
            "  active: .codex/coordination/active",
            "  archive: .codex/coordination/archive",
            "access:",
            "  cross_project_task_access: false",
            "  cross_project_state_changes: false",
            "",
        ]
    )

def _init_operation(args: argparse.Namespace) -> dict[str, object]:
    root, coordination = _initialization_root(args.project_root)
    marker_path = coordination / "project.yaml"
    marker_text = _initial_marker(
        project_id=args.project_id or "",
        project_name=args.project_name or "",
        task_prefix=args.task_prefix or "",
    )
    agents_path = root / "AGENTS.md"
    ignore_path = root / ".gitignore"
    agents = _read_document(agents_path, required=False)
    ignore = _read_document(ignore_path, required=False)
    agents_document, agents_text = _add_exact_block(
        agents, agents_path, DISCOVERY_BLOCK, "Coordinator discovery"
    )
    ignore_document, ignore_text = _add_exact_block(
        ignore, ignore_path, IGNORE_BLOCK, "Coordinator ignore"
    )
    marker_document = Document(marker_path, b"", "", "\n", False, False)
    actions = [
        {"action": "create-enabled-schema-2-marker", "path": str(marker_path)},
        {"action": "create-empty-active-board", "path": str(coordination / "active")},
        {"action": "create-empty-cold-archive", "path": str(coordination / "archive")},
    ]
    changes = [(marker_document, marker_text)]
    if agents_text != agents_document.text:
        actions.append({"action": "add-discovery-block", "path": str(agents_path)})
        changes.append((agents_document, agents_text))
    if ignore_text != ignore_document.text:
        actions.append({"action": "add-ignore-block", "path": str(ignore_path)})
        changes.append((ignore_document, ignore_text))

    if args.apply:
        created_directories: list[Path] = []
        try:
            for path in (
                root / ".codex",
                coordination,
                coordination / "active",
                coordination / "archive",
            ):
                if not path.exists():
                    path.mkdir()
                    created_directories.append(path)
            _apply_documents(changes)
        except Exception:
            for path in reversed(created_directories):
                try:
                    path.rmdir()
                except OSError:
                    pass
            raise

    return {
        "status": "applied" if args.apply else "planned",
        "operation": "init",
        "projectId": args.project_id,
        "projectRoot": str(root),
        "actions": actions,
        "activeClaimsCreated": 0,
        "nativeTasksCreated": 0,
        "backgroundProcessesCreated": 0,
    }

def _apply_schema_one_migration(project: Project, marker_text: str) -> None:
    backup = project.coordination / MIGRATION_BACKUP_NAME
    if backup.exists():
        raise LifecycleError(f"schema-1 marker backup already exists: {backup}")
    board_paths = [project.coordination / "active", project.coordination / "archive"]
    created_directories: list[Path] = []
    backup_created = False
    marker_replaced = False
    for path in board_paths:
        if _is_linklike(path):
            raise LifecycleError(f"schema-2 board path must not be linked: {path}")
        if path.exists() and (not path.is_dir() or any(path.iterdir())):
            raise LifecycleError(
                f"schema-2 board path must be absent or empty before migration: {path}"
            )
    try:
        with backup.open("xb") as stream:
            stream.write(project.marker.raw)
            stream.flush()
            os.fsync(stream.fileno())
        backup_created = True
        for path in board_paths:
            if not path.exists():
                path.mkdir()
                created_directories.append(path)
        if project.marker.path.read_bytes() != project.marker.raw:
            raise LifecycleError("project marker changed during migration planning")
        if any(any(path.iterdir()) for path in board_paths):
            raise LifecycleError("schema-2 board changed during migration planning")
        _atomic_write(project.marker.path, project.marker.encode(marker_text))
        marker_replaced = True
    except Exception:
        if marker_replaced:
            _atomic_write(project.marker.path, project.marker.raw)
        for path in reversed(created_directories):
            try:
                path.rmdir()
            except OSError:
                pass
        if backup_created:
            backup.unlink(missing_ok=True)
        raise

def _has_coordinator_discovery(document: Document | None) -> bool:
    if document is None:
        return False
    return any(
        _block_for(document, block) in document.text
        for block in (DISCOVERY_BLOCK, *LEGACY_DISCOVERY_BLOCKS)
    ) or DISCOVERY_HEADING in document.text

def _migration_operation(project: Project, args: argparse.Namespace) -> dict[str, object]:
    if project.schema != 1:
        raise LifecycleError("only a schema-1 project can be migrated to schema 2")
    marker_text = _schema_two_marker(project)
    inventory = _legacy_inventory(project)
    agents = _read_document(project.root / "AGENTS.md", required=False)
    native_actions = _native_actions(project, activate=False)
    blockers: list[str] = []
    if project.enabled:
        blockers.append("deactivate the schema-1 project first")
    if _has_coordinator_discovery(agents):
        blockers.append("remove the legacy Coordinator discovery block by running deactivate")
    if args.confirm_project_id != project.project_id:
        blockers.append("confirm the exact project ID with --confirm-project-id")
    if not args.confirm_legacy_runtime_stopped:
        blockers.append(
            "confirm the legacy Coordinator heartbeat and optional Mission Control are stopped"
        )
    backup = project.coordination / MIGRATION_BACKUP_NAME
    if backup.exists():
        blockers.append(f"remove or reconcile the existing marker backup: {backup}")
    for path in (project.coordination / "active", project.coordination / "archive"):
        if _is_linklike(path) or (path.exists() and (not path.is_dir() or any(path.iterdir()))):
            blockers.append(f"schema-2 board path must be absent or empty: {path}")

    actions = [
        {
            "action": "preserve-schema-1-marker",
            "path": str(project.coordination / MIGRATION_BACKUP_NAME),
        },
        {"action": "write-disabled-schema-2-marker", "path": str(project.marker.path)},
        {
            "action": "create-empty-active-board",
            "path": str(project.coordination / "active"),
        },
        {
            "action": "create-empty-cold-archive",
            "path": str(project.coordination / "archive"),
        },
    ]
    if args.apply:
        if blockers:
            raise LifecycleError("migration is not ready: " + "; ".join(blockers))
        _apply_schema_one_migration(project, marker_text)

    return {
        "status": "applied" if args.apply else "planned",
        "operation": "migrate",
        "projectId": project.project_id,
        "projectRoot": str(project.root),
        "sourceSchema": 1,
        "targetSchema": 2,
        "targetEnabled": False,
        "readyToApply": not blockers,
        "blockers": blockers,
        "actions": actions,
        "requiredNativeActions": native_actions,
        "legacyState": inventory,
        "optionalObserverState": {
            "status": (
                "user-confirmed-stopped"
                if args.confirm_legacy_runtime_stopped
                else "not-inspected"
            ),
            "reason": "migration never reads private Codex state or external observer state",
        },
        "activeClaimsCreated": 0,
        "historyPreserved": True,
    }

def _native_actions(project: Project, *, activate: bool) -> list[dict[str, str]]:
    if project.schema == 2:
        return []
    coordinator = _coordinator_id(project)
    if activate:
        raise LifecycleError(
            "legacy schema 1 cannot be reactivated; migrate the disabled marker to schema 2"
        )
    actions = [{"action": "remove-repository-heartbeat", "targetThreadId": coordinator or "verify-current-coordinator"}]
    if coordinator:
        actions.extend(
            [
                {"action": "archive-coordinator-at-safe-boundary", "targetThreadId": coordinator},
                {"action": "unpin-coordinator", "targetThreadId": coordinator},
            ]
        )
    return actions

def project_operation(args: argparse.Namespace) -> dict[str, object]:
    if args.action == "init":
        return _init_operation(args)
    purge = args.action == "purge"
    project = _load_project(args.project_root, allow_resumed_purge=purge)
    if args.action == "migrate":
        return _migration_operation(project, args)
    agents_path = project.root / "AGENTS.md"
    ignore_path = project.root / ".gitignore"
    agents = _read_document(agents_path, required=False)
    ignore = _read_document(ignore_path, required=False)
    actions: list[dict[str, str]] = []
    changes: list[tuple[Document, str]] = []

    if args.action == "deactivate":
        if project.resumed_purge:
            raise LifecycleError("cannot deactivate a project while purge is incomplete")
        marker_text = _replace_marker_enabled(project.marker, False)
        if marker_text != project.marker.text:
            actions.append({"action": "set-marker-disabled", "path": str(project.marker.path)})
            changes.append((project.marker, marker_text))
        if agents is not None:
            agents_text = _remove_discovery_block(agents)
            if agents_text != agents.text:
                actions.append({"action": "remove-discovery-block", "path": str(agents.path)})
                changes.append((agents, agents_text))
        native = _native_actions(project, activate=False)

    elif args.action == "reactivate":
        if project.resumed_purge:
            raise LifecycleError("cannot reactivate a project while purge is incomplete")
        if project.schema != 2:
            raise LifecycleError(
                "legacy schema 1 cannot be reactivated; migrate the disabled marker to schema 2"
            )
        _validate_schema_two_reactivation(project.marker)
        marker_text = _replace_marker_enabled(project.marker, True)
        if marker_text != project.marker.text:
            actions.append({"action": "set-marker-enabled", "path": str(project.marker.path)})
            changes.append((project.marker, marker_text))
        agents_document, agents_text = _ensure_current_discovery(agents, agents_path)
        if agents_text != agents_document.text:
            actions.append({"action": "restore-discovery-block", "path": str(agents_path)})
            changes.append((agents_document, agents_text))
        native = _native_actions(project, activate=True)

    else:
        if args.confirm_project_id != project.project_id:
            raise LifecycleError("purge requires --confirm-project-id matching the validated marker")
        if agents is not None:
            agents_text = _remove_discovery_block(agents)
            if agents_text != agents.text:
                actions.append({"action": "remove-discovery-block", "path": str(agents.path)})
                changes.append((agents, agents_text))
        if ignore is not None:
            ignore_text = _remove_exact_block(ignore, IGNORE_BLOCK, "Coordinator ignore")
            if ignore_text != ignore.text:
                actions.append({"action": "remove-ignore-block", "path": str(ignore.path)})
                changes.append((ignore, ignore_text))
        actions.append({"action": "remove-coordination-state", "path": str(project.coordination)})
        native = _native_actions(project, activate=False)

    if args.apply:
        _apply_documents(changes)
        if purge:
            quarantine = project.root / ".codex" / QUARANTINE_NAME
            if not project.resumed_purge:
                os.replace(project.coordination, quarantine)
            shutil.rmtree(quarantine)

    return {
        "status": "applied" if args.apply else "planned",
        "operation": args.action,
        "projectId": project.project_id,
        "projectRoot": str(project.root),
        "actions": actions,
        "requiredNativeActions": native,
        "historyPreserved": not purge,
    }

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    project = subparsers.add_parser("project", help="plan or apply one project lifecycle operation")
    project.add_argument(
        "action", choices=("init", "deactivate", "migrate", "reactivate", "purge")
    )
    project.add_argument("--project-root", required=True)
    project.add_argument("--project-id", help="stable lowercase ID required for init")
    project.add_argument("--project-name", help="display name required for init")
    project.add_argument("--task-prefix", help="short uppercase prefix required for init")
    project.add_argument("--apply", action="store_true", help="apply the planned filesystem changes")
    project.add_argument(
        "--confirm-project-id",
        help="required for schema migration and destructive project purge",
    )
    project.add_argument(
        "--confirm-legacy-runtime-stopped",
        action="store_true",
        help="confirm old Coordinator heartbeat and optional Mission Control are stopped",
    )
    project.set_defaults(handler=project_operation)

    return parser

def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        result = args.handler(args)
    except (LifecycleError, OSError, subprocess.SubprocessError) as error:
        print(json.dumps({"status": "error", "error": str(error)}, ensure_ascii=False))
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

## File: `runtime/coordinator/session_start.py`

```python
#!/usr/bin/env python3
"""Emit a bounded task-board hint for an explicitly enabled repository."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

MARKER_LIMIT = 16_384
MARKER_SCHEMA_VERSION = "2"
PROJECT_ID = re.compile(r"[a-z0-9][a-z0-9-]{0,63}")

def _is_linklike(path: Path) -> bool:
    return path.is_symlink() or (
        hasattr(path, "is_junction") and path.exists() and path.is_junction()
    )

def _emit(context: str) -> None:
    json.dump(
        {
            "continue": True,
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": context,
            },
        },
        sys.stdout,
    )

def _read_marker(path: Path) -> str:
    with path.open("rb") as stream:
        raw = stream.read(MARKER_LIMIT + 1)
    if len(raw) > MARKER_LIMIT:
        raise ValueError("marker_too_large")
    try:
        return raw.decode("utf-8")
    except UnicodeError as error:
        raise ValueError("marker_invalid_utf8") from error

def _marker_value(text: str, key: str) -> str | None:
    matches = re.findall(
        rf"(?mi)^\s*{re.escape(key)}\s*:\s*([^#\r\n]+?)\s*(?:#.*)?$",
        text,
    )
    if len(matches) != 1:
        return None
    return matches[0].strip().strip("`\"'")

def _find_marker(cwd: Path) -> Path | None:
    current = cwd.resolve(strict=True)
    for index, root in enumerate((current, *current.parents)):
        if index >= 64:
            return None
        marker = root / ".codex" / "coordination" / "project.yaml"
        git_entry = root / ".git"
        if marker.is_file() and git_entry.exists():
            if (
                _is_linklike(root / ".codex")
                or _is_linklike(marker.parent)
                or _is_linklike(marker)
            ):
                raise ValueError("marker_link_unsupported")
            return marker
    return None

def _invalid(project_id: str, warning: str) -> None:
    _emit(
        "\n".join(
            [
                "Codex task-boundary board is enabled but incompatible.",
                f"project_id={project_id}",
                f"board_warning={warning}",
                "Do not change board claims. Continue only conflict-free read-only work, or ask the user to update or reinstall WinRecoveryProject DevSuite and migrate this project.",
            ]
        )
    )

def _payload() -> dict[str, Any]:
    value = json.load(sys.stdin)
    return value if isinstance(value, dict) else {}

def main() -> None:
    enabled_project = "UNKNOWN"
    marker_seen = False
    try:
        payload = _payload()
        cwd_value = payload.get("cwd")
        if not isinstance(cwd_value, str) or not 1 <= len(cwd_value) <= 4096:
            return
        cwd = Path(cwd_value)
        if not cwd.is_dir():
            return
        marker_path = _find_marker(cwd)
        if marker_path is None:
            return
        marker_seen = True

        text = _read_marker(marker_path)
        enabled = _marker_value(text, "coordination_enabled")
        if enabled is None:
            _invalid("UNKNOWN", "coordination_enabled_missing_or_duplicate")
            return
        if enabled.lower() == "false":
            return
        if enabled.lower() != "true":
            _invalid("UNKNOWN", "coordination_enabled_invalid")
            return

        project_id = _marker_value(text, "project_id") or "UNKNOWN"
        enabled_project = project_id if PROJECT_ID.fullmatch(project_id) else "UNKNOWN"
        checks = {
            "schema_version": MARKER_SCHEMA_VERSION,
            "cross_project_task_access": "false",
            "cross_project_state_changes": "false",
            "active": ".codex/coordination/active",
            "archive": ".codex/coordination/archive",
        }
        for key, expected in checks.items():
            if _marker_value(text, key) != expected:
                _invalid(enabled_project, f"{key}_incompatible")
                return
        if enabled_project == "UNKNOWN":
            _invalid(enabled_project, "project_id_missing_or_invalid")
            return

        _emit(
            "\n".join(
                [
                    "Codex task-boundary board is enabled for this repository.",
                    f"project_id={enabled_project}",
                    "Before substantial writes, load the installed devsuite-planning skill and list the bounded active claims from the primary worktree.",
                    "This hook grants no ownership, creates no task, launches no process, scans no history, and stores no transcript.",
                ]
            )
        )
    except Exception:
        if marker_seen:
            try:
                _invalid(enabled_project, "hook_validation_failed")
            except Exception:
                return

if __name__ == "__main__":
    main()
```

## File: `runtime/coordinator/state.py`

```python
#!/usr/bin/env python3
"""Read and update the local Codex task-boundary board.

The board stores one small JSON claim per active Codex task and generates a
human-readable active view from those claims. It never reads or stores task
transcripts, prompts, reasoning, tool output, or full-turn logs.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
import unicodedata
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

MARKER_SCHEMA_VERSION = 2
CLAIM_SCHEMA_VERSION = 1
DEFAULT_ACTIVE_LIMIT = 3
HARD_ACTIVE_LIMIT = 12
MAX_RECORD_BYTES = 4096
MAX_PATHS = 32
MAX_ACTIONS = 16
MAX_DEPENDENCIES = 16
CURRENT_VIEW_NAME = "CURRENT.md"
LEGACY_ADVISORY_ACTIONS = frozenset({"git-integration"})

PROJECT_ID = re.compile(r"[a-z0-9][a-z0-9-]{0,63}")
THREAD_ID = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
)
ACTION = re.compile(r"[a-z][a-z0-9-]{0,63}")
CLAIM_KEYS = {
    "schemaVersion",
    "projectId",
    "threadId",
    "title",
    "goal",
    "status",
    "revision",
    "createdAt",
    "updatedAt",
    "paths",
    "actions",
    "blockedBy",
    "limitOverride",
}

class BoardError(RuntimeError):
    """Raised when board state is invalid or a requested write is unsafe."""

class ClaimConflict(BoardError):
    """Raised when a proposed claim overlaps an exclusive active action."""

    def __init__(self, conflicts: list[dict[str, Any]]):
        super().__init__("The requested exclusive action overlaps an active task claim")
        self.conflicts = conflicts

def _is_linklike(path: Path) -> bool:
    return path.is_symlink() or (
        hasattr(path, "is_junction") and path.exists() and path.is_junction()
    )

def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    value: dict[str, Any] = {}
    for key, child in pairs:
        if key in value:
            raise BoardError(f"Duplicate JSON key: {key}")
        value[key] = child
    return value

def _read_json(path: Path, *, maximum: int = MAX_RECORD_BYTES) -> dict[str, Any]:
    try:
        raw = path.read_bytes()
    except OSError as error:
        raise BoardError(f"Cannot read board record {path.name}: {error}") from error
    if len(raw) > maximum:
        raise BoardError(f"Board record exceeds {maximum} bytes: {path.name}")
    try:
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_object)
    except (UnicodeError, json.JSONDecodeError) as error:
        raise BoardError(f"Cannot parse board record {path.name}: {error}") from error
    if not isinstance(value, dict):
        raise BoardError(f"Board record is not a JSON object: {path.name}")
    return value

def _marker_value(text: str, key: str) -> str:
    matches = re.findall(
        rf"(?mi)^\s*{re.escape(key)}\s*:\s*([^#\r\n]+?)\s*(?:#.*)?$",
        text,
    )
    if len(matches) != 1:
        raise BoardError(f"Marker must contain exactly one {key}")
    return matches[0].strip().strip("`\"'")

def _load_marker(project_root: Path, *, require_enabled: bool = True) -> dict[str, Any]:
    project_root = project_root.resolve(strict=True)
    marker_path = project_root / ".codex" / "coordination" / "project.yaml"
    coordination_path = marker_path.parent
    if _is_linklike(project_root / ".codex") or _is_linklike(coordination_path):
        raise BoardError("The coordination path must not be a symlink or junction")
    if _is_linklike(marker_path):
        raise BoardError("The project marker must not be a symlink or junction")
    try:
        raw = marker_path.read_bytes()
    except OSError as error:
        raise BoardError(f"Cannot read project marker: {error}") from error
    if len(raw) > 16_384:
        raise BoardError("Project marker exceeds 16384 bytes")
    try:
        text = raw.decode("utf-8")
    except UnicodeError as error:
        raise BoardError("Project marker is not valid UTF-8") from error

    schema = _marker_value(text, "schema_version")
    enabled = _marker_value(text, "coordination_enabled").lower()
    project_id = _marker_value(text, "project_id")
    if schema != str(MARKER_SCHEMA_VERSION):
        raise BoardError(
            f"Unsupported marker schema {schema!r}; expected {MARKER_SCHEMA_VERSION}. "
            "Keep Coordinator disabled and run the documented migration."
        )
    if enabled not in {"true", "false"}:
        raise BoardError("coordination_enabled must be true or false")
    if require_enabled and enabled != "true":
        raise BoardError("The task-boundary board is disabled for this project")
    if not PROJECT_ID.fullmatch(project_id):
        raise BoardError("project_id is invalid")
    if _marker_value(text, "cross_project_task_access") != "false":
        raise BoardError("cross_project_task_access must be false")
    if _marker_value(text, "cross_project_state_changes") != "false":
        raise BoardError("cross_project_state_changes must be false")
    if _marker_value(text, "active") != ".codex/coordination/active":
        raise BoardError("Marker active path is incompatible")
    if _marker_value(text, "archive") != ".codex/coordination/archive":
        raise BoardError("Marker archive path is incompatible")

    coordination_root = marker_path.parent.resolve(strict=False)
    active_root = (project_root / ".codex" / "coordination" / "active").resolve(
        strict=False
    )
    archive_root = (project_root / ".codex" / "coordination" / "archive").resolve(
        strict=False
    )
    for label, path in (("active", active_root), ("archive", archive_root)):
        try:
            path.relative_to(coordination_root)
        except ValueError as error:
            raise BoardError(f"Marker {label} path escapes the coordination root") from error
    for label, lexical in (
        ("active", coordination_path / "active"),
        ("archive", coordination_path / "archive"),
    ):
        if _is_linklike(lexical):
            raise BoardError(f"The {label} board path must not be a symlink or junction")

    return {
        "projectRoot": project_root,
        "coordinationRoot": coordination_root,
        "activeRoot": active_root,
        "archiveRoot": archive_root,
        "projectId": project_id,
        "enabled": enabled == "true",
    }

def _valid_text(value: Any, *, label: str, maximum: int) -> str:
    if not isinstance(value, str):
        raise BoardError(f"{label} must be text")
    value = value.strip()
    if not 1 <= len(value) <= maximum:
        raise BoardError(f"{label} must contain 1 to {maximum} characters")
    if any(
        character in {"\r", "\n", "\u2028", "\u2029"}
        or unicodedata.category(character) in {"Cc", "Cs"}
        for character in value
    ):
        raise BoardError(f"{label} contains unsupported control text")
    return value

def _timestamp(value: Any, *, label: str) -> str:
    value = _valid_text(value, label=label, maximum=40)
    candidate = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError as error:
        raise BoardError(f"{label} is not ISO-8601") from error
    if parsed.utcoffset() is None or "T" not in value:
        raise BoardError(f"{label} must include a timezone")
    return value

def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

def _normalize_path(value: str) -> str:
    value = _valid_text(value, label="claim path", maximum=240).replace("\\", "/")
    if value == ".":
        return value
    if any(character in value for character in "*?[]") or ":" in value:
        raise BoardError(f"Claim path must be a concrete repository-relative path: {value}")
    if any(part in {"", ".", ".."} for part in value.split("/")):
        raise BoardError(f"Claim path escapes or ambiguously names the repository: {value}")
    path = PurePosixPath(value)
    if path.is_absolute():
        raise BoardError(f"Claim path escapes or ambiguously names the repository: {value}")
    return path.as_posix()

def _deduplicate(values: list[str], *, label: str) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        key = value.casefold()
        if key in seen:
            raise BoardError(f"Duplicate {label}: {value}")
        seen.add(key)
        result.append(value)
    return result

def _string_items(value: Any, *, label: str, maximum: int) -> list[str]:
    if not isinstance(value, list) or len(value) > maximum:
        raise BoardError(f"Claim has too many {label}s")
    if any(not isinstance(item, str) for item in value):
        raise BoardError(f"Every claim {label} must be text")
    return value

def _validate_claim(value: dict[str, Any], *, project_id: str, filename: str) -> dict[str, Any]:
    unknown = set(value) - CLAIM_KEYS
    missing = CLAIM_KEYS - set(value)
    if unknown:
        raise BoardError(
            f"Claim {filename} contains unsupported fields: {', '.join(sorted(unknown))}"
        )
    if missing:
        raise BoardError(f"Claim {filename} is missing fields: {', '.join(sorted(missing))}")
    if value["schemaVersion"] != CLAIM_SCHEMA_VERSION:
        raise BoardError(f"Claim {filename} has an unsupported schema")
    if value["projectId"] != project_id:
        raise BoardError(f"Claim {filename} belongs to another project")
    thread_id = value["threadId"]
    if not isinstance(thread_id, str) or not THREAD_ID.fullmatch(thread_id):
        raise BoardError(f"Claim {filename} has an invalid threadId")
    if filename != f"{thread_id}.json":
        raise BoardError(f"Claim filename does not match its threadId: {filename}")
    title = _valid_text(value["title"], label="title", maximum=120)
    goal = _valid_text(value["goal"], label="goal", maximum=320)
    status = value["status"]
    if status not in {"active", "blocked"}:
        raise BoardError(f"Claim {filename} has an invalid status")
    revision = value["revision"]
    if not isinstance(revision, int) or isinstance(revision, bool) or revision < 1:
        raise BoardError(f"Claim {filename} has an invalid revision")
    created_at = _timestamp(value["createdAt"], label="createdAt")
    updated_at = _timestamp(value["updatedAt"], label="updatedAt")

    paths = _string_items(value["paths"], label="path", maximum=MAX_PATHS)
    actions = _string_items(value["actions"], label="action", maximum=MAX_ACTIONS)
    blocked_by = _string_items(
        value["blockedBy"], label="dependency", maximum=MAX_DEPENDENCIES
    )
    paths = _deduplicate([_normalize_path(item) for item in paths], label="path")
    actions = _deduplicate(actions, label="action")
    for action in actions:
        if not ACTION.fullmatch(action):
            raise BoardError(f"Claim {filename} has an invalid action: {action}")
    dependencies = _deduplicate(blocked_by, label="dependency")
    for dependency in dependencies:
        if not THREAD_ID.fullmatch(dependency) or dependency == thread_id:
            raise BoardError(f"Claim {filename} has an invalid dependency")
    if not paths and not actions:
        raise BoardError(f"Claim {filename} must own at least one path or action")
    if not isinstance(value["limitOverride"], bool):
        raise BoardError(f"Claim {filename} has an invalid limitOverride")
    return {
        **value,
        "title": title,
        "goal": goal,
        "createdAt": created_at,
        "updatedAt": updated_at,
        "paths": paths,
        "actions": actions,
        "blockedBy": dependencies,
    }

def _active_records(marker: dict[str, Any]) -> list[dict[str, Any]]:
    active_root: Path = marker["activeRoot"]
    if not active_root.exists():
        return []
    if not active_root.is_dir() or active_root.is_symlink():
        raise BoardError("The active board path is not a normal directory")
    paths = sorted(active_root.glob("*.json"), key=lambda item: item.name.casefold())
    if len(paths) > HARD_ACTIVE_LIMIT:
        raise BoardError(
            f"The active board has {len(paths)} records; hard limit is {HARD_ACTIVE_LIMIT}"
        )
    records: list[dict[str, Any]] = []
    for path in paths:
        if path.is_symlink() or not path.is_file():
            raise BoardError(f"Active claim is not a normal file: {path.name}")
        records.append(
            _validate_claim(
                _read_json(path), project_id=marker["projectId"], filename=path.name
            )
        )
    return records

def _path_overlap(left: str, right: str) -> bool:
    if left == "." or right == ".":
        return True
    left_parts = tuple(part.casefold() for part in PurePosixPath(left).parts)
    right_parts = tuple(part.casefold() for part in PurePosixPath(right).parts)
    common = min(len(left_parts), len(right_parts))
    return left_parts[:common] == right_parts[:common]

def _overlaps(
    candidate: dict[str, Any], records: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    overlaps: list[dict[str, Any]] = []
    for record in records:
        if record["threadId"] == candidate["threadId"]:
            continue
        path_pairs = sorted(
            {
                (left, right)
                for left in candidate["paths"]
                for right in record["paths"]
                if _path_overlap(left, right)
            }
        )
        action_overlap = sorted(
            set(candidate["actions"]).intersection(record["actions"])
        )
        if path_pairs or action_overlap:
            overlaps.append(
                {
                    "threadId": record["threadId"],
                    "title": record["title"],
                    "goal": record["goal"],
                    "pathOverlaps": [
                        {"requested": left, "owned": right}
                        for left, right in path_pairs
                    ],
                    "actionOverlaps": action_overlap,
                }
            )
    return overlaps

def _warnings(
    candidate: dict[str, Any], records: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Report possible shared-file work without turning task scope into a lock."""

    warnings: list[dict[str, Any]] = []
    for overlap in _overlaps(candidate, records):
        advisory_actions = [
            action
            for action in overlap["actionOverlaps"]
            if action in LEGACY_ADVISORY_ACTIONS
        ]
        if overlap["pathOverlaps"] or advisory_actions:
            warnings.append(
                {
                    **overlap,
                    "actionOverlaps": advisory_actions,
                }
            )
    return warnings

def _conflicts(candidate: dict[str, Any], records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return only conflicts that must have one active owner."""

    conflicts: list[dict[str, Any]] = []
    for overlap in _overlaps(candidate, records):
        blocking_actions = [
            action
            for action in overlap["actionOverlaps"]
            if action not in LEGACY_ADVISORY_ACTIONS
        ]
        if blocking_actions:
            conflicts.append(
                {
                    **overlap,
                    "pathOverlaps": [],
                    "actionOverlaps": blocking_actions,
                }
            )
    return conflicts

def _atomic_write(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if _is_linklike(path.parent):
        raise BoardError(
            f"Refusing to write through a linked board directory: {path.parent}"
        )
    temporary_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            dir=path.parent, prefix=f".{path.name}.", suffix=".tmp", delete=False
        ) as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
            temporary_name = stream.name
        os.replace(temporary_name, path)
    except OSError as error:
        if temporary_name:
            try:
                Path(temporary_name).unlink(missing_ok=True)
            except OSError:
                pass
        raise BoardError(f"Cannot write board record {path.name}: {error}") from error

@contextmanager
def _board_write_lock(marker: dict[str, Any]):
    """Serialize claim mutations without creating another state authority."""

    active_root: Path = marker["activeRoot"]
    active_root.mkdir(parents=True, exist_ok=True)
    if _is_linklike(active_root) or not active_root.is_dir():
        raise BoardError("The active board path is not a normal directory")
    lock_path = active_root / ".write.lock"
    if _is_linklike(lock_path):
        raise BoardError("The board lock must not be a symlink or junction")
    try:
        with lock_path.open("a+b") as stream:
            if os.name == "nt":
                import msvcrt

                stream.seek(0)
                msvcrt.locking(stream.fileno(), msvcrt.LK_LOCK, 1)
                try:
                    if os.fstat(stream.fileno()).st_size == 0:
                        stream.seek(0)
                        stream.write(b"\0")
                        stream.flush()
                        os.fsync(stream.fileno())
                    yield
                finally:
                    stream.seek(0)
                    msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl

                fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
                try:
                    yield
                finally:
                    fcntl.flock(stream.fileno(), fcntl.LOCK_UN)
    except OSError as error:
        raise BoardError(f"Cannot lock the active board: {error}") from error

def _encode(value: dict[str, Any]) -> bytes:
    payload = (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if len(payload) > MAX_RECORD_BYTES:
        raise BoardError(f"Board record exceeds {MAX_RECORD_BYTES} bytes")
    return payload

def _markdown_cell(value: str) -> str:
    """Keep validated claim text inert inside the generated Markdown table."""

    return (
        value.replace("\\", "\\\\")
        .replace("|", "\\|")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )

def _render_current_view(marker: dict[str, Any], records: list[dict[str, Any]]) -> bytes:
    """Render the small human view from canonical active claims only."""

    coordinators = [
        record for record in records if "goal-coordination" in record["actions"]
    ]
    lines = [
        "# Current coordinated work",
        "",
        "> Generated active-only view. Schema-2 JSON claims in `active/` are canonical.",
        "",
        f"Project: `{marker['projectId']}`",
        f"Active lanes: {len(records)}",
    ]
    if len(coordinators) == 1:
        coordinator = coordinators[0]
        lines.extend(
            (
                "Coordinator: "
                f"`{coordinator['threadId']}` — {_markdown_cell(coordinator['title'])}",
                f"Shared goal: {_markdown_cell(coordinator['goal'])}",
            )
        )
    lines.extend(
        (
            "",
            "| Task | Goal | Owns | Status | Depends on |",
            "| --- | --- | --- | --- | --- |",
        )
    )
    for record in records:
        task = f"{_markdown_cell(record['title'])} (`{record['threadId']}`)"
        ownership = [f"path: {path}" for path in record["paths"]]
        ownership.extend(f"action: {action}" for action in record["actions"])
        dependencies = record["blockedBy"] or ["—"]
        lines.append(
            "| "
            + " | ".join(
                (
                    task,
                    _markdown_cell(record["goal"]),
                    _markdown_cell(", ".join(ownership)),
                    record["status"],
                    _markdown_cell(", ".join(dependencies)),
                )
            )
            + " |"
        )
    if not records:
        lines.append("| — | — | — | — | — |")
    return ("\n".join(lines) + "\n").encode("utf-8")

def _refresh_current_view(
    marker: dict[str, Any], records: list[dict[str, Any]]
) -> bool:
    """Best-effort refresh; a derived view can never veto canonical state."""

    try:
        _atomic_write(
            marker["coordinationRoot"] / CURRENT_VIEW_NAME,
            _render_current_view(marker, records),
        )
    except (BoardError, OSError, UnicodeError):
        return False
    return True

def list_board(project_root: Path) -> dict[str, Any]:
    marker = _load_marker(project_root)
    records = _active_records(marker)
    conflicts: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    for record in records:
        conflicts.extend(
            {
                "requestedBy": record["threadId"],
                **conflict,
            }
            for conflict in _conflicts(record, records)
            if record["threadId"] < conflict["threadId"]
        )
        warnings.extend(
            {
                "requestedBy": record["threadId"],
                **warning,
            }
            for warning in _warnings(record, records)
            if record["threadId"] < warning["threadId"]
        )
    return {
        "status": "ok" if not conflicts else "conflict",
        "schemaVersion": MARKER_SCHEMA_VERSION,
        "projectId": marker["projectId"],
        "activeCount": len(records),
        "defaultLimit": DEFAULT_ACTIVE_LIMIT,
        "hardLimit": HARD_ACTIVE_LIMIT,
        "records": records,
        "conflicts": conflicts,
        "warnings": warnings,
    }

def claim_boundary(
    project_root: Path,
    *,
    thread_id: str,
    title: str,
    goal: str,
    paths: list[str],
    actions: list[str],
    blocked_by: list[str],
    status: str,
    expected_revision: int,
    user_approved_over_limit: bool,
) -> dict[str, Any]:
    marker = _load_marker(project_root)
    if not THREAD_ID.fullmatch(thread_id):
        raise BoardError("thread-id must be an exact native Codex thread UUID")
    with _board_write_lock(marker):
        return _claim_boundary_locked(
            marker,
            thread_id=thread_id,
            title=title,
            goal=goal,
            paths=paths,
            actions=actions,
            blocked_by=blocked_by,
            status=status,
            expected_revision=expected_revision,
            user_approved_over_limit=user_approved_over_limit,
        )

def _claim_boundary_locked(
    marker: dict[str, Any],
    *,
    thread_id: str,
    title: str,
    goal: str,
    paths: list[str],
    actions: list[str],
    blocked_by: list[str],
    status: str,
    expected_revision: int,
    user_approved_over_limit: bool,
) -> dict[str, Any]:
    records = _active_records(marker)
    existing = next((item for item in records if item["threadId"] == thread_id), None)
    current_revision = existing["revision"] if existing else 0
    if expected_revision != current_revision:
        raise BoardError(
            f"Claim revision changed: expected {expected_revision}, found {current_revision}"
        )
    if existing is None and len(records) >= HARD_ACTIVE_LIMIT:
        raise BoardError(f"The active-task hard limit is {HARD_ACTIVE_LIMIT}")
    if (
        existing is None
        and len(records) >= DEFAULT_ACTIVE_LIMIT
        and not user_approved_over_limit
    ):
        raise BoardError(
            f"The default active-task limit is {DEFAULT_ACTIVE_LIMIT}; "
            "a direct user decision is required before adding another task"
        )
    normalized_paths = _deduplicate(
        [
            _normalize_path(value)
            for value in _string_items(paths, label="path", maximum=MAX_PATHS)
        ],
        label="path",
    )
    normalized_actions = _deduplicate(
        _string_items(actions, label="action", maximum=MAX_ACTIONS), label="action"
    )
    for action in normalized_actions:
        if not ACTION.fullmatch(action):
            raise BoardError(f"Invalid action claim: {action}")
    dependencies = _deduplicate(
        _string_items(
            blocked_by, label="dependency", maximum=MAX_DEPENDENCIES
        ),
        label="dependency",
    )
    for dependency in dependencies:
        if not THREAD_ID.fullmatch(dependency) or dependency == thread_id:
            raise BoardError(f"Invalid dependency thread ID: {dependency}")
    if not normalized_paths and not normalized_actions:
        raise BoardError("A claim must include at least one path or exclusive action")
    if status not in {"active", "blocked"}:
        raise BoardError("status must be active or blocked")

    now = _now()
    candidate = {
        "schemaVersion": CLAIM_SCHEMA_VERSION,
        "projectId": marker["projectId"],
        "threadId": thread_id,
        "title": _valid_text(title, label="title", maximum=120),
        "goal": _valid_text(goal, label="goal", maximum=320),
        "status": status,
        "revision": current_revision + 1,
        "createdAt": existing["createdAt"] if existing else now,
        "updatedAt": now,
        "paths": normalized_paths,
        "actions": normalized_actions,
        "blockedBy": dependencies,
        "limitOverride": bool(
            (existing and existing["limitOverride"]) or user_approved_over_limit
        ),
    }
    candidate = _validate_claim(
        candidate, project_id=marker["projectId"], filename=f"{thread_id}.json"
    )
    conflicts = _conflicts(candidate, records)
    if conflicts:
        raise ClaimConflict(conflicts)

    target = marker["activeRoot"] / f"{thread_id}.json"
    if _is_linklike(target):
        raise BoardError("The task claim must not be a symlink or junction")
    previous = target.read_bytes() if target.is_file() else None
    _atomic_write(target, _encode(candidate))
    try:
        post_records = _active_records(marker)
        post_conflicts = _conflicts(candidate, post_records)
        if post_conflicts:
            if previous is None:
                target.unlink(missing_ok=True)
            else:
                _atomic_write(target, previous)
            raise ClaimConflict(post_conflicts)
    except (BoardError, OSError):
        if previous is None and target.exists():
            try:
                target.unlink()
            except OSError:
                pass
        elif previous is not None:
            try:
                _atomic_write(target, previous)
            except BoardError:
                pass
        raise

    _refresh_current_view(marker, post_records)

    return {
        "status": "claimed" if existing is None else "updated",
        "projectId": marker["projectId"],
        "record": candidate,
        "activeCount": len(post_records),
        "warnings": _warnings(candidate, post_records),
    }

def release_boundary(
    project_root: Path,
    *,
    thread_id: str,
    expected_revision: int,
    final_status: str,
) -> dict[str, Any]:
    marker = _load_marker(project_root)
    if not THREAD_ID.fullmatch(thread_id):
        raise BoardError("thread-id must be an exact native Codex thread UUID")
    with _board_write_lock(marker):
        return _release_boundary_locked(
            marker,
            thread_id=thread_id,
            expected_revision=expected_revision,
            final_status=final_status,
        )

def _release_boundary_locked(
    marker: dict[str, Any],
    *,
    thread_id: str,
    expected_revision: int,
    final_status: str,
) -> dict[str, Any]:
    records = _active_records(marker)
    record = next((item for item in records if item["threadId"] == thread_id), None)
    if record is None:
        raise BoardError("No active claim exists for this thread")
    if record["revision"] != expected_revision:
        raise BoardError(
            f"Claim revision changed: expected {expected_revision}, found {record['revision']}"
        )
    if final_status not in {
        "completed",
        "stopped",
        "superseded",
        "stale-owner-confirmed",
    }:
        raise BoardError("Invalid final status")

    closed_at = _now()
    receipt = {
        "schemaVersion": CLAIM_SCHEMA_VERSION,
        "projectId": marker["projectId"],
        "threadId": thread_id,
        "title": record["title"],
        "goal": record["goal"],
        "finalStatus": final_status,
        "lastRevision": record["revision"],
        "closedAt": closed_at,
    }
    archive_root: Path = marker["archiveRoot"]
    archive_root.mkdir(parents=True, exist_ok=True)
    if _is_linklike(archive_root):
        raise BoardError("The archive path must not be a symlink or junction")
    stamp = closed_at.replace(":", "").replace("-", "")
    payload = _encode(receipt)
    archive_path: Path | None = None
    try:
        for ordinal in range(10_000):
            suffix = "" if ordinal == 0 else f"-{ordinal}"
            candidate = archive_root / f"{thread_id}-{stamp}{suffix}.json"
            try:
                with candidate.open("xb") as stream:
                    stream.write(payload)
                    stream.flush()
                    os.fsync(stream.fileno())
                archive_path = candidate
                break
            except FileExistsError:
                continue
        if archive_path is None:
            raise OSError("Cannot allocate a unique compact receipt name")
        (marker["activeRoot"] / f"{thread_id}.json").unlink()
    except OSError as error:
        try:
            if archive_path is not None:
                archive_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise BoardError(f"Cannot release claim safely: {error}") from error
    _refresh_current_view(
        marker,
        [item for item in records if item["threadId"] != thread_id],
    )
    return {
        "status": "released",
        "projectId": marker["projectId"],
        "receipt": receipt,
    }

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)

    listing = commands.add_parser("list", help="read the bounded active board")
    listing.add_argument("--project-root", required=True, type=Path)

    claim = commands.add_parser("claim", help="create or update this task's claim")
    claim.add_argument("--project-root", required=True, type=Path)
    claim.add_argument("--thread-id", required=True)
    claim.add_argument("--title", required=True)
    claim.add_argument("--goal", required=True)
    claim.add_argument("--path", action="append", default=[])
    claim.add_argument("--action", action="append", default=[])
    claim.add_argument("--blocked-by", action="append", default=[])
    claim.add_argument("--status", choices=("active", "blocked"), default="active")
    claim.add_argument("--expected-revision", required=True, type=int)
    claim.add_argument("--user-approved-over-limit", action="store_true")

    release = commands.add_parser("release", help="move this task's claim to a cold receipt")
    release.add_argument("--project-root", required=True, type=Path)
    release.add_argument("--thread-id", required=True)
    release.add_argument("--expected-revision", required=True, type=int)
    release.add_argument(
        "--status",
        dest="final_status",
        required=True,
        choices=("completed", "stopped", "superseded", "stale-owner-confirmed"),
    )
    return parser

def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "list":
            report = list_board(args.project_root)
        elif args.command == "claim":
            report = claim_boundary(
                args.project_root,
                thread_id=args.thread_id,
                title=args.title,
                goal=args.goal,
                paths=args.path,
                actions=args.action,
                blocked_by=args.blocked_by,
                status=args.status,
                expected_revision=args.expected_revision,
                user_approved_over_limit=args.user_approved_over_limit,
            )
        else:
            report = release_boundary(
                args.project_root,
                thread_id=args.thread_id,
                expected_revision=args.expected_revision,
                final_status=args.final_status,
            )
    except ClaimConflict as error:
        print(
            json.dumps(
                {"status": "conflict", "error": str(error), "conflicts": error.conflicts},
                indent=2,
                ensure_ascii=False,
            )
        )
        return 2
    except (BoardError, OSError, UnicodeError) as error:
        print(json.dumps({"status": "error", "error": str(error)}, indent=2))
        return 1
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

## File: `runtime/coordinator/stop_guard.py`

```python
#!/usr/bin/env python3
"""Prompt one task to resolve its own active claim before its turn ends."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

PAYLOAD_LIMIT = 131_072
MARKER_LIMIT = 16_384
CLAIM_LIMIT = 4_096
MARKER_SCHEMA_VERSION = "2"
CLAIM_SCHEMA_VERSION = 1
PROJECT_ID = re.compile(r"[a-z0-9][a-z0-9-]{0,63}")
THREAD_ID = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
)
CLAIM_KEYS = {
    "schemaVersion",
    "projectId",
    "threadId",
    "title",
    "goal",
    "status",
    "revision",
    "createdAt",
    "updatedAt",
    "paths",
    "actions",
    "blockedBy",
    "limitOverride",
}

class GuardError(RuntimeError):
    """Raised when bounded local state cannot be trusted."""

def _is_linklike(path: Path) -> bool:
    return path.is_symlink() or (
        hasattr(path, "is_junction") and path.exists() and path.is_junction()
    )

def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise GuardError(f"duplicate JSON key: {key}")
        result[key] = value
    return result

def _bounded_bytes(path: Path, maximum: int) -> bytes:
    if _is_linklike(path) or not path.is_file():
        raise GuardError(f"unsupported file: {path.name}")
    with path.open("rb") as stream:
        raw = stream.read(maximum + 1)
    if len(raw) > maximum:
        raise GuardError(f"oversized file: {path.name}")
    return raw

def _payload() -> dict[str, Any]:
    raw = sys.stdin.buffer.read(PAYLOAD_LIMIT + 1)
    if len(raw) > PAYLOAD_LIMIT:
        return {}
    try:
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_object)
    except (UnicodeError, json.JSONDecodeError, GuardError):
        return {}
    return value if isinstance(value, dict) else {}

def _marker_value(text: str, key: str) -> str | None:
    matches = re.findall(
        rf"(?mi)^\s*{re.escape(key)}\s*:\s*([^#\r\n]+?)\s*(?:#.*)?$",
        text,
    )
    if len(matches) != 1:
        return None
    return matches[0].strip().strip("`\"'")

def _find_repository(cwd: Path) -> Path | None:
    current = cwd.resolve(strict=True)
    for index, root in enumerate((current, *current.parents)):
        if index >= 64:
            return None
        marker = root / ".codex" / "coordination" / "project.yaml"
        if marker.is_file() and (root / ".git").exists():
            if _is_linklike(root / ".codex") or _is_linklike(marker.parent):
                raise GuardError("linked marker path")
            return root
    return None

def _primary_worktree(root: Path) -> Path:
    git_entry = root / ".git"
    if git_entry.is_dir() and not _is_linklike(git_entry):
        return root
    raw = _bounded_bytes(git_entry, 4_096)
    try:
        text = raw.decode("utf-8").strip()
    except UnicodeError as error:
        raise GuardError("invalid linked-worktree metadata") from error
    match = re.fullmatch(r"gitdir:\s*(.+)", text, flags=re.IGNORECASE)
    if match is None:
        raise GuardError("invalid linked-worktree metadata")
    git_dir = Path(match.group(1).strip())
    if not git_dir.is_absolute():
        git_dir = git_entry.parent / git_dir
    git_dir = git_dir.resolve(strict=True)
    common_raw = _bounded_bytes(git_dir / "commondir", 4_096)
    try:
        common_value = common_raw.decode("utf-8").strip()
    except UnicodeError as error:
        raise GuardError("invalid common Git directory") from error
    common_dir = (git_dir / common_value).resolve(strict=True)
    if common_dir.name.casefold() != ".git" or _is_linklike(common_dir):
        raise GuardError("unsupported common Git directory")
    primary = common_dir.parent
    if not primary.is_dir():
        raise GuardError("missing primary worktree")
    return primary

def _enabled_marker(root: Path) -> str | None:
    marker = root / ".codex" / "coordination" / "project.yaml"
    if _is_linklike(root / ".codex") or _is_linklike(marker.parent):
        raise GuardError("linked marker path")
    try:
        text = _bounded_bytes(marker, MARKER_LIMIT).decode("utf-8")
    except UnicodeError as error:
        raise GuardError("invalid marker encoding") from error
    enabled = _marker_value(text, "coordination_enabled")
    if enabled is None or enabled.casefold() == "false":
        return None
    if enabled.casefold() != "true":
        raise GuardError("invalid enablement")
    project_id = _marker_value(text, "project_id")
    checks = {
        "schema_version": MARKER_SCHEMA_VERSION,
        "cross_project_task_access": "false",
        "cross_project_state_changes": "false",
        "active": ".codex/coordination/active",
        "archive": ".codex/coordination/archive",
    }
    if not isinstance(project_id, str) or PROJECT_ID.fullmatch(project_id) is None:
        raise GuardError("invalid project identity")
    if any(_marker_value(text, key) != expected for key, expected in checks.items()):
        raise GuardError("incompatible marker")
    return project_id

def _own_claim(root: Path, project_id: str, thread_id: str) -> dict[str, Any] | None:
    active_root = root / ".codex" / "coordination" / "active"
    if not active_root.exists():
        return None
    if not active_root.is_dir() or _is_linklike(active_root):
        raise GuardError("unsupported active board")
    path = active_root / f"{thread_id}.json"
    if not path.exists():
        return None
    raw = _bounded_bytes(path, CLAIM_LIMIT)
    try:
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_object)
    except (UnicodeError, json.JSONDecodeError) as error:
        raise GuardError("invalid own claim") from error
    if not isinstance(value, dict) or set(value) != CLAIM_KEYS:
        raise GuardError("incompatible own claim")
    if (
        value.get("schemaVersion") != CLAIM_SCHEMA_VERSION
        or value.get("projectId") != project_id
        or value.get("threadId") != thread_id
        or value.get("status") not in {"active", "blocked"}
        or not isinstance(value.get("revision"), int)
        or isinstance(value.get("revision"), bool)
        or value["revision"] < 1
    ):
        raise GuardError("incompatible own claim")
    return value

def _block(project_id: str, revision: int) -> None:
    reason = " ".join(
        [
            f"Resolve your own Codex task-boundary claim for project {project_id} before ending this turn.",
            f"The exact claim is still active at revision {revision}.",
            "If this task is complete, stopped, or superseded, use the bundled runtime/coordinator/state.py release command with your exact session id and revision.",
            "If the work genuinely continues across turns, keep or update only your own claim and say briefly that ownership remains active.",
            "Do not inspect other tasks, send coordination messages, create a task, or read transcripts for this check.",
        ]
    )
    json.dump({"decision": "block", "reason": reason}, sys.stdout)

def main() -> None:
    try:
        payload = _payload()
        if payload.get("hook_event_name") != "Stop":
            return
        thread_id = payload.get("session_id")
        cwd_value = payload.get("cwd")
        if (
            not isinstance(thread_id, str)
            or THREAD_ID.fullmatch(thread_id) is None
            or not isinstance(cwd_value, str)
            or not 1 <= len(cwd_value) <= 4_096
        ):
            return
        cwd = Path(cwd_value)
        if not cwd.is_dir():
            return
        discovered = _find_repository(cwd)
        if discovered is None:
            return
        discovered_project = _enabled_marker(discovered)
        if discovered_project is None:
            return
        primary = _primary_worktree(discovered)
        project_id = _enabled_marker(primary)
        if project_id is None or project_id != discovered_project:
            return
        claim = _own_claim(primary, project_id, thread_id)
        if claim is None or claim["status"] != "active":
            return
        if payload.get("stop_hook_active") is True:
            return
        _block(project_id, claim["revision"])
    except Exception:
        # Lifecycle advice must never wedge a Codex turn.
        return

if __name__ == "__main__":
    main()
```

## File: `runtime/evidence.py`

```python
"""Original DevSuite evidence utilities; no scanner, network or provider emulation."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

class ContractError(ValueError):
    """An input is unsafe, incomplete or makes an unsupported completion claim."""

def _unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ContractError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result

def read_json(path: Path):
    if path.stat().st_size > 4_000_000:
        raise ContractError("Input JSON exceeds 4 MB")
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_unique,
                      parse_constant=lambda value: (_ for _ in ()).throw(
                          ContractError(f"Invalid JSON number: {value}")))

def contained(root: Path, relative: str, *, exists=False) -> Path:
    """Reject lexical escapes, absolute paths and all link/junction components."""
    if not isinstance(relative, str) or not relative or "\\" in relative:
        raise ContractError("Use a nonempty forward-slash relative path")
    if any(part in {"", ".", ".."} for part in relative.split("/")):
        raise ContractError("Path contains an empty or traversal component")
    if ":" in relative or relative.startswith("/"):
        raise ContractError("Absolute paths and drive/stream syntax are forbidden")
    root = root.resolve(strict=True)
    target = root
    for part in relative.split("/"):
        target = target / part
        if target.is_symlink() or (hasattr(target, "is_junction") and target.is_junction()):
            raise ContractError("Linked paths are forbidden")
    try:
        target.resolve(strict=exists).relative_to(root)
    except (ValueError, OSError) as error:
        raise ContractError("Path is missing or escapes its root") from error
    return target

def _text(value, label):
    if not isinstance(value, str) or not value.strip() or len(value) > 20_000:
        raise ContractError(f"Missing or oversized text: {label}")
    if any(ord(c) < 32 and c not in "\n\t" for c in value):
        raise ContractError(f"Control text in {label}")
    return value

def provider_check(inventory: dict, capability: str, catalog: dict) -> dict:
    if not isinstance(inventory, dict):
        raise ContractError("Provider inventory must be an object")
    access_map = inventory.get("access", {})
    capability_tools = inventory.get("capabilityTools", {})
    if not isinstance(access_map, dict):
        raise ContractError("Inventory access must be an object")
    if not isinstance(capability_tools, dict):
        raise ContractError("Inventory capabilityTools must be an object")
    if capability not in catalog:
        raise ContractError(f"Unknown provider capability: {capability}")
    names = inventory.get("tools")
    if not isinstance(names, list) or any(not isinstance(n, str) for n in names):
        raise ContractError("Inventory tools must be an array of observed exact names")
    requirement = catalog[capability]
    access = access_map.get(capability, {})
    if not isinstance(access, dict):
        raise ContractError("Access observation must be an object")
    access_status = access.get("status", "UNKNOWN")
    if access.get("stale") is True:
        access_status = "UNKNOWN"
    if access_status not in {"UNKNOWN", "GRANTED", "DENIED", "INSUFFICIENT", "PENDING"}:
        raise ContractError("Unknown observed access status")
    def result(missing):
        # Names are a discovery fact, never backend readiness. Even observed TAC
        # access cannot establish user consent, quota or successful execution.
        status = "UNAVAILABLE" if missing else "ACCESS_INSUFFICIENT" if access_status in {"DENIED", "INSUFFICIENT", "PENDING"} else "NOT_VERIFIED"
        return {"capability": capability, "status": status, "toolNamesPresent": not missing,
                "missingToolGroups": missing, "executionVerified": False,
                "authenticationVerified": False, "costVerified": False,
                "authorizationVerified": False, "canExecute": False,
                "observedAccessStatus": access_status, "provider": requirement["provider"]}
    if requirement.get("discoveryRequired"):
        selected = capability_tools.get(capability, [])
        if not isinstance(selected, list) or any(not isinstance(n, str) for n in selected):
            raise ContractError("Discovered capability tool mapping must be a text array")
        missing = [] if selected and all(n in names for n in selected) else [["Discover actual provider tool schema for " + capability]]
        report = result(missing)
        report["schemaDiscoveryRequired"] = True
        return report
    groups = requirement["requiredToolGroups"]
    missing = [group for group in groups if not any(n in names for n in group)]
    return result(missing)

def conversion_plan(request: dict) -> dict:
    if not isinstance(request, dict):
        raise ContractError("Conversion request must be an object")
    sources = request.get("sources")
    if not isinstance(sources, list) or not sources or any(not isinstance(s, str) or not s.strip() for s in sources):
        raise ContractError("sources must contain authorized file references")
    target = request.get("targetFormat")
    if not isinstance(target, str) or not re.fullmatch(r"[a-z0-9]{1,16}", target):
        raise ContractError("targetFormat must be a lowercase format identifier")
    route = request.get("route")
    if route not in {"local", "cloudconvert"}:
        raise ContractError("route must be local or cloudconvert")
    if request.get("estimatedCost") != 0 or isinstance(request.get("estimatedCost"), bool):
        raise ContractError("0 kr budget requires an observed zero cost")
    if route == "cloudconvert":
        if request.get("freeQuotaConfirmed") is not True:
            raise ContractError("Verify included free quota before a remote conversion")
        if request.get("uploadAuthorized") is not True:
            raise ContractError("Remote transfer needs existing user authorization")
    if not request.get("destination") or not isinstance(request["destination"], str):
        raise ContractError("An explicit output destination is required")
    if request.get("overwrite", False) is not False:
        raise ContractError("This planning helper preserves existing outputs")
    return {"kind": "devsuite-conversion-plan", "executed": False,
            "status": "PLANNED", "route": route, "sources": sources,
            "targetFormat": target, "destination": request["destination"],
            "settings": request.get("settings", {}), "overwrite": False,
            "budgetKr": 0, "quotaVerifiedByHelper": False,
            "next": "Discover actual converter schema, execute only if authorized, inspect output"}

def validate_assessment(data: dict, source_root: Path) -> dict:
    """Validate an independently authored assessment without claiming source review."""
    if not isinstance(data, dict) or data.get("schema") != "devsuite-assessment-v1":
        raise ContractError("Expected separate devsuite-assessment-v1 schema")
    if data.get("mode") not in {"standard", "diff", "triage", "validation", "verify-fix"}:
        raise ContractError("Unknown mode; Deep requires the real provider")
    for field in ("target", "revision", "summary"):
        _text(data.get(field), field)
    if data.get("status") not in {"PASS", "PARTIAL", "FAIL", "INCONCLUSIVE"}:
        raise ContractError("Unknown assessment status")
    coverage = data.get("coverage")
    if not isinstance(coverage, dict):
        raise ContractError("Coverage must be explicit")
    for key in ("reviewed", "excluded", "deferred"):
        if not isinstance(coverage.get(key), list) or any(not isinstance(v, str) for v in coverage[key]):
            raise ContractError(f"Coverage {key} must be an explicit text array")
    for path in coverage["reviewed"]:
        if not contained(source_root, path, exists=True).is_file():
            raise ContractError(f"Reviewed path is not a file: {path}")
    if len(set(coverage["reviewed"])) != len(coverage["reviewed"]):
        raise ContractError("Reviewed paths must be deduplicated")
    limitations = data.get("limitations")
    if not isinstance(limitations, list) or any(not isinstance(v, str) for v in limitations):
        raise ContractError("Limitations must be an explicit text array")
    if data["status"] == "PASS" and (coverage["deferred"] or limitations):
        raise ContractError("PASS cannot hide deferred review or limitations")
    if data["status"] == "PASS" and not coverage["reviewed"]:
        raise ContractError("PASS requires nonempty reviewed coverage")
    findings = data.get("findings")
    if not isinstance(findings, list):
        raise ContractError("Findings must be an explicit array")
    ids = set()
    for finding in findings:
        if not isinstance(finding, dict):
            raise ContractError("Finding must be an object")
        for field in ("id", "title", "rootCause", "invariant", "attackerControl", "attackPath", "impact", "counterevidence", "remediation"):
            _text(finding.get(field), field)
        if finding["id"] in ids:
            raise ContractError("Finding IDs must be unique")
        ids.add(finding["id"])
        if finding.get("severity") not in {"critical", "high", "medium", "low", "informational"}:
            raise ContractError("Invalid severity")
        if finding.get("confidence") not in {"high", "medium", "low"}:
            raise ContractError("Invalid confidence")
        if finding.get("validation") not in {"demonstrated", "static-evidence", "inconclusive", "disproven", "already-safe"}:
            raise ContractError("Invalid validation state")
        location = finding.get("location", {})
        path = contained(source_root, location.get("path"), exists=True)
        line = location.get("line")
        if isinstance(line, bool) or not isinstance(line, int) or line < 1:
            raise ContractError("Finding line must be a positive integer")
        if line > len(path.read_text(encoding="utf-8").splitlines()):
            raise ContractError("Finding line is outside the actual source file")
        if location["path"] not in coverage["reviewed"]:
            raise ContractError("Finding location must be in reviewed coverage")
    if data["status"] == "PASS" and any(f["validation"] not in {"disproven", "already-safe"} for f in findings):
        raise ContractError("PASS cannot contain unresolved reportable findings")
    return data

def _md(value):
    # Make imported source values inert, including HTML and link/image markup.
    text = str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    for char in "\\`*_{}[]()!|#":
        text = text.replace(char, "\\" + char)
    return text.replace("\n", " ")

def write_assessment(data: dict, source_root: Path, output: Path) -> dict:
    validate_assessment(data, source_root)
    if output.exists():
        raise ContractError("Assessment output must be a new directory")
    # Refuse symlink/junction ancestors before creating a new output.
    for parent in (output, *output.parents):
        if parent.is_symlink() or (hasattr(parent, "is_junction") and parent.is_junction()):
            raise ContractError("Linked output ancestors are forbidden")
    lines = ["# DevSuite source assessment", "", "Independent local assessment; not a sealed Codex Security workbench scan.", "",
             f"Status: **{data['status']}**", f"Target: {_md(data['target'])}",
             f"Revision: {_md(data['revision'])}", "", _md(data["summary"]), ""]
    for finding in data["findings"]:
        lines.extend([f"## {_md(finding['id'])}: {_md(finding['title'])}", "",
                      f"Severity: {finding['severity']}; confidence: {finding['confidence']}; validation: {finding['validation']}",
                      f"Location: {_md(finding['location']['path'])}:{finding['location']['line']}", ""])
        for field in ("rootCause", "invariant", "attackerControl", "attackPath", "impact", "counterevidence", "remediation"):
            lines.append(f"{field}: {_md(finding[field])}")
        lines.append("")
    for label, values in list(data["coverage"].items()) + [("limitations", data["limitations"])]:
        lines.extend([f"## {_md(label)}", ""] + (["- " + _md(v) for v in values] or ["None recorded."]) + [""])
    if not data["findings"]:
        lines.append("No findings recorded within the stated scope; this is not proof of no vulnerabilities.")
    output.mkdir(parents=True, exist_ok=False)
    (output / "assessment.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    hashes = {name: hashlib.sha256((output / name).read_bytes()).hexdigest() for name in ("assessment.json", "report.md")}
    return {"status": "WRITTEN", "kind": "devsuite-local-evidence", "providerSealed": False,
            "output": str(output.resolve()), "sha256": hashes}
```

## File: `runtime/execution.py`

```python
"""Owned process/task planning; never launches commands or remote tasks."""
from __future__ import annotations

from pathlib import PurePosixPath, PureWindowsPath
from runtime.evidence import ContractError

def _text(value, label):
    if not isinstance(value, str) or not value.strip() or len(value) > 20000:
        raise ContractError(f"Invalid {label}")
    if any(ord(c) < 32 for c in value):
        raise ContractError(f"Control character in {label}")
    return value

def process_plan(request):
    if not isinstance(request, dict):
        raise ContractError("Process request must be an object")
    platform = request.get('platform')
    if platform not in {'windows', 'linux', 'macos'}:
        raise ContractError("platform must be windows, linux or macos")
    argv = request.get('argv')
    if not isinstance(argv, list) or not argv:
        raise ContractError("argv must be a nonempty array; shell strings are not accepted")
    for arg in argv:
        if not isinstance(arg, str) or '\x00' in arg or len(arg) > 20000:
            raise ContractError("Invalid argv element")
    _text(argv[0], 'executable')
    cwd = _text(request.get('cwd'), 'cwd')
    path = PureWindowsPath(cwd) if platform == 'windows' else PurePosixPath(cwd)
    if not path.is_absolute():
        raise ContractError("cwd must be absolute for the selected machine")
    if request.get('interactive') is not False or request.get('finite') is not True:
        raise ContractError("Only explicitly finite, noninteractive workloads are supported")
    lifetime = request.get('lifetime', 'host-session')
    if lifetime not in {'host-session', 'detached'}:
        raise ContractError("Unknown process lifetime")
    windows = platform == 'windows'
    backend = 'host-exec-session' if lifetime == 'host-session' else 'windows-native-detached' if windows else 'existing-cpj-posix'
    return {'status': 'PLANNED', 'backend': backend, 'platform': platform,
            'argv': argv, 'cwd': cwd, 'executed': False, 'executionAuthorized': False,
            'requiresReviewedForegroundPayload': True,
            'resume': 'reuse exact returned host session' if lifetime == 'host-session' else 'verify existing process/job identity and result before any launch',
            'cancellation': 'exact owned handle/identity only; critical jobs require explicit cancellation authority',
            'survivesReboot': False, 'automaticCompletionDeliveryVerified': False,
            'durabilityVerified': False,
            'limitation': 'Windows CPJ POSIX controller is unsupported; native detached work needs a reviewed result/exit receipt' if windows else 'POSIX detached lifecycle requires the existing verified CPJ controller; a plan is not a job'}

def select_environment(inventory, requested_name=None, *, list_only=False):
    """Select only actual connected executors or runnable managed configurations.

    A paginated snapshot must be complete. Identifiers are returned as data, never
    synthesized. canRun is a provider capability, not permission or free quota.
    """
    if not isinstance(inventory, dict) or not isinstance(inventory.get('data'), list):
        raise ContractError("Environment inventory must contain a data array")
    if inventory.get('nextCursor') is not None and not isinstance(inventory['nextCursor'], str):
        raise ContractError("Environment cursor must be text or null")
    if inventory.get('nextCursor'):
        return {'status': 'INCOMPLETE', 'reason': 'Read remaining environment pages first', 'canExecute': False}
    if requested_name is not None:
        _text(requested_name, 'requested environment name')
    environments = {}
    for entry in inventory['data']:
        if not isinstance(entry, dict):
            raise ContractError("Environment entry must be an object")
        if 'displayName' in entry and not isinstance(entry['displayName'], str):
            raise ContractError("Environment display name must be text")
        executor = entry.get('environmentId')
        configuration = entry.get('environmentConfigId')
        has_executor = isinstance(executor, str) and bool(executor.strip())
        connected = has_executor and entry.get('status') == 'connected'
        if connected:
            kind, key, runnable = 'connected-executor', 'environmentId', True
        elif isinstance(configuration, str) and configuration.strip():
            kind, key = 'managed-configuration', 'environmentConfigId'
            runnable = entry.get('status') == 'ready' and entry.get('canRun') is True
        elif has_executor:
            kind, key, runnable = 'connected-executor', 'environmentId', False
        else:
            continue
        target = (key, entry[key])
        row = {'kind': kind, key: entry[key], 'displayName': entry.get('displayName'),
               'status': entry.get('status'), 'providerRunnable': runnable,
               'requiresRemoteAbsoluteCwd': kind == 'connected-executor', 'costVerified': False}
        if target in environments and environments[target] != row:
            raise ContractError("Conflicting observations for the same environment ID")
        environments[target] = row
    observed = list(environments.values())
    if requested_name is not None:
        observed = [row for row in observed if (row['displayName'] or '').casefold() == requested_name.casefold()]
        if len(observed) > 1:
            raise ContractError("Environment name is ambiguous; use a verified exact target")
    if list_only:
        return {'status': 'LISTED', 'environments': observed, 'canExecute': False,
                'taskCreated': False, 'executionAuthorized': False}
    selected = [entry for entry in observed if entry['providerRunnable']]
    if not selected:
        return {'status': 'UNAVAILABLE', 'reason': 'No matching connected executor or ready runnable configuration', 'canExecute': False}
    if len(selected) > 1:
        return {'status': 'AMBIGUOUS', 'environments': selected, 'canExecute': False,
                'taskCreated': False, 'executionAuthorized': False,
                'reason': 'Select the intended environment by its verified name'}
    return {'status': 'SELECTED', 'environment': selected[0], 'canExecute': False,
            'taskCreated': False, 'executionAuthorized': False,
            'requiresExplicitTaskRequest': True,
            'requiresIncludedZeroCostVerification': True}
```

## File: `runtime/routing.py`

```python
"""Pure workflow selection shared by DevSuite host packages."""
from __future__ import annotations

import re

LOCAL_WORKFLOWS = (
    "devsuite",
    "devsuite-planning",
    "devsuite-implement",
    "devsuite-debug",
    "devsuite-review",
    "devsuite-test",
    "devsuite-handoff",
)

# Specific review intents shared with Plugin-Skill-Studio studio-review; checked before broad phases.
REVIEW_MODES = (
    ("verify", r"about to claim|verification commands|success claims|bounded static-page capture|audits finished work|"
               r"completion claim|double-check that|unsupported claims"),
    ("receive", r"review feedback|pushes back|feedback is unclear|receiving code review"),
    ("request", r"dispatch(?:es)? a bounded reviewer|read-only review before merge|request(?:ing)? (?:a )?code review"),
    ("decide", r"review decision|require human attention|minimal, targeted or deep"),
    ("code", r"review changed code|reviewing a branch|code review|review this (?:diff|branch|pr|change)|authoring new code or diagnosing"),
)
# Specific planning intents shared with Plugin-Skill-Studio studio-plan.
PLAN_MODES = (
    ("goal", r"/goal|goal prompt|unattended execution|overnight autonomous|autonomous goal contract|agentic mission"),
    ("map", r"decision tickets|multi-session|map out this massive|small, well-scoped features"),
    ("questions", r"questionnaire|stakeholder|what should i ask them|answer the questions themselves"),
    ("tickets", r"tracer-bullet|break this into tickets|tracker issues|initial requirements gathering"),
    ("spec", r"technical spec|write a spec|fuzzy and ungrilled"),
    ("interview", r"grill|interview the user|poke holes|domain modeling with doc generation|documentation trail is needed|immediate implementation"),
    ("discover", r"explores user intent|starting a new feature|whose requirements or design|trivial single-file changes"),
    ("plan", r"implementation plans?\b|needs planning"),
)
QUALITY_GATE = r"\b(lint|linter|lintkontrol|kvalitetskontrol|megalinter|quality.gate|typecheck|format.check|lint/type/build)\b"

TASK_TARGET = r"(?:codex[\s-]+tasks?|remote(?:[\s-]+codex)?[\s-]+tasks?|codex[\s-]+opgaver?)"
JOB_TARGET = r"(?:process[\s-]+jobs?|background[\s-]+(?:jobs?|process(?:es)?)|baggrundsjob(?:s)?|baggrundsproces(?:ser)?|procesjob(?:s)?)"
DETERMINERS = r"(?:(?:a|an|the|one|my|new|existing|durable|en|et|den|det|min|mit|ny|nyt|eksisterende|varig)\s+){0,4}"
POLITE_PREFIX = r"(?:(?:please|kindly|venligst)\s+|(?:can|could|would|will)\s+you\s+|(?:kan|vil)\s+du\s+)?"
LAUNCH_VERB = r"(?:start|create|launch|run|queue|opret|kør|igangsæt)"
TARGET_END = r"(?=\s+(?:to|that|which|for|with|in|on|from|using|via|til|som|der|med|på|i|fra)\b|[.!?]|$)"

def execution_intent(text: str) -> tuple[str | None, str]:
    """Separate an explicit lifecycle request from work on the integration's code.

    Workload verbs after a launch request do not change its owner. Negated target
    clauses supply no lifecycle intent; a following review/test clause still can.
    This is a route suggestion only, never execution authority.
    """
    clauses = re.split(r"[;,.\n]+|\b(?:but|men|instead|i stedet)\b", text)
    active = []
    for clause in clauses:
        target = re.search(TASK_TARGET + "|" + JOB_TARGET, clause)
        if target and re.search(r"\b(?:do\s+not|don['’]t|never|must\s+not|ikke|aldrig|undlad)\b", clause[:target.start()]):
            continue
        active.append(clause.strip())
    for clause in active:
        if re.match(POLITE_PREFIX + LAUNCH_VERB + r"\s+" + DETERMINERS + TASK_TARGET + TARGET_END, clause):
            return "devsuite-tasks", "; ".join(active)
        if re.match(POLITE_PREFIX + r"(?:use|brug)\s+" + DETERMINERS + TASK_TARGET + r"\s+(?:to|til(?:\s+at)?)\b", clause):
            return "devsuite-tasks", "; ".join(active)
        if re.match(POLITE_PREFIX + r"(?:delegate|delegér|deleger)\b.{1,500}\b(?:to|til)\s+" + DETERMINERS + TASK_TARGET + TARGET_END, clause):
            return "devsuite-tasks", "; ".join(active)
        if re.match(POLITE_PREFIX + LAUNCH_VERB + r"\s+" + DETERMINERS + JOB_TARGET + TARGET_END, clause):
            return "devsuite-jobs", "; ".join(active)
        run = POLITE_PREFIX + r"(?:run|launch|start|execute|kør|afvikl)\b.{1,500}"
        if re.match(run + r"\b(?:as|in|som|i)\s+" + DETERMINERS + JOB_TARGET + TARGET_END, clause):
            return "devsuite-jobs", "; ".join(active)
        if re.match(run + r"\b(?:in(?:\s+the)?\s+background|i\s+baggrunden)\b", clause):
            return "devsuite-jobs", "; ".join(active)
    return None, "; ".join(active)

def route(request: str) -> dict:
    text = request.casefold()
    # More specific intent wins; route suggestions never grant execution authority.
    explicit_owner, text = execution_intent(text)
    operation = bool(re.search(r"\b(fix|implement|build|debug|review|audit|test|tests|testing|refactor|ret|byg|gennemgå)\b", text))
    task_target = bool(re.search(TASK_TARGET + r"|registered (?:codex )?environment|registrerede? (?:codex.)?miljø", text))
    cloud_config_query = re.search(
        r"\b(?:list|show|vis|oplist|find)\s+(?:(?:my|mine|the|de|me|mig|all|alle|available|tilgængelige|saved|gemte)\s+){0,3}"
        r"(?:codex[\s-]+)?cloud(?:[- ]?(?:miljøer|konfigurationer)|[\s-]+(?:environments|configurations))\b", text
    )
    job_target = bool(re.search(JOB_TARGET, text))
    review_mode = next((name for name, pattern in REVIEW_MODES if re.search(pattern, text)), None)
    # Planning boundaries ("Do NOT use for ...") still name planning intent, so match before negation stripping.
    plan_mode = next((name for name, pattern in PLAN_MODES if re.search(pattern, request.casefold())), None)
    mode = None
    if explicit_owner:
        skill = explicit_owner
    elif review_mode:
        skill, mode = "devsuite-review", review_mode
    elif plan_mode:
        skill, mode = "devsuite-planning", plan_mode
    elif (task_target or cloud_config_query) and not operation:
        skill = "devsuite-tasks"
    elif job_target and not operation:
        skill = "devsuite-jobs"
    elif re.search(r"\b(convert|conversion|cloudconvert|transcode)\b", text):
        skill = "devsuite-convert"
    elif re.search(r"\b(resume|handoff|hand.?off|interrupted)\b", text):
        skill = "devsuite-handoff"
    elif re.search(r"security|vulnerab|threat|attack.path|finding|hardening|security\.md", text):
        skill = "devsuite-security-fix" if re.search(r"\b(fix|patch|remediat\w*|hardening|writeup|disclos\w*|track|policy)\b", text) else "devsuite-security-assess"
    elif re.search(r"\b(cloud|desktop|docker|vpn|network|environment|package install|preview)\b", text):
        skill = "devsuite-environment"
    elif re.search(QUALITY_GATE, text):
        skill, mode = "devsuite-review", "gate"
    elif re.search(r"\b(review|audit|gennemgå|kodegennemgang|release.readiness|pre.release|patch.risk|verify.delivery)\b", text):
        skill = "devsuite-review"
        mode = "release" if re.search(r"release.readiness|pre.release|patch.risk", text) else "code"
    elif re.search(r"\b(debug|diagnos\w*|reproduce|bug|defect)\b", text):
        skill = "devsuite-debug"
    elif re.search(r"\b(test|tests|testing|qa|verify|validation)\b", text) and not re.search(r"\b(implement|build|refactor)\b", text):
        skill = "devsuite-test"
    elif re.search(r"\b(plan|planning|planlæg\w*|projektplan\w*|coordinate|coordinator|architecture|new.project|agents\.md|board)\b", text) and not re.search(r"\b(implement|build)\b", text):
        skill, mode = "devsuite-planning", "project"
    elif re.search(r"\b(implement|build|fix|refactor|migrate|maintain|feature)\b", text):
        skill = "devsuite-implement"
    else:
        skill = "devsuite"
    return {"skill": skill, "entrypoint": f"skills/{skill}/SKILL.md", "mode": mode,
            "reason": "One focused phase; preserve the full user worklist across phases",
            "executionAuthorized": False, "externalActionAuthorized": False}
```
