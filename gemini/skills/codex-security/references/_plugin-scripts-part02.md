# Plugin files: codex-security — `scripts/` (part 2 of 3)

Source: `plugins/codex-security`. Files outside the `skills/*` folders, embedded as text.

## File: `scripts/workbench/saved_sources.py`

```python
"""Read and freeze saved scan checkpoint observations."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
from collections.abc import Iterable, Iterator
from functools import partial
from pathlib import Path
from typing import Any

from finalize_scan_contract import (
    ContractError,
    _read_scan_local_json,
    _read_scan_local_json_with_metadata,
    manifest_is_sealed,
    write_scan_local_bytes,
)
from review_state import review_state, uses_legacy_review
from workbench_coverage_receipts import capture_receipt_checkpoints

class _CheckpointSnapshotError(ContractError):
    """A captured source observation could not be persisted for publication replay."""

    def __init__(self, message: str, captured: dict[str, tuple[str, int]]) -> None:
        super().__init__(message)
        self.captured = captured
        self.records: dict[str, tuple[dict[str, Any], str, int]] = {}
        self.heads: dict[str, str | None] = {}
        self.model_source: list[str] = []
        self.parent_context: dict[str, str] = {}
        self.include_parent = False
        self.documents: tuple[dict[str, Any], dict[str, Any], dict[str, Any]] | None = None

def _encoded(value: Any) -> bytes:
    return json.dumps(
        value, ensure_ascii=True, allow_nan=False, sort_keys=True, separators=(",", ":")
    ).encode()

def _digest(value: Any) -> str:
    return hashlib.sha256(_encoded(value)).hexdigest()

def _source_digests(value: Any, error: str) -> dict[str, str]:
    if not isinstance(value, dict) or not all(
        isinstance(relative, str) and isinstance(digest, str) for relative, digest in value.items()
    ):
        raise ContractError(error)
    return value

def _retained_source_state(raw: str | None) -> dict[str, Any]:
    """Decode stopped-scan sources, preserving the distinction between absent and frozen empty."""
    if raw is None:
        return {}
    state = json.loads(raw)
    if not isinstance(state, dict) or not isinstance(state.get("sources"), dict):
        state = {"sources": state}  # Legacy rows store only the path-to-digest map.
    sources = _source_digests(state["sources"], "Saved stopped-scan source digests are malformed.")
    model_source = state.get("threatModelSource")
    if "threatModelSource" in state and (
        not isinstance(model_source, str) or model_source not in sources
    ):
        raise ContractError("Saved stopped-scan model source is outside its checkpoint set.")
    return state

def _retained_checkpoint_state(
    scan: Any,
) -> tuple[dict[str, str | None] | None, dict[str, Any] | None]:
    """Return selected checkpoint heads and any pending recovery record.

    Older scans can store the head map directly. Recovery records also bind
    the selection to a sealed manifest digest. A conflicting digest raises ContractError.
    """
    raw = scan["retained_checkpoint_heads_json"]
    if raw is None:
        return None, None
    saved = json.loads(raw)
    if not isinstance(saved.get("heads"), dict):
        return saved, None
    if saved["recoveryBaseDigest"] != scan["seal_manifest_digest"]:
        raise ContractError("Stopped scan recovery publication changed after selection.")
    return saved["heads"], saved

def _encode_retained_sources(
    sources: dict[str, str],
    model_source: list[str],
    source_times: dict[str, int] | None = None,
    parent_context: dict[str, str] | None = None,
) -> str:
    state: dict[str, Any] = sources
    if model_source or source_times is not None:
        state = {"sources": sources}
        if model_source:
            state["threatModelSource"] = model_source[0]
        if source_times is not None:
            state["sourceTimes"] = source_times
            if parent_context:
                state["parentContext"] = parent_context
    return json.dumps(state, sort_keys=True)

def _children(scan_dir: Path, relative: str) -> list[str]:
    cursor = scan_dir
    for part in Path(relative).parts:
        if part in {"..", "."}:
            return []
        cursor = cursor / part
        try:
            if not stat.S_ISDIR(cursor.lstat().st_mode):
                return []
        except FileNotFoundError:
            return []
    return sorted(child.name for child in cursor.iterdir())

def _checkpoint_paths(scan_dir: Path, directory: str) -> list[str]:
    return [
        f"{directory}/{name}"
        for name in _children(scan_dir, directory)
        if re.fullmatch(r"[0-9a-f]{64}\.json", name)
    ]

def _checkpoint_head_directory(relative: str) -> Path | None:
    """Return the owner directory of a current or archived checkpoint head path, or None for another file."""
    path = Path(relative)
    if path.name == "checkpoint-head.json":
        return path.parent
    if path.parent.name == "checkpoint-heads":
        return path.parent.parent
    return None

def _unselected_root_order(
    saved_heads: dict[str, str],
    checkpoint_heads: dict[str, str | None],
    source_order: dict[str, tuple[int, int]],
) -> tuple[int, int]:
    # One payload can have several accepted observations; retain their order.
    return max(
        (
            source_order[head]
            for head, checkpoint in saved_heads.items()
            if _checkpoint_head_directory(head) == Path(".")
            and checkpoint_heads.get(".") not in (None, head, f"checkpoints/{checkpoint}")
        ),
        default=(-1, 0),
    )

def _capture_saved_source(
    scan_dir: Path,
    relative: str,
    scan_id: str,
    *,
    kind: str | None = None,
    snapshot_head: bool = True,
    write: bool = True,
    created_paths: set[str] | None = None,
    checkpoint_heads: dict[str, str | None] | None = None,
    expected_digest: str | None = None,
) -> dict[str, tuple[str, int]]:
    """Capture digests and observation times for a saved source and its selected checkpoint or receipt inputs."""
    if not snapshot_head or Path(relative).name != "checkpoint-head.json":
        _, digest, observed = _read_saved_result(scan_dir, relative, scan_id, kind=kind)
        return capture_receipt_checkpoints(
            relative,
            kind,
            {relative: (digest, observed)},
            partial(_checkpoint_paths, scan_dir),
            partial(_read_saved_result, scan_dir, scan_id=scan_id),
        )
    head, head_digest, observed = _read_saved_result(scan_dir, relative, scan_id)
    if expected_digest is not None and head_digest != expected_digest:
        raise ContractError("checkpoint changed after the scan stopped")
    observation = {
        **{key: head[key] for key in ("checkpoint", "inputCheckpoint") if key in head},
        "observedAtNs": str(observed),
    }
    directory = Path(relative).parent
    selected_records = {}
    for key in ("checkpoint", "inputCheckpoint"):
        if key in head:
            selected = (directory / "checkpoints" / head[key]).as_posix()
            selected_records[selected] = _read_saved_result(scan_dir, selected, scan_id)
    selected_sources = {
        path: (digest, seen) for path, (_, digest, seen) in selected_records.items()
    }
    digest = _digest(observation)
    snapshot = (directory / "checkpoint-heads" / f"{digest}.json").as_posix()
    # Capture the selected file even if the worker created it after directory enumeration.
    if checkpoint_heads is not None:
        checkpoint_heads[directory.as_posix()] = snapshot
    if write and not (scan_dir / snapshot).exists():
        if created_paths is not None and not os.path.lexists(scan_dir / snapshot):
            created_paths.add(snapshot)
        try:
            write_scan_local_bytes(scan_dir, snapshot, _encoded(observation))
        except (ContractError, OSError) as exc:
            if checkpoint_heads is not None:
                checkpoint_heads[directory.as_posix()] = relative
            failure = _CheckpointSnapshotError(
                str(exc), {relative: (head_digest, observed), **selected_sources}
            )
            failure.records = {relative: (head, head_digest, observed), **selected_records}
            raise failure from exc
    return {
        snapshot: (digest, observed),
        **selected_sources,
    }

def _read_saved_result(
    scan_dir: Path,
    relative: str,
    scan_id: str,
    *,
    kind: str | None = None,
    normalize_review: bool = True,
) -> tuple[dict[str, Any], str, int]:
    draft, _, metadata = _read_scan_local_json_with_metadata(
        scan_dir, relative, "Saved scan checkpoint"
    )
    directory = _checkpoint_head_directory(relative)
    if directory is not None:
        checkpoint = draft.get("checkpoint")
        if not isinstance(checkpoint, str) or not re.fullmatch(r"[0-9a-f]{64}\.json", checkpoint):
            raise ContractError("checkpoint head does not name a saved checkpoint")
        _read_saved_result(scan_dir, (directory / "checkpoints" / checkpoint).as_posix(), scan_id)
        if "inputCheckpoint" in draft:
            raw = draft["inputCheckpoint"]
            if not isinstance(raw, str) or not re.fullmatch(r"[0-9a-f]{64}\.json", raw):
                raise ContractError("checkpoint head does not name a saved input checkpoint")
            _read_saved_result(scan_dir, (directory / "checkpoints" / raw).as_posix(), scan_id)
        if Path(relative).name == "checkpoint-head.json":
            return draft, _digest([draft, metadata.st_mtime_ns]), metadata.st_mtime_ns
        observed = draft.get("observedAtNs")
        if not isinstance(observed, str) or not re.fullmatch(r"-?[0-9]+", observed):
            raise ContractError("checkpoint head has no observation time")
        return draft, _digest(draft), int(observed)
    if draft.get("scanId") != scan_id:
        raise ContractError("checkpoint belongs to a different scan")
    if _is_source_order_snapshot(relative):
        return draft, _digest(draft), metadata.st_mtime_ns
    if not isinstance(draft.get("findings"), list) or not isinstance(
        draft.get("reviewState", draft.get("coverage", {} if kind == "dedup" else None)), dict
    ):
        raise ContractError("checkpoint has no semantic findings or coverage")
    digest = _digest(draft)
    if kind == "dedup" and normalize_review:
        # The host keeps grouping state in iteration checkpoints for resume only.
        for finding in draft["findings"]:
            if isinstance(finding, dict) and isinstance(finding.get("provenance"), dict):
                finding["provenance"].pop("deepScanRepairGroups", None)
    if normalize_review and "coverage" in draft and "reviewState" not in draft:
        draft["reviewState"] = draft.pop("coverage")
    return draft, digest, metadata.st_mtime_ns

def _is_source_order_snapshot(relative: str) -> bool:
    path = Path(relative)
    return path.parent == Path("source-order") and bool(
        re.fullmatch(r"[0-9a-f]{64}\.json", path.name)
    )

def _frozen_source_times(
    scan_dir: Path,
    scan_id: str,
    sources: dict[str, str],
    parent_context: dict[str, str] | None = None,
) -> dict[str, int]:
    times: dict[str, int] = {}
    snapshots = [path for path in sources if _is_source_order_snapshot(path)]
    for path in snapshots:
        record, digest, _ = _read_saved_result(scan_dir, path, scan_id)
        if digest != sources[path] or not isinstance(record.get("sources"), dict):
            raise ContractError("saved source ordering changed after the scan stopped")
        context = record.get("parentContext")
        if parent_context is not None and context is not None:
            if not isinstance(context, dict) or any(
                (
                    "canonical" not in context
                    or not isinstance(relative, str)
                    or not re.fullmatch(r"-?[0-9]+", relative)
                )
                if role == "canonicalObservedAtNs"
                else (
                    role not in ("canonical", "head")
                    or not isinstance(relative, str)
                    or relative not in sources
                    or (role == "canonical" and Path(relative).parent != Path("checkpoints"))
                    or (role == "head" and _checkpoint_head_directory(relative) != Path("."))
                )
                for role, relative in context.items()
            ):
                raise ContractError("saved parent context is outside the frozen sources")
            if any(
                role in parent_context and parent_context[role] != relative
                for role, relative in context.items()
            ):
                raise ContractError("saved parent context has conflicting observations")
            parent_context.update(context)
        for relative, observation in record["sources"].items():
            if (
                not isinstance(observation, dict)
                or relative not in sources
                or observation.get("digest") != sources[relative]
                or not isinstance(observation.get("observedAtNs"), str)
                or not re.fullmatch(r"-?[0-9]+", observation["observedAtNs"])
            ):
                raise ContractError("saved source ordering does not match its frozen sources")
            observed = int(observation["observedAtNs"])
            if relative in times and times[relative] != observed:
                raise ContractError("saved source ordering has conflicting observations")
            times[relative] = observed
    if snapshots and sources.keys() - set(snapshots) - times.keys():
        raise ContractError("saved source ordering is incomplete")
    return times

def _frozen_checkpoint_heads(
    scan_dir: Path, scan_id: str, sources: dict[str, str], *, skip_unreadable: bool = False
) -> dict[str, str]:
    parent_context: dict[str, str] = {}
    try:
        times = _frozen_source_times(scan_dir, scan_id, sources, parent_context)
    except (ContractError, OSError, ValueError):
        if not skip_unreadable:
            raise
        times = {}
        parent_context.clear()
    # A frozen parent can identify its accepted head even when observation times tie.
    accepted_root = None
    heads: dict[str, tuple[int, str]] = {}
    ambiguous: set[str] = set()
    for relative, expected_digest in sources.items():
        directory = _checkpoint_head_directory(relative)
        if directory is None:
            continue
        try:
            head, digest, observed = _read_saved_result(scan_dir, relative, scan_id)
            if digest != expected_digest:
                raise ContractError("checkpoint changed after the scan stopped")
        except (ContractError, OSError, ValueError):
            if skip_unreadable:
                continue
            raise
        selected = (directory / "checkpoints" / head["checkpoint"]).as_posix()
        observation = (times.get(relative, observed), selected)
        key = directory.as_posix()
        if relative == parent_context.get("head"):
            accepted_root = relative
        if key not in heads or observation[0] > heads[key][0]:
            heads[key] = observation
            ambiguous.discard(key)
        elif observation[0] == heads[key][0] and selected != heads[key][1]:
            ambiguous.add(key)
    # A legacy tie retains both observations until recovery selects a head.
    frozen = {
        directory: selected
        for directory, (_, selected) in heads.items()
        if directory not in ambiguous
    }
    if accepted_root is not None:
        frozen["."] = accepted_root
    return frozen

def _legacy_checkpoint_observed_at(
    scan_dir: Path, scan_id: str, sources: dict[str, str], selected: str
) -> int | None:
    times = _frozen_source_times(scan_dir, scan_id, sources)
    checkpoint = Path(selected)
    observations = []
    for relative, expected_digest in sources.items():
        if _checkpoint_head_directory(relative) != checkpoint.parent.parent:
            continue
        head, digest, observed = _read_saved_result(scan_dir, relative, scan_id)
        if digest != expected_digest:
            raise ContractError("checkpoint changed after the scan stopped")
        if head["checkpoint"] == checkpoint.name:
            observations.append(times.get(relative, observed))
    # Payload-only selections used the newest retained observation for that payload.
    return max(observations, default=None)

def _restore_checkpoint_head(
    heads: dict[str, str | None],
    previous_heads: dict[str, str | None],
    sources: dict[str, str],
    relative: str,
) -> None:
    """Restore the prior selection for a checkpoint directory, allowing legacy evidence with no selected head."""
    path = Path(relative)
    if path.name != "checkpoint-head.json":
        return
    directory = path.parent.as_posix()
    if directory in previous_heads:
        heads[directory] = previous_heads[directory]
        return
    directories = {path.parent, path.parent / "checkpoints", path.parent / "checkpoint-heads"}
    if any(Path(source).parent in directories for source in sources):
        # Legacy evidence can remain accepted without one selected head.
        heads.pop(directory, None)

def _freeze_source_times(
    scan_dir: Path,
    scan_id: str,
    sources: dict[str, str],
    times: dict[str, int],
    parent_context: dict[str, str] | None = None,
    *,
    created_paths: set[str] | None = None,
) -> None:
    # Identical result rewrites must not change the order of frozen review evidence.
    observations = {
        path: {"digest": digest, "observedAtNs": str(times[path])}
        for path, digest in sources.items()
        if not _is_source_order_snapshot(path)
    }
    if not observations:
        return
    record = {"scanId": scan_id, "sources": observations}
    if parent_context:
        record["parentContext"] = parent_context
    digest = _digest(record)
    path = f"source-order/{digest}.json"
    if not (scan_dir / path).exists():
        if created_paths is not None and not os.path.lexists(scan_dir / path):
            created_paths.add(path)
        write_scan_local_bytes(scan_dir, path, _encoded(record))
    if _read_saved_result(scan_dir, path, scan_id)[1] != digest:
        raise ContractError("saved source ordering does not match its digest")
    if parent_context:
        for previous in [relative for relative in sources if _is_source_order_snapshot(relative)]:
            previous_record, _, _ = _read_saved_result(scan_dir, previous, scan_id)
            if previous_record.get("parentContext"):
                del sources[previous]
    sources[path] = digest

def _parent_publication_ancestors(
    input_checkpoint: str | None, drafts: dict[str, dict[str, Any]]
) -> set[str]:
    """Find stale canonical projections without relying on publication clocks."""
    ancestors = set()
    inputs = set()
    # Input hashes distinguish repeated publication of the same projected result.
    while isinstance(input_checkpoint, str) and input_checkpoint not in inputs:
        inputs.add(input_checkpoint)
        publication = drafts.get(f"checkpoints/{input_checkpoint}", {}).get("publication")
        if not isinstance(publication, dict):
            break
        previous = publication.get("previousCheckpoint")
        if isinstance(previous, str):
            ancestors.add(f"checkpoints/{previous}")
        input_checkpoint = publication.get("previousInputCheckpoint")
    return ancestors

def _admit_parent_checkpoint(
    scan_dir: Path, scan_id: str, checkpoint: dict[str, Any], projected: dict[str, Any]
) -> bytes:
    """Bind a Deep input to the accepted head under the host's publication lock."""
    previous = {}
    try:
        previous, _, _ = _read_saved_result(scan_dir, "checkpoint-head.json", scan_id)
        if (
            previous.get("checkpoint") == f"{_digest(projected)}.json"
            and "inputCheckpoint" in previous
        ):
            accepted, _, _ = _read_saved_result(
                scan_dir,
                f"checkpoints/{previous['inputCheckpoint']}",
                scan_id,
                normalize_review=False,
            )
            if {key: value for key, value in accepted.items() if key != "publication"} == {
                key: value for key, value in checkpoint.items() if key != "publication"
            }:
                for relative in _checkpoint_paths(scan_dir, "checkpoints"):
                    pending, _, _ = _read_saved_result(scan_dir, relative, scan_id)
                    publication = pending.get("publication")
                    if (
                        isinstance(publication, dict)
                        and publication.get("previousInputCheckpoint")
                        == previous["inputCheckpoint"]
                    ):
                        break
                else:
                    return _encoded(accepted)
    except (ContractError, OSError, ValueError):
        pass  # An absent or unreadable previous head contributes no predecessor.
    return _encoded(
        {
            **checkpoint,
            "publication": {
                "previousCheckpoint": previous.get("checkpoint"),
                "previousInputCheckpoint": previous.get("inputCheckpoint"),
            },
        }
    )

def _capture_parent_observation(
    scan_dir: Path,
    scan_id: str,
    checkpoint: str,
    observed: int,
    legacy_head: bool = False,
    *,
    created_paths: set[str] | None = None,
) -> dict[str, tuple[str, int]]:
    """Freeze canonical input, preserving the legacy sealed-parent migration."""
    if legacy_head:
        write_scan_local_bytes(
            scan_dir, "checkpoint-head.json", _encoded({"checkpoint": checkpoint})
        )
        os.utime(scan_dir / "checkpoint-head.json", ns=(observed, observed))
        return _capture_saved_source(
            scan_dir, "checkpoint-head.json", scan_id, created_paths=created_paths
        )
    observation = {"checkpoint": checkpoint, "observedAtNs": str(observed)}
    digest = _digest(observation)
    snapshot = f"checkpoint-heads/{digest}.json"
    if not (scan_dir / snapshot).exists():
        if created_paths is not None and not os.path.lexists(scan_dir / snapshot):
            created_paths.add(snapshot)
        try:
            write_scan_local_bytes(scan_dir, snapshot, _encoded(observation))
        except (ContractError, OSError) as exc:
            # The canonical checkpoint carries this observation without a live head.
            raise _CheckpointSnapshotError(str(exc), {}) from exc
    return {snapshot: (digest, observed)}

def _parent_scan_draft(
    scan_id: str,
    parent_scan: dict[str, Any],
    findings: dict[str, Any],
    coverage: dict[str, Any],
) -> dict[str, Any]:
    parent = {
        "scanId": scan_id,
        "findings": findings.get("findings"),
        "reviewState": coverage,
        **{
            key: parent_scan[key]
            for key in ("scope", "threatModel", "complete")
            if key in parent_scan
        },
    }
    if not isinstance(parent["findings"], list):
        raise ContractError("Saved parent draft has no findings array")
    return parent

def _model_capture(scan_id: str, model: dict[str, Any]) -> dict[str, Any]:
    return _parent_scan_draft(scan_id, {"threatModel": model}, {"findings": []}, {})

def _restore_frozen_model_capture(
    scan_dir: Path,
    scan_id: str,
    sources: dict[str, str],
    times: dict[str, int] | None,
    model_source: str | None,
) -> None:
    if model_source not in (times or {}) or (scan_dir / model_source).exists():
        return
    manifest = _read_scan_local_json(scan_dir, "scan-manifest.json", "Saved scan manifest")
    scan = manifest.get("scan")
    if not isinstance(scan, dict) or not isinstance(scan.get("threatModel"), dict):
        return
    draft = _model_capture(scan_id, scan["threatModel"])
    digest = _digest(draft)
    if model_source != f"checkpoints/{digest}.json" or sources.get(model_source) != digest:
        return
    # A failed first capture can retry only the model and time bound by that stop.
    write_scan_local_bytes(scan_dir, model_source, _encoded(draft))
    observed = times[model_source]
    os.utime(scan_dir / model_source, ns=(observed, observed))

def _read_saved_parent_result(
    scan_dir: Path, scan_id: str
) -> tuple[dict[str, Any], dict[str, Any]]:
    manifest = _read_scan_local_json(scan_dir, "scan-manifest.json", "Saved parent manifest")
    findings = _read_scan_local_json(scan_dir, "findings.json", "Saved parent findings")
    parent_scan = manifest.get("scan")
    if not isinstance(parent_scan, dict):
        raise ContractError("Saved parent manifest has no scan object")
    coverage = (
        _read_scan_local_json(scan_dir, "coverage.json", "Saved parent coverage")
        if uses_legacy_review(parent_scan)
        else review_state(parent_scan)
    )
    if manifest_is_sealed(parent_scan) and (
        parent_scan.get("id", scan_id) != scan_id
        or findings.get("scanId", scan_id) != scan_id
        or coverage.get("scanId", scan_id) != scan_id
    ):
        raise ContractError("Saved parent documents belong to a different scan")
    return manifest, _parent_scan_draft(scan_id, parent_scan, findings, coverage)

def _require_current_deep_publication(
    db: Any, connection: Any, scan: Any, draft: dict[str, Any]
) -> None:
    scan_id = scan["id"]
    run = connection.execute(
        "SELECT * FROM deep_scan_runs WHERE scan_id = ?", (scan_id,)
    ).fetchone()
    publication = draft.get("deepScanPublication")
    if (
        publication is None
        and draft["manifest"]["scan"].get("complete") is False
        and (run is None or run["status"] == "running")
    ):
        return
    if run is None:
        run = db.deep_scan.require_deep_scan_run(connection, scan_id)
    # Finished discovery-only runs hand remaining publication back to the parent.
    if (
        publication is None
        and run["status"] != "running"
        and run["manifest_path"] != str(Path(scan["scan_dir"]) / "scan-manifest.json")
    ):
        return
    db.deep_scan.require_current_coordinator(
        run,
        argparse.Namespace(
            coordinator_generation=publication.get("coordinatorGeneration") if publication else None
        ),
    )
    # Once finish selects the canonical parent, only completion may replay it.
    if publication is None:
        if run["status"] != "running" and run["manifest_path"] == str(
            Path(scan["scan_dir"]) / "scan-manifest.json"
        ):
            raise SystemExit("Deep Scan is terminal; drafts cannot replace its publication.")
        return

    iteration = _latest_iteration(
        connection.execute("SELECT * FROM deep_scan_workers WHERE scan_id = ?", (scan_id,))
    )
    selected_result = iteration["result_manifest_path"] if iteration is not None else None
    if publication["resultPath"] != selected_result:
        raise SystemExit("Deep Scan aggregate belongs to a superseded publication selection.")

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()

def _iteration_order(worker: Any) -> tuple[int, str, str]:
    result = worker["result_manifest_path"]
    output = Path(result).parent if result else Path(worker["artifact_dir"])
    label = output.parent.name if output.name == "output" else output.name
    match = re.fullmatch(r"dedup-([0-9]+)", label)
    return (int(match[1]) if match else 0, worker["completed_at"] or "", worker["id"])

def _latest_iteration(workers: Iterable[Any]) -> Any | None:
    return max(
        (
            worker
            for worker in workers
            if worker["kind"] == "dedup"
            and worker["status"] == "succeeded"
            and worker["result_manifest_path"]
        ),
        key=_iteration_order,
        default=None,
    )

def _worker_outputs(scan_dir: Path, worker: Any) -> list[tuple[str, int]]:
    output = Path(worker["artifact_dir"]).relative_to(scan_dir)
    attempts = (output.parent if output.name == "output" else output) / "attempts"
    archived = [
        ((attempts / name).as_posix(), int(name.split("-")[1]))
        for name in _children(scan_dir, attempts.as_posix())
        if re.fullmatch(r"attempt-\d+", name)
    ]
    attempt = int(worker["attempt"] or 0) if "attempt" in worker.keys() else 0
    if worker["kind"] == "discovery" and not attempt:
        attempt = max((attempt for _, attempt in archived), default=0) + 1
    return [(output.as_posix(), attempt), *archived]

def _saved_result_paths(scan_dir: Path, workers: list[Any]) -> Iterator[tuple[str, str | None]]:
    iteration = _latest_iteration(workers)
    yield "checkpoint-head.json", None
    for directory in ("checkpoint-heads", "checkpoints"):
        yield from ((path, None) for path in _checkpoint_paths(scan_dir, directory))
    for worker in workers:
        if worker["kind"] not in {"dedup", "discovery"}:
            continue
        try:
            outputs = _worker_outputs(scan_dir, worker)
        except (TypeError, ValueError):
            continue
        for directory, _ in outputs:
            if worker["kind"] == "discovery":
                yield f"{directory}/checkpoint-head.json", worker["kind"]
                yield from (
                    (path, worker["kind"])
                    for path in _checkpoint_paths(scan_dir, f"{directory}/checkpoint-heads")
                )
            checkpoint_paths = _checkpoint_paths(scan_dir, f"{directory}/checkpoints")
            if worker["kind"] == "discovery" or checkpoint_paths:
                yield f"{directory}/result.json", worker["kind"]
                yield from ((path, worker["kind"]) for path in checkpoint_paths)
        if worker["result_manifest_path"] and (
            worker["kind"] == "discovery"
            or (iteration is not None and worker["id"] == iteration["id"])
        ):
            try:
                yield (
                    Path(worker["result_manifest_path"]).relative_to(scan_dir).as_posix(),
                    worker["kind"],
                )
            except ValueError:
                continue
```

## File: `scripts/workbench/storage.py`

