# Plugin files: codex-security — `schemas/`

Source: `plugins/codex-security`. Files outside the `skills/*` folders, embedded as text.

## File: `schemas/coverage.schema.json`

```json
{
  "$id": "https://openai.com/codex-security/schemas/coverage.schema.json",
  "title": "Codex Security scan coverage",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "documentType": { "const": "codex-security.coverage" },
    "schemaVersion": { "const": "1.0" },
    "scanId": { "type": "string", "minLength": 1 },
    "mode": {
      "enum": [
        "repository",
        "scoped_path",
        "diff",
        "commit",
        "branch_diff",
        "working_tree",
        "deep_repository"
      ]
    },
    "inventoryStrategy": {
      "enum": ["repository", "scoped_path", "diff", "directory", "custom"]
    },
    "includePaths": { "type": "array", "items": { "type": "string" } },
    "excludePaths": { "type": "array", "items": { "type": "string" } },
    "surfaces": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "label": { "type": "string", "minLength": 1 },
          "disposition": {
            "enum": [
              "reported",
              "no_issue_found",
              "rejected",
              "not_applicable",
              "needs_follow_up"
            ]
          },
          "receiptRefs": {
            "type": "array",
            "items": {
              "type": "string",
              "minLength": 1,
              "pattern": "^(?!.*(?:^|/)\\.\\.(?:/|$))(?!.*\\\\)artifacts/.+$"
            }
          },
          "riskArea": { "type": "string", "minLength": 1 },
          "notes": { "type": "string", "minLength": 1 }
        },
        "required": ["id", "label", "disposition", "receiptRefs"]
      }
    },
    "explicitExclusions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "pattern": { "type": "string", "minLength": 1 },
          "reason": { "type": "string", "minLength": 1 }
        },
        "required": ["pattern", "reason"]
      }
    },
    "deferred": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "reason": { "type": "string", "minLength": 1 },
          "paths": {
            "type": "array",
            "items": {
              "type": "string",
              "minLength": 1,
              "oneOf": [
                {},
                {
                  "type": "string",
                  "$comment": "invalidSealedDeferredPath",
                  "pattern": "^(?:/|[A-Za-z]:)|(?:^|/)\\.\\.(?:/|$)|[\\\\\\x00-\\x1f]|[\\ud800-\\udbff](?![\\udc00-\\udfff])|(?:^|[^\\ud800-\\udbff])[\\udc00-\\udfff]"
                }
              ]
            }
          },
          "surfaceIds": {
            "type": "array",
            "items": { "type": "string", "minLength": 1 }
          }
        },
        "required": ["id", "reason"]
      }
    },
    "resolvedDeferred": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "reason": { "type": "string", "minLength": 1 }
        },
        "required": ["id", "reason"],
        "additionalProperties": false
      },
      "description": "Completed generic review tasks, with their saved IDs and completion reasons."
    },
    "openQuestions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "question": { "type": "string", "minLength": 1 },
          "followUpPrompt": { "type": "string", "minLength": 1 }
        },
        "required": ["question"]
      }
    }
  },
  "required": [
    "documentType",
    "schemaVersion",
    "scanId",
    "mode",
    "inventoryStrategy",
    "includePaths",
    "excludePaths",
    "surfaces",
    "explicitExclusions",
    "deferred"
  ]
}
```

