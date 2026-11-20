# Plugin files: codex-security — `examples/`

Source: `plugins/codex-security`. Files outside the `skills/*` folders, embedded as text.

## File: `examples/completed-scan/findings.json`

```json
{
  "documentType": "codex-security.findings",
  "findings": [
    {
      "attackPath": {
        "dataflow": {
          "summary": "The archive supplies an entry name. The extractor uses that name to select the file it writes."
        },
        "reachability": {
          "summary": "The caller must be able to supply an archive for extraction. The service account must have write access to the destination."
        }
      },
      "confidence": {
        "level": "high",
        "rationale": "The destination passed to the file writer is visible in the reviewed code."
      },
      "extensions": {},
      "findingId": "csf_852f90d6e1177502ff113d4a",
      "fingerprints": {
        "algorithm": "codex-security/v1",
        "primary": "codex-security/v1:sha256:990a4a6a2ec18440dd47eac4d7256c0ee2c02db1b43104720cab3cbe9db706ca"
      },
      "identity": {
        "anchor": "archive-entry-write-without-containment"
      },
      "locations": [
        {
          "endLine": 44,
          "path": "src/extract.py",
          "role": "sink",
          "startLine": 41
        }
      ],
      "occurrenceId": "occ_e79cb19591e696572a1c22be",
      "preventiveControls": [
        "Route all archive extraction through one helper that normalizes and validates destination paths."
      ],
      "provenance": {
        "source": "local_plugin"
      },
      "remediation": "Normalize destinations and reject entries that escape the extraction root.",
      "remediationTests": [
        "Assert that extracting an archive entry named `../escape.txt` fails without writing outside the extraction root."
      ],
      "ruleId": "path-traversal.archive-extraction",
      "severity": {
        "changeConditions": "A filesystem policy that confines writes to a disposable import directory would limit the impact.",
        "level": "high",
        "rationale": "The caller can alter files outside the import area with the permissions of the extraction service.",
        "score": 8.1,
        "scoringSystem": "CVSS:3.1"
      },
      "summary": "Archive extraction can overwrite files outside the directory chosen for the import.",
      "taxonomy": {
        "category": "path-traversal",
        "cwe": [
          "CWE-22"
        ]
      },
      "title": "Unsafe archive extraction can escape the output directory",
      "validation": {
        "method": "Static source review",
        "summary": "The extractor combines the output directory with the entry name and passes the resulting path to the writer. It never checks that the destination stays inside the output directory."
      }
    }
  ],
  "scanId": "scan_example_001",
  "schemaVersion": "1.0"
}
```

## File: `examples/completed-scan/report.md`

### Security Review: example/repo

#### Scope

The scan was configured for the include paths and exclusions listed below.

- Scan mode: repository
- Target kind: git\_worktree
- Target ID: target\_sha256\_example
- Revision: deadbeef
- Snapshot digest: codex-security-snapshot/v1:sha256:ed88f96a4c1a06603a41b3f261f59c3de2555c367ef6ad3bb8b9e483495d34eb
- Included paths: .
- Excluded paths: none
- Scan context: Illustrative scan of a synthetic archive importer.

##### Scan Summary

| Field | Value |
| --- | --- |
| Scan outcome | completed |
| Reportable findings | 1 |
| Severity mix | high: 1 |
| Confidence mix | high: 1 |
| Validation mode | Static source review |

Canonical artifacts: `scan-manifest.json` and `findings.json`. This report is a deterministic projection of those files.

#### Threat Model

No explicit canonical threat-model summary was recorded.

#### Findings