```python
"""Storage paths shared by workbench persistence and MCP artifact selection."""

from __future__ import annotations

import hashlib
import os
import sqlite3
import tempfile
from pathlib import Path
from typing import Any

if os.name == "nt":
    import windows_scan_local_files as windows_files

def state_dir(*, canonical: bool = True) -> Path:
    """Return the workbench state path, resolving symlinks unless canonical is false."""
    configured = os.environ.get("CODEX_SECURITY_STATE_DIR")
    if configured:
        path = Path(configured).expanduser()
    else:
        codex_home = Path(
            os.environ["CODEX_HOME"] if os.environ.get("CODEX_HOME", "").strip() else "~/.codex"
        ).expanduser()
        path = codex_home / "state" / "plugins" / "codex-security"
    return path.resolve() if canonical else path.absolute()

def resolve_scan_root(scan_root: str | None) -> Path:
    """Resolve an explicit scan output root, defaulting to the scans directory under workbench state."""
    return Path(scan_root).expanduser().resolve() if scan_root else state_dir() / "scans"

def worker_usage_directory(scan_id: str) -> Path:
    """Bind host-observed receipts beneath the persistent protected native home."""
    return state_dir() / "codex-home" / "worker-usage" / scan_id

def short_archive_prefix(original_name: str) -> str:
    """Bind a short archive name to the complete original filename."""
    return f".previous-{hashlib.sha256(os.fsencode(original_name)).hexdigest()}-"

def archive_source_directory(archive: Path, source: Path) -> Path | None:
    """Return the original sibling when the archived name identifies it."""
    if not source.is_relative_to(archive.parent):
        return None
    parts = source.relative_to(archive.parent).parts
    if not parts or ".." in parts:
        return None
    name = parts[0]
    if archive.name.startswith(f"{name}.previous-") or (
        archive.name.startswith(".previous-")
        and archive.name.startswith(short_archive_prefix(name))
    ):
        return archive.parent / name
    return None

def archived_deep_path(scan_dir: Path, value: str | None) -> str | None:
    """Resolve old archive rows that still name the original sibling output."""
    if value is None or ".previous-" not in scan_dir.name:
        return value
    path = Path(value)
    original = archive_source_directory(scan_dir, path)
    if original is None:
        return value
    # Keep missing files inside the archive too. Never follow the replacement scan's output.
    return str(scan_dir / path.relative_to(original))

def saved_deep_workers(connection: sqlite3.Connection, scan: sqlite3.Row) -> list[Any]:
    workers = connection.execute(
        "SELECT * FROM deep_scan_workers WHERE scan_id = ? ORDER BY created_at, id",
        (scan["id"],),
    ).fetchall()
    scan_dir = Path(scan["scan_dir"])
    if ".previous-" not in scan_dir.name:
        return workers
    return [
        {
            **worker,
            **{
                key: archived_deep_path(scan_dir, worker[key])
                for key in ("artifact_dir", "prompt_path", "result_manifest_path")
            },
        }
        for worker in workers
    ]

def create_private_directory(path: Path, *, scan_output: bool = False) -> None:
    """Create missing directories privately without changing existing permissions."""
    if path.parent != path and not path.parent.is_dir():
        create_private_directory(path.parent, scan_output=scan_output)
    if os.name != "nt":
        path.mkdir(mode=0o700, exist_ok=True)
    elif not path.is_dir():
        windows_files.create_private_directory(path, exist_ok=True, scan_output=scan_output)
    elif scan_output:
        windows_files.require_windows_output_path(path)

def create_private_temporary_directory(parent: Path, *, prefix: str) -> Path:
    """Create a unique private child without inheriting a permissive Windows DACL."""
    if os.name != "nt":
        return Path(tempfile.mkdtemp(prefix=prefix, dir=parent)).resolve()

    import secrets

    for _ in range(100):
        path = parent / f"{prefix}{secrets.token_hex(4)}"
        try:
            return windows_files.create_private_directory(path, exist_ok=False, scan_output=True)
        except FileExistsError:
            continue
    raise FileExistsError(f"Could not create a unique directory beneath {parent}.")
```

## File: `scripts/workbench_cli.py`

```python
"""Command-line argument parsing for the Codex Security workbench."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from workbench_constants import (
    DIFF_TARGET_KINDS,
    EXPORT_FORMATS,
    FINDING_CLOSE_REASONS,
    FINDING_SEVERITIES,
    FINDING_STATUSES,
    FINDINGS_PAGE_MAX,
    MODES,
    PHASE_PROGRESS_UNITS,
    PHASES,
    REMEDIATION_UPDATE_STATES,
    positive_int,
)

def non_negative_int(value: str) -> int:
    parsed = int(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("expected a non-negative integer")
    return parsed

def add_user_context(parser: argparse.ArgumentParser, *, required: bool = False) -> None:
    context = parser.add_mutually_exclusive_group(required=required)
    context.add_argument("--user-context")
    context.add_argument("--user-context-stdin", action="store_true")

def parse_args(description: str, *, inspection_only: bool = False) -> argparse.Namespace:
    """Parse the workbench command line into the namespace consumed by its dispatcher.

    For a full command, read UTF-8 user context from stdin when requested. In
    inspection mode, recognized inspection arguments return before that read.
    """
    parser = argparse.ArgumentParser(description=description)
    subparsers = parser.add_subparsers(dest="command", required=True)

    def add_command(name: str, *required: str) -> argparse.ArgumentParser:
        command_parser = subparsers.add_parser(name)
        for flag in required:
            command_parser.add_argument(flag, required=True)
        return command_parser

    resolve_scan_root = subparsers.add_parser("resolve-scan-root")
    resolve_scan_root.add_argument("--scan-root")

    create_workspace = add_command("create-workspace", "--workspace-id")
    create_workspace.add_argument("--thread-id")
    create_workspace.add_argument("--target-path")
    create_workspace.add_argument("--target-title")
    create_workspace.add_argument("--target-summary")
    add_user_context(create_workspace)
    create_workspace.add_argument("--scope")
    create_workspace.add_argument("--mode", choices=MODES, default="standard")

    get_workspace = add_command("get-workspace", "--workspace-id")
    get_workspace.add_argument("--thread-id")

    add_command("inspect-target", "--target-path")

    inspect_setup = add_command("inspect-setup", "--target-path", "--scope")
    inspect_setup.add_argument("--mode", choices=MODES, required=True)
    inspect_setup.add_argument("--deep-scan-project-json")

    save_workspace = add_command("save-workspace", "--workspace-id", "--target-path", "--scope")
    save_workspace.add_argument("--mode", choices=MODES, required=True)
    save_workspace.add_argument("--deep-scan-project-json")
    save_workspace.add_argument("--target-summary")
    add_user_context(save_workspace)

    start_scan = add_command("start-scan", "--workspace-id")

    start_prompt_only_scan = add_command(
        "start-prompt-only-scan", "--thread-id", "--target-path", "--scope"
    )
    start_prompt_only_scan.add_argument("--mode", choices=("diff", "standard"), required=True)
    start_prompt_only_scan.add_argument("--target-summary")
    add_user_context(start_prompt_only_scan)
    # Place shared options after each command's preceding arguments to preserve help order.
    for diff_parser in (create_workspace, inspect_setup, save_workspace, start_prompt_only_scan):
        diff_parser.add_argument("--diff-target-kind", choices=DIFF_TARGET_KINDS)
        diff_parser.add_argument("--diff-base-revision")
        diff_parser.add_argument("--diff-head-revision")
        diff_parser.add_argument("--diff-content-digest")

    if inspection_only:
        # Unknown arguments use the full parser below for its normal usage diagnostic.
        args, unknown = parser.parse_known_args()
        if not unknown:
            return args

    start_headless_standard_scan = add_command(
        "start-headless-standard-scan", "--thread-id", "--target-path", "--scope"
    )
    start_headless_standard_scan.add_argument("--target-summary")
    add_user_context(start_headless_standard_scan)
    for scan_parser in (start_scan, start_prompt_only_scan, start_headless_standard_scan):
        scan_parser.add_argument("--scan-root")
        scan_parser.add_argument("--model")
        scan_parser.add_argument("--reasoning-effort")
    start_headless_standard_scan.set_defaults(
        mode="standard",
        diff_target_kind=None,
        diff_base_revision=None,
        diff_head_revision=None,
        diff_content_digest=None,
    )

    begin_deep_scan = add_command("begin-deep-scan", "--thread-id")
    begin_deep_scan.add_argument("--model-thread-id")
    begin_target = begin_deep_scan.add_mutually_exclusive_group(required=True)
    begin_target.add_argument("--scan-id")
    begin_target.add_argument("--target-path")
    begin_deep_scan.add_argument("--scope", default=".")
    add_user_context(begin_deep_scan)
    begin_deep_scan.add_argument("--scan-root")
    begin_deep_scan.add_argument("--claim-token")
    begin_deep_scan.add_argument("--model")
    begin_deep_scan.add_argument("--reasoning-effort")
    begin_deep_scan.add_argument("--service-tier")
    begin_deep_scan.add_argument("--available-parallelism", type=positive_int)
    begin_deep_scan.add_argument("--deep-scan-project-json")
    begin_deep_scan.add_argument("--project-config-path")
    begin_deep_scan.add_argument("--join-only", action="store_true")
    begin_deep_scan.add_argument("--workflow-version", default="deep-security-scan/v1")

    add_command("get-deep-scan", "--scan-id", "--thread-id")

    add_command("acknowledge-deep-scan-result", "--scan-id")

    claim_coordinator = add_command("claim-deep-scan-coordinator", "--scan-id", "--thread-id")
    claim_coordinator.add_argument("--claim-token")
    claim_coordinator.add_argument("--coordinator-generation", type=positive_int)

    upsert_deep_worker = add_command("upsert-deep-scan-worker", "--scan-id", "--worker-id")
    upsert_deep_worker.add_argument(
        "--kind", choices=("setup", "discovery", "dedup"), required=True
    )
    upsert_deep_worker.add_argument(
        "--status", choices=("queued", "running", "succeeded", "failed", "canceled"), required=True
    )
    upsert_deep_worker.add_argument("--prompt-path", required=True)
    upsert_deep_worker.add_argument("--artifact-dir", required=True)
    upsert_deep_worker.add_argument("--result-manifest-path")
    upsert_deep_worker.add_argument("--attempt", type=non_negative_int)
    upsert_deep_worker.add_argument("--sdk-thread-id")
    upsert_deep_worker.add_argument("--error-message")
    upsert_deep_worker.add_argument("--terminal-failure", action="store_true")
    upsert_deep_worker.add_argument(
        "--replaceable-failure-kind",
        choices=("policy_refusal", "transient_error", "invalid_discovery_artifacts"),
    )
    upsert_deep_worker.add_argument("--coordinator-generation", type=positive_int)

    iteration = add_command(
        "record-deep-scan-iteration", "--scan-id", "--worker-id", "--result-manifest-path"
    )
    iteration.add_argument("--input-worker-id", action="append", required=True)
    iteration.add_argument("--no-new-streak", type=non_negative_int, required=True)
    iteration.add_argument("--consecutive-errors", type=non_negative_int, required=True)
    iteration.add_argument("--coordinator-generation", type=positive_int)

    finish_deep_scan = add_command("finish-deep-scan", "--scan-id")
    finish_deep_scan.add_argument(
        "--terminal-reason", choices=("saturated", "capped"), required=True
    )
    finish_deep_scan.add_argument("--manifest-path", required=True)
    finish_deep_scan.add_argument("--staged-manifest-path")
    finish_deep_scan.add_argument("--omitted-worker-id", action="append", default=[])
    finish_deep_scan.add_argument("--coordinator-generation", type=positive_int)

    fail_deep_scan = add_command("fail-deep-scan", "--scan-id", "--message")
    fail_deep_scan.add_argument("--manifest-path")
    fail_deep_scan.add_argument("--staged-manifest-path")
    fail_deep_scan.add_argument(
        "--deep-status", choices=("failed", "interrupted"), default="failed"
    )
    fail_deep_scan.add_argument("--coordinator-generation", type=positive_int)

    publication_failure = add_command(
        "record-deep-scan-publication-failure", "--scan-id", "--message"
    )
    publication_failure.add_argument("--coordinator-generation", type=positive_int)

    get_scan = add_command("get-scan", "--scan-id")
    get_scan.add_argument("--model-thread-id")
    get_scan.add_argument("--context-claim-token")
    get_scan.add_argument("--request-id")
    get_scan.add_argument("--action-token")
    detail = get_scan.add_mutually_exclusive_group()
    detail.add_argument("--occurrence-id")
    detail.add_argument("--progress-only", action="store_true")
    get_scan.add_argument("--check-target", action="store_true")

    add_command("rename-scan", "--scan-id", "--name")

    read_scan_usage = add_command("read-scan-usage", "--scan-id", "--thread-id")
    read_scan_usage.add_argument("--validation-thread-id")

    add_command("get-scan-feedback", "--scan-id")

    update_scan_context = add_command("update-scan-context", "--scan-id")
    add_user_context(update_scan_context, required=True)
    update_scan_context_owner = update_scan_context.add_mutually_exclusive_group(required=True)
    update_scan_context_owner.add_argument("--workspace-id")
    update_scan_context_owner.add_argument("--thread-id")
    update_scan_context.add_argument("--claim-token")

    list_scans = subparsers.add_parser("list-scans")
    list_scans.add_argument("--query")
    list_scans.add_argument("--target-id")
    list_scans.add_argument("--status", choices=("running", "complete", "failed", "canceled"))
    list_scans.add_argument("--mode", choices=MODES)
    list_scans.add_argument("--repository")
    list_scans.add_argument(
        "--prefer-worktree", action="store_true", help="List scans from this checkout first."
    )
    list_scans.add_argument("--scan-root")
    list_scans.add_argument("--offset", type=non_negative_int, default=0)
    list_scans.add_argument("--limit", type=positive_int)

    list_unmatched_scan_pairs = add_command("list-unmatched-scan-pairs", "--repository")
    list_unmatched_scan_pairs.add_argument("--after-scan-id")
    list_unmatched_scan_pairs.add_argument("--force", action="store_true")

    register_cli_scan = add_command("register-cli-scan", "--scan-dir", "--repository")
    recipe = register_cli_scan.add_mutually_exclusive_group(required=True)
    recipe.add_argument("--recipe-json")
    recipe.add_argument("--recipe-json-stdin", action="store_true")
    recipe.add_argument("--registration-json-stdin", action="store_true")
    register_cli_scan.add_argument("--parent-scan-id")
    register_cli_scan.add_argument(
        "--archive-existing",
        action="store_true",
        help="Archive output in the registration transaction. Supports cancellable archival preparation.",
    )
    register_cli_scan.add_argument("--archived-scan-dir")

    restore_cli_scan_archive = subparsers.add_parser("restore-cli-scan-archive")
    restore_cli_scan_archive.add_argument("--scan-dir", required=True)
    restore_cli_scan_archive.add_argument("--archived-scan-dir", required=True)
    previous_scan = restore_cli_scan_archive.add_mutually_exclusive_group(required=True)
    previous_scan.add_argument("--previous-scan-id")
    previous_scan.add_argument("--previous-scan-absent", action="store_true")

    set_scan_thread = subparsers.add_parser("set-scan-thread")
    set_scan_thread.add_argument("--scan-id", required=True)
    set_scan_thread.add_argument("--thread-id", required=True)
    set_scan_thread.add_argument("--time-budget-started-at")

    set_scan_cost_limit = add_command("set-scan-cost-limit", "--scan-id")
    set_scan_cost_limit.add_argument("--max-cost-usd", required=True, type=float)

    add_command("get-scan-recipe", "--scan-id")

    get_cli_scan_resume = add_command("get-cli-scan-resume", "--scan-id")
    get_cli_scan_resume.add_argument("--allow-unavailable", action="store_true")

    compare_scans = add_command("compare-scans", "--before-scan-id", "--after-scan-id")
    compare_scans.add_argument("--include-matching-inputs", action="store_true")
    compare_scans.add_argument("--require-matches", action="store_true")

    save_scan_comparison = subparsers.add_parser(
        "save-scan-comparison",
        description="Comparison payload supports related findings.",
    )
    save_scan_comparison.add_argument("--before-scan-id", required=True)
    save_scan_comparison.add_argument("--after-scan-id", required=True)
    matches = save_scan_comparison.add_mutually_exclusive_group(required=True)
    matches.add_argument("--matches-json")
    matches.add_argument("--matches-json-stdin", action="store_true")

    list_global_findings = subparsers.add_parser("list-global-findings")
    list_global_findings.add_argument("--query")
    list_global_findings.add_argument("--severity", choices=FINDING_SEVERITIES)
    list_global_findings.add_argument("--status", choices=FINDING_STATUSES)
    finding_repository = list_global_findings.add_mutually_exclusive_group()
    finding_repository.add_argument("--target-id")
    finding_repository.add_argument("--repository")
    list_global_findings.add_argument("--offset", type=non_negative_int, default=0)
    list_global_findings.add_argument("--limit", type=positive_int, default=FINDINGS_PAGE_MAX)
    list_repositories = subparsers.add_parser("list-repositories")
    list_repositories.add_argument("--query")
    list_repositories.add_argument("--target-id")
    list_repositories.add_argument("--status", choices=("scanned", "not_scanned", "open_findings"))
    list_repositories.add_argument("--offset", type=non_negative_int, default=0)
    list_repositories.add_argument("--limit", type=positive_int)

    list_findings = add_command("list-findings", "--scan-id")
    list_findings.add_argument("--query")
    list_findings.add_argument("--severity", choices=FINDING_SEVERITIES)
    list_findings.add_argument("--status", choices=FINDING_STATUSES)
    list_findings.add_argument("--offset", type=non_negative_int, default=0)
    list_findings.add_argument("--limit", type=positive_int, default=FINDINGS_PAGE_MAX)

    update_progress = add_command("update-progress", "--scan-id")
    update_progress.add_argument("--model-update", action="store_true")
    update_progress.add_argument(
        "--refresh-scope-file-count", action="store_true", help=argparse.SUPPRESS
    )
    update_progress.add_argument("--model-thread-id")
    update_progress.add_argument("--phase", choices=PHASES)
    update_progress.add_argument("--phase-items-total", type=non_negative_int)
    update_progress.add_argument("--phase-items-completed", type=non_negative_int)
    update_progress.add_argument("--phase-progress-unit", choices=PHASE_PROGRESS_UNITS)
    update_progress.add_argument("--review-items-total", type=non_negative_int)
    update_progress.add_argument("--review-items-completed", type=non_negative_int)
    update_progress.add_argument("--reportable-findings-count", type=non_negative_int)
    update_progress.add_argument("--deep-review-pass", type=positive_int)
    update_progress.add_argument("--claim-token")
    update_progress.add_argument("--coordinator-generation", type=positive_int)
    update_progress.add_argument("--model")
    update_progress.add_argument("--reasoning-effort")

    prepare_scan_completion = add_command("prepare-scan-completion", "--scan-id")
    prepare_scan_completion.add_argument("--claim-token")

    complete_scan = add_command("complete-scan", "--scan-id")
    complete_scan.add_argument("--model-thread-id")
    complete_scan.add_argument("--claim-token")
    complete_scan.add_argument("--cost-json")
    complete_scan.add_argument("--thread-id")
    complete_scan.add_argument("--turn-id")

    finalize_scan_usage = add_command(
        "finalize-scan-usage", "--scan-id", "--thread-id", "--turn-id"
    )
    finalize_scan_usage.add_argument(
        "--turn-status", choices=("completed", "interrupted", "failed"), default="completed"
    )

    complete_budget_exhausted_scan = add_command(
        "complete-budget-exhausted-scan", "--scan-id", "--cost-json"
    )
    complete_budget_exhausted_scan.add_argument("--message")

    cancel_scan = add_command("cancel-scan", "--scan-id")
    cancel_scan.add_argument("--thread-id")
    cancel_scan.add_argument("--cost-json")

    fail_scan = add_command("fail-scan", "--scan-id", "--message")
    fail_scan.add_argument("--model-thread-id")
    fail_scan.add_argument("--claim-token")
    fail_scan.add_argument("--cost-json")

    preserve_scan = add_command("preserve-scan-results", "--scan-id")
    preserve_scan.add_argument("--thread-id")
    preserve_scan.add_argument("--claim-token")
    preserve_scan.add_argument("--coordinator-generation", type=positive_int)

    recovery_help = "Validate and republish retained checkpoints for a failed, non-canceled scan."
    recover_scan = subparsers.add_parser(
        "recover-scan-results", help=recovery_help, description=recovery_help
    )
    recover_scan.add_argument("--scan-id", required=True, help="ID of the stopped scan to recover.")

    write_scan_draft = add_command("write-scan-draft", "--scan-id", "--draft-path")
    write_scan_draft.add_argument("--model-thread-id")
    write_scan_draft.add_argument("--checkpoint-path")
    write_scan_draft.add_argument("--expected-draft-digest")
    write_scan_draft.add_argument("--claim-token")

    save_scan_artifact = add_command("save-scan-artifact", "--scan-id", "--artifact-path")
    save_scan_artifact.add_argument("--model-thread-id")
    save_scan_artifact.add_argument("--claim-token")

    for command in ("save-artifact", "read-artifact"):
        add_command(command, "--artifact-root", "--artifact-path")

    mark_handoff_delivered = add_command("mark-handoff-delivered", "--scan-id", "--claim-token")
    mark_handoff_delivered.add_argument("--thread-id")
    mark_handoff_delivered.add_argument("--return-context", action="store_true")
    mark_handoff_delivered.add_argument("--occurrence-id")

    claim_handoff_delivery = add_command("claim-handoff-delivery", "--scan-id", "--claim-token")
    claim_handoff_delivery.add_argument("--take-over-stale", action="store_true")

    add_command("release-handoff-delivery", "--scan-id", "--claim-token")

    add_command("attach-scan-continuation-thread", "--scan-id", "--claim-token", "--thread-id")

    set_finding_triage = add_command("set-finding-triage", "--occurrence-id")
    set_finding_triage.add_argument("--status", choices=FINDING_STATUSES, required=True)
    set_finding_triage.add_argument("--close-reason", choices=FINDING_CLOSE_REASONS)
    set_finding_triage.add_argument("--note")

    add_command("request-finding-remediation", "--occurrence-id", "--request-id", "--action-token")

    request_finding_remediation_action = add_command(
        "request-finding-remediation-action", "--occurrence-id", "--request-id"
    )
    request_finding_remediation_action.add_argument(
        "--expected-version", type=positive_int, required=True
    )
    request_finding_remediation_action.add_argument(
        "--action", choices=("apply", "verify"), required=True
    )
    request_finding_remediation_action.add_argument("--action-token", required=True)

    for command in (
        "claim-finding-remediation-resend",
        "mark-finding-remediation-delivered",
        "release-finding-remediation-claim",
        "cancel-finding-remediation-request",
    ):
        add_command(command, "--occurrence-id", "--request-id", "--action-token")

    set_finding_remediation = add_command(
        "set-finding-remediation", "--occurrence-id", "--request-id", "--action-token"
    )
    set_finding_remediation.add_argument("--expected-version", type=positive_int, required=True)
    set_finding_remediation.add_argument(
        "--state", choices=REMEDIATION_UPDATE_STATES, required=True
    )
    set_finding_remediation.add_argument("--assigned-finding", action="store_true")
    set_finding_remediation.add_argument("--summary")
    set_finding_remediation.add_argument("--patch-stdin", action="store_true")
    set_finding_remediation.add_argument("--patch-path")
    set_finding_remediation.add_argument("--patch-digest")
    set_finding_remediation.add_argument("--base-revision")
    set_finding_remediation.add_argument("--verification-summary")

    export_findings = add_command("export-findings", "--scan-id")
    export_findings.add_argument(
        "--artifact", choices=("findings", "threat-model"), default="findings"
    )
    export_findings.add_argument("--format", choices=(*EXPORT_FORMATS, "md"))
    export_findings.add_argument("--validate-only", action="store_true")

    subparsers.add_parser("finding-issues")

    subparsers.add_parser("database-info")
    subparsers.add_parser("finding-workflow")
    args = parser.parse_args()
    if getattr(args, "user_context_stdin", False):
        args.user_context = sys.stdin.buffer.read().decode("utf-8")
        args.user_context_stdin = False
    return args

if __name__ == "__main__":
    parse_args(__doc__)
```

## File: `scripts/workbench_constants.py`

```python
"""Shared constants for the Codex Security workbench."""

import argparse

MODES = ("diff", "standard", "deep")
DIFF_TARGET_KINDS = ("working_tree", "commit", "range")
PHASES = ("preflight", "threat_model", "discovery", "validation", "attack_path", "reporting")
PHASE_PROGRESS_UNITS = (
    "checks",
    "threat_surfaces",
    "review_receipts",
    "candidate_findings",
    "validated_findings",
    "report_artifacts",
)
FINDING_SEVERITIES = ("critical", "high", "medium", "low", "informational")
FINDING_STATUSES = ("open", "closed")
FINDING_CLOSE_REASONS = ("already_fixed", "wont_fix", "false_positive")
REMEDIATION_UPDATE_STATES = ("generated", "applied", "verifying", "verified", "failed")
EXPORT_FORMATS = ("csv", "json", "sarif")
ARTIFACTS = {
    "findings": "findings.json",
    "manifest": "scan-manifest.json",
    "markdownReport": "report.md",
}
SQLITE_RETRY_ATTEMPTS = 5
CLAIM_LEASE_SECONDS = 120
DELIVERED_ACTION_LEASE_SECONDS = 900
PATCH_PREVIEW_BYTES = 16_000
FINDINGS_RESULT_LIMIT = 20
FINDINGS_PAGE_MAX = 20
FINDING_DETAILS_PREVIEW_BYTES = 16_000
FINDING_ROOT_CAUSE_PREVIEW_BYTES = 2_000
FINDING_VALIDATION_PREVIEW_BYTES = 3_000
FINDING_ATTACK_PATH_PREVIEW_BYTES = 4_000
FINDING_CODE_EVIDENCE_LIMIT = 4
FINDING_CODE_EVIDENCE_SNIPPET_BYTES = 1_500
FINDING_EVIDENCE_EXCERPT_BYTES = 8_000
FINDING_LOCATION_ORDER_SQL = "CASE WHEN role = 'root_control' THEN 0 ELSE 1 END, sort_order"
# The outer query binds finding_occurrences as occurrences.
PRIMARY_FINDING_LOCATION_SQL = f"""
    FROM finding_locations
    WHERE occurrence_id = occurrences.id
    ORDER BY {FINDING_LOCATION_ORDER_SQL}
    LIMIT 1
"""
FINDING_LOCATIONS_LIMIT = 8
FINDING_TITLE_BYTES = 512
FINDING_SUMMARY_BYTES = 2_000
FINDING_REMEDIATION_BYTES = 2_000
FINDING_LOCATION_PATH_BYTES = 2_048
FINDING_LOCATION_ROLE_BYTES = 128
FINDING_ABSOLUTE_PATH_BYTES = 4_096
FINDING_LEVEL_BYTES = 128
GIT_REPOSITORY_ENVIRONMENT = (
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_CEILING_DIRECTORIES",
    "GIT_COMMON_DIR",
    "GIT_DIR",
    "GIT_DISCOVERY_ACROSS_FILESYSTEM",
    "GIT_GLOB_PATHSPECS",
    "GIT_ICASE_PATHSPECS",
    "GIT_INDEX_FILE",
    "GIT_NAMESPACE",
    "GIT_OBJECT_DIRECTORY",
    "GIT_WORK_TREE",
)
EMPTY_GIT_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
EMPTY_GIT_TREES = {
    "sha1": EMPTY_GIT_TREE,
    "sha256": "6ef19b41225c5369f1c104d45d8d85efa9b057b53b14b4b9b939dd74decc5321",
}

def optional_text(value: str | None, *, maximum: int | None = None) -> str | None:
    """Strip surrounding whitespace, return None for blank text, and enforce the character limit."""
    if value is None:
        return None
    normalized = value.strip()
    if maximum is not None and len(normalized) > maximum:
        raise SystemExit(f"Text value must be no longer than {maximum} characters.")
    return normalized or None

def positive_int(value: str) -> int:
    """Parse a CLI count and reject values below one with an argparse validation error."""
    parsed = int(value)
    if parsed < 1:
        raise argparse.ArgumentTypeError("expected a positive integer")
    return parsed

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_coverage_receipts.py`

