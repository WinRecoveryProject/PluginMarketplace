# Plugin files: codex-security — `scripts/` (part 2 of 2)

Source: `plugins/codex-security`. Files outside the `skills/*` folders, embedded as text.

## File: `scripts/workbench_cli.py`

```python
"""Command-line argument parsing for the Codex Security workbench."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import deep_scan_workbench as deep_scan
import workbench_remediation as remediation
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
)

def parse_args(description: str) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=description)
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_workspace = subparsers.add_parser("create-workspace")
    create_workspace.add_argument("--workspace-id", required=True)
    create_workspace.add_argument("--thread-id")
    create_workspace.add_argument("--target-path")
    create_workspace.add_argument("--target-title")
    create_workspace.add_argument("--target-summary")
    create_workspace.add_argument("--user-context")
    create_workspace.add_argument("--scope")
    create_workspace.add_argument("--mode", choices=MODES, default="standard")
    create_workspace.add_argument("--diff-target-kind", choices=DIFF_TARGET_KINDS)
    create_workspace.add_argument("--diff-base-revision")
    create_workspace.add_argument("--diff-head-revision")
    create_workspace.add_argument("--diff-content-digest")

    get_workspace = subparsers.add_parser("get-workspace")
    get_workspace.add_argument("--workspace-id", required=True)
    get_workspace.add_argument("--thread-id")

    inspect_target = subparsers.add_parser("inspect-target")
    inspect_target.add_argument("--target-path", required=True)

    inspect_setup = subparsers.add_parser("inspect-setup")
    inspect_setup.add_argument("--target-path", required=True)
    inspect_setup.add_argument("--scope", required=True)
    inspect_setup.add_argument("--mode", choices=MODES, required=True)
    inspect_setup.add_argument("--diff-target-kind", choices=DIFF_TARGET_KINDS)
    inspect_setup.add_argument("--diff-base-revision")
    inspect_setup.add_argument("--diff-head-revision")
    inspect_setup.add_argument("--diff-content-digest")

    save_workspace = subparsers.add_parser("save-workspace")
    save_workspace.add_argument("--workspace-id", required=True)
    save_workspace.add_argument("--target-path", required=True)
    save_workspace.add_argument("--scope", required=True)
    save_workspace.add_argument("--mode", choices=MODES, required=True)
    save_workspace.add_argument("--target-summary")
    save_workspace.add_argument("--user-context")
    save_workspace.add_argument("--diff-target-kind", choices=DIFF_TARGET_KINDS)
    save_workspace.add_argument("--diff-base-revision")
    save_workspace.add_argument("--diff-head-revision")
    save_workspace.add_argument("--diff-content-digest")

    start_scan = subparsers.add_parser("start-scan")
    start_scan.add_argument("--workspace-id", required=True)
    start_scan.add_argument("--scan-root")
    start_scan.add_argument("--model")
    start_scan.add_argument("--reasoning-effort")

    start_prompt_only_scan = subparsers.add_parser("start-prompt-only-scan")
    start_prompt_only_scan.add_argument("--thread-id", required=True)
    start_prompt_only_scan.add_argument("--target-path", required=True)
    start_prompt_only_scan.add_argument("--scope", required=True)
    start_prompt_only_scan.add_argument("--mode", choices=("diff", "standard"), required=True)
    start_prompt_only_scan.add_argument("--target-summary")
    start_prompt_only_scan.add_argument("--user-context")
    start_prompt_only_scan.add_argument("--diff-target-kind", choices=DIFF_TARGET_KINDS)
    start_prompt_only_scan.add_argument("--diff-base-revision")
    start_prompt_only_scan.add_argument("--diff-head-revision")
    start_prompt_only_scan.add_argument("--diff-content-digest")
    start_prompt_only_scan.add_argument("--scan-root")
    start_prompt_only_scan.add_argument("--model")
    start_prompt_only_scan.add_argument("--reasoning-effort")

    start_headless_standard_scan = subparsers.add_parser("start-headless-standard-scan")
    start_headless_standard_scan.add_argument("--thread-id", required=True)
    start_headless_standard_scan.add_argument("--target-path", required=True)
    start_headless_standard_scan.add_argument("--scope", required=True)
    start_headless_standard_scan.add_argument("--target-summary")
    start_headless_standard_scan.add_argument("--user-context")
    start_headless_standard_scan.add_argument("--scan-root")
    start_headless_standard_scan.add_argument("--model")
    start_headless_standard_scan.add_argument("--reasoning-effort")
    start_headless_standard_scan.set_defaults(
        mode="standard",
        diff_target_kind=None,
        diff_base_revision=None,
        diff_head_revision=None,
        diff_content_digest=None,
    )

    deep_scan.register_subcommands(subparsers, positive_int)

    get_scan = subparsers.add_parser("get-scan")
    get_scan.add_argument("--scan-id", required=True)
    get_scan.add_argument("--occurrence-id")

    get_scan_feedback = subparsers.add_parser("get-scan-feedback")
    get_scan_feedback.add_argument("--scan-id", required=True)

    update_scan_context = subparsers.add_parser("update-scan-context")
    update_scan_context.add_argument("--scan-id", required=True)
    update_scan_context.add_argument("--user-context", required=True)
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
    list_scans.add_argument("--scan-root")
    list_scans.add_argument("--offset", type=non_negative_int, default=0)
    list_scans.add_argument("--limit", type=positive_int)

    list_unmatched_scan_pairs = subparsers.add_parser("list-unmatched-scan-pairs")
    list_unmatched_scan_pairs.add_argument("--repository", required=True)
    list_unmatched_scan_pairs.add_argument("--force", action="store_true")

    register_cli_scan = subparsers.add_parser("register-cli-scan")
    register_cli_scan.add_argument("--scan-dir", required=True)
    register_cli_scan.add_argument("--repository", required=True)
    register_cli_scan.add_argument("--recipe-json", required=True)
    register_cli_scan.add_argument("--user-context")
    register_cli_scan.add_argument("--parent-scan-id")
    register_cli_scan.add_argument("--archive-existing", action="store_true")
    register_cli_scan.add_argument("--archived-scan-dir")

    set_scan_thread = subparsers.add_parser("set-scan-thread")
    set_scan_thread.add_argument("--scan-id", required=True)
    set_scan_thread.add_argument("--thread-id", required=True)

    get_scan_recipe = subparsers.add_parser("get-scan-recipe")
    get_scan_recipe.add_argument("--scan-id", required=True)

    compare_scans = subparsers.add_parser("compare-scans")
    compare_scans.add_argument("--before-scan-id", required=True)
    compare_scans.add_argument("--after-scan-id", required=True)
    compare_scans.add_argument("--include-matching-inputs", action="store_true")
    compare_scans.add_argument("--require-matches", action="store_true")

    save_scan_comparison = subparsers.add_parser("save-scan-comparison")
    save_scan_comparison.add_argument("--before-scan-id", required=True)
    save_scan_comparison.add_argument("--after-scan-id", required=True)
    save_scan_comparison.add_argument("--matches-json", required=True)

    list_global_findings = subparsers.add_parser("list-global-findings")
    list_global_findings.add_argument("--query")
    list_global_findings.add_argument("--severity", choices=FINDING_SEVERITIES)
    list_global_findings.add_argument("--status", choices=FINDING_STATUSES)
    list_global_findings.add_argument("--target-id")
    list_global_findings.add_argument("--offset", type=non_negative_int, default=0)
    list_global_findings.add_argument("--limit", type=positive_int, default=FINDINGS_PAGE_MAX)
    list_repositories = subparsers.add_parser("list-repositories")
    list_repositories.add_argument("--query")
    list_repositories.add_argument("--target-id")
    list_repositories.add_argument("--status", choices=("scanned", "not_scanned", "open_findings"))
    list_repositories.add_argument("--offset", type=non_negative_int, default=0)
    list_repositories.add_argument("--limit", type=positive_int)

    list_findings = subparsers.add_parser("list-findings")
    list_findings.add_argument("--scan-id", required=True)
    list_findings.add_argument("--query")
    list_findings.add_argument("--severity", choices=FINDING_SEVERITIES)
    list_findings.add_argument("--status", choices=FINDING_STATUSES)
    list_findings.add_argument("--offset", type=non_negative_int, default=0)
    list_findings.add_argument("--limit", type=positive_int, default=FINDINGS_PAGE_MAX)

    update_progress = subparsers.add_parser("update-progress")
    update_progress.add_argument("--scan-id", required=True)
    update_progress.add_argument("--phase", choices=PHASES)
    update_progress.add_argument("--phase-items-total", type=non_negative_int)
    update_progress.add_argument("--phase-items-completed", type=non_negative_int)
    update_progress.add_argument("--phase-progress-unit", choices=PHASE_PROGRESS_UNITS)
    update_progress.add_argument("--preflight-issues-json")
    update_progress.add_argument("--review-items-total", type=non_negative_int)
    update_progress.add_argument("--review-items-completed", type=non_negative_int)
    update_progress.add_argument("--reportable-findings-count", type=non_negative_int)
    update_progress.add_argument("--deep-review-pass", type=positive_int)
    update_progress.add_argument("--claim-token")
    update_progress.add_argument("--coordinator-generation", type=positive_int)
    update_progress.add_argument("--model")
    update_progress.add_argument("--reasoning-effort")

    prepare_scan_completion = subparsers.add_parser("prepare-scan-completion")
    prepare_scan_completion.add_argument("--scan-id", required=True)
    prepare_scan_completion.add_argument("--claim-token")

    complete_scan = subparsers.add_parser("complete-scan")
    complete_scan.add_argument("--scan-id", required=True)
    complete_scan.add_argument("--claim-token")
    complete_scan.add_argument("--cost-json")
    complete_scan.add_argument("--thread-id")

    complete_budget_exhausted_scan = subparsers.add_parser("complete-budget-exhausted-scan")
    complete_budget_exhausted_scan.add_argument("--scan-id", required=True)
    complete_budget_exhausted_scan.add_argument("--cost-json", required=True)
    complete_budget_exhausted_scan.add_argument("--message")

    cancel_scan = subparsers.add_parser("cancel-scan")
    cancel_scan.add_argument("--scan-id", required=True)
    cancel_scan.add_argument("--thread-id")

    fail_scan = subparsers.add_parser("fail-scan")
    fail_scan.add_argument("--scan-id", required=True)
    fail_scan.add_argument("--message", required=True)
    fail_scan.add_argument("--claim-token")
    fail_scan.add_argument("--cost-json")

    preserve_scan = subparsers.add_parser("preserve-scan-results")
    preserve_scan.add_argument("--scan-id", required=True)
    preserve_scan.add_argument("--thread-id")
    preserve_scan.add_argument("--claim-token")
    preserve_scan.add_argument("--coordinator-generation", type=positive_int)

    write_scan_draft = subparsers.add_parser("write-scan-draft")
    write_scan_draft.add_argument("--scan-id", required=True)
    write_scan_draft.add_argument("--draft-path", required=True)
    write_scan_draft.add_argument("--checkpoint-path")
    write_scan_draft.add_argument("--expected-draft-digest")
    write_scan_draft.add_argument("--claim-token")

    mark_handoff_delivered = subparsers.add_parser("mark-handoff-delivered")
    mark_handoff_delivered.add_argument("--scan-id", required=True)
    mark_handoff_delivered.add_argument("--claim-token", required=True)
    mark_handoff_delivered.add_argument("--thread-id")

    claim_handoff_delivery = subparsers.add_parser("claim-handoff-delivery")
    claim_handoff_delivery.add_argument("--scan-id", required=True)
    claim_handoff_delivery.add_argument("--claim-token", required=True)
    claim_handoff_delivery.add_argument("--take-over-stale", action="store_true")

    release_handoff_delivery = subparsers.add_parser("release-handoff-delivery")
    release_handoff_delivery.add_argument("--scan-id", required=True)
    release_handoff_delivery.add_argument("--claim-token", required=True)

    attach_scan_continuation_thread = subparsers.add_parser("attach-scan-continuation-thread")
    attach_scan_continuation_thread.add_argument("--scan-id", required=True)
    attach_scan_continuation_thread.add_argument("--claim-token", required=True)
    attach_scan_continuation_thread.add_argument("--thread-id", required=True)

    set_finding_triage = subparsers.add_parser("set-finding-triage")
    set_finding_triage.add_argument("--occurrence-id", required=True)
    set_finding_triage.add_argument("--status", choices=FINDING_STATUSES, required=True)
    set_finding_triage.add_argument("--close-reason", choices=FINDING_CLOSE_REASONS)
    set_finding_triage.add_argument("--note")

    request_finding_remediation = subparsers.add_parser("request-finding-remediation")
    request_finding_remediation.add_argument("--occurrence-id", required=True)
    request_finding_remediation.add_argument("--request-id", required=True)
    request_finding_remediation.add_argument("--action-token", required=True)

    request_finding_remediation_action = subparsers.add_parser("request-finding-remediation-action")
    request_finding_remediation_action.add_argument("--occurrence-id", required=True)
    request_finding_remediation_action.add_argument("--request-id", required=True)
    request_finding_remediation_action.add_argument(
        "--expected-version", type=positive_int, required=True
    )
    request_finding_remediation_action.add_argument(
        "--action", choices=("apply", "verify"), required=True
    )
    request_finding_remediation_action.add_argument("--action-token", required=True)

    claim_finding_remediation_resend = subparsers.add_parser("claim-finding-remediation-resend")
    claim_finding_remediation_resend.add_argument("--occurrence-id", required=True)
    claim_finding_remediation_resend.add_argument("--request-id", required=True)
    claim_finding_remediation_resend.add_argument("--action-token", required=True)

    mark_finding_remediation_delivered = subparsers.add_parser("mark-finding-remediation-delivered")
    mark_finding_remediation_delivered.add_argument("--occurrence-id", required=True)
    mark_finding_remediation_delivered.add_argument("--request-id", required=True)
    mark_finding_remediation_delivered.add_argument("--action-token", required=True)

    release_finding_remediation_claim = subparsers.add_parser("release-finding-remediation-claim")
    release_finding_remediation_claim.add_argument("--occurrence-id", required=True)
    release_finding_remediation_claim.add_argument("--request-id", required=True)
    release_finding_remediation_claim.add_argument("--action-token", required=True)

    remediation.register_cancel_finding_remediation_request(subparsers)

    set_finding_remediation = subparsers.add_parser("set-finding-remediation")
    set_finding_remediation.add_argument("--occurrence-id", required=True)
    set_finding_remediation.add_argument("--request-id", required=True)
    set_finding_remediation.add_argument("--action-token", required=True)
    set_finding_remediation.add_argument("--expected-version", type=positive_int, required=True)
    set_finding_remediation.add_argument(
        "--state", choices=REMEDIATION_UPDATE_STATES, required=True
    )
    set_finding_remediation.add_argument("--summary")
    set_finding_remediation.add_argument("--patch-path")
    set_finding_remediation.add_argument("--patch-digest")
    set_finding_remediation.add_argument("--base-revision")
    set_finding_remediation.add_argument("--verification-summary")

    export_findings = subparsers.add_parser("export-findings")
    export_findings.add_argument("--scan-id", required=True)
    export_findings.add_argument("--format", choices=EXPORT_FORMATS, required=True)

    subparsers.add_parser("database-info")
    arguments = sys.argv[1:]
    if "--user-context-stdin" in arguments:
        if arguments.count("--user-context-stdin") != 1 or "--user-context" in arguments:
            parser.error("pass exactly one user-context transport")
        index = arguments.index("--user-context-stdin")
        arguments[index] = "--user-context=" + sys.stdin.buffer.read().decode("utf-8")
    return parser.parse_args(arguments)

def non_negative_int(value: str) -> int:
    parsed = int(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("expected a non-negative integer")
    return parsed

def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed < 1:
        raise argparse.ArgumentTypeError("expected a positive integer")
    return parsed

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
REMEDIATION_STATES = (
    "idle",
    "requested",
    "generated",
    "applied",
    "verifying",
    "verified",
    "failed",
    "superseded",
)
REMEDIATION_UPDATE_STATES = ("generated", "applied", "verifying", "verified", "failed")
REMEDIATION_PENDING_ACTIONS = ("generate", "apply", "verify")
EXPORT_FORMATS = ("csv", "json", "sarif")
ARTIFACTS = {
    "coverage": "coverage.json",
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
    "GIT_INDEX_FILE",
    "GIT_NAMESPACE",
    "GIT_OBJECT_DIRECTORY",
    "GIT_WORK_TREE",
)
EMPTY_GIT_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"

def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()

if __name__ == "__main__":
    main()
```

## Not embedded

- `scripts/workbench_db.py` (145 KB, too large to embed — read it in the repository)

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
)
from workbench_validation import bounded_output_text

def get_scan_feedback(connection: sqlite3.Connection, scan: sqlite3.Row) -> dict[str, Any]:
    rows = connection.execute(
        """
        WITH ranked_decisions AS (
            SELECT findings.id AS finding_id, findings.fingerprint, findings.rule_id,
                findings.identity_anchor, findings.identity_instance, occurrences.title,
                occurrences.summary, COALESCE(triage.status, 'open') AS triage_status,
                triage.close_reason, triage.note,
                COALESCE(triage.updated_at, source_scans.completed_at) AS updated_at,
                source_scans.id AS source_scan_id,
                source_scans.completed_at AS source_completed_at,
                locations.relative_path, locations.start_line, locations.end_line, locations.role,
                ROW_NUMBER() OVER (
                    PARTITION BY findings.id
                    ORDER BY COALESCE(triage.updated_at, source_scans.completed_at) DESC,
                        source_scans.completed_at DESC,
                        source_scans.id DESC, occurrences.id DESC
                ) AS decision_rank
            FROM finding_occurrences AS occurrences
            JOIN findings ON findings.id = occurrences.finding_id
            JOIN scans AS source_scans ON source_scans.id = occurrences.scan_id
            LEFT JOIN finding_triage AS triage ON triage.occurrence_id = occurrences.id
            JOIN finding_locations AS locations ON locations.id = (
                SELECT candidate.id
                FROM finding_locations AS candidate
                WHERE candidate.occurrence_id = occurrences.id
                ORDER BY CASE WHEN candidate.role = 'root_control' THEN 0 ELSE 1 END,
                    candidate.sort_order
                LIMIT 1
            )
            WHERE source_scans.target_id = ?
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
        ORDER BY updated_at DESC, source_completed_at DESC, source_scan_id DESC, finding_id DESC
        LIMIT 50
        """,
        (scan["target_id"], scan["id"]),
    )
    false_positives = []
    for row in rows:
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
from typing import Any

def index_findings(
    connection: sqlite3.Connection,
    scan_id: str,
    document: dict[str, Any],
    timestamp: str,
) -> None:
    findings = document.get("findings")
    if not isinstance(findings, list):
        raise SystemExit("findings.json must contain a findings array.")
    for finding in findings:
        if not isinstance(finding, dict):
            raise SystemExit("findings.json entries must be objects.")
        identity = finding["identity"]
        fingerprints = finding["fingerprints"]
        severity = finding["severity"]
        confidence = finding["confidence"]
        connection.execute(
            """
            INSERT INTO findings (
                id, fingerprint, rule_id, identity_anchor, identity_instance, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                fingerprint = excluded.fingerprint,
                rule_id = excluded.rule_id,
                identity_anchor = excluded.identity_anchor,
                identity_instance = excluded.identity_instance,
                updated_at = excluded.updated_at
            """,
            (
                finding["findingId"],
                fingerprints["primary"],
                finding["ruleId"],
                identity["anchor"],
                identity.get("instance"),
                timestamp,
                timestamp,
            ),
        )
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

## File: `scripts/workbench_native_indexes.py`

```python
"""Read-only native findings and repository indexes for the Security workbench."""

import argparse
import sqlite3
import sys
from collections import Counter
from collections.abc import Iterator
from itertools import islice
from pathlib import Path
from typing import Any

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import workbench_scan_history as scan_history
from workbench_constants import FINDING_SUMMARY_BYTES, FINDING_TITLE_BYTES, FINDINGS_PAGE_MAX
from workbench_validation import bounded_output_text

def list_global_findings(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
) -> dict[str, Any]:
    limit = min(args.limit, FINDINGS_PAGE_MAX)
    query = args.query.strip().casefold() if args.query else ""
    findings = (
        row
        for row in _indexed_findings(connection)
        if (args.target_id is None or row["target_id"] == args.target_id)
        and (args.severity is None or row["severity"] == args.severity)
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
                "createdAt": row["created_at"],
                "findingId": row["finding_id"],
                "locationPath": row["location_path"],
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
    }

def _indexed_findings(connection: sqlite3.Connection) -> Iterator[sqlite3.Row]:
    yield from connection.execute(
        """
        WITH ranked_findings AS (
            SELECT
                occurrences.id AS occurrence_id,
                occurrences.finding_id,
                occurrences.severity,
                occurrences.created_at,
                scans.id AS scan_id,
                scans.target_id,
                targets.current_path AS target_path,
                scans.scope,
                MAX(scans.updated_at, COALESCE(triage.updated_at, '')) AS updated_at,
                COALESCE(triage.status, 'open') AS status,
                COUNT(*) OVER (
                    PARTITION BY scans.target_id, occurrences.finding_id
                ) AS occurrence_count,
                ROW_NUMBER() OVER (
                    PARTITION BY scans.target_id, occurrences.finding_id
                    ORDER BY occurrences.created_at DESC, occurrences.id DESC
                ) AS occurrence_rank
            FROM finding_occurrences AS occurrences
            JOIN scans ON scans.id = occurrences.scan_id
            JOIN security_targets AS targets ON targets.id = scans.target_id
            LEFT JOIN finding_triage AS triage ON triage.occurrence_id = occurrences.id
        )
        SELECT
            selected_findings.*,
            occurrences.title,
            occurrences.summary,
            (
                SELECT locations.relative_path
                FROM finding_locations AS locations
                WHERE locations.occurrence_id = selected_findings.occurrence_id
                ORDER BY
                    CASE WHEN locations.role = 'root_control' THEN 0 ELSE 1 END,
                    locations.sort_order
                LIMIT 1
            ) AS location_path
        FROM ranked_findings AS selected_findings
        JOIN finding_occurrences AS occurrences
            ON occurrences.id = selected_findings.occurrence_id
        WHERE selected_findings.occurrence_rank = 1
        ORDER BY
            CASE selected_findings.status WHEN 'open' THEN 0 ELSE 1 END,
            CASE selected_findings.severity
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 3
                WHEN 'informational' THEN 4
                ELSE 5
            END,
            selected_findings.created_at DESC,
            selected_findings.occurrence_id
        """,
    )

def list_repositories(
    connection: sqlite3.Connection,
    args: argparse.Namespace | None = None,
) -> dict[str, Any]:
    scans = scan_history.list_scans(connection)["scans"]
    scans_by_id = {scan["scanId"]: scan for scan in scans}
    scan_count_by_target: dict[str, int] = {}
    for scan in scans:
        target_id = scan["targetId"]
        scan_count_by_target[target_id] = scan_count_by_target.get(target_id, 0) + 1

    latest_scan_by_target: dict[str, dict[str, Any]] = {}
    for row in connection.execute(
        "SELECT id, target_id FROM scans ORDER BY started_at DESC, id DESC"
    ):
        latest_scan_by_target.setdefault(row["target_id"], scans_by_id[row["id"]])

    open_findings_by_target = Counter(
        row["target_id"] for row in _indexed_findings(connection) if row["status"] == "open"
    )
    targets = {row["id"]: row for row in connection.execute("SELECT * FROM security_targets")}
    repositories = [
        {
            "checkoutAvailable": Path(target["current_path"]).is_dir(),
            "displayName": target["display_name"],
            "latestScan": latest_scan,
            "openFindingsCount": open_findings_by_target.get(target_id, 0),
            "scanCount": scan_count_by_target[target_id],
            "targetId": target_id,
            "targetPath": target["current_path"],
        }
        for target_id, latest_scan in latest_scan_by_target.items()
        if (target := targets.get(target_id)) is not None
    ]
    if args is None:
        return {"repositories": repositories}

    query = args.query.strip().casefold() if args.query else ""
    repositories = [
        repository
        for repository in repositories
        if (args.target_id is None or repository["targetId"] == args.target_id)
        and args.status != "not_scanned"
        and (args.status != "open_findings" or repository["openFindingsCount"] > 0)
        and (
            not query
            or query in repository["displayName"].casefold()
            or query in repository["targetPath"].casefold()
        )
    ]
    if args.limit is None and args.offset == 0:
        return {"repositories": repositories}

    limit = min(args.limit or FINDINGS_PAGE_MAX, FINDINGS_PAGE_MAX)
    page = repositories[args.offset : args.offset + limit]
    next_offset = args.offset + len(page)
    return {
        "repositories": page,
        "limit": limit,
        "nextOffset": next_offset if next_offset < len(repositories) else None,
        "offset": args.offset,
    }

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_progress.py`

