# Skill: powershell-agent-harness-development

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/powershell-agent-harness-development/SKILL.md`

> Build or review PowerShell orchestration for local or hosted AI models, coding agents, capability registries, evaluations, checkpoints, session exports, and provider switching.

## Instructions

### PowerShell Agent Harness Development

Use this skill when PowerShell controls a model endpoint, coding-agent CLI, capability registry, evaluation harness, provider profile, context checkpoint, or session export.

1. Read [references/agent-harness-patterns.md](powershell-agent-harness-development.md#file-referencesagent-harness-patternsmd) for the applicable modes only.
2. Separate deterministic authority from model assistance. Paths, manifests, permissions, hashes, timestamps, approval state, and pass/fail decisions must be validated by code; model output may summarize or classify only after validation.
3. Bind evidence to model identifier and digest, provider/endpoint, host, context configuration, project profile, capability version, fixture hash, and timestamp. Do not generalize one successful run to another configuration.
4. Permit loopback endpoints by default. Treat remote endpoints, silent cloud fallback, credential transmission, and connector writes as separate capabilities requiring explicit authorization and evidence.
5. Make provider/config changes reversible: preflight, exact backup, scoped edit, post-check, explicit restore, and actionable failure state. Never leave a partially switched profile reported as ready.
6. Preserve raw evidence and produce structured JSON results before Markdown summaries. Reject empty output, malformed structured output, unsafe paths, stale evidence, and unknown status values.
7. Use mock/contract tests before live model calls. Live tests must have bounded repetitions, timeouts, no automatic destructive retries, and persisted failure classification.

#### Packaged artifacts

- Use `../../scripts/Resolve-PowerShellWorkbenchCodexDesktop.ps1` to locate the deterministic Codex Desktop binary. Do not use a PATH/npm Codex installation unless a task explicitly supplies `-CodexPath`.
- Use `../../scripts/New-PowerShellWorkbenchLocalModelCatalog.ps1` to derive a local-model catalog from that binary's `debug models --bundled` schema.
  It prefers a legacy-compatible unified-exec template, removes unasserted Responses Lite/code-mode/multi-agent/cloud-service-tier transport claims,
  and fails closed if the serialized catalog retains an unsupported Ollama transport property. Omit `-ExpectedCodexSha256` for normal deterministic
  Desktop discovery, or supply it only when a separately certified executable digest is available. Supply certified model and context values; do not
  invent reasoning levels, speed tiers, modalities, or online-only tool claims.
- Use `../../scripts/Invoke-PowerShellWorkbenchCodexJson.ps1` to capture a bounded `codex exec --json` run. It requires PowerShell 7 because reliable argument passing, asynchronous waits, cancellation, and process-tree termination use modern .NET APIs. Supply `-CatalogManifestPath` when the run relies on a generated local model catalog.
- Use `../../scripts/Test-PowerShellWorkbenchCodexEvidence.ps1` separately to validate the capture. A process exit code of zero and a plausible final message are insufficient when any tool, policy, approval, schema, or turn event failed.
- Use `../../scripts/Invoke-PowerShellWorkbenchOllamaChat.ps1` to prepare a deterministic direct Ollama chat request.
  It remains `ANALYZE_ONLY` unless `-Execute` is explicit, permits only the credential-free literal loopback-IP HTTP `/api/chat` endpoint,
  disables streaming and thinking, and bounds prompt, request, response, timeout, and output tokens. Returned tool calls are evidence only and are never executed.
  Supply `-ContextTokens` when a frozen comparison requires an explicit `num_ctx`; the request binds that value, while effective runtime context remains `UNKNOWN` until independently observed.
- Use `../../scripts/Test-PowerShellWorkbenchOllamaEvidence.ps1` with an independently recorded metadata SHA-256. The response can attest the observed model id but not the model digest; accepting the caller-bound digest requires explicit `-AcceptUnverifiedModelDigest` and must not be reported as runtime attestation.
- Use `../../scripts/Compare-PowerShellWorkbenchOllamaEvidence.ps1` with
  [assets/templates/model-comparison-manifest.json.tmpl](powershell-agent-harness-development.md#file-assetstemplatesmodel-comparison-manifestjsontmpl) to compare
  frozen validated captures for one prompt and request configuration. Quality is decided by the manifest's exact UTF-8
  answer hash before performance ranking. Missing evidence or metrics is `UNKNOWN`; hash, path, prompt, identity, or
  configuration drift is `CONFLICT`. The comparator never retries, calls a model, writes output, or transports evidence.
- For one controlled file-slice proposal, add `-EnableReadFileSliceProposal` to the bounded Ollama request and require `-ExpectReadFileSliceProposal` during evidence validation. The model only proposes `read_file_slice`; it never authorizes or executes it.
- Use `../../scripts/New-PowerShellWorkbenchReadOnlyToolProposal.ps1` to extract exactly one validated call into deterministic JSON, then `../../scripts/New-PowerShellWorkbenchReadOnlyToolApproval.ps1` to bind a separately reviewed target snapshot. Approval remains preview-only unless `-Approve` is explicit.
- Use `../../scripts/Resolve-PowerShellWorkbenchReadOnlyToolChain.ps1` for the read-only decision and
  `../../scripts/Invoke-PowerShellWorkbenchReadOnlyTool.ps1` for the bounded read. Missing, stale, or unknown evidence is
  `UNKNOWN`; hash, path, binding, reparse, target, or observation drift is `CONFLICT`. Execution requires `-Execute`, writes
  only new evidence under an explicit scoped evidence root, and never performs transport, process launch, target writes,
  provider switching, Desktop lifecycle, or clipboard access.
- Use `../../scripts/Test-PowerShellWorkbenchHealth.ps1` before relying on installed plugin or catalog evidence. Supply explicit distribution source/cache pairs and catalog manifests; require catalog evidence when a downstream run depends on it. Unknown versions, duplicate roots, tree drift, stale manifests, missing artifacts, and hash drift fail closed without changing the installation.
- Use `../../scripts/Invoke-PowerShellWorkbenchDoctor.ps1` for one read-only overview of explicitly supplied project and distribution evidence. Its default runtime state is `SKIPPED`; use `-IncludeRuntimeProbe` only when a child-PowerShell version/architecture probe is desired. It never discovers a marketplace source by guessing and never launches quality or model operations.
- Use `../../scripts/Get-PowerShellWorkbenchStatusDashboard.ps1` with an independently hashed
  [release-provenance template](powershell-agent-harness-development.md#file-assetstemplatesrelease-provenancejsontmpl) to distinguish declared version, found
  source/cache trees, and validated release identity. It reuses health gates, binds every source tree to one commit/ref
  provenance record, returns `UNKNOWN` for missing state and `CONFLICT` for drift, and performs no write, execution, or
  transport.
- Use `../../scripts/Get-PowerShellWorkbenchCatalogMigrationPreview.ps1` to assess a schema 1.0 catalog before migration.
  Supply the expected manifest hash, an explicit destination, a scoped allowed write root, and an authoritative reference
  time. The previewer requires fully qualified paths and exact transport scalar types, and rejects stale, future, drifted,
  unknown, unsafe-transport, and reparse-ambiguous evidence. It never
  writes or launches Codex: verified schema 1.0 evidence returns a generator- and policy-hash-bound regeneration plan,
  schema 1.1 returns `NO_CHANGE`, and failures preserve exact blocking gates. Applying the plan remains separately authorized.
- `-AllowedAdvisoryRegex` is an opt-in, exact advisory mechanism for known host notices only. It can never allow tool, policy, approval, schema, or turn failures; keep each pattern as narrow as the observed advisory text.
- Use `../../scripts/Resolve-PowerShellWorkbenchGateGroups.ps1` to evaluate named gate groups without collapsing safe runtime preparation into host certification. Consumers must select the exact group required for an action and preserve the returned failed-gate names.
- Copy and adapt [assets/templates/provider-switch-transaction.ps1.tmpl](powershell-agent-harness-development.md#file-assetstemplatesprovider-switch-transactionps1tmpl) for reversible provider configuration changes.
  Its read-only resume decision verifies phase, freshness, paths, hashes, provider/model/context identity, loopback endpoint, wire API, local-model catalog,
  owned keys, canonical owned state, managed-state absence, and restore evidence before allowing apply, managed commit, post-check, or restore continuation.
  `ProviderProfileWritten` and `DesktopLifecycleInterrupted` return `ManagedCommitRequired` without repeating the provider edit or invoking Desktop lifecycle work.
- Use `../../scripts/New-PowerShellWorkbenchHandoff.ps1` with [assets/templates/handoff-input.json.tmpl](powershell-agent-harness-development.md#file-assetstemplateshandoff-inputjsontmpl) to create schema-bound JSON and Markdown handoffs. The generator writes local non-executable artifacts only; task, Drive, GitHub, or connector transport is always a separate explicitly authorized action.
- Windows PowerShell 5.1 can run the evidence validator, contract tests, and provider-switch template, but it must not be used for the bounded runner.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "PowerShell Agent Harness"
  short_description: "Build safe AI agent harnesses"
  icon_small: "./assets/skill-icon.png"
  icon_large: "./assets/skill-icon.png"
  brand_color: "#2671BE"
  default_prompt: "Use $powershell-agent-harness-development to build or review this PowerShell agent harness."
```

