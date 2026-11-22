# Plugin files: codex-coordinator — `scripts/`

Source: `plugins/codex-coordinator`. Files outside the `skills/*` folders, embedded as text.

## File: `scripts/codex_coordinator_doctor.py`

```python
#!/usr/bin/env python3
"""Read-only compatibility check for the installed Codex Coordinator package."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

EXPECTED_CAPABILITIES = {
    "corePurpose": "repository-task-boundary-visibility",
    "repositoryLifecycle": "explicit-opt-in",
    "projectLifecycleTool": "dry-run-first-init-deactivate-migrate-reactivate-purge",
    "defaultExecution": "one-native-task",
    "nativeTaskAuthority": "execution-messaging-transcript",
    "claimOwnership": "per-task-json-record",
    "claimConflictCheck": "advisory-path-overlap-exclusive-action-only",
    "activeTaskLimit": "three-default-twelve-hard-user-override",
    "taskCreation": "reuse-first-then-local-two-or-three-verticals",
    "taskReuse": "related-local-task-before-create",
    "goalCoordinator": "user-invoked-goal-scoped-on-demand",
    "goalCoordinationAction": "goal-coordination",
    "taskPlacement": "shared-primary-checkout-current-branch",
    "dependentParallelism": "durable-verticals-or-parent-owned-subagents",
    "messagePolicy": "coordinator-one-shot-assignment-and-sparse-peer-notices",
    "transcriptStorage": "none",
    "currentView": "generated-active-only-non-authoritative",
    "automaticFanIn": "none",
    "sessionStart": "marker-only-no-child-process",
    "stopGuard": "own-active-claim-one-shot-no-transcript",
    "doctor": "read-only-compatibility-reinstall",
    "externalWriteConsent": "exact-target-advance-notice",
    "staleClaimRecovery": "native-terminal-evidence",
    "stateTool": "scripts/coordination_state.py",
    "archivePolicy": "cold-compact-receipts",
    "gitWorkflow": "cooperative-exact-file-commits-shared-branch",
}

class CheckError(RuntimeError):
    """Raised for one deterministic package compatibility failure."""

def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise CheckError(f"duplicate JSON key: {key}")
        result[key] = value
    return result

def _json_object(path: Path) -> dict[str, Any]:
    try:
        raw = path.read_bytes()
    except OSError as error:
        raise CheckError(f"missing or unreadable file: {path.name}") from error
    if len(raw) > 131_072:
        raise CheckError(f"file is unexpectedly large: {path.name}")
    try:
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_object)
    except (UnicodeError, json.JSONDecodeError) as error:
        raise CheckError(f"invalid JSON: {path.name}") from error
    if not isinstance(value, dict):
        raise CheckError(f"JSON root is not an object: {path.name}")
    return value

def _text(path: Path) -> str:
    try:
        raw = path.read_bytes()
    except OSError as error:
        raise CheckError(f"missing or unreadable file: {path.name}") from error
    if len(raw) > 262_144:
        raise CheckError(f"file is unexpectedly large: {path.name}")
    try:
        return raw.decode("utf-8")
    except UnicodeError as error:
        raise CheckError(f"file is not UTF-8: {path.name}") from error

def _check_python(path: Path) -> None:
    source = _text(path)
    try:
        compile(source, str(path), "exec")
    except SyntaxError as error:
        raise CheckError(f"Python syntax is invalid: {path.name}:{error.lineno}") from error

def _check_skill(skill_root: Path) -> None:
    skill_path = skill_root / "SKILL.md"
    skill = _text(skill_path)
    if not skill.startswith("---\n") or "\nname: codex-coordinator\n" not in skill[:500]:
        raise CheckError("SKILL.md frontmatter is incompatible")
    if "task-boundary" not in skill[:800].casefold():
        raise CheckError("SKILL.md does not describe the boundary-board contract")
    resolved_root = skill_root.resolve(strict=True)
    for document in sorted(skill_root.rglob("*.md")):
        source = _text(document)
        links = re.findall(r"\[[^\]]+\]\(([^)]+)\)", source)
        for link in links:
            if "://" in link or link.startswith("#"):
                continue
            target = (document.parent / link.split("#", 1)[0]).resolve(strict=False)
            try:
                target.relative_to(resolved_root)
            except ValueError as error:
                raise CheckError(
                    f"{document.name} link escapes the skill package: {link}"
                ) from error
            if not target.is_file():
                raise CheckError(f"{document.name} link is missing: {link}")

def _check_hook(plugin_root: Path) -> None:
    hooks = _json_object(plugin_root / "hooks" / "hooks.json")
    try:
        if set(hooks) != {"hooks"} or set(hooks["hooks"]) != {"SessionStart", "Stop"}:
            raise CheckError("hook registration contains unsupported events")
        entries = hooks["hooks"]["SessionStart"]
        if not isinstance(entries, list) or len(entries) != 1:
            raise CheckError("SessionStart must contain exactly one registration")
        entry = entries[0]
        if not isinstance(entry, dict) or set(entry) != {"matcher", "hooks"}:
            raise CheckError("SessionStart registration fields are incompatible")
        if entry["matcher"] != "startup|resume|clear|compact":
            raise CheckError("SessionStart matcher is incompatible")
        if not isinstance(entry["hooks"], list) or len(entry["hooks"]) != 1:
            raise CheckError("SessionStart must contain exactly one command")
        command_hook = entry["hooks"][0]
        if not isinstance(command_hook, dict):
            raise CheckError("SessionStart command is incompatible")
    except (KeyError, IndexError, TypeError) as error:
        raise CheckError("SessionStart hook registration is incompatible") from error
    expected_fields = {
        "type",
        "command",
        "commandWindows",
        "timeout",
        "statusMessage",
    }
    if set(command_hook) != expected_fields or command_hook.get("type") != "command":
        raise CheckError("SessionStart command fields are incompatible")
    expected = "scripts/codex_coordinator_session_start.py"
    if command_hook.get("command") != (
        'python3 -I "${PLUGIN_ROOT}/scripts/codex_coordinator_session_start.py"'
    ) or command_hook.get("commandWindows") != (
        'python -I "${PLUGIN_ROOT}/scripts/codex_coordinator_session_start.py"'
    ):
        raise CheckError("SessionStart must call the packaged marker-only hook directly")
    timeout = command_hook.get("timeout")
    if not isinstance(timeout, int) or isinstance(timeout, bool) or not 1 <= timeout <= 5:
        raise CheckError("SessionStart timeout must be between one and five seconds")
    _check_python(plugin_root / expected)

    try:
        stop_entries = hooks["hooks"]["Stop"]
        if not isinstance(stop_entries, list) or len(stop_entries) != 1:
            raise CheckError("Stop must contain exactly one registration")
        stop_entry = stop_entries[0]
        if not isinstance(stop_entry, dict) or set(stop_entry) != {"hooks"}:
            raise CheckError("Stop registration must not contain a matcher")
        if not isinstance(stop_entry["hooks"], list) or len(stop_entry["hooks"]) != 1:
            raise CheckError("Stop must contain exactly one command")
        stop_hook = stop_entry["hooks"][0]
        if not isinstance(stop_hook, dict):
            raise CheckError("Stop command is incompatible")
    except (KeyError, IndexError, TypeError) as error:
        raise CheckError("Stop hook registration is incompatible") from error
    stop_fields = {"type", "command", "commandWindows", "timeout"}
    if set(stop_hook) != stop_fields or stop_hook.get("type") != "command":
        raise CheckError("Stop command fields are incompatible")
    stop_script = "scripts/codex_coordinator_stop_guard.py"
    if stop_hook.get("command") != (
        'python3 -I "${PLUGIN_ROOT}/scripts/codex_coordinator_stop_guard.py"'
    ) or stop_hook.get("commandWindows") != (
        'python -I "${PLUGIN_ROOT}/scripts/codex_coordinator_stop_guard.py"'
    ):
        raise CheckError("Stop must call the packaged own-claim guard directly")
    stop_timeout = stop_hook.get("timeout")
    if (
        not isinstance(stop_timeout, int)
        or isinstance(stop_timeout, bool)
        or not 1 <= stop_timeout <= 5
    ):
        raise CheckError("Stop timeout must be between one and five seconds")
    _check_python(plugin_root / stop_script)

def check_package(plugin_root: Path) -> dict[str, Any]:
    root = plugin_root.expanduser().resolve(strict=False)
    findings: list[str] = []

    def attempt(label: str, action) -> None:
        try:
            action()
        except (CheckError, OSError) as error:
            findings.append(f"{label}: {error}")

    manifest: dict[str, Any] = {}

    def manifest_check() -> None:
        nonlocal manifest
        manifest = _json_object(root / ".codex-plugin" / "plugin.json")
        if manifest.get("name") != "codex-coordinator":
            raise CheckError("plugin name is incompatible")
        if not re.fullmatch(r"\d+\.\d+\.\d+", str(manifest.get("version", ""))):
            raise CheckError("plugin version is not semantic")

    attempt("manifest", manifest_check)

    def capabilities_check() -> None:
        capabilities = _json_object(
            root / "skills" / "codex-coordinator" / "capabilities.json"
        )
        if capabilities.get("contractVersion") != 28:
            raise CheckError("capability contract version must be 26")
        if capabilities.get("capabilities") != EXPECTED_CAPABILITIES:
            raise CheckError("capability contract fields do not match version 26")

    attempt("capabilities", capabilities_check)
    attempt("skill", lambda: _check_skill(root / "skills" / "codex-coordinator"))
    attempt("state_helper", lambda: _check_python(root / "skills" / "codex-coordinator" / "scripts" / "coordination_state.py"))
    attempt("project_lifecycle", lambda: _check_python(root / "scripts" / "codex_coordinator_project.py"))
    attempt("hook", lambda: _check_hook(root))

    healthy = not findings
    return {
        "status": "healthy" if healthy else "broken",
        "package": "codex-coordinator",
        "version": manifest.get("version") if isinstance(manifest.get("version"), str) else "unknown",
        "checks": 6,
        "failures": len(findings),
        "findings": findings,
        "recommendedAction": "none" if healthy else "update_or_reinstall",
        "message": (
            "Codex Coordinator package is compatible."
            if healthy
            else "Codex Coordinator is broken or outdated. Update or reinstall the plugin from its configured marketplace or source."
        ),
    }

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--plugin-root",
        "--source-plugin",
        dest="plugin_root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="installed plugin package to check",
    )
    parser.add_argument("--compact", action="store_true", help="omit detailed findings")
    parser.add_argument("--skill-root", help=argparse.SUPPRESS)
    parser.add_argument("--hook-path", help=argparse.SUPPRESS)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="run the read-only check")
    mode.add_argument("--apply", action="store_true", help="legacy repair mode; always rejected")
    return parser

def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.apply:
        report = {
            "status": "broken",
            "package": "codex-coordinator",
            "failures": 1,
            "findings": ["In-place Doctor repair was removed."],
            "recommendedAction": "update_or_reinstall",
            "message": "Codex Coordinator is not self-repaired. Update or reinstall the plugin from its configured marketplace or source.",
        }
        if args.compact:
            report.pop("findings")
        print(json.dumps(report, indent=2))
        return 2

    report = check_package(args.plugin_root)
    if args.skill_root or args.hook_path:
        report["status"] = "broken"
        report["failures"] = int(report["failures"]) + 1
        report["recommendedAction"] = "update_or_reinstall"
        report["findings"].append(
            "Separate skill and hook repair targets are unsupported; check the installed plugin package."
        )
        report["message"] = (
            "Codex Coordinator is broken or outdated. Update or reinstall the plugin from its configured marketplace or source."
        )
    if args.compact:
        report.pop("findings", None)
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "healthy" else 1

if __name__ == "__main__":
    sys.exit(main())
```

## File: `scripts/codex_coordinator_project.py`

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
- Before substantial writes, load the installed `codex-coordinator` skill, list active claims from the primary worktree, and publish only this task's bounded claim.
- Native Codex tasks remain the execution, messaging, and transcript authority; an explicitly requested goal Coordinator is on demand, with no heartbeat or mandatory pull-request workflow.
- Reject cross-project notices and never store transcripts, reasoning, prompts, or tool output in Coordinator state."""

LEGACY_DISCOVERY_BLOCKS = (
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

## File: `scripts/codex_coordinator_session_start.py`

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
                "Do not change board claims. Continue only conflict-free read-only work, or ask the user to update or reinstall Codex Coordinator and migrate this project.",
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
                    "Before substantial writes, load the installed codex-coordinator skill and list the bounded active claims from the primary worktree.",
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

## File: `scripts/codex_coordinator_stop_guard.py`

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
            "If this task is complete, stopped, or superseded, use the existing coordination_state.py release command with your exact session id and revision.",
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