```python
"""Progress transition helpers for the Codex Security workbench."""

import argparse
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parent))
from deep_scan_workbench import require_current_coordinator
from workbench.handoff import require_current_continuation
from workbench_constants import PHASES
from workbench_validation import optional_text, require_uuid, user_text

MAX_PREFLIGHT_ISSUES_JSON_BYTES = 64 * 1024
MAX_PREFLIGHT_ISSUES = 32

def _javascript_string_length(value: str) -> int:
    return len(value.encode("utf-16-le", errors="surrogatepass")) // 2

def _preflight_issue_text(value: Any, maximum: int, label: str) -> str:
    if not isinstance(value, str):
        raise SystemExit(f"Preflight issue {label} must be text.")
    normalized = value.strip()
    if not normalized or _javascript_string_length(normalized) > maximum:
        raise SystemExit(f"Preflight issue {label} must contain 1 to {maximum} characters.")
    return normalized

def preflight_issues_json(value: str | None) -> str | None:
    if value is None:
        return None
    if len(value.encode("utf-8")) > MAX_PREFLIGHT_ISSUES_JSON_BYTES:
        raise SystemExit(
            f"Preflight issues must be no larger than {MAX_PREFLIGHT_ISSUES_JSON_BYTES} bytes."
        )
    try:
        payload = json.loads(value)
    except json.JSONDecodeError as exc:
        raise SystemExit("Preflight issues must be valid JSON.") from exc
    if not isinstance(payload, list) or len(payload) > MAX_PREFLIGHT_ISSUES:
        raise SystemExit(
            f"Preflight issues must be an array of at most {MAX_PREFLIGHT_ISSUES} objects."
        )
    normalized: list[dict[str, str]] = []
    expected_keys = {"capability", "reason", "severity", "status"}
    for index, issue in enumerate(payload):
        label = f"{index + 1}"
        if not isinstance(issue, dict) or set(issue) != expected_keys:
            raise SystemExit(
                f"Preflight issue {label} must contain capability, reason, severity, and status."
            )
        severity = issue.get("severity")
        status = issue.get("status")
        if severity not in {"block", "warn"} or status not in {"fail", "unknown"}:
            raise SystemExit(f"Preflight issue {label} has an invalid severity or status.")
        normalized.append(
            {
                "capability": _preflight_issue_text(
                    issue.get("capability"), 128, f"{label} capability"
                ),
                "reason": _preflight_issue_text(issue.get("reason"), 1200, f"{label} reason"),
                "severity": severity,
                "status": status,
            }
        )
    return json.dumps(normalized, ensure_ascii=True, separators=(",", ":"), sort_keys=True)

def reportable_count(
    current_phase: str, requested_phase: str | None, count: int | None
) -> int | None:
    if count is None and requested_phase in PHASES[3:] and current_phase in PHASES[:3]:
        return 0
    return count

def update_context(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    *,
    now: Callable[[], str],
    require_scan: Callable[[sqlite3.Connection, str], sqlite3.Row],
    require_workspace: Callable[[sqlite3.Connection, str], sqlite3.Row],
    scan_context: Callable[[sqlite3.Connection, str], dict[str, Any]],
) -> dict[str, Any]:
    scan_id = require_uuid(args.scan_id, "scan-id")
    context = user_text(args.user_context)
    connection.execute("BEGIN IMMEDIATE")
    try:
        scan = require_scan(connection, scan_id)
        if scan["status"] != "running" or scan["canceled_at"] is not None:
            raise SystemExit("Only a running scan can update context.")
        workspace = require_workspace(connection, scan["workspace_id"])
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
        timestamp = now()
        connection.execute(
            "UPDATE scans SET user_context = ?, updated_at = ? WHERE id = ?",
            (context, timestamp, scan["id"]),
        )
        connection.execute(
            "UPDATE workspaces SET user_context = ?, updated_at = ? WHERE id = ?",
            (context, timestamp, workspace["id"]),
        )
        connection.commit()
    except BaseException:
        connection.rollback()
        raise
    return scan_context(connection, scan_id)

def update(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    now: Callable[[], str],
    require_scan: Callable[[sqlite3.Connection, str], sqlite3.Row],
    require_workspace: Callable[[sqlite3.Connection, str], sqlite3.Row],
    scan_context: Callable[[sqlite3.Connection, str], dict[str, Any]],
) -> dict[str, Any]:
    if args.command == "update-scan-context":
        return update_context(
            connection,
            args,
            now=now,
            require_scan=require_scan,
            require_workspace=require_workspace,
            scan_context=scan_context,
        )
    return update_progress(
        connection,
        args,
        now=now,
        require_scan=require_scan,
        scan_context=scan_context,
    )

def update_progress(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    *,
    now: Callable[[], str],
    require_scan: Callable[[sqlite3.Connection, str], sqlite3.Row],
    scan_context: Callable[[sqlite3.Connection, str], dict[str, Any]],
) -> dict[str, Any]:
    scan_id = require_uuid(args.scan_id, "scan-id")
    model = optional_text(args.model, maximum=200)
    reasoning_effort = optional_text(args.reasoning_effort, maximum=32)
    serialized_preflight_issues = preflight_issues_json(args.preflight_issues_json)
    connection.execute("BEGIN IMMEDIATE")
    try:
        timestamp = now()
        scan = require_scan(connection, scan_id)
        if scan["status"] != "running":
            raise SystemExit("Only a running scan can update progress.")
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
        if serialized_preflight_issues is not None:
            if scan["mode"] == "deep":
                raise SystemExit("Deep Scan preflight progress is owned by its coordinator.")
            if scan["phase"] != "preflight" or args.phase not in {None, "preflight"}:
                raise SystemExit("Preflight issues can only be updated during preflight.")
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
        updates: list[str] = []
        values: list[Any] = []
        if next_phase == "preflight" and scan["mode"] != "deep":
            updates.extend(["preflight_checks_total = ?", "preflight_checks_completed = ?"])
            values.extend([phase_total, phase_completed])
        for column, value in (
            ("preflight_issues_json", serialized_preflight_issues),
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
        updated = connection.execute(
            """
            UPDATE scans
            SET phase = COALESCE(?, phase), model = COALESCE(?, model),
                reasoning_effort = COALESCE(?, reasoning_effort), updated_at = ?
            WHERE id = ? AND status = 'running'
            """,
            (args.phase, model, reasoning_effort, timestamp, scan["id"]),
        )
        if updated.rowcount != 1:
            raise SystemExit("Only a running scan can update progress.")
        if updates:
            connection.execute(
                f"UPDATE scan_progress SET {', '.join(updates)}, updated_at = ? WHERE scan_id = ?",
                (*values, timestamp, scan["id"]),
            )
        else:
            connection.execute(
                "UPDATE scan_progress SET updated_at = ? WHERE scan_id = ?",
                (timestamp, scan["id"]),
            )
        connection.execute(
            """
            UPDATE scan_progress
            SET phase_items_total = ?, phase_items_completed = ?,
                phase_progress_unit = ?, updated_at = ?
            WHERE scan_id = ?
            """,
            (phase_total, phase_completed, phase_unit, timestamp, scan["id"]),
        )
        connection.commit()
    except BaseException:
        connection.rollback()
        raise
    return scan_context(connection, scan["id"])

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_remediation.py`

```python
"""Durable remediation state transitions for the Codex Security workbench."""

from __future__ import annotations

import argparse
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from workbench_constants import CLAIM_LEASE_SECONDS, DELIVERED_ACTION_LEASE_SECONDS
from workbench_validation import require_occurrence, require_uuid

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

def require_available(connection: sqlite3.Connection, args: Any, require_scan: Any) -> None:
    if args.command not in COMMANDS:
        return
    occurrence = require_occurrence(connection, args.occurrence_id)
    if require_scan(connection, occurrence["scan_id"])["status"] != "complete":
        raise SystemExit(SCAN_STATUS_ERROR)

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

def register_cancel_finding_remediation_request(subparsers: Any) -> None:
    parser = subparsers.add_parser("cancel-finding-remediation-request")
    parser.add_argument("--occurrence-id", required=True)
    parser.add_argument("--request-id", required=True)
    parser.add_argument("--action-token", required=True)

def cancel_finding_remediation_request(
    connection: sqlite3.Connection, args: argparse.Namespace
) -> str:
    request_id = require_uuid(args.request_id, "request-id")
    action_token = require_uuid(args.action_token, "action-token")
    connection.execute("BEGIN IMMEDIATE")
    try:
        occurrence = require_occurrence(connection, args.occurrence_id)
        current = connection.execute(
            "SELECT * FROM finding_remediation_attempts WHERE request_id = ?",
            (request_id,),
        ).fetchone()
        if current is None:
            connection.commit()
            return str(occurrence["scan_id"])
        if current["occurrence_id"] != occurrence["id"]:
            raise SystemExit("This remediation request belongs to a different finding.")
        if current["pending_action"] is None:
            connection.commit()
            return str(occurrence["scan_id"])
        if current["state"] == "failed" and current["pending_action_claim_token"] is None:
            connection.commit()
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
                SET pending_action = NULL, pending_action_claimed_at = NULL,
                    pending_action_claim_token = NULL, pending_action_delivered_at = NULL,
                    version = version + 1, updated_at = ?
                WHERE request_id = ? AND pending_action_claim_token = ?
                """,
                (timestamp, request_id, action_token),
            )
        connection.commit()
    except BaseException:
        connection.rollback()
        raise
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
    previous = connection.execute(
        """
        SELECT * FROM finding_remediation_attempts
        WHERE occurrence_id = ?
        ORDER BY created_at DESC, rowid DESC
        LIMIT 1
        """,
        (occurrence_id,),
    ).fetchone()
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

def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()

if __name__ == "__main__":
    main()
```

## File: `scripts/workbench_saved_results.py`