### File: `assets/schemas/powershell-workbench-handoff.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://zilvereyes.github.io/PowerShellWorkbench/schemas/handoff-input-1.0.json",
  "title": "PowerShell Workbench portable handoff input",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "handoffId",
    "createdAt",
    "source",
    "destination",
    "project",
    "objective",
    "verifiedFacts",
    "changedFiles",
    "testResults",
    "unresolvedDecisions",
    "authorityBoundaries",
    "safetyBoundaries",
    "requestedActions",
    "reloadCanary"
  ],
  "properties": {
    "schemaVersion": {
      "const": "1.0"
    },
    "handoffId": {
      "type": "string",
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "source": {
      "$ref": "#/$defs/task"
    },
    "destination": {
      "$ref": "#/$defs/task"
    },
    "project": {
      "type": "object",
      "additionalProperties": false,
      "required": ["root", "pluginVersion", "pluginSha256"],
      "properties": {
        "root": {
          "type": "string",
          "minLength": 1
        },
        "pluginVersion": {
          "type": "string",
          "minLength": 1
        },
        "pluginSha256": {
          "$ref": "#/$defs/sha256"
        }
      }
    },
    "objective": {
      "type": "string",
      "minLength": 1
    },
    "verifiedFacts": {
      "oneOf": [
        {
          "type": "array",
          "items": {
            "$ref": "#/$defs/fact"
          }
        },
        {
          "$ref": "#/$defs/fact"
        }
      ]
    },
    "changedFiles": {
      "oneOf": [
        {
          "type": "array",
          "items": {
            "$ref": "#/$defs/fileEvidence"
          }
        },
        {
          "$ref": "#/$defs/fileEvidence"
        }
      ]
    },
    "testResults": {
      "oneOf": [
        {
          "type": "array",
          "items": {
            "$ref": "#/$defs/testResult"
          }
        },
        {
          "$ref": "#/$defs/testResult"
        }
      ]
    },
    "unresolvedDecisions": {
      "$ref": "#/$defs/stringArray"
    },
    "authorityBoundaries": {
      "$ref": "#/$defs/stringArray"
    },
    "safetyBoundaries": {
      "$ref": "#/$defs/stringArray"
    },
    "requestedActions": {
      "$ref": "#/$defs/stringArray"
    },
    "reloadCanary": {
      "type": "string",
      "minLength": 1
    }
  },
  "$defs": {
    "sha256": {
      "type": "string",
      "pattern": "^[a-fA-F0-9]{64}$"
    },
    "stringArray": {
      "oneOf": [
        {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1
          }
        },
        {
          "type": "string",
          "minLength": 1
        }
      ]
    },
    "task": {
      "type": "object",
      "additionalProperties": false,
      "required": ["taskId", "title"],
      "properties": {
        "taskId": {
          "type": "string",
          "minLength": 1
        },
        "title": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "fileEvidence": {
      "type": "object",
      "additionalProperties": false,
      "required": ["path", "sha256"],
      "properties": {
        "path": {
          "type": "string",
          "minLength": 1
        },
        "sha256": {
          "$ref": "#/$defs/sha256"
        }
      }
    },
    "fact": {
      "type": "object",
      "additionalProperties": false,
      "required": ["statement", "evidence"],
      "properties": {
        "statement": {
          "type": "string",
          "minLength": 1
        },
        "evidence": {
          "oneOf": [
            {
              "type": "array",
              "minItems": 1,
              "items": {
                "$ref": "#/$defs/fileEvidence"
              }
            },
            {
              "$ref": "#/$defs/fileEvidence"
            }
          ]
        }
      }
    },
    "testResult": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "runtime", "status", "evidenceSha256"],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1
        },
        "runtime": {
          "type": "string",
          "minLength": 1
        },
        "status": {
          "enum": ["Passed", "Failed", "Blocked", "NotRun"]
        },
        "evidenceSha256": {
          "$ref": "#/$defs/sha256"
        }
      }
    }
  }
}
```

### File: `assets/skill-icon.png`

_Binary asset, not embedded._

### File: `assets/templates/handoff-input.json.tmpl`

```text
{
  "schemaVersion": "1.0",
  "handoffId": "example-handoff",
  "createdAt": "2026-01-01T00:00:00Z",
  "source": { "taskId": "source-task-id", "title": "Source task" },
  "destination": { "taskId": "destination-task-id", "title": "Destination task" },
  "project": { "root": "C:\\Project", "pluginVersion": "0.0.0", "pluginSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
  "objective": "Describe the bounded objective.",
  "verifiedFacts": [
    { "statement": "Describe a verified fact.", "evidence": [{ "path": "evidence/result.json", "sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }] }
  ],
  "changedFiles": [{ "path": "scripts/example.ps1", "sha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" }],
  "testResults": [{ "name": "Contract tests", "runtime": "Windows PowerShell 5.1", "status": "Passed", "evidenceSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" }],
  "unresolvedDecisions": [],
  "authorityBoundaries": ["Deterministic code owns pass and fail decisions."],
  "safetyBoundaries": ["This artifact does not execute or transport anything."],
  "requestedActions": ["Review the validated local artifacts."],
  "reloadCanary": "PWB_HANDOFF_RELOAD_OK"
}
```

### File: `assets/templates/model-comparison-manifest.json.tmpl`

```text
{
  "schemaVersion": "1.0",
  "comparisonId": "<portable-comparison-id>",
  "task": {
    "taskId": "<frozen-task-id>",
    "promptSha256": "<64-hex-utf8-prompt-sha256>",
    "acceptance": {
      "kind": "exact-utf8-sha256",
      "expectedAnswerSha256": "<64-hex-utf8-answer-sha256>"
    }
  },
  "candidates": [
    {
      "candidateId": "<portable-candidate-id>",
      "metadataPath": "<fully-qualified-hash-bound-metadata-path>",
      "metadataSha256": "<64-hex-metadata-sha256>",
      "modelId": "<expected-model-id>",
      "modelDigest": "<64-hex-model-digest>"
    }
  ]
}
```

### File: `assets/templates/provider-switch-transaction.ps1.tmpl`

```text
[CmdletBinding(SupportsShouldProcess, DefaultParameterSetName = 'Apply')]
param(
    [Parameter(Mandatory)][string]$ConfigPath,
    [Parameter(Mandatory, ParameterSetName = 'Apply')][scriptblock]$ApplyScopedEdit,
    [Parameter(Mandatory, ParameterSetName = 'Apply')][scriptblock]$PostCheck,
    [Parameter(Mandatory, ParameterSetName = 'Apply')][string]$BackupDirectory,
    [Parameter(Mandatory, ParameterSetName = 'Restore')]
    [Parameter(Mandatory, ParameterSetName = 'Resume')][string]$TransactionPath,
    [Parameter(Mandatory, ParameterSetName = 'Restore')][switch]$Restore,
    [Parameter(Mandatory, ParameterSetName = 'Resume')][switch]$ResumeDecision,
    [Parameter(Mandatory, ParameterSetName = 'Apply')]
    [Parameter(Mandatory, ParameterSetName = 'Resume')][string]$ProviderId,
    [Parameter(Mandatory, ParameterSetName = 'Apply')]
    [Parameter(Mandatory, ParameterSetName = 'Resume')][string]$ModelId,
    [Parameter(Mandatory, ParameterSetName = 'Apply')]
    [Parameter(Mandatory, ParameterSetName = 'Resume')]
    [ValidateRange(1, [int]::MaxValue)][int]$EffectiveContext,
    [Parameter(Mandatory, ParameterSetName = 'Apply')]
    [Parameter(Mandatory, ParameterSetName = 'Resume')]
    [ValidateNotNullOrEmpty()][string[]]$OwnedKeys,
    [Parameter(Mandatory, ParameterSetName = 'Apply')]
    [Parameter(Mandatory, ParameterSetName = 'Resume')][string]$Endpoint,
    [Parameter(Mandatory, ParameterSetName = 'Apply')]
    [Parameter(Mandatory, ParameterSetName = 'Resume')][string]$WireApi,
    [Parameter(Mandatory, ParameterSetName = 'Apply')]
    [Parameter(Mandatory, ParameterSetName = 'Resume')][string]$CatalogPath,
    [Parameter(Mandatory, ParameterSetName = 'Apply')]
    [Parameter(Mandatory, ParameterSetName = 'Resume')]
    [ValidatePattern('^[a-fA-F0-9]{64}$')][string]$CatalogSha256,
    [Parameter(Mandatory, ParameterSetName = 'Apply')]
    [Parameter(Mandatory, ParameterSetName = 'Resume')][string]$ManagedStatePath,
    [Parameter(Mandatory, ParameterSetName = 'Apply')][scriptblock]$GetOwnedState,
    [Parameter(ParameterSetName = 'Resume')]
    [ValidateRange(1, [int]::MaxValue)][int]$MaximumJournalAgeMinutes = 1440,
    [Parameter(ParameterSetName = 'Resume')][datetime]$EvaluationTimeUtc = [datetime]::UtcNow
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$resolvedConfig = (Resolve-Path -LiteralPath $ConfigPath).Path
$knownPhases = @('Prepared', 'ProviderCommitted', 'ProviderProfileWritten', 'DesktopLifecycleInterrupted', 'PostCheckPending', 'Ready', 'RestorePending', 'Restored', 'FailedRestored')

function Get-Sha256Text {
    param([Parameter(Mandatory)][string]$Text)
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
        ([BitConverter]::ToString($algorithm.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
    } finally { $algorithm.Dispose() }
}

function Get-UtcDateTime {
    param([Parameter(Mandatory)][object]$Value)
    if ($Value -is [datetime]) { return ([datetime]$Value).ToUniversalTime() }
    [datetime]::ParseExact([string]$Value,'o',[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime()
}

function Get-RoundtripUtcText {
    param([Parameter(Mandatory)][object]$Value)
    (Get-UtcDateTime -Value $Value).ToString('o',[Globalization.CultureInfo]::InvariantCulture)
}

function Test-LoopbackEndpoint {
    param([Parameter(Mandatory)][string]$Value)
    try { $uri = [uri]$Value } catch { return $false }
    if (-not $uri.IsAbsoluteUri -or $uri.Scheme -notin @('http','https')) { return $false }
    if ($uri.Host -eq 'localhost') { return $true }
    $address = $null
    if (-not [Net.IPAddress]::TryParse($uri.Host, [ref]$address)) { return $false }
    [Net.IPAddress]::IsLoopback($address)
}

function Get-CanonicalOwnedState {
    param([Parameter(Mandatory)][object]$State)
    foreach ($name in @('providerId', 'modelId', 'effectiveContext', 'ownedValues')) {
        if ($null -eq $State.PSObject.Properties[$name]) { throw "Owned state is missing '$name'." }
    }
    if ([string]$State.providerId -ne $ProviderId) { throw 'Owned state provider identity does not match.' }
    if ([string]$State.modelId -ne $ModelId) { throw 'Owned state model identity does not match.' }
    if ([int]$State.effectiveContext -ne $EffectiveContext) { throw 'Owned state effective context does not match.' }
    $ownedValues = [ordered]@{}
    foreach ($key in $OwnedKeys) {
        if ($null -eq $State.ownedValues.PSObject.Properties[$key]) { throw "Owned state is missing key '$key'." }
        $ownedValues[$key] = $State.ownedValues.PSObject.Properties[$key].Value
    }
    [ordered]@{providerId=$ProviderId;modelId=$ModelId;effectiveContext=$EffectiveContext;ownedValues=$ownedValues}
}

function Write-TransactionJournal {
    param([Parameter(Mandatory)][object]$Journal, [Parameter(Mandatory)][string]$Path)
    $temporaryPath = "$Path.tmp"
    $Journal | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $temporaryPath -Encoding UTF8
    Move-Item -LiteralPath $temporaryPath -Destination $Path -Force
}

function Set-TransactionPhase {
    param([object]$Journal,[string]$Phase,[string]$Path,[string]$ConfigSha256,[string]$Detail)
    if ($knownPhases -notcontains $Phase) { throw "Unknown transaction phase '$Phase'." }
    $previousHash = if (@($Journal.phaseHistory).Count) { [string]$Journal.phaseHistory[-1].entrySha256 } else { $null }
    $entry = [ordered]@{phase=$Phase;recordedAt=[DateTime]::UtcNow.ToString('o');configSha256=$ConfigSha256;detail=$Detail;previousEntrySha256=$previousHash}
    $entry['entrySha256'] = Get-Sha256Text -Text ($entry | ConvertTo-Json -Depth 8 -Compress)
    $Journal.phase = $Phase
    $Journal.updatedAt = $entry.recordedAt
    $Journal.phaseHistory = @($Journal.phaseHistory) + @([pscustomobject]$entry)
    Write-TransactionJournal -Journal $Journal -Path $Path
}

function Test-PhaseHistory {
    param([Parameter(Mandatory)][object]$Journal)
    $previousHash = $null
    $previousPhase = $null
    $allowedTransitions = @{
        Prepared=@('ProviderCommitted','ProviderProfileWritten','RestorePending')
        ProviderCommitted=@('PostCheckPending','RestorePending')
        ProviderProfileWritten=@('DesktopLifecycleInterrupted','PostCheckPending','RestorePending')
        DesktopLifecycleInterrupted=@('PostCheckPending','RestorePending')
        PostCheckPending=@('Ready','RestorePending')
        Ready=@('RestorePending')
        RestorePending=@('Restored','FailedRestored')
        Restored=@()
        FailedRestored=@()
    }
    foreach ($entry in @($Journal.phaseHistory)) {
        foreach ($name in @('phase','recordedAt','configSha256','detail','previousEntrySha256','entrySha256')) {
            if ($null -eq $entry.PSObject.Properties[$name]) { return $false }
        }
        if ($knownPhases -notcontains [string]$entry.phase) { return $false }
        if ($null -eq $previousPhase) {
            if ([string]$entry.phase -ne 'Prepared') { return $false }
        } elseif ($allowedTransitions[$previousPhase] -notcontains [string]$entry.phase) { return $false }
        if ([string]$entry.previousEntrySha256 -ne [string]$previousHash) { return $false }
        $hashInput = [ordered]@{phase=[string]$entry.phase;recordedAt=Get-RoundtripUtcText $entry.recordedAt;configSha256=[string]$entry.configSha256;detail=[string]$entry.detail;previousEntrySha256=$previousHash}
        if ((Get-Sha256Text -Text ($hashInput | ConvertTo-Json -Depth 8 -Compress)) -ne [string]$entry.entrySha256) { return $false }
        $previousHash = [string]$entry.entrySha256
        $previousPhase = [string]$entry.phase
    }
    (@($Journal.phaseHistory).Count -gt 0 -and [string]$Journal.phaseHistory[-1].phase -eq [string]$Journal.phase)
}

function New-ResumeResult {
    param([string]$Decision,[bool]$Eligible,[bool]$ApplyRequired,[bool]$PostCheckRequired,[string[]]$FailedGates)
    [pscustomobject][ordered]@{
        schemaVersion='1.0';decision=$Decision;eligible=$Eligible;applyRequired=$ApplyRequired
        postCheckRequired=$PostCheckRequired
        ProviderSwitchRequired=$ApplyRequired
        ManagedCommitRequired=($Decision -eq 'ManagedCommitRequired')
        ResumedAfterProviderProfileWrite=($Decision -eq 'ManagedCommitRequired')
        DesktopLifecycleInvoked=$false
        phase=if($null -ne $script:resumeTransaction){[string]$script:resumeTransaction.phase}else{$null}
        failedGates=@($FailedGates)
    }
}

if ($PSCmdlet.ParameterSetName -eq 'Resume') {
    $script:resumeTransaction = $null
    if (-not (Test-Path -LiteralPath $TransactionPath -PathType Leaf)) {
        return New-ResumeResult -Decision 'Blocked' -Eligible $false -ApplyRequired $false -PostCheckRequired $false -FailedGates @('TransactionJournalPresent')
    }
    try { $script:resumeTransaction = Get-Content -LiteralPath $TransactionPath -Raw | ConvertFrom-Json }
    catch { return New-ResumeResult -Decision 'Blocked' -Eligible $false -ApplyRequired $false -PostCheckRequired $false -FailedGates @('TransactionJournalValid') }
    $transaction = $script:resumeTransaction
    $failedGates = New-Object System.Collections.Generic.List[string]
    if ($OwnedKeys.Count -ne (@($OwnedKeys | Select-Object -Unique)).Count) { $failedGates.Add('ExpectedOwnedKeysUnique') }
    foreach ($name in @('schemaVersion','phase','configPath','providerId','modelId','effectiveContext','ownedKeys','endpoint','wireApi','catalogPath','catalogSha256','managedStatePath','providerProfileState','providerProfileStateSha256','phaseHistory','updatedAt','backupPath','beforeSha256','afterSha256','ownedStateSha256')) {
        if ($null -eq $transaction.PSObject.Properties[$name]) { $failedGates.Add("TransactionField.$name") }
    }
    if ($failedGates.Count) { return New-ResumeResult -Decision 'Blocked' -Eligible $false -ApplyRequired $false -PostCheckRequired $false -FailedGates $failedGates.ToArray() }
    if ([string]$transaction.schemaVersion -ne '3.0') { $failedGates.Add('TransactionSchemaVersion') }
    if ($knownPhases -notcontains [string]$transaction.phase) { $failedGates.Add('TransactionPhaseKnown') }
    if ([string]$transaction.configPath -ne $resolvedConfig) { $failedGates.Add('TransactionConfigPath') }
    if ([string]$transaction.providerId -ne $ProviderId) { $failedGates.Add('TransactionProviderIdentity') }
    if ([string]$transaction.modelId -ne $ModelId) { $failedGates.Add('TransactionModelIdentity') }
    if ([int]$transaction.effectiveContext -ne $EffectiveContext) { $failedGates.Add('TransactionEffectiveContext') }
    if ((@($transaction.ownedKeys) -join "`n") -ne (@($OwnedKeys) -join "`n")) { $failedGates.Add('TransactionOwnedKeys') }
    if (-not (Test-LoopbackEndpoint -Value $Endpoint)) { $failedGates.Add('ExpectedEndpointLoopback') }
    if ([string]$transaction.endpoint -ne $Endpoint) { $failedGates.Add('TransactionEndpointIdentity') }
    if ([string]::IsNullOrWhiteSpace($WireApi) -or [string]$transaction.wireApi -ne $WireApi) { $failedGates.Add('TransactionWireApiIdentity') }
    $resolvedExpectedCatalog = $null
    try { $resolvedExpectedCatalog = (Resolve-Path -LiteralPath $CatalogPath).Path } catch { $failedGates.Add('ExpectedCatalogPresent') }
    if ($resolvedExpectedCatalog -and [string]$transaction.catalogPath -ne $resolvedExpectedCatalog) { $failedGates.Add('TransactionCatalogPath') }
    if ($resolvedExpectedCatalog -and (Get-FileHash -LiteralPath $resolvedExpectedCatalog -Algorithm SHA256).Hash.ToLowerInvariant() -ne $CatalogSha256.ToLowerInvariant()) { $failedGates.Add('ExpectedCatalogHash') }
    if ([string]$transaction.catalogSha256 -ne $CatalogSha256.ToLowerInvariant()) { $failedGates.Add('TransactionCatalogHash') }
    $resolvedExpectedManagedState = $null
    try {
        if (-not [IO.Path]::IsPathRooted($ManagedStatePath)) { $failedGates.Add('ExpectedManagedStatePathAbsolute') }
        else { $resolvedExpectedManagedState = [IO.Path]::GetFullPath($ManagedStatePath) }
    } catch { $failedGates.Add('ExpectedManagedStatePathValid') }
    if ($resolvedExpectedManagedState -and [string]$transaction.managedStatePath -ne $resolvedExpectedManagedState) { $failedGates.Add('TransactionManagedStatePath') }
    try {
        $recordedProviderProfileState = Get-CanonicalOwnedState -State $transaction.providerProfileState
        $recordedProviderProfileHash = Get-Sha256Text -Text ($recordedProviderProfileState | ConvertTo-Json -Depth 8 -Compress)
        if ($recordedProviderProfileHash -ne [string]$transaction.providerProfileStateSha256) { $failedGates.Add('ProviderProfileStateHash') }
    } catch { $failedGates.Add('ProviderProfileStateIdentity') }
    if (-not (Test-PhaseHistory -Journal $transaction)) { $failedGates.Add('TransactionPhaseHistory') }
    try { $updatedAt = Get-UtcDateTime $transaction.updatedAt }
    catch { $updatedAt = [datetime]::MinValue }
    if ($updatedAt.AddMinutes($MaximumJournalAgeMinutes) -lt $EvaluationTimeUtc.ToUniversalTime() -or $updatedAt -gt $EvaluationTimeUtc.ToUniversalTime().AddMinutes(5)) { $failedGates.Add('TransactionJournalFresh') }
    if (-not (Test-Path -LiteralPath ([string]$transaction.backupPath) -PathType Leaf)) { $failedGates.Add('TransactionBackupPresent') }
    elseif ((Get-FileHash -LiteralPath ([string]$transaction.backupPath) -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$transaction.beforeSha256) { $failedGates.Add('TransactionBackupHash') }
    if ($failedGates.Count) { return New-ResumeResult -Decision 'Blocked' -Eligible $false -ApplyRequired $false -PostCheckRequired $false -FailedGates $failedGates.ToArray() }
    $currentHash = (Get-FileHash -LiteralPath $resolvedConfig -Algorithm SHA256).Hash.ToLowerInvariant()
    switch ([string]$transaction.phase) {
        'Prepared' {
            if ($currentHash -ne [string]$transaction.beforeSha256) { return New-ResumeResult -Decision 'Blocked' -Eligible $false -ApplyRequired $false -PostCheckRequired $false -FailedGates @('ConfigHashMatchesPreparedPhase') }
            return New-ResumeResult -Decision 'ApplyRequired' -Eligible $true -ApplyRequired $true -PostCheckRequired $false -FailedGates @()
        }
        { $_ -in @('ProviderCommitted','ProviderProfileWritten','DesktopLifecycleInterrupted','PostCheckPending','Ready','RestorePending') } {
            if ($currentHash -ne [string]$transaction.afterSha256) { return New-ResumeResult -Decision 'Blocked' -Eligible $false -ApplyRequired $false -PostCheckRequired $false -FailedGates @('ConfigHashMatchesCommittedPhase') }
            if ($_ -eq 'RestorePending') { return New-ResumeResult -Decision 'RestoreRequired' -Eligible $true -ApplyRequired $false -PostCheckRequired $false -FailedGates @() }
            if ($_ -eq 'Ready') {
                if ([string]$transaction.ownedStateSha256 -notmatch '^[a-f0-9]{64}$') { return New-ResumeResult -Decision 'Blocked' -Eligible $false -ApplyRequired $false -PostCheckRequired $false -FailedGates @('OwnedStateHash') }
                return New-ResumeResult -Decision 'AlreadyReady' -Eligible $true -ApplyRequired $false -PostCheckRequired $false -FailedGates @()
            }
            if ($_ -in @('ProviderProfileWritten','DesktopLifecycleInterrupted')) {
                $phaseGates = New-Object System.Collections.Generic.List[string]
                if ([string]$transaction.providerProfileStateSha256 -notmatch '^[a-f0-9]{64}$') { $phaseGates.Add('ProviderProfileStateHash') }
                if (Test-Path -LiteralPath $resolvedExpectedManagedState) { $phaseGates.Add('ManagedStateAbsentForPendingCommit') }
                if ($phaseGates.Count) { return New-ResumeResult -Decision 'Blocked' -Eligible $false -ApplyRequired $false -PostCheckRequired $false -FailedGates $phaseGates.ToArray() }
                return New-ResumeResult -Decision 'ManagedCommitRequired' -Eligible $true -ApplyRequired $false -PostCheckRequired $false -FailedGates @()
            }
            return New-ResumeResult -Decision 'PostCheckRequired' -Eligible $true -ApplyRequired $false -PostCheckRequired $true -FailedGates @()
        }
        'Restored' {
            if ($currentHash -ne [string]$transaction.beforeSha256) { return New-ResumeResult -Decision 'Blocked' -Eligible $false -ApplyRequired $false -PostCheckRequired $false -FailedGates @('ConfigHashMatchesRestoredPhase') }
            return New-ResumeResult -Decision 'AlreadyRestored' -Eligible $true -ApplyRequired $false -PostCheckRequired $false -FailedGates @()
        }
        'FailedRestored' { return New-ResumeResult -Decision 'ManualReview' -Eligible $false -ApplyRequired $false -PostCheckRequired $false -FailedGates @('ProviderTransactionFailed') }
    }
}

if ($PSCmdlet.ParameterSetName -eq 'Restore') {
    $resolvedTransactionPath = (Resolve-Path -LiteralPath $TransactionPath).Path
    $transaction = Get-Content -LiteralPath $resolvedTransactionPath -Raw | ConvertFrom-Json
    if ([string]$transaction.schemaVersion -ne '3.0') { throw 'Unsupported transaction schema version.' }
    if (-not (Test-PhaseHistory -Journal $transaction)) { throw 'Transaction phase history is invalid.' }
    if ($transaction.configPath -ne $resolvedConfig) { throw 'Transaction config path does not match -ConfigPath.' }
    if (-not (Test-Path -LiteralPath $transaction.backupPath -PathType Leaf)) { throw 'Recorded backup is missing.' }
    if ((Get-FileHash -LiteralPath $transaction.backupPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$transaction.beforeSha256) { throw 'Recorded backup hash is invalid.' }
    $currentHash = (Get-FileHash -LiteralPath $resolvedConfig -Algorithm SHA256).Hash.ToLowerInvariant()
    if ([string]$transaction.phase -in @('Prepared','Restored','FailedRestored')) {
        if ($currentHash -ne [string]$transaction.beforeSha256) { throw "Restore blocked by failed gate 'ConfigHashMatchesRestoreSourcePhase'." }
        return
    }
    if ($currentHash -ne [string]$transaction.afterSha256) { throw "Restore blocked by failed gate 'ConfigHashMatchesRestoreSourcePhase'." }
    if ($PSCmdlet.ShouldProcess($resolvedConfig, 'Restore provider configuration from verified backup')) {
        Set-TransactionPhase -Journal $transaction -Phase 'RestorePending' -Path $resolvedTransactionPath -ConfigSha256 $currentHash -Detail 'Explicit restore requested.'
        Copy-Item -LiteralPath $transaction.backupPath -Destination $resolvedConfig -Force
        if ((Get-FileHash -LiteralPath $resolvedConfig -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$transaction.beforeSha256) { throw 'Restore verification failed.' }
        Set-TransactionPhase -Journal $transaction -Phase 'Restored' -Path $resolvedTransactionPath -ConfigSha256 ([string]$transaction.beforeSha256) -Detail 'Backup restored and hash verified.'
    }
    return
}

if ($OwnedKeys.Count -ne (@($OwnedKeys | Select-Object -Unique)).Count) { throw 'OwnedKeys contains duplicates.' }
if (-not (Test-LoopbackEndpoint -Value $Endpoint)) { throw 'Endpoint must be an absolute HTTP(S) loopback URI.' }
if ([string]::IsNullOrWhiteSpace($WireApi)) { throw 'WireApi must not be empty.' }
if (-not [IO.Path]::IsPathRooted($ManagedStatePath)) { throw 'ManagedStatePath must be absolute.' }
$resolvedCatalog = (Resolve-Path -LiteralPath $CatalogPath).Path
$normalizedCatalogSha256 = $CatalogSha256.ToLowerInvariant()
if ((Get-FileHash -LiteralPath $resolvedCatalog -Algorithm SHA256).Hash.ToLowerInvariant() -ne $normalizedCatalogSha256) { throw 'Catalog hash verification failed before mutation.' }
$resolvedManagedState = [IO.Path]::GetFullPath($ManagedStatePath)
$transactionId = '{0}-{1}' -f ([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')),([guid]::NewGuid().ToString('N'))
$backupPath = Join-Path $BackupDirectory "$transactionId.config.backup"
$journalPath = Join-Path $BackupDirectory "$transactionId.transaction.json"
$beforeHash = (Get-FileHash -LiteralPath $resolvedConfig -Algorithm SHA256).Hash.ToLowerInvariant()
if (-not $PSCmdlet.ShouldProcess($resolvedConfig, 'Apply scoped provider configuration transaction')) { return }
New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
Copy-Item -LiteralPath $resolvedConfig -Destination $backupPath
if ((Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $beforeHash) { throw 'Provider backup hash verification failed before mutation.' }
$transaction = [pscustomobject][ordered]@{
    schemaVersion='3.0';transactionId=$transactionId;phase=$null;configPath=$resolvedConfig;backupPath=$backupPath
    beforeSha256=$beforeHash;afterSha256=$null;providerId=$ProviderId;modelId=$ModelId;effectiveContext=$EffectiveContext
    ownedKeys=@($OwnedKeys);endpoint=$Endpoint;wireApi=$WireApi;catalogPath=$resolvedCatalog;catalogSha256=$normalizedCatalogSha256
    managedStatePath=$resolvedManagedState;providerProfileState=$null;providerProfileStateSha256=$null;ownedStateSha256=$null
    createdAt=[DateTime]::UtcNow.ToString('o');updatedAt=$null;phaseHistory=@();failure=$null
}
Set-TransactionPhase -Journal $transaction -Phase 'Prepared' -Path $journalPath -ConfigSha256 $beforeHash -Detail 'Backup created and verified before mutation.'
try {
    & $ApplyScopedEdit $resolvedConfig
    $transaction.afterSha256 = (Get-FileHash -LiteralPath $resolvedConfig -Algorithm SHA256).Hash.ToLowerInvariant()
    $providerProfileState = Get-CanonicalOwnedState -State (& $GetOwnedState $resolvedConfig $OwnedKeys)
    $transaction.providerProfileState = [pscustomobject]$providerProfileState
    $transaction.providerProfileStateSha256 = Get-Sha256Text -Text ($providerProfileState | ConvertTo-Json -Depth 8 -Compress)
    Set-TransactionPhase -Journal $transaction -Phase 'ProviderProfileWritten' -Path $journalPath -ConfigSha256 $transaction.afterSha256 -Detail 'Scoped provider profile written and owned state hash recorded.'
    Set-TransactionPhase -Journal $transaction -Phase 'PostCheckPending' -Path $journalPath -ConfigSha256 $transaction.afterSha256 -Detail 'Provider post-check pending.'
    $postCheckResult = & $PostCheck $resolvedConfig
    if ($postCheckResult -isnot [bool] -or -not $postCheckResult) { throw 'Provider post-check must return Boolean true.' }
    $ownedState = Get-CanonicalOwnedState -State (& $GetOwnedState $resolvedConfig $OwnedKeys)
    $transaction.ownedStateSha256 = Get-Sha256Text -Text ($ownedState | ConvertTo-Json -Depth 8 -Compress)
    Set-TransactionPhase -Journal $transaction -Phase 'Ready' -Path $journalPath -ConfigSha256 $transaction.afterSha256 -Detail 'Post-check and owned-state identity verified.'
    [pscustomobject][ordered]@{transactionId=$transactionId;transactionPath=$journalPath;phase='Ready'}
} catch {
    $failureMessage = $_.Exception.Message
    $transaction.failure = $failureMessage
    $journalFailure = $null
    try { Set-TransactionPhase -Journal $transaction -Phase 'RestorePending' -Path $journalPath -ConfigSha256 ((Get-FileHash -LiteralPath $resolvedConfig -Algorithm SHA256).Hash.ToLowerInvariant()) -Detail 'Provider change failed; automatic restore pending.' }
    catch { $journalFailure = $_.Exception.Message }
    Copy-Item -LiteralPath $backupPath -Destination $resolvedConfig -Force
    if ((Get-FileHash -LiteralPath $resolvedConfig -Algorithm SHA256).Hash.ToLowerInvariant() -ne $beforeHash) { throw 'Provider change failed and automatic restore verification also failed.' }
    try { Set-TransactionPhase -Journal $transaction -Phase 'FailedRestored' -Path $journalPath -ConfigSha256 $beforeHash -Detail 'Provider change failed; backup restored and hash verified.' }
    catch { if (-not $journalFailure) { $journalFailure = $_.Exception.Message } }
    $journalSuffix = if ($journalFailure) { " Journal update also failed: $journalFailure" } else { '' }
    throw "Provider change failed and was restored: $failureMessage$journalSuffix"
}
```

### File: `assets/templates/read-only-tool-approval.json.tmpl`

```text
{
  "schemaVersion": "1.0",
  "approvalId": "<deterministic-approval-id>",
  "createdAt": "<authoritative-ISO-8601-timestamp>",
  "expiresAt": "<authoritative-ISO-8601-timestamp>",
  "decision": "Approved",
  "proposalSha256": "<64-hex-proposal-sha256>",
  "allowedRoot": "<fully-qualified-scoped-root>",
  "target": {
    "path": "<exact-proposal-target-path>",
    "sha256": "<64-hex-target-sha256>",
    "bytes": 0
  }
}
```

### File: `assets/templates/read-only-tool-proposal.json.tmpl`

```text
{
  "schemaVersion": "1.0",
  "proposalId": "<deterministic-proposal-id>",
  "createdAt": "<authoritative-ISO-8601-timestamp>",
  "source": {
    "kind": "ollama-tool-call",
    "metadataSha256": "<64-hex-metadata-sha256>",
    "responseSha256": "<64-hex-response-sha256>",
    "toolCallIndex": 0
  },
  "tool": {
    "name": "read_file_slice",
    "arguments": {
      "path": "<fully-qualified-path-within-approved-root>",
      "offsetBytes": 0,
      "maximumBytes": 4096
    }
  }
}
```

### File: `assets/templates/release-provenance.json.tmpl`

```text
{
  "schemaVersion": "1.0",
  "pluginName": "powershell-workbench",
  "pluginVersion": "<semantic-version>",
  "commitSha": "<40-hex-source-commit>",
  "sourceRef": "<portable-source-ref>",
  "sourceTreeSha256": "<64-hex-health-source-tree-sha256>"
}
```

### File: `references/agent-harness-patterns.md`

#### Agent harness patterns

##### Registry and policy

- Give every JSON registry a `schemaVersion`, stable identifiers, explicit status vocabulary, and documented evidence rules.
- Keep a vendor-neutral core policy and apply project-specific overlays only after the active root/profile is identified.
- Default missing profiles and unavailable capabilities to conservative, non-mutating behavior.

##### Endpoint and provider controls

- Parse endpoints as URIs and require an exact loopback host for local-only operation.
- Record the resolved model digest and effective context, not only the requested model name.
- Never silently switch provider after empty output, timeout, denial, or unavailable capability.

##### Evaluation evidence

- Use immutable fixtures or record fixture hashes.
- Separate synthetic schema/tool-call evaluation from real tool execution.
- Require consecutive passes where variance matters and retain every failed run.
- Record latency, output validity, safety-boundary behavior, and resource observations independently.

##### Context and sessions

- Export sessions to a non-executable format and redact credentials, tokens, cookies, and connector secrets.
- Checkpoints must preserve source identity, unresolved decisions, safety constraints, and a reload canary.
- Publishing a checkpoint requires deterministic validation; model-produced summaries are candidates, not trusted state.
- Generate portable handoffs as validated local JSON first and derive Markdown from the same canonical payload. Keep task, Drive, GitHub, and connector transport outside the generator.

##### Configuration lifecycle

- Preflight required files and runtime availability.
- Back up exact configuration before editing.
- Modify only owned keys or clearly marked blocks.
- Compare effective state after editing.
- Provide an explicit restore operation and preserve unrelated settings.
- Journal each provider phase before and after mutation. A resume decision is read-only and must verify journal freshness, phase history, configuration and backup hashes, provider/model/context identity, owned keys, and effective owned state.
- Treat a verified `Ready` profile as already ready. Treat `ProviderCommitted` and `PostCheckPending` as post-check work, never as authority to repeat the provider edit.

##### Named gate groups

- Give every gate and group a stable exact name. Reject duplicate gates, duplicate groups, unknown gate references, and non-boolean gate results.
- Select the narrowest group authorized for the action. A loopback runtime preparation group may omit host elevation and clipboard gates; host certification must retain them.
- Preserve failed-gate names and declaration order so callers can diagnose the precise blocking boundary.