```python
"""Resolve accepted worker receipt references without changing their ownership."""

from __future__ import annotations

import copy
import os
from collections.abc import Callable, Sequence
from pathlib import Path, PurePosixPath
from typing import Any

from finalize_scan_contract import (
    ContractError,
    MissingScanLocalFileError,
    _require_portable_relative_path,
    _require_str,
    _validate_schema_node,
    open_scan_local_file_descriptor,
    path_within_scope,
)
from workbench.saved_coverage import _project_worker_coverage_row, _saved_coverage_id

def capture_receipt_checkpoints(
    relative: str,
    kind: str | None,
    captured: dict[str, tuple[str, int]],
    checkpoint_paths: Callable[[str], list[str]],
    read_checkpoint: Callable[[str], tuple[dict[str, Any], str, int]],
) -> dict[str, tuple[str, int]]:
    """Bind a captured worker result to checkpoints visible after reading it."""
    if kind == "discovery" and Path(relative).name == "result.json":
        directory = (Path(relative).parent / "checkpoints").as_posix()
        for path in checkpoint_paths(directory):
            try:
                _, digest, observed = read_checkpoint(path)
            except (ContractError, OSError, ValueError):
                continue
            captured[path] = (digest, observed)
    return captured

def receipt_checkpoints(
    relative: str,
    worker_id: str | None,
    known: dict[str, str | None],
    checkpoint_paths: Callable[[str], list[str]],
) -> dict[str, str]:
    """Capture host checkpoints written after enumeration but before result.json."""
    if worker_id is None or Path(relative).name != "result.json":
        return {}
    directory = (Path(relative).parent / "checkpoints").as_posix()
    added = {path: worker_id for path in checkpoint_paths(directory) if path not in known}
    known.update(added)
    return added

def retain_recorded_receipt_ownership(
    sources: list[tuple[str, dict[str, Any], str | None]],
    digest: Callable[[Any], str],
    include_paths: Sequence[str],
    finding_scope: Sequence[tuple[str, bool]] | None = None,
) -> None:
    # Checkpoints are written by the host tool; direct result files can be authored
    # without it. Compare the entire payload within the same worker attempt.
    def payload_digest(draft: dict[str, Any]) -> str:
        return digest({key: value for key, value in draft.items() if key != "handoffClaimToken"})

    scope = (
        finding_scope if finding_scope is not None else [(path, False) for path in include_paths]
    )
    recorded: dict[Path, set[str]] = {}
    for relative, draft, worker_id in sources:
        directory = Path(relative).parent
        if worker_id is not None and directory.name == "checkpoints":
            payloads = recorded.setdefault(directory.parent, set())
            payloads.add(payload_digest(draft))
            if "." not in include_paths:
                # Legacy writers saved the checkpoint before filtering inherited findings.
                scoped = [
                    finding
                    for finding in draft["findings"]
                    if isinstance(finding, dict)
                    and isinstance(finding.get("locations"), list)
                    and any(
                        isinstance(location, dict)
                        and isinstance(location.get("path"), str)
                        and any(
                            PurePosixPath(location["path"]) == PurePosixPath(path)
                            if is_file
                            else path_within_scope(location["path"], path)
                            for path, is_file in scope
                        )
                        for location in finding["locations"]
                    )
                ]
                payloads.add(payload_digest({**draft, "findings": scoped}))
    for relative, draft, worker_id in sources:
        directory = Path(relative).parent
        if worker_id is None or directory.name == "checkpoints":
            continue
        if payload_digest(draft) in recorded.get(directory, set()):
            continue
        surfaces = draft["reviewState"].get("surfaces", [])
        for surface in surfaces if isinstance(surfaces, list) else []:
            if isinstance(surface, dict) and isinstance(surface.get("provenance"), dict):
                surface["provenance"].pop("scanReceiptRefs", None)

def resolve_coverage_receipts(
    scan_dir: Path, item: dict[str, Any], worker: Any, relative: str
) -> Any:
    """Qualify worker receipt references relative to their source checkpoint for use in parent coverage."""
    refs = item.get("receiptRefs", [])
    if not isinstance(refs, list):
        return refs
    directory = Path(relative).parent
    if directory.name == "checkpoints":
        directory = directory.parent
    output = Path(worker["artifact_dir"]).relative_to(scan_dir)
    worker_prefix = (output.parent if output.name == "output" else output).as_posix() + "/"
    active_prefix = output.as_posix() + "/"
    if directory != output:
        refs = [
            f"{directory.as_posix()}/{Path(ref).as_posix()[len(active_prefix) :]}"
            if isinstance(ref, str) and Path(ref).as_posix().startswith(active_prefix)
            else ref
            for ref in refs
        ]

    def scan_receipt(ref: str) -> bool:
        try:
            descriptor = open_scan_local_file_descriptor(scan_dir, ref, "coverage receipt")
        except (ContractError, OSError):
            return False
        os.close(descriptor)
        return True

    def qualified_receipt(ref: Any) -> Any:
        if not isinstance(ref, str):
            return ref
        try:
            normalized = _require_portable_relative_path(ref, "Worker coverage receipt")
        except ContractError:
            return ref  # Leave malformed references to per-record recovery.
        if not normalized.startswith("artifacts/"):
            # A worker prefix must not make result.json a valid coverage receipt.
            return ref
        ref = normalized
        provenance = item.get("provenance")
        inherited_scan_refs = (
            provenance.get("scanReceiptRefs", []) if isinstance(provenance, dict) else []
        )
        if ref.startswith(worker_prefix) or (
            isinstance(inherited_scan_refs, list) and ref in inherited_scan_refs
        ):
            return ref
        local_ref = Path(f"{directory}/{ref}").as_posix()
        return local_ref if scan_receipt(local_ref) or not scan_receipt(ref) else ref

    return [qualified_receipt(ref) for ref in refs]

def _deferred_candidate_id(
    row: dict[str, Any],
    owner: str | None,
    ambiguous_deferred: set[tuple[str | None, str]],
) -> str | None:
    identity = row.get("candidateId") or row.get("id")
    if not isinstance(identity, str):
        return None
    if (owner, identity) in ambiguous_deferred and not any(
        key in row for key in ("candidateId", "candidate", "finding")
    ):
        return None
    return identity

def _generic_surface_updates(
    sources: list[tuple[str, dict[str, Any], str | None]],
    closed_deferred: dict[tuple[str | None, str], tuple[tuple[int, int], dict[str, Any], str]],
    active_deferred: dict[tuple[str | None, str], tuple[tuple[int, int], dict[str, Any], str]],
    resolved_candidates: dict[tuple[str | None, str], str],
    reopened_generic: set[tuple[str | None, str]],
    surface_schema: dict[str, Any],
    deferred_rows: dict[str, list[Any]],
    ambiguous_deferred: set[tuple[str | None, str]],
    record_source: Any,
    record_order: Any,
    surface_receipts: Any,
    *,
    canonical_rows: set[int] | None = None,
    coverage_sources: dict[int, tuple[dict[str, Any], list[str]]] | None = None,
    surface_is_retained: Any = None,
    eligible_receipt_sources: set[str] | None = None,
    receipt_root: Path | None = None,
    receipt_warnings: list[str] | None = None,
    fallback_surfaces: list[dict[str, Any]] | None = None,
) -> tuple[set[int], list[tuple[str, str | None, dict[str, Any], dict[str, Any]]]]:
    if not closed_deferred and not reopened_generic and receipt_root is None:
        return set(), []

    def receipt_error(ref: Any) -> ContractError | None:
        if receipt_root is None or not isinstance(ref, str):
            return ContractError("Saved coverage receipt is unavailable.")
        try:
            descriptor = open_scan_local_file_descriptor(
                receipt_root, ref, "Saved coverage receipt"
            )
            os.close(descriptor)
        except ContractError as exc:
            return exc
        return None

    def record_key(field: str, owner: str | None, row: dict[str, Any]) -> tuple[str | None, Any]:
        source_owner, original = record_source(field, owner, row)
        identity = original.get("id")
        return source_owner, identity if isinstance(identity, str) else None

    def linked(row: dict[str, Any], identity: str | None, owner: str | None) -> bool:
        _, row = record_source("deferred", owner, row)
        surface_ids = row.get("surfaceIds", [])
        return identity is not None and (
            row.get("id") == identity or (isinstance(surface_ids, list) and identity in surface_ids)
        )

    saved_surfaces: dict[tuple[str | None, str], list[tuple[str, dict[str, Any]]]] = {}
    for relative, draft, owner in sources:
        rows = draft["reviewState"].get("surfaces", [])
        for row in rows if isinstance(rows, list) else []:
            if isinstance(row, dict) and isinstance(row.get("id"), str):
                saved_surfaces.setdefault(record_key("surfaces", owner, row), []).append(
                    (relative, row)
                )
    replaced: set[int] = set()
    updates: list[tuple[str, str | None, dict[str, Any], dict[str, Any]]] = []
    # Current selections across all surfaces take precedence over historical refs.
    receipt_paths: dict[str, str] = {}
    retained_surfaces: dict[tuple[str | None, str], dict[str, Any]] = {}
    if receipt_root is not None:
        receipt_surfaces: list[tuple[str | None, dict[str, Any]]] = []
        for key, matches in saved_surfaces.items():
            retained = [
                match for match in matches if surface_is_retained(match[0], key[0], match[1])
            ]
            if not retained:
                continue
            latest_source, latest_surface = max(
                retained, key=lambda match: record_order(match[0], key[0], match[1])
            )
            retained_surfaces[key] = latest_surface
            receipt_surfaces.extend(
                (key[0], row)
                for relative, row in retained
                if record_order(relative, key[0], row)
                == record_order(latest_source, key[0], latest_surface)
            )
        for relative, draft, owner in sources:
            rows = draft["reviewState"].get("surfaces", [])
            for row in rows if isinstance(rows, list) else []:
                if (
                    isinstance(row, dict)
                    and "id" not in row
                    and surface_is_retained(relative, owner, row)
                ):
                    receipt_surfaces.append((owner, row))
        receipt_surfaces.extend((None, row) for row in fallback_surfaces or [])
        for owner, latest_surface in receipt_surfaces:
            # Recovery repairs disposition and receipts before validating row
            # metadata. A row discarded there cannot reserve a receipt spelling.
            metadata = _project_worker_coverage_row(latest_surface, owner, "surfaces")
            metadata.setdefault("id", _saved_coverage_id(metadata))
            metadata.update(disposition="needs_follow_up", receiptRefs=[])
            try:
                _require_str(metadata, "id", "coverage.surfaces")
                _validate_schema_node(metadata, surface_schema, "coverage.surfaces")
            except ContractError:
                continue
            refs = latest_surface.get("receiptRefs", [])
            for ref in refs if isinstance(refs, list) else []:
                if receipt_error(ref) is None:
                    normalized = _require_portable_relative_path(ref, "Saved coverage receipt")
                    receipt_paths.setdefault(normalized.lower(), normalized)
    for relative, draft, owner in sources:
        current = draft["reviewState"].get("surfaces", [])
        for surface in current if isinstance(current, list) else []:
            if not isinstance(surface, dict):
                continue
            surface_owner, identity = record_key("surfaces", owner, surface)
            closed_ids = {
                identity
                for (saved_owner, identity), (_, _, source) in closed_deferred.items()
                if saved_owner == surface_owner and source == relative
            }
            reopened_ids = {
                identity
                for (saved_owner, identity), (_, _, source) in active_deferred.items()
                if saved_owner == surface_owner
                and source == relative
                and (owner, identity) in reopened_generic
            }
            reopening = surface.get("disposition") == "needs_follow_up"
            work_ids = reopened_ids if reopening else closed_ids
            repair_only = not work_ids
            if repair_only and receipt_root is None:
                continue
            if not isinstance(identity, str):
                continue
            matches = saved_surfaces[(surface_owner, identity)]
            # Receipt repair alone cannot close or reopen a saved surface.
            if repair_only and any(
                row.get("disposition") != surface.get("disposition") for _, row in matches
            ):
                continue
            # Older writers could assign one ID to distinct surfaces in a draft.
            # A closure cannot identify which of those observations it replaces.
            by_source = dict(matches)
            if any(row != by_source[saved_path] for saved_path, row in matches):
                continue
            if any(
                "candidateId" in row or "candidate" in row or "finding" in row for _, row in matches
            ):
                continue
            if any(
                row is not surface
                and record_order(saved_path, surface_owner, row)
                >= record_order(relative, surface_owner, surface)
                and row.get("disposition") != surface.get("disposition")
                for saved_path, row in matches
            ):
                continue

            if not reopening and any(
                saved_owner == surface_owner
                and (
                    not isinstance(row.get("id") or row.get("candidateId"), str)
                    or (
                        isinstance(row.get("id"), str)
                        and (owner, row["id"]) in ambiguous_deferred
                        and not any(key in row for key in ("candidateId", "candidate", "finding"))
                    )
                )
                and linked(row, identity, saved_owner)
                for saved_path, _, saved_owner in sources
                for row in deferred_rows[saved_path]
                if isinstance(row, dict)
            ):
                continue
            if not reopening and any(
                saved_owner == surface_owner
                and (owner, deferred_id) not in closed_deferred
                and (
                    (candidate_id := _deferred_candidate_id(row, owner, ambiguous_deferred)) is None
                    or (owner, candidate_id) not in resolved_candidates
                )
                and linked(row, identity, saved_owner)
                for (saved_owner, deferred_id), (_, row, _) in active_deferred.items()
            ):
                continue
            # An accepted checkpoint can update a saved surface by ID without
            # optional surfaceIds links on its generic task.
            receipt_matches = [
                (saved_path, row)
                for saved_path, row in matches
                if receipt_root is None
                or saved_path in eligible_receipt_sources
                or surface_is_retained(saved_path, owner, row)
            ]
            if not receipt_matches:
                continue
            latest_relative, latest_surface = max(
                receipt_matches, key=lambda match: record_order(match[0], surface_owner, match[1])
            )
            target = (
                retained_surfaces.get((surface_owner, identity)) if repair_only else latest_surface
            )
            if target is None:
                continue
            update = copy.deepcopy(target)
            # Historical evidence can repair a retained row without promoting
            # an unselected observation's label, notes, or other metadata.
            refs = copy.deepcopy(surface_receipts(latest_relative, latest_surface))
            update["receiptRefs"] = refs
            replaced_receipt = False
            replacement_paths = dict(receipt_paths)
            if isinstance(refs, list):
                repaired = (
                    not reopening and bool(refs) and all(receipt_error(ref) is None for ref in refs)
                )
                if repaired:
                    for ref in refs:
                        normalized = _require_portable_relative_path(ref, "Saved coverage receipt")
                        key = normalized.lower()
                        if key in replacement_paths and replacement_paths[key] != normalized:
                            repaired = False
                            break
                        replacement_paths[key] = normalized
                for saved_relative, row in receipt_matches:
                    previous_refs = surface_receipts(saved_relative, row)
                    for ref in previous_refs if isinstance(previous_refs, list) else []:
                        if ref not in refs:
                            failure = receipt_error(ref) if repaired else None
                            replaceable = isinstance(failure, MissingScanLocalFileError)
                            if repaired and isinstance(ref, str):
                                try:
                                    normalized = _require_portable_relative_path(
                                        ref, "Saved coverage receipt"
                                    )
                                except ContractError as error:
                                    failure = error
                                    replaceable = True
                                else:
                                    key = normalized.lower()
                                    previous = replacement_paths.get(key)
                                    if previous is not None and previous != normalized:
                                        failure = ContractError(
                                            f"Saved coverage receipt: duplicate artifact path: {previous} and {normalized}"
                                        )
                                        replaceable = True
                                    elif not replaceable:
                                        replacement_paths[key] = normalized
                            if replaceable:
                                replaced_receipt = True
                                if receipt_warnings is not None:
                                    receipt_warnings.append(
                                        f"Replaced invalid saved coverage receipt {ref}: {failure}"
                                    )
                                continue
                            refs.append(ref)
            if repair_only and not replaced_receipt:
                continue
            try:
                _validate_schema_node(update, surface_schema, "coverage.surfaces")
            except ContractError:
                continue
            replaced_sources = {
                id(row)
                for _, row in matches
                if reopening
                or row.get("disposition") in {"needs_follow_up", surface.get("disposition")}
            }
            replaced.update(replaced_sources)
            entry = (latest_relative, surface_owner, latest_surface, update)
            if entry not in updates:
                receipt_paths.update(replacement_paths)
                updates.append(entry)
            retained = next(
                entry[3]
                for entry in updates
                if entry[:3] == (latest_relative, surface_owner, latest_surface)
                and entry[3] == update
            )
            if coverage_sources is not None:
                from workbench.retained_coverage import _inherit_coverage_sources

                _inherit_coverage_sources(
                    retained,
                    [latest_surface, *(row for _, row in matches if id(row) in replaced_sources)],
                    coverage_sources,
                )
            if canonical_rows is not None and id(latest_surface) in canonical_rows:
                canonical_rows.add(id(retained))
    return replaced, updates
```

## File: `scripts/workbench_db.py`

_146 KB, too large to embed. Read it in the repository._

## File: `scripts/workbench_feedback.py`

```python
"""Load reviewed false-positive feedback for a security scan."""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path
from typing import Any

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from workbench_constants import (
    FINDING_LOCATION_PATH_BYTES,
    FINDING_SUMMARY_BYTES,
    FINDING_TITLE_BYTES,
    PRIMARY_FINDING_LOCATION_SQL,
)
from workbench_native_indexes import _indexed_findings, _legacy_generations
from workbench_target_state import RepositoryIdentityCache
from workbench_validation import bounded_output_text

def get_scan_feedback(connection: sqlite3.Connection, scan: sqlite3.Row) -> dict[str, Any]:
    """Return reviewed false-positive decisions from other completed scans of the same target.

    For each finding, include the latest decision only if it closes the finding as a
    false positive with a nonblank reason. Prefer the root-control location in its preview.
    """
    identities = RepositoryIdentityCache(connection)
    scope = identities.scope_for_scan(scan)
    if not scope.available:
        return {"scanId": scan["id"], "targetId": scan["target_id"], "falsePositives": []}

    legacy_generations = _legacy_generations(connection, identities)
    indexed_findings = {
        occurrence_id: finding
        for finding in _indexed_findings(
            connection,
            identities=identities,
            scan_scope=scope,
            legacy_generations=legacy_generations,
        )
        for occurrence_id in finding["matched_occurrence_ids"]
    }
    source_filter, source_values = scope.sql(
        "source_scans", supports_generation=identities.supports_generation
    )
    source_generation = (
        "source_scans.repository_generation" if identities.supports_generation else "NULL"
    )
    legacy_generation = legacy_generations.get(scope.target_id)
    decision_generation = (
        f"COALESCE({source_generation}, ?)" if legacy_generation is not None else source_generation
    )
    decision_values = (
        (legacy_generation, legacy_generation) if legacy_generation is not None else ()
    )
    rows = connection.execute(
        f"""
        WITH ranked_decisions AS (
            SELECT occurrences.id AS occurrence_id, findings.id AS finding_id, findings.fingerprint, findings.rule_id,
                findings.identity_anchor, findings.identity_instance, occurrences.title,
                occurrences.summary, COALESCE(triage.status, 'open') AS triage_status,
                triage.close_reason, triage.note,
                COALESCE(triage.updated_at, source_scans.completed_at) AS updated_at,
                source_scans.id AS source_scan_id,
                source_scans.target_id,
                {source_generation} AS repository_generation,
                source_scans.completed_at AS source_completed_at,
                locations.relative_path, locations.start_line, locations.end_line, locations.role,
                ROW_NUMBER() OVER (
                    PARTITION BY findings.id, {decision_generation},
                        CASE WHEN {decision_generation} IS NULL THEN source_scans.target_id END
                    ORDER BY
                        julianday(upper(COALESCE(triage.updated_at, source_scans.completed_at))) DESC,
                        julianday(upper(source_scans.completed_at)) DESC,
                        source_scans.id DESC, occurrences.id DESC
                ) AS decision_rank
            FROM finding_occurrences AS occurrences
            JOIN findings ON findings.id = occurrences.finding_id
            JOIN scans AS source_scans ON source_scans.id = occurrences.scan_id
            LEFT JOIN finding_triage AS triage ON triage.occurrence_id = occurrences.id
            JOIN finding_locations AS locations ON locations.id = (
                SELECT id {PRIMARY_FINDING_LOCATION_SQL}
            )
            WHERE {source_filter}
                AND source_scans.id != ?
                AND source_scans.status = 'complete'
        )
        SELECT *
        FROM ranked_decisions
        WHERE decision_rank = 1
            AND triage_status = 'closed'
            AND close_reason = 'false_positive'
            AND note IS NOT NULL
            AND trim(note) != ''
        ORDER BY julianday(upper(updated_at)) DESC,
            julianday(upper(source_completed_at)) DESC,
            source_scan_id DESC, finding_id DESC
        """,
        (*decision_values, *source_values, scan["id"]),
    )
    false_positives = []
    reviewed_components: set[str] = set()
    for row in rows:
        finding = indexed_findings.get(row["occurrence_id"])
        if (
            finding is None
            or finding["status"] != "closed"
            or finding["close_reason"] != "false_positive"
            or finding["occurrence_id"] in reviewed_components
        ):
            continue
        reviewed_components.add(finding["occurrence_id"])

        identity = {"anchor": row["identity_anchor"]}
        if row["identity_instance"] is not None:
            identity["instance"] = row["identity_instance"]
        location = {
            "path": bounded_output_text(row["relative_path"], FINDING_LOCATION_PATH_BYTES),
            "startLine": row["start_line"],
            "endLine": row["end_line"],
        }
        if row["role"] is not None:
            location["role"] = row["role"]
        false_positives.append(
            {
                "findingId": row["finding_id"],
                "fingerprint": row["fingerprint"],
                "ruleId": row["rule_id"],
                "identity": identity,
                "title": bounded_output_text(row["title"], FINDING_TITLE_BYTES),
                "summary": bounded_output_text(row["summary"], FINDING_SUMMARY_BYTES),
                "reason": row["note"],
                "locations": [location],
                "sourceScanId": row["source_scan_id"],
                "updatedAt": row["updated_at"],
            }
        )
    return {"scanId": scan["id"], "targetId": scan["target_id"], "falsePositives": false_positives}

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_finding_index.py`

```python
"""Persist normalized scan findings and their occurrences."""

from __future__ import annotations

import argparse
import json
import sqlite3
from decimal import Decimal
from typing import Any

# Tag numbers so 10 and 10.0 compare equally without treating true as 1.
_finding_json = json.JSONDecoder(
    parse_int=lambda value: (Decimal(value),),
    parse_float=lambda value: (Decimal(value),),
)

def upsert_finding(
    connection: sqlite3.Connection,
    finding: dict[str, Any],
    timestamp: str,
    repository_id: str | None = None,
) -> None:
    current = connection.execute(
        "SELECT details_json FROM findings WHERE id = ?", (finding["findingId"],)
    ).fetchone()
    details = json.dumps(finding, allow_nan=False, sort_keys=True)
    # Preserve unchanged text without conflating JSON booleans and numbers.
    if (
        current is not None
        and current["details_json"] is not None
        and _finding_json.decode(current["details_json"]) == _finding_json.decode(details)
    ):
        details = current["details_json"]
    connection.execute(
        """
        INSERT INTO findings (
            id, fingerprint, rule_id, identity_anchor, identity_instance,
            details_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            fingerprint = excluded.fingerprint,
            rule_id = excluded.rule_id,
            identity_anchor = excluded.identity_anchor,
            identity_instance = excluded.identity_instance,
            details_json = excluded.details_json,
            updated_at = excluded.updated_at
        """,
        (
            finding["findingId"],
            finding["fingerprints"]["primary"],
            finding["ruleId"],
            finding["identity"]["anchor"],
            finding["identity"].get("instance"),
            details,
            timestamp,
            timestamp,
        ),
    )
    if repository_id is not None:
        connection.execute(
            "INSERT OR IGNORE INTO finding_repositories (repository_id, finding_id) VALUES (?, ?)",
            (repository_id, finding["findingId"]),
        )

def index_findings(
    connection: sqlite3.Connection,
    scan_id: str,
    document: dict[str, Any],
    timestamp: str,
) -> None:
    """Index findings for this scan and write occurrence and ordered location rows in the caller’s transaction."""
    repository_id = connection.execute(
        "SELECT target_id FROM scans WHERE id = ?", (scan_id,)
    ).fetchone()["target_id"]
    for finding in document["findings"]:
        severity = finding["severity"]
        confidence = finding["confidence"]
        upsert_finding(connection, finding, timestamp, repository_id)
        connection.execute(
            """
            INSERT INTO finding_occurrences (
                id, finding_id, scan_id, title, summary, severity, confidence, remediation,
                details_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                finding_id = excluded.finding_id,
                scan_id = excluded.scan_id,
                title = excluded.title,
                summary = excluded.summary,
                severity = excluded.severity,
                confidence = excluded.confidence,
                remediation = excluded.remediation,
                details_json = excluded.details_json
            """,
            (
                finding["occurrenceId"],
                finding["findingId"],
                scan_id,
                finding["title"],
                finding["summary"],
                severity["level"],
                confidence["level"],
                finding["remediation"],
                json.dumps(finding, allow_nan=False, sort_keys=True),
                timestamp,
            ),
        )
        connection.execute(
            "DELETE FROM finding_locations WHERE occurrence_id = ?",
            (finding["occurrenceId"],),
        )
        for index, location in enumerate(finding["locations"]):
            connection.execute(
                """
                INSERT INTO finding_locations (
                    occurrence_id, relative_path, start_line, end_line, role, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    finding["occurrenceId"],
                    location["path"],
                    location["startLine"],
                    location.get("endLine", location["startLine"]),
                    location.get("role"),
                    index,
                ),
            )

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_finding_workflows.py`