```python
"""Retain semantic scan drafts without rerunning analysis or changing run state."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import stat
import sys
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from finalize_scan_contract import (
    ContractError,
    _finding_strength,
    _populate_unsealed_artifact_envelope,
    _populate_unsealed_manifest_envelope,
    _prepare_scan_finalization,
    _read_scan_local_json,
    _read_scan_local_json_bytes,
    _recover_unsealed_findings,
    _remove_scan_local_file_if_exists,
    _validate_completion_binding,
    _write_prepared_scan_finalization,
    finalize_scan,
    finding_candidate_id,
    open_scan_local_file_descriptor,
    write_scan_local_bytes,
)
from workbench_validation import path_within_scope

_PUBLISHED_OUTPUTS = (
    "findings.json",
    "coverage.json",
    "scan-manifest.json",
    "report.md",
    "report.html",
    "exports/results.sarif",
)
_PUBLICATION_FOLLOW_UP_WARNING = (
    "Saved scan evidence remains on disk; result publication needs follow-up:"
)

@dataclass(frozen=True)
class WorkbenchDbContext:
    ARTIFACTS: dict[str, str]
    artifact_path: Callable[..., Path | None]
    deep_scan: ModuleType
    expected_coverage_mode: Callable[..., str]
    handoff: ModuleType
    index_findings: Callable[..., None]
    now: Callable[[], str]
    optional_text: Callable[..., str | None]
    parse_scan_cost: Callable[..., dict[str, Any] | None]
    published_manifest_digest: Callable[..., str]
    read_json_object: Callable[[Path], dict[str, Any]]
    require_canonical_scan_directory: Callable[[Path], Path]
    require_recorded_manifest_digest: Callable[..., None]
    require_scan: Callable[..., Any]
    require_uuid: Callable[[str, str], str]
    require_workspace: Callable[..., Any]
    scan_completion_lock: Callable[..., Any]
    scan_context: Callable[..., dict[str, Any]]
    verify_manifest_binding: Callable[..., None]
    workbench_completion_binding: Callable[..., dict[str, Any]]
    workspace_state: Callable[..., dict[str, Any]]

def _encoded(value: Any) -> bytes:
    return json.dumps(
        value, ensure_ascii=True, allow_nan=False, sort_keys=True, separators=(",", ":")
    ).encode()

def _digest(value: Any) -> str:
    return hashlib.sha256(_encoded(value)).hexdigest()

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

def _finding_key(finding: dict[str, Any]) -> str:
    # Wording and evidence may improve between checkpoints; distinct source locations
    # must not collide merely because two workers chose the same semantic identity.
    provenance = finding.get("provenance")
    identity = (
        provenance.get("preservedIdentity", finding.get("identity"))
        if isinstance(provenance, dict)
        else finding.get("identity")
    )
    if not isinstance(identity, dict):
        extensions = finding.get("extensions")
        source = str(
            (extensions.get("candidateId") if isinstance(extensions, dict) else None)
            or finding.get("title")
            or "finding"
        )
        identity = {
            "anchor": re.sub(r"[^a-z0-9._/-]+", "-", source.lower()).strip("._/-") or "finding"
        }
    locations = finding.get("locations", [])
    if not isinstance(locations, list):
        locations = []
    return _digest(
        [
            finding.get("ruleId"),
            identity,
            sorted(
                (
                    (
                        location.get("path"),
                        location.get("startLine"),
                        location.get("endLine", location.get("startLine")),
                    )
                    for location in locations
                    if isinstance(location, dict)
                ),
                key=_encoded,
            ),
        ]
    )

def _finding_content(finding: dict[str, Any]) -> dict[str, Any]:
    """Return substantive finding content without generated identity or provenance."""
    return {
        key: value
        for key, value in finding.items()
        if key not in {"findingId", "occurrenceId", "fingerprints", "identity", "provenance"}
    }

def _ensure_finding_identity(finding: Any, *, candidate_only: bool = False) -> None:
    if not isinstance(finding, dict) or "identity" in finding:
        return
    if candidate_only and not finding_candidate_id(finding):
        return
    extensions = finding.get("extensions")
    source = str(
        (extensions.get("candidateId") if isinstance(extensions, dict) else None)
        or finding.get("title")
        or "finding"
    )
    anchor = re.sub(r"[^a-z0-9._/-]+", "-", source.lower()).strip("._/-") or "finding"
    finding["identity"] = {"anchor": anchor}

def _retained_findings(finding: dict[str, Any]) -> Iterator[dict[str, Any]]:
    """Yield canonical and historical findings without trusting candidate IDs."""
    pending = [finding]
    seen: set[int] = set()
    while pending:
        current = pending.pop()
        marker = id(current)
        if marker in seen:
            continue
        seen.add(marker)
        yield current
        provenance = current.get("provenance")
        if not isinstance(provenance, dict):
            continue
        previous = provenance.get("previousFindings")
        if isinstance(previous, list):
            pending.extend(item for item in reversed(previous) if isinstance(item, dict))
        sources = provenance.get("sourceFindings")
        if isinstance(sources, list):
            pending.extend(
                source["finding"]
                for source in reversed(sources)
                if isinstance(source, dict) and isinstance(source.get("finding"), dict)
            )

def merge_saved_results(
    scan_dir: Path,
    scan_id: str,
    binding: dict[str, Any],
    workers: list[Any],
    warnings: list[str],
    *,
    stopped: bool,
    reason: str,
    frozen_source_digests: dict[str, str] | None = None,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]] | None:
    """Read only bound parent/worker files; return an unsealed loss-preserving union."""
    initial_warnings = set(warnings)
    parent: dict[str, Any] | None = None
    parent_manifest: dict[str, Any] | None = None
    if frozen_source_digests is None:
        try:
            parent_manifest = _read_scan_local_json(
                scan_dir, "scan-manifest.json", "Saved parent manifest"
            )
            parent_findings = _read_scan_local_json(
                scan_dir, "findings.json", "Saved parent findings"
            )
            parent_coverage = _read_scan_local_json(
                scan_dir, "coverage.json", "Saved parent coverage"
            )
            parent_scan = parent_manifest.get("scan")
            if not isinstance(parent_scan, dict):
                raise ContractError("Saved parent manifest has no scan object")
            if (parent_scan.get("sealedAt") or parent_scan.get("artifacts")) and (
                parent_scan.get("id", scan_id) != scan_id
                or parent_findings.get("scanId", scan_id) != scan_id
                or parent_coverage.get("scanId", scan_id) != scan_id
            ):
                raise ContractError("Saved parent documents belong to a different scan")
            parent = {
                "scanId": scan_id,
                "findings": parent_findings.get("findings"),
                "coverage": parent_coverage,
                **{
                    key: parent_scan[key]
                    for key in ("scope", "threatModel", "complete")
                    if key in parent_scan
                },
            }
            if not isinstance(parent["findings"], list):
                raise ContractError("Saved parent draft has no findings array")
            if not parent_scan.get("sealedAt"):
                payload = _encoded(parent)
                write_scan_local_bytes(
                    scan_dir,
                    f"checkpoints/{hashlib.sha256(payload).hexdigest()}.json",
                    payload,
                )
        except (ContractError, OSError, ValueError) as exc:
            if not stopped:
                raise
            if (scan_dir / "scan-manifest.json").exists():
                warnings.append(f"Could not read the saved parent draft: {exc}")
            parent_manifest = None
            parent = None

    sources: list[tuple[str, dict[str, Any], str | None]] = []
    parent_preserved_sources: dict[str, str] = {}
    source_digests: dict[str, str] = {}
    if parent_manifest:
        recorded = parent_manifest["scan"].get("preservedSources", {})
        if isinstance(recorded, dict):
            parent_preserved_sources = recorded
            source_digests.update(parent_preserved_sources)
    paths: dict[str, str | None] = {}
    current_results: set[str] = set()
    reducer_outputs: list[tuple[Any, str, list[str], int]] = []
    accepted_reducers = [
        worker
        for worker in workers
        if worker["kind"] == "dedup"
        and worker["status"] == "succeeded"
        and worker["result_manifest_path"]
    ]
    latest_reducer: str | None = None
    if accepted_reducers:
        reducer = max(
            accepted_reducers, key=lambda worker: (worker["completed_at"] or "", worker["id"])
        )
        try:
            latest_reducer = Path(reducer["result_manifest_path"]).relative_to(scan_dir).as_posix()
            paths[latest_reducer] = None
        except ValueError:
            warnings.append("Skipped a reducer result outside the scan directory.")

    def checkpoints(directory: str, worker_id: str | None) -> None:
        for name in _children(scan_dir, directory):
            if re.fullmatch(r"[0-9a-f]{64}\.json", name):
                paths[f"{directory}/{name}"] = worker_id

    checkpoints("checkpoints", None)
    for worker in workers:
        try:
            output = Path(worker["artifact_dir"]).relative_to(scan_dir).as_posix()
        except (TypeError, ValueError):
            warnings.append("Skipped a worker checkpoint outside the scan directory.")
            continue
        if worker["kind"] == "dedup":

            def reducer_output(directory: str, attempt: int, reducer_worker: Any) -> None:
                result_path = f"{directory}/result.json"
                checkpoint_paths = [
                    f"{directory}/checkpoints/{name}"
                    for name in _children(scan_dir, f"{directory}/checkpoints")
                    if re.fullmatch(r"[0-9a-f]{64}\.json", name)
                ]
                if not checkpoint_paths:
                    return
                paths[result_path] = None
                for checkpoint_path in checkpoint_paths:
                    paths[checkpoint_path] = None
                reducer_outputs.append((reducer_worker, result_path, checkpoint_paths, attempt))

            reducer_output(output, int(worker["attempt"] or 0), worker)
            attempts = (
                Path(output).parent if Path(output).name == "output" else Path(output)
            ) / "attempts"
            for name in _children(scan_dir, attempts.as_posix()):
                match = re.fullmatch(r"attempt-(\d+)", name)
                if match:
                    reducer_output((attempts / name).as_posix(), int(match.group(1)), worker)
            continue
        if worker["kind"] != "discovery":
            continue
        paths[f"{output}/result.json"] = worker["id"]
        current_results.add(f"{output}/result.json")
        checkpoints(f"{output}/checkpoints", worker["id"])
        attempts = (
            Path(output).parent if Path(output).name == "output" else Path(output)
        ) / "attempts"
        for name in _children(scan_dir, attempts.as_posix()):
            if re.fullmatch(r"attempt-\d+", name):
                archived = (attempts / name).as_posix()
                paths[f"{archived}/result.json"] = worker["id"]
                checkpoints(f"{archived}/checkpoints", worker["id"])
        if worker["result_manifest_path"]:
            try:
                current_path = Path(worker["result_manifest_path"]).relative_to(scan_dir).as_posix()
                paths[current_path] = worker["id"]
                current_results.add(current_path)
            except ValueError:
                warnings.append("Skipped a worker result outside the scan directory.")

    if frozen_source_digests is not None:
        paths = {
            relative: worker_id
            for relative, worker_id in paths.items()
            if relative in frozen_source_digests
        }
        current_results.intersection_update(frozen_source_digests)
        if latest_reducer not in frozen_source_digests:
            latest_reducer = None

    for relative, worker_id in paths.items():
        try:
            draft = _read_scan_local_json(scan_dir, relative, "Saved scan checkpoint")
            if draft.get("scanId") != scan_id:
                raise ContractError("checkpoint belongs to a different scan")
            if not isinstance(draft.get("findings"), list) or not isinstance(
                draft.get("coverage"), dict
            ):
                raise ContractError("checkpoint has no semantic findings or coverage")
            digest = _digest(draft)
            if frozen_source_digests is not None and frozen_source_digests[relative] != digest:
                raise ContractError("checkpoint changed after the scan stopped")
            source_digests[relative] = digest
            sources.append((relative, draft, worker_id))
        except (ContractError, OSError, ValueError) as exc:
            if (scan_dir / relative).exists():
                warnings.append(f"Preserved unreadable checkpoint {relative}: {exc}")
    if frozen_source_digests is not None:
        if frozen_source_digests.keys() - source_digests.keys():
            raise ContractError("Frozen stopped-scan checkpoint set is incomplete.")

    drafts_by_path = {relative: draft for relative, draft, _ in sources}
    latest_reducer_key = (
        (reducer["completed_at"] or "", reducer["id"], int(reducer["attempt"] or 0))
        if accepted_reducers and latest_reducer in drafts_by_path
        else None
    )
    if latest_reducer_key is None:
        latest_reducer = None
    for worker, result_path, checkpoint_paths, attempt in reducer_outputs:
        result = drafts_by_path.get(result_path)
        if result is None or not any(
            drafts_by_path.get(checkpoint_path) == result for checkpoint_path in checkpoint_paths
        ):
            continue
        current_results.add(result_path)
        candidate_key = (worker["completed_at"] or "", worker["id"], attempt)
        if latest_reducer_key is None or candidate_key > latest_reducer_key:
            latest_reducer_key = candidate_key
            latest_reducer = result_path

    if parent is None and latest_reducer is not None:
        parent = next((draft for relative, draft, _ in sources if relative == latest_reducer), None)

    if parent is None and not sources:
        return None
    if (
        parent_manifest
        and parent_manifest["scan"].get("sealedAt")
        and parent_manifest["scan"].get("status") == binding["status"]
        and parent_manifest["scan"].get("preservedSources") == source_digests
        and all(warning in initial_warnings for warning in warnings)
    ):
        return None

    target_kind = binding["allowedTargetKinds"][0]
    if (
        target_kind == "git_worktree"
        and "snapshotDigest" not in binding["target"]
        and "git_revision" in binding["allowedTargetKinds"]
    ):
        target_kind = "git_revision"
    target = {"kind": target_kind, **binding["target"]}
    if target["kind"] == "git_diff" and "snapshotDigest" not in target:
        diff_kind = {"commit": "commit", "branch_diff": "range"}[binding["coverageMode"]]
        digest = hashlib.sha256(
            b"codex-security-diff/v1\0"
            + diff_kind.encode()
            + b"\0"
            + target["baseRevision"].encode()
            + b"\0"
            + target["headRevision"].encode()
        ).hexdigest()
        target["snapshotDigest"] = f"codex-security-snapshot/v1:sha256:{digest}"
    manifest = (
        copy.deepcopy(parent_manifest)
        if parent_manifest
        else {"scan": {"target": target, "scope": binding["scope"]}}
    )
    for key in ("sealedAt", "artifacts"):
        manifest["scan"].pop(key, None)
    manifest["scan"]["preservedSources"] = source_digests
    coverage = (
        copy.deepcopy(parent["coverage"])
        if parent
        else {
            "completeness": "partial",
            "mode": binding["coverageMode"],
            "inventoryStrategy": "diff"
            if binding["coverageMode"] in {"commit", "branch_diff", "working_tree"}
            else "scoped_path"
            if binding["coverageMode"] == "scoped_path"
            else "repository",
            **binding["scope"],
            "surfaces": [],
            "explicitExclusions": [],
            "deferred": [],
        }
    )
    canonical_rows = (
        {
            id(item)
            for field in ("surfaces", "explicitExclusions", "deferred")
            for item in (coverage.get(field) if isinstance(coverage.get(field), list) else [])
        }
        if parent_manifest
        else set()
    )
    findings: list[dict[str, Any]] = []
    finding_positions: dict[str, int] = {}
    represented: dict[str, str | None] = {}
    represented_candidates: dict[tuple[str, str], str | None] = {}
    represented_history: dict[str, set[str]] = {}
    represented_candidate_history: dict[tuple[str, str], set[str]] = {}
    rejected_history: dict[tuple[str, str], list[dict[str, Any]]] = {}
    stopped_parent_seal = bool(
        stopped and parent_manifest and parent_manifest["scan"].get("sealedAt")
    )

    def valid_finding(value: Any) -> bool:
        # Use the finalizer's own per-record recovery before a draft can suppress
        # an earlier checkpoint. Invalid latest records must not hide valid history.
        document = {"scanId": scan_id, "findings": [copy.deepcopy(value)]}
        if isinstance(document["findings"][0], dict):
            _ensure_finding_identity(document["findings"][0], candidate_only=True)
        _recover_unsealed_findings(
            {"scan": {"id": scan_id, "target": binding["target"]}},
            document,
            Path(__file__).resolve().parent.parent / "schemas",
            scan_dir,
            [],
        )
        return bool(document["findings"])

    all_sources = ([("parent", parent, None)] if parent else []) + sources
    current_drafts = ([(None, parent)] if parent else []) + [
        (worker_id, draft) for relative, draft, worker_id in sources if relative in current_results
    ]
    resolved: dict[tuple[str | None, str], str] = {}
    for owner, draft in current_drafts:
        for finding in draft["findings"]:
            if (
                isinstance(finding, dict)
                and valid_finding(finding)
                and (candidate_id := finding_candidate_id(finding))
            ):
                resolved.setdefault((owner, candidate_id), "reported")
        for field in ("surfaces", "explicitExclusions"):
            items = draft["coverage"].get(field, [])
            for item in items if isinstance(items, list) else []:
                if (
                    isinstance(item, dict)
                    and isinstance(item.get("candidateId"), str)
                    and item.get("disposition") in {"reported", "rejected", "not_applicable"}
                ):
                    resolved.setdefault((owner, item["candidateId"]), item["disposition"])
    # Only the current parent may claim that another worker finding was absorbed.
    # A superseded checkpoint must not suppress a newer independent result.
    for draft in [parent] if parent else []:
        for finding in draft["findings"]:
            if valid_finding(finding):
                canonical_key = _finding_key(finding)
                for retained in _retained_findings(finding):
                    retained_key = _finding_key(retained)
                    if retained is not finding:
                        represented_history.setdefault(retained_key, set()).add(
                            _digest(_finding_content(retained))
                        )
                    previous_key = represented.get(retained_key)
                    if retained_key not in represented:
                        represented[retained_key] = canonical_key
                    elif previous_key != canonical_key:
                        # Ambiguous history cannot suppress an independent source.
                        represented[retained_key] = None
                originals = finding["provenance"].get("sourceFindings", [])
                for original in originals if isinstance(originals, list) else []:
                    if isinstance(original, dict) and isinstance(original.get("finding"), dict):
                        source_id = original.get("id")
                        candidate_id = finding_candidate_id(original["finding"])
                        if isinstance(source_id, str) and ":" in source_id and candidate_id:
                            candidate_key = (source_id.rsplit(":", 1)[0], candidate_id)
                            previous_key = represented_candidates.get(candidate_key)
                            if candidate_key not in represented_candidates:
                                represented_candidates[candidate_key] = canonical_key
                            elif previous_key != canonical_key:
                                # Candidate ids are only authoritative within one
                                # logical worker. Multiple canonical owners make
                                # that worker-local identity ambiguous.
                                represented_candidates[candidate_key] = None
                            represented_candidate_history.setdefault(candidate_key, set()).add(
                                _digest(_finding_content(original["finding"]))
                            )
                            resolved.setdefault(candidate_key, "reported")
    for relative, draft, worker_id in all_sources:
        superseded = (
            worker_id is None
            and parent is not None
            and parent.get("complete") is not False
            and relative != "parent"
            and (not stopped_parent_seal or relative in parent_preserved_sources)
        ) or (
            relative not in current_results
            and any(
                saved_worker == worker_id
                and saved_path in current_results
                and current.get("complete") is not False
                for saved_path, current, saved_worker in sources
            )
        )
        if (
            (relative != "parent" or not parent_manifest)
            and not superseded
            and (
                draft.get("complete") is False
                or draft["coverage"].get("completeness") != "complete"
            )
            and coverage.get("completeness") in {"complete", "unknown"}
        ):
            coverage["completeness"] = "partial"
        if "threatModel" not in manifest["scan"] and isinstance(draft.get("threatModel"), dict):
            manifest["scan"]["threatModel"] = copy.deepcopy(draft["threatModel"])
        for value in draft["findings"]:
            if relative == "parent" and parent_manifest:
                finding = copy.deepcopy(value)
                _ensure_finding_identity(finding, candidate_only=True)
                provenance = finding.get("provenance") if isinstance(finding, dict) else None
                owner = provenance.get("workerId") if isinstance(provenance, dict) else None
                candidate_id = finding_candidate_id(finding) if isinstance(finding, dict) else None
                if (
                    stopped_parent_seal
                    and isinstance(owner, str)
                    and candidate_id
                    and resolved.get((owner, candidate_id)) in {"rejected", "not_applicable"}
                ):
                    rejected_history.setdefault((owner, candidate_id), []).append(finding)
                    continue
                if valid_finding(finding):
                    finding_positions.setdefault(_finding_key(finding), len(findings))
                findings.append(finding)
                continue
            if relative != "parent" and parent and value in parent["findings"]:
                continue
            if not isinstance(value, dict):
                warnings.append(f"Retained malformed finding evidence in {relative}.")
                continue
            source_value = copy.deepcopy(value)
            finding = copy.deepcopy(value)
            candidate_id = finding_candidate_id(finding)
            if relative != "parent" and resolved.get((worker_id, candidate_id)) in {
                "rejected",
                "not_applicable",
            }:
                surfaces = coverage.get("surfaces")
                for item in surfaces if isinstance(surfaces, list) else []:
                    if isinstance(item, dict) and item.get("candidateId") == candidate_id:
                        if not isinstance(item.get("previousFindings"), list):
                            item["previousFindings"] = []
                        history = item["previousFindings"]
                        if not any(
                            isinstance(previous, dict)
                            and _finding_key(previous) == _finding_key(finding)
                            and _finding_content(previous) == _finding_content(finding)
                            for previous in history
                        ):
                            history.append(finding)
                continue
            for key in ("findingId", "occurrenceId", "fingerprints"):
                finding.pop(key, None)
            locations = finding.get("locations", [])
            if not isinstance(locations, list) or not any(
                isinstance(location, dict)
                and isinstance(location.get("path"), str)
                and any(
                    path_within_scope(location["path"], path)
                    for path in binding["scope"]["includePaths"]
                )
                for location in locations
            ):
                warnings.append(f"Skipped out-of-scope finding from {relative}.")
                coverage["completeness"] = "partial"
                continue
            provenance = finding.setdefault("provenance", {"source": "local_plugin"})
            if not isinstance(provenance, dict):
                findings.append(finding)
                continue
            if worker_id:
                provenance.setdefault("workerId", worker_id)
            _ensure_finding_identity(finding)
            if not valid_finding(finding):
                findings.append(finding)
                continue
            key = _finding_key(finding)
            represented_by_parent = False
            if relative != "parent":
                if key in represented:
                    mapped_key = represented[key]
                    historical_contents = represented_history.get(key, set())
                elif worker_id and candidate_id:
                    candidate_key = (worker_id, candidate_id)
                    mapped_key = represented_candidates.get(candidate_key)
                    historical_contents = represented_candidate_history.get(candidate_key, set())
                else:
                    mapped_key = None
                    historical_contents = set()
                if mapped_key is not None:
                    key = mapped_key
                    represented_by_parent = (
                        _digest(_finding_content(source_value)) in historical_contents
                    )
            if key in finding_positions:
                retained = findings[finding_positions[key]]
                if finding != retained:
                    if represented_by_parent:
                        previous = copy.deepcopy(source_value)
                        previous_history = previous.get("provenance", {}).pop(
                            "previousFindings", []
                        )
                    elif _finding_strength(finding) > _finding_strength(retained):
                        previous = copy.deepcopy(retained)
                        previous_history = previous["provenance"].pop("previousFindings", [])
                        retained = finding
                        findings[finding_positions[key]] = retained
                    else:
                        previous = copy.deepcopy(source_value)
                        previous_history = previous.get("provenance", {}).pop(
                            "previousFindings", []
                        )
                    retained_provenance = retained["provenance"]
                    retained_history = retained_provenance.get("previousFindings")
                    history = (
                        [item for item in retained_history if isinstance(item, dict)]
                        if isinstance(retained_history, list)
                        else []
                    )
                    retained_provenance["previousFindings"] = history
                    for original in [
                        *(previous_history if isinstance(previous_history, list) else []),
                        previous,
                    ]:
                        if not isinstance(original, dict):
                            continue
                        source_key = _finding_key(original)
                        source_content = _finding_content(original)
                        already_retained = any(
                            source_key == _finding_key(historical)
                            and source_content == _finding_content(historical)
                            for historical in _retained_findings(retained)
                        )
                        if (
                            not already_retained
                            and original not in history
                            and original != retained
                        ):
                            history.append(original)
                continue
            finding_positions[key] = len(findings)
            findings.append(finding)
        if superseded:
            continue
        for field in ("surfaces", "explicitExclusions", "deferred", "openQuestions"):
            items = draft["coverage"].get(field, [])
            if not isinstance(items, list):
                continue
            output = coverage.setdefault(field, [])
            if not isinstance(output, list):
                # Keep malformed canonical collections for the existing finalizer's
                # recovery and warnings rather than silently changing its contract.
                continue
            for item in items:
                if field == "openQuestions" and isinstance(item, str):
                    item = {"question": item.strip()}
                if (
                    field == "surfaces"
                    and isinstance(item, dict)
                    and item.get("disposition") in {"rejected", "not_applicable"}
                    and isinstance(item.get("candidateId"), str)
                    and (history_findings := rejected_history.get((worker_id, item["candidateId"])))
                ):
                    item = copy.deepcopy(item)
                    if not isinstance(item.get("previousFindings"), list):
                        item["previousFindings"] = []
                    history = item["previousFindings"]
                    for finding in history_findings:
                        if not any(
                            isinstance(previous, dict)
                            and _finding_key(previous) == _finding_key(finding)
                            and _finding_content(previous) == _finding_content(finding)
                            for previous in history
                        ):
                            history.append(copy.deepcopy(finding))
                if (
                    isinstance(item, dict)
                    and (worker_id, item.get("candidateId")) in resolved
                    and (field == "deferred" or item.get("disposition") == "needs_follow_up")
                ):
                    continue
                if isinstance(item, dict) and "id" not in item:
                    semantic_item = dict(item)
                    if field == "surfaces":
                        semantic_item.setdefault("receiptRefs", [])
                    if any(
                        isinstance(existing, dict)
                        and {key: value for key, value in existing.items() if key != "id"}
                        == semantic_item
                        for existing in output
                    ):
                        continue
                if item not in output:
                    output.append(copy.deepcopy(item))

    identities: dict[str, str] = {}
    for finding in findings:
        if not valid_finding(finding):
            continue
        identity = finding.get("identity")
        if not isinstance(identity, dict):
            continue
        key = _encoded([finding.get("ruleId"), identity]).decode()
        variant = _finding_key(finding)
        if key in identities and identities[key] != variant:
            finding.setdefault("provenance", {})["preservedIdentity"] = copy.deepcopy(identity)
            identity["instance"] = f"{identity.get('instance', 'saved')}-{variant[:16]}"
        identities[key] = variant
    for field in ("surfaces", "explicitExclusions", "deferred"):
        used: set[str] = set()
        items = coverage.setdefault(field, [])
        for item in items if isinstance(items, list) else []:
            if not isinstance(item, dict):
                continue
            if id(item) in canonical_rows:
                if isinstance(item.get("id"), str):
                    used.add(item["id"])
                continue
            item.setdefault("id", item.get("candidateId") or f"saved-{_digest(item)[:16]}")
            if item["id"] in used:
                item["id"] = f"{item['id']}-{_digest(item)[:16]}"
            used.add(item["id"])
            if field == "surfaces":
                item.setdefault("receiptRefs", [])
    if stopped or any(warning not in initial_warnings for warning in warnings):
        coverage["completeness"] = "partial"
    if stopped:
        if not isinstance(coverage.get("deferred"), list):
            coverage["deferred"] = []
        item = {"id": "scan-stopped", "reason": reason}
        if item not in coverage["deferred"]:
            coverage["deferred"].append(item)
    return manifest, {"findings": findings}, coverage

def coverage_for_comparison(db: Any, scan: Any) -> dict[str, Any]:
    if scan["seal_manifest_digest"] is None:
        raise SystemExit("Only sealed scans can be compared.")
    scan_dir = db.require_canonical_scan_directory(Path(scan["scan_dir"]))
    db.require_recorded_manifest_digest(scan, scan_dir)
    try:
        _, _, manifest, _, coverage, was_sealed, _ = _prepare_scan_finalization(scan_dir)
    except ContractError as exc:
        raise SystemExit(str(exc)) from exc
    if not was_sealed or manifest["scan"]["id"] != scan["id"]:
        raise SystemExit("Only sealed scans can be compared.")
    return coverage

def _snapshot_published_outputs(scan_dir: Path) -> dict[str, bytes | None]:
    snapshots: dict[str, bytes | None] = {}
    for relative in _PUBLISHED_OUTPUTS:
        descriptor = -1
        try:
            descriptor = open_scan_local_file_descriptor(
                scan_dir, relative, "Published scan output"
            )
            with os.fdopen(descriptor, "rb") as handle:
                descriptor = -1
                snapshots[relative] = handle.read()
        except ContractError:
            path = scan_dir / relative
            if path.exists() or path.is_symlink():
                raise
            snapshots[relative] = None
        finally:
            if descriptor >= 0:
                os.close(descriptor)
    return snapshots

def _restore_published_outputs(scan_dir: Path, snapshots: dict[str, bytes | None]) -> None:
    for relative, contents in snapshots.items():
        if contents is None:
            path = scan_dir / relative
            if path.exists() or path.is_symlink():
                _remove_scan_local_file_if_exists(scan_dir, relative)
        else:
            write_scan_local_bytes(scan_dir, relative, contents)

def preserve_scan_results_locked(
    db: Any, connection: Any, scan_id: str, *, during_transition: bool = False
) -> bool:
    """Publish or verify retained terminal results through the workbench host."""
    scan = db.require_scan(connection, scan_id)
    if scan["status"] != "failed":
        return False
    frozen_source_digests: dict[str, str] | None = None
    if scan["canceled_at"] is not None:
        raw_frozen_sources = scan["retained_source_digests_json"]
        if raw_frozen_sources is None and not during_transition:
            return False
        if raw_frozen_sources is not None:
            parsed_frozen_sources = json.loads(raw_frozen_sources)
            if not isinstance(parsed_frozen_sources, dict) or not all(
                isinstance(relative, str) and isinstance(digest, str)
                for relative, digest in parsed_frozen_sources.items()
            ):
                raise ContractError("Saved stopped-scan source digests are malformed.")
            frozen_source_digests = parsed_frozen_sources
    scan_dir = db.require_canonical_scan_directory(Path(scan["scan_dir"]))
    deep_run = connection.execute(
        "SELECT status FROM deep_scan_runs WHERE scan_id = ?", (scan_id,)
    ).fetchone()
    outcome = (
        "canceled"
        if scan["canceled_at"]
        else "interrupted"
        if deep_run and deep_run["status"] == "interrupted"
        else "failed"
    )
    stored_warnings = json.loads(scan["completion_warnings_json"])
    publication_follow_up_warnings = [
        warning
        for warning in stored_warnings
        if isinstance(warning, str) and warning.startswith(_PUBLICATION_FOLLOW_UP_WARNING)
    ]
    warnings = [
        warning for warning in stored_warnings if warning not in publication_follow_up_warnings
    ]

    def record_publication(manifest: dict[str, Any], findings: dict[str, Any]) -> None:
        digest = db.published_manifest_digest(scan_dir, manifest)
        timestamp = db.now()
        with connection:
            for kind, filename in db.ARTIFACTS.items():
                path = db.artifact_path(scan_dir, filename, required=True)
                connection.execute(
                    "INSERT OR REPLACE INTO scan_artifacts "
                    "(scan_id, kind, path, created_at) VALUES (?, ?, ?, ?)",
                    (scan_id, kind, str(path), scan["completed_at"]),
                )
            # Delete only vanished occurrences; stable IDs retain triage and remediation.
            existing_ids = {
                row["id"]
                for row in connection.execute(
                    "SELECT id FROM finding_occurrences WHERE scan_id = ?", (scan_id,)
                )
            }
            retained_ids = {finding["occurrenceId"] for finding in findings["findings"]}
            connection.executemany(
                "DELETE FROM finding_occurrences WHERE id = ? AND scan_id = ?",
                ((occurrence_id, scan_id) for occurrence_id in existing_ids - retained_ids),
            )
            db.index_findings(connection, scan_id, findings, scan["completed_at"])
            connection.execute(
                "UPDATE scans SET seal_manifest_digest = ?, completion_warnings_json = ?, "
                "updated_at = ? WHERE id = ? AND status = 'failed'",
                (digest, json.dumps(list(dict.fromkeys(warnings))), timestamp, scan_id),
            )
            connection.execute(
                "UPDATE scan_progress SET reportable_findings_count = ?, updated_at = ? "
                "WHERE scan_id = ?",
                (len(findings["findings"]), timestamp, scan_id),
            )

    verified_existing_output: tuple[dict[str, Any], dict[str, Any]] | None = None
    existing_path = db.artifact_path(scan_dir, db.ARTIFACTS["manifest"], required=False)
    existing_scan = db.read_json_object(existing_path).get("scan", {}) if existing_path else {}
    if scan["seal_manifest_digest"] is not None or (
        isinstance(existing_scan, dict)
        and (
            existing_scan.get("sealedAt") is not None or existing_scan.get("artifacts") is not None
        )
    ):
        db.require_recorded_manifest_digest(scan, scan_dir)
        existing, existing_findings, _ = finalize_scan(
            scan_dir, expected_coverage_mode=db.expected_coverage_mode(scan)
        )
        db.verify_manifest_binding(scan, existing)
        if existing_scan.get("status") == outcome:
            if outcome == "canceled" and (
                frozen_source_digests is not None
                and existing_scan.get("preservedSources") == frozen_source_digests
            ):
                if scan["seal_manifest_digest"] is not None and not publication_follow_up_warnings:
                    return True
                record_publication(existing, existing_findings)
                return True
            if outcome != "canceled":
                verified_existing_output = (existing, existing_findings)
    binding = {**db.workbench_completion_binding(scan, scan["completed_at"]), "status": outcome}
    documents = merge_saved_results(
        scan_dir,
        scan_id,
        binding,
        connection.execute(
            "SELECT * FROM deep_scan_workers WHERE scan_id = ? ORDER BY created_at, id",
            (scan_id,),
        ).fetchall(),
        warnings,
        stopped=True,
        reason=(
            f"Scan {outcome}; saved findings and pending review were preserved. "
            f"{scan['failure_message'] or ''}"
        ).strip(),
        frozen_source_digests=frozen_source_digests,
    )
    if documents is None:
        if verified_existing_output is not None:
            if scan["seal_manifest_digest"] is not None and not publication_follow_up_warnings:
                return True
            record_publication(*verified_existing_output)
            return True
        unpublished_warnings = list(dict.fromkeys([*warnings, *publication_follow_up_warnings]))
        if unpublished_warnings != stored_warnings:
            with connection:
                connection.execute(
                    "UPDATE scans SET completion_warnings_json = ?, updated_at = ? "
                    "WHERE id = ? AND status = 'failed'",
                    (json.dumps(unpublished_warnings), db.now(), scan_id),
                )
        return False
    if scan["canceled_at"] is not None and frozen_source_digests is None:
        retained_sources = documents[0].get("scan", {}).get("preservedSources")
        if not isinstance(retained_sources, dict) or not all(
            isinstance(relative, str) and isinstance(digest, str)
            for relative, digest in retained_sources.items()
        ):
            raise ContractError("Canceled scan source digests could not be frozen.")
        with connection:
            connection.execute(
                "UPDATE scans SET retained_source_digests_json = ? "
                "WHERE id = ? AND retained_source_digests_json IS NULL",
                (json.dumps(retained_sources, sort_keys=True), scan_id),
            )
    prepared = _prepare_scan_finalization(
        scan_dir,
        expected_coverage_mode=db.expected_coverage_mode(scan),
        completion_binding=binding,
        completion_warnings=warnings,
        draft_documents=documents,
    )
    snapshots = _snapshot_published_outputs(scan_dir)
    try:
        manifest, findings, _ = _write_prepared_scan_finalization(prepared)
        db.verify_manifest_binding(scan, manifest)
        record_publication(manifest, findings)
    except BaseException:
        _restore_published_outputs(scan_dir, snapshots)
        raise
    return True

def refresh_stopped_scan_results(
    db: Any, connection: Any, scan_id: str, *, strict: bool = False
) -> None:
    scan = db.require_scan(connection, scan_id)
    if scan["status"] != "failed":
        return
    scan_id = scan["id"]
    with db.scan_completion_lock(scan_id):
        if strict:
            if preserve_scan_results_locked(db, connection, scan_id):
                db.deep_scan.clear_deep_scan_publication_failure(connection, scan_id)
        else:
            preserve_stopped_results_after_transition(
                db, connection, scan_id, during_transition=False
            )

def preserve_scan_results(db: Any, connection: Any, args: Any) -> dict[str, Any]:
    scan_id = db.require_uuid(args.scan_id, "scan-id")
    with db.scan_completion_lock(scan_id):
        scan = db.require_scan(connection, scan_id)
        if scan["status"] != "failed":
            raise SystemExit("Only a stopped scan can preserve terminal results.")
        workspace = db.require_workspace(connection, scan["workspace_id"])
        owner = (
            scan["continuation_thread_id"]
            or scan["deep_scan_owner_thread_id"]
            or workspace["thread_id"]
        )
        if args.thread_id is not None and args.thread_id != owner:
            raise SystemExit("Saved results can only be published from the owning Codex thread.")
        if args.coordinator_generation is not None:
            if args.thread_id is None:
                raise SystemExit("A coordinator result refresh requires its owning thread.")
            db.deep_scan.require_current_coordinator(
                db.deep_scan.require_deep_scan_run(connection, scan_id), args
            )
        else:
            db.handoff.require_current_continuation(
                scan,
                args.claim_token,
                error_message="Saved results are owned by another continuation.",
            )
        published = preserve_scan_results_locked(db, connection, scan_id)
        if not published and scan["canceled_at"] is not None:
            raise SystemExit("Saved scan results could not be published or verified.")
        if published:
            db.deep_scan.clear_deep_scan_publication_failure(connection, scan_id)
    return db.scan_context(connection, scan_id)

def write_scan_draft(db: Any, connection: Any, args: Any) -> dict[str, Any]:
    scan_id = db.require_uuid(args.scan_id, "scan-id")
    with db.scan_completion_lock(scan_id):
        scan = db.require_scan(connection, scan_id)
        db.handoff.require_current_continuation(
            scan, args.claim_token, error_message="Scan draft is owned by another continuation."
        )
        if scan["status"] != "running" or scan["seal_manifest_digest"] is not None:
            raise SystemExit(
                "The scan stopped; its saved checkpoint was retained without replacing sealed results."
            )
        scan_dir = db.require_canonical_scan_directory(Path(scan["scan_dir"]))
        if args.checkpoint_path is not None:
            try:
                checkpoint_relative = Path(args.checkpoint_path).relative_to(scan_dir).as_posix()
            except ValueError as exc:
                raise SystemExit(
                    "Scan checkpoint must be inside the registered scan drafts directory."
                ) from exc
            if not re.fullmatch(r"drafts/[0-9a-fA-F-]+\.checkpoint\.json", checkpoint_relative):
                raise SystemExit(
                    "Scan checkpoint must be inside the registered scan drafts directory."
                )
            checkpoint, checkpoint_contents = _read_scan_local_json_bytes(
                scan_dir, checkpoint_relative, "Staged scan checkpoint"
            )
            if checkpoint.get("scanId") != scan_id:
                raise SystemExit("Staged scan checkpoint belongs to another scan.")
            checkpoint_digest = hashlib.sha256(checkpoint_contents).hexdigest()
            write_scan_local_bytes(
                scan_dir,
                f"checkpoints/{checkpoint_digest}.json",
                checkpoint_contents,
            )
        if (
            args.expected_draft_digest is not None
            and args.expected_draft_digest != _scan_draft_digest(scan_dir)
        ):
            raise SystemExit(
                "scan_draft_conflict: canonical scan results changed; reconcile the saved checkpoint again."
            )
        try:
            relative = Path(args.draft_path).relative_to(scan_dir).as_posix()
        except ValueError as exc:
            raise SystemExit(
                "Scan draft must be inside the registered scan drafts directory."
            ) from exc
        if not re.fullmatch(r"drafts/[0-9a-fA-F-]+\.json", relative):
            raise SystemExit("Scan draft must be inside the registered scan drafts directory.")
        draft = _read_scan_local_json(scan_dir, relative, "Staged scan draft")
        manifest, findings, coverage = draft["manifest"], draft["findings"], draft["coverage"]
        binding = db.workbench_completion_binding(scan, db.now())
        # Validate on copies: saved canonical documents remain ordinary unsealed drafts.
        copied_manifest = copy.deepcopy(manifest)
        copied_findings = copy.deepcopy(findings)
        copied_coverage = copy.deepcopy(coverage)
        _populate_unsealed_manifest_envelope(copied_manifest, copied_manifest["scan"], binding)
        _populate_unsealed_artifact_envelope(
            copied_manifest, copied_findings, copied_coverage, binding
        )
        _validate_completion_binding(copied_manifest, copied_findings, copied_coverage, binding)
        for filename, document in (
            ("findings.json", findings),
            ("coverage.json", coverage),
            ("scan-manifest.json", manifest),
        ):
            write_scan_local_bytes(
                scan_dir,
                filename,
                (json.dumps(document, allow_nan=False, indent=2) + "\n").encode(),
            )
    return {"scanId": scan_id, "status": "draft_written"}

def _scan_draft_digest(scan_dir: Path) -> str:
    digest = hashlib.sha256()
    for filename in ("scan-manifest.json", "findings.json", "coverage.json"):
        digest.update(filename.encode())
        digest.update(b"\0")
        try:
            (scan_dir / filename).lstat()
        except FileNotFoundError:
            digest.update(b"missing\0")
            continue
        _, contents = _read_scan_local_json_bytes(scan_dir, filename, filename)
        digest.update(b"present\0")
        digest.update(contents)
        digest.update(b"\0")
    return digest.hexdigest()

def fail_scan(db: Any, connection: Any, args: Any) -> dict[str, Any]:
    with db.scan_completion_lock(db.require_uuid(args.scan_id, "scan-id")):
        return fail_scan_locked(db, connection, args)

def fail_scan_locked(db: Any, connection: Any, args: Any) -> dict[str, Any]:
    scan_id = db.require_uuid(args.scan_id, "scan-id")
    cost_json = db.parse_scan_cost(args.cost_json)
    connection.execute("BEGIN IMMEDIATE")
    try:
        timestamp = db.now()
        scan = db.require_scan(connection, scan_id)
        if scan["status"] == "failed":
            connection.commit()
            return db.scan_context(connection, scan["id"])
        if scan["status"] == "complete":
            raise SystemExit("A completed scan cannot be marked failed.")
        db.handoff.require_current_continuation(
            scan,
            args.claim_token,
            error_message="Scan failure is owned by another continuation.",
        )
        message = db.optional_text(args.message, maximum=2400)
        updated = connection.execute(
            """
            UPDATE scans
            SET status = 'failed', failure_message = ?, completed_at = ?, updated_at = ?,
                cost_json = ?
            WHERE id = ? AND status = 'running'
            """,
            (message, timestamp, timestamp, cost_json, scan["id"]),
        )
        if updated.rowcount != 1:
            raise SystemExit("Only a running scan can be marked failed.")
        db.deep_scan.fail_from_parent_scan(connection, scan["id"], message, timestamp)
        progress_updated = connection.execute(
            "UPDATE scan_progress SET updated_at = ? WHERE scan_id = ?",
            (timestamp, scan["id"]),
        )
        if progress_updated.rowcount != 1:
            raise SystemExit("Codex Security scan progress not found.")
        connection.commit()
    except BaseException:
        connection.rollback()
        raise
    preserve_stopped_results_after_transition(db, connection, scan["id"])
    return db.scan_context(connection, scan["id"])

def cancel_scan(db: Any, connection: Any, args: Any) -> dict[str, Any]:
    with db.scan_completion_lock(db.require_uuid(args.scan_id, "scan-id")):
        return cancel_scan_locked(db, connection, args)

def cancel_scan_locked(db: Any, connection: Any, args: Any) -> dict[str, Any]:
    scan_id = db.require_uuid(args.scan_id, "scan-id")
    thread_id = db.optional_text(args.thread_id, maximum=512)
    connection.execute("BEGIN IMMEDIATE")
    try:
        timestamp = db.now()
        scan = db.require_scan(connection, scan_id)
        workspace = db.require_workspace(connection, scan["workspace_id"])
        owning_thread_id = scan["continuation_thread_id"] or workspace["thread_id"]
        if thread_id is not None and owning_thread_id != thread_id:
            raise SystemExit("A scan can only be canceled from its owning Codex thread.")
        if scan["canceled_at"] is not None:
            connection.commit()
            return db.workspace_state(connection, scan["workspace_id"])
        if scan["status"] != "running":
            raise SystemExit("Only a running scan can be canceled.")
        updated = connection.execute(
            """
            UPDATE scans
            SET status = 'failed', canceled_at = ?, completed_at = ?, updated_at = ?
            WHERE id = ? AND status = 'running'
            """,
            (timestamp, timestamp, timestamp, scan["id"]),
        )
        if updated.rowcount != 1:
            raise SystemExit("Only a running scan can be canceled.")
        db.deep_scan.cancel_from_parent_scan(connection, scan["id"], timestamp)
        progress_updated = connection.execute(
            "UPDATE scan_progress SET updated_at = ? WHERE scan_id = ?",
            (timestamp, scan["id"]),
        )
        if progress_updated.rowcount != 1:
            raise SystemExit("Codex Security scan progress not found.")
        connection.commit()
    except BaseException:
        connection.rollback()
        raise
    preserve_stopped_results_after_transition(db, connection, scan["id"])
    return db.workspace_state(connection, scan["workspace_id"])

def preserve_stopped_results_after_transition(
    db: Any, connection: Any, scan_id: str, *, during_transition: bool = True
) -> None:
    try:
        published = preserve_scan_results_locked(
            db, connection, scan_id, during_transition=during_transition
        )
    except (ContractError, OSError, SystemExit, ValueError) as exc:
        scan = db.require_scan(connection, scan_id)
        warnings = json.loads(scan["completion_warnings_json"])
        warning = f"Saved scan evidence remains on disk; result publication needs follow-up: {exc}"
        with connection:
            connection.execute(
                "UPDATE scans SET completion_warnings_json = ? WHERE id = ?",
                (json.dumps(list(dict.fromkeys([*warnings, warning]))), scan_id),
            )
        return
    if published:
        db.deep_scan.clear_deep_scan_publication_failure(connection, scan_id)

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_scan_history.py`