## File: `schemas/definitions/artifact-common.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "codex-security://schemas/definitions/artifact-common.schema.json",
  "$defs": {
    "nonEmptyText": {
      "type": "string",
      "minLength": 1,
      "pattern": "[^\\u0009-\\u000d\\u001c-\\u0020\\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000]"
    },
    "scanId": { "type": "string", "format": "uuid" },
    "repositoryPath": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4096,
      "pattern": "^(?:\\./)?(?!/)(?![A-Za-z]:)(?![\\s\\S]*\\\\)(?![\\s\\S]*(?:^|/)\\.\\.?(/|$))(?![\\s\\S]*//)(?![\\s\\S]*[\\u0000-\\u001f\\u007f])(?![\\s\\S]*\\/$)[\\s\\S]+$"
    },
    "candidateId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 512,
      "pattern": "^(?!\\.{1,2}$)(?!.*[\\u0000-\\u001f\\u007f])(?=.*\\S)[^/\\\\]+$"
    }
  }
}
```

## File: `schemas/definitions/discovery-candidate.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "codex-security://schemas/definitions/discovery-candidate.schema.json",
  "$defs": {
    "nonEmptyText": { "type": "string", "pattern": "\\S" },
    "cweId": {
      "type": "string",
      "pattern": "^\\s*[Cc][Ww][Ee]-0*[1-9][0-9]*\\s*$"
    },
    "locationRole": {
      "enum": [
        "entrypoint",
        "entrypoint/wrapper",
        "source",
        "root_control",
        "sink",
        "concrete_implementation",
        "evidence"
      ]
    },
    "rawDiscoveryLocation": {
      "type": "object",
      "properties": {
        "path": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/nonEmptyText"
        },
        "start_line": { "type": "integer", "minimum": 1 },
        "end_line": { "type": "integer", "minimum": 1 },
        "role": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/locationRole"
        }
      },
      "required": ["path", "start_line", "role"],
      "additionalProperties": false
    },
    "normalizedDiscoveryLocation": {
      "type": "object",
      "properties": {
        "path": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/nonEmptyText"
        },
        "start_line": { "type": "integer", "minimum": 1 },
        "end_line": { "type": "integer", "minimum": 1 },
        "role": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/locationRole"
        }
      },
      "required": ["path", "start_line", "end_line", "role"],
      "additionalProperties": false
    },
    "rawDiscoveryCandidate": {
      "type": "object",
      "properties": {
        "cwe_ids": {
          "type": "array",
          "items": {
            "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/cweId"
          }
        },
        "locations": {
          "minItems": 1,
          "type": "array",
          "items": {
            "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/rawDiscoveryLocation"
          }
        },
        "summary": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/nonEmptyText"
        },
        "evidence": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/nonEmptyText"
        },
        "context": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/nonEmptyText"
        },
        "instance": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/nonEmptyText"
        }
      },
      "required": ["cwe_ids", "locations", "summary", "evidence"],
      "additionalProperties": false
    },
    "discoveryCandidate": {
      "type": "object",
      "properties": {
        "candidate_id": {
          "type": "string",
          "pattern": "^(?!\\.{1,2}$)[^/\\\\]+$"
        },
        "cwe_ids": {
          "type": "array",
          "items": { "type": "string", "pattern": "^CWE-[1-9][0-9]*$" }
        },
        "locations": {
          "minItems": 1,
          "type": "array",
          "items": {
            "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/normalizedDiscoveryLocation"
          }
        },
        "summary": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/nonEmptyText"
        },
        "evidence": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/nonEmptyText"
        },
        "context": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/nonEmptyText"
        },
        "instance": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/nonEmptyText"
        }
      },
      "required": [
        "candidate_id",
        "cwe_ids",
        "locations",
        "summary",
        "evidence"
      ],
      "additionalProperties": true
    }
  }
}
```

## File: `schemas/findings.schema.json`

```json
{
  "$id": "https://openai.com/codex-security/schemas/findings.schema.json",
  "title": "Codex Security findings",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "documentType": { "const": "codex-security.findings" },
    "schemaVersion": { "const": "1.0" },
    "scanId": { "type": "string", "minLength": 1 },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "findingId": { "type": "string", "pattern": "^csf_[a-f0-9]{24}$" },
          "occurrenceId": { "type": "string", "pattern": "^occ_[a-f0-9]{24}$" },
          "ruleId": { "type": "string", "pattern": "^[a-z0-9][a-z0-9._/-]*$" },
          "identity": {
            "type": "object",
            "properties": {
              "anchor": {
                "type": "string",
                "pattern": "^[a-z0-9][a-z0-9._/-]*$"
              },
              "instance": {
                "type": "string",
                "pattern": "^[a-z0-9][a-z0-9._/-]*$"
              }
            },
            "required": ["anchor"]
          },
          "fingerprints": {
            "type": "object",
            "properties": {
              "algorithm": { "const": "codex-security/v1" },
              "primary": {
                "type": "string",
                "pattern": "^codex-security/v1:sha256:[a-f0-9]{64}$"
              }
            },
            "required": ["algorithm", "primary"]
          },
          "title": { "type": "string", "minLength": 1 },
          "summary": { "type": "string", "minLength": 1 },
          "severity": {
            "type": "object",
            "properties": {
              "level": {
                "enum": ["critical", "high", "medium", "low", "informational"]
              },
              "score": { "type": "number", "minimum": 0, "maximum": 10 },
              "scoringSystem": { "type": "string", "minLength": 1 },
              "vector": { "type": "string", "minLength": 1 },
              "rationale": { "type": "string", "minLength": 1 },
              "changeConditions": { "type": "string", "minLength": 1 }
            },
            "required": ["level"]
          },
          "confidence": {
            "type": "object",
            "properties": {
              "level": { "enum": ["high", "medium", "low"] },
              "rationale": { "type": "string", "minLength": 1 }
            },
            "required": ["level", "rationale"]
          },
          "taxonomy": {
            "type": "object",
            "properties": {
              "category": { "type": "string", "minLength": 1 },
              "cwe": { "$ref": "#/$defs/stringList" }
            },
            "required": ["category", "cwe"]
          },
          "locations": {
            "minItems": 1,
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "path": { "type": "string", "minLength": 1 },
                "startLine": { "type": "integer", "minimum": 1 },
                "endLine": { "type": "integer", "minimum": 1 },
                "role": { "type": "string", "minLength": 1 }
              },
              "required": ["path", "startLine"]
            }
          },
          "writeup": {
            "type": "object",
            "properties": {
              "reportPath": {
                "type": "string",
                "pattern": "^findings/([a-z0-9][a-z0-9._-]*)/\\1\\.md$"
              }
            },
            "required": ["reportPath"]
          },
          "codeEvidence": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "pattern": "^[a-z0-9][a-z0-9._/-]*$"
                },
                "label": { "type": "string", "minLength": 1 },
                "path": { "type": "string", "minLength": 1 },
                "startLine": { "type": "integer", "minimum": 1 },
                "endLine": { "type": "integer", "minimum": 1 },
                "language": { "type": "string", "minLength": 1 },
                "role": { "type": "string", "minLength": 1 },
                "code": { "type": "string", "minLength": 1 },
                "explanation": { "type": "string", "minLength": 1 }
              },
              "required": [
                "id",
                "label",
                "path",
                "startLine",
                "code",
                "explanation"
              ]
            }
          },
          "code_evidence": {
            "type": ["array", "null"],
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string", "minLength": 1 },
                "code": { "type": "string", "minLength": 1 }
              },
              "required": ["id", "code"]
            }
          },
          "rootCause": {
            "type": ["object", "string"],
            "properties": {
              "summary": { "type": "string", "minLength": 1 },
              "evidenceRefs": { "$ref": "#/$defs/stringList" },
              "code": { "type": "string", "minLength": 1 },
              "language": { "type": "string", "minLength": 1 }
            },
            "required": ["summary"]
          },
          "root_cause": {
            "type": ["object", "string", "null"],
            "properties": {
              "summary": { "type": "string", "minLength": 1 },
              "evidenceRefs": { "$ref": "#/$defs/stringList" },
              "evidence_refs": { "$ref": "#/$defs/stringList" },
              "code": { "type": "string", "minLength": 1 },
              "language": { "type": "string", "minLength": 1 }
            }
          },
          "remediation": { "type": "string", "minLength": 1 },
          "validation": {
            "type": ["object", "null"],
            "properties": {
              "assertions": { "$ref": "#/$defs/stringList" },
              "counterEvidence": { "$ref": "#/$defs/stringList" },
              "evidence": {
                "type": ["string", "array"],
                "minLength": 1,
                "items": { "type": "string", "minLength": 1 }
              },
              "evidenceRefs": { "$ref": "#/$defs/stringList" },
              "evidence_refs": { "$ref": "#/$defs/stringList" },
              "limitations": { "$ref": "#/$defs/stringList" },
              "method": { "type": "string", "minLength": 1 },
              "status": { "type": ["string", "null"], "minLength": 1 },
              "summary": { "type": "string", "minLength": 1 },
              "disposition": { "type": ["string", "null"], "minLength": 1 },
              "result": { "type": ["string", "null"], "minLength": 1 }
            }
          },
          "attackPath": {
            "type": ["object", "null"],
            "properties": {
              "assumptions": { "$ref": "#/$defs/stringList" },
              "blindspots": { "$ref": "#/$defs/stringList" },
              "controls": { "$ref": "#/$defs/stringList" },
              "dataFlow": { "$ref": "#/$defs/dataFlow" },
              "data_flow": { "$ref": "#/$defs/dataFlow" },
              "dataflow": { "$ref": "#/$defs/dataFlow" },
              "evidenceRefs": { "$ref": "#/$defs/stringList" },
              "evidence_refs": { "$ref": "#/$defs/stringList" },
              "impact": { "$ref": "#/$defs/assessment" },
              "likelihood": { "$ref": "#/$defs/assessment" },
              "limitations": { "$ref": "#/$defs/stringList" },
              "preconditions": { "$ref": "#/$defs/stringList" },
              "reachability": {
                "type": ["string", "object"],
                "minLength": 1,
                "properties": {
                  "summary": { "type": "string", "minLength": 1 },
                  "attacker": { "type": "string", "minLength": 1 },
                  "entrypoint": { "type": "string", "minLength": 1 },
                  "source": { "type": "string", "minLength": 1 },
                  "sink": { "type": "string", "minLength": 1 },
                  "outcome": { "type": "string", "minLength": 1 },
                  "preconditions": { "$ref": "#/$defs/stringList" },
                  "evidenceRefs": { "$ref": "#/$defs/stringList" },
                  "evidence_refs": { "$ref": "#/$defs/stringList" }
                }
              },
              "steps": { "$ref": "#/$defs/stringList" },
              "summary": { "type": "string", "minLength": 1 }
            }
          },
          "remediationTests": { "$ref": "#/$defs/stringList" },
          "preventiveControls": { "$ref": "#/$defs/stringList" },
          "provenance": {
            "type": "object",
            "properties": { "source": { "type": "string", "minLength": 1 } },
            "required": ["source"]
          },
          "extensions": {
            "type": "object",
            "properties": {
              "candidateId": { "type": "string", "minLength": 1 },
              "ledgerRowId": { "type": "string", "minLength": 1 },
              "reportId": { "type": "string", "minLength": 1 }
            }
          }
        },
        "required": [
          "findingId",
          "occurrenceId",
          "ruleId",
          "identity",
          "fingerprints",
          "title",
          "summary",
          "severity",
          "confidence",
          "taxonomy",
          "locations",
          "remediation",
          "provenance"
        ]
      }
    }
  },
  "required": ["documentType", "schemaVersion", "scanId", "findings"],
  "$defs": {
    "stringList": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    },
    "dataFlow": {
      "type": ["string", "object"],
      "minLength": 1,
      "properties": {
        "summary": { "type": "string", "minLength": 1 },
        "source": { "type": "string", "minLength": 1 },
        "sink": { "type": "string", "minLength": 1 },
        "outcome": { "type": "string", "minLength": 1 },
        "transformations": { "$ref": "#/$defs/stringList" },
        "evidenceRefs": { "$ref": "#/$defs/stringList" },
        "evidence_refs": { "$ref": "#/$defs/stringList" }
      }
    },
    "assessment": {
      "type": ["string", "object", "null"],
      "minLength": 1,
      "properties": {
        "level": { "type": "string", "minLength": 1 },
        "rationale": { "type": "string", "minLength": 1 },
        "why": { "type": "string", "minLength": 1 }
      }
    }
  }
}
```

## File: `schemas/patch-risk-assessment.schema.json`

```json
{
  "$id": "https://openai.com/codex-security/schemas/patch-risk-assessment.schema.json",
  "title": "Patch risk assessment",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "schemaVersion": { "const": 1 },
    "patch": {
      "type": "object",
      "properties": {
        "repository": { "$ref": "#/$defs/nonEmptyString" },
        "sourceType": {
          "enum": ["pull_request_diff", "patch_file", "commit_range"]
        },
        "base": { "$ref": "#/$defs/nonEmptyString" },
        "head": { "$ref": "#/$defs/nonEmptyString" },
        "changedFiles": { "$ref": "#/$defs/stringList" },
        "sha256": { "type": "string", "pattern": "^[0-9a-f]{64}$" }
      },
      "required": [
        "repository",
        "sourceType",
        "base",
        "head",
        "changedFiles",
        "sha256"
      ],
      "additionalProperties": false
    },
    "recommendation": { "$ref": "#/$defs/recommendation" },
    "workflowLabel": {
      "enum": [
        "auto_merge_candidate",
        "human_review_required",
        "revise",
        "no_op",
        "block",
        "hold_for_evidence"
      ]
    },
    "impact": { "$ref": "#/$defs/riskRating" },
    "regressionLikelihood": { "$ref": "#/$defs/riskRating" },
    "regressionProtection": {
      "type": "object",
      "properties": {
        "rating": { "enum": ["strong", "partial", "none", "unknown"] },
        "rationale": { "$ref": "#/$defs/nonEmptyString" },
        "exactHeadChecksPassed": { "type": "boolean" }
      },
      "required": ["rating", "rationale", "exactHeadChecksPassed"],
      "additionalProperties": false
    },
    "recoverability": { "$ref": "#/$defs/recoveryRating" },
    "confidence": { "$ref": "#/$defs/confidenceRating" },
    "applicability": {
      "type": "object",
      "properties": {
        "status": {
          "enum": [
            "confirmed",
            "no_live_effect",
            "wrong_owner",
            "duplicate",
            "superseded",
            "unknown"
          ]
        },
        "rationale": { "$ref": "#/$defs/nonEmptyString" }
      },
      "required": ["status", "rationale"],
      "additionalProperties": false
    },
    "statusQuoRisk": {
      "type": "object",
      "properties": {
        "rating": {
          "enum": ["low", "moderate", "high", "critical", "unknown"]
        },
        "rationale": { "$ref": "#/$defs/nonEmptyString" }
      },
      "required": ["rating", "rationale"],
      "additionalProperties": false
    },
    "autoMergeExclusions": {
      "type": "array",
      "items": {
        "enum": [
          "privileged_boundary",
          "migration",
          "persistent_state",
          "public_contract",
          "architecture_specific_rollout",
          "broad_shared_default",
          "other"
        ]
      },
      "uniqueItems": true
    },
    "affectedRuntimeRoots": { "$ref": "#/$defs/stringList" },
    "importantCallers": { "$ref": "#/$defs/stringList" },
    "riskDrivers": { "$ref": "#/$defs/stringList" },
    "protectiveFactors": { "$ref": "#/$defs/stringList" },
    "materialBoundaries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "$ref": "#/$defs/identifier" },
          "invariant": { "$ref": "#/$defs/nonEmptyString" },
          "runtimeRoot": { "$ref": "#/$defs/nonEmptyString" },
          "counterexample": { "$ref": "#/$defs/nonEmptyString" },
          "legitimateControl": { "$ref": "#/$defs/nonEmptyString" },
          "result": { "enum": ["supported", "contradicted", "unresolved"] }
        },
        "required": [
          "id",
          "invariant",
          "runtimeRoot",
          "counterexample",
          "legitimateControl",
          "result"
        ],
        "additionalProperties": false
      }
    },
    "validation": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "$ref": "#/$defs/nonEmptyString" },
          "status": { "enum": ["passed", "failed", "skipped", "unavailable"] },
          "protects": { "$ref": "#/$defs/nonEmptyString" }
        },
        "required": ["name", "status", "protects"],
        "additionalProperties": false
      }
    },
    "unknowns": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "summary": { "$ref": "#/$defs/nonEmptyString" },
          "decisionCritical": { "type": "boolean" }
        },
        "required": ["summary", "decisionCritical"],
        "additionalProperties": false
      }
    },
    "evidencePlan": {
      "maxItems": 3,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "question": { "$ref": "#/$defs/nonEmptyString" },
          "action": { "$ref": "#/$defs/nonEmptyString" },
          "outcomes": {
            "type": "object",
            "additionalProperties": { "$ref": "#/$defs/recommendation" },
            "minProperties": 2
          }
        },
        "required": ["question", "action", "outcomes"],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "schemaVersion",
    "patch",
    "recommendation",
    "workflowLabel",
    "impact",
    "regressionLikelihood",
    "regressionProtection",
    "recoverability",
    "confidence",
    "applicability",
    "statusQuoRisk",
    "autoMergeExclusions",
    "affectedRuntimeRoots",
    "materialBoundaries",
    "validation",
    "unknowns",
    "evidencePlan"
  ],
  "additionalProperties": false,
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "stringList": {
      "type": "array",
      "items": { "$ref": "#/$defs/nonEmptyString" },
      "uniqueItems": true
    },
    "recommendation": {
      "enum": ["merge", "revise", "no_op", "block", "hold_for_evidence"]
    },
    "riskRating": {
      "type": "object",
      "properties": {
        "rating": { "enum": ["low", "moderate", "high", "critical"] },
        "rationale": { "$ref": "#/$defs/nonEmptyString" }
      },
      "required": ["rating", "rationale"],
      "additionalProperties": false
    },
    "recoveryRating": {
      "type": "object",
      "properties": {
        "rating": { "enum": ["easy", "managed", "hard"] },
        "rationale": { "$ref": "#/$defs/nonEmptyString" }
      },
      "required": ["rating", "rationale"],
      "additionalProperties": false
    },
    "confidenceRating": {
      "type": "object",
      "properties": {
        "rating": { "enum": ["high", "moderate", "low"] },
        "rationale": { "$ref": "#/$defs/nonEmptyString" }
      },
      "required": ["rating", "rationale"],
      "additionalProperties": false
    },
    "identifier": { "type": "string", "pattern": "^[a-z0-9][a-z0-9_-]*$" }
  }
}
```

## File: `schemas/scan-manifest.schema.json`

```json
{
  "$id": "https://openai.com/codex-security/schemas/scan-manifest.schema.json",
  "title": "Codex Security sealed scan manifest",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "documentType": { "const": "codex-security.scan-manifest" },
    "schemaVersion": { "const": "1.0" },
    "scan": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "producer": {
          "type": "object",
          "properties": {
            "name": { "type": "string", "minLength": 1 },
            "version": { "type": "string", "minLength": 1 }
          },
          "required": ["name", "version"]
        },
        "status": {
          "enum": ["completed", "failed", "canceled", "interrupted"]
        },
        "warnings": { "$ref": "#/$defs/stringList" },
        "startedAt": { "type": "string", "format": "date-time" },
        "completedAt": { "type": "string", "format": "date-time" },
        "sealedAt": { "type": "string", "format": "date-time" },
        "target": {
          "type": "object",
          "properties": {
            "kind": {
              "enum": [
                "git_revision",
                "git_worktree",
                "git_diff",
                "directory_snapshot"
              ]
            },
            "targetId": { "type": "string", "minLength": 1 },
            "displayName": { "type": "string", "minLength": 1 },
            "remote": {
              "type": "string",
              "pattern": "^(?![^:/?#]+://[^/?#]*@)[^?#]+$"
            },
            "revision": { "type": "string" },
            "baseRevision": { "type": "string" },
            "headRevision": { "type": "string" },
            "snapshotDigest": {
              "type": "string",
              "pattern": "^codex-security-snapshot/v1:sha256:[a-f0-9]{64}$"
            }
          },
          "required": ["kind", "targetId", "displayName"],
          "allOf": [
            {
              "if": { "properties": { "kind": { "const": "git_revision" } } },
              "then": { "required": ["revision"] }
            },
            {
              "if": {
                "properties": {
                  "kind": {
                    "enum": ["git_worktree", "git_diff", "directory_snapshot"]
                  }
                }
              },
              "then": { "required": ["snapshotDigest"] }
            }
          ]
        },
        "scope": {
          "type": "object",
          "properties": {
            "includePaths": { "type": "array", "items": { "type": "string" } },
            "excludePaths": { "type": "array", "items": { "type": "string" } },
            "summary": { "type": "string", "minLength": 1 },
            "artifactsReviewed": { "$ref": "#/$defs/stringList" },
            "runtimeStatus": { "type": "string", "minLength": 1 },
            "validationMode": { "type": "string", "minLength": 1 },
            "context": { "type": "string", "minLength": 1 },
            "limitations": { "$ref": "#/$defs/stringList" }
          },
          "required": ["includePaths", "excludePaths"]
        },
        "threatModel": {
          "anyOf": [
            {
              "type": "object",
              "properties": {
                "summary": { "type": "string", "minLength": 1 },
                "assets": { "$ref": "#/$defs/stringList" },
                "trustBoundaries": { "$ref": "#/$defs/stringList" },
                "attackerCapabilities": { "$ref": "#/$defs/stringList" },
                "securityObjectives": { "$ref": "#/$defs/stringList" },
                "assumptions": { "$ref": "#/$defs/stringList" }
              },
              "required": ["summary"]
            },
            {
              "type": "object",
              "properties": {
                "format": { "const": "markdown" },
                "content": {
                  "type": "string",
                  "minLength": 1,
                  "pattern": "^[\\s\\S]*\\S[\\s\\S]*$"
                },
                "scope": {
                  "type": "object",
                  "properties": {
                    "includePaths": { "$ref": "#/$defs/stringList" },
                    "excludePaths": { "$ref": "#/$defs/stringList" },
                    "summary": { "type": "string", "minLength": 1 }
                  },
                  "required": ["includePaths"],
                  "additionalProperties": true,
                  "description": "The modeled source scope, which may differ from the scan scope. Omit when unknown."
                },
                "origin": {
                  "enum": ["generated", "provided", "reconciled", "recovered"]
                }
              },
              "required": ["format", "content"],
              "additionalProperties": true
            }
          ],
          "description": "Retained threat-model content. Existing structured models remain supported; Markdown documents preserve their complete original body."
        },
        "hardening": {
          "type": "object",
          "properties": {
            "portfolioPath": { "const": "hardening/hardening.md" }
          },
          "required": ["portfolioPath"]
        },
        "coverageRef": { "const": "coverage.json" },
        "mode": {
          "enum": [
            "repository",
            "scoped_path",
            "diff",
            "commit",
            "branch_diff",
            "working_tree",
            "deep_repository"
          ]
        },
        "review": {
          "type": "object",
          "properties": {
            "excludedPaths": { "type": "array", "items": { "type": "string" } }
          },
          "required": ["excludedPaths"]
        },
        "reviewState": {
          "type": "object",
          "propertyNames": { "type": "string" }
        },
        "findingsRef": { "const": "findings.json" },
        "artifacts": {
          "minItems": 1,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "path": {
                "type": "string",
                "minLength": 1,
                "pattern": "^(?!/)(?!.*(?:^|/)\\.\\.(?:/|$))(?!.*\\\\).+$"
              },
              "sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
              "mediaType": { "type": "string", "minLength": 1 }
            },
            "required": ["path", "sha256", "mediaType"]
          }
        }
      },
      "required": [
        "id",
        "producer",
        "status",
        "startedAt",
        "completedAt",
        "sealedAt",
        "target",
        "scope",
        "findingsRef",
        "artifacts"
      ],
      "allOf": [
        {
          "properties": {
            "artifacts": {
              "contains": {
                "type": "object",
                "required": ["path"],
                "properties": { "path": { "const": "findings.json" } }
              },
              "minContains": 1,
              "maxContains": 1
            }
          }
        },
        {
          "if": { "required": ["coverageRef"] },
          "then": {
            "properties": {
              "artifacts": {
                "contains": {
                  "type": "object",
                  "required": ["path"],
                  "properties": { "path": { "const": "coverage.json" } }
                },
                "minContains": 1,
                "maxContains": 1
              }
            }
          },
          "else": { "required": ["mode", "review"] }
        }
      ]
    }
  },
  "required": ["documentType", "schemaVersion", "scan"],
  "$defs": {
    "stringList": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    }
  }
}
```

## File: `schemas/tools/candidate-attack-paths.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "codex-security://schemas/tools/candidate-attack-paths.schema.json",
  "title": "Record Codex Security candidate attack paths",
  "$ref": "#/$defs/input",
  "$defs": {
    "input": {
      "type": "object",
      "properties": {
        "scanId": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/scanId"
        },
        "attackPaths": {
          "type": "array",
          "items": {
            "$ref": "codex-security://schemas/tools/candidate-attack-paths.schema.json#/$defs/attackPathUpdate"
          }
        }
      },
      "required": ["scanId", "attackPaths"],
      "additionalProperties": false
    },
    "attackPathUpdate": {
      "type": "object",
      "properties": {
        "candidateId": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/candidateId"
        },
        "attackPath": {
          "$ref": "codex-security://schemas/tools/candidate-attack-paths.schema.json#/$defs/attackPath"
        }
      },
      "required": ["candidateId", "attackPath"],
      "additionalProperties": false
    },
    "attackPath": {
      "oneOf": [
        {
          "$ref": "codex-security://schemas/tools/candidate-attack-paths.schema.json#/$defs/reportableAttackPath"
        },
        {
          "$ref": "codex-security://schemas/tools/candidate-attack-paths.schema.json#/$defs/ignoredAttackPath"
        },
        {
          "$ref": "codex-security://schemas/tools/candidate-attack-paths.schema.json#/$defs/deferredAttackPath"
        }
      ]
    },
    "attackPathFields": {
      "dataflow": {
        "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
      },
      "reachability": {
        "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
      },
      "counterevidence": {
        "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
      },
      "impact": { "enum": ["high", "medium", "low", "ignore", "unknown"] },
      "likelihood": { "enum": ["high", "medium", "low", "ignore", "unknown"] },
      "severity_rationale": {
        "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
      },
      "change_conditions": {
        "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
      }
    },
    "reportableAttackPath": {
      "type": "object",
      "properties": {
        "decision": { "const": "reportable" },
        "dataflow": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "reachability": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "counterevidence": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "impact": { "enum": ["high", "medium", "low", "ignore", "unknown"] },
        "likelihood": {
          "enum": ["high", "medium", "low", "ignore", "unknown"]
        },
        "severity": { "enum": ["critical", "high", "medium", "low"] },
        "severity_rationale": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "change_conditions": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        }
      },
      "required": [
        "decision",
        "dataflow",
        "reachability",
        "counterevidence",
        "impact",
        "likelihood",
        "severity",
        "severity_rationale",
        "change_conditions"
      ],
      "additionalProperties": true
    },
    "ignoredAttackPath": {
      "type": "object",
      "properties": {
        "decision": { "const": "ignore" },
        "dataflow": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "reachability": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "counterevidence": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "impact": { "enum": ["high", "medium", "low", "ignore", "unknown"] },
        "likelihood": {
          "enum": ["high", "medium", "low", "ignore", "unknown"]
        },
        "severity": { "const": "ignore" },
        "severity_rationale": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "change_conditions": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        }
      },
      "required": [
        "decision",
        "dataflow",
        "reachability",
        "counterevidence",
        "impact",
        "likelihood",
        "severity",
        "severity_rationale",
        "change_conditions"
      ],
      "additionalProperties": true
    },
    "deferredAttackPath": {
      "type": "object",
      "properties": {
        "decision": { "const": "deferred" },
        "dataflow": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "reachability": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "counterevidence": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "impact": { "enum": ["high", "medium", "low", "ignore", "unknown"] },
        "likelihood": {
          "enum": ["high", "medium", "low", "ignore", "unknown"]
        },
        "severity": {
          "enum": ["critical", "high", "medium", "low", "unknown"]
        },
        "severity_rationale": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "change_conditions": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "proof_gap": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        }
      },
      "required": [
        "decision",
        "dataflow",
        "reachability",
        "counterevidence",
        "impact",
        "likelihood",
        "severity",
        "severity_rationale",
        "change_conditions",
        "proof_gap"
      ],
      "additionalProperties": true
    }
  }
}
```

## File: `schemas/tools/candidate-validations.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "codex-security://schemas/tools/candidate-validations.schema.json",
  "title": "Record compact Codex Security candidate validations",
  "$ref": "#/$defs/input",
  "$defs": {
    "input": {
      "type": "object",
      "properties": {
        "scanId": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/scanId"
        },
        "validations": {
          "type": "array",
          "items": {
            "$ref": "codex-security://schemas/tools/candidate-validations.schema.json#/$defs/validationUpdate"
          }
        }
      },
      "required": ["scanId", "validations"],
      "additionalProperties": false
    },
    "validationUpdate": {
      "type": "object",
      "properties": {
        "candidateId": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/candidateId"
        },
        "validation": {
          "$ref": "codex-security://schemas/tools/candidate-validations.schema.json#/$defs/validationRecord"
        }
      },
      "required": ["candidateId", "validation"],
      "additionalProperties": false
    },
    "validationRecord": {
      "type": "object",
      "properties": {
        "disposition": {
          "enum": ["reportable", "suppressed", "not_applicable", "deferred"],
          "type": "string"
        },
        "method": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "confidence": { "enum": ["high", "medium", "low"], "type": "string" },
        "confidence_rationale": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "rubric": {
          "anyOf": [
            {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            {
              "type": "object",
              "properties": {},
              "additionalProperties": true
            },
            {
              "minItems": 1,
              "type": "array",
              "items": {
                "anyOf": [
                  {
                    "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
                  },
                  {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": true
                  }
                ]
              }
            }
          ]
        },
        "evidence": {
          "anyOf": [
            {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            {
              "minItems": 1,
              "type": "array",
              "items": {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
              }
            }
          ]
        },
        "counterevidence_or_proof_gap": { "type": "string" },
        "remaining_uncertainty": { "type": "string" },
        "artifact_paths": {
          "type": "array",
          "items": {
            "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
          }
        },
        "source": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "control": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "sink": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "preconditions": {
          "anyOf": [
            {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            {
              "minItems": 1,
              "type": "array",
              "items": {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
              }
            }
          ]
        }
      },
      "required": [
        "disposition",
        "method",
        "confidence",
        "confidence_rationale",
        "rubric",
        "evidence",
        "counterevidence_or_proof_gap",
        "remaining_uncertainty"
      ],
      "additionalProperties": true
    }
  }
}
```

## File: `schemas/tools/discovery-candidates.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "codex-security://schemas/tools/discovery-candidates.schema.json",
  "$defs": {
    "workbenchRecordDiscoveryCandidatesInput": {
      "type": "object",
      "properties": {
        "scanId": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/nonEmptyText"
        },
        "candidates": {
          "type": "array",
          "items": {
            "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/rawDiscoveryCandidate"
          }
        }
      },
      "required": ["scanId", "candidates"],
      "additionalProperties": false
    },
    "workbenchListCandidatesInput": {
      "type": "object",
      "properties": {
        "scanId": {
          "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/nonEmptyText"
        },
        "cursor": { "type": "string", "pattern": "^(?:0|[1-9][0-9]*)$" },
        "limit": { "type": "integer", "minimum": 1, "maximum": 1000 }
      },
      "required": ["scanId"],
      "additionalProperties": false
    }
  }
}
```

## File: `schemas/tools/review-items.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "codex-security://schemas/tools/review-items.schema.json",
  "$defs": {
    "prepareInput": {
      "type": "object",
      "properties": {
        "scanId": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/scanId"
        },
        "handoffClaimToken": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        }
      },
      "required": ["scanId"],
      "additionalProperties": false
    },
    "reviewItemsInput": {
      "type": "object",
      "properties": {
        "scanId": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/scanId"
        },
        "handoffClaimToken": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "cursor": { "type": "string", "pattern": "^(?:0|[1-9][0-9]*)$" },
        "limit": { "type": "integer", "minimum": 1, "maximum": 1000 }
      },
      "required": ["scanId"],
      "additionalProperties": false
    },
    "reviewItem": {
      "type": "object",
      "properties": {
        "path": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/repositoryPath"
        }
      },
      "required": ["path"],
      "additionalProperties": false
    }
  }
}
```

## File: `schemas/tools/scan-draft.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "codex-security://schemas/tools/scan-draft.schema.json",
  "title": "Codex Security semantic scan draft",
  "$ref": "#/$defs/scanDraftInput",
  "$defs": {
    "text": {
      "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
    },
    "textList": {
      "type": "array",
      "items": {
        "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
      }
    },
    "scanId": {
      "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/scanId"
    },
    "handoffClaimToken": {
      "type": "string",
      "pattern": "^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|recovery_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$"
    },
    "repositoryPath": {
      "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/repositoryPath"
    },
    "location": {
      "type": "object",
      "properties": {
        "path": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/repositoryPath"
        },
        "startLine": { "type": "integer", "minimum": 1 },
        "endLine": { "type": "integer", "minimum": 1 },
        "role": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        }
      },
      "required": ["path", "startLine"],
      "additionalProperties": true
    },
    "identity": {
      "type": "object",
      "properties": {
        "anchor": { "type": "string", "pattern": "^[a-z0-9][a-z0-9._/-]*$" },
        "instance": { "type": "string", "pattern": "^[a-z0-9][a-z0-9._/-]*$" }
      },
      "required": ["anchor"],
      "additionalProperties": true
    },
    "severity": {
      "type": "object",
      "properties": {
        "level": {
          "enum": ["critical", "high", "medium", "low", "informational"]
        },
        "score": { "type": "number", "minimum": 0, "maximum": 10 },
        "scoringSystem": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "vector": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "rationale": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "changeConditions": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        }
      },
      "required": ["level"],
      "additionalProperties": true
    },
    "confidence": {
      "type": "object",
      "properties": {
        "level": { "enum": ["high", "medium", "low"] },
        "rationale": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        }
      },
      "required": ["level", "rationale"],
      "additionalProperties": true
    },
    "taxonomy": {
      "type": "object",
      "properties": {
        "category": {
          "description": "The actual primary broken security control, not a CWE identifier.",
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "cwe": {
          "description": "Copy the reviewed candidate's exact cwe_ids array. Use an empty array when no CWE is established; do not invent one.",
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        }
      },
      "required": ["category", "cwe"],
      "additionalProperties": true
    },
    "codeEvidence": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z0-9][a-z0-9._/-]*$" },
        "label": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "path": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/repositoryPath"
        },
        "startLine": { "type": "integer", "minimum": 1 },
        "endLine": { "type": "integer", "minimum": 1 },
        "language": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "role": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "code": {
          "description": "The genuine, nonempty source snippet at this evidence location.",
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "explanation": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        }
      },
      "required": ["id", "label", "path", "startLine", "code", "explanation"],
      "additionalProperties": true
    },
    "findingAssessment": {
      "anyOf": [
        {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        {
          "type": "object",
          "properties": {
            "level": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "rationale": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "why": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            }
          },
          "additionalProperties": true
        }
      ]
    },
    "textOrSummary": {
      "anyOf": [
        {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        {
          "type": "object",
          "properties": {
            "summary": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "source": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "sink": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "outcome": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "transformations": {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
            },
            "evidenceRefs": {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
            },
            "evidence_refs": false
          },
          "additionalProperties": true
        }
      ]
    },
    "findingReachability": {
      "anyOf": [
        {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        {
          "type": "object",
          "properties": {
            "summary": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "attacker": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "entrypoint": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "source": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "sink": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "outcome": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "preconditions": {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
            },
            "evidenceRefs": {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
            },
            "evidence_refs": false
          },
          "additionalProperties": true
        }
      ]
    },
    "findingValidation": {
      "type": "object",
      "properties": {
        "assertions": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "counterEvidence": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "evidence": {
          "anyOf": [
            {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
            }
          ]
        },
        "evidenceRefs": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "evidence_refs": false,
        "limitations": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "method": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "status": {
          "anyOf": [
            {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            { "type": "null" }
          ]
        },
        "summary": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "disposition": {
          "anyOf": [
            {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            { "type": "null" }
          ]
        },
        "result": {
          "anyOf": [
            {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            { "type": "null" }
          ]
        }
      },
      "additionalProperties": true
    },
    "findingAttackPath": {
      "type": "object",
      "properties": {
        "assumptions": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "blindspots": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "controls": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "dataFlow": false,
        "data_flow": false,
        "dataflow": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textOrSummary"
        },
        "evidenceRefs": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "evidence_refs": false,
        "impact": {
          "anyOf": [
            {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/findingAssessment"
            },
            { "type": "null" }
          ]
        },
        "likelihood": {
          "anyOf": [
            {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/findingAssessment"
            },
            { "type": "null" }
          ]
        },
        "limitations": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "preconditions": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "reachability": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/findingReachability"
        },
        "steps": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "summary": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        }
      },
      "additionalProperties": true
    },
    "finding": {
      "type": "object",
      "properties": {
        "findingId": false,
        "occurrenceId": false,
        "fingerprints": false,
        "ruleId": {
          "type": "string",
          "pattern": "^[a-z0-9][a-z0-9._/-]*$",
          "description": "A stable lowercase vulnerability-family slug, such as prototype-pollution.json-patch; a CWE is taxonomy, not a rule ID."
        },
        "identity": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/identity"
        },
        "title": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "summary": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "severity": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/severity"
        },
        "confidence": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/confidence"
        },
        "taxonomy": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/taxonomy"
        },
        "locations": {
          "minItems": 1,
          "type": "array",
          "items": {
            "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/location"
          }
        },
        "writeup": {
          "type": "object",
          "properties": {
            "reportPath": {
              "type": "string",
              "pattern": "^findings/([a-z0-9][a-z0-9._-]*)/\\1\\.md$"
            }
          },
          "required": ["reportPath"],
          "additionalProperties": true
        },
        "codeEvidence": {
          "type": "array",
          "items": {
            "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/codeEvidence"
          }
        },
        "code_evidence": false,
        "rootCause": {
          "anyOf": [
            {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            {
              "type": "object",
              "properties": {
                "summary": {
                  "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
                },
                "code": false,
                "language": false,
                "evidenceRefs": {
                  "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
                },
                "evidence_refs": false
              },
              "required": ["summary"],
              "additionalProperties": true
            }
          ]
        },
        "root_cause": false,
        "remediation": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "validation": {
          "anyOf": [
            {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/findingValidation"
            },
            { "type": "null" }
          ]
        },
        "attackPath": {
          "anyOf": [
            {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/findingAttackPath"
            },
            { "type": "null" }
          ]
        },
        "remediationTests": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "preventiveControls": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "provenance": {
          "type": "object",
          "properties": {
            "sourceFindingIds": {
              "type": "array",
              "items": {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
              },
              "uniqueItems": true,
              "description": "IDs of the Standard scan findings grouped into this Deep scan finding."
            },
            "sourceFindings": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
                  },
                  "finding": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": true
                  }
                },
                "required": ["id", "finding"],
                "additionalProperties": false
              },
              "description": "Original Standard scan findings retained by the host."
            },
            "source": {
              "description": "The actual finding producer. Use local_plugin only for a finding discovered by this plugin.",
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            }
          },
          "required": ["source"],
          "additionalProperties": true
        },
        "extensions": {
          "type": "object",
          "properties": {},
          "additionalProperties": true
        }
      },
      "required": [
        "ruleId",
        "title",
        "summary",
        "severity",
        "confidence",
        "taxonomy",
        "locations",
        "remediation",
        "provenance"
      ],
      "additionalProperties": true
    },
    "scope": {
      "type": "object",
      "properties": {
        "includePaths": false,
        "excludePaths": false,
        "summary": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "artifactsReviewed": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        },
        "runtimeStatus": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "validationMode": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "context": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "limitations": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
        }
      },
      "additionalProperties": true
    },
    "threatModel": {
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "summary": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "assets": {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
            },
            "trustBoundaries": {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
            },
            "attackerCapabilities": {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
            },
            "securityObjectives": {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
            },
            "assumptions": {
              "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
            }
          },
          "required": ["summary"],
          "additionalProperties": true
        },
        {
          "type": "object",
          "properties": {
            "format": { "const": "markdown" },
            "content": {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            "scope": {
              "type": "object",
              "properties": {
                "includePaths": {
                  "type": "array",
                  "items": { "type": "string", "minLength": 1 }
                },
                "excludePaths": {
                  "type": "array",
                  "items": { "type": "string", "minLength": 1 }
                },
                "summary": { "type": "string", "minLength": 1 }
              },
              "required": ["includePaths"],
              "additionalProperties": true,
              "description": "The modeled source scope, which may differ from the scan scope. Omit when unknown."
            },
            "origin": {
              "enum": ["generated", "provided", "reconciled", "recovered"]
            }
          },
          "required": ["format", "content"],
          "additionalProperties": true
        }
      ],
      "description": "Retained threat-model content. Existing structured models remain supported; Markdown documents preserve their complete original body."
    },
    "surface": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z0-9][a-z0-9._/-]*$" },
        "label": {
          "description": "The meaningful name of the reviewed security surface.",
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "disposition": {
          "enum": [
            "reported",
            "no_issue_found",
            "rejected",
            "not_applicable",
            "needs_follow_up"
          ],
          "description": "The evidence-supported review result for this surface."
        },
        "receiptRefs": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "pattern": "^(?!.*(?:^|/)\\.\\.(?:/|$))(?!.*\\\\)artifacts/.+$"
          }
        },
        "riskArea": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "notes": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        }
      },
      "required": ["label", "disposition"],
      "additionalProperties": true
    },
    "reviewState": {
      "type": "object",
      "properties": {
        "documentType": false,
        "schemaVersion": false,
        "scanId": false,
        "mode": false,
        "includePaths": false,
        "excludePaths": false,
        "receiptRefs": false,
        "inventoryStrategy": false,
        "surfaces": {
          "type": "array",
          "items": {
            "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/surface"
          }
        },
        "explicitExclusions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "pattern": {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
              },
              "reason": {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
              }
            },
            "required": ["pattern", "reason"],
            "additionalProperties": true
          }
        },
        "deferred": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
              },
              "candidateId": {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/candidateId"
              },
              "reason": {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
              },
              "paths": {
                "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
              },
              "surfaceIds": {
                "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/textList"
              }
            },
            "required": ["reason"],
            "additionalProperties": true
          },
          "description": "Each supplied id identifies one task and must be unique within this draft. Reuse saved IDs in later updates."
        },
        "resolvedDeferred": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
              },
              "reason": {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
              }
            },
            "required": ["id", "reason"],
            "additionalProperties": false
          },
          "description": "On final Standard or diff drafts, close generic tasks by saved ID and completion reason. Reuse saved surface IDs for updates. Candidate tasks need findings or dispositions; redundant closure entries for those outcomes are ignored."
        },
        "openQuestions": {
          "type": "array",
          "items": {
            "anyOf": [
              {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
              },
              {
                "type": "object",
                "properties": {
                  "question": {
                    "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
                  },
                  "followUpPrompt": {
                    "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
                  }
                },
                "required": ["question"],
                "additionalProperties": true
              }
            ]
          }
        }
      },
      "required": ["surfaces", "explicitExclusions", "deferred"],
      "additionalProperties": true
    },
    "scanDraftInput": {
      "type": "object",
      "properties": {
        "complete": {
          "type": "boolean",
          "description": "Set false to save progress without declaring this worker or parent audit finished. Omit or set true only for the terminal result. Put provisional candidates in reviewState.deferred, not findings."
        },
        "scanId": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/scanId"
        },
        "handoffClaimToken": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/handoffClaimToken"
        },
        "scope": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/scope"
        },
        "threatModel": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/threatModel"
        },
        "findings": {
          "type": "array",
          "items": {
            "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/finding"
          }
        },
        "reviewState": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/reviewState"
        }
      },
      "required": ["scanId", "findings", "reviewState"],
      "additionalProperties": false
    },
    "completedScanInput": {
      "type": "object",
      "properties": {
        "scanId": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/scanId"
        },
        "handoffClaimToken": {
          "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/handoffClaimToken"
        }
      },
      "required": ["scanId"],
      "additionalProperties": false
    }
  }
}
```