```python
"""Durable state for the opt-in local scan, publication, and dedupe workflow."""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import stat
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from workbench_scan_usage import stored_scan_cost_fields
from workbench_target import (
    UnreadableLocalFile,
    UnsupportedLocalFileType,
    directory_content_digest,
    git_bytes,
    git_revision,
)
from workbench_validation import _valid_legacy_scan_cost

WORKFLOW_BINDINGS = {
    "repositoryPath": "repository_path",
    "scanRequestDigest": "scan_request_digest",
    "scanId": "scan_id",
    "scanDir": "scan_dir",
    "artifactDigest": "artifact_digest",
    "destination": "destination",
}
WORKFLOW_STAGES = ("scan", "publish", "dedupe")

def _usable_cost_range(value: Any) -> bool:
    if not isinstance(value, dict) or value.get("context") != "unknown" or "max" not in value:
        return False
    minimum, maximum = value.get("min"), value["max"]
    return (
        type(minimum) in (int, float)
        and 0 <= minimum <= sys.float_info.max
        and (
            maximum is None
            or type(maximum) in (int, float)
            and minimum <= maximum <= sys.float_info.max
        )
    )

def _recorded_cost(value: str | None) -> dict[str, Any] | None:
    """Recover the SDK cost fields that are usable from this historical receipt."""
    try:
        cost = stored_scan_cost_fields(value).get("cost")
    except (TypeError, ValueError, RecursionError):
        return None
    if not _valid_legacy_scan_cost(cost):
        return None

    fields = (
        "model",
        "inputTokens",
        "cachedInputTokens",
        "cacheWriteInputTokens",
        "outputTokens",
        "estimatedUsd",
    )
    result = {field: cost[field] for field in fields}
    if isinstance(cost.get("cacheWriteInputTokensReported"), bool):
        result["cacheWriteInputTokensReported"] = cost["cacheWriteInputTokensReported"]
    bounds = cost.get("estimatedUsdRange")
    if _usable_cost_range(bounds):
        result["estimatedUsdRange"] = {field: bounds[field] for field in ("min", "max", "context")}

    pricing = cost.get("pricing")
    if (
        isinstance(pricing, dict)
        and pricing.get("serviceTier") == "standard"
        and pricing.get("context") == "short"
        and isinstance(pricing.get("source"), str)
        and isinstance(pricing.get("asOf"), str)
    ):
        details = {field: pricing[field] for field in ("source", "asOf", "serviceTier", "context")}
        rate_keys = ("input", "cacheRead", "cacheWrite", "output")
        for field in ("usdPerMillionTokens", "longContextUsdPerMillionTokens"):
            rates = pricing.get(field)
            if isinstance(rates, dict) and all(
                type(rates.get(key)) in (int, float) and 0 <= rates[key] <= sys.float_info.max
                for key in rate_keys
            ):
                details[field] = {key: rates[key] for key in rate_keys}
        if "usdPerMillionTokens" in details:
            result["pricing"] = details
    return result

def read_workflow(connection: sqlite3.Connection, workflow_id: str) -> dict[str, Any] | None:
    """Return the stored stages, scope, and available scan cost, or None if the workflow ID is unknown."""
    row = connection.execute(
        """SELECT w.*, s.cost_json FROM finding_workflows AS w
           LEFT JOIN scans AS s ON s.id = w.scan_id AND s.scan_dir = w.scan_dir
                               AND s.status = 'complete'
           WHERE w.id = ?""",
        (workflow_id,),
    ).fetchone()
    if row is None:
        return None
    state = {"id": row["id"], "stages": {}}
    if (cost := _recorded_cost(row["cost_json"])) is not None:
        state["recordedCost"] = cost
    for field, column in WORKFLOW_BINDINGS.items():
        if row[column] is not None:
            state[field] = row[column]
    if row["scope_repository_id"] is not None:
        state["scope"] = {"repositoryId": row["scope_repository_id"]}
    elif row["scope_all_repositories"] is not None:
        state["scope"] = {"allRepositories": bool(row["scope_all_repositories"])}
    results = json.loads(row["results_json"])
    for stage in WORKFLOW_STAGES:
        current = {"status": row[f"{stage}_status"]}
        if row[f"{stage}_error"] is not None:
            current["error"] = row[f"{stage}_error"]
        if stage in results:
            current["result"] = results[stage]
        state["stages"][stage] = current
    if "dedupePendingWrite" in results:
        state["stages"]["dedupe"]["pendingWrite"] = results["dedupePendingWrite"]
    return state

def save_workflow(connection: sqlite3.Connection, state: dict[str, Any], timestamp: str) -> None:
    """Insert or update the workflow bindings, scope, stage statuses, and saved results in the caller’s connection."""
    values = {"id": state["id"]}
    values.update({column: state.get(field) for field, column in WORKFLOW_BINDINGS.items()})
    scope = state.get("scope", {})
    values.update(
        scope_repository_id=scope.get("repositoryId"),
        scope_all_repositories=scope.get("allRepositories"),
    )
    results = {}
    for stage in WORKFLOW_STAGES:
        current = state["stages"][stage]
        values[f"{stage}_status"] = current["status"]
        values[f"{stage}_error"] = current.get("error")
        if "result" in current:
            results[stage] = current["result"]
    if "pendingWrite" in state["stages"]["dedupe"]:
        results["dedupePendingWrite"] = state["stages"]["dedupe"]["pendingWrite"]
    values.update(
        results_json=json.dumps(results, allow_nan=False),
        created_at=timestamp,
        updated_at=timestamp,
    )
    updates = ", ".join(
        f"{column} = excluded.{column}" for column in values if column not in {"id", "created_at"}
    )
    connection.execute(
        f"INSERT INTO finding_workflows ({', '.join(values)}) "
        f"VALUES ({', '.join('?' for _ in values)}) ON CONFLICT(id) DO UPDATE SET {updates}",
        tuple(values.values()),
    )

def bind_workflow(state: dict[str, Any], binding: dict[str, Any]) -> None:
    """Add bindings to the supplied state in place, raising SystemExit for unknown or conflicting fields."""
    for field, value in binding.items():
        if field not in WORKFLOW_BINDINGS and field != "scope":
            raise SystemExit("Unknown workflow binding.")
        if field in state and state[field] != value:
            raise SystemExit(
                f"Workflow {state['id']} is already bound to a different {field}. "
                "Use another --workflow-id."
            )
        state[field] = value

def register_workflow_scan(
    connection: sqlite3.Connection, workflow_id: str, scan_id: str, scan_dir: str, timestamp: str
) -> None:
    """Called inside the scan-registration transaction, before model execution."""
    state = read_workflow(connection, workflow_id)
    if state is None:
        raise SystemExit("The workflow must be started before registering its scan.")
    if state["stages"]["scan"]["status"] == "completed":
        raise SystemExit("The workflow scan is already complete.")
    previous = state.get("scanId")
    if previous is not None:
        row = connection.execute(
            """SELECT saved.status, saved.recipe_json AS saved, attempt.recipe_json AS attempt
               FROM scans AS saved JOIN scans AS attempt ON attempt.id = ? WHERE saved.id = ?""",
            (scan_id, previous),
        ).fetchone()
        if row is not None:
            if row["status"] == "complete":
                raise SystemExit(
                    "Reuse the workflow's completed scan instead of registering another."
                )
            saved = json.loads(row["saved"] or "{}")
            attempt = json.loads(row["attempt"] or "{}")
            if saved.get("severityRubric") != attempt.get("severityRubric"):
                raise SystemExit(
                    "Another attempt registered a different severity rubric. Retry this workflow to reuse its saved rubric."
                )
    state["scanId"] = scan_id
    state["scanDir"] = scan_dir
    save_workflow(connection, state, timestamp)

def finding_workflow(
    connection: sqlite3.Connection, payload: dict[str, Any], timestamp: str
) -> dict[str, Any]:
    """Dispatch a workflow request by ID and return its state, source snapshot, or review as the action specifies."""
    workflow_id = payload["id"]
    if not isinstance(workflow_id, str) or not workflow_id.strip():
        raise SystemExit("workflowId must be a nonempty string.")
    if payload["action"] == "get":
        return {"workflow": read_workflow(connection, workflow_id)}
    if payload["action"] == "source":
        evidence = payload.get("evidence") is True
        if evidence:
            try:
                target = Path(payload["repository"])
                metadata = target.lstat()
                if (
                    not target.is_absolute()
                    or not stat.S_ISDIR(metadata.st_mode)
                    or getattr(metadata, "st_reparse_tag", 0) & 0x20000000
                    or target.resolve(strict=True) != target
                ):
                    raise UnreadableLocalFile("The validation evidence directory was replaced.")
            except (OSError, RuntimeError, UnreadableLocalFile):
                if payload.get("optional") is True:
                    return {"source": None}
                raise
        else:
            target = Path(payload["repository"]).resolve(strict=True)
        private_paths = payload.get("privateStatePaths", [])
        if not isinstance(private_paths, list) or any(
            not isinstance(path, str) or not Path(path).is_absolute() for path in private_paths
        ):
            raise SystemExit("Private runtime paths must be absolute paths.")
        excluded = tuple(sorted({Path(path).resolve() for path in private_paths}))
        excluded = tuple(path for path in excluded if path.is_relative_to(target))
        if target in excluded:
            raise SystemExit("Private runtime storage must not exclude the repository root.")
        try:
            content = directory_content_digest(
                target,
                excluded=excluded,
                include_ignored=True,
                include_git_metadata=evidence,
            )
        except (UnsupportedLocalFileType, UnreadableLocalFile, OSError):
            if payload.get("optional") is True:
                return {"source": None}
            raise
        return {
            "source": {
                "repository": str(target),
                "revision": (
                    "unversioned"
                    if evidence or payload.get("gitDisabled")
                    else git_revision(target)
                ),
                "refsDigest": hashlib.sha256(
                    b""
                    if evidence or payload.get("gitDisabled")
                    else (git_bytes(target, "show-ref") or b"").strip()
                ).hexdigest(),
                "content": content,
                **({"privateStatePaths": [str(path) for path in excluded]} if excluded else {}),
            }
        }
    if payload["action"] == "get-review":
        row = connection.execute(
            "SELECT result_json FROM finding_workflow_reviews WHERE workflow_id = ? AND review_key = ?",
            (workflow_id, payload["key"]),
        ).fetchone()
        return {"review": json.loads(row["result_json"]) if row is not None else None}
    if payload["action"] == "save-review":
        binding = payload["binding"]
        source = binding["source"]
        scope = binding["scope"]
        on_conflict = (
            "DO UPDATE SET result_json = excluded.result_json, created_at = excluded.created_at"
            if payload.get("replace") is True and binding.get("stage") == "scan-validation"
            else "DO NOTHING"
        )
        with connection:
            connection.execute(
                f"""INSERT INTO finding_workflow_reviews
                (workflow_id, review_key, review_contract_version, codex_version,
                 source_repository_path, source_revision, source_refs_digest, source_content_digest,
                 scope_repository_id, scope_all_repositories, model, effort, settings_digest,
                 prompt_digest, contract_digest, result_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(workflow_id, review_key) {on_conflict}""",
                (
                    workflow_id,
                    payload["key"],
                    binding["version"],
                    binding["codexVersion"],
                    source["repository"],
                    source["revision"],
                    source["refsDigest"],
                    source["content"],
                    scope.get("repositoryId"),
                    scope.get("allRepositories"),
                    binding["model"],
                    binding["effort"],
                    binding.get("settingsDigest"),
                    binding["promptDigest"],
                    binding["contractDigest"],
                    json.dumps(payload["result"], allow_nan=False),
                    timestamp,
                ),
            )
        return {}
    connection.execute("BEGIN IMMEDIATE")
    with connection:
        state = read_workflow(connection, workflow_id)
        if state is None:
            state = {
                "id": workflow_id,
                "stages": {stage: {"status": "pending"} for stage in WORKFLOW_STAGES},
            }
        bind_workflow(state, payload.get("binding", {}))
        action = payload["action"]
        if action != "bind":
            stage = payload["stage"]
            if stage not in state["stages"]:
                raise SystemExit("Unknown workflow stage.")
            current = state["stages"][stage]
            if current["status"] != "completed":
                if action == "begin":
                    current["status"] = "running"
                elif action == "complete":
                    state["stages"][stage] = {"status": "completed", "result": payload["result"]}
                elif action == "fail":
                    current.update(status="failed", error=payload["error"])
                    if "result" in payload:
                        current["result"] = payload["result"]
                elif action == "prepare-dedupe":
                    current.update(result=payload["result"], pendingWrite=payload["pendingWrite"])
                else:
                    raise SystemExit("Unknown workflow action.")
        save_workflow(connection, state, timestamp)
        return {"workflow": state}

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_native_indexes.py`

```python
"""Read-only native findings and repository indexes for the Security workbench."""

import argparse
import os
import sqlite3
import sys
from collections.abc import Iterator
from functools import cache
from itertools import islice
from pathlib import Path
from typing import Any

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import workbench_scan_history as scan_history
from workbench_constants import (
    FINDING_SUMMARY_BYTES,
    FINDING_TITLE_BYTES,
    FINDINGS_PAGE_MAX,
    PRIMARY_FINDING_LOCATION_SQL,
)
from workbench_target_state import (
    RepositoryIdentityCache,
    RepositoryScanScope,
    scan_repository_group,
)
from workbench_validation import bounded_output_text, timestamp_key

def list_global_findings(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
) -> dict[str, Any]:
    """Return a page of indexed findings after applying the requested filters, with nextOffset for continuation."""
    limit = min(args.limit, FINDINGS_PAGE_MAX)
    query = args.query.strip().casefold() if args.query else ""
    identities = RepositoryIdentityCache(connection)
    repository = getattr(args, "repository", None)
    requested = None
    if repository is not None:
        repository = identities.history_path(str(Path(repository).expanduser().absolute()))
        requested = identities.for_path(repository)
        scan_scope = identities.scope_for_path(repository)
    else:
        scan_scope = None if args.target_id is None else identities.scope(args.target_id)
        target = identities.targets.get(args.target_id)
        if identities.supports_identity and target is not None:
            requested = identities.for_row(target)
    findings = (
        row
        for row in _indexed_findings(connection, identities=identities, scan_scope=scan_scope)
        if (args.severity is None or row["severity"] == args.severity)
        and (args.status is None or row["status"] == args.status)
        and (
            not query
            or any(
                query in value.casefold()
                for value in (
                    row["title"],
                    row["summary"],
                    row["target_path"],
                    row["location_path"],
                )
                if value is not None
            )
        )
    )
    rows = list(islice(findings, args.offset, args.offset + limit + 1))
    has_more = len(rows) > limit
    return {
        "findings": [
            {
                "confirmedInLatestScan": row["confirmed_in_latest_scan"],
                "createdAt": row["created_at"],
                "findingId": row["finding_id"],
                "knownSince": row["known_since"],
                "knownScanIds": row["known_scan_ids"],
                "locationPath": row["location_path"],
                "matchedFindingIds": row["matched_finding_ids"],
                "occurrenceCount": row["occurrence_count"],
                "occurrenceId": row["occurrence_id"],
                "scanId": row["scan_id"],
                "scope": row["scope"],
                "severity": {"level": row["severity"]},
                "status": row["status"],
                "summary": bounded_output_text(row["summary"], FINDING_SUMMARY_BYTES),
                "targetId": row["target_id"],
                "targetPath": row["target_path"],
                "title": bounded_output_text(row["title"], FINDING_TITLE_BYTES),
                "updatedAt": row["updated_at"],
            }
            for row in rows[:limit]
        ],
        "limit": limit,
        "nextOffset": args.offset + limit if has_more else None,
        "offset": args.offset,
        "projectionAvailable": requested is None or requested.ownership_matches,
    }

def _legacy_generations(
    connection: sqlite3.Connection, identities: RepositoryIdentityCache
) -> dict[str, str]:
    return (
        {
            row["target_id"]: row["generation"]
            for row in connection.execute(
                "SELECT target_id, MIN(repository_generation) AS generation FROM scans "
                "WHERE repository_generation IS NOT NULL GROUP BY target_id "
                "HAVING COUNT(DISTINCT repository_generation) = 1"
            )
        }
        if identities.supports_generation
        else {}
    )

def _indexed_findings(
    connection: sqlite3.Connection,
    *,
    identities: RepositoryIdentityCache | None = None,
    scan_scope: RepositoryScanScope | None = None,
    legacy_generations: dict[str, str] | None = None,
) -> Iterator[dict[str, Any]]:
    identities = identities or RepositoryIdentityCache(connection)

    def scope_sql(alias: str) -> tuple[str, tuple[str, ...]]:
        return (
            scan_scope.sql(alias, supports_generation=identities.supports_generation)
            if scan_scope is not None
            else ("1", ())
        )

    def generation_sql(alias: str) -> str:
        return f"{alias}.repository_generation" if identities.supports_generation else "NULL"

    if legacy_generations is None:
        legacy_generations = _legacy_generations(connection, identities)

    def repository_group(scan: sqlite3.Row | dict) -> tuple[str, str]:
        identity = scan_repository_group(scan)
        generation = legacy_generations.get(scan["target_id"])
        return (
            ("repository", generation)
            if identity[0] == "target" and generation is not None
            else identity
        )

    target_filter, target_values = scope_sql("scans")
    before_filter, before_values = scope_sql("before_scans")
    after_filter, after_values = scope_sql("after_scans")
    parents: dict[tuple[tuple[str, str], str], tuple[tuple[str, str], str]] = {}

    def group(identity: tuple[tuple[str, str], str]) -> tuple[tuple[str, str], str]:
        while identity in parents:
            identity = parents[identity]
        return identity

    for match in connection.execute(
        f"""
        SELECT before_scans.target_id AS before_target_id,
            after_scans.target_id AS after_target_id,
            {generation_sql("before_scans")} AS before_generation,
            {generation_sql("after_scans")} AS after_generation,
            before.finding_id AS before_finding_id,
            after.finding_id AS after_finding_id
        FROM scan_comparison_matches AS matches
        JOIN finding_occurrences AS before ON before.id = matches.before_occurrence_id
        JOIN scans AS before_scans ON before_scans.id = before.scan_id
        JOIN security_targets AS before_targets ON before_targets.id = before_scans.target_id
        JOIN finding_occurrences AS after ON after.id = matches.after_occurrence_id
        JOIN scans AS after_scans ON after_scans.id = after.scan_id
        JOIN security_targets AS after_targets ON after_targets.id = after_scans.target_id
        WHERE {before_filter} AND {after_filter}
        """,
        (*before_values, *after_values),
    ):
        if match["before_target_id"] != match["after_target_id"] and (
            match["before_generation"] is None or match["after_generation"] is None
        ):
            continue
        before_repository = repository_group(
            {
                "target_id": match["before_target_id"],
                "repository_generation": match["before_generation"],
            }
        )
        after_repository = repository_group(
            {
                "target_id": match["after_target_id"],
                "repository_generation": match["after_generation"],
            }
        )
        if before_repository != after_repository and (
            match["before_target_id"] != match["after_target_id"]
            or match["before_generation"] is not None
            and match["after_generation"] is not None
        ):
            continue
        before = group(
            (
                before_repository,
                match["before_finding_id"],
            )
        )
        after = group(
            (
                after_repository,
                match["after_finding_id"],
            )
        )
        if before != after:
            parents[after] = before

    completion_column = (
        "scans.completion_sequence" if "completion_sequence" in identities.scan_columns else "NULL"
    )
    completed_at_column = (
        "scans.completed_at" if "completed_at" in identities.scan_columns else "NULL"
    )
    completed_scans = sorted(
        connection.execute(
            f"""
            SELECT scans.target_id, scans.id, scans.started_at,
                {generation_sql("scans")} AS repository_generation,
                {completed_at_column} AS completed_at,
                {completion_column} AS completion_sequence
            FROM scans
            JOIN security_targets AS targets ON targets.id = scans.target_id
            WHERE scans.status = 'complete' AND {target_filter}
            """,
            target_values,
        ),
        key=scan_history._scan_completion_order,
    )
    latest_scan_by_repository = {repository_group(row): row for row in completed_scans}
    selected_latest_scan_id = completed_scans[-1]["id"] if completed_scans else None

    grouped: dict[tuple[tuple[str, str], str], list[sqlite3.Row]] = {}
    for row in connection.execute(
        f"""
        SELECT
            occurrences.id AS occurrence_id,
            occurrences.finding_id,
            occurrences.severity,
            occurrences.created_at,
            scans.id AS scan_id,
            scans.started_at AS scan_started_at,
            scans.target_id,
            {generation_sql("scans")} AS repository_generation,
            targets.current_path AS target_path,
            scans.scope,
            scans.updated_at,
            triage.status AS decision_status,
            triage.close_reason,
            triage.updated_at AS decision_updated_at,
            occurrences.title,
            occurrences.summary,
            (SELECT relative_path {PRIMARY_FINDING_LOCATION_SQL}) AS location_path
        FROM finding_occurrences AS occurrences
        JOIN scans ON scans.id = occurrences.scan_id
        JOIN security_targets AS targets ON targets.id = scans.target_id
        LEFT JOIN finding_triage AS triage ON triage.occurrence_id = occurrences.id
        WHERE {target_filter}
        """,
        target_values,
    ):
        grouped.setdefault(
            group(
                (
                    repository_group(row),
                    row["finding_id"],
                )
            ),
            [],
        ).append(row)

    # Global comparisons do not bind legacy history across current targets. A scoped
    # projection already admits only its own target's legacy rows and decisions.
    for identity, occurrences in list(grouped.items()):
        current_targets = {
            row["target_id"] for row in occurrences if row["repository_generation"] is not None
        }
        if len(current_targets) <= 1 or scan_scope is not None:
            continue
        current = []
        for row in occurrences:
            if row["repository_generation"] is None:
                legacy_identity = (scan_repository_group(row), identity[1])
                grouped.setdefault(legacy_identity, []).append(row)
            else:
                current.append(row)
        grouped[identity] = current

    findings = []
    for occurrences in grouped.values():
        latest = max(
            occurrences,
            key=lambda row: (timestamp_key(row["created_at"]), row["occurrence_id"]),
        )
        decision = max(
            (row for row in occurrences if row["decision_status"] is not None),
            key=lambda row: (timestamp_key(row["decision_updated_at"]), row["occurrence_id"]),
            default=None,
        )
        status = decision["decision_status"] if decision is not None else "open"
        if (
            status == "closed"
            and decision["close_reason"] == "already_fixed"
            and timestamp_key(latest["created_at"]) > timestamp_key(decision["decision_updated_at"])
        ):
            status = "open"
        scans = sorted(
            {(row["scan_started_at"], row["scan_id"]) for row in occurrences},
            key=lambda scan: (timestamp_key(scan[0]), scan[1]),
        )
        component_latest_scan = max(
            (
                latest_scan_by_repository[repository]
                for repository in {repository_group(row) for row in occurrences}
                if repository in latest_scan_by_repository
            ),
            key=scan_history._scan_completion_order,
            default=None,
        )
        latest_scan_id = (
            selected_latest_scan_id
            if scan_scope is not None
            else component_latest_scan["id"]
            if component_latest_scan is not None
            else None
        )
        findings.append(
            {
                **dict(latest),
                "close_reason": decision["close_reason"] if decision is not None else None,
                "confirmed_in_latest_scan": any(
                    row["scan_id"] == latest_scan_id for row in occurrences
                ),
                "known_since": scans[0][0],
                "known_scan_ids": [scan_id for _, scan_id in scans],
                "matched_finding_ids": sorted({row["finding_id"] for row in occurrences}),
                "matched_occurrence_ids": sorted({row["occurrence_id"] for row in occurrences}),
                "occurrence_count": len(occurrences),
                "status": status,
                "updated_at": (
                    max(
                        latest["updated_at"],
                        decision["decision_updated_at"],
                        key=lambda value: (timestamp_key(value), value),
                    )
                    if decision is not None
                    else latest["updated_at"]
                ),
            }
        )

    findings.sort(key=lambda finding: finding["occurrence_id"])
    findings.sort(
        key=lambda finding: (
            finding["status"] == "open",
            -scan_history.SEVERITY_ORDER.get(finding["severity"], 5),
            timestamp_key(finding["created_at"]),
        ),
        reverse=True,
    )
    yield from findings

def list_repositories(
    connection: sqlite3.Connection,
    args: argparse.Namespace | None = None,
) -> dict[str, Any]:
    """Return tracked targets with scan summaries, finding counts, and current checkout availability."""
    by_target: dict[str, dict[str, Any]] = {}
    latest_rows: dict[str, sqlite3.Row] = {}
    for row in connection.execute(
        f"""
        SELECT targets.id AS repository_id, targets.display_name, targets.current_path,
               {scan_history.SCAN_SUMMARY_COLUMNS}
        FROM security_targets AS targets
        LEFT JOIN scans ON scans.target_id = targets.id
            AND scans.id IN (SELECT scan_id FROM scan_progress)
        LEFT JOIN scan_progress AS progress ON progress.scan_id = scans.id
        LEFT JOIN scan_lifecycles AS lifecycle ON lifecycle.scan_id = scans.id
        ORDER BY julianday(upper(scans.started_at)) DESC, scans.id DESC, targets.id
        """
    ).fetchall():
        target_id = row["repository_id"]
        if target_id not in by_target:
            by_target[target_id] = {
                "displayName": row["display_name"],
                "latestScan": None,
                "openFindingsCount": 0,
                "scanCount": 0,
                "targetId": target_id,
                "targetPath": row["current_path"],
            }
        if row["id"] is None:
            continue
        repository = by_target[target_id]
        scan = scan_history.scan_summary(row)
        repository["scanCount"] += 1
        previous = latest_rows.get(target_id)
        if previous is None or (
            previous["status"] == row["status"] == "complete"
            and scan_history._scan_completion_order(row)
            > scan_history._scan_completion_order(previous)
        ):
            latest_rows[target_id] = row
            repository["latestScan"] = scan

    identities = RepositoryIdentityCache(connection)
    legacy_generations = _legacy_generations(connection, identities)

    @cache
    def open_findings_count(target_id: str) -> int:
        if not by_target[target_id]["scanCount"]:
            return 0
        scope = identities.scope(target_id)
        if not scope.available:
            return 0
        return sum(
            row["status"] == "open"
            for row in _indexed_findings(
                connection,
                identities=identities,
                scan_scope=scope,
                legacy_generations=legacy_generations,
            )
        )

    repositories = list(by_target.values())
    pagination = {}
    if args is not None:
        query = args.query.strip().casefold() if args.query else ""
        repositories = [
            repository
            for repository in repositories
            if (args.target_id is None or repository["targetId"] == args.target_id)
            and (args.status != "scanned" or repository["scanCount"] > 0)
            and (args.status != "not_scanned" or repository["scanCount"] == 0)
            and (
                not query
                or query in repository["displayName"].casefold()
                or query in repository["targetPath"].casefold()
            )
            and (args.status != "open_findings" or open_findings_count(repository["targetId"]) > 0)
        ]
        if args.limit is not None or args.offset:
            limit = args.limit or FINDINGS_PAGE_MAX
            end = args.offset + limit
            pagination = {
                "limit": limit,
                "nextOffset": end if end < len(repositories) else None,
                "offset": args.offset,
            }
            repositories = repositories[args.offset : end]
    for repository in repositories:
        repository["openFindingsCount"] = open_findings_count(repository["targetId"])
        path = os.path.expanduser(repository["targetPath"])
        try:
            repository["checkoutAvailable"] = Path(path).is_absolute() and os.path.isdir(
                os.path.realpath(path)
            )
        except (OSError, RecursionError):
            repository["checkoutAvailable"] = False
    return {"repositories": repositories, **pagination}

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_progress.py`

