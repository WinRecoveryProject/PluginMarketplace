# Plugin files: codex-security — `schemas/`

Source: `plugins/codex-security`. Files outside the `skills/*` folders, embedded as text.

## File: `schemas/coverage.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://openai.com/codex-security/schemas/coverage.schema.json",
  "title": "Codex Security scan coverage",
  "type": "object",
  "required": [
    "documentType",
    "schemaVersion",
    "scanId",
    "mode",
    "completeness",
    "inventoryStrategy",
    "includePaths",
    "excludePaths",
    "surfaces",
    "explicitExclusions",
    "deferred"
  ],
  "properties": {
    "documentType": {
      "const": "codex-security.coverage"
    },
    "schemaVersion": {
      "const": "1.0"
    },
    "scanId": {
      "type": "string",
      "minLength": 1
    },
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
    "completeness": {
      "enum": [
        "complete",
        "partial",
        "unknown"
      ]
    },
    "inventoryStrategy": {
      "enum": [
        "repository",
        "scoped_path",
        "diff",
        "directory",
        "custom"
      ]
    },
    "includePaths": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "excludePaths": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "surfaces": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "id",
          "label",
          "disposition",
          "receiptRefs"
        ],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1
          },
          "label": {
            "type": "string",
            "minLength": 1
          },
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
          "riskArea": {
            "type": "string",
            "minLength": 1
          },
          "notes": {
            "type": "string",
            "minLength": 1
          }
        }
      }
    },
    "explicitExclusions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "pattern",
          "reason"
        ],
        "properties": {
          "pattern": {
            "type": "string",
            "minLength": 1
          },
          "reason": {
            "type": "string",
            "minLength": 1
          }
        }
      }
    },
    "deferred": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "id",
          "reason"
        ],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1
          },
          "reason": {
            "type": "string",
            "minLength": 1
          },
          "paths": {
            "type": "array",
            "items": {
              "type": "string",
              "minLength": 1
            }
          },
          "surfaceIds": {
            "type": "array",
            "items": {
              "type": "string",
              "minLength": 1
            }
          }
        }
      }
    },
    "openQuestions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "question"
        ],
        "properties": {
          "question": {
            "type": "string",
            "minLength": 1
          },
          "followUpPrompt": {
            "type": "string",
            "minLength": 1
          }
        }
      }
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "completeness": {
            "const": "complete"
          }
        },
        "required": [
          "completeness"
        ]
      },
      "then": {
        "properties": {
          "deferred": {
            "contains": {},
            "minContains": 0,
            "maxContains": 0
          },
          "surfaces": {
            "contains": {
              "type": "object",
              "required": [
                "disposition"
              ],
              "properties": {
                "disposition": {
                  "const": "needs_follow_up"
                }
              }
            },
            "minContains": 0,
            "maxContains": 0
          }
        }
      }
    }
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
      "pattern": "\\S"
    },
    "scanId": {
      "type": "string",
      "format": "uuid"
    },
    "repositoryPath": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4096,
      "pattern": "^(?:\\./)?(?!/)(?![A-Za-z]:)(?!.*\\\\)(?!.*(?:^|/)\\.\\.?(/|$))(?!.*//)(?!.*[\\u0000-\\u001f\\u007f])(?!.*\\/$).+$"
    },
    "candidateId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 512,
      "pattern": "^(?!\\.{1,2}$)(?!.*[\\u0000-\\u001f\\u007f])(?=.*\\S)[^/\\\\]+$"
    },
    "page": {
      "type": "object",
      "properties": {
        "cursor": {
          "type": "string",
          "pattern": "^(?:0|[1-9][0-9]*)$"
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000
        }
      },
      "additionalProperties": false
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
    "nonEmptyText": {
      "type": "string",
      "pattern": "\\S"
    },
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
        "path": { "$ref": "#/$defs/nonEmptyText" },
        "start_line": { "type": "integer", "minimum": 1 },
        "end_line": { "type": "integer", "minimum": 1 },
        "role": { "$ref": "#/$defs/locationRole" }
      },
      "required": ["path", "start_line", "role"],
      "additionalProperties": false
    },
    "normalizedDiscoveryLocation": {
      "type": "object",
      "properties": {
        "path": { "$ref": "#/$defs/nonEmptyText" },
        "start_line": { "type": "integer", "minimum": 1 },
        "end_line": { "type": "integer", "minimum": 1 },
        "role": { "$ref": "#/$defs/locationRole" }
      },
      "required": ["path", "start_line", "end_line", "role"],
      "additionalProperties": false
    },
    "rawDiscoveryCandidate": {
      "type": "object",
      "properties": {
        "cwe_ids": {
          "type": "array",
          "items": { "$ref": "#/$defs/cweId" }
        },
        "locations": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/rawDiscoveryLocation" }
        },
        "summary": { "$ref": "#/$defs/nonEmptyText" },
        "evidence": { "$ref": "#/$defs/nonEmptyText" },
        "context": { "$ref": "#/$defs/nonEmptyText" },
        "instance": { "$ref": "#/$defs/nonEmptyText" }
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
          "items": {
            "type": "string",
            "pattern": "^CWE-[1-9][0-9]*$"
          }
        },
        "locations": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/normalizedDiscoveryLocation" }
        },
        "summary": { "$ref": "#/$defs/nonEmptyText" },
        "evidence": { "$ref": "#/$defs/nonEmptyText" },
        "context": { "$ref": "#/$defs/nonEmptyText" },
        "instance": { "$ref": "#/$defs/nonEmptyText" }
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
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://openai.com/codex-security/schemas/findings.schema.json",
  "title": "Codex Security findings",
  "type": "object",
  "required": [
    "documentType",
    "schemaVersion",
    "scanId",
    "findings"
  ],
  "properties": {
    "documentType": {
      "const": "codex-security.findings"
    },
    "schemaVersion": {
      "const": "1.0"
    },
    "scanId": {
      "type": "string",
      "minLength": 1
    },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
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
        ],
        "properties": {
          "findingId": {
            "type": "string",
            "pattern": "^csf_[a-f0-9]{24}$"
          },
          "occurrenceId": {
            "type": "string",
            "pattern": "^occ_[a-f0-9]{24}$"
          },
          "ruleId": {
            "type": "string",
            "pattern": "^[a-z0-9][a-z0-9._/-]*$"
          },
          "identity": {
            "type": "object",
            "required": [
              "anchor"
            ],
            "properties": {
              "anchor": {
                "type": "string",
                "pattern": "^[a-z0-9][a-z0-9._/-]*$"
              },
              "instance": {
                "type": "string",
                "pattern": "^[a-z0-9][a-z0-9._/-]*$"
              }
            }
          },
          "fingerprints": {
            "type": "object",
            "required": [
              "algorithm",
              "primary"
            ],
            "properties": {
              "algorithm": {
                "const": "codex-security/v1"
              },
              "primary": {
                "type": "string",
                "pattern": "^codex-security/v1:sha256:[a-f0-9]{64}$"
              }
            }
          },
          "title": {
            "type": "string",
            "minLength": 1
          },
          "summary": {
            "type": "string",
            "minLength": 1
          },
          "severity": {
            "type": "object",
            "required": [
              "level"
            ],
            "properties": {
              "level": {
                "enum": [
                  "critical",
                  "high",
                  "medium",
                  "low",
                  "informational"
                ]
              },
              "score": {
                "type": "number",
                "minimum": 0,
                "maximum": 10
              },
              "scoringSystem": {
                "type": "string",
                "minLength": 1
              },
              "vector": {
                "type": "string",
                "minLength": 1
              },
              "rationale": {
                "type": "string",
                "minLength": 1
              },
              "changeConditions": {
                "type": "string",
                "minLength": 1
              }
            }
          },
          "confidence": {
            "type": "object",
            "required": [
              "level",
              "rationale"
            ],
            "properties": {
              "level": {
                "enum": [
                  "high",
                  "medium",
                  "low"
                ]
              },
              "rationale": {
                "type": "string",
                "minLength": 1
              }
            }
          },
          "taxonomy": {
            "type": "object",
            "required": [
              "category",
              "cwe"
            ],
            "properties": {
              "category": {
                "type": "string",
                "minLength": 1
              },
              "cwe": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              }
            }
          },
          "locations": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": [
                "path",
                "startLine"
              ],
              "properties": {
                "path": {
                  "type": "string",
                  "minLength": 1
                },
                "startLine": {
                  "type": "integer",
                  "minimum": 1
                },
                "endLine": {
                  "type": "integer",
                  "minimum": 1
                },
                "role": {
                  "type": "string",
                  "minLength": 1
                }
              }
            }
          },
          "writeup": {
            "type": "object",
            "required": [
              "reportPath"
            ],
            "properties": {
              "reportPath": {
                "type": "string",
                "pattern": "^findings/([a-z0-9][a-z0-9._-]*)/\\1\\.md$"
              }
            }
          },
          "codeEvidence": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "id",
                "label",
                "path",
                "startLine",
                "code",
                "explanation"
              ],
              "properties": {
                "id": {
                  "type": "string",
                  "pattern": "^[a-z0-9][a-z0-9._/-]*$"
                },
                "label": {
                  "type": "string",
                  "minLength": 1
                },
                "path": {
                  "type": "string",
                  "minLength": 1
                },
                "startLine": {
                  "type": "integer",
                  "minimum": 1
                },
                "endLine": {
                  "type": "integer",
                  "minimum": 1
                },
                "language": {
                  "type": "string",
                  "minLength": 1
                },
                "role": {
                  "type": "string",
                  "minLength": 1
                },
                "code": {
                  "type": "string",
                  "minLength": 1
                },
                "explanation": {
                  "type": "string",
                  "minLength": 1
                }
              }
            }
          },
          "code_evidence": {
            "type": [
              "array",
              "null"
            ],
            "items": {
              "type": "object",
              "required": [
                "id",
                "code"
              ],
              "properties": {
                "id": {
                  "type": "string",
                  "minLength": 1
                },
                "code": {
                  "type": "string",
                  "minLength": 1
                }
              }
            }
          },
          "rootCause": {
            "type": [
              "object",
              "string"
            ],
            "required": [
              "summary"
            ],
            "properties": {
              "summary": {
                "type": "string",
                "minLength": 1
              },
              "evidenceRefs": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "code": {
                "type": "string",
                "minLength": 1
              },
              "language": {
                "type": "string",
                "minLength": 1
              }
            }
          },
          "root_cause": {
            "type": [
              "object",
              "string",
              "null"
            ],
            "properties": {
              "summary": {
                "type": "string",
                "minLength": 1
              },
              "evidenceRefs": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "evidence_refs": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "code": {
                "type": "string",
                "minLength": 1
              },
              "language": {
                "type": "string",
                "minLength": 1
              }
            }
          },
          "remediation": {
            "type": "string",
            "minLength": 1
          },
          "validation": {
            "type": [
              "object",
              "null"
            ],
            "properties": {
              "assertions": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "counterEvidence": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "evidence": {
                "type": [
                  "string",
                  "array"
                ],
                "minLength": 1,
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "evidenceRefs": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "evidence_refs": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "limitations": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "method": {
                "type": "string",
                "minLength": 1
              },
              "status": {
                "type": [
                  "string",
                  "null"
                ],
                "minLength": 1
              },
              "summary": {
                "type": "string",
                "minLength": 1
              },
              "disposition": {
                "type": [
                  "string",
                  "null"
                ],
                "minLength": 1
              },
              "result": {
                "type": [
                  "string",
                  "null"
                ],
                "minLength": 1
              }
            }
          },
          "attackPath": {
            "type": [
              "object",
              "null"
            ],
            "properties": {
              "assumptions": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "blindspots": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "controls": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "dataFlow": {
                "type": [
                  "string",
                  "object"
                ],
                "minLength": 1,
                "properties": {
                  "summary": { "type": "string", "minLength": 1 },
                  "source": { "type": "string", "minLength": 1 },
                  "sink": { "type": "string", "minLength": 1 },
                  "outcome": { "type": "string", "minLength": 1 },
                  "transformations": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 }
                  },
                  "evidenceRefs": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 }
                  },
                  "evidence_refs": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 }
                  }
                }
              },
              "data_flow": {
                "type": [
                  "string",
                  "object"
                ],
                "minLength": 1,
                "properties": {
                  "summary": { "type": "string", "minLength": 1 },
                  "source": { "type": "string", "minLength": 1 },
                  "sink": { "type": "string", "minLength": 1 },
                  "outcome": { "type": "string", "minLength": 1 },
                  "transformations": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 }
                  },
                  "evidenceRefs": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 }
                  },
                  "evidence_refs": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 }
                  }
                }
              },
              "dataflow": {
                "type": [
                  "string",
                  "object"
                ],
                "minLength": 1,
                "properties": {
                  "summary": { "type": "string", "minLength": 1 },
                  "source": { "type": "string", "minLength": 1 },
                  "sink": { "type": "string", "minLength": 1 },
                  "outcome": { "type": "string", "minLength": 1 },
                  "transformations": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 }
                  },
                  "evidenceRefs": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 }
                  },
                  "evidence_refs": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 }
                  }
                }
              },
              "evidenceRefs": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "evidence_refs": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "impact": {
                "type": [
                  "string",
                  "object",
                  "null"
                ],
                "minLength": 1,
                "properties": {
                  "level": { "type": "string", "minLength": 1 },
                  "rationale": { "type": "string", "minLength": 1 },
                  "why": { "type": "string", "minLength": 1 }
                }
              },
              "likelihood": {
                "type": [
                  "string",
                  "object",
                  "null"
                ],
                "minLength": 1,
                "properties": {
                  "level": { "type": "string", "minLength": 1 },
                  "rationale": { "type": "string", "minLength": 1 },
                  "why": { "type": "string", "minLength": 1 }
                }
              },
              "limitations": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "preconditions": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "reachability": {
                "type": [
                  "string",
                  "object"
                ],
                "minLength": 1,
                "properties": {
                  "summary": { "type": "string", "minLength": 1 },
                  "attacker": { "type": "string", "minLength": 1 },
                  "entrypoint": { "type": "string", "minLength": 1 },
                  "source": { "type": "string", "minLength": 1 },
                  "sink": { "type": "string", "minLength": 1 },
                  "outcome": { "type": "string", "minLength": 1 },
                  "preconditions": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 }
                  },
                  "evidenceRefs": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 }
                  },
                  "evidence_refs": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 }
                  }
                }
              },
              "steps": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "summary": {
                "type": "string",
                "minLength": 1
              }
            }
          },
          "remediationTests": {
            "type": "array",
            "items": {
              "type": "string",
              "minLength": 1
            }
          },
          "preventiveControls": {
            "type": "array",
            "items": {
              "type": "string",
              "minLength": 1
            }
          },
          "provenance": {
            "type": "object",
            "required": [
              "source"
            ],
            "properties": {
              "source": {
                "type": "string",
                "minLength": 1
              }
            }
          },
          "extensions": {
            "type": "object",
            "properties": {
              "candidateId": {
                "type": "string",
                "minLength": 1
              },
              "ledgerRowId": {
                "type": "string",
                "minLength": 1
              },
              "reportId": {
                "type": "string",
                "minLength": 1
              }
            }
          }
        }
      }
    }
  }
}
```

## File: `schemas/scan-manifest.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://openai.com/codex-security/schemas/scan-manifest.schema.json",
  "title": "Codex Security sealed scan manifest",
  "type": "object",
  "required": [
    "documentType",
    "schemaVersion",
    "scan"
  ],
  "properties": {
    "documentType": {
      "const": "codex-security.scan-manifest"
    },
    "schemaVersion": {
      "const": "1.0"
    },
    "scan": {
      "type": "object",
      "required": [
        "id",
        "producer",
        "status",
        "startedAt",
        "completedAt",
        "sealedAt",
        "target",
        "scope",
        "coverageRef",
        "findingsRef",
        "artifacts"
      ],
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1
        },
        "producer": {
          "type": "object",
          "required": [
            "name",
            "version"
          ],
          "properties": {
            "name": {
              "type": "string",
              "minLength": 1
            },
            "version": {
              "type": "string",
              "minLength": 1
            }
          }
        },
        "status": {
          "enum": ["completed", "failed", "canceled", "interrupted"]
        },
        "startedAt": {
          "type": "string",
          "format": "date-time"
        },
        "completedAt": {
          "type": "string",
          "format": "date-time"
        },
        "sealedAt": {
          "type": "string",
          "format": "date-time"
        },
        "target": {
          "type": "object",
          "required": [
            "kind",
            "targetId",
            "displayName"
          ],
          "properties": {
            "kind": {
              "enum": [
                "git_revision",
                "git_worktree",
                "git_diff",
                "directory_snapshot"
              ]
            },
            "targetId": {
              "type": "string",
              "minLength": 1
            },
            "displayName": {
              "type": "string",
              "minLength": 1
            },
            "remote": {
              "type": "string",
              "pattern": "^(?![^:/?#]+://[^/?#]*@)[^?#]+$"
            },
            "revision": {
              "type": "string"
            },
            "baseRevision": {
              "type": "string"
            },
            "headRevision": {
              "type": "string"
            },
            "snapshotDigest": {
              "type": "string",
              "pattern": "^codex-security-snapshot/v1:sha256:[a-f0-9]{64}$"
            }
          },
          "allOf": [
            {
              "if": {
                "properties": {
                  "kind": {
                    "const": "git_revision"
                  }
                }
              },
              "then": {
                "required": [
                  "revision"
                ]
              }
            },
            {
              "if": {
                "properties": {
                  "kind": {
                    "enum": [
                      "git_worktree",
                      "git_diff",
                      "directory_snapshot"
                    ]
                  }
                }
              },
              "then": {
                "required": [
                  "snapshotDigest"
                ]
              }
            }
          ]
        },
        "scope": {
          "type": "object",
          "required": [
            "includePaths",
            "excludePaths"
          ],
          "properties": {
            "includePaths": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "excludePaths": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "summary": {
              "type": "string",
              "minLength": 1
            },
            "artifactsReviewed": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              }
            },
            "runtimeStatus": {
              "type": "string",
              "minLength": 1
            },
            "validationMode": {
              "type": "string",
              "minLength": 1
            },
            "context": {
              "type": "string",
              "minLength": 1
            },
            "limitations": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              }
            }
          }
        },
        "threatModel": {
          "type": "object",
          "required": [
            "summary"
          ],
          "properties": {
            "summary": {
              "type": "string",
              "minLength": 1
            },
            "assets": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              }
            },
            "trustBoundaries": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              }
            },
            "attackerCapabilities": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              }
            },
            "securityObjectives": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              }
            },
            "assumptions": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              }
            }
          }
        },
        "hardening": {
          "type": "object",
          "required": [
            "portfolioPath"
          ],
          "properties": {
            "portfolioPath": {
              "const": "hardening/hardening.md"
            }
          }
        },
        "coverageRef": {
          "const": "coverage.json"
        },
        "findingsRef": {
          "const": "findings.json"
        },
        "artifacts": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "required": [
              "path",
              "sha256",
              "mediaType"
            ],
            "properties": {
              "path": {
                "type": "string",
                "minLength": 1,
                "pattern": "^(?!/)(?!.*(?:^|/)\\.\\.(?:/|$))(?!.*\\\\).+$"
              },
              "sha256": {
                "type": "string",
                "pattern": "^[a-f0-9]{64}$"
              },
              "mediaType": {
                "type": "string",
                "minLength": 1
              }
            }
          }
        }
      },
      "allOf": [
        {
          "properties": {
            "artifacts": {
              "contains": {
                "type": "object",
                "required": [
                  "path"
                ],
                "properties": {
                  "path": {
                    "const": "findings.json"
                  }
                }
              },
              "minContains": 1,
              "maxContains": 1
            }
          }
        },
        {
          "properties": {
            "artifacts": {
              "contains": {
                "type": "object",
                "required": [
                  "path"
                ],
                "properties": {
                  "path": {
                    "const": "coverage.json"
                  }
                }
              },
              "minContains": 1,
              "maxContains": 1
            }
          }
        }
      ]
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
  "type": "object",
  "additionalProperties": false,
  "required": ["scanId", "attackPaths"],
  "properties": {
    "scanId": {
      "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/scanId"
    },
    "attackPaths": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/attackPathUpdate"
      }
    }
  },
  "$defs": {
    "input": {
      "type": "object",
      "additionalProperties": false,
      "required": ["scanId", "attackPaths"],
      "properties": {
        "scanId": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/scanId"
        },
        "attackPaths": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/attackPathUpdate"
          }
        }
      }
    },
    "updatesPayload": {
      "type": "object",
      "additionalProperties": false,
      "required": ["attackPaths"],
      "properties": {
        "attackPaths": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/attackPathUpdate"
          }
        }
      }
    },
    "attackPathUpdate": {
      "type": "object",
      "additionalProperties": false,
      "required": ["candidateId", "attackPath"],
      "properties": {
        "candidateId": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/candidateId"
        },
        "attackPath": {
          "$ref": "#/$defs/attackPath"
        }
      }
    },
    "attackPath": {
      "oneOf": [
        {
          "$ref": "#/$defs/reportableAttackPath"
        },
        {
          "$ref": "#/$defs/ignoredAttackPath"
        },
        {
          "$ref": "#/$defs/deferredAttackPath"
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
      "impact": {
        "enum": ["high", "medium", "low", "ignore", "unknown"]
      },
      "likelihood": {
        "enum": ["high", "medium", "low", "ignore", "unknown"]
      },
      "severity_rationale": {
        "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
      },
      "change_conditions": {
        "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
      }
    },
    "reportableAttackPath": {
      "type": "object",
      "additionalProperties": true,
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
      "properties": {
        "decision": { "const": "reportable" },
        "dataflow": { "$ref": "#/$defs/attackPathFields/dataflow" },
        "reachability": { "$ref": "#/$defs/attackPathFields/reachability" },
        "counterevidence": { "$ref": "#/$defs/attackPathFields/counterevidence" },
        "impact": { "$ref": "#/$defs/attackPathFields/impact" },
        "likelihood": { "$ref": "#/$defs/attackPathFields/likelihood" },
        "severity": { "enum": ["critical", "high", "medium", "low"] },
        "severity_rationale": { "$ref": "#/$defs/attackPathFields/severity_rationale" },
        "change_conditions": { "$ref": "#/$defs/attackPathFields/change_conditions" }
      }
    },
    "ignoredAttackPath": {
      "type": "object",
      "additionalProperties": true,
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
      "properties": {
        "decision": { "const": "ignore" },
        "dataflow": { "$ref": "#/$defs/attackPathFields/dataflow" },
        "reachability": { "$ref": "#/$defs/attackPathFields/reachability" },
        "counterevidence": { "$ref": "#/$defs/attackPathFields/counterevidence" },
        "impact": { "$ref": "#/$defs/attackPathFields/impact" },
        "likelihood": { "$ref": "#/$defs/attackPathFields/likelihood" },
        "severity": { "const": "ignore" },
        "severity_rationale": { "$ref": "#/$defs/attackPathFields/severity_rationale" },
        "change_conditions": { "$ref": "#/$defs/attackPathFields/change_conditions" }
      }
    },
    "deferredAttackPath": {
      "type": "object",
      "additionalProperties": true,
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
      "properties": {
        "decision": { "const": "deferred" },
        "dataflow": { "$ref": "#/$defs/attackPathFields/dataflow" },
        "reachability": { "$ref": "#/$defs/attackPathFields/reachability" },
        "counterevidence": { "$ref": "#/$defs/attackPathFields/counterevidence" },
        "impact": { "$ref": "#/$defs/attackPathFields/impact" },
        "likelihood": { "$ref": "#/$defs/attackPathFields/likelihood" },
        "severity": { "enum": ["critical", "high", "medium", "low", "unknown"] },
        "severity_rationale": { "$ref": "#/$defs/attackPathFields/severity_rationale" },
        "change_conditions": { "$ref": "#/$defs/attackPathFields/change_conditions" },
        "proof_gap": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        }
      }
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
  "type": "object",
  "additionalProperties": false,
  "required": ["scanId", "validations"],
  "properties": {
    "scanId": {
      "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/scanId"
    },
    "validations": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/validationUpdate"
      }
    }
  },
  "$defs": {
    "input": {
      "type": "object",
      "additionalProperties": false,
      "required": ["scanId", "validations"],
      "properties": {
        "scanId": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/scanId"
        },
        "validations": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/validationUpdate"
          }
        }
      }
    },
    "updatesPayload": {
      "type": "object",
      "additionalProperties": false,
      "required": ["validations"],
      "properties": {
        "validations": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/validationUpdate"
          }
        }
      }
    },
    "validationUpdate": {
      "type": "object",
      "additionalProperties": false,
      "required": ["candidateId", "validation"],
      "properties": {
        "candidateId": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/candidateId"
        },
        "validation": {
          "$ref": "#/$defs/validationRecord"
        }
      }
    },
    "validationRecord": {
      "type": "object",
      "additionalProperties": true,
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
      "properties": {
        "disposition": {
          "type": "string",
          "enum": ["reportable", "suppressed", "not_applicable", "deferred"]
        },
        "method": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "confidence": {
          "type": "string",
          "enum": ["high", "medium", "low"]
        },
        "confidence_rationale": {
          "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
        },
        "rubric": {
          "anyOf": [
            {
              "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
            },
            {
              "type": "object"
            },
            {
              "type": "array",
              "minItems": 1,
              "items": {
                "anyOf": [
                  {
                    "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
                  },
                  {
                    "type": "object"
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
              "type": "array",
              "minItems": 1,
              "items": {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
              }
            }
          ]
        },
        "counterevidence_or_proof_gap": {
          "type": "string"
        },
        "remaining_uncertainty": {
          "type": "string"
        },
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
              "type": "array",
              "minItems": 1,
              "items": {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
              }
            }
          ]
        }
      }
    }
  }
}
```

## File: `schemas/tools/deep-reducer.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "codex-security://schemas/tools/deep-reducer.schema.json",
  "title": "Codex Security Deep Scan semantic reducer operations",
  "$ref": "#/$defs/reductionInput",
  "$defs": {
    "reducerInputs": {
      "type": "object",
      "additionalProperties": false
    },
    "reductionInput": {
      "$ref": "codex-security://schemas/tools/scan-draft.schema.json#/$defs/scanDraftInput"
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
    "recordDiscoveryCandidatesInput": {
      "type": "object",
      "properties": {
        "candidates": {
          "type": "array",
          "items": {
            "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/rawDiscoveryCandidate"
          }
        }
      },
      "required": ["candidates"],
      "additionalProperties": false
    },
    "workbenchRecordDiscoveryCandidatesInput": {
      "type": "object",
      "properties": {
        "scanId": { "type": "string", "pattern": "\\S" },
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
    "listCandidatesInput": {
      "type": "object",
      "properties": {
        "cursor": {
          "type": "string",
          "pattern": "^(?:0|[1-9][0-9]*)$"
        },
        "limit": { "type": "integer", "minimum": 1, "maximum": 1000 }
      },
      "additionalProperties": false
    },
    "workbenchListCandidatesInput": {
      "type": "object",
      "properties": {
        "scanId": { "type": "string", "pattern": "\\S" },
        "cursor": {
          "type": "string",
          "pattern": "^(?:0|[1-9][0-9]*)$"
        },
        "limit": { "type": "integer", "minimum": 1, "maximum": 1000 }
      },
      "required": ["scanId"],
      "additionalProperties": false
    },
    "recordDiscoveryCandidatesResult": {
      "type": "object",
      "properties": {
        "operation": { "const": "replace" },
        "candidatesRecorded": { "type": "integer", "minimum": 0 }
      },
      "required": ["operation", "candidatesRecorded"],
      "additionalProperties": false
    },
    "listCandidatesResult": {
      "type": "object",
      "properties": {
        "rows": {
          "type": "array",
          "items": {
            "$ref": "codex-security://schemas/definitions/discovery-candidate.schema.json#/$defs/discoveryCandidate"
          }
        },
        "nextCursor": {
          "type": "string",
          "pattern": "^(?:0|[1-9][0-9]*)$"
        }
      },
      "required": ["rows"],
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
    "prepareOutput": {
      "type": "object",
      "properties": {
        "reviewItemsTotal": {
          "type": "integer",
          "minimum": 0
        }
      },
      "required": ["reviewItemsTotal"],
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
        "cursor": {
          "type": "string",
          "pattern": "^(?:0|[1-9][0-9]*)$"
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000
        }
      },
      "required": ["scanId"],
      "additionalProperties": false
    },
    "reviewItemsWorkerInput": {
      "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/page"
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
    },
    "reviewItemsOutput": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "items": { "$ref": "#/$defs/reviewItem" }
        },
        "nextCursor": {
          "type": "string",
          "pattern": "^(?:0|[1-9][0-9]*)$"
        }
      },
      "required": ["items"],
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
  "$defs": {
    "text": {
      "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/nonEmptyText"
    },
    "textList": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/text"
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
          "$ref": "#/$defs/repositoryPath"
        },
        "startLine": {
          "type": "integer",
          "minimum": 1
        },
        "endLine": {
          "type": "integer",
          "minimum": 1
        },
        "role": {
          "$ref": "#/$defs/text"
        }
      },
      "required": [
        "path",
        "startLine"
      ],
      "additionalProperties": true
    },
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
      "required": [
        "anchor"
      ],
      "additionalProperties": true
    },
    "severity": {
      "type": "object",
      "properties": {
        "level": {
          "enum": [
            "critical",
            "high",
            "medium",
            "low",
            "informational"
          ]
        },
        "score": {
          "type": "number",
          "minimum": 0,
          "maximum": 10
        },
        "scoringSystem": {
          "$ref": "#/$defs/text"
        },
        "vector": {
          "$ref": "#/$defs/text"
        },
        "rationale": {
          "$ref": "#/$defs/text"
        },
        "changeConditions": {
          "$ref": "#/$defs/text"
        }
      },
      "required": [
        "level"
      ],
      "additionalProperties": true
    },
    "confidence": {
      "type": "object",
      "properties": {
        "level": {
          "enum": [
            "high",
            "medium",
            "low"
          ]
        },
        "rationale": {
          "$ref": "#/$defs/text"
        }
      },
      "required": [
        "level",
        "rationale"
      ],
      "additionalProperties": true
    },
    "taxonomy": {
      "type": "object",
      "properties": {
        "category": {
          "$ref": "#/$defs/text",
          "description": "The actual primary broken security control, not a CWE identifier."
        },
        "cwe": {
          "$ref": "#/$defs/textList",
          "description": "Copy the reviewed candidate's exact cwe_ids array. Use an empty array when no CWE is established; do not invent one."
        }
      },
      "required": [
        "category",
        "cwe"
      ],
      "additionalProperties": true
    },
    "codeEvidence": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-z0-9][a-z0-9._/-]*$"
        },
        "label": {
          "$ref": "#/$defs/text"
        },
        "path": {
          "$ref": "#/$defs/repositoryPath"
        },
        "startLine": {
          "type": "integer",
          "minimum": 1
        },
        "endLine": {
          "type": "integer",
          "minimum": 1
        },
        "language": {
          "$ref": "#/$defs/text"
        },
        "role": {
          "$ref": "#/$defs/text"
        },
        "code": {
          "$ref": "#/$defs/text",
          "description": "The genuine, nonempty source snippet at this evidence location."
        },
        "explanation": {
          "$ref": "#/$defs/text"
        }
      },
      "required": [
        "id",
        "label",
        "path",
        "startLine",
        "code",
        "explanation"
      ],
      "additionalProperties": true
    },
    "legacyCodeEvidence": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/text"
        },
        "code": {
          "$ref": "#/$defs/text"
        }
      },
      "required": [
        "id",
        "code"
      ],
      "additionalProperties": true
    },
    "findingAssessment": {
      "anyOf": [
        {
          "$ref": "#/$defs/text"
        },
        {
          "type": "object",
          "properties": {
            "level": {
              "$ref": "#/$defs/text"
            },
            "rationale": {
              "$ref": "#/$defs/text"
            },
            "why": {
              "$ref": "#/$defs/text"
            }
          },
          "additionalProperties": true
        }
      ]
    },
    "textOrSummary": {
      "anyOf": [
        {
          "$ref": "#/$defs/text"
        },
        {
          "type": "object",
          "properties": {
            "summary": {
              "$ref": "#/$defs/text"
            },
            "source": {
              "$ref": "#/$defs/text"
            },
            "sink": {
              "$ref": "#/$defs/text"
            },
            "outcome": {
              "$ref": "#/$defs/text"
            },
            "transformations": {
              "$ref": "#/$defs/textList"
            },
            "evidenceRefs": {
              "$ref": "#/$defs/textList"
            },
            "evidence_refs": {
              "$ref": "#/$defs/textList"
            }
          },
          "additionalProperties": true
        }
      ]
    },
    "findingReachability": {
      "anyOf": [
        {
          "$ref": "#/$defs/text"
        },
        {
          "type": "object",
          "properties": {
            "summary": {
              "$ref": "#/$defs/text"
            },
            "attacker": {
              "$ref": "#/$defs/text"
            },
            "entrypoint": {
              "$ref": "#/$defs/text"
            },
            "source": {
              "$ref": "#/$defs/text"
            },
            "sink": {
              "$ref": "#/$defs/text"
            },
            "outcome": {
              "$ref": "#/$defs/text"
            },
            "preconditions": {
              "$ref": "#/$defs/textList"
            },
            "evidenceRefs": {
              "$ref": "#/$defs/textList"
            },
            "evidence_refs": {
              "$ref": "#/$defs/textList"
            }
          },
          "additionalProperties": true
        }
      ]
    },
    "findingValidation": {
      "type": "object",
      "properties": {
        "assertions": {
          "$ref": "#/$defs/textList"
        },
        "counterEvidence": {
          "$ref": "#/$defs/textList"
        },
        "evidence": {
          "anyOf": [
            {
              "$ref": "#/$defs/text"
            },
            {
              "$ref": "#/$defs/textList"
            }
          ]
        },
        "evidenceRefs": {
          "$ref": "#/$defs/textList"
        },
        "evidence_refs": {
          "$ref": "#/$defs/textList"
        },
        "limitations": {
          "$ref": "#/$defs/textList"
        },
        "method": {
          "$ref": "#/$defs/text"
        },
        "status": {
          "anyOf": [
            {
              "$ref": "#/$defs/text"
            },
            {
              "type": "null"
            }
          ]
        },
        "summary": {
          "$ref": "#/$defs/text"
        },
        "disposition": {
          "anyOf": [
            {
              "$ref": "#/$defs/text"
            },
            {
              "type": "null"
            }
          ]
        },
        "result": {
          "anyOf": [
            {
              "$ref": "#/$defs/text"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "additionalProperties": true
    },
    "findingAttackPath": {
      "type": "object",
      "properties": {
        "assumptions": {
          "$ref": "#/$defs/textList"
        },
        "blindspots": {
          "$ref": "#/$defs/textList"
        },
        "controls": {
          "$ref": "#/$defs/textList"
        },
        "dataFlow": {
          "$ref": "#/$defs/textOrSummary"
        },
        "data_flow": {
          "$ref": "#/$defs/textOrSummary"
        },
        "dataflow": {
          "$ref": "#/$defs/textOrSummary"
        },
        "evidenceRefs": {
          "$ref": "#/$defs/textList"
        },
        "evidence_refs": {
          "$ref": "#/$defs/textList"
        },
        "impact": {
          "anyOf": [
            {
              "$ref": "#/$defs/findingAssessment"
            },
            {
              "type": "null"
            }
          ]
        },
        "likelihood": {
          "anyOf": [
            {
              "$ref": "#/$defs/findingAssessment"
            },
            {
              "type": "null"
            }
          ]
        },
        "limitations": {
          "$ref": "#/$defs/textList"
        },
        "preconditions": {
          "$ref": "#/$defs/textList"
        },
        "reachability": {
          "$ref": "#/$defs/findingReachability"
        },
        "steps": {
          "$ref": "#/$defs/textList"
        },
        "summary": {
          "$ref": "#/$defs/text"
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
          "$ref": "#/$defs/identity"
        },
        "title": {
          "$ref": "#/$defs/text"
        },
        "summary": {
          "$ref": "#/$defs/text"
        },
        "severity": {
          "$ref": "#/$defs/severity"
        },
        "confidence": {
          "$ref": "#/$defs/confidence"
        },
        "taxonomy": {
          "$ref": "#/$defs/taxonomy"
        },
        "locations": {
          "type": "array",
          "minItems": 1,
          "items": {
            "$ref": "#/$defs/location"
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
          "required": [
            "reportPath"
          ],
          "additionalProperties": true
        },
        "codeEvidence": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/codeEvidence"
          }
        },
        "code_evidence": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/legacyCodeEvidence"
          }
        },
        "rootCause": {
          "anyOf": [
            {
              "$ref": "#/$defs/text"
            },
            {
              "type": "object",
              "properties": {
                "summary": {
                  "$ref": "#/$defs/text"
                },
                "code": {
                  "$ref": "#/$defs/text"
                },
                "language": {
                  "$ref": "#/$defs/text"
                },
                "evidenceRefs": {
                  "$ref": "#/$defs/textList"
                }
              },
              "required": [
                "summary"
              ],
              "additionalProperties": true
            }
          ]
        },
        "root_cause": {
          "anyOf": [
            {
              "$ref": "#/$defs/text"
            },
            {
              "type": "object",
              "properties": {
                "summary": {
                  "$ref": "#/$defs/text"
                },
                "code": {
                  "$ref": "#/$defs/text"
                },
                "language": {
                  "$ref": "#/$defs/text"
                },
                "evidenceRefs": {
                  "$ref": "#/$defs/textList"
                },
                "evidence_refs": {
                  "$ref": "#/$defs/textList"
                }
              },
              "additionalProperties": true
            }
          ]
        },
        "remediation": {
          "$ref": "#/$defs/text"
        },
        "validation": {
          "anyOf": [
            {
              "$ref": "#/$defs/findingValidation"
            },
            {
              "type": "null"
            }
          ]
        },
        "attackPath": {
          "anyOf": [
            {
              "$ref": "#/$defs/findingAttackPath"
            },
            {
              "type": "null"
            }
          ]
        },
        "remediationTests": {
          "$ref": "#/$defs/textList"
        },
        "preventiveControls": {
          "$ref": "#/$defs/textList"
        },
        "provenance": {
          "type": "object",
          "properties": {
            "sourceFindingIds": {
              "type": "array",
              "items": { "$ref": "#/$defs/text" },
              "uniqueItems": true,
              "description": "Host-provided source finding references represented by this Deep reduction. Preserve every assigned reference exactly once."
            },
            "sourceFindings": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": { "$ref": "#/$defs/text" },
                  "finding": { "type": "object", "additionalProperties": true }
                },
                "required": ["id", "finding"],
                "additionalProperties": false
              },
              "description": "Original source payloads retained by the host for lossless semantic merges."
            },
            "source": {
              "$ref": "#/$defs/text",
              "description": "The actual finding producer. Use local_plugin only for a finding discovered by this plugin."
            }
          },
          "required": [
            "source"
          ],
          "additionalProperties": true
        },
        "extensions": {
          "type": "object",
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
          "$ref": "#/$defs/text"
        },
        "artifactsReviewed": {
          "$ref": "#/$defs/textList"
        },
        "runtimeStatus": {
          "$ref": "#/$defs/text"
        },
        "validationMode": {
          "$ref": "#/$defs/text"
        },
        "context": {
          "$ref": "#/$defs/text"
        },
        "limitations": {
          "$ref": "#/$defs/textList"
        }
      },
      "additionalProperties": true
    },
    "threatModel": {
      "type": "object",
      "properties": {
        "summary": {
          "$ref": "#/$defs/text"
        },
        "assets": {
          "$ref": "#/$defs/textList"
        },
        "trustBoundaries": {
          "$ref": "#/$defs/textList"
        },
        "attackerCapabilities": {
          "$ref": "#/$defs/textList"
        },
        "securityObjectives": {
          "$ref": "#/$defs/textList"
        },
        "assumptions": {
          "$ref": "#/$defs/textList"
        }
      },
      "required": [
        "summary"
      ],
      "additionalProperties": true
    },
    "surface": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-z0-9][a-z0-9._/-]*$"
        },
        "label": {
          "$ref": "#/$defs/text",
          "description": "The meaningful name of the reviewed security surface."
        },
        "disposition": {
          "description": "The evidence-supported review result for this surface.",
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
        "riskArea": {
          "$ref": "#/$defs/text"
        },
        "notes": {
          "$ref": "#/$defs/text"
        }
      },
      "required": [
        "label",
        "disposition"
      ],
      "additionalProperties": true
    },
    "coverage": {
      "type": "object",
      "properties": {
        "documentType": false,
        "schemaVersion": false,
        "scanId": false,
        "mode": false,
        "includePaths": false,
        "excludePaths": false,
        "receiptRefs": false,
        "completeness": {
          "description": "Use partial if any work is deferred or any surface needs follow-up; use complete only when no such work remains.",
          "enum": [
            "complete",
            "partial",
            "unknown"
          ]
        },
        "inventoryStrategy": false,
        "surfaces": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/surface"
          }
        },
        "explicitExclusions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "pattern": {
                "$ref": "#/$defs/text"
              },
              "reason": {
                "$ref": "#/$defs/text"
              }
            },
            "required": [
              "pattern",
              "reason"
            ],
            "additionalProperties": true
          }
        },
        "deferred": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "$ref": "#/$defs/text"
              },
              "candidateId": {
                "$ref": "codex-security://schemas/definitions/artifact-common.schema.json#/$defs/candidateId"
              },
              "reason": {
                "$ref": "#/$defs/text"
              },
              "paths": {
                "$ref": "#/$defs/textList"
              },
              "surfaceIds": {
                "$ref": "#/$defs/textList"
              }
            },
            "required": [
              "reason"
            ],
            "additionalProperties": true
          }
        },
        "openQuestions": {
          "type": "array",
          "items": {
            "anyOf": [
              {
                "$ref": "#/$defs/text"
              },
              {
                "type": "object",
                "properties": {
                  "question": {
                    "$ref": "#/$defs/text"
                  },
                  "followUpPrompt": {
                    "$ref": "#/$defs/text"
                  }
                },
                "required": [
                  "question"
                ],
                "additionalProperties": true
              }
            ]
          }
        }
      },
      "required": [
        "completeness",
        "surfaces",
        "explicitExclusions",
        "deferred"
      ],
      "additionalProperties": true
    },
    "scanDraftInput": {
      "type": "object",
      "properties": {
        "complete": {
          "type": "boolean",
          "description": "Set false to save progress without declaring this worker or parent audit finished. Omit or set true only for the terminal result. Put provisional candidates in coverage.deferred, not findings."
        },
        "scanId": {
          "$ref": "#/$defs/scanId"
        },
        "handoffClaimToken": {
          "$ref": "#/$defs/handoffClaimToken"
        },
        "scope": {
          "$ref": "#/$defs/scope"
        },
        "threatModel": {
          "$ref": "#/$defs/threatModel"
        },
        "findings": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/finding"
          }
        },
        "coverage": {
          "$ref": "#/$defs/coverage"
        }
      },
      "required": [
        "scanId",
        "findings",
        "coverage"
      ],
      "additionalProperties": false
    },
    "completedScanInput": {
      "type": "object",
      "properties": {
        "scanId": {
          "$ref": "#/$defs/scanId"
        },
        "handoffClaimToken": {
          "$ref": "#/$defs/handoffClaimToken"
        }
      },
      "required": [
        "scanId"
      ],
      "additionalProperties": false
    }
  },
  "$ref": "#/$defs/scanDraftInput"
}
```

## File: `schemas/tools/worker-threat-model.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "codex-security://schemas/tools/worker-threat-model.schema.json",
  "$defs": {
    "recordWorkerThreatModelInput": {
      "type": "object",
      "properties": {
        "content": {
          "type": "string",
          "minLength": 1,
          "pattern": "\\S"
        }
      },
      "required": ["content"],
      "additionalProperties": false
    }
  }
}
```