```python
"""Scan history projection for the native Codex Security workbench."""

import argparse
import fnmatch
import json
import os
import sqlite3
import sys
from pathlib import Path, PurePosixPath
from typing import Any, Callable
from urllib.parse import urlsplit

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from report_projection import SEVERITY_ORDER
from workbench_constants import FINDINGS_PAGE_MAX
from workbench_scan_usage import stored_scan_cost_fields
from workbench_target import git_output

def _windows_path_key(value: str) -> str:
    return os.path.normcase(os.path.realpath(value))

def _same_repository(
    before: sqlite3.Row,
    after: sqlite3.Row,
    *,
    after_identity: tuple[str | None, tuple[str, str] | None] | None = None,
) -> bool:
    if before["target_id"] == after["target_id"]:
        return True
    before_target = Path(before["target_path"])
    after_target = Path(after["target_path"])
    before_git_dir = git_output(
        before_target, "rev-parse", "--path-format=absolute", "--git-common-dir"
    )
    after_git_dir = (
        git_output(after_target, "rev-parse", "--path-format=absolute", "--git-common-dir")
        if after_identity is None
        else after_identity[0]
    )
    if (
        before_git_dir is not None
        and after_git_dir is not None
        and Path(before_git_dir).resolve() == Path(after_git_dir).resolve()
    ):
        return True
    before_origin = _repository_origin(before_target)
    return before_origin is not None and before_origin == (
        _repository_origin(after_target) if after_identity is None else after_identity[1]
    )

def _repository_origin(target: Path) -> tuple[str, str] | None:
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

def list_scans(
    connection: sqlite3.Connection, args: argparse.Namespace | None = None
) -> dict[str, Any]:
    if os.name == "nt":
        connection.create_function("codex_security_path_key", 1, _windows_path_key)
    clauses: list[str] = []
    values: list[Any] = []
    if args is not None and args.repository:
        repository = Path(args.repository).expanduser().resolve()
        requested_repository = connection.execute(
            """
            SELECT COALESCE((SELECT id FROM security_targets WHERE current_path = ?), '') AS target_id,
                ? AS target_path
            """,
            (str(repository), str(repository)),
        ).fetchone()
        requested_identity = (
            git_output(repository, "rev-parse", "--path-format=absolute", "--git-common-dir"),
            _repository_origin(repository),
        )
        related_target_ids = [
            target["target_id"]
            for target in connection.execute(
                "SELECT id AS target_id, current_path AS target_path FROM security_targets"
            )
            if _same_repository(target, requested_repository, after_identity=requested_identity)
        ]
        repository_clauses = ["scans.target_path = ?"]
        values.append(str(repository))
        if related_target_ids:
            placeholders = ", ".join("?" for _ in related_target_ids)
            repository_clauses.append(f"scans.target_id IN ({placeholders})")
            values.extend(related_target_ids)
        clauses.append(f"({' OR '.join(repository_clauses)})")
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
                "(instr(lower(scans.target_path), ?) > 0 "
                "OR instr(lower(COALESCE(scans.target_summary, '')), ?) > 0 "
                "OR instr(lower(scans.scope), ?) > 0 "
                "OR instr(lower(scans.mode), ?) > 0)"
            )
            values.extend((query, query, query, query))
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    paginated = args is not None and (args.limit is not None or args.offset != 0)
    limit = min(args.limit or FINDINGS_PAGE_MAX, FINDINGS_PAGE_MAX) if paginated else None
    pagination = "LIMIT ? OFFSET ?" if paginated else ""
    if limit is not None:
        values.extend((limit + 1, args.offset))
    rows = connection.execute(
        f"""
        SELECT
            scans.*,
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
        FROM scans
        JOIN scan_progress AS progress ON progress.scan_id = scans.id
        {where}
        ORDER BY
            CASE WHEN scans.status = 'running' AND scans.canceled_at IS NULL THEN 0 ELSE 1 END,
            MAX(scans.updated_at, progress.updated_at) DESC,
            scans.started_at DESC,
            scans.id
        {pagination}
        """,
        values,
    ).fetchall()
    result = {
        "scans": [
            {
                "completedAt": row["completed_at"],
                "continuationThreadId": row["continuation_thread_id"],
                **stored_scan_cost_fields(row["cost_json"]),
                "findingCount": row["finding_count"],
                "handoffStatus": row["handoff_status"],
                "mode": row["mode"],
                "model": row["model"],
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
                "updatedAt": max(row["updated_at"], row["progress_updated_at"]),
                **(
                    {"warnings": json.loads(row["completion_warnings_json"])}
                    if row["completion_warnings_json"] != "[]"
                    else {}
                ),
            }
            for row in rows[:limit]
        ]
    }
    if limit is not None:
        result.update(
            {
                "limit": limit,
                "nextOffset": args.offset + limit if len(rows) > limit else None,
                "offset": args.offset,
            }
        )
    return result

def list_unmatched_scan_pairs(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    *,
    backfill_finding_details: Callable[[sqlite3.Connection, sqlite3.Row], None],
    read_coverage: Callable[[sqlite3.Row], dict[str, Any]],
) -> dict[str, Any]:
    repository = Path(args.repository).expanduser().resolve()
    requested = connection.execute(
        """
        SELECT COALESCE((SELECT id FROM security_targets WHERE current_path = ?), '') AS target_id,
            ? AS target_path
        """,
        (str(repository), str(repository)),
    ).fetchone()
    selected = [
        scan
        for scan in connection.execute(
            "SELECT * FROM scans WHERE status = 'complete' ORDER BY started_at, id"
        )
        if Path(scan["target_path"]).resolve() == repository or _same_repository(scan, requested)
    ]

    available = []
    for scan in selected:
        try:
            read_coverage(scan)
        except SystemExit:
            continue
        available.append(scan)

    saved_pairs = {
        (row["before_scan_id"], row["after_scan_id"])
        for row in connection.execute("SELECT before_scan_id, after_scan_id FROM scan_comparisons")
    }
    batches = []
    skipped = 0
    matching_findings: dict[str, list[dict[str, Any]]] = {}
    for index, after in enumerate(available):
        previous = [
            before
            for before in available[:index]
            if args.force or (before["id"], after["id"]) not in saved_pairs
        ]
        skipped += index - len(previous)
        if not previous:
            continue
        for scan in (*previous, after):
            if scan["id"] not in matching_findings:
                backfill_finding_details(connection, scan)
                matching_findings[scan["id"]] = [
                    _matching_input(row) for row in _scan_findings(connection, scan["id"]).values()
                ]
        batches.append(
            {
                "afterFindings": matching_findings[after["id"]],
                "afterScanId": after["id"],
                "beforeScans": [
                    {
                        "findings": matching_findings[before["id"]],
                        "scanId": before["id"],
                    }
                    for before in previous
                ],
            }
        )
    return {
        "batches": batches,
        "repository": str(repository),
        "scanCount": len(selected),
        "skippedPairs": skipped,
        "unavailableScans": len(selected) - len(available),
    }

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
    before = require_scan(connection, args.before_scan_id)
    after = require_scan(connection, args.after_scan_id)
    if before["id"] == after["id"]:
        raise SystemExit("Select two different scans to compare.")
    if before["status"] != "complete" or after["status"] != "complete":
        raise SystemExit("Only completed scans can be compared.")
    if not _same_repository(before, after):
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
            "No saved matches for these scans. Run 'codex-security scans match BEFORE AFTER' first."
        )
    if include_matching_inputs and backfill_finding_details is not None:
        backfill_finding_details(connection, before)
        backfill_finding_details(connection, after)
    after_coverage = read_coverage(after)
    comparable = after_coverage.get("completeness") == "complete"
    before_findings = _scan_findings(connection, before["id"])
    after_findings = _scan_findings(connection, after["id"])
    matches = json.loads(cached["result_json"]) if cached is not None else None
    groups = _finding_groups(before_findings, after_findings, matches)
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
    summary = {status: 0 for status in ("new", "persisting", "resolved", "reopened", "unknown")}

    for previous_rows, current_rows, match_reason in groups:
        previous = previous_rows[0] if previous_rows else None
        current = (
            min(current_rows, key=lambda row: SEVERITY_ORDER[row["severity"]])
            if current_rows
            else None
        )
        selected = current if current is not None else previous
        if selected is None:
            continue
        item = {
            "findingId": selected["finding_id"],
            "path": selected["relative_path"],
            "severity": selected["severity"],
            "title": selected["title"],
        }
        if previous is None:
            uncertain_reason = uncertain.get(("after", current["id"])) if current else None
            if uncertain_reason is None:
                status = "new"
            else:
                status = "unknown"
                item["reason"] = uncertain_reason
        elif current is not None:
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
        elif (uncertain_reason := uncertain.get(("before", previous["id"]))) is not None:
            status = "unknown"
            item["reason"] = uncertain_reason
        elif not comparable:
            status = "unknown"
            item["reason"] = "The later scan has incomplete coverage."
        elif not scan_covers_path(
            after,
            target_id=after["target_id"],
            path=previous["relative_path"],
            coverage=after_coverage,
        ):
            status = "unknown"
            item["reason"] = "The affected path was excluded or outside the later scope."
        else:
            status = "resolved"
        if len(previous_rows) == 1:
            item["beforeOccurrenceId"] = previous["id"]
        elif previous_rows:
            item["beforeOccurrenceIds"] = [row["id"] for row in previous_rows]
        if len(current_rows) == 1:
            item["afterOccurrenceId"] = current["id"]
        elif current_rows:
            item["afterOccurrenceIds"] = [row["id"] for row in current_rows]
        if current is not None:
            item["triage"] = {
                "closeReason": current["close_reason"],
                "status": current["triage_status"],
            }
        item["status"] = status
        findings.append(item)
        summary[status] += 1

    result = {
        "afterScanId": after["id"],
        "beforeScanId": before["id"],
        "comparable": comparable,
        "coverage": {"afterCompleteness": after_coverage.get("completeness")},
        "findings": findings,
        "repository": before["target_path"],
        "summary": summary,
    }
    if include_matching_inputs:
        result["matchingCached"] = cached is not None
        result["matchingInputs"] = {
            "before": [_matching_input(row) for row in before_findings.values()],
            "after": [_matching_input(row) for row in after_findings.values()],
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
    if not _same_repository(before, after):
        raise SystemExit("Semantic scan comparisons require the same repository target.")
    read_coverage(after)
    before_findings = _scan_findings(connection, before["id"])
    after_findings = _scan_findings(connection, after["id"])
    try:
        payload = json.loads(args.matches_json)
    except (TypeError, ValueError) as exc:
        raise SystemExit("Scan comparison matches must be a valid JSON object.") from exc
    if not isinstance(payload, dict) or set(payload) != {"matches", "uncertain"}:
        raise SystemExit("Scan comparison matches must contain matches and uncertain arrays.")
    if not isinstance(payload["matches"], list) or not isinstance(payload["uncertain"], list):
        raise SystemExit("Scan comparison matches must contain matches and uncertain arrays.")
    allowed = {
        "before": {row["id"] for row in before_findings.values()},
        "after": {row["id"] for row in after_findings.values()},
    }
    consumed: dict[str, set[str]] = {"before": set(), "after": set()}
    for match in payload["matches"]:
        for side in ("before", "after"):
            occurrences = match[f"{side}OccurrenceIds"]
            unique = set(occurrences)
            if (
                not occurrences
                or len(unique) != len(occurrences)
                or not unique.issubset(allowed[side])
                or not consumed[side].isdisjoint(unique)
            ):
                raise SystemExit("Scan comparison matches must identify distinct scan findings.")
            consumed[side].update(unique)
    uncertain_pairs = set()
    for match in payload["uncertain"]:
        pair = (match["beforeOccurrenceId"], match["afterOccurrenceId"])
        if (
            pair[0] not in allowed["before"] - consumed["before"]
            or pair[1] not in allowed["after"] - consumed["after"]
            or pair in uncertain_pairs
        ):
            raise SystemExit("Uncertain scan comparison matches must identify distinct findings.")
        uncertain_pairs.add(pair)
    timestamp = now()
    with connection:
        connection.execute("BEGIN IMMEDIATE")
        connection.execute(
            "DELETE FROM scan_comparisons WHERE before_scan_id = ? AND after_scan_id = ?",
            (before["id"], after["id"]),
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
    known_scans = [(started_at, scan_id)]
    if rows:
        known_scans = [
            (row["started_at"], row["scan_id"])
            for row in connection.execute(
                """
                WITH RECURSIVE linked_occurrences(occurrence_id) AS (
                    SELECT ?
                    UNION
                    SELECT CASE
                        WHEN matches.before_occurrence_id = linked.occurrence_id
                            THEN matches.after_occurrence_id
                        ELSE matches.before_occurrence_id
                    END
                    FROM scan_comparison_matches AS matches
                    JOIN linked_occurrences AS linked
                        ON matches.before_occurrence_id = linked.occurrence_id
                        OR matches.after_occurrence_id = linked.occurrence_id
                )
                SELECT DISTINCT scans.started_at, scans.id AS scan_id
                FROM linked_occurrences AS linked
                JOIN finding_occurrences AS occurrences ON occurrences.id = linked.occurrence_id
                JOIN scans ON scans.id = occurrences.scan_id
                ORDER BY scans.started_at, scans.id
                """,
                (occurrence_id,),
            )
        ]
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
    matches: dict[str, Any] | None,
) -> list[tuple[list[sqlite3.Row], list[sqlite3.Row], str | None]]:
    rows = {
        side: {row["id"]: row for row in findings.values()}
        for side, findings in (("before", before_findings), ("after", after_findings))
    }
    consumed: dict[str, set[str]] = {"before": set(), "after": set()}
    result = []
    for match in matches["matches"] if matches is not None else []:
        previous = [rows["before"][value] for value in match["beforeOccurrenceIds"]]
        current = [rows["after"][value] for value in match["afterOccurrenceIds"]]
        consumed["before"].update(match["beforeOccurrenceIds"])
        consumed["after"].update(match["afterOccurrenceIds"])
        result.append((previous, current, match["reason"]))
    result.extend(
        ([row], [], None) for key, row in rows["before"].items() if key not in consumed["before"]
    )
    result.extend(
        ([], [row], None) for key, row in rows["after"].items() if key not in consumed["after"]
    )
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
    conditions, values = finding_occurrence_conditions(
        scan_id, query=query, severity=severity, status=status
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
            CASE occurrences.severity
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 3
                WHEN 'informational' THEN 4
                ELSE 5
            END,
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
                "(instr(lower(occurrences.title), ?) > 0 "
                "OR instr(lower(occurrences.summary), ?) > 0 "
                "OR EXISTS ("
                "SELECT 1 FROM finding_locations AS locations "
                "WHERE locations.occurrence_id = occurrences.id "
                "AND instr(lower(locations.relative_path), ?) > 0))"
            )
            values.extend((search, search, search))
    return " AND ".join(conditions), values

def _scan_findings(connection: sqlite3.Connection, scan_id: str) -> dict[str, sqlite3.Row]:
    rows = connection.execute(
        """
        SELECT occurrences.*,
            COALESCE(triage.status, 'open') AS triage_status, triage.close_reason,
            (
                SELECT locations.relative_path
                FROM finding_locations AS locations
                WHERE locations.occurrence_id = occurrences.id
                ORDER BY CASE WHEN locations.role = 'root_control' THEN 0 ELSE 1 END,
                    locations.sort_order
                LIMIT 1
            ) AS relative_path
        FROM finding_occurrences AS occurrences
        LEFT JOIN finding_triage AS triage ON triage.occurrence_id = occurrences.id
        WHERE occurrences.scan_id = ?
        """,
        (scan_id,),
    )
    return {row["finding_id"]: row for row in rows}

def scan_covers_path(
    scan: sqlite3.Row,
    *,
    target_id: str,
    path: str | None,
    coverage: dict[str, Any],
) -> bool:
    if (
        scan["status"] != "complete"
        or scan["target_id"] != target_id
        or coverage.get("completeness") != "complete"
    ):
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

## File: `scripts/workbench_scan_start.py`

```python
"""Shared scan-start helpers for the Codex Security workbench."""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import tempfile
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from filesystem_identity import serialize_filesystem_identity
from finalize_scan_contract import write_scan_local_bytes
from workbench_feedback import get_scan_feedback
from workbench_target import (
    directory_content_digest,
    git_revision,
    worktree_content_digest,
)
from workbench_validation import optional_text, user_text