```python
"""Progress transition helpers for the Codex Security workbench."""

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from deep_scan_workbench import independent_review_progress, require_current_coordinator
from finalize_scan_contract import open_scan_local_file_descriptor
from workbench.handoff import require_current_continuation, require_tokenless_scan_owner
from workbench_constants import PHASES
from workbench_validation import optional_text, require_uuid, user_context_argument

def reportable_count(
    current_phase: str, requested_phase: str | None, count: int | None
) -> int | None:
    """Default a missing count to zero on entering validation or a later phase from an earlier phase."""
    if count is None and requested_phase in PHASES[3:] and current_phase in PHASES[:3]:
        return 0
    return count

def update_context(
    wb: Any,
    connection: sqlite3.Connection,
    args: argparse.Namespace,
) -> dict[str, Any]:
    """Update user context on a running scan and return the refreshed scan context in the same workbench."""
    scan_id = require_uuid(args.scan_id, "scan-id")
    context = user_context_argument(args)
    connection.execute("BEGIN IMMEDIATE")
    with connection:
        scan = wb.require_scan(connection, scan_id)
        if scan["status"] != "running" or scan["canceled_at"] is not None:
            raise SystemExit("Only a running scan can update context.")
        workspace = wb.require_workspace(connection, scan["workspace_id"])
        if args.workspace_id is not None:
            if args.claim_token is not None:
                raise SystemExit("claim-token is only valid with thread-id.")
            if require_uuid(args.workspace_id, "workspace-id") != workspace["id"]:
                raise SystemExit("This scan does not belong to the selected workspace.")
        else:
            thread_id = optional_text(args.thread_id, maximum=512)
            owning_thread_id = scan["continuation_thread_id"] or workspace["thread_id"]
            if thread_id is None or thread_id != owning_thread_id:
                raise SystemExit("This scan does not belong to the current Codex thread.")
            require_current_continuation(
                scan,
                args.claim_token,
                error_message="Scan context updates are owned by another continuation.",
            )
        timestamp = wb.now()
        connection.execute(
            "UPDATE scans SET user_context = ?, updated_at = ? WHERE id = ?",
            (context, timestamp, scan["id"]),
        )
        if args.workspace_id is not None:
            connection.execute(
                "UPDATE workspaces SET user_context = ?, updated_at = ? WHERE id = ?",
                (context, timestamp, workspace["id"]),
            )
        else:
            connection.execute(
                "UPDATE workspaces SET updated_at = ? WHERE id = ?",
                (timestamp, workspace["id"]),
            )
    return wb.scan_context(connection, scan_id)

def scan_progress_result(
    connection: sqlite3.Connection, scan: sqlite3.Row
) -> tuple[dict[str, Any], str]:
    independent_reviews = (
        independent_review_progress(
            connection, scan["id"], parent_running=scan["status"] == "running"
        )
        if scan["mode"] == "deep"
        else None
    )
    progress_result = {
        "candidates": {"reportable": scan["reportable_findings_count"]},
        "coverage": {
            "closedRows": scan["review_items_completed"],
            "filesTotal": scan["scope_file_count"],
            "worklistRows": scan["review_items_total"],
        },
        "phase": scan["phase"],
        "phaseProgress": {
            "completed": scan["phase_items_completed"],
            "total": scan["phase_items_total"],
            "unit": scan["phase_progress_unit"],
        },
        "preflightProgress": {
            "completed": scan["preflight_checks_completed"],
            "total": scan["preflight_checks_total"],
        },
        "preflightIssues": json.loads(scan["preflight_issues_json"]),
        "reviewPass": scan["deep_review_pass"],
        "status": "canceled" if scan["canceled_at"] else scan["status"],
        "updatedAt": scan["progress_updated_at"],
    }
    review_updated_at = ""
    if independent_reviews is not None:
        review_updated_at = str(independent_reviews.pop("updatedAt"))
        progress_result["independentReviews"] = independent_reviews
    return progress_result, review_updated_at

def model_progress(wb: Any, connection: sqlite3.Connection, scan_id: str) -> dict[str, Any]:
    scan = wb.scan_history.scan_with_progress(connection, scan_id)
    progress, _ = scan_progress_result(connection, scan)
    result = {"scanId": scan["id"], "progress": progress, "userContext": scan["user_context"]}
    if warnings := json.loads(scan["completion_warnings_json"]):
        result["warnings"] = warnings
    return result

def deep_preflight(scan: sqlite3.Row) -> bool:
    return scan["mode"] == "deep" and scan["phase"] == "preflight" and scan["canceled_at"] is None

def reported_scope_file_count(wb: Any, scan: sqlite3.Row) -> int | None:
    """Read the scoped helper's optional progress count, independently of scan evidence."""
    if (
        scan["mode"] != "standard"
        or scan["launch_kind"] not in (None, "scan")
        or not scan["recipe_json"]
    ):
        return None
    try:
        recipe = json.loads(scan["recipe_json"])
        target = recipe.get("target") if isinstance(recipe, dict) else None
        if not isinstance(target, dict) or target.get("kind") != "paths":
            return None
        repositories = (scan["target_path"], recipe.get("repository"))
        largest_count = 2**53 - 1  # The SDK reports this value as a JavaScript safe integer.
        maximum = (
            max(
                len(json.dumps({"scanId": scan["id"], "repository": repo, "count": largest_count}))
                for repo in repositories
                if isinstance(repo, str)
            )
            + 1
        )  # The helper includes a trailing newline.
        scan_dir = wb.require_canonical_scan_directory(Path(scan["scan_dir"]))
        descriptor = open_scan_local_file_descriptor(
            scan_dir, "scoped-source-input.receipt.json", "Scoped inventory count"
        )
        with os.fdopen(descriptor, "rb") as stream:
            data = stream.read(maximum + 1)
        if len(data) > maximum:
            return None
        report = json.loads(data)
        if (
            isinstance(report, dict)
            and report.get("scanId") == scan["id"]
            and isinstance(report.get("repository"), str)
            and report["repository"] in repositories
            and type(count := report.get("count")) is int
            and 0 <= count <= largest_count
        ):
            return count
    except (OSError, ValueError, RecursionError, SystemExit):
        # An unreadable optional report leaves the stored estimate in place so the scan can continue.
        pass
    return None

def refresh_scope_file_count(
    wb: Any, connection: sqlite3.Connection, scan_id: str, claim_token: str | None
) -> dict[str, int | None]:
    scan = wb.require_scan(connection, scan_id)
    if scan["status"] != "running":
        return {"scopeFileCount": None}
    ownership_error = "Scan updates are owned by another continuation."
    require_current_continuation(scan, claim_token, error_message=ownership_error)
    count = reported_scope_file_count(wb, scan)
    if count is None:
        return {"scopeFileCount": None}
    timeout = int(connection.execute("PRAGMA busy_timeout").fetchone()[0])
    try:
        connection.execute("PRAGMA busy_timeout = 0")
        with connection:
            connection.execute("BEGIN IMMEDIATE")
            current = wb.require_scan(connection, scan_id)
            if current["status"] != "running" or current["scan_dir"] != scan["scan_dir"]:
                return {"scopeFileCount": None}
            require_current_continuation(current, claim_token, error_message=ownership_error)
            connection.execute(
                "UPDATE scan_progress SET scope_file_count = ?, updated_at = ? WHERE scan_id = ?",
                (count, wb.now(), scan_id),
            )
    except sqlite3.OperationalError as exc:
        if not wb.sqlite_busy(exc):
            raise
        return {"scopeFileCount": None, "retry": True}
    finally:
        connection.execute(f"PRAGMA busy_timeout = {timeout}")
    return {"scopeFileCount": count}

def update_progress(
    wb: Any,
    connection: sqlite3.Connection,
    args: argparse.Namespace,
) -> dict[str, Any]:
    """Record phase and review counters for a running scan and return its updated context.

    Check continuation and coordinator ownership where applicable. A new phase
    starts with fresh phase counters. A new Deep Scan review pass must start
    with zero completed items. Invalid progress raises SystemExit.
    """
    scan_id = require_uuid(args.scan_id, "scan-id")
    if args.refresh_scope_file_count:
        return refresh_scope_file_count(wb, connection, scan_id, args.claim_token)
    model = optional_text(args.model, maximum=200)
    reasoning_effort = optional_text(args.reasoning_effort, maximum=32)
    with connection:
        scan = None
        if args.model_update:
            connection.execute("BEGIN")
            scan = wb.require_scan(connection, scan_id)
            if not deep_preflight(scan):
                connection.rollback()
                scan = None
        if scan is None:
            # Reread under the writer lock before applying any progress change.
            wb.begin_immediate_with_retry(connection)
            scan = wb.require_scan(connection, scan_id)
        timestamp = wb.now()
        require_tokenless_scan_owner(connection, scan, getattr(args, "model_thread_id", None))
        if scan["status"] != "running":
            raise SystemExit("Only a running scan can update progress.")
        if args.model_update and deep_preflight(scan):
            if scan["handoff_claim_token"] is not None:
                require_current_continuation(
                    scan,
                    args.claim_token,
                    error_message="Scan updates are owned by another continuation.",
                )
            return {"scan": model_progress(wb, connection, scan_id), "deepPreflight": True}
        if scan["mode"] == "deep":
            coordinator = connection.execute(
                "SELECT * FROM deep_scan_runs WHERE scan_id = ?", (scan_id,)
            ).fetchone()
            if coordinator is not None and (
                coordinator["status"] == "running" or args.coordinator_generation is not None
            ):
                require_current_coordinator(coordinator, args)
        elif args.coordinator_generation is not None:
            raise SystemExit("Coordinator leases apply only to Deep Scan progress.")
        require_current_continuation(
            scan,
            args.claim_token,
            error_message="Scan updates are owned by another continuation.",
        )
        if args.deep_review_pass is not None and scan["mode"] != "deep":
            raise SystemExit("Only Deep Scan can record a deep review pass.")
        progress = connection.execute(
            "SELECT * FROM scan_progress WHERE scan_id = ?", (scan["id"],)
        ).fetchone()
        if args.phase is not None and PHASES.index(args.phase) < PHASES.index(scan["phase"]):
            raise SystemExit("Scan progress cannot move to an earlier phase.")
        next_phase = args.phase or scan["phase"]
        phase_changed = next_phase != scan["phase"]
        phase_total = 0 if phase_changed else progress["phase_items_total"]
        phase_completed = 0 if phase_changed else progress["phase_items_completed"]
        phase_unit = None if phase_changed else progress["phase_progress_unit"]
        if args.phase_items_total is not None:
            phase_total = args.phase_items_total
        if args.phase_items_completed is not None:
            phase_completed = args.phase_items_completed
        if args.phase_progress_unit is not None:
            phase_unit = args.phase_progress_unit
        if phase_completed > phase_total:
            raise SystemExit("Completed phase items cannot exceed total phase items.")
        if phase_total > 0 and phase_unit is None:
            raise SystemExit("Phase progress with a nonzero total requires a progress unit.")
        if not phase_changed:
            if (
                args.phase_items_total is not None
                and args.phase_items_total < progress["phase_items_total"]
            ):
                raise SystemExit("Phase item total cannot decrease within a phase.")
            if (
                args.phase_items_completed is not None
                and args.phase_items_completed < progress["phase_items_completed"]
            ):
                raise SystemExit("Completed phase items cannot decrease within a phase.")
            if (
                args.phase_progress_unit is not None
                and progress["phase_progress_unit"] is not None
                and args.phase_progress_unit != progress["phase_progress_unit"]
            ):
                raise SystemExit("Phase progress unit cannot change within a phase.")
        updates: list[str] = [
            "phase_items_total = ?",
            "phase_items_completed = ?",
            "phase_progress_unit = ?",
        ]
        values: list[Any] = [phase_total, phase_completed, phase_unit]
        if next_phase == "preflight" and scan["mode"] != "deep":
            updates.extend(["preflight_checks_total = ?", "preflight_checks_completed = ?"])
            values.extend([phase_total, phase_completed])
        for column, value in (
            ("review_items_total", args.review_items_total),
            ("review_items_completed", args.review_items_completed),
            (
                "reportable_findings_count",
                reportable_count(scan["phase"], args.phase, args.reportable_findings_count),
            ),
            ("deep_review_pass", args.deep_review_pass),
        ):
            if value is not None:
                updates.append(f"{column} = ?")
                values.append(value)
        current_pass = progress["deep_review_pass"] or 0
        requested_pass = args.deep_review_pass or current_pass
        if requested_pass < current_pass:
            raise SystemExit("Deep Scan progress cannot move to an earlier review pass.")
        advancing_pass = requested_pass > current_pass
        if advancing_pass and args.review_items_completed != 0:
            raise SystemExit("A new Deep Scan review pass must start with zero completed items.")
        if not advancing_pass:
            if (
                args.review_items_total is not None
                and args.review_items_total < progress["review_items_total"]
            ):
                raise SystemExit("Review item total cannot decrease within a review pass.")
            if (
                args.review_items_completed is not None
                and args.review_items_completed < progress["review_items_completed"]
            ):
                raise SystemExit("Completed review items cannot decrease within a review pass.")
        total = args.review_items_total
        if total is None:
            total = progress["review_items_total"]
        completed = args.review_items_completed
        if completed is None:
            completed = progress["review_items_completed"]
        if completed > total:
            raise SystemExit("Completed review items cannot exceed total review items.")
        connection.execute(
            """
            UPDATE scans
            SET phase = COALESCE(?, phase), model = COALESCE(?, model),
                reasoning_effort = COALESCE(?, reasoning_effort), updated_at = ?
            WHERE id = ? AND status = 'running'
            """,
            (args.phase, model, reasoning_effort, timestamp, scan["id"]),
        )
        connection.execute(
            f"UPDATE scan_progress SET {', '.join(updates)}, updated_at = ? WHERE scan_id = ?",
            (*values, timestamp, scan["id"]),
        )
        if args.model_update:
            return {"scan": model_progress(wb, connection, scan_id)}
    return wb.scan_context(connection, scan["id"])

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_publication.py`

```python
"""Validate, record, and export findings from sealed scans."""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import sqlite3
import sys
from contextlib import closing
from pathlib import Path
from typing import Any

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from finalize_scan_contract import (
    ContractError,
    SealedArtifactError,
    build_threat_model_export,
    csv_cell,
    finalize_scan,
    finding_candidate_id,
    finding_csv_columns,
    write_export_output,
    write_sarif_projection,
)
from snapshot_sqlite import readonly_sqlite_uri
from validate_scan_contract import validate_contract
from workbench_constants import PRIMARY_FINDING_LOCATION_SQL

def destination_key(destination: Any) -> str:
    """Encode exact provider-specific destination IDs into a stable key for matching issue receipts."""
    if not isinstance(destination, dict):
        raise SystemExit("Finding issues require an exact tracker destination.")
    kind = destination.get("type")
    if kind == "linear":
        required, optional = {"type", "teamId"}, {"projectId"}
        parts = [kind, destination.get("teamId"), destination.get("projectId")]
    elif kind == "jira":
        required, optional = {"type", "cloudId", "projectId"}, set()
        parts = [kind, destination.get("cloudId"), destination.get("projectId")]
    elif kind in {"github-issue", "github-advisory"}:
        required, optional = {"type", "hostname", "repository"}, set()
        parts = [kind, destination.get("hostname"), destination.get("repository")]
    else:
        raise SystemExit("Unsupported finding issue destination.")
    if not required.issubset(destination) or not set(destination).issubset(required | optional):
        raise SystemExit("Finding issues require the exact provider destination fields.")
    if any(not isinstance(value, str) or not value.strip() for value in destination.values()):
        raise SystemExit("Finding issue destination fields must be nonempty strings.")
    return json.dumps(parts, ensure_ascii=False, separators=(",", ":"))

def verify_publication_history(
    db: Any,
    connection: sqlite3.Connection,
    scan_id: str,
    scan_directory: str,
    findings: list[dict[str, Any]],
) -> None:
    """Require publication input to match the completed scan in local history.

    Check the exact scan ID, directory, pinned manifest digest when present,
    and the complete set of occurrence-to-finding associations. Raise
    SystemExit if any of these disagree.
    """
    try:
        scan = db.require_scan(connection, scan_id)
    except SystemExit as exc:
        raise SystemExit(
            "The completed scan is not present in the local Codex Security scan-history database. "
            "Use the state directory where the scan was completed."
        ) from exc
    if scan["id"] != scan_id:
        raise SystemExit("Publication must use the exact completed scan identifier.")
    if scan["status"] != "complete":
        raise SystemExit("Only completed scans can publish findings to Linear.")
    requested_directory = db.require_canonical_scan_directory(Path(scan_directory))
    recorded_directory = db.require_canonical_scan_directory(Path(scan["scan_dir"]))
    if os.path.normcase(requested_directory) != os.path.normcase(recorded_directory):
        raise SystemExit(
            "The selected scan directory does not match its local Codex Security scan history."
        )
    if "seal_manifest_digest" in scan.keys():
        db.require_recorded_manifest_digest(scan, recorded_directory)
    stored_findings = {
        row["id"]: row["finding_id"]
        for row in connection.execute(
            "SELECT id, finding_id FROM finding_occurrences WHERE scan_id = ?", (scan_id,)
        )
    }
    expected = {finding["occurrenceId"]: finding["findingId"] for finding in findings}
    if stored_findings != expected:
        raise SystemExit(
            "The completed scan findings do not exactly match local Codex Security scan history."
        )

def issue_receipt(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "scanId": row["scan_id"],
        "findingId": row["finding_id"],
        "occurrenceId": row["occurrence_id"],
        "issueIdentifier": row["external_id"],
        "operation": row["operation"],
        **({"url": row["external_url"]} if row["external_url"] is not None else {}),
        **({"readback": json.loads(row["readback_json"])} if row["readback_json"] else {}),
    }

def inspect_issue_receipts(
    connection: sqlite3.Connection,
    destination: dict[str, str],
    key: str,
    finding_ids: list[str],
) -> list[dict[str, Any]]:
    """Return receipts for the selected findings and destination, including receipts from older Linear tables."""
    tables = {
        row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
    }
    selection = json.dumps(finding_ids)
    if "finding_issue_receipts" in tables:
        rows = connection.execute(
            "SELECT * FROM finding_issue_receipts WHERE destination_key = ? "
            "AND finding_id IN (SELECT value FROM json_each(?)) ORDER BY id",
            (key, selection),
        )
    elif "finding_publications" in tables and destination["type"] == "linear":
        rows = connection.execute(
            "SELECT *, 'create' AS operation, NULL AS readback_json FROM finding_publications "
            "WHERE destination_type = 'linear' AND team_id = ? AND project_id IS ? "
            "AND finding_id IN (SELECT value FROM json_each(?)) ORDER BY id",
            (destination["teamId"], destination.get("projectId"), selection),
        )
    else:
        return []
    return [issue_receipt(row) for row in rows]

def validate_issue_receipts(receipts: Any, selected: dict[str, str]) -> list[dict[str, Any]]:
    """Return receipts bound to the selected finding occurrences or raise SystemExit on invalid receipt data."""
    if not isinstance(receipts, list):
        raise SystemExit("Finding issue receipts must be an array.")
    for receipt in receipts:
        if not isinstance(receipt, dict):
            raise SystemExit("Each finding issue receipt must be an object.")
        if any(
            not isinstance(receipt.get(field), str) or not receipt[field].strip()
            for field in ("findingId", "occurrenceId", "issueIdentifier")
        ):
            raise SystemExit("A finding issue receipt is missing its source or issue identity.")
        if selected.get(receipt["findingId"]) != receipt["occurrenceId"]:
            raise SystemExit(
                "A finding issue receipt does not belong to the selected sealed findings."
            )
        if receipt.get("operation") not in {"create", "update", "reuse"}:
            raise SystemExit("A finding issue receipt requires create, update, or reuse.")
        if "url" in receipt and (not isinstance(receipt["url"], str) or not receipt["url"].strip()):
            raise SystemExit("A finding issue URL must be a nonempty string when supplied.")
        if "readback" in receipt:
            readback = receipt["readback"]
            if (
                not isinstance(readback, dict)
                or readback.get("status") not in {"verified", "failed"}
                or ("error" in readback and not isinstance(readback["error"], str))
            ):
                raise SystemExit("A finding issue readback requires verified or failed status.")
    return receipts

def finding_issues(db: Any, payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict) or payload.get("action") not in {
        "inspect",
        "prepare",
        "record",
    }:
        raise SystemExit("Finding issues require inspect, prepare, or record action.")
    if not isinstance(payload.get("scanDirectory"), str):
        raise SystemExit("Finding issues require a sealed scan directory.")
    require_history = payload.get("requireHistory", False)
    if not isinstance(require_history, bool):
        raise SystemExit("requireHistory must be a boolean.")
    key = destination_key(payload.get("destination"))
    try:
        validated = validate_contract(Path(payload["scanDirectory"]))
    except (OSError, ValueError, RecursionError) as exc:
        raise SystemExit(f"Finding issue source validation failed: {exc}") from exc
    scan_id = validated["manifest"]["scan"]["id"]
    if "expectedScanId" in payload and payload["expectedScanId"] != scan_id:
        raise SystemExit("Scan artifacts do not match the selected scan identifier.")
    findings = validated["findings"]["findings"]
    available = {finding["findingId"]: finding["occurrenceId"] for finding in findings}
    finding_ids = payload.get("findingIds", list(available))
    if not isinstance(finding_ids, list) or any(
        not isinstance(finding_id, str) or finding_id not in available for finding_id in finding_ids
    ):
        raise SystemExit("Selected finding IDs must belong to the sealed scan.")
    selected = {finding_id: available[finding_id] for finding_id in finding_ids}
    receipts = (
        validate_issue_receipts(payload.get("receipts"), selected)
        if payload["action"] == "record"
        else []
    )
    result = {
        "scanId": scan_id,
        "destination": payload["destination"],
        "findingCount": len(selected),
        "storeExists": True,
        "receipts": [],
    }
    path = db.database_path()
    if payload["action"] == "inspect" or require_history:
        try:
            path.stat()
        except FileNotFoundError:
            if require_history:
                raise SystemExit(
                    "Cannot publish findings because the local Codex Security scan-history database "
                    "does not exist. Use the state directory where this scan was completed."
                ) from None
            result["storeExists"] = False
            return result
        except PermissionError:
            pass  # Let SQLite report the open failure used by the host's state fallback.
    if payload["action"] == "inspect":
        try:
            connection = sqlite3.connect(readonly_sqlite_uri(path), uri=True, timeout=5)
        except sqlite3.OperationalError as exc:
            if str(exc) == "unable to open database file":
                exc._codex_security_state_unavailable = True
            raise
        connection.row_factory = sqlite3.Row
    else:
        connection = db.connect()
    with closing(connection):
        connection.execute("BEGIN" if payload["action"] == "inspect" else "BEGIN IMMEDIATE")
        with connection:
            if require_history:
                verify_publication_history(db, connection, scan_id, validated["scanDir"], findings)
            if payload["action"] == "inspect":
                result["receipts"] = inspect_issue_receipts(
                    connection, payload["destination"], key, list(selected)
                )
            elif payload["action"] == "record":
                timestamp = db.now()
                for receipt in receipts:
                    conflicting = connection.execute(
                        "SELECT 1 FROM finding_issue_receipts "
                        "WHERE destination_key = ? AND external_id = ? AND finding_id != ? LIMIT 1",
                        (key, receipt["issueIdentifier"], receipt["findingId"]),
                    ).fetchone()
                    if conflicting is not None:
                        raise SystemExit(
                            "The issue identifier is already associated with another finding "
                            "in this destination."
                        )
                    readback = (
                        json.dumps(receipt["readback"], ensure_ascii=False)
                        if "readback" in receipt
                        else None
                    )
                    connection.execute(
                        """
                        INSERT INTO finding_issue_receipts (
                            scan_id, finding_id, occurrence_id, destination_key,
                            external_id, external_url, operation, readback_json, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (occurrence_id, destination_key, external_id, operation)
                        DO UPDATE SET
                            external_url = COALESCE(external_url, excluded.external_url),
                            readback_json = COALESCE(excluded.readback_json, readback_json),
                            updated_at = excluded.updated_at
                        """,
                        (
                            scan_id,
                            receipt["findingId"],
                            receipt["occurrenceId"],
                            key,
                            receipt["issueIdentifier"],
                            receipt.get("url"),
                            receipt["operation"],
                            readback,
                            timestamp,
                            timestamp,
                        ),
                    )
                    row = connection.execute(
                        "SELECT * FROM finding_issue_receipts WHERE occurrence_id = ? "
                        "AND destination_key = ? AND external_id = ? AND operation = ?",
                        (
                            receipt["occurrenceId"],
                            key,
                            receipt["issueIdentifier"],
                            receipt["operation"],
                        ),
                    ).fetchone()
                    result["receipts"].append(issue_receipt(row))
    return result

def export_findings(
    db: Any,
    connection: sqlite3.Connection,
    args: argparse.Namespace,
) -> dict[str, Any]:
    scan = db.require_scan(connection, args.scan_id)
    artifact = getattr(args, "artifact", "findings")
    args.format = args.format or ("md" if artifact == "threat-model" else "csv")
    if artifact == "threat-model":
        if args.format != "md":
            raise SystemExit("Threat models can only be exported as Markdown (md).")
    else:
        if args.format == "md":
            raise SystemExit("Markdown export requires --artifact threat-model.")
        if scan["status"] != "complete" and not (
            scan["status"] == "failed" and scan["seal_manifest_digest"]
        ):
            raise SystemExit(
                "Findings can be exported after the scan completes or preserves stopped results."
            )
    scan_dir = db.require_canonical_scan_directory(Path(scan["scan_dir"]))
    db.require_recorded_manifest_digest(scan, scan_dir)
    manifest_path = scan_dir / db.ARTIFACTS["manifest"]
    db.verify_manifest_binding(scan, db.read_json_object(manifest_path))
    if getattr(args, "validate_only", False):
        # SDK/CLI exports use their requested destination without modifying saved artifacts.
        return {"scan": {"scanId": scan["id"], "scanDir": str(scan_dir)}}
    if artifact == "threat-model":
        path = scan_dir / "exports" / "threatmodel.md"
        try:
            contents = build_threat_model_export(scan_dir)
            write_export_output(scan_dir, path, "md", contents)
        except ContractError as exc:
            raise SystemExit(str(exc)) from exc
        return {
            "export": {"artifact": artifact, "format": "md", "path": str(path)},
            "scan": db.scan_result(connection, scan),
            "workspace": db.workspace_state(connection, scan["workspace_id"]),
        }
    try:
        manifest, findings_document, _ = finalize_scan(
            scan_dir,
            expected_coverage_mode=db.expected_coverage_mode(scan),
        )
    except ContractError as exc:
        raise SystemExit(str(exc)) from exc
    db.verify_manifest_binding(scan, manifest)
    manifest_digest = db.published_manifest_digest(scan_dir, manifest)
    db.pin_legacy_manifest_digest(connection, scan["id"], manifest_digest)
    if args.format == "json":
        path = db.artifact_path(scan_dir, db.ARTIFACTS["findings"], required=True)
    elif args.format == "sarif":
        try:
            write_sarif_projection(scan_dir)
        except ContractError as exc:
            raise SystemExit(str(exc)) from exc
        path = db.artifact_path(scan_dir, "exports/results.sarif", required=True)
    else:
        path = write_csv_export(db, connection, scan, findings_document)
    del findings_document
    if path is None:
        raise SystemExit(f"Could not export Codex Security findings as {args.format.upper()}.")
    return {
        "export": {"format": args.format, "path": str(path)},
        "scan": db.scan_result(connection, scan),
        "workspace": db.workspace_state(connection, scan["workspace_id"]),
    }

def write_csv_export(
    db: Any,
    connection: sqlite3.Connection,
    scan: sqlite3.Row,
    findings_document: dict[str, Any],
) -> Path:
    """Write indexed findings to exports/findings.csv, adding candidate IDs for Deep Scans, and return its path."""
    scan_dir = db.require_canonical_scan_directory(Path(scan["scan_dir"]))
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    deep_scan = scan["mode"] == "deep"
    candidate_ids_by_occurrence: dict[str, str] = {}
    if deep_scan:
        findings = findings_document.get("findings")
        if not isinstance(findings, list):
            raise SystemExit("findings.json must contain a findings array.")
        for finding in findings:
            if not isinstance(finding, dict):
                raise SystemExit("findings.json entries must be objects.")
            occurrence_id = finding.get("occurrenceId")
            candidate_id = finding_candidate_id(finding)
            if isinstance(occurrence_id, str) and isinstance(candidate_id, str):
                candidate_ids_by_occurrence[occurrence_id] = candidate_id
    columns = finding_csv_columns(deep_scan)
    writer.writerow(columns)
    for row in finding_export_rows(connection, scan["id"]):
        values = dict(row)
        values["path"] = row["relative_path"]
        values["candidate_id"] = candidate_ids_by_occurrence.get(row["occurrence_id"])
        writer.writerow(csv_cell(values[column]) for column in columns)
    destination = scan_dir / "exports" / "findings.csv"
    try:
        write_export_output(
            scan_dir,
            destination,
            "csv",
            output.getvalue().encode("utf-8"),
        )
    except SealedArtifactError as exc:
        raise SystemExit(str(exc)) from exc
    except ContractError as exc:
        raise SystemExit(
            "exports: expected a regular directory inside the scan directory."
        ) from exc
    path = db.available_artifact_path(scan_dir, destination)
    if path is None:
        raise SystemExit("findings.csv: expected a regular file inside the scan directory.")
    return path

def finding_export_rows(connection: sqlite3.Connection, scan_id: str) -> sqlite3.Cursor:
    return connection.execute(
        f"""
        SELECT
            occurrences.id AS occurrence_id,
            occurrences.finding_id,
            occurrences.title,
            occurrences.summary,
            occurrences.severity,
            occurrences.confidence,
            occurrences.remediation,
            COALESCE(triage.status, 'open') AS status,
            triage.close_reason,
            triage.note,
            locations.relative_path,
            locations.start_line,
            locations.end_line
        FROM finding_occurrences AS occurrences
        LEFT JOIN finding_triage AS triage ON triage.occurrence_id = occurrences.id
        LEFT JOIN finding_locations AS locations
            ON locations.id = (
                SELECT id {PRIMARY_FINDING_LOCATION_SQL}
            )
        WHERE occurrences.scan_id = ?
        ORDER BY occurrences.created_at, occurrences.id
        """,
        (scan_id,),
    )

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_remediation.py`