| Finding | Severity | Confidence | Detailed write-up |
| --- | --- | --- | --- |
| [Unsafe archive extraction can escape the output directory](#finding-1) | high | high | inline below |

##### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct evidence supports the finding with no material unresolved blocker. |
| medium | Evidence supports a plausible issue, but material runtime or reachability proof remains. |
| low | Evidence is incomplete and the item is retained only for explicit follow-up. |

<a id="finding-1"></a>

##### [1] Unsafe archive extraction can escape the output directory

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | The destination passed to the file writer is visible in the reviewed code. |
| Category | path-traversal |
| CWE | CWE-22 |
| Affected lines | src/extract.py:41-44 |

###### Summary

Archive extraction can overwrite files outside the directory chosen for the import.

###### Validation

The extractor combines the output directory with the entry name and passes the resulting path to the writer. It never checks that the destination stays inside the output directory.

Validation method: Static source review

###### Dataflow

The archive supplies an entry name. The extractor uses that name to select the file it writes.

###### Reachability

The caller must be able to supply an archive for extraction. The service account must have write access to the destination.

###### Severity

**High** — The caller can alter files outside the import area with the permissions of the extraction service.

A filesystem policy that confines writes to a disposable import directory would limit the impact.

###### Remediation

Normalize destinations and reject entries that escape the extraction root.

Tests:
- Assert that extracting an archive entry named `../escape.txt` fails without writing outside the extraction root.

Preventive controls:
- Route all archive extraction through one helper that normalizes and validates destination paths.

## File: `examples/completed-scan/scan-manifest.json`

```json
{
  "documentType": "codex-security.scan-manifest",
  "scan": {
    "artifacts": [
      {
        "mediaType": "application/json",
        "path": "findings.json",
        "sha256": "3c63586ea38b07b1d5ad9004ba2afc27f67e79ed164da508c7beae72648eb3b7"
      }
    ],
    "completedAt": "2026-05-31T18:09:00Z",
    "findingsRef": "findings.json",
    "id": "scan_example_001",
    "mode": "repository",
    "producer": {
      "name": "codex-security-plugin",
      "version": "0.1.0"
    },
    "review": {
      "excludedPaths": []
    },
    "scope": {
      "context": "Illustrative scan of a synthetic archive importer.",
      "excludePaths": [],
      "includePaths": [
        "."
      ],
      "validationMode": "Static source review"
    },
    "sealedAt": "2026-05-31T18:09:00Z",
    "startedAt": "2026-05-31T18:00:00Z",
    "status": "completed",
    "target": {
      "displayName": "example/repo",
      "kind": "git_worktree",
      "remote": "https://github.com/example/repo",
      "revision": "deadbeef",
      "snapshotDigest": "codex-security-snapshot/v1:sha256:ed88f96a4c1a06603a41b3f261f59c3de2555c367ef6ad3bb8b9e483495d34eb",
      "targetId": "target_sha256_example"
    }
  },
  "schemaVersion": "1.0"
}
```

## File: `examples/legacy-completed-scan/coverage.json`

```json
{
  "documentType": "codex-security.coverage",
  "schemaVersion": "1.0",
  "scanId": "scan_example_001",
  "mode": "repository",
  "completeness": "complete",
  "inventoryStrategy": "repository",
  "includePaths": [
    "."
  ],
  "excludePaths": [],
  "surfaces": [
    {
      "id": "surface_archive_extraction",
      "label": "Archive extraction",
      "disposition": "reported",
      "receiptRefs": []
    }
  ],
  "explicitExclusions": [],
  "deferred": []
}
```

## File: `examples/legacy-completed-scan/findings.json`

```json
{
  "documentType": "codex-security.findings",
  "schemaVersion": "1.0",
  "scanId": "scan_example_001",
  "findings": [
    {
      "findingId": "csf_852f90d6e1177502ff113d4a",
      "occurrenceId": "occ_e79cb19591e696572a1c22be",
      "ruleId": "path-traversal.archive-extraction",
      "identity": {
        "anchor": "archive-entry-write-without-containment"
      },
      "fingerprints": {
        "algorithm": "codex-security/v1",
        "primary": "codex-security/v1:sha256:990a4a6a2ec18440dd47eac4d7256c0ee2c02db1b43104720cab3cbe9db706ca"
      },
      "title": "Unsafe archive extraction can escape the output directory",
      "summary": "An attacker-controlled path reaches a filesystem write without containment validation.",
      "severity": {
        "level": "high",
        "score": 8.1,
        "scoringSystem": "CVSS:3.1"
      },
      "confidence": {
        "level": "high",
        "rationale": "Direct source trace reaches the filesystem write without a containment check."
      },
      "taxonomy": {
        "category": "path-traversal",
        "cwe": [
          "CWE-22"
        ]
      },
      "locations": [
        {
          "path": "src/extract.py",
          "startLine": 41,
          "endLine": 44,
          "role": "sink"
        }
      ],
      "remediation": "Normalize destinations and reject entries that escape the extraction root.",
      "validation": null,
      "attackPath": null,
      "remediationTests": [
        "Assert that extracting an archive entry named `../escape.txt` fails without writing outside the extraction root."
      ],
      "preventiveControls": [
        "Route all archive extraction through one helper that normalizes and validates destination paths."
      ],
      "provenance": {
        "source": "local_plugin"
      },
      "extensions": {}
    }
  ]
}
```

## File: `examples/legacy-completed-scan/report.md`

### Security Review: example/repo

#### Scope

The scan was configured for the include paths and exclusions listed below.

- Scan mode: repository
- Target kind: git\_worktree
- Target ID: target\_sha256\_example
- Revision: deadbeef
- Snapshot digest: codex-security-snapshot/v1:sha256:ed88f96a4c1a06603a41b3f261f59c3de2555c367ef6ad3bb8b9e483495d34eb
- Inventory strategy: repository
- Included paths: .
- Excluded paths: none

##### Scan Summary

| Field               | Value        |
| ------------------- | ------------ |
| Scan outcome        | completed    |
| Reportable findings | 1            |
| Severity mix        | high: 1      |
| Confidence mix      | high: 1      |
| Coverage            | complete     |
| Validation mode     | not recorded |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

#### Threat Model

No explicit canonical threat-model summary was recorded.

#### Findings

| Finding                                                                 | Severity | Confidence | Detailed write-up |
| ----------------------------------------------------------------------- | -------- | ---------- | ----------------- |
| [Unsafe archive extraction can escape the output directory](#finding-1) | high     | high       | inline below      |

##### Confidence Scale

| Label  | Meaning                                                                                  |
| ------ | ---------------------------------------------------------------------------------------- |
| high   | Direct evidence supports the finding with no material unresolved blocker.                |
| medium | Evidence supports a plausible issue, but material runtime or reachability proof remains. |
| low    | Evidence is incomplete and the item is retained only for explicit follow-up.             |

<a id="finding-1"></a>

##### [1] Unsafe archive extraction can escape the output directory

| Field                | Value                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| Severity             | high                                                                          |
| Confidence           | high                                                                          |
| Confidence rationale | Direct source trace reaches the filesystem write without a containment check. |
| Category             | path-traversal                                                                |
| CWE                  | CWE-22                                                                        |
| Affected lines       | src/extract.py:41-44                                                          |

###### Summary

An attacker-controlled path reaches a filesystem write without containment validation.

###### Validation

Direct source trace reaches the filesystem write without a containment check. Validation details were not recorded separately.

###### Dataflow

The canonical finding records the affected path at src/extract.py:41-44, but no expanded source-to-sink narrative was recorded.

###### Reachability

Reachability was not recorded beyond the canonical finding summary and affected locations.

###### Severity

**High** — The scan assigned high severity; no separate canonical severity rationale was recorded.

Additional runtime or deployment evidence could raise or lower this severity.

###### Remediation

Normalize destinations and reject entries that escape the extraction root.

Tests:

- Assert that extracting an archive entry named `../escape.txt` fails without writing outside the extraction root.

Preventive controls:

- Route all archive extraction through one helper that normalizes and validates destination paths.

#### Reviewed Surfaces

| Surface            | Risk Area    | Outcome  | Notes                                        |
| ------------------ | ------------ | -------- | -------------------------------------------- |
| Archive extraction | not recorded | Reported | No additional canonical notes were recorded. |

## File: `examples/legacy-completed-scan/scan-manifest.json`

```json
{
  "documentType": "codex-security.scan-manifest",
  "schemaVersion": "1.0",
  "scan": {
    "id": "scan_example_001",
    "producer": {
      "name": "codex-security-plugin",
      "version": "0.1.0"
    },
    "status": "completed",
    "startedAt": "2026-05-31T18:00:00Z",
    "completedAt": "2026-05-31T18:09:00Z",
    "sealedAt": "2026-05-31T18:09:00Z",
    "target": {
      "kind": "git_worktree",
      "targetId": "target_sha256_example",
      "displayName": "example/repo",
      "remote": "https://github.com/example/repo",
      "revision": "deadbeef",
      "snapshotDigest": "codex-security-snapshot/v1:sha256:ed88f96a4c1a06603a41b3f261f59c3de2555c367ef6ad3bb8b9e483495d34eb"
    },
    "scope": {
      "includePaths": [
        "."
      ],
      "excludePaths": []
    },
    "coverageRef": "coverage.json",
    "findingsRef": "findings.json",
    "artifacts": [
      {
        "path": "findings.json",
        "sha256": "a6dc4521d6478828224fbafc33585401a47bfeb0e56e07b5d2886e8a29937f2f",
        "mediaType": "application/json"
      },
      {
        "path": "coverage.json",
        "sha256": "d55b9b98d48323b4659dfee6531ec83ec538f2084325412b7188bf85ad68b01b",
        "mediaType": "application/json"
      }
    ]
  }
}
```