def safe_segment(value: str) -> str:
    segment = "".join(
        character if character.isalnum() or character in "._-" else "-" for character in value
    )
    return segment.strip("-") or "scan"

def compact_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

def scan_target_identity(
    target: Path,
    diff_target: dict[str, str] | None,
    *,
    metadata: os.stat_result | None = None,
) -> tuple[str, str | None, int | str, int | str]:
    if metadata is None:
        metadata = target.stat()
    revision = diff_target["headRevision"] if diff_target else git_revision(target)
    snapshot_digest = None
    if diff_target is None:
        snapshot_digest = (
            directory_content_digest(target)
            if revision == "unversioned"
            else worktree_content_digest(target)
        )
    return (
        revision,
        snapshot_digest,
        serialize_filesystem_identity(metadata.st_dev),
        serialize_filesystem_identity(metadata.st_ino),
    )

def scan_diff_identity(
    diff_target: dict[str, str] | None,
) -> tuple[str | None, str | None, str | None, str | None]:
    if diff_target is None:
        return (None, None, None, None)
    return (
        diff_target["kind"],
        diff_target["baseRevision"],
        diff_target["headRevision"],
        diff_target.get("contentDigest"),
    )

def stored_diff_target(row: sqlite3.Row) -> dict[str, str] | None:
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

def archive_scan(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    scan_dir: Path,
    timestamp: str,
    canonical_directory: Callable[[Path], Path],
) -> None:
    archived_scan_dir = (
        canonical_directory(Path(args.archived_scan_dir).expanduser())
        if args.archived_scan_dir is not None
        else None
    )
    if archived_scan_dir is not None and (
        not args.archive_existing
        or archived_scan_dir.parent != scan_dir.parent
        or not archived_scan_dir.name.startswith(f"{scan_dir.name}.previous-")
    ):
        raise SystemExit("The archived scan must be a previous sibling of the scan directory.")

    previous_scan = connection.execute(
        "SELECT id, status FROM scans WHERE scan_dir = ?", (str(scan_dir),)
    ).fetchone()
    if previous_scan is None:
        return
    if not args.archive_existing:
        raise SystemExit(
            "The scan artifact directory belongs to an existing scan. "
            "Use --archive-existing to preserve that scan and start a new one."
        )
    if previous_scan["status"] == "running":
        raise SystemExit("Cannot archive the output of a running scan.")
    artifacts = connection.execute(
        "SELECT kind, path FROM scan_artifacts WHERE scan_id = ?",
        (previous_scan["id"],),
    ).fetchall()
    if archived_scan_dir is None:
        if artifacts:
            raise SystemExit(
                "The archived scan directory is required to preserve existing scan artifacts."
            )
        archived_scan_dir = Path(
            tempfile.mkdtemp(prefix=f"{scan_dir.name}.previous-", dir=scan_dir.parent)
        ).resolve()
    connection.execute(
        "UPDATE scans SET scan_dir = ?, updated_at = ? WHERE id = ?",
        (str(archived_scan_dir), timestamp, previous_scan["id"]),
    )
    for artifact in artifacts:
        try:
            relative_path = Path(artifact["path"]).relative_to(scan_dir)
        except ValueError:
            continue
        connection.execute(
            "UPDATE scan_artifacts SET path = ? WHERE scan_id = ? AND kind = ?",
            (
                str(archived_scan_dir / relative_path),
                previous_scan["id"],
                artifact["kind"],
            ),
        )