```python
"""Durable remediation state transitions for the Codex Security workbench."""

from __future__ import annotations

import argparse
import codecs
import hashlib
import io
import os
import re
import sqlite3
import sys
from collections.abc import Callable
from contextlib import AbstractContextManager, ExitStack, suppress
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, BinaryIO

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from finalize_scan_contract import (
    ContractError,
    MissingScanLocalFileError,
    _open_scan_local_directory,
    _open_verified_scan_directory,
    _read_scan_local_json_bytes,
    _read_sealed_scan,
    scan_local_file_version,
    scan_root_identity,
    stage_scan_local_bytes,
)
from posix_scan_local_files import managed_fd
from workbench_constants import (
    CLAIM_LEASE_SECONDS,
    DELIVERED_ACTION_LEASE_SECONDS,
    PATCH_PREVIEW_BYTES,
)
from workbench_target import git_command, git_output
from workbench_validation import optional_text, require_occurrence, require_uuid

COMMANDS = {
    "request-finding-remediation",
    "request-finding-remediation-action",
    "claim-finding-remediation-resend",
    "mark-finding-remediation-delivered",
    "release-finding-remediation-claim",
    "cancel-finding-remediation-request",
    "set-finding-remediation",
}
SCAN_STATUS_ERROR = "Remediation is available only for successfully completed scans."

def patch_artifact_preview(
    scan_dir: Path,
    relative_path: str | None,
    expected_digest: str | None,
    open_scan_file: Callable[[Path, str], AbstractContextManager[BinaryIO]],
) -> tuple[str | None, dict[str, int | bool] | None]:
    if relative_path is None or expected_digest is None:
        return None, None
    digest = hashlib.sha256()
    preview = bytearray()
    additions = 0
    deletions = 0
    file_count = 0
    old_headers = 0
    new_headers = 0
    at_line_start = True
    try:
        with open_scan_file(scan_dir, relative_path) as patch:
            while chunk := patch.readline(1024 * 1024):
                digest.update(chunk)
                if len(preview) <= PATCH_PREVIEW_BYTES:
                    preview.extend(chunk[: PATCH_PREVIEW_BYTES + 1 - len(preview)])
                if at_line_start:
                    if chunk.startswith(b"diff --git "):
                        file_count += 1
                    elif chunk.startswith(b"+++ "):
                        new_headers += 1
                    elif chunk.startswith(b"--- "):
                        old_headers += 1
                    elif chunk.startswith(b"+"):
                        additions += 1
                    elif chunk.startswith(b"-"):
                        deletions += 1
                at_line_start = chunk.endswith(b"\n")
    except SystemExit:
        return None, None
    if f"sha256:{digest.hexdigest()}" != expected_digest:
        return None, None
    preview_truncated = len(preview) > PATCH_PREVIEW_BYTES
    preview_text = preview[:PATCH_PREVIEW_BYTES].decode("utf-8", errors="replace")
    if preview_truncated:
        preview_text = f"{preview_text}\n... patch preview truncated ..."
    return preview_text, {
        "additions": additions,
        "deletions": deletions,
        "fileCount": file_count or min(old_headers, new_headers),
        "previewTruncated": preview_truncated,
    }

def reverse_reviewed_patch(
    target: Path,
    checkout: Path,
    metadata: Path | None,
    pinned_metadata: Path | None,
    patch_digest: str,
    pins: ExitStack,
    patch: Path,
    pathspec: str | None,
) -> tuple[Path | None, Path | None]:
    """Reverse reviewed bytes and select the Git references for subsequent content snapshots."""

    arguments = ["--reverse", "--whitespace=nowarn"]
    if pathspec is None:
        arguments.append("--no-index")
    elif pathspec != ".":
        arguments.append(f"--directory={pathspec}")
    arguments.append(str(patch))

    def reverse(*, git_dir: Path | None, check: bool = False):
        return git_command(
            checkout,
            "apply",
            *(["--check"] if check else []),
            *arguments,
            text=False,
            git_dir=git_dir,
            work_tree=checkout if git_dir else None,
            environment_overrides={"LC_ALL": "C", "LANGUAGE": "C"} if check else None,
        )

    applied = reverse(git_dir=metadata)
    short = None
    diagnostic = b"fatal: '$GIT_DIR' too big"
    if (
        os.name == "nt"
        and metadata is not None
        and applied.returncode == 128
        and not applied.stdout
        and b"GIT_DIR" in applied.stderr
    ):
        # Confirm translated messages without applying the reverse patch twice.
        failure = (
            applied
            if diagnostic in applied.stderr.splitlines()
            else reverse(git_dir=metadata, check=True)
        )
        if (
            failure.returncode == 128
            and not failure.stdout
            and diagnostic in failure.stderr.splitlines()
        ):
            short = prepare_replay_gitfile(checkout, pinned_metadata, patch_digest, pins)
            applied = reverse(git_dir=short)
    if applied.returncode != 0:
        raise SystemExit(
            "The selected checkout does not contain the reviewed remediation patch. Apply exactly that patch before recording it as applied."
        )
    replay_root = None
    if pathspec is None and short is not None:
        selected_root = git_output(target, "rev-parse", "--show-toplevel")
        if selected_root and Path(selected_root).samefile(target):
            replay_root = short
    return short, replay_root

def prepare_replay_gitfile(
    checkout: Path, pinned_metadata: Path | None, patch_digest: str, pins: ExitStack
) -> Path:
    """Retain the verified patch and short metadata reference through the final snapshot."""
    if pinned_metadata is None:
        raise SystemExit(
            "Could not bind the selected Windows Git directory and private patch replay directory."
        )
    from windows_scan_local_files import open_read_fd, pinned_replay_gitfile

    try:
        short = pins.enter_context(pinned_replay_gitfile(checkout, pinned_metadata))
        fd = open_read_fd(checkout.parent, "reviewed.patch", "reviewed remediation patch")
        patch = pins.enter_context(os.fdopen(fd, "rb"))
        matching_patch_metadata(patch, patch_digest)
    except (OSError, ValueError) as exc:
        raise SystemExit(f"Could not verify the reviewed patch replay: {exc}") from exc
    return short

def require_available(connection: sqlite3.Connection, args: Any, require_scan: Any) -> None:
    """Require a successfully completed scan for commands that act on a remediation request."""
    if args.command not in COMMANDS:
        return
    occurrence = require_occurrence(connection, args.occurrence_id)
    if require_scan(connection, occurrence["scan_id"])["status"] != "complete":
        raise SystemExit(SCAN_STATUS_ERROR)

def require_request(
    connection: sqlite3.Connection, request_id: str, occurrence: sqlite3.Row
) -> sqlite3.Row:
    """Return the request row or raise SystemExit if the request is missing or belongs to a different occurrence."""
    current = connection.execute(
        "SELECT * FROM finding_remediation_attempts WHERE request_id = ?",
        (request_id,),
    ).fetchone()
    if current is None or current["occurrence_id"] != occurrence["id"]:
        raise SystemExit("Codex Security finding remediation request not found.")
    return current

def latest_attempt(connection: sqlite3.Connection, occurrence_id: str) -> sqlite3.Row | None:
    """Return the newest remediation attempt for the occurrence, breaking timestamp ties by insertion order."""
    return connection.execute(
        """
        SELECT * FROM finding_remediation_attempts
        WHERE occurrence_id = ?
        ORDER BY created_at DESC, rowid DESC
        LIMIT 1
        """,
        (occurrence_id,),
    ).fetchone()

_HUNK_HEADER = re.compile(rb"@@ -[0-9]+(?:,([0-9]+))? \+[0-9]+(?:,([0-9]+))? @@")
_QUOTED_GIT_PATH = rb'"((?:[^"\\]|\\(?:[abfnrtv"\\]|[0-3][0-7]{2}))*)"'
_SUBMODULE_SUMMARY_END = re.compile(
    rb" (?:contains (?:modified|untracked) content|"
    rb"[0-9a-f]+\.{2,3}[0-9a-f]+(?: \([a-z ]+\):?|:))$"
)
_SUBMODULE_ERROR = (
    "A remediation patch cannot update Git submodules. Regenerate without gitlink changes."
)

def _git_path(field: bytes) -> bytes:
    if quoted := re.match(_QUOTED_GIT_PATH + rb"(?:\t|$)", field):
        return codecs.escape_decode(quoted[1])[0]
    return field.partition(b"\t")[0]

def _matches_git_paths(header: bytes, old_field: bytes, new_field: bytes) -> bool:
    old, new = _git_path(old_field), _git_path(new_field)
    # Git strips one component from each path. Unquoted paths can contain
    # spaces, so use the known preimage to locate the separator.
    if quoted := re.match(_QUOTED_GIT_PATH + rb"(?= )", header):
        split = quoted.end()
    elif quoted := re.search(rb" " + _QUOTED_GIT_PATH + rb"$", header):
        split = quoted.start()
    elif old == b"/dev/null" and header.endswith(b" " + new):
        split = len(header) - len(new) - 1
    elif header.count(b" ") == 1:
        split = header.index(b" ")
    else:
        # On a creation Git repeats the destination on the left of the header.
        expected = new if old == b"/dev/null" else old
        prefix, slash, suffix = expected.partition(b"/")
        split = header.find(b"/") + 1 + len(suffix) if slash else len(prefix)
    if split < 0 or header[split : split + 1] != b" ":
        return False
    for path, field in ((header[:split], old), (header[split + 1 :], new)):
        if field != b"/dev/null" and _git_path(path).split(b"/", 1)[-1] != field.split(b"/", 1)[-1]:
            return False
    return True

def _patch_file_sections(patch: bytes, incomplete: str) -> tuple[bytes, int]:
    mail = re.match(rb"From (?:[0-9a-f]{40}|[0-9a-f]{64}) Mon Sep 17 00:00:00 2001\r?\n", patch)
    if mail:
        first = re.search(rb"(?m)^diff --git [^\n]+\n", patch)
        if first:
            start = first.start()
            # A commit message can quote a Git header. Look for format-patch's
            # diffstat before the first hunk, where a deleted "--" can also
            # look like the separator. Each run of indented lines is scanned once.
            hunk = re.compile(rb"(?m)^@@ -").search(patch, start)
            diffstat = re.compile(
                rb"(?m)^---\r?\n(?: [^\n]*\n)+\r?\n(?=diff --git |Submodule )"
            ).search(patch, 0, hunk.start() if hunk else len(patch))
            if diffstat:
                start = diffstat.end()
            else:
                # With --no-stat Git can retain a quoted header as the preimage of
                # the first change. Ignore it only for the same in-place file edit.
                file = re.compile(
                    rb"(?m)^diff --git [^\n]+\n(?=index |--- |@@ |old mode|new mode|new file|deleted file"
                    rb"|(?:dis)?similarity index|(?:rename|copy) |GIT binary patch|Binary files |Files |Only in )"
                ).search(patch, start)
                if (
                    file
                    and file[0] == first[0]
                    and patch.endswith((b"\n\n", b"\n\r\n"), 0, file.start())
                    and re.compile(
                        rb"(?:index [0-9a-f]+\.\.[0-9a-f]+ 100(?:644|755)|"
                        rb"old mode 100(?:644|755)\r?\nnew mode 100(?:644|755)\r?\n"
                        rb"index [0-9a-f]+\.\.[0-9a-f]+)\r?\n(?:--- |GIT binary patch)"
                    ).match(patch, file.end())
                ):
                    start = file.start()
                elif not patch.endswith((b"\n\n", b"\n\r\n"), 0, start):
                    # A leading submodule summary runs directly into the next file header.
                    summary = re.compile(rb"(?m)^Submodule ").search(patch, 0, start)
                    if summary:
                        start = summary.start()
            patch = patch[start:]

    sections = old_lines = new_lines = 0
    git_paths = b""
    pending_paths = None
    submodule_summary = False
    expect_hunk = False
    stream = io.BytesIO(patch)
    for raw_line in stream:
        line = raw_line.removesuffix(b"\n").removesuffix(b"\r")
        if old_lines or new_lines:
            if line.startswith(b"\\ "):  # No newline at end of file
                continue
            prefix = line[:1]
            if prefix in (b"", b" ", b"-"):
                old_lines -= 1
            if prefix in (b"", b" ", b"+"):
                new_lines -= 1
            if prefix not in (b"", b" ", b"+", b"-") or old_lines < 0 or new_lines < 0:
                raise SystemExit(incomplete)
            expect_hunk = True
            continue
        if expect_hunk and line.startswith(b"\\ "):  # No newline at end of file
            continue
        hunk = _HUNK_HEADER.match(line)
        if expect_hunk and not hunk and re.match(rb"@@ -(?:[0-9]|$)", line):
            raise SystemExit(incomplete)
        expect_hunk = bool(sections) and line.startswith(b"+++ ")
        if mail and sections and line == b"-- ":
            patch = patch[: stream.tell() - len(raw_line)]
            break
        # Git writes the raw submodule name (possibly including newlines) before the
        # status or object range. Neither log nor inline-diff headers can be replayed.
        if line.startswith(b"Submodule "):
            submodule_summary = True
        if submodule_summary and _SUBMODULE_SUMMARY_END.search(line):
            raise SystemExit(_SUBMODULE_ERROR)
        if pending_paths:
            if line.startswith(b"+++ ") and not _matches_git_paths(*pending_paths, line[4:]):
                sections += 1
            pending_paths = None
        if line.startswith(b"diff --git "):
            sections += 1
            submodule_summary = False
            git_paths = line.removeprefix(b"diff --git ")
            continue
        if line.startswith(b"--- "):
            submodule_summary = False
            # A Git header can introduce the same unified path pair. An
            # unrelated pair starts a separate file even if Git ignores one.
            if git_paths:
                pending_paths = (git_paths, line[4:])
            else:
                sections += 1
            git_paths = b""
            continue
        if git_paths:
            if line.startswith(
                (b"index ", b"old mode ", b"new mode ", b"new file mode ", b"deleted file mode ")
            ):
                if re.search(rb" 0*16[0-7]{4}(?:\s|$)", line):
                    raise SystemExit(_SUBMODULE_ERROR)
                if not line.startswith(b"index ") and not re.fullmatch(rb".* [0-7]{6}[ \t]*", line):
                    raise SystemExit(incomplete)
                continue
            if line.startswith(
                (
                    b"similarity index ",
                    b"dissimilarity index ",
                    b"rename from ",
                    b"rename to ",
                    b"copy from ",
                    b"copy to ",
                )
            ):
                continue
            git_paths = b""
        if hunk:
            old_lines = int(hunk[1] or b"1")
            new_lines = int(hunk[2] or b"1")
        elif (
            line.startswith((b"Binary files ", b"Files "))
            and line.endswith(b" differ")
            and b" and " in line
        ):
            raise SystemExit(incomplete)
        elif line.startswith(b"Only in ") and b": " in line:
            raise SystemExit(incomplete)
    if old_lines or new_lines:
        raise SystemExit(incomplete)
    return patch, sections

def require_valid_patch(target: Path, patch: bytes) -> None:
    """Reject incomplete patches before recording the submitted bytes."""
    incomplete = (
        "The remediation patch omits file content. Generate a complete binary diff "
        "with Git's --binary option."
    )
    # Git's numstat skips target-relative paths when run below the repository root.
    root = git_output(target, "rev-parse", "--show-toplevel", offline=True)
    directory = ("-C", root) if root else ()

    def git(data: bytes, *arguments: str):
        result = git_command(
            target,
            *directory,
            *arguments,
            text=False,
            input_data=data,
            environment_overrides={"LC_ALL": "C", "GIT_NO_REPLACE_OBJECTS": "1"},
            offline=True,
        )
        if result.returncode == 127:
            raise SystemExit(
                "Validating a new remediation patch requires a trusted Git executable."
            )
        # Git may report a corrupt trailing binary block but return zero for an earlier file.
        if result.returncode or re.search(rb"(?m)^error: ", result.stderr):
            reason = result.stderr.decode(errors="replace").strip()
            raise SystemExit(f"Could not parse the remediation patch: {reason}")
        return result.stdout

    # Parse every header and hunk, then skip checkout reads and repository clean filters.
    apply = ("apply", "--no-index", "--whitespace=nowarn")
    body, sections = _patch_file_sections(patch, incomplete)
    git(patch, *apply, "--check", "--exclude=*", "-")
    # Git silently ignores some incomplete sections when another file is valid.
    # NUL termination gives one record per file, even for unusual pathnames.
    if git(patch, *apply, "--numstat", "-z", "-").count(b"\0") != sections:
        raise SystemExit(incomplete)

    binary_oid_width = None
    for header in re.finditer(
        rb"(?m)^diff --git [^\n]+\n((?:(?!diff )[a-z][^\n]*(?:\n|\Z))*)",
        body,
    ):
        metadata = header.group(1)
        index = re.search(rb"(?m)^index ([^\s.]+)\.\.([^\s.]+)(?: [0-7]+[ \t]*)?\r?$", metadata)
        binary = body.startswith((b"GIT binary patch\n", b"GIT binary patch\r\n"), header.end())
        if not binary:
            if index is None or re.compile(rb"(?:--- [^\n]*\n\+\+\+ [^\n]*\n)?@@ ").match(
                body, header.end()
            ):
                continue
            old, new = index.groups()
            if metadata.startswith(b"deleted file mode ") and not new.strip(b"0"):
                content_id = old
            elif metadata.startswith(b"new file mode ") and not old.strip(b"0"):
                content_id = new
            else:
                # Mode changes and renames can omit hunks only if
                # their advertised blob contents are unchanged.
                old, new = old.lower(), new.lower()
                if not old.startswith(new) and not new.startswith(old):
                    raise SystemExit(incomplete)
                continue
            # Only an empty file can be added or deleted without a hunk.
            empty_blobs = (
                hashlib.sha1(b"blob 0\0", usedforsecurity=False).hexdigest().encode(),
                hashlib.sha256(b"blob 0\0").hexdigest().encode(),
            )
            if not any(digest.startswith(content_id.lower()) for digest in empty_blobs):
                raise SystemExit(incomplete)
            continue
        if index is None:
            raise SystemExit("A binary patch requires an index line with full object IDs.")
        old, new = index.groups()
        if binary_oid_width is None:
            binary_oid_width = len(git(b"", "hash-object", "--no-filters", "--stdin").strip())
        if (
            len(old) != binary_oid_width
            or len(new) != binary_oid_width
            or not re.fullmatch(rb"[0-9a-fA-F]+", old + new)
        ):
            raise SystemExit(
                "A binary patch requires full object IDs in the selected target's Git object format."
            )

def patch_metadata(
    current: sqlite3.Row,
    args: argparse.Namespace,
    patch: bytes | None,
    resolve_path: Callable[[str], str],
) -> tuple[str | None, str | None]:
    """Resolve a remediation attempt’s patch path and SHA-256 digest.

    For newly generated bytes, compute the digest and use the existing or
    request-specific path. For a referenced patch, validate the supplied path
    and digest. Raise SystemExit if either conflicts with a previously reviewed value.
    """
    path = args.patch_path
    digest = args.patch_digest
    if patch is not None:
        if args.state != "generated" or path is not None or digest is not None:
            raise SystemExit("Supply patch only for generation, without a patch path or digest.")
        path = current["patch_path"] or (
            f"artifacts/remediation/{current['occurrence_id']}/{current['request_id']}/"
            f"{current['pending_action_claim_token']}.patch"
        )
        digest = f"sha256:{hashlib.sha256(patch).hexdigest()}"
    else:
        if path is not None:
            path = resolve_path(path)
        if digest is not None:
            digest = optional_text(digest, maximum=71)
            if not re.fullmatch(r"sha256:[0-9a-f]{64}", digest or ""):
                raise SystemExit("patch-digest must use sha256:<64 lowercase hex characters>.")
    if path is not None and current["patch_path"] not in (None, path):
        raise SystemExit("A remediation attempt cannot replace its reviewed patch path.")
    if digest is not None and current["patch_digest"] not in (None, digest):
        raise SystemExit("A remediation attempt cannot replace its reviewed patch digest.")
    return path or current["patch_path"], digest or current["patch_digest"]

def same_file_version(
    original: tuple[os.stat_result, int], current: tuple[os.stat_result, int]
) -> bool:
    """Compare file identity, size, modification time, and the platform-specific change-time token."""
    before, before_change = original
    after, after_change = current
    return (
        os.path.samestat(before, after)
        and before.st_size == after.st_size
        and before.st_mtime_ns == after.st_mtime_ns
        and before_change == after_change
    )

def file_digest_and_version(source: BinaryIO, label: str) -> tuple[str, tuple[os.stat_result, int]]:
    """Hash the remaining stream bytes and return their digest and file version, raising SystemExit if the file changes."""
    before = scan_local_file_version(source.fileno())
    digest = hashlib.sha256()
    for chunk in iter(lambda: source.read(1024 * 1024), b""):
        digest.update(chunk)
    after = scan_local_file_version(source.fileno())
    if not same_file_version(before, after):
        raise SystemExit(f"The {label} changed while it was being verified.")
    return f"sha256:{digest.hexdigest()}", after

def matching_patch_metadata(source: BinaryIO, expected_digest: str) -> tuple[os.stat_result, int]:
    """Return the stable patch version or raise SystemExit if its bytes differ from expected_digest."""
    digest, version = file_digest_and_version(source, "scan-local patch")
    if digest != expected_digest:
        raise SystemExit("Patch digest does not match the scan-local patch file.")
    return version

def patch_manifest_version(
    db: Any, scan: sqlite3.Row, scan_dir: Path
) -> tuple[str, tuple[os.stat_result, int]]:
    """Verify the sealed scan manifest and return its byte digest and file version, including for legacy scans."""
    manifest_path = db.ARTIFACTS["manifest"]
    expected = scan["seal_manifest_digest"]
    if expected is None:
        # Historical manifests can have different JSON formatting. Bind their original bytes.
        saved, raw = _read_scan_local_json_bytes(scan_dir, manifest_path, manifest_path)
        manifest, _, _, _ = _read_sealed_scan(scan_dir, None, "remediation")
        if saved != manifest:
            raise SystemExit("The sealed scan manifest changed during validation.")
        db.verify_manifest_binding(scan, manifest)
        expected = f"sha256:{hashlib.sha256(raw).hexdigest()}"
    with db.open_scan_local_file(scan_dir, manifest_path) as source:
        digest, version = file_digest_and_version(source, "sealed scan manifest")
    if digest != expected:
        raise SystemExit("The sealed scan manifest changed after completion.")
    return digest, version

def save_patch(
    db: Any,
    connection: sqlite3.Connection,
    scan_id: str,
    current: sqlite3.Row,
    path: str,
    digest: str,
    patch: bytes,
    record_update: Callable[[], None],
) -> None:
    def admit() -> Path:
        record_update()
        latest = db.require_scan(connection, scan_id)
        directory = db.require_canonical_scan_directory(Path(latest["scan_dir"]))
        if scan_root_identity(directory)[1] != identity:
            raise SystemExit("The scan directory changed after seal validation.")
        with db.open_scan_local_file(directory, db.ARTIFACTS["manifest"]) as named:
            current_version = scan_local_file_version(named.fileno())
        if latest["seal_manifest_digest"] not in (None, manifest_digest) or not same_file_version(
            manifest_version, current_version
        ):
            raise SystemExit("The sealed scan manifest changed after completion.")
        return directory

    def prepare_saved_patch(directory: Path) -> tuple[os.stat_result, int]:
        with db.open_scan_local_file(directory, path) as named:
            version = matching_patch_metadata(named, digest)
            if os.name == "posix":
                # Persist the file and every directory entry before SQLite commits its path.
                os.fsync(named.fileno())
                with (
                    managed_fd(_open_verified_scan_directory(directory, identity)) as root,
                    managed_fd(
                        _open_scan_local_directory(
                            root, Path(path).parts[:-1], create=False, sync_parents=True
                        )
                    ) as parent,
                ):
                    os.fsync(parent)
        return version

    def verify_name(directory: Path, expected: tuple[os.stat_result, int]) -> None:
        with db.open_scan_local_file(directory, path) as named:
            if not same_file_version(expected, scan_local_file_version(named.fileno())):
                raise SystemExit("The scan-local patch changed during generation.")
        if scan_root_identity(directory)[1] != identity:
            raise SystemExit("The scan directory changed while saving the patch.")

    existing = current["patch_path"] is not None
    retried_directory = None
    identity = None
    while True:
        scan = db.require_scan(connection, scan_id)
        root_changed_during_validation = False
        with ExitStack() as staging:
            try:
                scan_dir = db.require_canonical_scan_directory(Path(scan["scan_dir"]))
                if identity is None:
                    scan_dir, root_identity = scan_root_identity(scan_dir)
                    manifest_digest, manifest_version = patch_manifest_version(db, scan, scan_dir)
                    root_changed_during_validation = (
                        scan_root_identity(scan_dir)[1] != root_identity
                    )
                    if root_changed_during_validation:
                        raise ContractError("The scan directory changed during seal validation.")
                    identity = root_identity
                publish = None
                if not existing:
                    with suppress(FileExistsError):
                        publish = staging.enter_context(
                            stage_scan_local_bytes(
                                scan_dir,
                                path,
                                patch,
                                expected_root_identity=identity,
                                owner_read_write=True,
                            )
                        )
                if publish is None:
                    metadata = prepare_saved_patch(scan_dir)
            except (ContractError, OSError, SystemExit) as exc:
                # Archiving moves the directory before committing its new location.
                with connection:
                    connection.execute("BEGIN IMMEDIATE")
                    directory = db.require_scan(connection, scan_id)["scan_dir"]
                if directory == scan["scan_dir"]:
                    if directory == retried_directory:
                        raise
                    # Rollback can restore a missing file or the verified staging root.
                    cause: BaseException | None = exc
                    while cause and not isinstance(
                        cause, (FileNotFoundError, MissingScanLocalFileError)
                    ):
                        cause = cause.__cause__
                    if (
                        cause is None
                        and not root_changed_during_validation
                        and not (
                            isinstance(exc, ContractError)
                            and identity is not None
                            and scan_root_identity(Path(directory))[1] == identity
                        )
                    ):
                        raise
                    retried_directory = directory
                continue
            directory = admit()
            if publish is not None:
                with suppress(FileExistsError):
                    publish(directory)
                # Keep the token's file, including a competing winner, if cancellation
                # or interruption wins before final admission. Verify it outside SQLite.
                connection.rollback()
                existing = True
                continue
        verify_name(directory, metadata)
        return

def remediation_claim_is_active(remediation: sqlite3.Row) -> bool:
    if remediation["pending_action_claim_token"] is None:
        return False
    delivered_at = remediation["pending_action_delivered_at"]
    claimed_at = delivered_at or remediation["pending_action_claimed_at"]
    if not isinstance(claimed_at, str):
        return True
    try:
        if claimed_at.endswith(("Z", "z")):
            claimed_at = claimed_at[:-1] + "+00:00"
        parsed = datetime.fromisoformat(claimed_at)
        if parsed.tzinfo is None:
            return True
    except ValueError:
        return True
    lease_seconds = DELIVERED_ACTION_LEASE_SECONDS if delivered_at else CLAIM_LEASE_SECONDS
    return parsed > datetime.now(timezone.utc) - timedelta(seconds=lease_seconds)

def require_transition(current: str, requested: str) -> None:
    allowed = {
        "requested": {"requested", "generated", "failed"},
        "generated": {"generated", "applied", "failed"},
        "applied": {"applied", "verifying", "failed"},
        "verifying": {"verifying", "verified", "failed"},
        "verified": {"verifying", "verified"},
        "failed": {"generated", "applied", "verifying", "verified", "failed"},
    }
    if requested not in allowed.get(current, set()):
        raise SystemExit(f"Finding remediation cannot move from {current} to {requested}.")

def require_pending_action(current: sqlite3.Row, requested: str) -> None:
    pending_action = current["pending_action"]
    if pending_action is not None:
        allowed = {
            "generate": {"generated", "failed"},
            "apply": {"applied", "failed"},
            "verify": {"verifying", "verified", "failed"},
        }
        if requested not in allowed[pending_action]:
            raise SystemExit(
                f"Pending remediation action {pending_action} cannot record state {requested}."
            )
        return
    required_action = {
        ("requested", "generated"): "generate",
        ("generated", "applied"): "apply",
        ("applied", "verifying"): "verify",
    }.get((current["state"], requested))
    if required_action is not None:
        raise SystemExit(
            f"Request {required_action} before recording remediation state {requested}."
        )

def cancel_finding_remediation_request(
    connection: sqlite3.Connection, args: argparse.Namespace
) -> str:
    request_id = require_uuid(args.request_id, "request-id")
    action_token = require_uuid(args.action_token, "action-token")
    connection.execute("BEGIN IMMEDIATE")
    with connection:
        occurrence = require_occurrence(connection, args.occurrence_id)
        current = connection.execute(
            "SELECT * FROM finding_remediation_attempts WHERE request_id = ?",
            (request_id,),
        ).fetchone()
        if current is None:
            return str(occurrence["scan_id"])
        if current["occurrence_id"] != occurrence["id"]:
            raise SystemExit("This remediation request belongs to a different finding.")
        if current["pending_action"] is None:
            return str(occurrence["scan_id"])
        if current["state"] == "failed" and current["pending_action_claim_token"] is None:
            return str(occurrence["scan_id"])
        if current["pending_action_claim_token"] != action_token:
            raise SystemExit("This remediation host request is owned by a different action token.")
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        if current["state"] == "failed":
            connection.execute(
                """
                UPDATE finding_remediation_attempts
                SET pending_action_claimed_at = NULL, pending_action_claim_token = NULL,
                    pending_action_delivered_at = NULL, updated_at = ?
                WHERE request_id = ? AND pending_action_claim_token = ?
                """,
                (timestamp, request_id, action_token),
            )
        elif current["pending_action"] == "generate":
            _cancel_generation(
                connection, occurrence["id"], request_id, timestamp, current["state"]
            )
            connection.execute(
                "UPDATE scans SET updated_at = ? WHERE id = ?",
                (timestamp, occurrence["scan_id"]),
            )
        else:
            connection.execute(
                """
                UPDATE finding_remediation_attempts
                SET state = CASE
                        WHEN pending_action = 'verify' AND state = 'verifying' THEN 'applied'
                        ELSE state
                    END,
                    pending_action = NULL, pending_action_claimed_at = NULL,
                    pending_action_claim_token = NULL, pending_action_delivered_at = NULL,
                    version = version + 1, updated_at = ?
                WHERE request_id = ? AND pending_action_claim_token = ?
                """,
                (timestamp, request_id, action_token),
            )
    return str(occurrence["scan_id"])

def _cancel_generation(
    connection: sqlite3.Connection,
    occurrence_id: str,
    request_id: str,
    timestamp: str,
    state: str,
) -> None:
    if state != "requested":
        raise SystemExit("Only a requested patch generation can be canceled.")
    connection.execute(
        "DELETE FROM finding_remediation_attempts WHERE request_id = ?", (request_id,)
    )
    previous = latest_attempt(connection, occurrence_id)
    if previous is None or previous["state"] != "superseded":
        return
    restored_state = "applied" if previous["applied_content_digest"] is not None else "generated"
    connection.execute(
        """
        UPDATE finding_remediation_attempts
        SET state = ?, version = version + 1, updated_at = ?
        WHERE request_id = ? AND state = 'superseded'
        """,
        (restored_state, timestamp, previous["request_id"]),
    )

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_saved_results.py`