def insert_running_scan(
    connection: sqlite3.Connection,
    *,
    scan_id: str,
    workspace: sqlite3.Row,
    target: Path,
    scope: str,
    diff_target: dict[str, str] | None,
    target_identity: tuple[str, str | None, int | str, int | str],
    target_root: Path,
    target_summary: str | None,
    scope_file_count: int,
    timestamp: str,
    handoff_status: str = "pending",
    model: str | None = None,
    reasoning_effort: str | None = None,
    scan_dir: Path | None = None,
) -> str:
    revision = target_identity[0]
    native_scan = scan_dir is None
    user_context = user_text(workspace["user_context"])
    if scan_dir is None:
        scan_dir = Path(
            tempfile.mkdtemp(
                prefix=f"{safe_segment(revision)}_{compact_timestamp()}_",
                dir=target_root,
            )
        ).resolve()
    connection.execute(
        """
        INSERT INTO scans (
            id, workspace_id, target_id, target_path, target_revision, target_snapshot_digest,
            target_device, target_inode, scope, mode, user_context,
            deep_scan_owner_thread_id, diff_target_kind, diff_base_revision,
            diff_head_revision, diff_content_digest, target_summary, scan_dir, model,
            reasoning_effort, status, phase, handoff_status, started_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            'running', 'preflight', ?, ?, ?, ?)
        """,
        (
            scan_id,
            workspace["id"],
            workspace["target_id"],
            str(target),
            *target_identity,
            scope,
            workspace["default_mode"],
            user_context,
            workspace["thread_id"] if workspace["default_mode"] == "deep" else None,
            diff_target["kind"] if diff_target else None,
            diff_target["baseRevision"] if diff_target else None,
            diff_target["headRevision"] if diff_target else None,
            diff_target.get("contentDigest") if diff_target else None,
            target_summary,
            str(scan_dir),
            optional_text(model, maximum=200),
            optional_text(reasoning_effort, maximum=32),
            handoff_status,
            timestamp,
            timestamp,
            timestamp,
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

def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()

if __name__ == "__main__":
    main()
```

## File: `scripts/workbench_scan_usage.py`

```python
"""Measure scan-owned Codex token usage from the live thread graph."""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

TOKEN_FIELDS = {
    "input_tokens": "inputTokens",
    "cached_input_tokens": "cachedInputTokens",
    "cache_write_input_tokens": "cacheWriteInputTokens",
    "output_tokens": "outputTokens",
    "reasoning_output_tokens": "reasoningOutputTokens",
    "total_tokens": "totalTokens",
}
STATE_DATABASE_NAME = re.compile(r"state_(\d+)\.sqlite")
STATE_DATABASE_TIMEOUT_SECONDS = 1.0

@dataclass(frozen=True)
class RolloutSession:
    thread_id: str
    parent_thread_id: str | None
    path: Path

def stored_scan_cost_fields(value: str | None) -> dict[str, Any]:
    """Project measured usage without changing the existing legacy cost contract."""

    if value is None:
        return {}
    stored = json.loads(value, parse_constant=_reject_nonstandard_json_number)
    if not isinstance(stored, dict):
        return {}
    if "usage" not in stored:
        return {"cost": stored}
    return {
        "usage": stored["usage"],
        **({"cost": stored["cost"]} if isinstance(stored.get("cost"), dict) else {}),
    }

def measured_scan_cost_json(usage: Mapping[str, Any]) -> str:
    """Keep usage in the already-migrated scans.cost_json column."""

    return json.dumps({"usage": dict(usage)}, separators=(",", ":"), allow_nan=False)

def reconcile_completed_scan_cost(
    connection: sqlite3.Connection,
    scan: sqlite3.Row,
    cost_json: str,
) -> None:
    """Persist authoritative SDK cost without discarding measured worker usage."""

    existing = json.loads(scan["cost_json"]) if scan["cost_json"] is not None else {}
    if isinstance(existing, dict) and "usage" in existing:
        cost_json = json.dumps(
            {**existing, "cost": json.loads(cost_json)},
            separators=(",", ":"),
            allow_nan=False,
        )
    connection.execute("BEGIN IMMEDIATE")
    try:
        connection.execute(
            "UPDATE scans SET cost_json = ? WHERE id = ? AND status = 'complete'",
            (cost_json, scan["id"]),
        )
        connection.commit()
    except BaseException:
        connection.rollback()
        raise

def collect_scan_usage(
    connection: sqlite3.Connection,
    scan: sqlite3.Row,
    *,
    thread_id: str | None = None,
    completed_at: str | None = None,
) -> dict[str, Any]:
    """Count only complete, attributable rollout events inside this scan's window."""

    roots = _scan_root_thread_ids(connection, scan, thread_id)
    if not roots:
        return _unavailable_usage("scan_thread_unavailable")

    state_database = _codex_state_database()
    if state_database is None:
        return _unavailable_usage("codex_state_unavailable")

    started_at = _timestamp(scan["started_at"])
    stopped_at = _timestamp(completed_at or scan["completed_at"])
    if started_at is None:
        return _unavailable_usage("scan_window_unavailable")

    warnings: set[str] = set()
    try:
        sessions, missing_thread_ids = _discover_rollout_sessions(
            state_database,
            roots,
            warnings,
        )
    except (OSError, sqlite3.Error, ValueError):
        return _unavailable_usage("codex_state_unavailable")

    if not sessions:
        return _unavailable_usage("scan_thread_unavailable", warnings=warnings)

    total = _empty_token_usage()
    observed_thread_count = 0
    accepted_thread_ids: set[str] = set()
    excluded_thread_ids: set[str] = set()
    for session in sessions:
        if session.parent_thread_id in excluded_thread_ids:
            excluded_thread_ids.add(session.thread_id)
            continue
        if (
            session.parent_thread_id is not None
            and session.parent_thread_id not in accepted_thread_ids
        ):
            missing_thread_ids.add(session.thread_id)
            warnings.add("thread_lineage_incomplete")
            continue
        try:
            session_usage, session_warnings = _read_rollout_usage(
                session,
                started_at=started_at,
                completed_at=stopped_at,
            )
        except (OSError, UnicodeError, ValueError):
            missing_thread_ids.add(session.thread_id)
            warnings.add("rollout_unavailable")
            continue
        if "thread_outside_scan_window" in session_warnings:
            excluded_thread_ids.add(session.thread_id)
            continue
        warnings.update(session_warnings)
        if "thread_identity_mismatch" in session_warnings or (
            "thread_ownership_unavailable" in session_warnings
        ):
            missing_thread_ids.add(session.thread_id)
            continue
        accepted_thread_ids.add(session.thread_id)
        observed_thread_count += 1
        _add_token_usage(total, session_usage)

    if not observed_thread_count:
        return _unavailable_usage("scan_thread_unavailable", warnings=warnings)

    result: dict[str, Any] = {
        "coverage": "partial" if missing_thread_ids or warnings else "complete",
        "source": "codex_rollout",
        **total,
        "threadCount": observed_thread_count,
    }
    if missing_thread_ids:
        result["missingThreadCount"] = len(missing_thread_ids)
    if warnings:
        result["warnings"] = sorted(warnings)
    return result

def _scan_root_thread_ids(
    connection: sqlite3.Connection,
    scan: sqlite3.Row,
    supplied_thread_id: str | None,
) -> list[str]:
    candidates: list[str | None] = [supplied_thread_id]
    if "continuation_thread_id" in scan.keys():
        candidates.append(scan["continuation_thread_id"])
    if "deep_scan_owner_thread_id" in scan.keys():
        candidates.append(scan["deep_scan_owner_thread_id"])
    workspace = connection.execute(
        "SELECT thread_id FROM workspaces WHERE id = ?",
        (scan["workspace_id"],),
    ).fetchone()
    if workspace is not None:
        candidates.append(workspace["thread_id"])
    if scan["mode"] == "deep":
        candidates.extend(
            row["sdk_thread_id"]
            for row in connection.execute(
                """
                SELECT DISTINCT sdk_thread_id
                FROM deep_scan_workers
                WHERE scan_id = ? AND sdk_thread_id IS NOT NULL
                ORDER BY sdk_thread_id
                """,
                (scan["id"],),
            )
        )
    roots: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        if isinstance(candidate, str) and candidate.strip() and candidate not in seen:
            roots.append(candidate)
            seen.add(candidate)
    return roots

def _codex_state_database() -> Path | None:
    configured_database = os.environ.get("CODEX_STATE_DB", "").strip()
    if configured_database:
        path = Path(configured_database).expanduser()
        return path.resolve() if path.is_file() and os.access(path, os.R_OK) else None

    configured_home = os.environ.get("CODEX_HOME", "").strip()
    codex_home = Path(configured_home).expanduser() if configured_home else Path.home() / ".codex"
    configured_sqlite_home = os.environ.get("CODEX_SQLITE_HOME", "").strip()
    search_roots = [
        *([Path(configured_sqlite_home).expanduser()] if configured_sqlite_home else []),
        codex_home,
        codex_home / "sqlite",
    ]
    seen: set[Path] = set()
    for search_root in search_roots:
        try:
            resolved_root = search_root.resolve()
            if resolved_root in seen:
                continue
            seen.add(resolved_root)
            candidates = [
                (int(match.group(1)), path)
                for path in resolved_root.glob("state_*.sqlite")
                if (match := STATE_DATABASE_NAME.fullmatch(path.name)) is not None
                and path.is_file()
                and os.access(path, os.R_OK)
            ]
        except (OSError, RuntimeError, ValueError):
            continue
        if candidates:
            return max(candidates, key=lambda item: item[0])[1].resolve()
    return None

def _discover_rollout_sessions(
    state_database: Path,
    roots: list[str],
    warnings: set[str],
) -> tuple[list[RolloutSession], set[str]]:
    database = sqlite3.connect(
        state_database.as_uri() + "?mode=ro",
        uri=True,
        timeout=STATE_DATABASE_TIMEOUT_SECONDS,
    )
    try:
        database.row_factory = sqlite3.Row
        database.execute("PRAGMA query_only = ON")
        _require_state_columns(database, "threads", {"id", "rollout_path"})
        _require_state_columns(
            database,
            "thread_spawn_edges",
            {"parent_thread_id", "child_thread_id"},
        )
        sessions: list[RolloutSession] = []
        seen_thread_ids: set[str] = set()
        missing_thread_ids: set[str] = set()
        for root in roots:
            row = database.execute(
                "SELECT id, rollout_path FROM threads WHERE id = ?",
                (root,),
            ).fetchone()
            if row is None:
                missing_thread_ids.add(root)
                warnings.add("scan_root_unavailable")
                continue
            if root not in seen_thread_ids:
                path = _rollout_path(row["rollout_path"])
                if path is None:
                    missing_thread_ids.add(root)
                    warnings.add("rollout_unavailable")
                    continue
                sessions.append(RolloutSession(root, None, path))
                seen_thread_ids.add(root)
            descendants = database.execute(
                """
                WITH RECURSIVE descendants(
                    depth, parent_thread_id, child_thread_id, ancestry, cycle
                ) AS (
                    SELECT
                        1,
                        edges.parent_thread_id,
                        edges.child_thread_id,
                        '|' || edges.parent_thread_id || '|' || edges.child_thread_id || '|',
                        edges.parent_thread_id = edges.child_thread_id
                    FROM thread_spawn_edges AS edges
                    WHERE edges.parent_thread_id = ?

                    UNION ALL

                    SELECT
                        descendants.depth + 1,
                        edges.parent_thread_id,
                        edges.child_thread_id,
                        descendants.ancestry || edges.child_thread_id || '|',
                        instr(descendants.ancestry, '|' || edges.child_thread_id || '|') > 0
                    FROM thread_spawn_edges AS edges
                    JOIN descendants ON edges.parent_thread_id = descendants.child_thread_id
                    WHERE descendants.cycle = 0
                )
                SELECT
                    descendants.depth,
                    descendants.parent_thread_id,
                    descendants.child_thread_id,
                    descendants.cycle,
                    threads.rollout_path
                FROM descendants
                LEFT JOIN threads ON threads.id = descendants.child_thread_id
                ORDER BY descendants.depth, descendants.child_thread_id
                """,
                (root,),
            )
            for descendant in descendants:
                child_id = descendant["child_thread_id"]
                parent_id = descendant["parent_thread_id"]
                if not isinstance(child_id, str) or not isinstance(parent_id, str):
                    warnings.add("thread_lineage_incomplete")
                    continue
                if descendant["cycle"]:
                    missing_thread_ids.add(child_id)
                    warnings.add("thread_lineage_cycle")
                    continue
                if child_id in seen_thread_ids:
                    continue
                path = _rollout_path(descendant["rollout_path"])
                if path is None:
                    missing_thread_ids.add(child_id)
                    warnings.add("rollout_unavailable")
                    continue
                sessions.append(RolloutSession(child_id, parent_id, path))
                seen_thread_ids.add(child_id)
        return sessions, missing_thread_ids
    finally:
        database.close()

def _require_state_columns(
    connection: sqlite3.Connection,
    table: str,
    required: set[str],
) -> None:
    statements = {
        "threads": "PRAGMA table_info(threads)",
        "thread_spawn_edges": "PRAGMA table_info(thread_spawn_edges)",
    }
    columns = {str(row["name"]) for row in connection.execute(statements[table])}
    if not required.issubset(columns):
        raise ValueError("Codex state graph does not expose the required thread columns.")

def _rollout_path(value: object) -> Path | None:
    if not isinstance(value, str) or not value:
        return None
    candidate = Path(value).expanduser()
    if not candidate.is_absolute():
        return None
    try:
        resolved = candidate.resolve(strict=True)
        if not resolved.is_file():
            return None

        if resolved == candidate:
            return resolved

        if sys.platform == "darwin" and candidate.parts[1] in {"var", "tmp"}:
            expected = Path("/private", *candidate.parts[1:])
            if resolved == expected:
                return resolved
    except (OSError, RuntimeError):
        return None
    return None

def _read_rollout_usage(
    session: RolloutSession,
    *,
    started_at: datetime,
    completed_at: datetime | None,
) -> tuple[dict[str, int], set[str]]:
    total = _empty_token_usage()
    warnings: set[str] = set()
    previous = _empty_token_usage()
    boundary_reached = False

    with session.path.open("rb") as source:
        for line_number, raw_line in enumerate(source, start=1):
            if not raw_line.endswith(b"\n"):
                warnings.add("rollout_record_incomplete")
                continue
            try:
                event = json.loads(raw_line)
            except (UnicodeError, ValueError):
                if line_number == 1:
                    raise ValueError("The rollout session metadata is unreadable.") from None
                if boundary_reached:
                    warnings.add("rollout_record_invalid")
                continue
            if not isinstance(event, dict):
                if boundary_reached:
                    warnings.add("rollout_record_invalid")
                continue
            payload = event.get("payload")
            if line_number == 1:
                if event.get("type") != "session_meta" or not isinstance(payload, dict):
                    warnings.add("thread_identity_mismatch")
                    return total, warnings
                recorded_id = payload.get("id") or payload.get("session_id")
                if recorded_id != session.thread_id:
                    warnings.add("thread_identity_mismatch")
                    return total, warnings
                recorded_parent = _session_parent_thread_id(payload)
                if session.parent_thread_id is not None:
                    if recorded_parent != session.parent_thread_id:
                        warnings.add("thread_identity_mismatch")
                        return total, warnings
                boundary_reached = (
                    session.parent_thread_id is None
                    and not recorded_parent
                    and not payload.get("forked_from_id")
                )
                continue

            if not isinstance(payload, dict):
                continue
            if not boundary_reached:
                if _is_owned_task_start(session.thread_id, event, payload):
                    task_started_at = _timestamp(event.get("timestamp"))
                    if task_started_at is None:
                        warnings.add("thread_ownership_unavailable")
                        return total, warnings
                    if task_started_at < started_at or (
                        completed_at is not None and task_started_at > completed_at
                    ):
                        warnings.add("thread_outside_scan_window")
                        return total, warnings
                    boundary_reached = True
                elif event.get("type") == "event_msg" and payload.get("type") == "token_count":
                    inherited_usage = _token_snapshot(payload)
                    if inherited_usage is not None:
                        previous = inherited_usage
                continue
            if event.get("type") != "event_msg" or payload.get("type") != "token_count":
                continue
            timestamp = _timestamp(event.get("timestamp"))
            snapshot = _token_snapshot(payload)
            if timestamp is None or snapshot is None:
                warnings.add("token_record_invalid")
                continue
            delta = {
                key: value - previous[key] if value >= previous[key] else value
                for key, value in snapshot.items()
            }
            previous = snapshot
            if timestamp < started_at:
                continue
            if completed_at is not None and timestamp > completed_at:
                continue
            if delta["totalTokens"] <= 0:
                continue
            _add_token_usage(total, delta)

    if not boundary_reached:
        warnings.add("thread_ownership_unavailable")
    return total, warnings

def _session_parent_thread_id(payload: Mapping[str, Any]) -> str | None:
    source = payload.get("source")
    if isinstance(source, dict):
        subagent = source.get("subagent")
        if isinstance(subagent, dict):
            thread_spawn = subagent.get("thread_spawn")
            if isinstance(thread_spawn, dict):
                parent = thread_spawn.get("parent_thread_id")
                if isinstance(parent, str) and parent:
                    return parent
    for key in ("parent_thread_id", "forked_from_id"):
        parent = payload.get(key)
        if isinstance(parent, str) and parent:
            return parent
    return None

def _is_owned_task_start(
    thread_id: str,
    event: Mapping[str, Any],
    payload: Mapping[str, Any],
) -> bool:
    if event.get("type") != "event_msg" or payload.get("type") != "task_started":
        return False
    turn_id = payload.get("turn_id")
    if not isinstance(turn_id, str) or not turn_id:
        return False
    thread_timestamp = _uuid7_timestamp(thread_id)
    turn_timestamp = _uuid7_timestamp(turn_id)
    if thread_timestamp is None:
        return True
    return turn_timestamp is not None and turn_timestamp >= thread_timestamp

def _uuid7_timestamp(value: str) -> int | None:
    try:
        parsed = uuid.UUID(value)
    except ValueError:
        return None
    return parsed.int >> 80 if parsed.version == 7 else None

def _token_snapshot(payload: Mapping[str, Any]) -> dict[str, int] | None:
    info = payload.get("info")
    if not isinstance(info, dict):
        return None
    usage = info.get("total_token_usage")
    if not isinstance(usage, dict):
        return None
    result: dict[str, int] = {}
    for source_key, result_key in TOKEN_FIELDS.items():
        value = (
            usage.get(source_key, usage.get("cache_write_tokens", 0))
            if source_key == "cache_write_input_tokens"
            else usage.get(source_key, 0)
        )
        if type(value) is not int or value < 0:
            return None
        if source_key in {"input_tokens", "output_tokens", "total_tokens"} and (
            source_key not in usage
        ):
            return None
        result[result_key] = value
    if result["cachedInputTokens"] + result["cacheWriteInputTokens"] > result["inputTokens"]:
        return None
    result["totalTokens"] = result["inputTokens"] + result["outputTokens"]
    return result

def _empty_token_usage() -> dict[str, int]:
    return {field: 0 for field in TOKEN_FIELDS.values()}

def _add_token_usage(target: dict[str, int], addition: Mapping[str, int]) -> None:
    for key in TOKEN_FIELDS.values():
        target[key] += addition[key]

def _timestamp(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = (
            datetime.fromisoformat(value.removesuffix("Z") + "+00:00")
            if value.endswith("Z")
            else datetime.fromisoformat(value)
        )
    except ValueError:
        return None
    return parsed.astimezone(timezone.utc) if parsed.tzinfo is not None else None

def _unavailable_usage(reason: str, *, warnings: set[str] | None = None) -> dict[str, Any]:
    return {
        "coverage": "unavailable",
        "source": "codex_rollout",
        "threadCount": 0,
        "warnings": sorted({reason, *(warnings or set())}),
    }

def _reject_nonstandard_json_number(value: str) -> None:
    raise ValueError(f"invalid JSON number {value}")

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench_schema.py`

```python
"""SQLite schema history for the Codex Security workbench."""

import argparse
import sqlite3
from collections.abc import Callable

MIGRATIONS = (
    (
        1,
        "initial workbench schema",
        """
        CREATE TABLE workspaces (
            id TEXT PRIMARY KEY,
            target_path TEXT,
            target_title TEXT,
            target_summary TEXT,
            default_scope TEXT NOT NULL DEFAULT '.',
            default_mode TEXT NOT NULL DEFAULT 'standard'
                CHECK (default_mode IN ('diff', 'standard', 'deep')),
            user_context TEXT,
            diff_target_kind TEXT
                CHECK (diff_target_kind IN ('working_tree', 'commit', 'range')),
            diff_base_revision TEXT,
            diff_head_revision TEXT,
            diff_content_digest TEXT,
            diff_resolution_id TEXT,
            submitted INTEGER NOT NULL DEFAULT 0 CHECK (submitted IN (0, 1)),
            active_scan_id TEXT REFERENCES scans(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE scans (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            target_path TEXT NOT NULL,
            target_revision TEXT NOT NULL,
            target_snapshot_digest TEXT,
            scope TEXT NOT NULL,
            mode TEXT NOT NULL CHECK (mode IN ('diff', 'standard', 'deep')),
            user_context TEXT,
            diff_target_kind TEXT
                CHECK (diff_target_kind IN ('working_tree', 'commit', 'range')),
            diff_base_revision TEXT,
            diff_head_revision TEXT,
            diff_content_digest TEXT,
            scan_dir TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL CHECK (status IN ('running', 'complete', 'failed')),
            phase TEXT NOT NULL CHECK (
                phase IN ('preflight', 'threat_model', 'discovery', 'validation', 'attack_path', 'reporting')
            ),
            handoff_status TEXT NOT NULL DEFAULT 'pending'
                CHECK (handoff_status IN ('pending', 'delivered')),
            failure_message TEXT,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE scan_progress (
            scan_id TEXT PRIMARY KEY REFERENCES scans(id) ON DELETE CASCADE,
            review_items_total INTEGER NOT NULL DEFAULT 0 CHECK (review_items_total >= 0),
            review_items_completed INTEGER NOT NULL DEFAULT 0
                CHECK (review_items_completed >= 0 AND review_items_completed <= review_items_total),
            reportable_findings_count INTEGER NOT NULL DEFAULT 0
                CHECK (reportable_findings_count >= 0),
            deep_review_pass INTEGER CHECK (deep_review_pass IS NULL OR deep_review_pass >= 1),
            updated_at TEXT NOT NULL
        );

        CREATE TABLE scan_artifacts (
            scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
            kind TEXT NOT NULL CHECK (
                kind IN ('coverage', 'findings', 'manifest', 'markdownReport')
            ),
            path TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (scan_id, kind)
        );

        CREATE TABLE findings (
            id TEXT PRIMARY KEY,
            fingerprint TEXT NOT NULL UNIQUE,
            rule_id TEXT NOT NULL,
            identity_anchor TEXT NOT NULL,
            identity_instance TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE finding_occurrences (
            id TEXT PRIMARY KEY,
            finding_id TEXT NOT NULL REFERENCES findings(id),
            scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            severity TEXT NOT NULL,
            confidence TEXT NOT NULL,
            remediation TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE (scan_id, finding_id)
        );

        CREATE TABLE finding_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            occurrence_id TEXT NOT NULL REFERENCES finding_occurrences(id) ON DELETE CASCADE,
            relative_path TEXT NOT NULL,
            start_line INTEGER NOT NULL CHECK (start_line >= 1),
            end_line INTEGER NOT NULL CHECK (end_line >= start_line),
            role TEXT,
            sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
            UNIQUE (occurrence_id, sort_order)
        );

        CREATE UNIQUE INDEX scans_one_running_per_workspace
        ON scans(workspace_id)
        WHERE status = 'running';
        """,
    ),
    (
        2,
        "persist capability preflight summaries",
        """
        ALTER TABLE workspaces ADD COLUMN capability_preflight_json TEXT;
        """,
    ),
    (
        3,
        "finding management schema",
        """
        CREATE TABLE finding_triage (
            occurrence_id TEXT PRIMARY KEY REFERENCES finding_occurrences(id) ON DELETE CASCADE,
            status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
            close_reason TEXT CHECK (
                close_reason IS NULL OR close_reason IN ('already_fixed', 'wont_fix', 'false_positive')
            ),
            note TEXT,
            updated_at TEXT NOT NULL,
            CHECK (
                (status = 'open' AND close_reason IS NULL)
                OR (status = 'closed' AND close_reason IS NOT NULL)
            )
        );

        CREATE TABLE finding_remediation_attempts (
            request_id TEXT PRIMARY KEY,
            occurrence_id TEXT NOT NULL REFERENCES finding_occurrences(id) ON DELETE CASCADE,
            state TEXT NOT NULL CHECK (
                state IN ('idle', 'requested', 'generated', 'applied', 'verifying', 'verified', 'failed', 'superseded')
            ),
            version INTEGER NOT NULL CHECK (version >= 1),
            base_revision TEXT NOT NULL,
            base_content_digest TEXT,
            applied_content_digest TEXT,
            pending_action TEXT CHECK (
                pending_action IS NULL OR pending_action IN ('generate', 'apply', 'verify')
            ),
            patch_path TEXT,
            patch_digest TEXT,
            summary TEXT,
            verification_summary TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX finding_remediation_attempts_by_occurrence
        ON finding_remediation_attempts(occurrence_id, created_at DESC);

        ALTER TABLE finding_occurrences
        ADD COLUMN details_json TEXT NOT NULL DEFAULT '{}';

        """,
    ),
    (
        4,
        "scan handoff delivery claims",
        """
        ALTER TABLE scans
        ADD COLUMN handoff_claimed_at TEXT;

        ALTER TABLE scans
        ADD COLUMN handoff_claim_token TEXT;
        """,
    ),
    (
        5,
        "finding remediation action claims",
        """
        ALTER TABLE finding_remediation_attempts
        ADD COLUMN pending_action_claimed_at TEXT;

        ALTER TABLE finding_remediation_attempts
        ADD COLUMN pending_action_claim_token TEXT;
        """,
    ),
    (
        6,
        "thread-scoped workspaces",
        """
        ALTER TABLE workspaces
        ADD COLUMN thread_id TEXT;

        CREATE INDEX workspaces_by_thread_and_updated_at
        ON workspaces(thread_id, updated_at DESC);
        """,
    ),
    (
        7,
        "remediation host delivery state",
        """
        ALTER TABLE finding_remediation_attempts
        ADD COLUMN pending_action_delivered_at TEXT;
        """,
    ),
    (
        8,
        "sealed manifest digests",
        """
        ALTER TABLE scans
        ADD COLUMN seal_manifest_digest TEXT;
        """,
    ),
    (
        9,
        "scan target filesystem identity",
        """
        ALTER TABLE scans
        ADD COLUMN target_device INTEGER;

        ALTER TABLE scans
        ADD COLUMN target_inode INTEGER;
        """,
    ),
    (
        10,
        "scan cancellation state",
        """
        ALTER TABLE scans
        ADD COLUMN canceled_at TEXT;
        """,
    ),
    (
        11,
        "deep scan orchestration state",
        """
        ALTER TABLE scans
        ADD COLUMN deep_scan_owner_thread_id TEXT;

        UPDATE scans
        SET deep_scan_owner_thread_id = (
            SELECT workspaces.thread_id
            FROM workspaces
            WHERE workspaces.id = scans.workspace_id
        )
        WHERE mode = 'deep'
            AND status = 'running'
            AND id IN (
                SELECT MIN(active_scans.id)
                FROM scans AS active_scans
                JOIN workspaces AS active_workspaces
                    ON active_workspaces.id = active_scans.workspace_id
                WHERE active_scans.mode = 'deep'
                    AND active_scans.status = 'running'
                    AND active_workspaces.thread_id IS NOT NULL
                GROUP BY active_workspaces.thread_id,
                    active_scans.target_path,
                    active_scans.scope
            );

        CREATE UNIQUE INDEX scans_one_running_deep_per_owner_target
        ON scans(deep_scan_owner_thread_id, target_path, scope)
        WHERE mode = 'deep'
            AND status = 'running'
            AND deep_scan_owner_thread_id IS NOT NULL;

        CREATE TABLE deep_scan_runs (
            scan_id TEXT PRIMARY KEY REFERENCES scans(id) ON DELETE CASCADE,
            schema_version INTEGER NOT NULL CHECK (schema_version = 1),
            workflow_version TEXT NOT NULL,
            coordinator_generation INTEGER NOT NULL DEFAULT 1
                CHECK (coordinator_generation >= 1),
            status TEXT NOT NULL CHECK (
                status IN ('running', 'succeeded', 'failed', 'canceled', 'interrupted')
            ),
            phase TEXT NOT NULL CHECK (
                phase IN ('setup', 'discovery', 'reducing', 'terminal')
            ),
            workers INTEGER NOT NULL CHECK (workers >= 1),
            subagents INTEGER NOT NULL CHECK (subagents >= 0),
            stop_after_no_new INTEGER NOT NULL CHECK (stop_after_no_new >= 1),
            max_discovery_runs INTEGER NOT NULL CHECK (max_discovery_runs >= 1),
            discovery_runs_dispatched INTEGER NOT NULL DEFAULT 0
                CHECK (discovery_runs_dispatched >= 0),
            completion_sequence INTEGER NOT NULL DEFAULT 0
                CHECK (completion_sequence >= 0),
            consecutive_no_new INTEGER NOT NULL DEFAULT 0
                CHECK (consecutive_no_new >= 0),
            cancel_requested INTEGER NOT NULL DEFAULT 0
                CHECK (cancel_requested IN (0, 1)),
            canonical_inventory_path TEXT,
            canonical_finding_report_path TEXT,
            canonical_candidates_path TEXT,
            dedupe_report_path TEXT,
            seed_research_path TEXT,
            work_ledger_path TEXT,
            raw_candidates_path TEXT,
            coverage_ledger_path TEXT,
            findings_dir TEXT,
            manifest_path TEXT,
            terminal_reason TEXT CHECK (
                terminal_reason IS NULL OR terminal_reason IN ('saturated', 'capped')
            ),
            error_message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT,
            CHECK (
                (
                    canonical_inventory_path IS NULL
                    AND canonical_finding_report_path IS NULL
                    AND canonical_candidates_path IS NULL
                    AND dedupe_report_path IS NULL
                    AND seed_research_path IS NULL
                    AND work_ledger_path IS NULL
                    AND raw_candidates_path IS NULL
                    AND coverage_ledger_path IS NULL
                    AND findings_dir IS NULL
                ) OR (
                    canonical_inventory_path IS NOT NULL
                    AND canonical_finding_report_path IS NOT NULL
                    AND canonical_candidates_path IS NOT NULL
                    AND dedupe_report_path IS NOT NULL
                    AND seed_research_path IS NOT NULL
                    AND work_ledger_path IS NOT NULL
                    AND raw_candidates_path IS NOT NULL
                    AND coverage_ledger_path IS NOT NULL
                    AND findings_dir IS NOT NULL
                )
            )
        );

        CREATE TABLE deep_scan_workers (
            id TEXT PRIMARY KEY,
            scan_id TEXT NOT NULL REFERENCES deep_scan_runs(scan_id) ON DELETE CASCADE,
            kind TEXT NOT NULL CHECK (kind IN ('setup', 'discovery', 'dedup')),
            status TEXT NOT NULL CHECK (
                status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')
            ),
            merge_state TEXT NOT NULL DEFAULT 'none' CHECK (
                merge_state IN ('none', 'buffered', 'merging', 'merged')
            ),
            prompt_path TEXT NOT NULL,
            artifact_dir TEXT NOT NULL,
            result_manifest_path TEXT,
            attempt INTEGER NOT NULL DEFAULT 0 CHECK (attempt >= 0),
            sdk_thread_id TEXT,
            completion_sequence INTEGER CHECK (completion_sequence >= 1),
            error_message TEXT,
            created_at TEXT NOT NULL,
            started_at TEXT,
            completed_at TEXT,
            updated_at TEXT NOT NULL,
            UNIQUE (scan_id, id),
            CHECK (kind = 'discovery' OR merge_state = 'none'),
            CHECK (kind = 'discovery' OR completion_sequence IS NULL)
        );

        CREATE UNIQUE INDEX deep_scan_workers_completion_sequence
        ON deep_scan_workers(scan_id, completion_sequence)
        WHERE completion_sequence IS NOT NULL;

        CREATE INDEX deep_scan_workers_by_scan_status
        ON deep_scan_workers(scan_id, status, kind, created_at);

        CREATE TABLE deep_scan_dedup_inputs (
            scan_id TEXT NOT NULL,
            dedup_worker_id TEXT NOT NULL,
            discovery_worker_id TEXT NOT NULL,
            input_order INTEGER NOT NULL CHECK (input_order >= 0),
            PRIMARY KEY (dedup_worker_id, discovery_worker_id),
            UNIQUE (dedup_worker_id, input_order),
            FOREIGN KEY (scan_id, dedup_worker_id)
                REFERENCES deep_scan_workers(scan_id, id) ON DELETE CASCADE,
            FOREIGN KEY (scan_id, discovery_worker_id)
                REFERENCES deep_scan_workers(scan_id, id) ON DELETE CASCADE
        );
        """,
    ),
    (
        12,
        "scan continuation threads",
        """
        ALTER TABLE scans
        ADD COLUMN continuation_thread_id TEXT;
        """,
    ),
    (
        13,
        "scan scope file counts",
        """
        ALTER TABLE scan_progress
        ADD COLUMN scope_file_count INTEGER
            CHECK (scope_file_count >= 0);
        """,
    ),
    (
        14,
        "imported triage results",
        """
        CREATE TABLE triage_results (
            id TEXT PRIMARY KEY,
            repository_path TEXT NOT NULL,
            repository_revision TEXT,
            finding_count INTEGER NOT NULL CHECK (finding_count >= 0),
            result_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX triage_results_by_updated_at
        ON triage_results(updated_at DESC, id);
        """,
    ),
    (
        15,
        "append-only finding decisions",
        """
        CREATE TABLE finding_decisions (
            id TEXT PRIMARY KEY,
            occurrence_id TEXT NOT NULL REFERENCES finding_occurrences(id) ON DELETE CASCADE,
            status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
            close_reason TEXT CHECK (
                close_reason IS NULL OR close_reason IN ('already_fixed', 'wont_fix', 'false_positive')
            ),
            note TEXT,
            created_at TEXT NOT NULL,
            CHECK (
                (status = 'open' AND close_reason IS NULL)
                OR (status = 'closed' AND close_reason IS NOT NULL)
            )
        );

        CREATE INDEX finding_decisions_by_occurrence
        ON finding_decisions(occurrence_id, created_at DESC, id DESC);

        INSERT INTO finding_decisions (
            id, occurrence_id, status, close_reason, note, created_at
        )
        SELECT
            'legacy_' || occurrence_id,
            occurrence_id,
            status,
            close_reason,
            note,
            updated_at
        FROM finding_triage;
        """,
    ),
    (
        16,
        "stable repository targets",
        """
        CREATE TABLE security_targets (
            id TEXT PRIMARY KEY,
            current_path TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        ALTER TABLE workspaces
        ADD COLUMN target_id TEXT REFERENCES security_targets(id);

        ALTER TABLE scans
        ADD COLUMN target_id TEXT REFERENCES security_targets(id);

        CREATE INDEX scans_by_target
        ON scans(target_id, started_at DESC, id);
        """,
    ),
    (
        17,
        "scan target summaries",
        """
        ALTER TABLE scans
        ADD COLUMN target_summary TEXT;
        """,
    ),
    (
        18,
        "clear legacy delivered handoff claims",
        """
        UPDATE scans
        SET handoff_claimed_at = NULL, handoff_claim_token = NULL
        WHERE handoff_status = 'delivered';
        """,
    ),
    (
        19,
        "persist setup workspace preference",
        """
        CREATE TABLE setup_preferences (
            singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
            skip_setup_ui INTEGER NOT NULL CHECK (skip_setup_ui IN (0, 1)),
            updated_at TEXT NOT NULL
        );
        """,
    ),
    (
        20,
        "phase-specific scan progress",
        """
        ALTER TABLE scan_progress
        ADD COLUMN phase_items_total INTEGER NOT NULL DEFAULT 0
            CHECK (phase_items_total >= 0);

        ALTER TABLE scan_progress
        ADD COLUMN phase_items_completed INTEGER NOT NULL DEFAULT 0
            CHECK (phase_items_completed >= 0 AND phase_items_completed <= phase_items_total);

        ALTER TABLE scan_progress
        ADD COLUMN phase_progress_unit TEXT CHECK (
            phase_progress_unit IS NULL OR phase_progress_unit IN (
                'checks',
                'threat_surfaces',
                'review_receipts',
                'candidate_findings',
                'validated_findings',
                'report_artifacts'
            )
        );
        """,
    ),
    (
        21,
        "current scan preflight state",
        """
        ALTER TABLE scan_progress
        ADD COLUMN preflight_issues_json TEXT NOT NULL DEFAULT '[]';

        ALTER TABLE scan_progress
        ADD COLUMN preflight_checks_total INTEGER NOT NULL DEFAULT 0
            CHECK (preflight_checks_total >= 0);

        ALTER TABLE scan_progress
        ADD COLUMN preflight_checks_completed INTEGER NOT NULL DEFAULT 0
            CHECK (
                preflight_checks_completed >= 0
                AND preflight_checks_completed <= preflight_checks_total
            );

        """,
    ),
    (
        22,
        "replayable scan launch recipes",
        """
        ALTER TABLE scans ADD COLUMN recipe_json TEXT;
        ALTER TABLE scans ADD COLUMN parent_scan_id TEXT REFERENCES scans(id) ON DELETE SET NULL;
        """,
    ),
    (
        23,
        "semantic scan comparison matches",
        """
        CREATE TABLE scan_comparisons (
            before_scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
            after_scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
            result_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (before_scan_id, after_scan_id),
            CHECK (before_scan_id != after_scan_id)
        );

        CREATE TABLE scan_comparison_matches (
            before_scan_id TEXT NOT NULL,
            after_scan_id TEXT NOT NULL,
            before_occurrence_id TEXT NOT NULL
                REFERENCES finding_occurrences(id) ON DELETE CASCADE,
            after_occurrence_id TEXT NOT NULL
                REFERENCES finding_occurrences(id) ON DELETE CASCADE,
            reason TEXT NOT NULL,
            PRIMARY KEY (
                before_scan_id, after_scan_id, before_occurrence_id, after_occurrence_id
            ),
            FOREIGN KEY (before_scan_id, after_scan_id)
                REFERENCES scan_comparisons(before_scan_id, after_scan_id) ON DELETE CASCADE
        );

        CREATE INDEX scan_comparison_matches_by_before_occurrence
        ON scan_comparison_matches(before_occurrence_id);

        CREATE INDEX scan_comparison_matches_by_after_occurrence
        ON scan_comparison_matches(after_occurrence_id);
        """,
    ),
    (
        24,
        "persist scan cost estimates",
        """
        ALTER TABLE scans ADD COLUMN cost_json TEXT;
        """,
    ),
    (
        25,
        "persist scan model settings",
        """
        ALTER TABLE scans ADD COLUMN model TEXT;
        ALTER TABLE scans ADD COLUMN reasoning_effort TEXT;
        """,
    ),
    (
        26,
        "persist scan completion warnings",
        """
        ALTER TABLE scans
        ADD COLUMN completion_warnings_json TEXT NOT NULL DEFAULT '[]';
        """,
    ),
    (
        27,
        "persist deep scan consecutive discovery failures",
        """
        ALTER TABLE deep_scan_runs
        ADD COLUMN stop_after_consecutive_errors INTEGER NOT NULL DEFAULT 1
            CHECK (stop_after_consecutive_errors >= 1);

        ALTER TABLE deep_scan_runs
        ADD COLUMN consecutive_errors INTEGER NOT NULL DEFAULT 0
            CHECK (consecutive_errors >= 0);

        UPDATE deep_scan_runs
        SET stop_after_consecutive_errors = stop_after_no_new;
        """,
    ),
    (
        28,
        "persist deep scan discovery time limit",
        """
        ALTER TABLE deep_scan_runs
        ADD COLUMN max_time_hours REAL NOT NULL DEFAULT 96;
        """,
    ),
    (
        29,
        "freeze stopped scan source digests",
        """
        ALTER TABLE scans ADD COLUMN retained_source_digests_json TEXT;
        """,
    ),
    (
        30,
        "separate deep scan publication failures",
        """
        ALTER TABLE deep_scan_runs ADD COLUMN publication_error_message TEXT;
        """,
    ),
)

def apply_migrations(
    connection: sqlite3.Connection,
    migrations: tuple[tuple[int, str, str], ...],
    now: Callable[[], str],
    backfill_security_targets: Callable[[sqlite3.Connection], None],
) -> None:
    connection.commit()
    connection.execute("BEGIN IMMEDIATE")
    try:
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
            if version in applied:
                if version == 2:
                    add_column_if_missing(
                        connection, "workspaces", "capability_preflight_json", "TEXT"
                    )
                elif version == 6:
                    repair_thread_scoped_workspaces_migration(connection)
                elif version == 11:
                    repair_deep_scan_migration(connection)
                elif version == 12:
                    add_column_if_missing(connection, "scans", "continuation_thread_id", "TEXT")
                elif version == 13:
                    add_column_if_missing(
                        connection,
                        "scan_progress",
                        "scope_file_count",
                        "INTEGER CHECK (scope_file_count >= 0)",
                    )
                elif version == 16:
                    should_backfill_targets = repair_stable_targets_migration(connection)
                elif version == 26:
                    add_column_if_missing(
                        connection,
                        "scans",
                        "completion_warnings_json",
                        "TEXT NOT NULL DEFAULT '[]'",
                    )
                elif version == 28:
                    add_column_if_missing(
                        connection,
                        "deep_scan_runs",
                        "max_time_hours",
                        "REAL NOT NULL DEFAULT 96",
                    )
                elif version == 29:
                    add_column_if_missing(
                        connection,
                        "scans",
                        "retained_source_digests_json",
                        "TEXT",
                    )
                elif version == 30:
                    add_column_if_missing(
                        connection,
                        "deep_scan_runs",
                        "publication_error_message",
                        "TEXT",
                    )
                continue
            if version == 6:
                repair_thread_scoped_workspaces_migration(connection)
            elif version == 16:
                should_backfill_targets = repair_stable_targets_migration(connection)
            else:
                for statement in sql_statements(sql):
                    connection.execute(statement)
            connection.execute(
                "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
                (version, name, now()),
            )
        if 27 in applied:
            repair_deep_scan_failure_counter_migration(connection)
        if should_backfill_targets:
            backfill_security_targets(connection)
        connection.commit()
    except BaseException:
        connection.rollback()
        raise

def normalize_pre_release_execution_profile_migrations(
    connection: sqlite3.Connection, timestamp: str
) -> None:
    scan_columns = {row["name"] for row in connection.execute("PRAGMA table_info(scans)")}
    workspace_columns = {row["name"] for row in connection.execute("PRAGMA table_info(workspaces)")}
    legacy_columns = {"execution_model", "reasoning_effort"}
    renamed_columns = {"legacy_execution_model", "legacy_reasoning_effort"}
    has_legacy_columns = "execution_model" in scan_columns | workspace_columns
    if not has_legacy_columns:
        return
    execution_migrations = {
        row["version"]: row["name"]
        for row in connection.execute(
            "SELECT version, name FROM schema_migrations WHERE version IN (11, 12)"
        )
    }
    supported_execution_migrations = {
        11: {"deep scan orchestration state", "scan execution profiles"},
        12: {
            "scan continuation threads",
            "scan execution profiles",
            "dynamic scan execution profiles",
        },
    }
    if any(
        name not in supported_execution_migrations[version]
        for version, name in execution_migrations.items()
    ):
        raise SystemExit(
            "The Codex Security database has an unsupported execution-profile migration history."
        )
    if not (
        legacy_columns <= scan_columns
        and legacy_columns <= workspace_columns
        and not renamed_columns.intersection(scan_columns | workspace_columns)
    ):
        raise SystemExit("The Codex Security database has an unsupported execution-profile schema.")

    for table in ("workspaces", "scans"):
        connection.execute(
            f"ALTER TABLE {table} RENAME COLUMN execution_model TO legacy_execution_model"
        )
        connection.execute(
            f"ALTER TABLE {table} RENAME COLUMN reasoning_effort TO legacy_reasoning_effort"
        )
    add_column_if_missing(connection, "scans", "model", "TEXT")
    add_column_if_missing(connection, "scans", "reasoning_effort", "TEXT")
    connection.execute(
        """
        UPDATE scans
        SET model = COALESCE(model, legacy_execution_model),
            reasoning_effort = COALESCE(reasoning_effort, legacy_reasoning_effort)
        """
    )

    model_migration = connection.execute(
        "SELECT name FROM schema_migrations WHERE version = 25"
    ).fetchone()
    if model_migration is None:
        connection.execute(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
            (25, "persist scan model settings", timestamp),
        )
    elif model_migration["name"] == "dynamic scan execution profiles":
        connection.execute(
            "UPDATE schema_migrations SET name = ? WHERE version = 25 AND name = ?",
            ("persist scan model settings", "dynamic scan execution profiles"),
        )
    elif model_migration["name"] != "persist scan model settings":
        raise SystemExit(
            "The Codex Security database has an unsupported execution-profile migration history."
        )
    for version, name in (
        (11, "scan execution profiles"),
        (12, "scan execution profiles"),
        (12, "dynamic scan execution profiles"),
    ):
        connection.execute(
            "DELETE FROM schema_migrations WHERE version = ? AND name = ?",
            (version, name),
        )

def normalize_pre_release_migrations(connection: sqlite3.Connection, timestamp: str) -> None:
    completion_warning_migration = connection.execute(
        "SELECT name FROM schema_migrations WHERE version = 25"
    ).fetchone()
    if (
        completion_warning_migration is not None
        and completion_warning_migration["name"] == "persist scan completion warnings"
    ):
        if (
            connection.execute("SELECT 1 FROM schema_migrations WHERE version = 26").fetchone()
            is not None
        ):
            raise SystemExit(
                "The Codex Security database has an unsupported pre-release migration history."
            )
        connection.execute(
            "UPDATE schema_migrations SET version = 26 WHERE version = 25 AND name = ?",
            ("persist scan completion warnings",),
        )

    phase_progress_migration = connection.execute(
        "SELECT name FROM schema_migrations WHERE version = 12"
    ).fetchone()
    if (
        phase_progress_migration is not None
        and phase_progress_migration["name"] == "phase-specific scan progress"
    ):
        target_migration = connection.execute(
            "SELECT name FROM schema_migrations WHERE version = 20"
        ).fetchone()
        if target_migration is not None:
            raise SystemExit(
                "The Codex Security database has an unsupported pre-release migration history."
            )
        connection.execute(
            "UPDATE schema_migrations SET version = 20 WHERE version = 12 AND name = ?",
            ("phase-specific scan progress",),
        )

    normalize_pre_release_execution_profile_migrations(connection, timestamp)

    preflight_progress_migration = connection.execute(
        "SELECT name FROM schema_migrations WHERE version = 13"
    ).fetchone()
    if (
        preflight_progress_migration is not None
        and preflight_progress_migration["name"] == "current scan preflight state"
    ):
        target_migration = connection.execute(
            "SELECT name FROM schema_migrations WHERE version = 21"
        ).fetchone()
        if target_migration is not None:
            raise SystemExit(
                "The Codex Security database has an unsupported pre-release migration history."
            )
        connection.execute(
            "UPDATE schema_migrations SET version = 21 WHERE version = 13 AND name = ?",
            ("current scan preflight state",),
        )

    delivered_claim_migration = connection.execute(
        "SELECT name FROM schema_migrations WHERE version = 18"
    ).fetchone()
    if (
        delivered_claim_migration is not None
        and delivered_claim_migration["name"] == "scan target summaries"
    ):
        connection.execute(
            "UPDATE scans SET handoff_claimed_at = NULL, handoff_claim_token = NULL "
            "WHERE handoff_status = 'delivered'"
        )
        connection.execute(
            "UPDATE schema_migrations SET name = ? WHERE version = 18 AND name = ?",
            ("clear legacy delivered handoff claims", "scan target summaries"),
        )

    setup_preferences_migration = connection.execute(
        "SELECT name FROM schema_migrations WHERE version = 19"
    ).fetchone()
    legacy_setup_preferences_migrations = {
        "structured scan guidance context",
        "idempotent scan lifecycle requests",
    }
    if (
        setup_preferences_migration is not None
        and setup_preferences_migration["name"] in legacy_setup_preferences_migrations
    ):
        migration_sql = next(sql for version, _, sql in MIGRATIONS if version == 19)
        for statement in sql_statements(migration_sql):
            connection.execute(statement.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ", 1))
        connection.execute(
            "UPDATE schema_migrations SET name = ? WHERE version = 19 AND name = ?",
            ("persist setup workspace preference", setup_preferences_migration["name"]),
        )

    phase_progress_migration = connection.execute(
        "SELECT name FROM schema_migrations WHERE version = 20"
    ).fetchone()
    legacy_phase_progress_migrations = {
        "retain superseded scan lifecycle requests",
        "threat model publication receipts",
    }
    if (
        phase_progress_migration is not None
        and phase_progress_migration["name"] in legacy_phase_progress_migrations
    ):
        add_column_if_missing(
            connection,
            "scan_progress",
            "phase_items_total",
            "INTEGER NOT NULL DEFAULT 0 CHECK (phase_items_total >= 0)",
        )
        add_column_if_missing(
            connection,
            "scan_progress",
            "phase_items_completed",
            "INTEGER NOT NULL DEFAULT 0 "
            "CHECK (phase_items_completed >= 0 AND phase_items_completed <= phase_items_total)",
        )
        add_column_if_missing(
            connection,
            "scan_progress",
            "phase_progress_unit",
            "TEXT CHECK (phase_progress_unit IS NULL OR phase_progress_unit IN ("
            "'checks', 'threat_surfaces', 'review_receipts', 'candidate_findings', "
            "'validated_findings', 'report_artifacts'))",
        )
        connection.execute(
            "UPDATE schema_migrations SET name = ? WHERE version = 20 AND name = ?",
            ("phase-specific scan progress", phase_progress_migration["name"]),
        )

    preflight_progress_migration = connection.execute(
        "SELECT name FROM schema_migrations WHERE version = 21"
    ).fetchone()
    legacy_preflight_progress_migrations = {
        "scan progress projection and activity",
        "deep coordinator manifest receipts",
    }
    if (
        preflight_progress_migration is not None
        and preflight_progress_migration["name"] in legacy_preflight_progress_migrations
    ):
        add_column_if_missing(
            connection,
            "scan_progress",
            "preflight_issues_json",
            "TEXT NOT NULL DEFAULT '[]'",
        )
        add_column_if_missing(
            connection,
            "scan_progress",
            "preflight_checks_total",
            "INTEGER NOT NULL DEFAULT 0 CHECK (preflight_checks_total >= 0)",
        )
        add_column_if_missing(
            connection,
            "scan_progress",
            "preflight_checks_completed",
            "INTEGER NOT NULL DEFAULT 0 CHECK (preflight_checks_completed >= 0 "
            "AND preflight_checks_completed <= preflight_checks_total)",
        )
        connection.execute(
            "UPDATE schema_migrations SET name = ? WHERE version = 21 AND name = ?",
            ("current scan preflight state", preflight_progress_migration["name"]),
        )

    scan_recipe_migration = connection.execute(
        "SELECT name FROM schema_migrations WHERE version = 22"
    ).fetchone()
    if (
        scan_recipe_migration is not None
        and scan_recipe_migration["name"] == "dynamic scan execution profiles"
    ):
        add_column_if_missing(connection, "scans", "recipe_json", "TEXT")
        add_column_if_missing(
            connection,
            "scans",
            "parent_scan_id",
            "TEXT REFERENCES scans(id) ON DELETE SET NULL",
        )
        connection.execute(
            "UPDATE schema_migrations SET name = ? WHERE version = 22 AND name = ?",
            ("replayable scan launch recipes", "dynamic scan execution profiles"),
        )

    migration = connection.execute(
        "SELECT name FROM schema_migrations WHERE version = 2"
    ).fetchone()
    if migration is None or migration["name"] != "finding management schema":
        return

    legacy_versions = {
        row["version"]: row["name"]
        for row in connection.execute(
            "SELECT version, name FROM schema_migrations WHERE version BETWEEN 2 AND 5"
        )
    }
    expected = {
        2: "finding management schema",
        3: "scan handoff delivery claims",
        4: "finding remediation action claims",
        5: "scan target snapshot digests",
    }
    for version, name in legacy_versions.items():
        if expected.get(version) != name:
            raise SystemExit(
                "The Codex Security database has an unsupported pre-release migration history."
            )

    connection.execute(
        "DELETE FROM schema_migrations WHERE version = 5 AND name = ?",
        (expected[5],),
    )
    for old_version, new_version in ((4, 5), (3, 4), (2, 3)):
        connection.execute(
            "UPDATE schema_migrations SET version = ? WHERE version = ? AND name = ?",
            (new_version, old_version, expected[old_version]),
        )
    add_column_if_missing(connection, "workspaces", "capability_preflight_json", "TEXT")
    add_column_if_missing(connection, "scans", "target_snapshot_digest", "TEXT")
    connection.execute(
        "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
        (2, "persist capability preflight summaries", timestamp),
    )

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

    if owner_column_missing:
        add_column_if_missing(connection, "scans", "deep_scan_owner_thread_id", "TEXT")
    migration_sql = next(sql for version, _, sql in MIGRATIONS if version == 11)
    for statement in sql_statements(migration_sql):
        if statement.startswith("ALTER TABLE scans"):
            continue
        if statement.startswith("UPDATE scans") and not owner_column_missing:
            continue
        for prefix in ("CREATE UNIQUE INDEX ", "CREATE INDEX ", "CREATE TABLE "):
            if statement.startswith(prefix):
                statement = statement.replace(prefix, f"{prefix}IF NOT EXISTS ", 1)
                break
        connection.execute(statement)
        if statement.startswith("UPDATE scans") and "continuation_thread_id" in scan_columns:
            connection.execute(
                "UPDATE scans SET deep_scan_owner_thread_id = continuation_thread_id "
                "WHERE mode = 'deep' AND status = 'running' "
                "AND continuation_thread_id IS NOT NULL"
            )

def repair_deep_scan_failure_counter_migration(connection: sqlite3.Connection) -> None:
    columns = {row["name"] for row in connection.execute("PRAGMA table_info(deep_scan_runs)")}
    threshold_missing = "stop_after_consecutive_errors" not in columns
    add_column_if_missing(
        connection,
        "deep_scan_runs",
        "stop_after_consecutive_errors",
        "INTEGER NOT NULL DEFAULT 1 CHECK (stop_after_consecutive_errors >= 1)",
    )
    if threshold_missing:
        connection.execute(
            "UPDATE deep_scan_runs SET stop_after_consecutive_errors = stop_after_no_new"
        )
    add_column_if_missing(
        connection,
        "deep_scan_runs",
        "consecutive_errors",
        "INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_errors >= 0)",
    )

def repair_thread_scoped_workspaces_migration(connection: sqlite3.Connection) -> None:
    add_column_if_missing(connection, "workspaces", "thread_id", "TEXT")
    connection.execute(
        "CREATE INDEX IF NOT EXISTS workspaces_by_thread_and_updated_at "
        "ON workspaces(thread_id, updated_at DESC)"
    )

def repair_stable_targets_migration(connection: sqlite3.Connection) -> bool:
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
        return False

    migration_sql = next(sql for version, _, sql in MIGRATIONS if version == 16)
    for statement in sql_statements(migration_sql):
        if statement.startswith("ALTER TABLE workspaces"):
            add_column_if_missing(
                connection,
                "workspaces",
                "target_id",
                "TEXT REFERENCES security_targets(id)",
            )
            continue
        if statement.startswith("ALTER TABLE scans"):
            add_column_if_missing(
                connection,
                "scans",
                "target_id",
                "TEXT REFERENCES security_targets(id)",
            )
            continue
        statement = statement.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ", 1)
        statement = statement.replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS ", 1)
        connection.execute(statement)
    connection.execute(
        """
        UPDATE scans
        SET target_id = NULL
        WHERE target_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM security_targets WHERE security_targets.id = scans.target_id
            )
        """
    )
    return True

def add_column_if_missing(
    connection: sqlite3.Connection, table: str, column: str, definition: str
) -> None:
    columns = {row["name"] for row in connection.execute(f"PRAGMA table_info({table})")}
    if column not in columns:
        connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

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

def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()

if __name__ == "__main__":
    main()
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

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from workbench_target import clean_worktree_content_digest, git_bytes

CONTEXT_LINES = 3
MAX_BYTES = 16_000
MAX_LINES = 60

def finding_source_excerpt(
    scan: sqlite3.Row,
    target: Path | None,
    locations: list[dict[str, Any]],
) -> str | None:
    if target is None or not locations:
        return None
    location = next(
        (
            candidate
            for candidate in locations
            if "root_control" in str(candidate.get("role") or "").lower()
        ),
        locations[0],
    )
    path = location.get("path")
    start_line = location.get("startLine")
    end_line = location.get("endLine")
    if not isinstance(path, str) or not isinstance(start_line, int):
        return None
    source = scanned_source_text(scan, target, path)
    if not source or "\0" in source:
        return None
    lines = source.splitlines()
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
    encoded = excerpt.encode("utf-8")[:MAX_BYTES]
    return encoded.decode("utf-8", errors="ignore")

def scanned_source_text(scan: sqlite3.Row, target: Path, path: str) -> str | None:
    if safe_source_path(target, path) is None:
        return None
    revision = scan["target_revision"]
    if revision == "unversioned":
        return None
    snapshot_digest = scan["target_snapshot_digest"]
    if snapshot_digest is not None and snapshot_digest != clean_worktree_content_digest():
        return None
    object_name = f"{revision}:{path}"
    content = git_bytes(target, "cat-file", "blob", object_name)
    return content.decode("utf-8", errors="replace") if content is not None else None

def safe_source_path(target: Path, relative_path: str) -> Path | None:
    if "\\" in relative_path:
        return None
    parsed = PurePosixPath(relative_path)
    if parsed.is_absolute() or ".." in parsed.parts:
        return None
    try:
        path = (target / parsed.as_posix()).resolve()
        path.relative_to(target)
    except (OSError, RuntimeError, ValueError):
        return None
    return path

def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()

if __name__ == "__main__":
    main()
```

## File: `scripts/workbench_target.py`

```python
"""Target inspection and content-integrity helpers for the security workbench."""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import sqlite3
import stat
import subprocess
import sys
from pathlib import Path
from typing import Any

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from filesystem_identity import stored_filesystem_identity_matches
from workbench_constants import GIT_REPOSITORY_ENVIRONMENT

def git_output(
    target: Path,
    *args: str,
    git_dir: Path | None = None,
    work_tree: Path | None = None,
) -> str | None:
    completed = git_command(target, *args, text=True, git_dir=git_dir, work_tree=work_tree)
    output = completed.stdout.strip()
    return output if completed.returncode == 0 and output else None

def git_bytes(
    target: Path,
    *args: str,
    git_dir: Path | None = None,
    work_tree: Path | None = None,
) -> bytes | None:
    completed = git_command(target, *args, text=False, git_dir=git_dir, work_tree=work_tree)
    return completed.stdout if completed.returncode == 0 else None

def git_command(
    target: Path,
    *args: str,
    text: bool,
    git_dir: Path | None = None,
    work_tree: Path | None = None,
) -> subprocess.CompletedProcess[str] | subprocess.CompletedProcess[bytes]:
    if (git_dir is None) != (work_tree is None):
        raise ValueError("git_dir and work_tree must be provided together")
    environment = os.environ.copy()
    for name in GIT_REPOSITORY_ENVIRONMENT:
        environment.pop(name, None)
    environment["GIT_LITERAL_PATHSPECS"] = "1"
    # Repository-local config is untrusted; fsmonitor may name an executable hook.
    command = [
        "git",
        "-c",
        "core.fsmonitor=false",
        "-c",
        "i18n.logOutputEncoding=UTF-8",
        "-C",
        str(target),
    ]
    if git_dir is not None and work_tree is not None:
        command.extend(["--git-dir", str(git_dir), "--work-tree", str(work_tree)])
    full_command = [*command, *args]
    try:
        return subprocess.run(
            full_command,
            check=False,
            capture_output=True,
            env=environment,
            text=text,
        )
    except FileNotFoundError:
        # Git is optional for Codebase scans. Treat an unavailable executable like
        # any other failed Git probe so the target falls back to a directory snapshot.
        empty_output = "" if text else b""
        return subprocess.CompletedProcess(full_command, 127, empty_output, empty_output)

def update_digest_field(digest: Any, label: bytes, value: bytes) -> None:
    digest.update(len(label).to_bytes(4, "big"))
    digest.update(label)
    digest.update(len(value).to_bytes(8, "big"))
    digest.update(value)

def worktree_content_digest(target: Path) -> str:
    require_clean_submodule_worktrees(target)
    repository, pathspec = git_worktree_context(target)
    return worktree_content_digest_for_context(repository, pathspec)

def remediation_checkout_snapshot(
    scan: sqlite3.Row, *, expected_revision: str | None = None
) -> tuple[str, str | None]:
    target = require_scan_target_identity(scan)
    revision = git_revision(target)
    required_revision = expected_revision or scan["target_revision"]
    if revision != required_revision:
        raise SystemExit(
            "Repository HEAD changed. Regenerate the remediation patch against the current checkout."
        )
    content_digest = (
        worktree_content_digest(target)
        if revision != "unversioned"
        else directory_content_digest(target, excluded=(Path(scan["scan_dir"]),))
    )
    return revision, content_digest

def worktree_content_digest_for_context(
    repository: Path,
    pathspec: str,
    *,
    git_dir: Path | None = None,
    work_tree: Path | None = None,
) -> str:
    tracked = git_bytes(
        repository,
        "diff",
        "--binary",
        "--full-index",
        "--no-ext-diff",
        "--no-textconv",
        "--ignore-submodules=none",
        "HEAD",
        "--",
        pathspec,
        git_dir=git_dir,
        work_tree=work_tree,
    )
    untracked = git_bytes(
        repository,
        "ls-files",
        "--others",
        "--exclude-standard",
        "-z",
        "--",
        pathspec,
        git_dir=git_dir,
        work_tree=work_tree,
    )
    if tracked is None or untracked is None:
        raise SystemExit("Could not snapshot the selected working-tree changes.")
    digest = hashlib.sha256()
    update_digest_field(digest, b"format", b"codex-security-snapshot/v1")
    update_digest_field(digest, b"tracked-diff", tracked)
    for raw_path in sorted(path for path in untracked.split(b"\0") if path):
        relative_path = os.fsdecode(raw_path)
        path = (work_tree or repository) / relative_path
        try:
            metadata = path.lstat()
        except OSError as exc:
            raise SystemExit(f"Could not read untracked file: {relative_path}") from exc
        update_digest_field(digest, b"untracked-path", raw_path)
        update_digest_field(
            digest,
            b"untracked-mode",
            str(stat.S_IMODE(metadata.st_mode)).encode(),
        )
        if stat.S_ISLNK(metadata.st_mode):
            update_digest_field(digest, b"untracked-kind", b"symlink")
            update_digest_field(
                digest,
                b"untracked-content",
                os.fsencode(os.readlink(path)),
            )
        elif stat.S_ISDIR(metadata.st_mode):
            update_digest_field(digest, b"untracked-kind", b"directory")
            update_digest_field(
                digest,
                b"untracked-content",
                directory_content_digest(path.resolve()).encode(),
            )
        elif stat.S_ISREG(metadata.st_mode):
            content_digest = hashlib.sha256()
            content_size = 0
            try:
                with path.open("rb") as handle:
                    for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                        content_digest.update(chunk)
                        content_size += len(chunk)
            except OSError as exc:
                raise SystemExit(f"Could not read untracked file: {relative_path}") from exc
            update_digest_field(digest, b"untracked-kind", b"file")
            update_digest_field(
                digest,
                b"untracked-size",
                str(content_size).encode(),
            )
            update_digest_field(
                digest,
                b"untracked-content-sha256",
                content_digest.digest(),
            )
        else:
            raise SystemExit(f"Unsupported untracked file type: {relative_path}")
    return f"codex-security-snapshot/v1:sha256:{digest.hexdigest()}"

def git_worktree_context(target: Path) -> tuple[Path, str]:
    root = git_output(target, "rev-parse", "--show-toplevel")
    if root is None:
        raise SystemExit("Could not inspect the selected Git working tree.")
    repository = Path(root).resolve()
    try:
        relative = target.resolve().relative_to(repository)
    except ValueError as exc:
        raise SystemExit("Scan target must stay inside its Git working tree.") from exc
    return repository, relative.as_posix() or "."

def git_submodule_entries(target: Path) -> tuple[tuple[Path, str], ...]:
    repository, pathspec = git_worktree_context(target)
    staged = git_bytes(repository, "ls-files", "--stage", "-z", "--", pathspec)
    if staged is None:
        raise SystemExit("Could not inspect Git submodules in the selected working tree.")
    entries = []
    for record in (item for item in staged.split(b"\0") if item):
        try:
            metadata, raw_path = record.split(b"\t", 1)
            mode, object_id, _ = metadata.split(b" ", 2)
        except ValueError as exc:
            raise SystemExit(
                "Could not inspect Git submodules in the selected working tree."
            ) from exc
        if mode != b"160000":
            continue
        entries.append((repository / os.fsdecode(raw_path), object_id.decode("ascii")))
    return tuple(entries)

def git_submodule_paths(target: Path) -> tuple[Path, ...]:
    return tuple(path for path, _ in git_submodule_entries(target))

def require_clean_submodule_worktrees(target: Path) -> None:
    for submodule, expected_revision in git_submodule_entries(target):
        relative_path = str(submodule.relative_to(target))
        if not submodule.exists():
            continue
        try:
            (submodule / ".git").lstat()
        except FileNotFoundError:
            continue
        root = git_output(submodule, "rev-parse", "--show-toplevel")
        try:
            is_initialized = root is not None and Path(root).resolve() == submodule.resolve()
        except OSError:
            is_initialized = False
        if not is_initialized:
            raise SystemExit(
                f"Could not inspect initialized Git submodule contents: {relative_path}"
            )
        if git_output(submodule, "rev-parse", "HEAD") != expected_revision:
            raise SystemExit(
                "Initialized Git submodules must be checked out at the revision recorded "
                f"by the parent repository: {relative_path}"
            )
        status = git_bytes(
            submodule,
            "status",
            "--porcelain=v1",
            "-z",
            "--untracked-files=all",
            "--ignore-submodules=none",
        )
        if status is None:
            raise SystemExit(f"Could not inspect Git submodule contents: {relative_path}")
        if status:
            raise SystemExit(
                f"Dirty Git submodules are not supported for remediation integrity checks: {relative_path}"
            )
        require_clean_submodule_worktrees(submodule)

def clean_worktree_content_digest() -> str:
    digest = hashlib.sha256()
    update_digest_field(digest, b"format", b"codex-security-snapshot/v1")
    update_digest_field(digest, b"tracked-diff", b"")
    return f"codex-security-snapshot/v1:sha256:{digest.hexdigest()}"

def git_directory_snapshot_paths(target: Path) -> list[Path] | None:
    repository_root = git_output(target, "rev-parse", "--show-toplevel")
    if repository_root is None:
        return None
    repository, pathspec = git_worktree_context(target)
    listed = git_bytes(
        repository,
        "ls-files",
        "--cached",
        "--others",
        "--exclude-standard",
        "-z",
        "--",
        pathspec,
    )
    if listed is None:
        raise SystemExit("Could not inspect files in the selected Git working tree.")
    paths: list[Path] = []
    for raw_path in (raw_path for raw_path in listed.split(b"\0") if raw_path):
        path = repository / os.fsdecode(raw_path)
        try:
            metadata = path.lstat()
        except FileNotFoundError:
            # The index can retain a path that was staged and then deleted.
            continue
        paths.append(path)
        if not stat.S_ISDIR(metadata.st_mode):
            continue
        nested_repository_root = git_output(path, "rev-parse", "--show-toplevel")
        if (
            nested_repository_root is not None
            and Path(nested_repository_root).resolve() == path.resolve()
        ):
            nested_paths = git_directory_snapshot_paths(path)
            if nested_paths is not None:
                paths.extend(nested_paths)
                continue
        paths.extend(
            nested_path
            for nested_path in path.rglob("*")
            if ".git" not in nested_path.relative_to(path).parts
        )
    return sorted(set(paths))

def directory_content_digest(target: Path, *, excluded: tuple[Path, ...] = ()) -> str:
    excluded_relative = []
    for path in excluded:
        try:
            excluded_relative.append(path.relative_to(target))
        except ValueError:
            continue
    paths = git_directory_snapshot_paths(target)
    if paths is None:
        paths = sorted(target.rglob("*"))
    digest = hashlib.sha256()
    update_digest_field(digest, b"format", b"codex-security-directory/v1")
    for path in paths:
        relative_path = path.relative_to(target)
        if any(
            relative_path == excluded_path or excluded_path in relative_path.parents
            for excluded_path in excluded_relative
        ):
            continue
        try:
            metadata = path.lstat()
        except OSError as exc:
            raise SystemExit(f"Could not read local file: {relative_path}") from exc
        raw_path = os.fsencode(relative_path.as_posix())
        update_digest_field(digest, b"path", raw_path)
        update_digest_field(digest, b"mode", str(stat.S_IMODE(metadata.st_mode)).encode())
        if stat.S_ISLNK(metadata.st_mode):
            update_digest_field(digest, b"kind", b"symlink")
            update_digest_field(digest, b"content", os.fsencode(os.readlink(path)))
        elif stat.S_ISDIR(metadata.st_mode):
            update_digest_field(digest, b"kind", b"directory")
        elif stat.S_ISREG(metadata.st_mode):
            content_digest = hashlib.sha256()
            content_size = 0
            try:
                with path.open("rb") as handle:
                    for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                        content_digest.update(chunk)
                        content_size += len(chunk)
            except OSError as exc:
                raise SystemExit(f"Could not read local file: {relative_path}") from exc
            update_digest_field(digest, b"kind", b"file")
            update_digest_field(digest, b"size", str(content_size).encode())
            update_digest_field(digest, b"content-sha256", content_digest.digest())
        else:
            raise SystemExit(f"Unsupported local file type: {relative_path}")
    return f"codex-security-snapshot/v1:sha256:{digest.hexdigest()}"

def directory_snapshot_regular_file_count(target: Path) -> int:
    paths = git_directory_snapshot_paths(target)
    if paths is None:
        paths = sorted(target.rglob("*"))
    count = 0
    for path in paths:
        try:
            metadata = path.lstat()
        except OSError as exc:
            raise SystemExit(f"Could not inspect local file: {path.relative_to(target)}") from exc
        if stat.S_ISREG(metadata.st_mode):
            count += 1
    return count

def copy_directory_excluding(source: Path, destination: Path, excluded: tuple[Path, ...]) -> None:
    excluded_relative = []
    for path in excluded:
        try:
            excluded_relative.append(path.relative_to(source))
        except ValueError:
            continue

    def ignored(directory: str, names: list[str]) -> list[str]:
        relative = Path(directory).relative_to(source)
        return [
            path.name
            for path in excluded_relative
            if path.parent == relative and path.name in names
        ]

    shutil.copytree(source, destination, symlinks=True, ignore=ignored)

def copy_git_worktree_files(source: Path, destination: Path, excluded: tuple[Path, ...]) -> Path:
    repository, pathspec = git_worktree_context(source)
    listed = git_bytes(
        repository,
        "ls-files",
        "--cached",
        "--others",
        "--exclude-standard",
        "-z",
        "--",
        pathspec,
    )
    if listed is None:
        raise SystemExit("Could not inspect files in the selected Git working tree.")
    excluded_relative = []
    for path in excluded:
        try:
            excluded_relative.append(path.relative_to(repository))
        except ValueError:
            continue
    destination.mkdir()
    for raw_path in sorted(path for path in listed.split(b"\0") if path):
        relative = Path(os.fsdecode(raw_path))
        if any(
            relative == excluded_path or excluded_path in relative.parents
            for excluded_path in excluded_relative
        ):
            continue
        source_path = repository / relative
        try:
            metadata = source_path.lstat()
        except FileNotFoundError:
            continue
        destination_path = destination / relative
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        if stat.S_ISLNK(metadata.st_mode):
            destination_path.symlink_to(os.readlink(source_path))
        elif stat.S_ISREG(metadata.st_mode):
            shutil.copy2(source_path, destination_path, follow_symlinks=False)
        elif stat.S_ISDIR(metadata.st_mode):
            nested_git_dir = git_output(source_path, "rev-parse", "--absolute-git-dir")
            if nested_git_dir is None:
                raise SystemExit(f"Could not inspect nested Git working tree: {relative}")
            copy_git_worktree_files(source_path, destination_path, excluded)
            (destination_path / ".git").write_text(f"gitdir: {nested_git_dir}\n")
        else:
            raise SystemExit(f"Unsupported Git working-tree file type: {relative}")
    copied_target = destination if pathspec == "." else destination / pathspec
    copied_target.mkdir(parents=True, exist_ok=True)
    return copied_target

def git_revision(target: Path) -> str:
    return git_output(target, "rev-parse", "HEAD") or "unversioned"

def git_target_metadata(target: Path) -> dict[str, Any]:
    is_git = git_output(target, "rev-parse", "--git-dir") is not None
    is_worktree = git_output(target, "rev-parse", "--is-inside-work-tree") == "true"
    revision = git_output(target, "rev-parse", "--verify", "HEAD")
    repository_root = git_output(target, "rev-parse", "--show-toplevel") if is_worktree else None
    supported = (
        is_git
        and is_worktree
        and revision is not None
        and repository_root is not None
        and Path(repository_root).resolve() == target
    )
    metadata: dict[str, Any] = {
        "hasHead": revision is not None,
        "isGit": is_git,
        "isWorktree": is_worktree,
        "reviewChangesSupported": supported,
    }
    if not is_git:
        return metadata
    branch = git_output(target, "symbolic-ref", "--quiet", "--short", "HEAD")
    metadata.update({"branch": branch, "detachedHead": revision is not None and branch is None})
    if revision is not None:
        subject = git_bytes(target, "show", "-s", "--format=%s", "HEAD")
        metadata.update(
            {
                "commitSubject": (subject or b"").decode("utf-8").strip() or None,
                "revision": revision,
                "shortRevision": revision[:7],
            }
        )
    return metadata

def require_remediation_target(value: str) -> Path:
    stored = Path(value).expanduser()
    if not stored.is_absolute():
        raise SystemExit("Remediation target must be an absolute local directory path.")
    try:
        resolved = stored.resolve(strict=True)
    except (FileNotFoundError, OSError) as exc:
        raise SystemExit(
            "Remediation is unavailable because the selected checkout is no longer accessible."
        ) from exc
    if resolved != stored or not stored.is_dir():
        raise SystemExit(
            "Remediation is unavailable because the selected checkout path was replaced. Start a new scan."
        )
    return stored

def require_scan_target_identity(scan: sqlite3.Row) -> Path:
    target = require_remediation_target(scan["target_path"])
    expected_inode = scan["target_inode"]
    if expected_inode is None:
        raise SystemExit(
            "Remediation is unavailable because this scan does not record checkout identity. "
            "Start a new scan."
        )
    try:
        metadata = target.stat()
    except OSError as exc:
        raise SystemExit(
            "Remediation is unavailable because the selected checkout is no longer accessible."
        ) from exc
    if not stored_filesystem_identity_matches(expected_inode, metadata.st_ino):
        raise SystemExit(
            "Remediation is unavailable because the selected checkout path was replaced. "
            "Start a new scan."
        )
    return target

def require_git_worktree_head(target: Path) -> str:
    metadata = git_target_metadata(target)
    if not metadata["isGit"] or not metadata["isWorktree"] or not metadata["hasHead"]:
        raise SystemExit("Review changes requires a non-bare Git worktree with a resolvable HEAD.")
    return str(metadata["revision"])

def scan_target_warning(scan: sqlite3.Row) -> str | None:
    if scan["diff_target_kind"] != "working_tree" and not scan["target_snapshot_digest"]:
        return None
    try:
        target = require_scan_target_identity(scan)
        if scan["target_revision"] == "unversioned":
            if (
                directory_content_digest(target, excluded=(Path(scan["scan_dir"]),))
                != scan["target_snapshot_digest"]
            ):
                return (
                    "Directory contents changed while the scan was running; "
                    "results were saved for the original snapshot."
                )
            return None
        if git_revision(target) == "unversioned":
            return (
                "The scanned Git repository became unavailable while the scan was running; "
                "results were saved for the original revision."
            )
        working_tree = scan["diff_target_kind"] == "working_tree"
        expected_head = scan["diff_head_revision"] if working_tree else scan["target_revision"]
        if require_git_worktree_head(target) != expected_head:
            return (
                "Repository HEAD changed while the scan was running; "
                "results were saved for the original revision."
            )
        expected_digest = (
            scan["diff_content_digest"] if working_tree else scan["target_snapshot_digest"]
        )
        if worktree_content_digest(target) != expected_digest:
            return (
                "Working-tree contents changed while the scan was running; "
                "results were saved for the original snapshot."
            )
    except (OSError, SystemExit):
        return (
            "The scan target became unavailable while the scan was running; "
            "results were saved for the original revision or snapshot."
        )
    return None

def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()

if __name__ == "__main__":
    main()
```

## File: `scripts/workbench_target_state.py`

```python
"""Persist stable Codex Security target identities."""

from __future__ import annotations

import argparse
import hashlib
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

def stable_target_id(target: Path) -> str:
    digest = hashlib.sha256(f"local-workspace\0{target}".encode()).hexdigest()
    return f"target_sha256_{digest}"

def backfill_security_targets(connection: sqlite3.Connection) -> None:
    rows = connection.execute(
        """
        SELECT target_path FROM workspaces WHERE target_path IS NOT NULL
        UNION
        SELECT target_path FROM scans
        """
    ).fetchall()
    for row in rows:
        target_path = row["target_path"]
        target_id = ensure_security_target(connection, target_path)
        connection.execute(
            "UPDATE workspaces SET target_id = ? WHERE target_path = ? AND target_id IS NULL",
            (target_id, target_path),
        )
        connection.execute(
            "UPDATE scans SET target_id = ? WHERE target_path = ? AND target_id IS NULL",
            (target_id, target_path),
        )

def ensure_security_target(connection: sqlite3.Connection, target_path: str) -> str:
    existing = connection.execute(
        "SELECT id FROM security_targets WHERE current_path = ?",
        (target_path,),
    ).fetchone()
    if existing is not None:
        return str(existing["id"])
    target_id = stable_target_id(Path(target_path))
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    connection.execute(
        """
        INSERT OR IGNORE INTO security_targets (
            id, current_path, display_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)
        """,
        (target_id, target_path, Path(target_path).name, timestamp, timestamp),
    )
    return target_id

def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()

if __name__ == "__main__":
    main()
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
from pathlib import Path, PurePosixPath
from typing import Any

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))

def require_uuid(value: str, label: str) -> str:
    try:
        return str(uuid.UUID(value))
    except ValueError as exc:
        raise SystemExit(f"{label} must be a UUID.") from exc

def optional_text(value: str | None, *, maximum: int | None = None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    if maximum is not None and len(normalized) > maximum:
        raise SystemExit(f"Text value must be no longer than {maximum} characters.")
    return normalized or None

def sqlite_busy(error: sqlite3.OperationalError) -> bool:
    return "locked" in str(error).lower() or "busy" in str(error).lower()

def path_within_scope(path: str, scope: str) -> bool:
    candidate = PurePosixPath(path)
    requested = PurePosixPath(scope)
    if candidate.is_absolute() or ".." in candidate.parts:
        return False
    if requested == PurePosixPath("."):
        return True
    return candidate == requested or requested in candidate.parents

def require_close_note(close_reason: str | None, note: str | None) -> None:
    if note is None and close_reason == "false_positive":
        raise SystemExit("Explain why this finding is a false positive.")
    if note is None and close_reason == "wont_fix":
        raise SystemExit("Explain why this finding will not be fixed.")

def user_text(value: str | None) -> str | None:
    return optional_text(value)

def reject_nonstandard_json_number(value: str) -> None:
    raise ValueError(f"invalid JSON number {value}")

SCAN_USAGE_TOKEN_KEYS = (
    "inputTokens",
    "cachedInputTokens",
    "cacheWriteInputTokens",
    "outputTokens",
    "reasoningOutputTokens",
    "totalTokens",
)

def _valid_legacy_scan_cost(cost: object) -> bool:
    token_keys = ("inputTokens", "cachedInputTokens", "cacheWriteInputTokens", "outputTokens")
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

def _valid_scan_token_counts(usage: object) -> bool:
    return (
        isinstance(usage, dict)
        and set(usage) == set(SCAN_USAGE_TOKEN_KEYS)
        and all(type(usage.get(key)) is int and usage[key] >= 0 for key in SCAN_USAGE_TOKEN_KEYS)
        and usage["cachedInputTokens"] + usage["cacheWriteInputTokens"] <= usage["inputTokens"]
    )

def _valid_measured_scan_usage(usage: object) -> bool:
    if not isinstance(usage, dict):
        return False
    coverage = usage.get("coverage")
    thread_count = usage.get("threadCount")
    if (
        coverage not in {"complete", "partial", "unavailable"}
        or usage.get("source") != "codex_rollout"
        or type(thread_count) is not int
        or thread_count < 0
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
    if coverage == "unavailable":
        return thread_count == 0 and set(usage).issubset(
            {"coverage", "source", "threadCount", "warnings"}
        )

    allowed_keys = {
        "coverage",
        "source",
        "threadCount",
        "missingThreadCount",
        "warnings",
        *SCAN_USAGE_TOKEN_KEYS,
    }
    if thread_count == 0 or not set(usage).issubset(allowed_keys):
        return False
    counts = {key: usage.get(key) for key in SCAN_USAGE_TOKEN_KEYS}
    if not _valid_scan_token_counts(counts):
        return False
    missing = usage.get("missingThreadCount", 0)
    if type(missing) is not int or missing < 0:
        return False
    if coverage == "complete" and (warnings or missing):
        return False
    if coverage == "partial" and not (warnings or missing):
        return False
    return True

def parse_scan_cost(value: str | None) -> str | None:
    if value is None:
        return None
    if len(value.encode("utf-8")) > 8192:
        raise SystemExit("Scan cost must be no larger than 8 KiB.")
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
    encoded = str(value).encode("utf-8")[:maximum_bytes]
    return encoded.decode("utf-8", errors="ignore")

def require_occurrence(connection: sqlite3.Connection, occurrence_id: str) -> sqlite3.Row:
    occurrence_id = optional_text(occurrence_id, maximum=256)
    if occurrence_id is None:
        raise SystemExit("occurrence-id is required.")
    row = connection.execute(
        "SELECT * FROM finding_occurrences WHERE id = ?", (occurrence_id,)
    ).fetchone()
    if row is None:
        raise SystemExit("Codex Security finding occurrence not found.")
    return row

def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()

if __name__ == "__main__":
    main()
```