_70 KB, too large to embed. Read it in the repository._

## File: `scripts/workbench_scan_history.py`

```python
"""Scan history projection for the native Codex Security workbench."""

import argparse
import fnmatch
import hashlib
import json
import os
import sqlite3
import sys
from collections.abc import Iterable, Iterator
from fractions import Fraction
from functools import cache
from itertools import chain
from pathlib import Path, PurePosixPath
from typing import Any, Callable

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from finalize_scan_contract import (
    ContractError,
    _prepare_scan_finalization,
    _read_scan_local_json_bytes,
    _read_sealed_scan,
    manifest_is_sealed,
)
from report_projection import SEVERITY_ORDER
from review_state import review_state
from workbench_constants import ARTIFACTS, FINDINGS_PAGE_MAX, PRIMARY_FINDING_LOCATION_SQL
from workbench_scan_usage import stored_scan_cost_fields
from workbench_source_scopes import public_scan_recipe
from workbench_target import (
    require_remediation_target,
    require_scan_target_identity,
    verified_windows_checkout,
)
from workbench_target_state import (
    RepositoryIdentityCache,
    _timestamp_ns,
    repository_relative_path,
    same_repository_worktree,
    scan_repository_generation,
)
from workbench_validation import timestamp_key

def reads_missing_history(args: argparse.Namespace, path: Path) -> bool:
    """Select an in-memory database only for history reads on a fresh profile."""
    if args.command not in {"list-scans", "list-repositories", "list-global-findings"} and not (
        args.command == "get-scan" and not (args.request_id or args.action_token)
    ):
        return False
    try:
        path.lstat()
    except FileNotFoundError:
        return True
    except OSError:
        # The ordinary connection reports inaccessible storage.
        pass
    return False

def rename_scan(connection: sqlite3.Connection, scan: sqlite3.Row, name: str) -> dict[str, Any]:
    name = name.strip()
    if not name:
        raise SystemExit("Scan name cannot be empty.")
    connection.execute("UPDATE scans SET name = ? WHERE id = ?", (name, scan["id"]))
    connection.commit()
    return {"scanId": scan["id"], "name": name}

def scan_recipe(scan: sqlite3.Row) -> dict[str, Any]:
    """Return the public launch recipe with its scan and parent IDs, raising SystemExit if the recipe was never saved."""
    if scan["recipe_json"] is None:
        raise SystemExit("This scan does not have a saved launch recipe.")
    return {
        "parentScanId": scan["parent_scan_id"],
        "recipe": public_scan_recipe(scan),
        "scanId": scan["id"],
    }

def expected_coverage_mode(scan: sqlite3.Row) -> str:
    """Return the coverage mode implied by the recorded scope, scan mode, and diff target kind."""
    if scan["mode"] == "diff":
        mode = {
            "commit": "commit",
            "range": "branch_diff",
            "working_tree": "working_tree",
        }.get(scan["diff_target_kind"])
        if mode is None:
            raise SystemExit("This migrated diff scan does not have a validated change set.")
        return mode
    if scan["scope"] != "." or (
        "recipe_json" in scan.keys()
        and scan["recipe_json"] is not None
        and json.loads(scan["recipe_json"])["target"]["kind"] == "paths"
    ):
        return "scoped_path"
    return "deep_repository" if scan["mode"] == "deep" else "repository"

def preserve_sealed_completion(
    binding: dict[str, Any], manifest: dict[str, Any] | None
) -> dict[str, Any]:
    """Copy the original timestamps and producer version from a sealed manifest into binding, then return it."""
    manifest_scan = manifest.get("scan") if manifest is not None else None
    if isinstance(manifest_scan, dict) and manifest_scan.get("sealedAt") is not None:
        # Keep the original producer; finalization still validates schema, seal and owner.
        binding["startedAt"] = manifest_scan.get("startedAt")
        binding["completedAt"] = manifest_scan.get("completedAt")
        producer = manifest_scan.get("producer")
        if isinstance(producer, dict):
            binding["producer"]["version"] = producer.get("version")
    return binding

def _windows_resume_checkout(scan: sqlite3.Row) -> Path:
    from workbench_scan_start import scan_target_identity

    replaced = "Cannot resume: the original checkout is missing or was replaced."
    try:
        repository = require_remediation_target(scan["target_path"])
    except SystemExit as exc:
        raise SystemExit(replaced) from exc
    with verified_windows_checkout(scan, repository, replaced_message=replaced):
        expected = (scan["target_revision"], scan["target_snapshot_digest"])
        current = scan_target_identity(
            repository, None, expected_digest=scan["target_snapshot_digest"]
        )
        if current[:2] != expected:
            raise SystemExit("Cannot resume: the original checkout revision or contents changed.")
    return repository

def cli_scan_resume(
    wb: Any,
    connection: sqlite3.Connection,
    scan: sqlite3.Row,
    workspace: sqlite3.Row,
) -> dict[str, Any]:

    scan = scan_with_progress(connection, scan["id"])
    if scan["mode"] not in {"standard", "deep"} or scan["recipe_json"] is None:
        raise SystemExit("Resume requires a Standard or Deep Scan with a saved CLI launch recipe.")
    if scan["status"] != "running" or scan["canceled_at"] is not None:
        raise SystemExit(
            "Resume requires a running scan; completed, failed, and canceled scans cannot resume."
        )
    thread_id = scan["continuation_thread_id"]
    owner = scan["deep_scan_owner_thread_id"] or workspace["thread_id"]
    if (
        not thread_id
        or (owner is not None and owner != thread_id)
        or scan["handoff_status"] != "delivered"
        or scan["handoff_claim_token"] is not None
    ):
        raise SystemExit("Resume requires the original owning CLI session.")
    run = connection.execute(
        "SELECT status, cancel_requested FROM deep_scan_runs WHERE scan_id = ?", (scan["id"],)
    ).fetchone()
    if run is not None and (
        run["status"] not in {"running", "succeeded"} or run["cancel_requested"]
    ):
        raise SystemExit("This Deep Scan has stopped and cannot resume.")
    if os.name == "nt":
        try:
            repository = _windows_resume_checkout(scan)
        except OSError as exc:
            raise SystemExit(f"Cannot verify the original Windows checkout: {exc}") from exc
    else:
        from workbench_scan_start import scan_target_identity

        try:
            repository = require_scan_target_identity(scan)
        except SystemExit as exc:
            raise SystemExit(
                "Cannot resume: the original checkout is missing or was replaced."
            ) from exc
        if scan_target_identity(
            repository, None, expected_digest=scan["target_snapshot_digest"]
        ) != (
            scan["target_revision"],
            scan["target_snapshot_digest"],
            scan["target_device"],
            scan["target_inode"],
        ):
            raise SystemExit("Cannot resume: the original checkout revision or contents changed.")
    recipe = wb.parse_scan_recipe(scan["recipe_json"], repository)
    scan_dir = wb.require_canonical_scan_directory(Path(scan["scan_dir"]))
    if os.name == "nt":
        from windows_scan_local_files import DEEP_RESUME_DIRECTORY, deep_resume_output_identity

        identity = scan["windows_resume_output_identity"]
        if identity is not None:
            try:
                current = deep_resume_output_identity(scan_dir)
            except OSError as exc:
                raise SystemExit(
                    f"Cannot verify the registered Windows resume output: {exc}"
                ) from exc
            if current != json.loads(identity):
                raise SystemExit(
                    "Cannot resume: the original Windows output directory was replaced."
                )
        elif not any(entry != scan_dir / DEEP_RESUME_DIRECTORY for entry in scan_dir.iterdir()):
            raise SystemExit(
                "Cannot resume this empty Windows output because its original directory identity "
                f"was not saved. Start a new scan with 'codex-security scans rerun {scan['id']}'."
            )
    result = {
        "contract": wb.scan_contract(scan),
        "lifecycle": json.loads(scan["lifecycle_json"]),
        "recipe": recipe,
        "scanDir": str(scan_dir),
        "scanId": scan["id"],
        "scopeFileCount": scan["scope_file_count"],
        "startedAt": scan["started_at"],
        "targetId": scan["target_id"],
        "targetRevision": scan["target_revision"],
        "threadId": thread_id,
        "userContext": scan["user_context"],
    }
    # Active coordinators may still be writing drafts. Validate sealed results
    # before attaching to a coordinator that has finished.
    if run is not None and run["status"] == "succeeded":
        manifest_path = wb.artifact_path(scan_dir, ARTIFACTS["manifest"], required=False)
        if manifest_path is not None:
            manifest = wb.read_json_object(manifest_path)
            manifest_scan = manifest.get("scan")
            if isinstance(manifest_scan, dict) and manifest_is_sealed(manifest_scan):
                try:
                    binding = wb.workbench_completion_binding(scan, scan["started_at"], manifest)
                    _prepare_scan_finalization(
                        scan_dir,
                        expected_coverage_mode=binding["coverageMode"],
                        completion_binding=binding,
                    )
                    result["sealedProducerVersion"] = manifest_scan["producer"]["version"]
                except ContractError as exc:
                    raise SystemExit(f"Cannot resume sealed scan: {exc}") from exc
    return result

def coverage_summary_for_history(
    wb: Any, scan: sqlite3.Row, canonical_scan_directory: Callable[[Path], Path]
) -> dict[str, Any]:
    """Return the coverage mode and path filters for history after verifying the sealed scan data."""
    scan_dir = canonical_scan_directory(Path(scan["scan_dir"]))
    coverage_ref = "coverage.json"
    try:
        if scan["seal_manifest_digest"] is None:
            # Older workbench rows can have valid seals without a pinned digest.
            manifest, _, coverage, _ = _read_sealed_scan(scan_dir, None, "history coverage")
            wb.verify_manifest_binding(scan, manifest)
            if coverage["mode"] != wb.expected_coverage_mode(scan):
                raise ContractError("coverage.mode: must match the workbench scan")
        else:
            # Completion already validated the full scan. History only needs the
            # pinned manifest and any legacy coverage artifact, not findings or receipts.
            manifest, manifest_bytes = _read_scan_local_json_bytes(
                scan_dir, ARTIFACTS["manifest"], ARTIFACTS["manifest"]
            )
            if (
                f"sha256:{hashlib.sha256(manifest_bytes).hexdigest()}"
                != scan["seal_manifest_digest"]
            ):
                raise ContractError("The sealed scan manifest changed after completion.")
            sealed_scan = manifest["scan"]
            if sealed_scan["id"] != scan["id"] or not sealed_scan.get("sealedAt"):
                raise ContractError("The sealed coverage does not belong to this scan.")
            if "coverageRef" not in sealed_scan:
                coverage = review_state(sealed_scan)
                return {
                    key: coverage[key]
                    for key in ("mode", "includePaths", "excludePaths", "explicitExclusions")
                }
            if sealed_scan["coverageRef"] != coverage_ref:
                raise ContractError("The sealed coverage does not belong to this scan.")
            coverage, coverage_bytes = _read_scan_local_json_bytes(
                scan_dir, coverage_ref, coverage_ref
            )
            expected = next(
                (
                    artifact["sha256"]
                    for artifact in sealed_scan["artifacts"]
                    if artifact["path"] == coverage_ref
                ),
                None,
            )
            if (
                hashlib.sha256(coverage_bytes).hexdigest() != expected
                or coverage.get("scanId") != scan["id"]
            ):
                raise ContractError("The sealed coverage changed after completion.")
    except ContractError as exc:
        raise SystemExit(str(exc)) from exc
    return {
        key: coverage[key]
        for key in (
            "mode",
            "includePaths",
            "excludePaths",
            "explicitExclusions",
        )
    }

def _windows_path_key(value: str) -> str:
    return os.path.normcase(os.path.realpath(value))

def _same_repository(
    connection: sqlite3.Connection,
    before: sqlite3.Row,
    after: sqlite3.Row,
    *,
    identities: RepositoryIdentityCache | None = None,
) -> bool:
    before_stored = scan_repository_generation(before)
    after_stored = scan_repository_generation(after)
    if before_stored is not None and before_stored == after_stored:
        return True
    if before["target_id"] and before["target_id"] == after["target_id"]:
        return before_stored is None or after_stored is None
    identities = identities or RepositoryIdentityCache(connection)
    before_state = identities.for_row(before)
    after_state = identities.for_row(after)
    if (
        not before_state.ownership_matches
        or not after_state.ownership_matches
        or before_stored is not None
        and before_stored != before_state.live_identity
        or after_stored is not None
        and after_stored != after_state.live_identity
    ):
        return False
    if (
        before_state.resolved_path is not None
        and before_state.resolved_path == after_state.resolved_path
    ):
        return before_stored is None or after_stored is None
    if before_state.repository is None or after_state.repository is None:
        if same_repository_worktree(Path(before_state.target_path), Path(after_state.target_path)):
            return True
        before_relative = repository_relative_path(Path(before_state.target_path))
        after_relative = repository_relative_path(Path(after_state.target_path))
        after_origin = identities.origin(after_state)
        return (
            before_relative is not None
            and before_relative == after_relative
            and after_origin is not None
            and identities.origin(before_state) == after_origin
        )
    before_identity = before_state.live_identity
    after_identity = after_state.live_identity
    if before_identity is not None and before_identity == after_identity:
        return True
    if before_identity is None or after_identity is None:
        return False
    after_origin = identities.origin(after_state)
    return (
        after_origin is not None
        and identities.origin(before_state) == after_origin
        and before_state.repository.relative_path == after_state.repository.relative_path
    )

SCAN_SUMMARY_COLUMNS = """
    scans.*,
    lifecycle.snapshot AS lifecycle_json,
    progress.reportable_findings_count,
    progress.scope_file_count,
    progress.review_items_completed,
    progress.review_items_total,
    progress.updated_at AS progress_updated_at,
    (
        SELECT COUNT(*)
        FROM finding_occurrences AS occurrences
        WHERE occurrences.scan_id = scans.id
    ) AS finding_count
"""
SCAN_SUMMARY_QUERY = f"""
SELECT {SCAN_SUMMARY_COLUMNS}
FROM scans
JOIN scan_progress AS progress ON progress.scan_id = scans.id
JOIN scan_lifecycles AS lifecycle ON lifecycle.scan_id = scans.id
"""

def scan_with_progress(connection: sqlite3.Connection, scan_id: str) -> sqlite3.Row:
    return connection.execute(
        """
        SELECT scans.*, lifecycle.snapshot AS lifecycle_json, progress.updated_at AS progress_updated_at,
               progress.scope_file_count, progress.reportable_findings_count,
               progress.review_items_total, progress.review_items_completed, progress.deep_review_pass,
               progress.phase_items_total, progress.phase_items_completed, progress.phase_progress_unit,
               progress.preflight_checks_total, progress.preflight_checks_completed,
               progress.preflight_issues_json
        FROM scans
        JOIN scan_progress AS progress ON progress.scan_id = scans.id
        JOIN scan_lifecycles AS lifecycle ON lifecycle.scan_id = scans.id
        WHERE scans.id = ?
        """,
        (scan_id,),
    ).fetchone()

def scan_summary(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "completedAt": row["completed_at"],
        "logCompletedAt": row["log_completed_at"],
        "continuationThreadId": row["continuation_thread_id"],
        **stored_scan_cost_fields(row["cost_json"]),
        "findingCount": row["finding_count"],
        "lifecycle": json.loads(row["lifecycle_json"]),
        "handoffStatus": row["handoff_status"],
        "mode": row["mode"],
        "model": row["model"],
        "name": row["name"],
        "parentScanId": row["parent_scan_id"],
        "progress": {
            "candidates": {"reportable": row["reportable_findings_count"]},
            "coverage": {
                "closedRows": row["review_items_completed"],
                "filesTotal": row["scope_file_count"],
                "worklistRows": row["review_items_total"],
            },
            "phase": row["phase"],
            "status": "canceled" if row["canceled_at"] else row["status"],
            "updatedAt": row["progress_updated_at"],
        },
        "recipeAvailable": row["recipe_json"] is not None,
        "reasoningEffort": row["reasoning_effort"],
        "scanDir": row["scan_dir"],
        "scanId": row["id"],
        "scope": row["scope"],
        "startedAt": row["started_at"],
        "targetId": row["target_id"],
        "targetPath": row["target_path"],
        "targetRevision": row["target_revision"],
        "targetSummary": row["target_summary"],
        "updatedAt": max(
            row["updated_at"],
            row["progress_updated_at"],
            key=lambda value: (timestamp_key(value), value),
        ),
        **(
            {"warnings": json.loads(row["completion_warnings_json"])}
            if row["completion_warnings_json"] != "[]"
            else {}
        ),
    }

def list_scans(
    connection: sqlite3.Connection, args: argparse.Namespace | None = None
) -> dict[str, Any]:
    connection.create_function("casefold", 1, str.casefold, deterministic=True)
    if os.name == "nt":
        connection.create_function("codex_security_path_key", 1, _windows_path_key)
    clauses: list[str] = []
    values: list[Any] = []
    worktree_order = ""
    if args is not None and args.repository:
        repository = Path(args.repository).expanduser().absolute()
        identities = RepositoryIdentityCache(connection)
        repository = Path(identities.history_path(str(repository)))
        clause, scope_values = identities.scope_for_path(str(repository)).sql(
            supports_generation=identities.supports_generation
        )
        clauses.append(clause)
        values.extend(scope_values)
        if getattr(args, "prefer_worktree", False):

            @cache
            def in_worktree(target_path: str) -> bool:
                try:
                    return repository.samefile(target_path)
                except OSError:
                    return False

            connection.create_function("in_worktree", 1, in_worktree)
            worktree_order = "in_worktree(scans.target_path) DESC,"
    if args is not None and args.scan_root:
        scan_root = str(Path(args.scan_root).expanduser().resolve())
        prefix = scan_root.rstrip(os.sep) + os.sep
        if os.name == "nt":
            scan_root = _windows_path_key(scan_root)
            prefix = scan_root.rstrip(os.sep) + os.sep
            clauses.append(
                "(codex_security_path_key(scans.scan_dir) = ? "
                "OR substr(codex_security_path_key(scans.scan_dir), 1, ?) = ?)"
            )
        else:
            clauses.append("(scans.scan_dir = ? OR substr(scans.scan_dir, 1, ?) = ?)")
        values.extend((scan_root, len(prefix), prefix))
    if args is not None and args.target_id:
        clauses.append("scans.target_id = ?")
        values.append(args.target_id)
    if args is not None and args.mode:
        clauses.append("scans.mode = ?")
        values.append(args.mode)
    if args is not None and args.status:
        if args.status == "canceled":
            clauses.append("scans.canceled_at IS NOT NULL")
        else:
            clauses.append("scans.status = ? AND scans.canceled_at IS NULL")
            values.append(args.status)
    if args is not None and args.query:
        query = args.query.strip().casefold()
        if query:
            clauses.append(
                "(instr(casefold(scans.target_path), ?) > 0 "
                "OR instr(casefold(COALESCE(scans.name, '')), ?) > 0 "
                "OR instr(casefold(COALESCE(scans.target_summary, '')), ?) > 0 "
                "OR instr(casefold(scans.scope), ?) > 0 "
                "OR instr(casefold(scans.mode), ?) > 0)"
            )
            values.extend((query, query, query, query, query))
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    paginated = args is not None and (args.limit is not None or args.offset != 0)
    limit = (args.limit or FINDINGS_PAGE_MAX) if paginated else None
    pagination = "LIMIT ? OFFSET ?" if paginated else ""
    if limit is not None:
        values.extend((limit + 1, args.offset))
    rows = connection.execute(
        f"""
        {SCAN_SUMMARY_QUERY}
        {where}
        ORDER BY {worktree_order}
            CASE WHEN scans.status = 'running' AND scans.canceled_at IS NULL THEN 0 ELSE 1 END,
            MAX(julianday(upper(scans.updated_at)), julianday(upper(progress.updated_at))) DESC,
            julianday(upper(scans.started_at)) DESC,
            scans.id
        {pagination}
        """,
        values,
    ).fetchall()
    scans = [scan_summary(row) for row in rows[:limit]]
    if worktree_order:
        for scan in scans:
            scan["inCurrentWorktree"] = in_worktree(scan["targetPath"])
    result = {"scans": scans}
    if limit is not None:
        result.update(
            {
                "limit": limit,
                "nextOffset": args.offset + limit if len(rows) > limit else None,
                "offset": args.offset,
            }
        )
    return result

def _scan_completion_order(scan: sqlite3.Row) -> tuple[int, int | Fraction, str]:
    sequence = scan["completion_sequence"] if "completion_sequence" in scan.keys() else None
    if sequence is not None:
        return (1, sequence, scan["id"])
    completed_at = scan["completed_at"] if "completed_at" in scan.keys() else None
    timestamp = _timestamp_ns(completed_at)
    if timestamp is None:
        timestamp = _timestamp_ns(scan["started_at"])
    return (0, timestamp if timestamp is not None else 0, scan["id"])

_FindingSites = dict[tuple[str, str | None, PurePosixPath, int, int], dict[str, Any] | None]
# Match the first location shown by compactFinding in finding-catalogue.ts.
_COMPARISON_LOCATION_RANK = {"root_control": 0, "expected_control": 1, "concrete_implementation": 1}

def _unique_finding_sites(findings: list[dict[str, Any]]) -> _FindingSites:
    sites = {}
    for finding in findings:
        if not finding.get("locations"):
            return {}
        location = min(
            finding["locations"],
            key=lambda site: _COMPARISON_LOCATION_RANK.get(site.get("role"), 2),
        )
        key = (
            finding["ruleId"],
            finding["identity"].get("instance"),
            PurePosixPath(location["path"]),
            location["startLine"],
            location.get("endLine", location["startLine"]),
        )
        sites[key] = None if key in sites else finding
    return sites

def _cross_mode_context(
    before: sqlite3.Row,
    after: sqlite3.Row,
    findings: dict[str, list[dict[str, Any]]],
    sites: dict[str, _FindingSites],
) -> dict[str, Any]:
    # Different repository subdirectories can share both the Git revision and clean digest.
    if (
        {before["mode"], after["mode"]} != {"standard", "deep"}
        or before["target_id"] is None
        or before["target_id"] != after["target_id"]
        or before["target_revision"] != after["target_revision"]
        or before["target_snapshot_digest"] is None
        or before["target_snapshot_digest"] != after["target_snapshot_digest"]
        or not findings[before["id"]]
        or not findings[after["id"]]
    ):
        return {}
    for scan_id in (before["id"], after["id"]):
        if scan_id not in sites:
            sites[scan_id] = _unique_finding_sites(findings[scan_id])
    later = sites[after["id"]]
    occurrences = []
    for site, old in sites[before["id"]].items():
        new = later.get(site)
        if old and new and old["identity"]["anchor"] != new["identity"]["anchor"]:
            occurrences.extend((old["occurrenceId"], new["occurrenceId"]))
    return {"crossModeOccurrenceIds": occurrences} if occurrences else {}

def list_unmatched_scan_pairs(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    *,
    backfill_finding_details: Callable[[sqlite3.Connection, sqlite3.Row], None],
    read_coverage: Callable[[sqlite3.Row], dict[str, Any]],
) -> dict[str, Any]:
    requested_repository = Path(args.repository).expanduser().absolute()
    repository = requested_repository.resolve()
    identities = RepositoryIdentityCache(connection)
    requested = identities.for_path(str(requested_repository))
    if identities.supports_identity:
        requested.require_owner()
    clause, values = identities.scope_for_path(str(requested_repository)).sql(
        supports_generation=identities.supports_generation
    )
    selected = connection.execute(
        f"SELECT * FROM scans WHERE status = 'complete' AND {clause}",
        values,
    ).fetchall()

    selected.sort(key=lambda scan: (timestamp_key(scan["started_at"]), scan["id"]))

    available = []
    for scan in selected:
        try:
            read_coverage(scan)
        except SystemExit:
            continue
        available.append(scan)

    saved_pairs = {
        frozenset((row["before_scan_id"], row["after_scan_id"]))
        for row in connection.execute("SELECT before_scan_id, after_scan_id FROM scan_comparisons")
    }
    focus_scan_id = getattr(args, "after_scan_id", None)
    if focus_scan_id is not None and not any(scan["id"] == focus_scan_id for scan in selected):
        raise SystemExit("The scan to match is not a completed scan in this repository.")
    if focus_scan_id is not None:
        available.sort(key=_scan_completion_order)
    batches = []
    skipped = 0
    matching_findings: dict[str, list[dict[str, Any]]] = {}
    sites: dict[str, _FindingSites] = {}
    known_links: list[sqlite3.Row] | None = None
    for index, after in enumerate(available):
        if focus_scan_id is not None and after["id"] != focus_scan_id:
            continue
        candidates = [
            before
            for before in available[:index]
            if _same_repository(connection, before, after, identities=identities)
        ]
        previous = [
            before
            for before in candidates
            if args.force or frozenset((before["id"], after["id"])) not in saved_pairs
        ]
        skipped += len(candidates) - len(previous)
        if not previous:
            continue
        if known_links is None:
            known_links = (
                []
                if args.force
                else _saved_finding_links(connection, {scan["id"] for scan in selected})
            )
        for scan in (*previous, after):
            if scan["id"] not in matching_findings:
                backfill_finding_details(connection, scan)
                matching_findings[scan["id"]] = [
                    _matching_input(row) for row in _scan_findings(connection, scan["id"]).values()
                ]
        known_groups = _known_finding_groups(
            known_links,
            {
                scan["id"]
                for scan in selected
                if (
                    _scan_completion_order(scan) <= _scan_completion_order(after)
                    if focus_scan_id is not None
                    else (timestamp_key(scan["started_at"]), scan["id"])
                    <= (timestamp_key(after["started_at"]), after["id"])
                )
            },
        )
        batches.append(
            {
                "afterFindings": matching_findings[after["id"]],
                "afterScanId": after["id"],
                "beforeScans": [
                    {
                        **_cross_mode_context(before, after, matching_findings, sites),
                        "findings": matching_findings[before["id"]],
                        "scanId": before["id"],
                    }
                    for before in previous
                ],
                **({"knownFindingGroups": known_groups} if known_groups else {}),
            }
        )
    return {
        "batches": batches,
        "repository": str(repository),
        "scanCount": len(selected),
        "skippedPairs": skipped,
        "unavailableScans": len(selected) - len(available),
    }

def _saved_finding_links(connection: sqlite3.Connection, scan_ids: set[str]) -> list[sqlite3.Row]:
    return [
        row
        for row in _rows_for_ids(
            connection,
            """
            SELECT before.scan_id AS before_scan_id, before.finding_id AS before_finding_id,
                after.scan_id AS after_scan_id, after.finding_id AS after_finding_id
            FROM scan_comparison_matches AS matches
            JOIN finding_occurrences AS before ON before.id = matches.before_occurrence_id
            JOIN finding_occurrences AS after ON after.id = matches.after_occurrence_id
            WHERE matches.before_scan_id IN (SELECT value FROM json_each(?))
            ORDER BY matches.before_scan_id, after.scan_id, before.finding_id, after.finding_id
            """,
            sorted(scan_ids),
        )
        if row["before_scan_id"] in scan_ids and row["after_scan_id"] in scan_ids
    ]

def _finding_aliases(links: Iterable[tuple[str, str]]) -> dict[str, str]:
    parents: dict[str, str] = {}

    def root(value: str) -> str:
        parents.setdefault(value, value)
        while parents[value] != value:
            parents[value] = parents[parents[value]]
            value = parents[value]
        return value

    for before_id, after_id in links:
        parents[root(after_id)] = root(before_id)
    return {finding_id: root(finding_id) for finding_id in parents}

def _known_finding_groups(links: list[sqlite3.Row], scan_ids: set[str]) -> list[list[str]]:
    aliases = _finding_aliases(
        (link["before_finding_id"], link["after_finding_id"])
        for link in links
        if link["before_scan_id"] in scan_ids and link["after_scan_id"] in scan_ids
    )
    groups: dict[str, list[str]] = {}
    for finding_id, identity in aliases.items():
        groups.setdefault(identity, []).append(finding_id)
    return sorted(sorted(group) for group in groups.values() if len(group) > 1)

def compare_scans(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    *,
    require_scan: Callable[[sqlite3.Connection, str], sqlite3.Row],
    read_coverage: Callable[[sqlite3.Row], dict[str, Any]],
    backfill_finding_details: Callable[[sqlite3.Connection, sqlite3.Row], None] | None = None,
    include_matching_inputs: bool = False,
    require_matches: bool = False,
) -> dict[str, Any]:
    """Compare completed scans of the same repository, returning finding groups and any inputs needed for matching."""
    before = require_scan(connection, args.before_scan_id)
    after = require_scan(connection, args.after_scan_id)
    if before["id"] == after["id"]:
        raise SystemExit("Select two different scans to compare.")
    if before["status"] != "complete" or after["status"] != "complete":
        raise SystemExit("Only completed scans can be compared.")
    if not _same_repository(connection, before, after):
        raise SystemExit("Semantic scan comparisons require the same repository target.")
    cached = connection.execute(
        "SELECT result_json FROM scan_comparisons WHERE before_scan_id = ? AND after_scan_id = ?",
        (before["id"], after["id"]),
    ).fetchone()
    if cached is None and require_matches:
        reversed_comparison = connection.execute(
            "SELECT 1 FROM scan_comparisons WHERE before_scan_id = ? AND after_scan_id = ?",
            (after["id"], before["id"]),
        ).fetchone()
        if reversed_comparison is not None:
            raise SystemExit(
                "These scans are in the wrong order. Run "
                f"'codex-security scans compare {after['id']} {before['id']}'."
            )
        raise SystemExit(
            "No saved matches for these scans. Run 'codex-security scans compare BEFORE AFTER' first."
        )
    if include_matching_inputs and backfill_finding_details is not None:
        backfill_finding_details(connection, before)
        backfill_finding_details(connection, after)
    after_coverage = read_coverage(after)
    before_findings = _scan_findings(connection, before["id"])
    after_findings = _scan_findings(connection, after["id"])
    matches = json.loads(cached["result_json"]) if cached is not None else None
    saved_matches = matches["matches"] if matches is not None else []
    occurrences = before_findings | after_findings
    aliases = _confirmed_finding_aliases(connection, occurrences)
    groups = _finding_groups(before_findings, after_findings, saved_matches, aliases)
    uncertain = (
        {
            (side, match[f"{side}OccurrenceId"]): match["reason"]
            for match in matches.get("uncertain", [])
            for side in ("before", "after")
        }
        if matches is not None
        else {}
    )
    findings: list[dict[str, Any]] = []
    summary = {
        status: 0
        for status in ("new", "persisting", "resolved", "not_observed", "reopened", "unknown")
    }

    for previous_rows, current_rows, match_reason in groups:
        selected_rows = current_rows or previous_rows
        selected = min(selected_rows, key=lambda row: SEVERITY_ORDER[row["severity"]])
        item = {
            "findingId": selected["finding_id"],
            "path": selected["relative_path"],
            "severity": selected["severity"],
            "title": selected["title"],
        }
        side = "after" if current_rows else "before"
        uncertain_reason = next(
            (
                uncertain[(side, row["id"])]
                for row in selected_rows
                if (side, row["id"]) in uncertain
            ),
            None,
        )
        if previous_rows and current_rows:
            status = (
                "reopened"
                if any(
                    row["triage_status"] == "closed" and row["close_reason"] == "already_fixed"
                    for row in previous_rows
                )
                and any(row["triage_status"] == "open" for row in current_rows)
                else "persisting"
            )
            if match_reason is not None:
                item["matchReason"] = match_reason
        elif uncertain_reason is not None:
            status = "unknown"
            item["reason"] = uncertain_reason
        elif current_rows:
            status = "new"
        elif not all(
            scan_covers_path(
                after,
                target_id=after["target_id"],
                path=row["relative_path"],
                coverage=after_coverage,
            )
            for row in previous_rows
        ):
            status = "unknown"
            item["reason"] = "The affected path was excluded or outside the later scope."
        elif all(
            row["triage_status"] == "closed" and row["close_reason"] == "already_fixed"
            for row in previous_rows
        ):
            status = "resolved"
        else:
            status = "not_observed"
            item["reason"] = "Not observed in the later scan; remediation has not been verified."
        if len(previous_rows) == 1:
            item["beforeOccurrenceId"] = previous_rows[0]["id"]
        elif previous_rows:
            item["beforeOccurrenceIds"] = [row["id"] for row in previous_rows]
        if len(current_rows) == 1:
            item["afterOccurrenceId"] = current_rows[0]["id"]
        elif current_rows:
            item["afterOccurrenceIds"] = [row["id"] for row in current_rows]
        if current_rows:
            item["triage"] = {
                "closeReason": selected["close_reason"],
                "status": selected["triage_status"],
            }
        item["status"] = status
        findings.append(item)
        summary[status] += 1

    result = {
        "afterScanId": after["id"],
        "beforeScanId": before["id"],
        "findings": findings,
        "repository": before["target_path"],
        "summary": summary,
    }
    if matches is not None and matches.get("related"):
        related = _separate_finding_pairs(matches["related"], occurrences, aliases)
        if related:
            result["related"] = [
                {
                    **pair,
                    "beforeTitle": occurrences[pair["beforeOccurrenceId"]]["title"],
                    "afterTitle": occurrences[pair["afterOccurrenceId"]]["title"],
                }
                for pair in related
            ]
    if include_matching_inputs:
        identities = RepositoryIdentityCache(connection)
        after_key = (timestamp_key(after["started_at"]), after["id"])
        known_scan_ids = {
            scan["id"]
            for scan in connection.execute("SELECT * FROM scans WHERE status = 'complete'")
            if (timestamp_key(scan["started_at"]), scan["id"]) <= after_key
            and _same_repository(connection, scan, after, identities=identities)
        }
        excluded_pairs = {(before["id"], after["id"]), (after["id"], before["id"])}
        known_groups = _known_finding_groups(
            [
                link
                for link in _saved_finding_links(connection, known_scan_ids)
                if (link["before_scan_id"], link["after_scan_id"]) not in excluded_pairs
            ],
            known_scan_ids,
        )
        inputs = {
            before["id"]: [_matching_input(row) for row in before_findings.values()],
            after["id"]: [_matching_input(row) for row in after_findings.values()],
        }
        result["matchingCached"] = cached is not None
        result["matchingInputs"] = {
            "before": inputs[before["id"]],
            "after": inputs[after["id"]],
            **_cross_mode_context(before, after, inputs, {}),
            **({"knownFindingGroups": known_groups} if known_groups else {}),
        }
    return result

def save_scan_comparison(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    *,
    now: Callable[[], str],
    require_scan: Callable[[sqlite3.Connection, str], sqlite3.Row],
    read_coverage: Callable[[sqlite3.Row], dict[str, Any]],
) -> dict[str, Any]:
    before = require_scan(connection, args.before_scan_id)
    after = require_scan(connection, args.after_scan_id)
    if before["id"] == after["id"]:
        raise SystemExit("Select two different scans to compare.")
    if before["status"] != "complete" or after["status"] != "complete":
        raise SystemExit("Only completed scans can be compared.")
    if not _same_repository(connection, before, after):
        raise SystemExit("Semantic scan comparisons require the same repository target.")
    read_coverage(after)
    allowed = {
        "before": set(_scan_findings(connection, before["id"])),
        "after": set(_scan_findings(connection, after["id"])),
    }
    matches_json = (
        sys.stdin.read() if getattr(args, "matches_json_stdin", False) else args.matches_json
    )
    try:
        payload = json.loads(matches_json)
    except (TypeError, ValueError) as exc:
        raise SystemExit("Scan comparison matches must be a valid JSON object.") from exc
    if (
        not isinstance(payload, dict)
        or not {"matches", "uncertain"}.issubset(payload)
        or set(payload) - {"matches", "uncertain", "related"}
    ):
        raise SystemExit("Scan comparison matches must contain matches and uncertain arrays.")
    if any(
        not isinstance(payload.get(key, []), list) for key in ("matches", "uncertain", "related")
    ):
        raise SystemExit("Scan comparison matches must contain matches and uncertain arrays.")
    consumed: dict[str, dict[str, int]] = {"before": {}, "after": {}}
    for group, match in enumerate(payload["matches"]):
        if (
            not isinstance(match, dict)
            or match.get("confidence") != "high"
            or not isinstance(match.get("reason"), str)
            or not match["reason"].strip()
        ):
            raise SystemExit("Scan comparison matches must have high confidence and a reason.")
        for side in ("before", "after"):
            occurrences = match.get(f"{side}OccurrenceIds")
            if not isinstance(occurrences, list) or any(
                not isinstance(value, str) for value in occurrences
            ):
                raise SystemExit("Scan comparison matches must identify distinct scan findings.")
            unique = set(occurrences)
            if (
                not occurrences
                or len(unique) != len(occurrences)
                or not unique.issubset(allowed[side])
                or not unique.isdisjoint(consumed[side])
            ):
                raise SystemExit("Scan comparison matches must identify distinct scan findings.")
            consumed[side].update((occurrence_id, group) for occurrence_id in unique)
    uncertain_pairs = set()
    for match in payload["uncertain"]:
        if not _valid_finding_pair(match):
            raise SystemExit("Uncertain scan comparison matches must identify distinct findings.")
        pair = (match["beforeOccurrenceId"], match["afterOccurrenceId"])
        if (
            pair[0] not in allowed["before"]
            or pair[0] in consumed["before"]
            or pair[1] not in allowed["after"]
            or pair[1] in consumed["after"]
            or pair in uncertain_pairs
        ):
            raise SystemExit("Uncertain scan comparison matches must identify distinct findings.")
        uncertain_pairs.add(pair)
    related_pairs = set()
    for match in payload.get("related", []):
        if not _valid_finding_pair(match):
            raise SystemExit("Related scan comparison findings must identify distinct findings.")
        pair = (match["beforeOccurrenceId"], match["afterOccurrenceId"])
        group = consumed["before"].get(pair[0])
        if (
            pair[0] not in allowed["before"]
            or pair[1] not in allowed["after"]
            or (group is not None and group == consumed["after"].get(pair[1]))
            or pair in uncertain_pairs
            or pair in related_pairs
        ):
            raise SystemExit("Related scan comparison findings must identify distinct findings.")
        related_pairs.add(pair)
    timestamp = now()
    with connection:
        connection.execute("BEGIN IMMEDIATE")
        connection.execute(
            "DELETE FROM scan_comparisons "
            "WHERE (before_scan_id = ? AND after_scan_id = ?) "
            "OR (before_scan_id = ? AND after_scan_id = ?)",
            (before["id"], after["id"], after["id"], before["id"]),
        )
        connection.execute(
            """
            INSERT INTO scan_comparisons (
                before_scan_id, after_scan_id, result_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                before["id"],
                after["id"],
                json.dumps(payload, allow_nan=False, sort_keys=True),
                timestamp,
                timestamp,
            ),
        )
        connection.executemany(
            """
            INSERT INTO scan_comparison_matches (
                before_scan_id, after_scan_id, before_occurrence_id, after_occurrence_id, reason
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                (before["id"], after["id"], previous, current, match["reason"])
                for match in payload["matches"]
                for previous in match["beforeOccurrenceIds"]
                for current in match["afterOccurrenceIds"]
            ),
        )
    return compare_scans(connection, args, require_scan=require_scan, read_coverage=read_coverage)

def _valid_finding_pair(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and set(value) == {"beforeOccurrenceId", "afterOccurrenceId", "reason"}
        and all(isinstance(item, str) and item.strip() for item in value.values())
    )

def _rows_for_ids(
    connection: sqlite3.Connection, query: str, ids: Iterable[str]
) -> Iterator[sqlite3.Row]:
    values = tuple(dict.fromkeys(ids))
    if values:
        yield from connection.execute(query, (json.dumps(values),))

# Stable finding IDs already include the target identity. Follow their indexed
# occurrences instead of resolving repository paths or scanning every saved link.
_FINDING_NEIGHBORS_SQL = """
    FROM linked
    CROSS JOIN finding_occurrences AS source
        ON source.finding_id = linked.finding_id
    CROSS JOIN scan_comparison_matches AS matches
        ON matches.before_occurrence_id = source.id OR matches.after_occurrence_id = source.id
    CROSS JOIN finding_occurrences AS neighbor ON neighbor.id = CASE
        WHEN matches.before_occurrence_id = source.id THEN matches.after_occurrence_id
        ELSE matches.before_occurrence_id END
"""
# Traverse only the selected findings' components, including recurring stable IDs.
_LINKED_FINDINGS_SQL = f"""
    WITH RECURSIVE linked(finding_id) AS (
        SELECT occurrences.finding_id
        FROM finding_occurrences AS occurrences
        WHERE occurrences.id IN (SELECT value FROM json_each(?))
        UNION
        SELECT neighbor.finding_id
        {_FINDING_NEIGHBORS_SQL}
    )
"""

def _confirmed_finding_aliases(
    connection: sqlite3.Connection, occurrence_ids: Iterable[str]
) -> dict[str, str]:
    query = f"""
        {_LINKED_FINDINGS_SQL}
        SELECT DISTINCT linked.finding_id AS before_finding_id,
            neighbor.finding_id AS after_finding_id
        {_FINDING_NEIGHBORS_SQL}
    """
    return _finding_aliases(
        (row["before_finding_id"], row["after_finding_id"])
        for row in _rows_for_ids(connection, query, occurrence_ids)
    )

def _separate_finding_pairs(
    pairs: list[dict[str, Any]],
    occurrences: dict[str, sqlite3.Row],
    aliases: dict[str, str],
) -> list[dict[str, Any]]:
    def identity(occurrence_id: str) -> str:
        finding_id = occurrences[occurrence_id]["finding_id"]
        return aliases.get(finding_id, finding_id)

    return [
        pair
        for pair in pairs
        if identity(pair["beforeOccurrenceId"]) != identity(pair["afterOccurrenceId"])
    ]

def finding_relations(
    connection: sqlite3.Connection, scan_id: str, occurrence_ids: Iterable[str]
) -> dict[str, list[dict[str, Any]]]:
    selected = set(occurrence_ids)
    if not selected:
        return {}
    pairs = []
    for comparison in connection.execute(
        "SELECT before_scan_id, after_scan_id, result_json FROM scan_comparisons "
        "WHERE before_scan_id = ? OR after_scan_id = ? "
        "ORDER BY before_scan_id, after_scan_id",
        (scan_id, scan_id),
    ):
        side = "before" if comparison["before_scan_id"] == scan_id else "after"
        other = "after" if side == "before" else "before"
        for pair in json.loads(comparison["result_json"]).get("related", []):
            if pair[f"{side}OccurrenceId"] in selected:
                pairs.append(
                    {
                        "beforeOccurrenceId": pair[f"{side}OccurrenceId"],
                        "afterOccurrenceId": pair[f"{other}OccurrenceId"],
                        "afterScanId": comparison[f"{other}_scan_id"],
                        "reason": pair["reason"],
                    }
                )
    occurrences = {
        row["id"]: row
        for row in _rows_for_ids(
            connection,
            "SELECT id, finding_id, scan_id, title FROM finding_occurrences "
            "WHERE id IN (SELECT value FROM json_each(?))",
            (pair[key] for pair in pairs for key in ("beforeOccurrenceId", "afterOccurrenceId")),
        )
    }
    pairs = [
        pair
        for pair in pairs
        if pair["beforeOccurrenceId"] in occurrences
        and occurrences[pair["beforeOccurrenceId"]]["scan_id"] == scan_id
        and pair["afterOccurrenceId"] in occurrences
        and occurrences[pair["afterOccurrenceId"]]["scan_id"] == pair["afterScanId"]
    ]
    result: dict[str, list[dict[str, Any]]] = {}
    aliases = _confirmed_finding_aliases(connection, (pair["beforeOccurrenceId"] for pair in pairs))
    for pair in _separate_finding_pairs(pairs, occurrences, aliases):
        finding = occurrences[pair["afterOccurrenceId"]]
        result.setdefault(pair["beforeOccurrenceId"], []).append(
            {
                "findingId": finding["finding_id"],
                "occurrenceId": finding["id"],
                "reason": pair["reason"],
                "scanId": pair["afterScanId"],
                "title": finding["title"],
            }
        )
    return result

def finding_management_updated_at(connection: sqlite3.Connection, scan_id: str) -> str | None:
    return connection.execute(
        """
        SELECT MAX(updated_at)
        FROM (
            SELECT triage.updated_at
            FROM finding_triage AS triage
            JOIN finding_occurrences AS occurrences ON occurrences.id = triage.occurrence_id
            WHERE occurrences.scan_id = ?
            UNION ALL
            SELECT remediation.updated_at
            FROM finding_remediation_attempts AS remediation
            JOIN finding_occurrences AS occurrences ON occurrences.id = remediation.occurrence_id
            WHERE occurrences.scan_id = ?
        )
        """,
        (scan_id, scan_id),
    ).fetchone()[0]

def finding_triage_result(connection: sqlite3.Connection, occurrence_id: str) -> dict[str, Any]:
    row = connection.execute(
        "SELECT status, close_reason, note, updated_at FROM finding_triage WHERE occurrence_id = ?",
        (occurrence_id,),
    ).fetchone()
    if row is None:
        return {"status": "open"}
    return {
        "closeReason": row["close_reason"],
        "note": row["note"],
        "status": row["status"],
        "updatedAt": row["updated_at"],
    }

def finding_matches(
    connection: sqlite3.Connection, occurrence_id: str, scan_id: str, started_at: str
) -> tuple[list[dict[str, Any]], str, list[str]]:
    rows = connection.execute(
        """
        SELECT matches.after_scan_id AS scan_id, occurrences.id AS occurrence_id, occurrences.finding_id,
            occurrences.title, matches.reason
        FROM scan_comparison_matches AS matches
        JOIN finding_occurrences AS occurrences ON occurrences.id = matches.after_occurrence_id
        WHERE matches.before_occurrence_id = ?
        UNION
        SELECT matches.before_scan_id AS scan_id, occurrences.id AS occurrence_id, occurrences.finding_id,
            occurrences.title, matches.reason
        FROM scan_comparison_matches AS matches
        JOIN finding_occurrences AS occurrences ON occurrences.id = matches.before_occurrence_id
        WHERE matches.after_occurrence_id = ?
        ORDER BY scan_id, occurrence_id
        """,
        (occurrence_id, occurrence_id),
    ).fetchall()
    linked_rows = list(
        _rows_for_ids(
            connection,
            f"""
            {_LINKED_FINDINGS_SQL}
            SELECT occurrences.id AS occurrence_id, occurrences.finding_id, occurrences.title,
                scans.started_at, scans.id AS scan_id
            FROM linked
            CROSS JOIN finding_occurrences AS occurrences
                ON occurrences.finding_id = linked.finding_id
            CROSS JOIN scans ON scans.id = occurrences.scan_id
            """,
            (occurrence_id,),
        )
    )
    known_scans = sorted(
        {(started_at, scan_id)} | {(row["started_at"], row["scan_id"]) for row in linked_rows},
        key=lambda scan: (timestamp_key(scan[0]), scan[1]),
    )
    included = {occurrence_id, *(row["occurrence_id"] for row in rows)}
    rows.extend(
        {
            **row,
            "reason": "The findings share a stable identity or a previously confirmed link.",
        }
        for row in linked_rows
        if row["occurrence_id"] not in included
    )
    rows.sort(key=lambda row: (row["scan_id"], row["occurrence_id"]))
    known_scan_ids = [known_scans[0][1]]
    if len(known_scans) > 1:
        known_scan_ids.append(known_scans[-1][1])
    return (
        [
            {
                "findingId": row["finding_id"],
                "occurrenceId": row["occurrence_id"],
                "reason": row["reason"],
                "scanId": row["scan_id"],
                "title": row["title"],
            }
            for row in rows
        ],
        known_scans[0][0],
        known_scan_ids,
    )

def _finding_groups(
    before_findings: dict[str, sqlite3.Row],
    after_findings: dict[str, sqlite3.Row],
    matches: list[dict[str, Any]],
    aliases: dict[str, str],
) -> list[tuple[list[sqlite3.Row], list[sqlite3.Row], str | None]]:
    rows = {"before": before_findings, "after": after_findings}
    groups: dict[str, tuple[list[sqlite3.Row], list[sqlite3.Row], list[str]]] = {}

    def group(row: sqlite3.Row) -> tuple[list[sqlite3.Row], list[sqlite3.Row], list[str]]:
        finding_id = row["finding_id"]
        return groups.setdefault(aliases.get(finding_id, finding_id), ([], [], []))

    for match in matches:
        group(rows["before"][match["beforeOccurrenceIds"][0]])[2].append(match["reason"])
    for index, side in enumerate(("before", "after")):
        occurrence_ids = dict.fromkeys(
            chain(
                (value for match in matches for value in match[f"{side}OccurrenceIds"]),
                rows[side],
            )
        )
        for occurrence_id in occurrence_ids:
            row = rows[side][occurrence_id]
            group(row)[index].append(row)
    result = [
        (
            previous,
            current,
            (
                " ".join(dict.fromkeys(reasons))
                if reasons
                else "The findings share a stable identity or a previously confirmed link."
            )
            if previous and current
            else None,
        )
        for previous, current, reasons in groups.values()
    ]
    return sorted(
        result,
        key=lambda group: (
            (group[1] or group[0])[0]["finding_id"],
            (group[1] or group[0])[0]["id"],
        ),
    )

def _matching_input(row: sqlite3.Row) -> dict[str, Any]:
    finding = json.loads(row["details_json"])
    return {
        **finding,
        "findingId": row["finding_id"],
        "occurrenceId": row["id"],
        "remediation": row["remediation"],
        "severity": {"level": row["severity"], **finding.get("severity", {})},
        "summary": row["summary"],
        "title": row["title"],
    }

def finding_occurrence_rows(
    connection: sqlite3.Connection,
    scan_id: str,
    *,
    offset: int,
    limit: int,
    query: str | None = None,
    severity: str | None = None,
    status: str | None = None,
) -> list[sqlite3.Row]:
    connection.create_function("casefold", 1, str.casefold, deterministic=True)
    conditions, values = finding_occurrence_conditions(
        scan_id, query=query, severity=severity, status=status
    )
    severity_order = " ".join(
        f"WHEN '{level}' THEN {rank}" for level, rank in SEVERITY_ORDER.items()
    )
    return connection.execute(
        f"""
        SELECT
            occurrences.id,
            occurrences.finding_id,
            occurrences.title,
            occurrences.summary,
            occurrences.severity,
            occurrences.confidence,
            occurrences.remediation,
            occurrences.details_json,
            occurrences.created_at
        FROM finding_occurrences AS occurrences
        LEFT JOIN finding_triage AS triage ON triage.occurrence_id = occurrences.id
        WHERE {conditions}
        ORDER BY
            CASE occurrences.severity {severity_order} ELSE 5 END,
            occurrences.created_at,
            occurrences.id
        LIMIT ? OFFSET ?
        """,
        (*values, limit, offset),
    ).fetchall()

def finding_occurrence_conditions(
    scan_id: str,
    *,
    query: str | None,
    severity: str | None,
    status: str | None,
) -> tuple[str, list[str]]:
    conditions = ["occurrences.scan_id = ?"]
    values = [scan_id]
    if severity is not None:
        conditions.append("occurrences.severity = ?")
        values.append(severity)
    if status is not None:
        conditions.append("COALESCE(triage.status, 'open') = ?")
        values.append(status)
    if query:
        search = query.strip().casefold()
        if search:
            conditions.append(
                "(instr(casefold(occurrences.title), ?) > 0 "
                "OR instr(casefold(occurrences.summary), ?) > 0 "
                "OR EXISTS ("
                "SELECT 1 FROM finding_locations AS locations "
                "WHERE locations.occurrence_id = occurrences.id "
                "AND instr(casefold(locations.relative_path), ?) > 0))"
            )
            values.extend((search, search, search))
    return " AND ".join(conditions), values

def _scan_findings(connection: sqlite3.Connection, scan_id: str) -> dict[str, sqlite3.Row]:
    """Index one scan's finding rows by the occurrence IDs used in comparisons."""
    rows = connection.execute(
        f"""
        SELECT occurrences.*,
            COALESCE(triage.status, 'open') AS triage_status, triage.close_reason,
            (SELECT relative_path {PRIMARY_FINDING_LOCATION_SQL}) AS relative_path
        FROM finding_occurrences AS occurrences
        LEFT JOIN finding_triage AS triage ON triage.occurrence_id = occurrences.id
        WHERE occurrences.scan_id = ?
        """,
        (scan_id,),
    )
    return {row["id"]: row for row in rows}

def scan_covers_path(
    scan: sqlite3.Row,
    *,
    target_id: str,
    path: str | None,
    coverage: dict[str, Any],
) -> bool:
    """Check whether a completed scan of this target included the path after applying all recorded exclusions."""
    if scan["status"] != "complete" or scan["target_id"] != target_id:
        return False
    if not isinstance(path, str) or not path:
        return False
    included = coverage.get("includePaths")
    if not isinstance(included, list) or not any(
        isinstance(scope, str) and _path_within(path, scope) for scope in included
    ):
        return False
    excluded = coverage.get("excludePaths")
    if not isinstance(excluded, list):
        return False
    if any(isinstance(scope, str) and _path_matches(path, scope) for scope in excluded):
        return False
    exclusions = coverage.get("explicitExclusions")
    if not isinstance(exclusions, list):
        return False
    if any(
        isinstance(exclusion, dict)
        and isinstance(exclusion.get("pattern"), str)
        and _path_matches(path, exclusion["pattern"])
        for exclusion in exclusions
    ):
        return False
    return True

def _path_within(path: str, scope: str) -> bool:
    candidate = PurePosixPath(path)
    parent = PurePosixPath(scope)
    return parent == PurePosixPath(".") or candidate == parent or parent in candidate.parents

def _path_matches(path: str, pattern: str) -> bool:
    return _path_within(path, pattern) or fnmatch.fnmatchcase(path, pattern)

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```
