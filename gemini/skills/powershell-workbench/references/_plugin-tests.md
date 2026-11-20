# Plugin files: powershell-workbench — `Tests/`

Source: `plugins/powershell-workbench`. Files outside the `skills/*` folders, embedded as text.

## File: `Tests/Fixtures/empty.jsonl`

```text

```

## File: `Tests/Fixtures/item-error.jsonl`

```text
{"type":"thread.started","thread_id":"fixture-error"}
{"type":"item.completed","item":{"id":"item-error","type":"error","message":"Fixture item-level error."}}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"message-1","type":"agent_message","text":"EXACT_OK"}}
{"type":"turn.completed"}
```

## File: `Tests/Fixtures/malformed.jsonl`

```text
{"type":"thread.started","thread_id":"fixture-malformed"}
{"type":"turn.started"
```

## File: `Tests/Fixtures/no-tool-call.jsonl`

```text
{"type":"thread.started","thread_id":"fixture-no-tool"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"message-1","type":"agent_message","text":"EXACT_OK"}}
{"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":2}}
```

## File: `Tests/Fixtures/stderr-error.log`

```text
ERROR known harmless fixture
```

## File: `Tests/Fixtures/success.jsonl`

```text
{"type":"thread.started","thread_id":"fixture-success"}
{"type":"turn.started"}
{"type":"item.started","item":{"id":"tool-1","type":"command_execution","command":"fixture-read","status":"in_progress"}}
{"type":"item.completed","item":{"id":"tool-1","type":"command_execution","command":"fixture-read","status":"completed","exit_code":0}}
{"type":"item.completed","item":{"id":"message-1","type":"agent_message","text":"EXACT_OK"}}
{"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":2}}
```

## File: `Tests/Fixtures/tool-failure-process-zero.jsonl`

```text
{"type":"thread.started","thread_id":"fixture-tool-failure"}
{"type":"turn.started"}
{"type":"item.started","item":{"id":"tool-1","type":"command_execution","command":"fixture-read","status":"in_progress"}}
{"type":"item.completed","item":{"id":"tool-1","type":"command_execution","command":"fixture-read","status":"failed","exit_code":1}}
{"type":"item.completed","item":{"id":"message-1","type":"agent_message","text":"EXACT_OK"}}
{"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":2}}
```

## File: `Tests/Fixtures/tool-retry.jsonl`

```text
{"type":"thread.started","thread_id":"fixture-retry"}
{"type":"turn.started"}
{"type":"item.started","item":{"id":"tool-1","type":"command_execution","command":"fixture-read","status":"in_progress"}}
{"type":"item.completed","item":{"id":"tool-1","type":"command_execution","command":"fixture-read","status":"completed","exit_code":0}}
{"type":"item.started","item":{"id":"tool-2","type":"command_execution","command":"fixture-read","status":"in_progress"}}
{"type":"item.completed","item":{"id":"tool-2","type":"command_execution","command":"fixture-read","status":"completed","exit_code":0}}
{"type":"item.completed","item":{"id":"message-1","type":"agent_message","text":"EXACT_OK"}}
{"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":2}}
```

## File: `Tests/Test-AgentHarnessContracts.ps1`

```powershell
[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$pluginRoot = Split-Path -Parent $PSScriptRoot
$validator = Join-Path $pluginRoot 'scripts\Test-PowerShellWorkbenchCodexEvidence.ps1'
$runner = Join-Path $pluginRoot 'scripts\Invoke-PowerShellWorkbenchCodexJson.ps1'
$desktopResolver = Join-Path $pluginRoot 'scripts\Resolve-PowerShellWorkbenchCodexDesktop.ps1'
$catalogGenerator = Join-Path $pluginRoot 'scripts\New-PowerShellWorkbenchLocalModelCatalog.ps1'
$gateResolver = Join-Path $pluginRoot 'scripts\Resolve-PowerShellWorkbenchGateGroups.ps1'
$providerTemplate = Join-Path $pluginRoot 'skills\powershell-agent-harness-development\assets\templates\provider-switch-transaction.ps1.tmpl'
$fixtures = Join-Path $PSScriptRoot 'Fixtures'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-agent-harness-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempRoot | Out-Null

function Assert-True { param([bool]$Condition,[string]$Message) if(-not $Condition){throw $Message} }
function Get-TestSha256Text {
    param([Parameter(Mandatory)][string]$Text)
    $algorithm=[Security.Cryptography.SHA256]::Create()
    try{
        $bytes=[Text.Encoding]::UTF8.GetBytes($Text)
        ([BitConverter]::ToString($algorithm.ComputeHash($bytes))).Replace('-','').ToLowerInvariant()
    }finally{$algorithm.Dispose()}
}
function Invoke-EvidenceValidation {
    param([string]$MetadataPath,[hashtable]$Parameters=@{})
    $invoke=@{MetadataPath=$MetadataPath;ExpectedMetadataSha256=(Get-FileHash -LiteralPath $MetadataPath -Algorithm SHA256).Hash;ExpectedExecutableSha256=$script:ExpectedExecutableHash;AcceptUnverifiedRuntimeDeclarations=$true;NoThrow=$true}
    foreach($key in $Parameters.Keys){$invoke[$key]=$Parameters[$key]}
    & $script:validator @invoke
}
function New-EvidenceFixture {
    [CmdletBinding(SupportsShouldProcess)]
    param([string]$Jsonl,[bool]$TimedOut=$false,[int]$ProcessExitCode=0,[string]$CaptureStatus='Completed',[string]$ExecutablePath=$script:HostExecutable,[string]$StderrFixture)
    $stderr=Join-Path $tempRoot ((Split-Path -Leaf $Jsonl)+'.stderr.log')
    if($StderrFixture){Copy-Item -LiteralPath $StderrFixture -Destination $stderr}else{Set-Content -LiteralPath $stderr -Value 'fixture-stderr' -Encoding UTF8}
    $path=Join-Path $tempRoot ((Split-Path -Leaf $Jsonl)+'.metadata.json')
    if($PSCmdlet.ShouldProcess($path,'Create isolated evidence metadata fixture')){
    [ordered]@{
        schemaVersion='2.0';captureStatus=$CaptureStatus;timedOut=$TimedOut;outputLimitExceeded=$false;processExitCode=$ProcessExitCode
        startedAt='2026-01-01T00:00:00Z';durationMs=1
        launch=[ordered]@{executablePath=$ExecutablePath;executableSha256=(Get-FileHash $ExecutablePath -Algorithm SHA256).Hash.ToLowerInvariant();workingDirectory=$tempRoot;argumentSha256=('a'*64)}
        declarations=[ordered]@{attestation='unverified-caller-declaration';model=[ordered]@{id='fixture-model';digest='fixture-digest'};provider=[ordered]@{id='fixture-provider';endpoint='http://127.0.0.1:11434/';isLoopback=$true};runtime=[ordered]@{effectiveContext=4096;sandbox='read-only';approvalPolicy='never';profile='fixture'}}
        input=[ordered]@{promptSha256=('b'*64);fixturePath=$Jsonl;fixtureSha256=(Get-FileHash $Jsonl -Algorithm SHA256).Hash.ToLowerInvariant()}
        limits=[ordered]@{timeoutSeconds=30;maxStdoutBytes=1048576;maxStderrBytes=1048576;maxTotalOutputBytes=2097152}
        artifacts=[ordered]@{stdoutJsonl=$Jsonl;stdoutBytes=(Get-Item $Jsonl).Length;stdoutSha256=(Get-FileHash $Jsonl -Algorithm SHA256).Hash.ToLowerInvariant();stderr=$stderr;stderrBytes=(Get-Item $stderr).Length;stderrSha256=(Get-FileHash $stderr -Algorithm SHA256).Hash.ToLowerInvariant()}
    }|ConvertTo-Json -Depth 10|Set-Content -LiteralPath $path -Encoding UTF8
    }
    $path
}

try {
    $script:HostExecutable=(Get-Process -Id $PID).Path
    $script:ExpectedExecutableHash=(Get-FileHash $script:HostExecutable -Algorithm SHA256).Hash
    $success=Join-Path $fixtures 'success.jsonl'
    $result=Invoke-EvidenceValidation -MetadataPath (New-EvidenceFixture $success) -Parameters @{MinimumSuccessfulToolCalls=1;ExpectedFinalText='EXACT_OK';RequireExactFinalText=$true}
    Assert-True $result.Passed 'Success fixture did not pass.'

    $itemError=Join-Path $fixtures 'item-error.jsonl'
    $result=Invoke-EvidenceValidation -MetadataPath (New-EvidenceFixture $itemError) -Parameters @{ExpectedFinalText='EXACT_OK';RequireExactFinalText=$true}
    Assert-True (-not $result.Passed) 'An item-level error produced a false positive.'

    $advisory=Join-Path $tempRoot 'advisory.jsonl'
    @('{"type":"thread.started","thread_id":"x"}','{"type":"turn.started"}','{"type":"item.completed","item":{"id":"advisory-1","type":"error","status":"completed","text":"Skill descriptions were truncated to fit the skills budget."}}','{"type":"item.completed","item":{"id":"message-1","type":"agent_message","text":"EXACT_OK"}}','{"type":"turn.completed"}')|Set-Content -LiteralPath $advisory -Encoding UTF8
    $result=Invoke-EvidenceValidation -MetadataPath (New-EvidenceFixture $advisory) -Parameters @{ExpectedFinalText='EXACT_OK';RequireExactFinalText=$true}
    Assert-True (-not $result.Passed) 'An advisory error passed without explicit allowlisting.'
    $result=Invoke-EvidenceValidation -MetadataPath (New-EvidenceFixture $advisory) -Parameters @{ExpectedFinalText='EXACT_OK';RequireExactFinalText=$true;AllowedAdvisoryRegex=@('^Skill descriptions were truncated to fit the skills budget\.$')}
    Assert-True $result.Passed 'An exact opt-in advisory allowlist did not apply.'
    $policyAdvisory=Join-Path $tempRoot 'policy-advisory.jsonl'
    @('{"type":"thread.started","thread_id":"x"}','{"type":"turn.started"}','{"type":"item.completed","item":{"id":"advisory-1","type":"error","status":"completed","text":"Policy error: access denied."}}','{"type":"item.completed","item":{"id":"message-1","type":"agent_message","text":"EXACT_OK"}}','{"type":"turn.completed"}')|Set-Content -LiteralPath $policyAdvisory -Encoding UTF8
    $result=Invoke-EvidenceValidation -MetadataPath (New-EvidenceFixture $policyAdvisory) -Parameters @{ExpectedFinalText='EXACT_OK';RequireExactFinalText=$true;AllowedAdvisoryRegex=@('^Policy error: access denied\.$')}
    Assert-True (-not $result.Passed) 'A policy failure bypassed the advisory allowlist.'

    $stderrError=Join-Path $fixtures 'stderr-error.log'
    $result=Invoke-EvidenceValidation -MetadataPath (New-EvidenceFixture $success -StderrFixture $stderrError)
    Assert-True (-not $result.Passed) 'A stderr error signal produced a false positive.'
    $result=Invoke-EvidenceValidation -MetadataPath (New-EvidenceFixture $success -StderrFixture $stderrError) -Parameters @{AllowedStderrRegex=@('^ERROR known harmless fixture$')}
    Assert-True $result.Passed 'An explicit narrow stderr allowlist did not apply.'

    foreach($name in @('tool-failure-process-zero.jsonl','empty.jsonl','malformed.jsonl','no-tool-call.jsonl')){
        $path=Join-Path $fixtures $name
        $result=Invoke-EvidenceValidation -MetadataPath (New-EvidenceFixture $path) -Parameters @{MinimumSuccessfulToolCalls=1}
        Assert-True (-not $result.Passed) "$name produced a false positive."
    }
    $result=Invoke-EvidenceValidation -MetadataPath (New-EvidenceFixture $success) -Parameters @{ExpectedExecutableSha256=('0'*64)}
    Assert-True (-not $result.Passed) 'Executable substitution produced a false positive.'

    $result=Invoke-EvidenceValidation -MetadataPath (New-EvidenceFixture $success) -Parameters @{ExpectedModelId='different-model';ExpectedModelDigest='different-digest';ExpectedEffectiveContext=1;ExpectedCatalogSha256=('0'*64)}
    Assert-True (-not $result.Passed) 'Model, context, or catalog substitution produced a false positive.'

    $tampered=Join-Path $tempRoot 'tampered.jsonl'
    Copy-Item -LiteralPath $success -Destination $tampered
    $metadataPath=New-EvidenceFixture $tampered
    Add-Content -LiteralPath $tampered -Value '{"type":"unknown.additive"}'
    $result=Invoke-EvidenceValidation -MetadataPath $metadataPath
    Assert-True (-not $result.Passed) 'Artifact substitution produced a false positive.'

    $substituted=Join-Path $tempRoot 'substituted.jsonl'
    Copy-Item -LiteralPath $success -Destination $substituted
    $metadataPath=New-EvidenceFixture $substituted
    $trustedMetadataHash=(Get-FileHash -LiteralPath $metadataPath -Algorithm SHA256).Hash
    Add-Content -LiteralPath $substituted -Value '{"type":"unknown.additive"}'
    $mutableMetadata=Get-Content -LiteralPath $metadataPath -Raw|ConvertFrom-Json
    $mutableMetadata.artifacts.stdoutBytes=(Get-Item -LiteralPath $substituted).Length
    $mutableMetadata.artifacts.stdoutSha256=(Get-FileHash -LiteralPath $substituted -Algorithm SHA256).Hash.ToLowerInvariant()
    $mutableMetadata|ConvertTo-Json -Depth 10|Set-Content -LiteralPath $metadataPath -Encoding UTF8
    $result=& $validator -MetadataPath $metadataPath -ExpectedMetadataSha256 $trustedMetadataHash -ExpectedExecutableSha256 $script:ExpectedExecutableHash -AcceptUnverifiedRuntimeDeclarations -NoThrow
    Assert-True (-not $result.Passed) 'Metadata and artifact substitution bypassed the out-of-band digest.'

    $remoteMetadata=New-EvidenceFixture $success
    $remoteObject=Get-Content -LiteralPath $remoteMetadata -Raw|ConvertFrom-Json
    $remoteObject.declarations.provider.endpoint='https://example.com/'
    $remoteObject.declarations.provider.isLoopback=$true
    $remoteObject|ConvertTo-Json -Depth 10|Set-Content -LiteralPath $remoteMetadata -Encoding UTF8
    $result=Invoke-EvidenceValidation -MetadataPath $remoteMetadata
    Assert-True (-not $result.Passed) 'A remote endpoint bypassed validation through a forged isLoopback declaration.'

    $lateMessage=Join-Path $tempRoot 'late-message.jsonl'
    @('{"type":"thread.started","thread_id":"x"}','{"type":"turn.started"}','{"type":"turn.completed"}','{"type":"item.completed","item":{"id":"message-late","type":"agent_message","text":"EXACT_OK"}}')|Set-Content -LiteralPath $lateMessage
    $result=Invoke-EvidenceValidation -MetadataPath (New-EvidenceFixture $lateMessage) -Parameters @{ExpectedFinalText='EXACT_OK';RequireExactFinalText=$true}
    Assert-True (-not $result.Passed) 'An agent message outside the active turn satisfied the final-text contract.'

    $largeStderrMetadata=New-EvidenceFixture $success
    $largeStderrObject=Get-Content -LiteralPath $largeStderrMetadata -Raw|ConvertFrom-Json
    $largeStderrPath=[string]$largeStderrObject.artifacts.stderr
    [IO.File]::WriteAllText($largeStderrPath,('x'*2048))
    $largeStderrObject.artifacts.stderrBytes=(Get-Item -LiteralPath $largeStderrPath).Length
    $largeStderrObject.artifacts.stderrSha256=(Get-FileHash -LiteralPath $largeStderrPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $largeStderrObject|ConvertTo-Json -Depth 10|Set-Content -LiteralPath $largeStderrMetadata -Encoding UTF8
    $result=Invoke-EvidenceValidation -MetadataPath $largeStderrMetadata -Parameters @{MaxStderrBytes=1024}
    Assert-True (-not $result.Passed) 'Oversized stderr bypassed the validator-side byte limit.'

    $orphan=Join-Path $tempRoot 'orphan.jsonl'
    @('{"type":"thread.started","thread_id":"x"}','{"type":"turn.started"}','{"type":"item.completed","item":{"id":"x","type":"command_execution","status":"completed","exit_code":0}}','{"type":"turn.completed"}')|Set-Content $orphan
    $result=Invoke-EvidenceValidation -MetadataPath (New-EvidenceFixture $orphan) -Parameters @{MinimumSuccessfulToolCalls=1}
    Assert-True (-not $result.Passed) 'Orphan completion produced a false positive.'

    $retry=Join-Path $fixtures 'tool-retry.jsonl'
    $result=Invoke-EvidenceValidation -MetadataPath (New-EvidenceFixture $retry) -Parameters @{FailOnToolRetry=$true}
    Assert-True (-not $result.Passed) 'Tool retry passed a no-retry gate.'

    $tokens=$null;$errors=$null
    $runnerAst=[Management.Automation.Language.Parser]::ParseFile($runner,[ref]$tokens,[ref]$errors)
    Assert-True (@($errors).Count -eq 0) 'Runner has parser errors.'
    foreach($required in @('ArgumentList','StandardInput.Close','CopyToAsync','PWB_OUTPUT_LIMIT','Kill($true)','stdoutSha256','executableSha256','Resolve-PowerShellWorkbenchCodexDesktop.ps1','CatalogManifestPath','codexVersion','catalogSha256')){
        Assert-True ($runnerAst.Extent.Text.Contains($required)) "Runner is missing contract: $required"
    }

    foreach($scriptPath in @($desktopResolver,$catalogGenerator,$gateResolver)){
        $tokens=$null;$errors=$null
        [void][Management.Automation.Language.Parser]::ParseFile($scriptPath,[ref]$tokens,[ref]$errors)
        Assert-True (@($errors).Count -eq 0) "Harness helper has parser errors: $scriptPath"
    }

    $templateText=Get-Content -LiteralPath $providerTemplate -Raw
    $tokens=$null;$errors=$null
    [void][Management.Automation.Language.Parser]::ParseInput($templateText,[ref]$tokens,[ref]$errors)
    Assert-True (@($errors).Count -eq 0) 'Provider transaction template has parser errors.'
    $resumeSection=[regex]::Match($templateText,'(?s)if \(\$PSCmdlet\.ParameterSetName -eq ''Resume''\).*?(?=if \(\$PSCmdlet\.ParameterSetName -eq ''Restore''\))').Value
    Assert-True (-not [string]::IsNullOrWhiteSpace($resumeSection)) 'Read-only resume section was not found.'
    Assert-True ($resumeSection -notmatch '&\s*\$') 'Read-only resume decision invokes a caller-supplied scriptblock.'
    $providerScript=Join-Path $tempRoot 'provider-switch-transaction.ps1'
    Set-Content -LiteralPath $providerScript -Value $templateText -Encoding UTF8
    $configPath=Join-Path $tempRoot 'provider.config'
    $backupDirectory=Join-Path $tempRoot 'provider-transactions'
    $catalogPath=Join-Path $tempRoot 'local-model-catalog.json'
    $managedStatePath=Join-Path $tempRoot 'managed-provider-state.json'
    Set-Content -LiteralPath $catalogPath -Value '{"models":[{"slug":"fixture-model"}]}' -Encoding UTF8
    $providerEvidence=@{
        Endpoint='http://127.0.0.1:11434/';WireApi='responses';CatalogPath=$catalogPath
        CatalogSha256=(Get-FileHash -LiteralPath $catalogPath -Algorithm SHA256).Hash.ToLowerInvariant()
        ManagedStatePath=$managedStatePath
    }
    Set-Content -LiteralPath $configPath -Value '{"provider":"original","model":"cloud","context":4096}' -Encoding UTF8
    $whatIfBackupDirectory=Join-Path $tempRoot 'what-if-provider-transactions'
    & $providerScript -ConfigPath $configPath -BackupDirectory $whatIfBackupDirectory `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence `
        -ApplyScopedEdit { throw 'WhatIf invoked provider edit.' } -PostCheck { throw 'WhatIf invoked post-check.' } `
        -GetOwnedState { throw 'WhatIf invoked owned-state reader.' } -WhatIf
    Assert-True (-not (Test-Path -LiteralPath $whatIfBackupDirectory)) 'Provider -WhatIf created a backup directory.'
    $applyInvocation=[pscustomobject]@{Count=0}
    $ownedStateReader={
        param($path,$keys)
        [void]$keys
        $state=Get-Content -LiteralPath $path -Raw|ConvertFrom-Json
        [pscustomobject]@{providerId=$state.provider;modelId=$state.model;effectiveContext=[int]$state.context;ownedValues=$state}
    }
    $applyResult=& $providerScript -ConfigPath $configPath -BackupDirectory $backupDirectory `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence `
        -ApplyScopedEdit { param($path) $applyInvocation.Count++;Set-Content -LiteralPath $path -Value '{"provider":"ollama","model":"fixture-model","context":131072}' -Encoding UTF8 } `
        -PostCheck { param($path) ((Get-Content -LiteralPath $path -Raw|ConvertFrom-Json).provider -eq 'ollama') } `
        -GetOwnedState $ownedStateReader -Confirm:$false
    Assert-True ($applyResult.phase -eq 'Ready') 'Provider apply transaction did not reach Ready.'
    Assert-True ((Get-Content -LiteralPath $configPath -Raw|ConvertFrom-Json).provider -eq 'ollama') 'Provider apply transaction failed.'
    $committedConfigPath=Join-Path $tempRoot 'committed-provider.config'
    Copy-Item -LiteralPath $configPath -Destination $committedConfigPath
    $journal=(Get-ChildItem -LiteralPath $backupDirectory -Filter '*.transaction.json' -File|Select-Object -First 1).FullName
    $resume=& $providerScript -ConfigPath $configPath -TransactionPath $journal -ResumeDecision `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence
    Assert-True ($resume.decision -eq 'AlreadyReady' -and -not $resume.applyRequired) 'A verified Ready transaction was not recognized read-only.'
    Assert-True ($applyInvocation.Count -eq 1) 'Resume decision repeated the provider switch.'
    $missing=& $providerScript -ConfigPath $configPath -TransactionPath (Join-Path $backupDirectory 'missing.transaction.json') -ResumeDecision `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence
    Assert-True (-not $missing.eligible -and @($missing.failedGates).Count -eq 1 -and $missing.failedGates[0] -eq 'TransactionJournalPresent') 'Missing journal did not fail closed with its exact gate.'

    $interruptedPath=Join-Path $backupDirectory 'interrupted.transaction.json'
    $interrupted=Get-Content -LiteralPath $journal -Raw|ConvertFrom-Json
    $interrupted.phaseHistory=@($interrupted.phaseHistory|Select-Object -First ($interrupted.phaseHistory.Count-2))
    $interrupted.phase='ProviderProfileWritten'
    $interrupted.updatedAt=$interrupted.phaseHistory[-1].recordedAt
    $interrupted|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $interruptedPath -Encoding UTF8
    $resume=& $providerScript -ConfigPath $configPath -TransactionPath $interruptedPath -ResumeDecision `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence
    Assert-True ($resume.decision -eq 'ManagedCommitRequired' -and $resume.ManagedCommitRequired -and $resume.ResumedAfterProviderProfileWrite) 'Interrupted-after-profile-write resume was not classified as a managed commit.'
    Assert-True (-not $resume.ProviderSwitchRequired -and -not $resume.DesktopLifecycleInvoked -and -not $resume.postCheckRequired) 'Interrupted resume authorized provider, Desktop, or post-check execution.'
    Assert-True ($applyInvocation.Count -eq 1) 'Interrupted resume executed the provider edit.'

    $desktopInterruptedPath=Join-Path $backupDirectory 'desktop-interrupted.transaction.json'
    $desktopInterrupted=Get-Content -LiteralPath $interruptedPath -Raw|ConvertFrom-Json
    $previousEntryHash=[string]$desktopInterrupted.phaseHistory[-1].entrySha256
    $desktopEntry=[ordered]@{
        phase='DesktopLifecycleInterrupted';recordedAt=[datetime]::UtcNow.ToString('o')
        configSha256=[string]$desktopInterrupted.afterSha256;detail='Desktop lifecycle interrupted after provider profile write.'
        previousEntrySha256=$previousEntryHash
    }
    $desktopEntry['entrySha256']=Get-TestSha256Text -Text ($desktopEntry|ConvertTo-Json -Depth 8 -Compress)
    $desktopInterrupted.phaseHistory=@($desktopInterrupted.phaseHistory)+@([pscustomobject]$desktopEntry)
    $desktopInterrupted.phase='DesktopLifecycleInterrupted';$desktopInterrupted.updatedAt=$desktopEntry.recordedAt
    $desktopInterrupted|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $desktopInterruptedPath -Encoding UTF8
    $resume=& $providerScript -ConfigPath $configPath -TransactionPath $desktopInterruptedPath -ResumeDecision `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence
    Assert-True ($resume.decision -eq 'ManagedCommitRequired' -and $resume.ResumedAfterProviderProfileWrite -and -not $resume.DesktopLifecycleInvoked) 'Desktop lifecycle interruption was not resumed read-only after provider profile write.'

    $endpointDrift=$providerEvidence.Clone();$endpointDrift.Endpoint='http://127.0.0.1:11435/'
    $resume=& $providerScript -ConfigPath $configPath -TransactionPath $interruptedPath -ResumeDecision `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @endpointDrift
    Assert-True (-not $resume.eligible -and @($resume.failedGates).Count -eq 1 -and $resume.failedGates[0] -eq 'TransactionEndpointIdentity') 'Endpoint drift did not preserve its exact failed gate.'

    $wireDrift=$providerEvidence.Clone();$wireDrift.WireApi='chat-completions'
    $resume=& $providerScript -ConfigPath $configPath -TransactionPath $interruptedPath -ResumeDecision `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @wireDrift
    Assert-True (-not $resume.eligible -and @($resume.failedGates).Count -eq 1 -and $resume.failedGates[0] -eq 'TransactionWireApiIdentity') 'Wire API drift did not preserve its exact failed gate.'

    Set-Content -LiteralPath $catalogPath -Value '{"models":[{"slug":"drifted"}]}' -Encoding UTF8
    $resume=& $providerScript -ConfigPath $configPath -TransactionPath $interruptedPath -ResumeDecision `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence
    Assert-True (-not $resume.eligible -and @($resume.failedGates).Count -eq 1 -and $resume.failedGates[0] -eq 'ExpectedCatalogHash') 'Catalog drift did not preserve its exact failed gate.'
    Set-Content -LiteralPath $catalogPath -Value '{"models":[{"slug":"fixture-model"}]}' -Encoding UTF8

    Set-Content -LiteralPath $managedStatePath -Value '{"provider":"unexpected"}' -Encoding UTF8
    $resume=& $providerScript -ConfigPath $configPath -TransactionPath $interruptedPath -ResumeDecision `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence
    Assert-True (-not $resume.eligible -and @($resume.failedGates).Count -eq 1 -and $resume.failedGates[0] -eq 'ManagedStateAbsentForPendingCommit') 'Unexpected managed state did not preserve its exact failed gate.'
    Remove-Item -LiteralPath $managedStatePath -Force

    $missingProfileHashPath=Join-Path $backupDirectory 'missing-profile-hash.transaction.json'
    $missingProfileHash=Get-Content -LiteralPath $interruptedPath -Raw|ConvertFrom-Json
    $missingProfileHash.providerProfileStateSha256=$null
    $missingProfileHash|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $missingProfileHashPath -Encoding UTF8
    $resume=& $providerScript -ConfigPath $configPath -TransactionPath $missingProfileHashPath -ResumeDecision `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence
    Assert-True (-not $resume.eligible -and @($resume.failedGates).Count -eq 1 -and $resume.failedGates[0] -eq 'ProviderProfileStateHash') 'Missing provider profile state hash did not preserve its exact failed gate.'
    Assert-True ($applyInvocation.Count -eq 1) 'Negative resume decisions executed the provider edit.'

    $invalidManagedEvidence=$providerEvidence.Clone();$invalidManagedEvidence.ManagedStatePath=('C:\invalid'+[char]0+'path')
    $resume=$null
    try {
        $resume=& $providerScript -ConfigPath $configPath -TransactionPath $interruptedPath -ResumeDecision `
            -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @invalidManagedEvidence
    } catch {
        throw "Invalid managed-state path escaped the structured fail-closed decision with an exception: $($_.Exception.Message)"
    }
    Assert-True ($null -ne $resume -and -not $resume.eligible -and $resume.failedGates -contains 'ExpectedManagedStatePathValid') 'Invalid managed-state path escaped the structured fail-closed decision.'

    $invalidSequencePath=Join-Path $backupDirectory 'invalid-sequence.transaction.json'
    $invalidSequence=Get-Content -LiteralPath $interruptedPath -Raw|ConvertFrom-Json
    $invalidEntry=$invalidSequence.phaseHistory[-1]
    $invalidEntry.previousEntrySha256=$null
    $invalidHashInput=[ordered]@{phase=[string]$invalidEntry.phase;recordedAt=([datetime]$invalidEntry.recordedAt).ToUniversalTime().ToString('o');configSha256=[string]$invalidEntry.configSha256;detail=[string]$invalidEntry.detail;previousEntrySha256=$null}
    $invalidEntry.entrySha256=Get-TestSha256Text -Text ($invalidHashInput|ConvertTo-Json -Depth 8 -Compress)
    $invalidSequence.phaseHistory=@($invalidEntry)
    $invalidSequence|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $invalidSequencePath -Encoding UTF8
    $resume=& $providerScript -ConfigPath $configPath -TransactionPath $invalidSequencePath -ResumeDecision `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence
    Assert-True (-not $resume.eligible -and $resume.failedGates -contains 'TransactionPhaseHistory') 'Illegal phase sequence passed the hash-chain-only history check.'

    $unknownPath=Join-Path $backupDirectory 'unknown.transaction.json'
    $unknown=Get-Content -LiteralPath $journal -Raw|ConvertFrom-Json;$unknown.phase='UnknownPhase'
    $unknown|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $unknownPath -Encoding UTF8
    $resume=& $providerScript -ConfigPath $configPath -TransactionPath $unknownPath -ResumeDecision `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence
    Assert-True (-not $resume.eligible -and $resume.failedGates -contains 'TransactionPhaseKnown') 'Unknown transaction phase did not fail closed with its exact gate.'

    $resume=& $providerScript -ConfigPath $configPath -TransactionPath $journal -ResumeDecision `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence `
        -EvaluationTimeUtc ([datetime]::UtcNow.AddDays(2))
    Assert-True (-not $resume.eligible -and $resume.failedGates -contains 'TransactionJournalFresh') 'Stale transaction journal did not fail closed with its exact gate.'

    Set-Content -LiteralPath $configPath -Value '{"provider":"drifted","model":"fixture-model","context":131072}' -Encoding UTF8
    $resume=& $providerScript -ConfigPath $configPath -TransactionPath $journal -ResumeDecision `
        -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence
    Assert-True (-not $resume.eligible -and @($resume.failedGates).Count -eq 1 -and $resume.failedGates[0] -eq 'ConfigHashMatchesCommittedPhase') 'Config drift did not preserve the exact failed-gate name.'
    $restoreDriftRejected=$false
    try { & $providerScript -ConfigPath $configPath -TransactionPath $journal -Restore -Confirm:$false }
    catch { $restoreDriftRejected=($_.Exception.Message -eq "Restore blocked by failed gate 'ConfigHashMatchesRestoreSourcePhase'.") }
    Assert-True $restoreDriftRejected 'Restore did not fail closed with its exact gate when current config drifted.'
    Assert-True ((Get-Content -LiteralPath $configPath -Raw|ConvertFrom-Json).provider -eq 'drifted') 'Rejected restore overwrote drifted config.'
    Copy-Item -LiteralPath $committedConfigPath -Destination $configPath -Force
    & $providerScript -ConfigPath $configPath -TransactionPath $journal -Restore -Confirm:$false
    Assert-True ((Get-Content -LiteralPath $configPath -Raw|ConvertFrom-Json).provider -eq 'original') 'Provider restore transaction failed.'
    $nonBooleanRejected=$false
    try {
        & $providerScript -ConfigPath $configPath -BackupDirectory (Join-Path $tempRoot 'nonboolean-transactions') `
            -ProviderId 'ollama' -ModelId 'fixture-model' -EffectiveContext 131072 -OwnedKeys @('provider','model','context') @providerEvidence `
            -ApplyScopedEdit { param($path) Set-Content -LiteralPath $path -Value '{"provider":"ollama","model":"fixture-model","context":131072}' -Encoding UTF8 } `
            -PostCheck { param($path) [void]$path; 'true' } -GetOwnedState $ownedStateReader -Confirm:$false|Out-Null
    } catch { $nonBooleanRejected=$true }
    Assert-True $nonBooleanRejected 'A non-Boolean provider post-check was accepted.'
    Assert-True ((Get-Content -LiteralPath $configPath -Raw|ConvertFrom-Json).provider -eq 'original') 'Failed non-Boolean post-check did not restore the backup.'

    $gates=@(
        [pscustomobject]@{Name='LocalProfileVerified';Passed=$true},
        [pscustomobject]@{Name='LoopbackEndpointVerified';Passed=$true},
        [pscustomobject]@{Name='DesktopProcessElevation';Passed=$false},
        [pscustomobject]@{Name='ClipboardPreparation';Passed=$false}
    )
    $groups=@(
        [pscustomobject]@{Name='RuntimePreparation';RequiredGates=@('LocalProfileVerified','LoopbackEndpointVerified')},
        [pscustomobject]@{Name='HostCertification';RequiredGates=@('LocalProfileVerified','LoopbackEndpointVerified','DesktopProcessElevation','ClipboardPreparation')}
    )
    $runtimeDecision=& $gateResolver -Gate $gates -GateGroup $groups -RequiredGroup 'RuntimePreparation'
    Assert-True $runtimeDecision.Passed 'RuntimePreparation was incorrectly blocked by host-only gates.'
    $certificationDecision=& $gateResolver -Gate $gates -GateGroup $groups -RequiredGroup 'HostCertification'
    Assert-True (-not $certificationDecision.Passed) 'HostCertification bypassed host-only gates.'
    Assert-True ((@($certificationDecision.FailedGates) -join ',') -eq 'DesktopProcessElevation,ClipboardPreparation') 'Gate-group result did not preserve exact failed-gate names and order.'
    $duplicateRejected=$false;try{& $gateResolver -Gate $gates -GateGroup @([pscustomobject]@{Name='Bad';RequiredGates=@('LocalProfileVerified','LocalProfileVerified')})|Out-Null}catch{$duplicateRejected=$true}
    Assert-True $duplicateRejected 'Duplicate gate names inside a group were accepted.'

    if($PSVersionTable.PSVersion.Major -ge 7){
        $fakeCli=Join-Path $tempRoot 'fake-codex.exe'
        $source=@'
using System;
using System.Threading;
public static class FakeCodex {
    public static int Main(string[] args) {
        if (args.Length == 1 && args[0] == "--version") { Console.WriteLine("codex-cli 0.0.0"); return 0; }
        if (args.Length == 3 && args[0] == "debug" && args[1] == "models" && args[2] == "--bundled") {
            Console.WriteLine("{\"models\":[{\"slug\":\"online-first\",\"display_name\":\"Online first\",\"description\":\"fixture\",\"shell_type\":\"unified_exec\",\"use_responses_lite\":true,\"tool_mode\":\"code_mode_only\",\"multi_agent_version\":\"v2\",\"service_tier\":\"priority\",\"supports_search_tool\":true},{\"slug\":\"gpt-5.4-mini\",\"display_name\":\"Legacy compatible\",\"description\":\"fixture\",\"shell_type\":\"unified_exec\",\"use_responses_lite\":false,\"service_tiers\":[\"priority\"],\"supports_search_tool\":false}]}");
            return 0;
        }
        if (Environment.GetEnvironmentVariable("PWB_FAKE_TIMEOUT") == "1") { Thread.Sleep(5000); return 0; }
        if (Environment.GetEnvironmentVariable("PWB_FAKE_FLOOD") == "1") { Console.Write(new string('x', 8192)); return 0; }
        Console.WriteLine("{\"type\":\"thread.started\",\"thread_id\":\"fake\"}");
        Console.WriteLine("{\"type\":\"turn.started\"}");
        Console.WriteLine("{\"type\":\"item.completed\",\"item\":{\"id\":\"message-1\",\"type\":\"agent_message\",\"text\":\"EXACT_OK\"}}");
        Console.WriteLine("{\"type\":\"turn.completed\"}");
        Console.Error.WriteLine("fixture-stderr");
        return 0;
    }
}
'@
        $sourcePath=Join-Path $tempRoot 'fake-codex.cs';Set-Content $sourcePath $source
        $compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
        if(-not(Test-Path $compiler)){throw 'Local csc.exe is required.'}
        & $compiler /nologo /target:exe "/out:$fakeCli" $sourcePath
        $catalogPath=Join-Path $tempRoot 'fixture-catalog.json';Set-Content -LiteralPath $catalogPath -Value '{"models":[]}' -Encoding UTF8
        $catalogSha256=(Get-FileHash -LiteralPath $catalogPath -Algorithm SHA256).Hash.ToLowerInvariant()
        $catalogManifestPath=Join-Path $tempRoot 'fixture-catalog.manifest.json'
        [ordered]@{model='fixture-model';contextWindow=4096;codexVersion='0.0.0';codexSha256=(Get-FileHash -LiteralPath $fakeCli -Algorithm SHA256).Hash.ToLowerInvariant();catalogPath=$catalogPath;catalogSha256=$catalogSha256}|ConvertTo-Json|Set-Content -LiteralPath $catalogManifestPath -Encoding UTF8
        $capture=& $runner -Prompt 'fixture' -ModelId 'fixture-model' -ModelDigest 'fixture-digest' -ProviderId 'fixture-provider' -Endpoint 'http://127.0.0.1:11434' -EffectiveContext 4096 -WorkingDirectory $tempRoot -OutputDirectory (Join-Path $tempRoot capture) -CodexPath $fakeCli -CatalogManifestPath $catalogManifestPath
        Assert-True ($capture.captureStatus -eq 'Completed') 'Bounded runner legitimate control failed.'
        $validated=Invoke-EvidenceValidation -MetadataPath $capture.MetadataPath -Parameters @{ExpectedExecutableSha256=(Get-FileHash $fakeCli -Algorithm SHA256).Hash;ExpectedCodexVersion='0.0.0';ExpectedModelId='fixture-model';ExpectedModelDigest='fixture-digest';ExpectedEffectiveContext=4096;ExpectedCatalogSha256=$catalogSha256;ExpectedFinalText='EXACT_OK';RequireExactFinalText=$true}
        Assert-True $validated.Passed 'Captured legitimate control did not validate.'

        $generatedCatalogPath=Join-Path $tempRoot 'generated-local-catalog.json'
        $generatedCatalog=& $catalogGenerator -Model 'qwen3.5:9b' -ContextWindow 131072 -CodexPath $fakeCli -OutputPath $generatedCatalogPath
        $generatedModel=((Get-Content -LiteralPath $generatedCatalog.CatalogPath -Raw)|ConvertFrom-Json).models|Select-Object -First 1
        $generatedManifest=Get-Content -LiteralPath $generatedCatalog.ManifestPath -Raw|ConvertFrom-Json
        Assert-True ($generatedManifest.baseModelSlug -eq 'gpt-5.4-mini') 'Catalog generator did not prefer the legacy-compatible unified_exec template.'
        Assert-True (-not $generatedModel.use_responses_lite) 'Generated local catalog retained Responses Lite.'
        Assert-True ($null -eq $generatedModel.PSObject.Properties['tool_mode']) 'Generated local catalog retained code-mode transport.'
        Assert-True ($null -eq $generatedModel.PSObject.Properties['multi_agent_version']) 'Generated local catalog retained multi-agent transport.'
        Assert-True ($null -eq $generatedModel.PSObject.Properties['service_tier']) 'Generated local catalog retained a cloud service tier.'
        Assert-True ($null -eq $generatedModel.PSObject.Properties['service_tiers']) 'Generated local catalog retained cloud service tiers.'
        Assert-True (-not $generatedModel.supports_search_tool) 'Generated local catalog retained search-tool support.'
        Assert-True ($generatedManifest.unassertedCapabilities -contains 'responses-lite') 'Catalog manifest did not record unasserted Responses Lite transport.'
        Assert-True ($generatedManifest.unassertedCapabilities -contains 'service-tier') 'Catalog manifest did not record unasserted service-tier transport.'

        $originalLocalAppData=$env:LOCALAPPDATA
        $desktopRoot=Join-Path $tempRoot 'OpenAI\Codex\bin\fixture';New-Item -ItemType Directory -Path $desktopRoot -Force|Out-Null
        Copy-Item -LiteralPath $fakeCli -Destination (Join-Path $desktopRoot 'codex.exe')
        try{
            $env:LOCALAPPDATA=$tempRoot
            $defaultCatalog=& $catalogGenerator -Model 'qwen3.5:9b' -ContextWindow 131072 -OutputPath (Join-Path $tempRoot 'default-catalog.json')
            Assert-True ($defaultCatalog.Result -eq 'GENERATED') 'Catalog generator failed when ExpectedCodexSha256 was omitted.'
            $desktopHash=(Get-FileHash -LiteralPath (Join-Path $desktopRoot 'codex.exe') -Algorithm SHA256).Hash
            $hashedCatalog=& $catalogGenerator -Model 'qwen3.5:9b' -ContextWindow 131072 -ExpectedCodexSha256 $desktopHash -OutputPath (Join-Path $tempRoot 'hashed-catalog.json')
            Assert-True ($hashedCatalog.Result -eq 'GENERATED') 'Catalog generator rejected the correct ExpectedCodexSha256.'
            $wrongHashRejected=$false;try{& $catalogGenerator -Model 'qwen3.5:9b' -ContextWindow 131072 -ExpectedCodexSha256 ('0'*64) -OutputPath (Join-Path $tempRoot 'wrong-hash-catalog.json')|Out-Null}catch{$wrongHashRejected=$true}
            Assert-True $wrongHashRejected 'Catalog generator accepted an incorrect ExpectedCodexSha256.'
        }finally{$env:LOCALAPPDATA=$originalLocalAppData}

        $env:PWB_FAKE_FLOOD='1'
        try{$limited=& $runner -Prompt 'flood' -ModelId x -ModelDigest x -ProviderId x -Endpoint 'http://127.0.0.1:1' -EffectiveContext 1 -WorkingDirectory $tempRoot -OutputDirectory (Join-Path $tempRoot flood) -CodexPath $fakeCli -MaxStdoutBytes 1024 -MaxStderrBytes 1024 -MaxTotalOutputBytes 2048}
        finally{Remove-Item Env:PWB_FAKE_FLOOD -ErrorAction SilentlyContinue}
        Assert-True ($limited.outputLimitExceeded -and $limited.captureStatus -eq 'OutputLimitExceeded') 'Output limit was not enforced.'
    }
    'PowerShell Workbench agent harness contracts passed.'
} finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
```

## File: `Tests/Test-AutomaticVariableCliContracts.py`

```python
"""Exercise the public script through direct -File and pipeline in both PS hosts."""
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

scanner = Path(__file__).resolve().parents[1] / 'scripts/Test-PowerShellWorkbenchAutomaticVariables.ps1'

def quote(value):
    return "'" + str(value).replace("'", "''") + "'"

with tempfile.TemporaryDirectory(prefix='wrp-protected-cli-') as directory:
    root = Path(directory)
    bad = root / 'protected.ps1'
    other = root / 'other.ps1'
    good = root / 'safe.ps1'
    bad.write_text('$home = "controlled-fixture"\n', encoding='utf-8')
    other.write_text('$script:PID = 1\n', encoding='utf-8')
    good.write_text('$homeEntry = "safe"\n', encoding='utf-8')
    receipts = []
    for host in ['powershell.exe', 'pwsh.exe']:
        executable = shutil.which(host)
        assert executable, f'Required test host unavailable: {host}'
        cases = [
            ('bad-file', ['-File', str(scanner), '-Path', str(bad), '-AsJson'], 1, 1),
            ('good-file', ['-File', str(scanner), '-Path', str(good), '-AsJson'], 0, 0),
            ('nothrow-file', ['-File', str(scanner), '-Path', str(bad), '-AsJson', '-NoThrow'], 0, 1),
            ('pipeline', ['-Command', f'{quote(bad)}, {quote(other)} | & {quote(scanner)} -AsJson -NoThrow'], 0, 2),
            ('path-array', ['-Command', f'& {quote(scanner)} -Path @({quote(bad)}, {quote(other)}) -AsJson -NoThrow'], 0, 2),
        ]
        for name, args, expected_exit, expected_count in cases:
            result = subprocess.run([executable, '-NoLogo', '-NoProfile', '-NonInteractive', *args],
                                    input='', capture_output=True, text=True, encoding='utf-8', errors='replace')
            data = json.loads(result.stdout)
            assert result.returncode == expected_exit, (host, name, result.returncode, result.stderr)
            assert len(data['Diagnostics']) == expected_count, (host, name, data)
            assert data['Passed'] is (expected_count == 0), (host, name, data)
            receipts.append({'host': host, 'case': name, 'exitCode': result.returncode, 'diagnostics': expected_count})
    print(json.dumps({'status': 'PASS', 'cases': receipts}, indent=2))
```

## File: `Tests/Test-AutomaticVariableContracts.ps1`

```powershell
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot
$guard=Join-Path $pluginRoot 'scripts\Test-PowerShellWorkbenchAutomaticVariables.ps1'
$fixtureRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-variable-contracts-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixtureRoot|Out-Null
$cases=@(
    @{Name='simple';Source='$HOME = "unsafe"';Variables=@('$HOME')},
    @{Name='typed';Source='[string]$HOME = "unsafe"';Variables=@('$HOME')},
    @{Name='pid';Source='[int]$PID = 7';Variables=@('$PID')},
    @{Name='attributed';Source='[ValidateNotNullOrEmpty()][string]$HOME = "unsafe"';Variables=@('$HOME')},
    @{Name='typed-scoped';Source='[string]$script:HOME = "unsafe"';Variables=@('$script:HOME')},
    @{Name='tuple';Source='$safeValue, $HOME = 1, "unsafe"';Variables=@('$HOME')},
    @{Name='two-targets';Source='$HOME, $PID = "unsafe", 7';Variables=@('$HOME','$PID')},
    @{Name='safe-typed-rhs';Source='[string]$homeEntry = $HOME';Variables=@()},
    @{Name='index-read';Source='$values[$HOME] = 1';Variables=@()},
    @{Name='member-read';Source='$box.$HOME = 1';Variables=@()},
    @{Name='safe-tuple';Source='$homeEntry, $processId = $HOME, $PID';Variables=@()}
)
$tested=0
try {
    foreach($case in $cases){
        $file=Join-Path $fixtureRoot ($case.Name+'.ps1')
        [IO.File]::WriteAllText($file,$case.Source,[Text.UTF8Encoding]::new($false))
        $tokens=$null;$parseErrors=$null
        $null=[Management.Automation.Language.Parser]::ParseFile($file,[ref]$tokens,[ref]$parseErrors)
        if(@($parseErrors).Count -gt 0){throw "Invalid test fixture: $($case.Name)"}
        $result=& $guard -Path $file -NoThrow
        $actual=@($result.Diagnostics|ForEach-Object {$_.Variable})
        if($result.Passed -ne ($case.Variables.Count -eq 0) -or $actual.Count -ne $case.Variables.Count){throw "Wrong assignment result: $($case.Name)"}
        for($index=0;$index -lt $actual.Count;$index++){
            if($actual[$index] -cne $case.Variables[$index]){throw "Wrong target diagnostic: $($case.Name)"}
            if($result.Diagnostics[$index].Line -ne 1 -or $result.Diagnostics[$index].Column -lt 1 -or $result.Diagnostics[$index].Rule -ne 'PSWorkbench.ProtectedAutomaticVariable'){throw "Wrong target location/rule: $($case.Name)"}
        }
        $tested++
    }
    $mustThrow=$false
    try{& $guard -Path (Join-Path $fixtureRoot 'typed.ps1')|Out-Null}catch{$mustThrow=$true}
    if(-not $mustThrow){throw 'Typed protected assignment did not throw without NoThrow.'}
    $aggregate=@((Join-Path $fixtureRoot 'typed.ps1'),(Join-Path $fixtureRoot 'two-targets.ps1'))|& $guard -NoThrow
    if($aggregate.Passed -or @($aggregate.Diagnostics).Count -ne 3){throw 'Pipeline aggregation lost assignment diagnostics.'}
    "PowerShell Workbench automatic-variable contracts passed ($tested cases, throw mode and pipeline aggregation)."
} finally {
    $resolvedFixture=[IO.Path]::GetFullPath($fixtureRoot)
    if(-not $resolvedFixture.StartsWith([IO.Path]::GetFullPath([IO.Path]::GetTempPath()),[StringComparison]::OrdinalIgnoreCase)){throw 'Fixture cleanup escaped TEMP.'}
    Remove-Item -LiteralPath $resolvedFixture -Recurse -Force
}
```

## File: `Tests/Test-CatalogMigrationContracts.ps1`

```powershell
[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$pluginRoot = Split-Path -Parent $PSScriptRoot
$previewer = Join-Path $pluginRoot 'scripts\Get-PowerShellWorkbenchCatalogMigrationPreview.ps1'
$generator = Join-Path $pluginRoot 'scripts\New-PowerShellWorkbenchLocalModelCatalog.ps1'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-catalog-migration-' + [guid]::NewGuid().ToString('N'))
$referenceTime = [datetimeoffset]'2026-09-06T12:00:00Z'
$maximumSourceAgeHours = 24
$expectedOverrides = @(
    'use_responses_lite=false when present',
    'tool_mode removed when present',
    'multi_agent_version removed when present',
    'service_tier/service_tiers removed when present',
    'supports_search_tool=false when present'
)
$expectedUnasserted = @(
    'reasoning-levels',
    'speed-tiers',
    'service-tier',
    'input-modalities',
    'responses-lite',
    'tool-mode',
    'multi-agent-version',
    'search-tool'
)
New-Item -ItemType Directory -Path $tempRoot | Out-Null

function Assert-GatesExactly {
    param($Result,[string[]]$Expected,[string]$Message)
    if (@($Result.FailedGates).Count -ne $Expected.Count -or (Compare-Object @($Result.FailedGates) $Expected)) {
        throw "$Message Actual: $($Result.FailedGates -join ', ')"
    }
}

function Get-Snapshot {
    param([string]$Root)
    @((Get-ChildItem -LiteralPath $Root -Recurse -File | ForEach-Object {
        "$($_.FullName)|$($_.Length)|$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)|$($_.LastWriteTimeUtc.Ticks)"
    }) | Sort-Object) -join "`n"
}

function Initialize-Fixture {
    param([string]$Name,[string]$SchemaVersion = '1.0',[switch]$UnknownProperty)
    $root = Join-Path $tempRoot $Name
    New-Item -ItemType Directory -Path $root | Out-Null
    $codexPath = Join-Path $root 'codex.exe'
    Set-Content -LiteralPath $codexPath -Value 'fixture-codex' -Encoding UTF8
    $catalogPath = Join-Path $root 'catalog.json'
    '{"models":[{"slug":"fixture-model","display_name":"Fixture model"}]}' |
        Set-Content -LiteralPath $catalogPath -Encoding UTF8
    $unasserted = if ($SchemaVersion -ceq '1.1') { $expectedUnasserted } else { @('reasoning-levels') }
    $manifest = [ordered]@{
        schemaVersion=$SchemaVersion;generatedAtUtc='2026-09-06T08:00:00Z';model='fixture-model';contextWindow=4096
        codexPath=$codexPath;codexVersion='0.0.0';codexSha256=(Get-FileHash $codexPath -Algorithm SHA256).Hash.ToLowerInvariant()
        baseModelSlug='fixture-base';bundledCatalogSha256=('a' * 64);catalogPath=$catalogPath
        catalogSha256=(Get-FileHash $catalogPath -Algorithm SHA256).Hash.ToLowerInvariant();unassertedCapabilities=$unasserted
    }
    if ($SchemaVersion -ceq '1.1') {
        $snapshot = [ordered]@{use_responses_lite=$false;tool_mode=$null;multi_agent_version=$null;supports_search_tool=$false}
        $manifest.transport = [ordered]@{base=$snapshot;effective=$snapshot;overrides=$expectedOverrides}
    }
    if ($UnknownProperty) { $manifest.unexpected = 'blocked' }
    $manifestPath = Join-Path $root 'catalog.json.manifest.json'
    $manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    [pscustomobject]@{
        Root=$root;ManifestPath=$manifestPath
        ManifestSha256=(Get-FileHash $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
        CatalogPath=$catalogPath;CodexPath=$codexPath
    }
}

function Invoke-Preview {
    param(
        [Parameter(Mandatory)]$Fixture,
        [string]$ExpectedManifestSha256,
        [string]$DestinationCatalogPath,
        [string]$AllowedWriteRoot,
        [datetimeoffset]$At = $referenceTime,
        [int]$MaximumAgeHours = $maximumSourceAgeHours
    )
    if ([string]::IsNullOrWhiteSpace($ExpectedManifestSha256)) { $ExpectedManifestSha256 = $Fixture.ManifestSha256 }
    if ([string]::IsNullOrWhiteSpace($DestinationCatalogPath)) { $DestinationCatalogPath = $Fixture.CatalogPath }
    if ([string]::IsNullOrWhiteSpace($AllowedWriteRoot)) { $AllowedWriteRoot = $Fixture.Root }
    & $previewer -ManifestPath $Fixture.ManifestPath -ExpectedManifestSha256 $ExpectedManifestSha256 `
        -DestinationCatalogPath $DestinationCatalogPath -AllowedWriteRoot $AllowedWriteRoot `
        -ReferenceTimeUtc $At -MaximumSourceAgeHours $MaximumAgeHours -NoThrow
}

try {
    $tokens = $null
    $errors = $null
    $ast = [Management.Automation.Language.Parser]::ParseFile($previewer,[ref]$tokens,[ref]$errors)
    if (@($errors).Count -ne 0) { throw 'Catalog migration previewer has parser errors.' }
    $commands = @($ast.FindAll({param($node) $node -is [Management.Automation.Language.CommandAst]},$true) |
        ForEach-Object { $_.GetCommandName() } | Where-Object { $_ })
    foreach ($forbidden in @(
        'Set-Content','Add-Content','Out-File','New-Item','Copy-Item','Move-Item','Remove-Item','Start-Process',
        'Invoke-RestMethod','Invoke-WebRequest','Invoke-Expression','Set-Clipboard','git','gh'
    )) {
        if ($commands -contains $forbidden) { throw "Previewer contains forbidden command '$forbidden'." }
    }

    $fixture = Initialize-Fixture -Name legacy
    $before = Get-Snapshot -Root $fixture.Root
    $first = Invoke-Preview -Fixture $fixture
    $second = Invoke-Preview -Fixture $fixture
    if ($first.State -cne 'PREVIEW_READY' -or -not $first.Eligible -or -not $first.MigrationRequired -or
        $first.WritePerformed -or $first.ExecutionPerformed -or $first.TransportPerformed) {
        throw 'Legacy preview readiness contract failed.'
    }
    if ($first.Plan.Operation -cne 'RegenerateCatalog' -or -not $first.Plan.BackupRequired -or
        -not $first.Plan.PostValidationRequired -or -not $first.Plan.ExplicitApplyAuthorizationRequired) {
        throw 'Migration plan safety contract failed.'
    }
    if ($first.Plan.GeneratorPath -cne [IO.Path]::GetFullPath($generator) -or
        $first.Plan.GeneratorSha256 -cne (Get-FileHash -LiteralPath $generator -Algorithm SHA256).Hash.ToLowerInvariant() -or
        $first.Plan.AllowedWriteRoot -cne [IO.Path]::GetFullPath($fixture.Root) -or
        $first.Plan.BundledCatalogSha256 -cne ('a' * 64)) {
        throw 'Migration plan provenance binding failed.'
    }
    $argumentNames = @($first.Plan.GeneratorArguments.Keys)
    $expectedArgumentNames = @('Model','ContextWindow','DisplayName','CodexPath','ExpectedCodexSha256','OutputPath')
    if (Compare-Object $argumentNames $expectedArgumentNames -SyncWindow 0) { throw 'Generator argument mapping changed.' }
    if ($first.Plan.GeneratorArguments.OutputPath -cne $fixture.CatalogPath -or
        $first.Plan.GeneratorArguments.ExpectedCodexSha256 -cne $first.Plan.SourceCodexSha256) {
        throw 'Generator argument values are not bound to verified evidence.'
    }
    if ($first.PlanSha256 -cne $second.PlanSha256 -or
        (($first | ConvertTo-Json -Depth 12 -Compress) -cne ($second | ConvertTo-Json -Depth 12 -Compress))) {
        throw 'Migration preview is not deterministic.'
    }
    if ((Get-Snapshot -Root $fixture.Root) -cne $before) { throw 'Migration preview changed source evidence.' }

    $widerRoot = Invoke-Preview -Fixture $fixture -AllowedWriteRoot $tempRoot
    if ($widerRoot.State -cne 'PREVIEW_READY' -or $widerRoot.PlanSha256 -ceq $first.PlanSha256) {
        throw 'Allowed root policy is not bound into PlanSha256.'
    }
    $laterReference = Invoke-Preview -Fixture $fixture -At ([datetimeoffset]'2026-09-06T13:00:00Z')
    if ($laterReference.State -cne 'PREVIEW_READY' -or $laterReference.PlanSha256 -ceq $first.PlanSha256) {
        throw 'Freshness policy is not bound into PlanSha256.'
    }

    $current = Initialize-Fixture -Name current -SchemaVersion '1.1'
    $noChange = Invoke-Preview -Fixture $current
    if ($noChange.State -cne 'NO_CHANGE' -or $noChange.Eligible -or $noChange.MigrationRequired -or $null -ne $noChange.Plan) {
        throw 'Current-schema no-change contract failed.'
    }

    $transportManifest = Get-Content -LiteralPath $current.ManifestPath -Raw | ConvertFrom-Json
    $transportManifest.transport.effective.tool_mode = 'code_mode_only'
    $transportManifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $current.ManifestPath -Encoding UTF8
    $transportResult = Invoke-Preview -Fixture $current -ExpectedManifestSha256 (Get-FileHash $current.ManifestPath -Algorithm SHA256).Hash
    Assert-GatesExactly -Result $transportResult -Expected @('SourceTransportEvidence') -Message 'Transport invariant gate changed.'

    foreach ($falseLike in @(0,'False')) {
        $typedTransport = Initialize-Fixture -Name ("transport-type-$falseLike") -SchemaVersion '1.1'
        $typedManifest = Get-Content -LiteralPath $typedTransport.ManifestPath -Raw | ConvertFrom-Json
        $typedManifest.transport.effective.use_responses_lite = $falseLike
        $typedManifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $typedTransport.ManifestPath -Encoding UTF8
        $typedResult = Invoke-Preview -Fixture $typedTransport `
            -ExpectedManifestSha256 (Get-FileHash $typedTransport.ManifestPath -Algorithm SHA256).Hash
        Assert-GatesExactly -Result $typedResult -Expected @('SourceTransportEvidence') `
            -Message "Transport type gate changed for '$falseLike'."
    }

    $hashDrift = Invoke-Preview -Fixture $fixture -ExpectedManifestSha256 ('0' * 64)
    Assert-GatesExactly -Result $hashDrift -Expected @('SourceManifestHash') -Message 'Manifest drift gate changed.'

    $unknown = Initialize-Fixture -Name unknown -SchemaVersion '9.9'
    $unknownResult = Invoke-Preview -Fixture $unknown
    Assert-GatesExactly -Result $unknownResult -Expected @('SourceSchemaSupported') -Message 'Unknown schema gate changed.'

    $extra = Initialize-Fixture -Name extra -UnknownProperty
    $extraResult = Invoke-Preview -Fixture $extra
    Assert-GatesExactly -Result $extraResult -Expected @('SourceManifestShape') -Message 'Unexpected manifest property gate changed.'

    $identity = Initialize-Fixture -Name identity
    $identityManifest = Get-Content -LiteralPath $identity.ManifestPath -Raw | ConvertFrom-Json
    $identityManifest.bundledCatalogSha256 = 'unknown'
    $identityManifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $identity.ManifestPath -Encoding UTF8
    $identityResult = Invoke-Preview -Fixture $identity -ExpectedManifestSha256 (Get-FileHash $identity.ManifestPath -Algorithm SHA256).Hash
    Assert-GatesExactly -Result $identityResult -Expected @('SourceGenerationIdentity') -Message 'Generation identity gate changed.'

    $capabilities = Initialize-Fixture -Name capabilities
    $capabilitiesManifest = Get-Content -LiteralPath $capabilities.ManifestPath -Raw | ConvertFrom-Json
    $capabilitiesManifest.unassertedCapabilities = @('duplicate','duplicate')
    $capabilitiesManifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $capabilities.ManifestPath -Encoding UTF8
    $capabilitiesResult = Invoke-Preview -Fixture $capabilities -ExpectedManifestSha256 (Get-FileHash $capabilities.ManifestPath -Algorithm SHA256).Hash
    Assert-GatesExactly -Result $capabilitiesResult -Expected @('SourceCapabilityEvidence') -Message 'Capability evidence gate changed.'

    $stale = Initialize-Fixture -Name stale
    $staleManifest = Get-Content -LiteralPath $stale.ManifestPath -Raw | ConvertFrom-Json
    $staleManifest.generatedAtUtc = '2026-09-04T08:00:00Z'
    $staleManifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $stale.ManifestPath -Encoding UTF8
    $staleResult = Invoke-Preview -Fixture $stale -ExpectedManifestSha256 (Get-FileHash $stale.ManifestPath -Algorithm SHA256).Hash
    Assert-GatesExactly -Result $staleResult -Expected @('SourceFreshness') -Message 'Stale source gate changed.'

    $future = Initialize-Fixture -Name future
    $futureManifest = Get-Content -LiteralPath $future.ManifestPath -Raw | ConvertFrom-Json
    $futureManifest.generatedAtUtc = '2026-09-07T08:00:00Z'
    $futureManifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $future.ManifestPath -Encoding UTF8
    $futureResult = Invoke-Preview -Fixture $future -ExpectedManifestSha256 (Get-FileHash $future.ManifestPath -Algorithm SHA256).Hash
    Assert-GatesExactly -Result $futureResult -Expected @('SourceFreshness') -Message 'Future source gate changed.'

    Set-Content -LiteralPath $fixture.CatalogPath -Value '{"models":[]}' -Encoding UTF8
    $catalogDrift = Invoke-Preview -Fixture $fixture
    Assert-GatesExactly -Result $catalogDrift -Expected @('SourceCatalogHash') -Message 'Catalog drift gate changed.'

    $boundary = Initialize-Fixture -Name boundary -SchemaVersion '1.1'
    $outside = Join-Path $tempRoot 'outside.json'
    $outsideResult = Invoke-Preview -Fixture $boundary -DestinationCatalogPath $outside
    Assert-GatesExactly -Result $outsideResult -Expected @('DestinationPathAllowed') -Message 'Destination boundary gate changed.'

    $driveRelativeManifest = [pscustomobject]@{
        Root=$boundary.Root;ManifestPath='C:relative-manifest.json';ManifestSha256=$boundary.ManifestSha256
        CatalogPath=$boundary.CatalogPath;CodexPath=$boundary.CodexPath
    }
    $driveRelativeManifestResult = Invoke-Preview -Fixture $driveRelativeManifest
    Assert-GatesExactly -Result $driveRelativeManifestResult -Expected @('SourceManifestPathAbsolute') `
        -Message 'Drive-relative manifest gate changed.'

    $driveRelativeDestinationResult = Invoke-Preview -Fixture $boundary -DestinationCatalogPath 'C:relative-catalog.json'
    Assert-GatesExactly -Result $driveRelativeDestinationResult -Expected @('DestinationCatalogPathAbsolute') `
        -Message 'Drive-relative destination gate changed.'

    $driveRelativeRootResult = Invoke-Preview -Fixture $boundary -AllowedWriteRoot 'C:relative-root'
    Assert-GatesExactly -Result $driveRelativeRootResult -Expected @('AllowedWriteRootAbsolute') `
        -Message 'Drive-relative allowed root gate changed.'

    $relativeCatalog = Initialize-Fixture -Name relative-catalog
    $relativeCatalogManifest = Get-Content -LiteralPath $relativeCatalog.ManifestPath -Raw | ConvertFrom-Json
    $relativeCatalogManifest.catalogPath = 'C:relative-catalog.json'
    $relativeCatalogManifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $relativeCatalog.ManifestPath -Encoding UTF8
    $relativeCatalogResult = Invoke-Preview -Fixture $relativeCatalog `
        -ExpectedManifestSha256 (Get-FileHash $relativeCatalog.ManifestPath -Algorithm SHA256).Hash
    Assert-GatesExactly -Result $relativeCatalogResult -Expected @('SourceCatalogPathAbsolute') `
        -Message 'Drive-relative source catalog gate changed.'

    $relativeCodex = Initialize-Fixture -Name relative-codex
    $relativeCodexManifest = Get-Content -LiteralPath $relativeCodex.ManifestPath -Raw | ConvertFrom-Json
    $relativeCodexManifest.codexPath = 'C:relative-codex.exe'
    $relativeCodexManifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $relativeCodex.ManifestPath -Encoding UTF8
    $relativeCodexResult = Invoke-Preview -Fixture $relativeCodex `
        -ExpectedManifestSha256 (Get-FileHash $relativeCodex.ManifestPath -Algorithm SHA256).Hash
    Assert-GatesExactly -Result $relativeCodexResult -Expected @('SourceCodexPathAbsolute') `
        -Message 'Drive-relative source Codex gate changed.'

    $reparse = Initialize-Fixture -Name reparse
    $reparseTarget = Join-Path $tempRoot 'reparse-target'
    New-Item -ItemType Directory -Path $reparseTarget | Out-Null
    $reparseLink = Join-Path $reparse.Root 'linked'
    New-Item -ItemType Junction -Path $reparseLink -Target $reparseTarget | Out-Null
    $reparseResult = Invoke-Preview -Fixture $reparse -DestinationCatalogPath (Join-Path $reparseLink 'catalog.json')
    Assert-GatesExactly -Result $reparseResult -Expected @('DestinationPathNotReparsePoint') -Message 'Destination reparse gate changed.'

    $rootReparseResult = Invoke-Preview -Fixture $reparse -DestinationCatalogPath (Join-Path $reparseLink 'catalog.json') `
        -AllowedWriteRoot $reparseLink
    Assert-GatesExactly -Result $rootReparseResult -Expected @('AllowedWriteRootNotReparsePoint') `
        -Message 'Allowed root reparse gate changed.'

    'PowerShell Workbench catalog migration contracts passed.'
} finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
```

## File: `Tests/Test-CheckpointContracts.ps1`

```powershell
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
function Assert-True { param([Parameter(Mandatory)][bool]$Condition,[Parameter(Mandatory)][string]$Message) if(-not $Condition){throw $Message} }

$pluginRoot=Split-Path -Parent $PSScriptRoot;$newCheckpoint=Join-Path $pluginRoot 'scripts\New-PowerShellWorkbenchCheckpoint.ps1';$testCheckpoint=Join-Path $pluginRoot 'scripts\Test-PowerShellWorkbenchCheckpoint.ps1';$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-checkpoint-'+[guid]::NewGuid().ToString('N'))
try{
    New-Item -ItemType Directory -Path $tempRoot -Force|Out-Null
    $artifactPath=Join-Path $tempRoot 'artifact.txt';$checkpointPath=Join-Path $tempRoot 'checkpoint.json';$previewPath=Join-Path $tempRoot 'preview.json';Set-Content -LiteralPath $artifactPath -Value 'initial artifact' -Encoding UTF8
    $preview=& $newCheckpoint -CheckpointPath $previewPath -StepId 'servicing.stage' -ArtifactPath $artifactPath -NoWrite
    Assert-True -Condition (-not $preview.WasWritten) -Message 'NoWrite checkpoint preview reported a write.'
    Assert-True -Condition $preview.WasPreview -Message 'NoWrite checkpoint preview did not report preview mode.'
    Assert-True -Condition (-not(Test-Path -LiteralPath $previewPath -PathType Leaf)) -Message 'NoWrite checkpoint preview created a file.'
    $created=& $newCheckpoint -CheckpointPath $checkpointPath -StepId 'servicing.stage' -Status Prepared -MountState None -ArtifactPath $artifactPath -ToolPath $env:ComSpec -Precondition 'Path is local.' -Postcondition 'Artifact hash is unchanged.'
    Assert-True -Condition $created.WasWritten -Message 'Checkpoint contract was not written.'
    Assert-True -Condition ($created.Checkpoint.ResumeToken -match '^[A-F0-9]{64}$') -Message 'Checkpoint resume token is not a SHA256 value.'
    $valid=& $testCheckpoint -CheckpointPath $checkpointPath
    Assert-True -Condition $valid.Passed -Message 'Fresh checkpoint contract did not validate.'
    foreach($hostName in @('powershell.exe','pwsh.exe')) {
        $hostCommand=Get-Command $hostName -ErrorAction SilentlyContinue
        if($hostCommand) {
            & $hostCommand.Source -NoProfile -ExecutionPolicy Bypass -File $testCheckpoint -CheckpointPath $checkpointPath
            Assert-True -Condition ($LASTEXITCODE -eq 0) -Message "Checkpoint contract did not validate in a child $hostName process."
        }
    }
    Set-Content -LiteralPath $artifactPath -Value 'drifted artifact' -Encoding UTF8
    $drifted=& $testCheckpoint -CheckpointPath $checkpointPath -NoThrow
    Assert-True -Condition (-not $drifted.Passed) -Message 'Checkpoint validator accepted an artifact with drift.'
    Assert-True -Condition (($drifted.Diagnostics -match 'Artifact hash drift detected').Count -gt 0) -Message 'Checkpoint validator did not explain artifact drift.'
    'Checkpoint contract tests passed.'
}finally{Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue}
```

## File: `Tests/Test-ComponentPipelineContracts.ps1`

```powershell
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$pluginRoot = Split-Path -Parent $PSScriptRoot
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('workbench-components-' + [guid]::NewGuid().ToString('N'))
try {
    $null = New-Item -ItemType Directory -Path $tempRoot
    $source = Join-Path $tempRoot 'fixture.ps1'
    [IO.File]::WriteAllText($source, 'function Get-Fixture { param($Value) $script:State = $Value; & $SelectedCommand }; throw "DO_NOT_EXECUTE"', (New-Object Text.UTF8Encoding($false)))
    $analyzer = Join-Path $pluginRoot 'scripts/Get-PowerShellWorkbenchCodeAnalysis.ps1'
    $analysis = (& $analyzer -Path $source) | ConvertFrom-Json
    if (-not $analysis.passed -or $analysis.sourceExecutionPerformed -or $analysis.dependencyAnalysisComplete) { throw 'AST scope/no-execution contract failed.' }
    if ($analysis.dynamicCommandCount -ne 1 -or @($analysis.functions).Count -ne 1) { throw 'AST function/dynamic-command inventory failed.' }
    if (@($analysis.variables | Where-Object { $_.name -eq 'script:State' }).Count -ne 1) { throw 'Script-scope variable was not inventoried.' }
    [IO.File]::WriteAllText($source, 'function {', (New-Object Text.UTF8Encoding($false)))
    $invalid = (& $analyzer -Path $source) | ConvertFrom-Json
    if ($invalid.passed -or @($invalid.errors).Count -eq 0) { throw 'Malformed PowerShell was not rejected.' }
    $generator = Join-Path $pluginRoot 'scripts/New-PowerShellArtifact.ps1'
    $item = & $generator -Kind AdvancedFunction -Name Get-Registered -Destination $tempRoot -Profile Generic -ProjectRoot $tempRoot -Confirm:$false
    if (-not $item.ComponentId -or $item.ComponentVersion -ne '1.0.0') { throw 'Generator did not return a component ID and version.' }
    $recordPath = Join-Path $item.ComponentArchive ($item.ComponentId + '/1.0.0/component.json')
    $record = Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
    if ($record.contract.reviewed -or @($record.contract.unresolved).Count -eq 0) { throw 'Generated template was not registered as draft.' }
    if ($record.sha256 -cne (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant()) { throw 'Registered snapshot hash differs from generated code.' }
    'PowerShell Workbench component pipeline contracts passed.'
} finally {
    if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}
```

## File: `Tests/Test-ContextContracts.ps1`

```powershell
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot;$resolver=Join-Path $pluginRoot 'scripts\Resolve-PowerShellWorkbenchContext.ps1';$guard=Join-Path $pluginRoot 'scripts\Test-PowerShellWorkbenchAutomaticVariables.ps1';$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-context-'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path $tempRoot|Out-Null
try{
    $servicingScript=Join-Path $tempRoot 'Build-Media.ps1';Set-Content -LiteralPath $servicingScript -Value 'dism.exe /Mount-Image /ImageFile:install.wim`noscdimg.exe -bboot.stl output.iso' -Encoding UTF8
    $context=& $resolver -Path $tempRoot
    if($context.Profile -ne 'WindowsServicingToolkit'){throw 'Servicing capabilities did not select WindowsServicingToolkit.'}
    if('DISM' -notin $context.NativeTools -or 'Mount' -notin $context.RiskSurfaces){throw 'Servicing inventory is incomplete.'}
    $boundaryRoot=Join-Path $tempRoot 'BoundaryProject';$sourceRoot=Join-Path $boundaryRoot 'Source';New-Item -ItemType Directory -Path (Join-Path $boundaryRoot '.git'),$sourceRoot -Force|Out-Null
    Set-Content -LiteralPath (Join-Path $sourceRoot 'Build-Media.ps1') -Value 'dism.exe /Mount-Image /ImageFile:install.wim' -Encoding UTF8
    $boundaryContext=& $resolver -Path $sourceRoot
    if($boundaryContext.ProjectRoot -ne $boundaryRoot -or $boundaryContext.ProjectRootEvidence -ne 'RepositoryBoundary:.git' -or $boundaryContext.Profile -ne 'WindowsServicingToolkit' -or $boundaryContext.ProfileEvidence -ne 'Capability:WindowsServicingToolkit'){throw 'Explicit repository boundary did not retain its project root while classifying servicing capabilities.'}
    $requestedContext=& $resolver -Path $sourceRoot -RequestedProfile RecoveryToolkit
    if($requestedContext.ProjectRoot -ne $boundaryRoot -or $requestedContext.Profile -ne 'RecoveryToolkit' -or $requestedContext.ProfileEvidence -ne 'RequestedProfile:RecoveryToolkit'){throw 'An explicit requested profile did not take precedence over boundary capability heuristics.'}
    $unrelatedRoot=Join-Path $tempRoot 'UnrelatedServicingParent';$nestedRoot=Join-Path $unrelatedRoot 'NestedScriptOnlyProject';New-Item -ItemType Directory -Path $nestedRoot -Force|Out-Null
    Set-Content -LiteralPath (Join-Path $unrelatedRoot 'Build-Media.ps1') -Value 'dism.exe /Mount-Image /ImageFile:install.wim' -Encoding UTF8
    $nestedContext=& $resolver -Path $nestedRoot
    if($nestedContext.ProjectRoot -ne $nestedRoot -or $nestedContext.Profile -ne 'Generic' -or $nestedContext.Source -ne 'StartPath'){throw 'Default context resolution scanned an unrelated ancestor or failed to retain the start path.'}
    $ancestorContext=& $resolver -Path $nestedRoot -AllowAncestorHeuristics
    if($ancestorContext.ProjectRoot -ne $unrelatedRoot -or $ancestorContext.Profile -ne 'WindowsServicingToolkit' -or $ancestorContext.Source -ne 'Ancestor'){throw 'Opt-in ancestor heuristics did not remain available for deliberate wider classification.'}
    if(@($context.DetectedPowerShellRuntimes | Where-Object { $_.Architecture -eq 'Unknown' }).Count -gt 0){throw 'Runtime inventory did not probe executable architecture.'}
    $skippedRuntimeContext=& $resolver -Path $tempRoot -SkipRuntimeProbe
    if($skippedRuntimeContext.RuntimeProbeState -ne 'SKIPPED' -or @($skippedRuntimeContext.DetectedPowerShellRuntimes).Count -ne 0){throw 'SkipRuntimeProbe did not preserve an explicit no-probe state.'}
    $collision=Join-Path $tempRoot 'collision.ps1';Set-Content -LiteralPath $collision -Value '$home = "unsafe"' -Encoding UTF8
    $result=& $guard -Path $collision -NoThrow
    if($result.Passed -or $result.Diagnostics[0].Line -ne 1 -or $result.Diagnostics[0].SuggestedReplacement -ne '$homeEntry' -or $result.Diagnostics[0].Message -ne 'Assignment to protected automatic variable ''$home''. Use ''$homeEntry'' instead.'){throw 'Automatic-variable guard did not produce the expected diagnostic.'}
    $clean=Join-Path $tempRoot 'clean.ps1';Set-Content -LiteralPath $clean -Value '$homeEntry = "safe"' -Encoding UTF8
    if(-not((& $guard -Path $clean -NoThrow).Passed)){throw 'Automatic-variable guard rejected a safe variable.'}
    'PowerShell Workbench context contracts passed.'
}finally{Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue}
```

## File: `Tests/Test-DoctorContracts.ps1`

```powershell
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot;$doctor=Join-Path $pluginRoot 'scripts\Invoke-PowerShellWorkbenchDoctor.ps1';$newProfile=Join-Path $pluginRoot 'scripts\New-PowerShellWorkbenchProjectProfile.ps1';$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-doctor-'+[guid]::NewGuid().ToString('N'))
try{
    New-Item -ItemType Directory -Path $tempRoot|Out-Null;[IO.File]::WriteAllText((Join-Path $tempRoot 'fixture.ps1'),"function Get-Fixture {`n 'ok'`n}`n",(New-Object Text.UTF8Encoding($false)))
    $missing=& $doctor -ProjectRoot $tempRoot -Fast
    if($missing.State -ne 'READY' -or $missing.ProfileState -ne 'MISSING' -or $missing.Context.RuntimeProbeState -ne 'SKIPPED' -or $missing.NextSafeAction -notmatch 'New-PowerShellWorkbenchProjectProfile' -or $missing.WritePerformed -or $missing.NetworkPerformed -or $missing.ProcessPerformed -or $missing.TransportPerformed){throw 'Doctor did not return a non-executing missing-profile diagnosis with an explicit skipped runtime state.'}
    $profileResult=& $newProfile -ProjectRoot $tempRoot -Confirm:$false
    $waiting=& $doctor -ProjectRoot $tempRoot -ProfilePath $profileResult.ProfilePath -Fast -AllowedEncoding Utf8NoBom -AllowedLineEnding LF
    if($waiting.ProfileState -ne 'VALID' -or $waiting.State -ne 'WAITING' -or $waiting.Assessment.FailedGates -notcontains 'AssessmentProfilePresent' -or $waiting.TextIntegrity.FailedGates.Count -ne 0){throw 'Doctor did not compose valid profile, missing assessment, and text-policy evidence.'}
    $json=& $doctor -ProjectRoot $tempRoot -ProfilePath $profileResult.ProfilePath -Fast -AsJson|ConvertFrom-Json
    if($json.SchemaVersion -ne '1.0' -or $json.WritePerformed -or $json.TransportPerformed){throw 'Doctor JSON did not preserve no-execution guarantees.'}
    'PowerShell Workbench Doctor contracts passed.'
}finally{if(Test-Path -LiteralPath $tempRoot){Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue}}
```

## File: `Tests/Test-DocumentationCatalogContracts.ps1`

```powershell
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot
$validator=Join-Path $pluginRoot 'scripts\Test-PowerShellWorkbenchDocumentationCatalog.ps1'
$catalogPath=Join-Path $pluginRoot 'assets\documentation-source-catalog.json'
$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-doc-catalog-'+[guid]::NewGuid().ToString('N'))
function Assert-True{param([bool]$Condition,[string]$Message)if(-not$Condition){throw $Message}}
function Get-Hash{param([string]$Path)(Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()}
function Write-Fixture{param([object]$Value,[string]$Path)$Value|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $Path -Encoding UTF8;Get-Hash -Path $Path}

$tokens=$null;$errors=$null;$null=[Management.Automation.Language.Parser]::ParseFile($validator,[ref]$tokens,[ref]$errors)
Assert-True -Condition ($errors.Count-eq 0) -Message 'Documentation catalog validator has parser errors.'
$sourceText=Get-Content -LiteralPath $validator -Raw
foreach($forbidden in @('Invoke-WebRequest','Invoke-RestMethod','Start-Process','Set-Content','Add-Content','Out-File','Remove-Item')){Assert-True -Condition ($sourceText-notmatch [regex]::Escape($forbidden)) -Message "Validator contains forbidden operation $forbidden."}
try{
    New-Item -ItemType Directory -Path $tempRoot|Out-Null
    $catalogHash=Get-Hash -Path $catalogPath
    $before=Get-Item -LiteralPath $catalogPath|Select-Object Length,LastWriteTimeUtc
    $healthy=&$validator -CatalogPath $catalogPath -ExpectedCatalogSha256 $catalogHash -ReferenceTimeUtc ([datetime]'2026-09-06T12:00:00Z') -NoThrow
    Assert-True -Condition ($healthy.Passed-and-not$healthy.WritePerformed-and-not$healthy.ExecutionPerformed-and-not$healthy.NetworkPerformed-and-not$healthy.TransportPerformed) -Message 'Healthy documentation catalog contract failed.'
    $after=Get-Item -LiteralPath $catalogPath|Select-Object Length,LastWriteTimeUtc
    Assert-True -Condition (($before|ConvertTo-Json)-ceq($after|ConvertTo-Json)) -Message 'Validation changed the source catalog.'
    $wrong=&$validator -CatalogPath $catalogPath -ExpectedCatalogSha256 ('0'*64) -ReferenceTimeUtc ([datetime]'2026-09-06T12:00:00Z') -NoThrow
    Assert-True -Condition (-not$wrong.Passed-and$wrong.FailedGates-ccontains'CatalogHash') -Message 'Catalog hash drift did not fail closed.'

    $fixture=Get-Content -LiteralPath $catalogPath -Raw|ConvertFrom-Json
    $fixture.schemaVersion='9.9';$path=Join-Path $tempRoot 'schema.json';$hash=Write-Fixture -Value $fixture -Path $path
    $result=&$validator -CatalogPath $path -ExpectedCatalogSha256 $hash -ReferenceTimeUtc ([datetime]'2026-09-06T12:00:00Z') -NoThrow
    Assert-True -Condition ($result.FailedGates-ccontains'SchemaVersionKnown') -Message 'Unknown schema gate changed.'

    $fixture=Get-Content -LiteralPath $catalogPath -Raw|ConvertFrom-Json
    $fixture.verifiedAtUtc='2025-01-01T00:00:00Z';$path=Join-Path $tempRoot 'stale.json';$hash=Write-Fixture -Value $fixture -Path $path
    $result=&$validator -CatalogPath $path -ExpectedCatalogSha256 $hash -MaximumAgeDays 30 -ReferenceTimeUtc ([datetime]'2026-09-06T12:00:00Z') -NoThrow
    Assert-True -Condition ($result.FailedGates-ccontains'CatalogStale') -Message 'Stale catalog gate changed.'

    $fixture=Get-Content -LiteralPath $catalogPath -Raw|ConvertFrom-Json
    $fixture.domains[0].sources[0].url='https://example.invalid/powershell';$path=Join-Path $tempRoot 'host.json';$hash=Write-Fixture -Value $fixture -Path $path
    $result=&$validator -CatalogPath $path -ExpectedCatalogSha256 $hash -ReferenceTimeUtc ([datetime]'2026-09-06T12:00:00Z') -NoThrow
    Assert-True -Condition ($result.FailedGates-ccontains'SourceAuthorityHost') -Message 'Authority-host gate changed.'

    $fixture=Get-Content -LiteralPath $catalogPath -Raw|ConvertFrom-Json
    $fixture.domains[0].id='unknown-domain';$path=Join-Path $tempRoot 'domain.json';$hash=Write-Fixture -Value $fixture -Path $path
    $result=&$validator -CatalogPath $path -ExpectedCatalogSha256 $hash -ReferenceTimeUtc ([datetime]'2026-09-06T12:00:00Z') -NoThrow
    Assert-True -Condition ($result.FailedGates-ccontains'DomainKnown'-and$result.FailedGates-ccontains'RequiredDomainPresent') -Message 'Unknown or missing domain gates changed.'

    $fixture=Get-Content -LiteralPath $catalogPath -Raw|ConvertFrom-Json
    $fixture.domains[0].PSObject.Properties.Remove('sources');$path=Join-Path $tempRoot 'missing.json';$hash=Write-Fixture -Value $fixture -Path $path
    $result=&$validator -CatalogPath $path -ExpectedCatalogSha256 $hash -ReferenceTimeUtc ([datetime]'2026-09-06T12:00:00Z') -NoThrow
    Assert-True -Condition ($result.FailedGates-ccontains'DomainShape'-and$result.FailedGates-ccontains'DomainSources') -Message "Missing domain state did not preserve exact gates: $($result.FailedGates-join', ')."

    foreach($skill in @('powershell-docs','microsoft-dism-docs','microsoft-update-docs','ollama-docs')){Assert-True -Condition (Test-Path -LiteralPath (Join-Path $pluginRoot "skills\$skill\SKILL.md") -PathType Leaf) -Message "Catalog-bound skill is missing: $skill."}
}finally{if(Test-Path -LiteralPath $tempRoot){Remove-Item -LiteralPath $tempRoot -Recurse -Force}}
'PowerShell Workbench documentation catalog contracts passed.'
```

## File: `Tests/Test-DocumentationContracts.ps1`

```powershell
[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot
$qualityGate=Get-Content -LiteralPath (Join-Path $pluginRoot 'skills\powershell-quality-gate\SKILL.md') -Raw
$profiles=Get-Content -LiteralPath (Join-Path $pluginRoot 'skills\powershell-scaffold\references\project-profiles.md') -Raw
$portability=Get-Content -LiteralPath (Join-Path $pluginRoot 'skills\powershell-workbench-portability\SKILL.md') -Raw
if($qualityGate -notmatch 'Test-PowerShellWorkbenchAutomaticVariables\.ps1 -Path <target\.ps1> -NoThrow'){throw 'Quality-gate documentation does not bind the mandatory Path parameter explicitly.'}
if($profiles -match 'Test_<Name>\.<Type>\.ps1' -or $profiles -notmatch 'Test-<Name>\.<Type>\.ps1'){throw 'Project-profile guidance does not use discoverable Test- names.'}
if($portability -match 'A future portal' -or $portability -notmatch 'Show-PowerShellWorkbenchProjectPortal\.ps1'){throw 'Portability guidance does not describe the existing project-profile portal.'}
'PowerShell Workbench documentation contracts passed.'
```

## File: `Tests/Test-GovernanceContracts.ps1`

```powershell
[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

 $requiredFiles = @('LICENSE', 'SECURITY.md', 'CONTRIBUTING.md')
 $presentFiles = @($requiredFiles | Where-Object { Test-Path -LiteralPath (Join-Path $repositoryRoot $_) -PathType Leaf })
if ($presentFiles.Count -eq 0) {
    'PowerShell Workbench governance contracts skipped: repository governance context is unavailable.'
    return
}
foreach ($requiredFile in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot $requiredFile) -PathType Leaf)) {
        throw "Required governance file is missing: $requiredFile"
    }
}

$license = Get-Content -LiteralPath (Join-Path $repositoryRoot 'LICENSE') -Raw
$security = Get-Content -LiteralPath (Join-Path $repositoryRoot 'SECURITY.md') -Raw
$contributing = Get-Content -LiteralPath (Join-Path $repositoryRoot 'CONTRIBUTING.md') -Raw
if ($license -notmatch 'MIT License') { throw 'LICENSE does not declare MIT.' }
if ($security -notmatch 'Do not open a public issue') { throw 'SECURITY.md does not require private reporting.' }
if ($contributing -notmatch 'Windows PowerShell 5\.1 and PowerShell 7') { throw 'CONTRIBUTING.md does not preserve dual-host validation.' }
'PowerShell Workbench governance contracts passed.'
```

## File: `Tests/Test-HandoffContracts.ps1`

````powershell
[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$pluginRoot = Split-Path -Parent $PSScriptRoot
$generator = Join-Path $pluginRoot 'scripts\New-PowerShellWorkbenchHandoff.ps1'
$schema = Join-Path $pluginRoot 'skills\powershell-agent-harness-development\assets\schemas\powershell-workbench-handoff.schema.json'
$template = Join-Path $pluginRoot 'skills\powershell-agent-harness-development\assets\templates\handoff-input.json.tmpl'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-handoff-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempRoot | Out-Null

function Assert-True { param([bool]$Condition,[string]$Message) if(-not $Condition){throw $Message} }

try {
    [void](Get-Content -LiteralPath $schema -Raw|ConvertFrom-Json)
    [void](Get-Content -LiteralPath $template -Raw|ConvertFrom-Json)
    $tokens=$null;$errors=$null
    $ast=[Management.Automation.Language.Parser]::ParseFile($generator,[ref]$tokens,[ref]$errors)
    Assert-True (@($errors).Count -eq 0) 'Handoff generator has parser errors.'
    $forbidden=@('Invoke-RestMethod','Invoke-WebRequest','Start-Process','Invoke-Expression','Set-Clipboard','git','gh')
    $commands=@($ast.FindAll({param($node)$node -is [Management.Automation.Language.CommandAst]},$true)|ForEach-Object{$_.GetCommandName()}|Where-Object{$_})
    foreach($command in $forbidden){Assert-True ($commands -notcontains $command) "Handoff generator contains forbidden execution or transport command '$command'."}

    $inputPath=Join-Path $tempRoot 'input.json'
    $handoffFixture=[ordered]@{
        schemaVersion='1.0';handoffId='deterministic-fixture';createdAt='2026-09-03T00:00:00Z'
        source=[ordered]@{taskId='source-id';title='Source task'};destination=[ordered]@{taskId='destination-id';title='Destination task'}
        project=[ordered]@{root=$tempRoot;pluginVersion='0.7.0';pluginSha256=('a'*64)}
        objective='Generate local-only deterministic handoff artifacts.'
        verifiedFacts=@([ordered]@{statement='Fixture passed validation.';evidence=@([ordered]@{path='evidence/result.json';sha256=('b'*64)})})
        changedFiles=@([ordered]@{path='scripts/example.ps1';sha256=('c'*64)})
        testResults=@([ordered]@{name='Fixture';runtime='Windows PowerShell 5.1';status='Passed';evidenceSha256=('d'*64)})
        unresolvedDecisions=@('Whether to transport the artifact.');authorityBoundaries=@('Code owns pass and fail.')
        safetyBoundaries=@('No execution or transport.');requestedActions=@('Review locally.');reloadCanary='PWB_HANDOFF_RELOAD_OK'
    }
    $handoffFixture|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $inputPath -Encoding UTF8

    $whatIfOutput=Join-Path $tempRoot 'what-if-output'
    & $generator -InputPath $inputPath -OutputDirectory $whatIfOutput -WhatIf
    Assert-True (-not (Test-Path -LiteralPath $whatIfOutput)) 'Handoff -WhatIf created an output directory.'

    $first=& $generator -InputPath $inputPath -OutputDirectory (Join-Path $tempRoot 'first') -Confirm:$false
    $second=& $generator -InputPath $inputPath -OutputDirectory (Join-Path $tempRoot 'second') -Confirm:$false
    Assert-True ($first.result -eq 'GENERATED_LOCAL_ONLY' -and -not $first.transportPerformed -and -not $first.executionPerformed) 'Handoff result did not preserve no-execution/no-transport guarantees.'
    Assert-True ((Get-FileHash -LiteralPath $first.jsonPath -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $second.jsonPath -Algorithm SHA256).Hash) 'Repeated JSON generation was not deterministic.'
    Assert-True ((Get-FileHash -LiteralPath $first.markdownPath -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $second.markdownPath -Algorithm SHA256).Hash) 'Repeated Markdown generation was not deterministic.'

    $artifact=Get-Content -LiteralPath $first.jsonPath -Raw|ConvertFrom-Json
    Assert-True ($artifact.payload.project.root -eq [IO.Path]::GetFullPath($tempRoot)) 'Canonical JSON did not preserve the project path through parse roundtrip.'
    Assert-True ($artifact.schemaSha256 -eq (Get-FileHash -LiteralPath $schema -Algorithm SHA256).Hash.ToLowerInvariant()) 'Generated handoff was not bound to the schema hash.'
    $markdown=Get-Content -LiteralPath $first.markdownPath -Raw
    $match=[regex]::Match($markdown,'(?s)```json\r?\n(?<json>.*?)\r?\n```')
    Assert-True $match.Success 'Markdown handoff does not contain its canonical JSON payload.'
    $embedded=$match.Groups['json'].Value|ConvertFrom-Json
    Assert-True (($embedded|ConvertTo-Json -Depth 12 -Compress) -eq ($artifact.payload|ConvertTo-Json -Depth 12 -Compress)) 'JSON and Markdown handoffs are not semantically equivalent.'
    Assert-True ($markdown.Contains($artifact.payloadSha256)) 'Markdown handoff does not carry the JSON payload hash.'

    $invalid=$handoffFixture.PSObject.Copy();$invalid.testResults=@([ordered]@{name='Fixture';runtime='PS';status='Unknown';evidenceSha256=('d'*64)})
    $invalidPath=Join-Path $tempRoot 'invalid.json';$invalid|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $invalidPath -Encoding UTF8
    $rejected=$false;try{& $generator -InputPath $invalidPath -OutputDirectory (Join-Path $tempRoot 'invalid-output') -Confirm:$false|Out-Null}catch{$rejected=$true}
    Assert-True $rejected 'Unknown test status did not fail closed.'
    'PowerShell Workbench handoff contracts passed.'
} finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
````

## File: `Tests/Test-HealthContracts.ps1`

```powershell
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot;$validator=Join-Path $pluginRoot 'scripts\Test-PowerShellWorkbenchHealth.ps1';$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-health-'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path $tempRoot|Out-Null
function Assert-GatesExactly{param($Result,[string[]]$Expected,[string]$Message);if(@($Result.FailedGates).Count-ne$Expected.Count-or(Compare-Object @($Result.FailedGates) $Expected)){throw "$Message Actual: $($Result.FailedGates -join ', ')"}}
function Initialize-FixtureRoot{param([string]$Name,[string]$Version='0.7.4');$root=Join-Path $tempRoot $Name;New-Item -ItemType Directory -Path (Join-Path $root '.codex-plugin'),(Join-Path $root 'scripts') -Force|Out-Null;[ordered]@{name='powershell-workbench';version=$Version}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $root '.codex-plugin\plugin.json') -Encoding UTF8;Set-Content -LiteralPath (Join-Path $root 'scripts\fixture.ps1') -Value "'fixture'" -Encoding UTF8;$root}
function Copy-Fixture{param([string]$Source,[string]$Name);$target=Join-Path $tempRoot $Name;Copy-Item -LiteralPath $Source -Destination $target -Recurse;$target}
function Get-Snapshot{param([string[]]$Roots);@($Roots|ForEach-Object{Get-ChildItem -LiteralPath $_ -Recurse -File|ForEach-Object{"$($_.FullName)|$($_.Length)|$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)|$($_.LastWriteTimeUtc.Ticks)"}}|Sort-Object)-join"`n"}
try{
    $source=Initialize-FixtureRoot source;$cache=Copy-Fixture $source cache;$distribution=[pscustomobject]@{Name='personal';SourcePath=$source;CachePath=$cache};$before=Get-Snapshot @($source,$cache)
    $healthy=&$validator -Distribution $distribution -ExpectedVersion '0.7.4' -ReferenceTimeUtc ([datetimeoffset]'2026-09-06T08:00:00Z') -NoThrow
    if(-not$healthy.Passed-or$healthy.WritePerformed-or$healthy.SchemaVersion-ne'1.0'-or$healthy.Distributions[0].SourceTreeSha256-cne$healthy.Distributions[0].CacheTreeSha256){throw 'Healthy distribution contract failed.'}
    if((Get-Snapshot @($source,$cache))-cne$before){throw 'Read-only health validation changed a distribution fixture.'}

    $empty=&$validator -Distribution @() -ExpectedVersion '0.7.4' -NoThrow
    Assert-GatesExactly -Result $empty -Expected @('DistributionEvidenceRequired') -Message 'Missing distribution evidence gate changed.'

    $alias=&$validator -Distribution ([pscustomobject]@{Name='alias';SourcePath=$source;CachePath=$source}) -ExpectedVersion '0.7.4' -NoThrow
    Assert-GatesExactly -Result $alias -Expected @('DistributionSourceCacheDistinct') -Message 'Source/cache alias gate changed.'

    $duplicates=&$validator -Distribution @($distribution,$distribution) -ExpectedVersion '0.7.4' -NoThrow
    Assert-GatesExactly -Result $duplicates -Expected @('DistributionNameUnique','DistributionSourcePathUnique','DistributionCachePathUnique') -Message 'Duplicate distribution gates changed.'

    $crossRoleSource=Copy-Fixture $source cross-role-source
    $crossRole=&$validator -Distribution @($distribution,[pscustomobject]@{Name='cross-role';SourcePath=$crossRoleSource;CachePath=$source}) -ExpectedVersion '0.7.4' -NoThrow
    Assert-GatesExactly -Result $crossRole -Expected @('DistributionRootUnique') -Message 'Cross-role duplicate root gate changed.'

    Set-Content -LiteralPath (Join-Path $cache 'scripts\fixture.ps1') -Value "'drifted'" -Encoding UTF8
    $drift=&$validator -Distribution $distribution -ExpectedVersion '0.7.4' -NoThrow
    Assert-GatesExactly -Result $drift -Expected @('DistributionTreeIdentity') -Message 'Tree drift gate changed.'
    Copy-Item -LiteralPath (Join-Path $source 'scripts\fixture.ps1') -Destination (Join-Path $cache 'scripts\fixture.ps1') -Force

    $unknownSource=Initialize-FixtureRoot unknown-source -Version 'unknown';$unknownCache=Copy-Fixture $unknownSource unknown-cache
    $unknown=&$validator -Distribution ([pscustomobject]@{Name='unknown';SourcePath=$unknownSource;CachePath=$unknownCache}) -ExpectedVersion '0.7.4' -NoThrow
    Assert-GatesExactly -Result $unknown -Expected @('DistributionSourceVersionValid','DistributionCacheVersionValid') -Message 'Unknown-version gates changed.'
    $missingVersionManifest=Get-Content -LiteralPath (Join-Path $unknownSource '.codex-plugin\plugin.json') -Raw|ConvertFrom-Json;$missingVersionManifest.PSObject.Properties.Remove('version');$missingVersionManifest|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $unknownSource '.codex-plugin\plugin.json') -Encoding UTF8
    $missingVersion=&$validator -Distribution ([pscustomobject]@{Name='missing-version';SourcePath=$unknownSource;CachePath=$cache}) -ExpectedVersion '0.7.4' -NoThrow
    Assert-GatesExactly -Result $missingVersion -Expected @('DistributionSourceVersionValid','DistributionTreeIdentity') -Message 'Missing-version gates changed.'

    $missing=&$validator -Distribution ([pscustomobject]@{Name='missing';SourcePath=(Join-Path $tempRoot 'missing-source');CachePath=$cache}) -ExpectedVersion '0.7.4' -NoThrow
    Assert-GatesExactly -Result $missing -Expected @('DistributionSourceExists') -Message 'Missing-source gate changed.'

    $codexPath=Join-Path $tempRoot 'codex.exe';Set-Content -LiteralPath $codexPath -Value 'fixture-codex' -Encoding UTF8
    $catalogPath=Join-Path $tempRoot 'catalog.json';'{"models":[{"slug":"fixture-model"}]}'|Set-Content -LiteralPath $catalogPath -Encoding UTF8
    $manifestPath=Join-Path $tempRoot 'catalog.manifest.json';[ordered]@{schemaVersion='1.1';generatedAtUtc='2026-09-06T07:30:00Z';model='fixture-model';contextWindow=4096;codexPath=$codexPath;codexVersion='0.0.0';codexSha256=(Get-FileHash $codexPath -Algorithm SHA256).Hash.ToLowerInvariant();catalogPath=$catalogPath;catalogSha256=(Get-FileHash $catalogPath -Algorithm SHA256).Hash.ToLowerInvariant()}|ConvertTo-Json|Set-Content -LiteralPath $manifestPath -Encoding UTF8
    $catalogHealthy=&$validator -Distribution $distribution -ExpectedVersion '0.7.4' -CatalogManifestPath $manifestPath -RequireCatalog -ReferenceTimeUtc ([datetimeoffset]'2026-09-06T08:00:00Z') -NoThrow
    if(-not$catalogHealthy.Passed-or$catalogHealthy.Catalogs.Count-ne1){throw 'Healthy catalog contract failed.'}

    $stale=&$validator -Distribution $distribution -ExpectedVersion '0.7.4' -CatalogManifestPath $manifestPath -RequireCatalog -MaximumCatalogAgeHours 1 -ReferenceTimeUtc ([datetimeoffset]'2026-09-06T10:00:00Z') -NoThrow
    Assert-GatesExactly -Result $stale -Expected @('CatalogFreshness') -Message 'Stale catalog gate changed.'
    $manifest=Get-Content -LiteralPath $manifestPath -Raw|ConvertFrom-Json;$manifest.schemaVersion='unknown';$manifest|ConvertTo-Json|Set-Content -LiteralPath $manifestPath -Encoding UTF8
    $unknownSchema=&$validator -Distribution $distribution -ExpectedVersion '0.7.4' -CatalogManifestPath $manifestPath -ReferenceTimeUtc ([datetimeoffset]'2026-09-06T08:00:00Z') -NoThrow
    Assert-GatesExactly -Result $unknownSchema -Expected @('CatalogSchemaVersion') -Message 'Unknown catalog schema gate changed.'
    $manifest.schemaVersion='1.1';$manifest|ConvertTo-Json|Set-Content -LiteralPath $manifestPath -Encoding UTF8;Set-Content -LiteralPath $catalogPath -Value '{"models":[]}' -Encoding UTF8
    $catalogDrift=&$validator -Distribution $distribution -ExpectedVersion '0.7.4' -CatalogManifestPath $manifestPath -ReferenceTimeUtc ([datetimeoffset]'2026-09-06T08:00:00Z') -NoThrow
    Assert-GatesExactly -Result $catalogDrift -Expected @('CatalogArtifactHash','CatalogModelEntry') -Message 'Catalog drift gates changed.'
    $required=&$validator -Distribution $distribution -ExpectedVersion '0.7.4' -RequireCatalog -NoThrow
    Assert-GatesExactly -Result $required -Expected @('CatalogEvidenceRequired') -Message 'Missing catalog evidence gate changed.'
    'PowerShell Workbench health contracts passed.'
}finally{Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue}
```

## File: `Tests/Test-ModelComparisonContracts.ps1`

```powershell
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$adapter=Join-Path $root 'scripts\Invoke-PowerShellWorkbenchOllamaChat.ps1'
$comparator=Join-Path $root 'scripts\Compare-PowerShellWorkbenchOllamaEvidence.ps1'
$utf8=New-Object Text.UTF8Encoding($false)
function Assert-True { param([bool]$Condition,[string]$Message) if(-not $Condition){throw $Message} }
function Assert-GatesExactly { param($Result,[string[]]$Expected,[string]$Message) $actual=@($Result.FailedGates);if(($actual-join'|')-cne($Expected-join'|')){throw "$Message Expected [$($Expected-join', ')], got [$($actual-join', ')]."} }
function Get-Sha256 { param([string]$LiteralPath) (Get-FileHash -LiteralPath $LiteralPath -Algorithm SHA256).Hash.ToLowerInvariant() }
function Get-TextSha256 { param([string]$Text) $algorithm=[Security.Cryptography.SHA256]::Create();try{([BitConverter]::ToString($algorithm.ComputeHash($utf8.GetBytes($Text)))).Replace('-','').ToLowerInvariant()}finally{$algorithm.Dispose()} }
function Write-FixtureJson { param([string]$LiteralPath,$Value) [IO.File]::WriteAllText($LiteralPath,($Value|ConvertTo-Json -Depth 12),$utf8) }

$tokens=$null;$errors=$null;$ast=[Management.Automation.Language.Parser]::ParseFile($comparator,[ref]$tokens,[ref]$errors)
Assert-True ($errors.Count -eq 0) 'Comparator has parser errors.'
$commands=@($ast.FindAll({param($node)$node -is [Management.Automation.Language.CommandAst]},$true)|ForEach-Object{$_.GetCommandName()}|Where-Object{$_})
foreach($forbidden in @('Start-Process','Invoke-Expression','Invoke-RestMethod','Invoke-WebRequest','Set-Clipboard','Set-Content','Add-Content','Out-File','git','gh')){Assert-True ($commands -notcontains $forbidden) "Comparator contains forbidden command $forbidden."}

$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('pwb-model-comparison-'+[guid]::NewGuid().ToString('N'))
try{
    New-Item -ItemType Directory -Path $tempRoot|Out-Null
    $prompt='Return EXACT_OK.';$expectedAnswer='EXACT_OK';$digestA='a'*64;$digestB='b'*64
    $responseA=[ordered]@{model='model-a';created_at='2026-09-06T12:00:00Z';message=[ordered]@{role='assistant';content=$expectedAnswer};done=$true;total_duration=900;prompt_eval_count=4;eval_count=2}
    $responseB=[ordered]@{model='model-b';created_at='2026-09-06T12:00:00Z';message=[ordered]@{role='assistant';content='WRONG_FAST'};done=$true;total_duration=100;prompt_eval_count=4;eval_count=1}
    $responseC=[ordered]@{model='model-c';created_at='2026-09-06T12:00:00Z';message=[ordered]@{role='assistant';content=$expectedAnswer};done=$true;total_duration=800;prompt_eval_count=4;eval_count=2}
    $responseD=[ordered]@{model='model-d';created_at='2026-09-06T12:00:00Z';message=[ordered]@{role='assistant';content=$expectedAnswer};done=$true;total_duration=700;prompt_eval_count=4}
    $fixtureA=Join-Path $tempRoot 'response-a.json';$fixtureB=Join-Path $tempRoot 'response-b.json';$fixtureC=Join-Path $tempRoot 'response-c.json';$fixtureD=Join-Path $tempRoot 'response-d.json';Write-FixtureJson -LiteralPath $fixtureA -Value $responseA;Write-FixtureJson -LiteralPath $fixtureB -Value $responseB;Write-FixtureJson -LiteralPath $fixtureC -Value $responseC;Write-FixtureJson -LiteralPath $fixtureD -Value $responseD
    $captureA=&$adapter -Prompt $prompt -ModelId model-a -ModelDigest $digestA -OutputDirectory (Join-Path $tempRoot 'capture-a') -FixtureResponsePath $fixtureA -Execute
    $captureB=&$adapter -Prompt $prompt -ModelId model-b -ModelDigest $digestB -OutputDirectory (Join-Path $tempRoot 'capture-b') -FixtureResponsePath $fixtureB -Execute
    $captureC=&$adapter -Prompt $prompt -ModelId model-c -ModelDigest ('c'*64) -Temperature 0.5 -OutputDirectory (Join-Path $tempRoot 'capture-c') -FixtureResponsePath $fixtureC -Execute
    $captureD=&$adapter -Prompt $prompt -ModelId model-d -ModelDigest ('d'*64) -OutputDirectory (Join-Path $tempRoot 'capture-d') -FixtureResponsePath $fixtureD -Execute
    $manifestPath=Join-Path $tempRoot 'comparison.json'
    $manifest=[ordered]@{schemaVersion='1.0';comparisonId='fixture-comparison';task=[ordered]@{taskId='exact-answer';promptSha256=Get-TextSha256 -Text $prompt;acceptance=[ordered]@{kind='exact-utf8-sha256';expectedAnswerSha256=Get-TextSha256 -Text $expectedAnswer}};candidates=@(
        [ordered]@{candidateId='candidate-b';metadataPath=$captureB.MetadataPath;metadataSha256=Get-Sha256 -LiteralPath $captureB.MetadataPath;modelId='model-b';modelDigest=$digestB},
        [ordered]@{candidateId='candidate-a';metadataPath=$captureA.MetadataPath;metadataSha256=Get-Sha256 -LiteralPath $captureA.MetadataPath;modelId='model-a';modelDigest=$digestA})}
    Write-FixtureJson -LiteralPath $manifestPath -Value $manifest;$manifestSha=Get-Sha256 -LiteralPath $manifestPath
    $result=&$comparator -ManifestPath $manifestPath -ExpectedManifestSha256 $manifestSha -AllowedEvidenceRoot $tempRoot -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow
    Assert-True ($result.State -eq 'COMPLETE' -and $result.Passed -and -not $result.RetryPerformed -and -not $result.ModelCallPerformed -and -not $result.WritePerformed -and -not $result.TransportPerformed) "Valid comparison did not complete without effects. State=$($result.State); gates=$($result.FailedGates -join ', ')."
    Assert-True ($result.Candidates[0].CandidateId -ceq 'candidate-a' -and $result.Candidates[0].Quality -eq 'PASS' -and $result.Candidates[0].Rank -eq 1) 'Correct candidate was not ranked first.'
    Assert-True ($result.Candidates[1].CandidateId -ceq 'candidate-b' -and $result.Candidates[1].Quality -eq 'FAIL' -and $null -eq $result.Candidates[1].Rank) 'Fast wrong candidate received a rank.'
    Assert-True ($result.Candidates[1].ServerTotalDurationNanoseconds -lt $result.Candidates[0].ServerTotalDurationNanoseconds) 'Fixture does not prove that the wrong answer was faster.'
    $json1=&$comparator -ManifestPath $manifestPath -ExpectedManifestSha256 $manifestSha -AllowedEvidenceRoot $tempRoot -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow -AsJson
    $json2=&$comparator -ManifestPath $manifestPath -ExpectedManifestSha256 $manifestSha -AllowedEvidenceRoot $tempRoot -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow -AsJson
    Assert-True (($json1-join"`n") -ceq ($json2-join"`n")) 'Comparison JSON was not deterministic for frozen evidence.'

    $wrongManifest=&$comparator -ManifestPath $manifestPath -ExpectedManifestSha256 ('f'*64) -AllowedEvidenceRoot $tempRoot -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow
    Assert-True ($wrongManifest.State -eq 'CONFLICT') 'Manifest drift was not CONFLICT.';Assert-GatesExactly -Result $wrongManifest -Expected @('ManifestSha256') -Message 'Manifest hash gate changed.'

    $duplicates=($manifest|ConvertTo-Json -Depth 12|ConvertFrom-Json);$duplicates.candidates=@($manifest.candidates[0],$manifest.candidates[0]);$duplicatePath=Join-Path $tempRoot 'duplicate.json';Write-FixtureJson -LiteralPath $duplicatePath -Value $duplicates;$duplicateResult=&$comparator -ManifestPath $duplicatePath -ExpectedManifestSha256 (Get-Sha256 -LiteralPath $duplicatePath) -AllowedEvidenceRoot $tempRoot -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow
    Assert-True ($duplicateResult.State -eq 'CONFLICT') 'Duplicate candidate ids were not CONFLICT.';Assert-GatesExactly -Result $duplicateResult -Expected @('CandidateIdsUnique') -Message 'Duplicate candidate gate changed.'

    $promptDrift=($manifest|ConvertTo-Json -Depth 12|ConvertFrom-Json);$promptDrift.task.promptSha256='c'*64;$promptPath=Join-Path $tempRoot 'prompt-drift.json';Write-FixtureJson -LiteralPath $promptPath -Value $promptDrift;$promptResult=&$comparator -ManifestPath $promptPath -ExpectedManifestSha256 (Get-Sha256 -LiteralPath $promptPath) -AllowedEvidenceRoot $tempRoot -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow
    Assert-True ($promptResult.State -eq 'CONFLICT') 'Prompt drift was not CONFLICT.'
    Assert-GatesExactly -Result $promptResult -Expected @('Candidate[candidate-a].PromptSha256','Candidate[candidate-b].PromptSha256') -Message 'Prompt drift gates changed.'

    $missing=($manifest|ConvertTo-Json -Depth 12|ConvertFrom-Json);$missing.candidates=@([ordered]@{candidateId='candidate-a';metadataPath=(Join-Path $tempRoot 'missing.json');metadataSha256=('d'*64);modelId='model-a';modelDigest=$digestA},$manifest.candidates[0]);$missingPath=Join-Path $tempRoot 'missing-manifest.json';Write-FixtureJson -LiteralPath $missingPath -Value $missing;$missingResult=&$comparator -ManifestPath $missingPath -ExpectedManifestSha256 (Get-Sha256 -LiteralPath $missingPath) -AllowedEvidenceRoot $tempRoot -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow
    Assert-True ($missingResult.State -eq 'UNKNOWN') 'Missing candidate evidence was not UNKNOWN.';Assert-GatesExactly -Result $missingResult -Expected @('Candidate[candidate-a].EvidenceReadable') -Message 'Missing evidence gate changed.'

    $configurationDrift=($manifest|ConvertTo-Json -Depth 12|ConvertFrom-Json);$configurationDrift.candidates=@($manifest.candidates[1],[ordered]@{candidateId='candidate-c';metadataPath=$captureC.MetadataPath;metadataSha256=Get-Sha256 -LiteralPath $captureC.MetadataPath;modelId='model-c';modelDigest=('c'*64)});$configurationPath=Join-Path $tempRoot 'configuration-drift.json';Write-FixtureJson -LiteralPath $configurationPath -Value $configurationDrift;$configurationResult=&$comparator -ManifestPath $configurationPath -ExpectedManifestSha256 (Get-Sha256 -LiteralPath $configurationPath) -AllowedEvidenceRoot $tempRoot -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow
    Assert-True ($configurationResult.State -eq 'CONFLICT') 'Request configuration drift was not CONFLICT.';Assert-GatesExactly -Result $configurationResult -Expected @('Candidate[candidate-c].RequestConfiguration') -Message 'Configuration drift gate changed.'

    $missingMetrics=($manifest|ConvertTo-Json -Depth 12|ConvertFrom-Json);$missingMetrics.candidates=@($manifest.candidates[1],[ordered]@{candidateId='candidate-d';metadataPath=$captureD.MetadataPath;metadataSha256=Get-Sha256 -LiteralPath $captureD.MetadataPath;modelId='model-d';modelDigest=('d'*64)});$metricsPath=Join-Path $tempRoot 'missing-metrics.json';Write-FixtureJson -LiteralPath $metricsPath -Value $missingMetrics;$metricsResult=&$comparator -ManifestPath $metricsPath -ExpectedManifestSha256 (Get-Sha256 -LiteralPath $metricsPath) -AllowedEvidenceRoot $tempRoot -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow
    Assert-True ($metricsResult.State -eq 'UNKNOWN') 'Missing metrics were not UNKNOWN.';Assert-GatesExactly -Result $metricsResult -Expected @('Candidate[candidate-d].Metrics') -Message 'Missing metrics gate changed.'

    $outside=($manifest|ConvertTo-Json -Depth 12|ConvertFrom-Json);$outside.candidates=@($manifest.candidates[1],[ordered]@{candidateId='candidate-z';metadataPath=$comparator;metadataSha256=Get-Sha256 -LiteralPath $comparator;modelId='model-z';modelDigest=('e'*64)});$outsidePath=Join-Path $tempRoot 'outside-root.json';Write-FixtureJson -LiteralPath $outsidePath -Value $outside;$outsideResult=&$comparator -ManifestPath $outsidePath -ExpectedManifestSha256 (Get-Sha256 -LiteralPath $outsidePath) -AllowedEvidenceRoot $tempRoot -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow
    Assert-True ($outsideResult.State -eq 'CONFLICT') 'Metadata outside the evidence root was not CONFLICT.';Assert-GatesExactly -Result $outsideResult -Expected @('Candidate[candidate-z].MetadataWithinEvidenceRoot') -Message 'Outside-root gate changed.'

    $invalidTask=($manifest|ConvertTo-Json -Depth 12|ConvertFrom-Json);$invalidTask.task.promptSha256='invalid';$invalidTask.task.acceptance.expectedAnswerSha256='invalid';$invalidTaskPath=Join-Path $tempRoot 'invalid-task.json';Write-FixtureJson -LiteralPath $invalidTaskPath -Value $invalidTask;$invalidTaskResult=&$comparator -ManifestPath $invalidTaskPath -ExpectedManifestSha256 (Get-Sha256 -LiteralPath $invalidTaskPath) -AllowedEvidenceRoot $tempRoot -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow
    Assert-True ($invalidTaskResult.State -eq 'UNKNOWN') 'Invalid task hashes were not UNKNOWN.';Assert-GatesExactly -Result $invalidTaskResult -Expected @('TaskPromptSha256','TaskAnswerSha256') -Message 'Invalid task gates changed.'
}finally{if(Test-Path -LiteralPath $tempRoot){Remove-Item -LiteralPath $tempRoot -Recurse -Force}}
'PowerShell Workbench model comparison contracts passed.'
```

## File: `Tests/Test-NativeCommandContracts.ps1`

```powershell
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot;$runner=Join-Path $pluginRoot 'scripts\Invoke-PowerShellWorkbenchNativeCommand.ps1';$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-native-'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path $tempRoot|Out-Null
try{
    $analyze=& $runner -FilePath $env:ComSpec -ArgumentList @('/d','/c','echo should-not-run') -WorkingDirectory $tempRoot -ReportDirectory $tempRoot -StepId 'analyze' -AnalyzeOnly
    if(-not $analyze.AnalyzeOnly -or $analyze.TargetMutation -or $analyze.MutationIntent -ne 'None' -or $analyze.ExecutionOccurred -or $analyze.Succeeded -or $analyze.VerificationState -ne 'NotRun' -or $analyze.VerificationScope -ne 'None' -or -not(Test-Path -LiteralPath $analyze.ReportPath)){throw 'Analyze-only contract failed.'}

    $unverified=& $runner -FilePath $env:ComSpec -ArgumentList @('/d','/c','echo execution-only') -WorkingDirectory $tempRoot -ReportDirectory $tempRoot -StepId 'execution-only' -MutationIntent 'Possible'
    if(-not $unverified.Succeeded -or $unverified.Verified -or $unverified.VerificationState -ne 'NotRun' -or $unverified.VerificationScope -ne 'None'){throw 'Execution-only success must not be reported as verified.'}

    $run=& $runner -FilePath $env:ComSpec -ArgumentList @('/d','/c','echo operator-visible') -WorkingDirectory $tempRoot -ReportDirectory $tempRoot -StepId 'success' -MutationIntent 'Expected' -VerificationScope ProcessLaunch -RequireVerification -Verify {param($result)$result.ExitCode -eq 0}
    if($run.MutationIntent -ne 'Expected' -or -not $run.ExecutionOccurred -or $null -ne $run.TargetMutation){throw 'Native command mutation contract was not preserved.'}
    if($run.SchemaVersion -ne '2.0' -or $run.ExitCode -ne 0 -or -not $run.Succeeded -or -not $run.Verified -or $run.VerificationState -ne 'Passed' -or $run.VerificationScope -ne 'ProcessLaunch' -or -not $run.VerificationRequired -or -not $run.ReportsWritten){throw 'Native command success contract failed.'}

    $accepted=& $runner -FilePath $env:ComSpec -ArgumentList @('/d','/c','echo accepted-nonzero & exit /b 7') -WorkingDirectory $tempRoot -ReportDirectory $tempRoot -StepId 'accepted-nonzero' -SuccessExitCodes @(0,7)
    if(-not $accepted.Succeeded -or $accepted.ExitCode -ne 7 -or $accepted.VerificationState -ne 'NotRun'){throw 'Accepted exit-code contract failed.'}

    $verificationFailure=& $runner -FilePath $env:ComSpec -ArgumentList @('/d','/c','echo verification-failure') -WorkingDirectory $tempRoot -ReportDirectory $tempRoot -StepId 'verification-failure' -VerificationScope ArtifactIntegrity -Verify {$false} -NoThrow
    if(-not $verificationFailure.Succeeded -or $verificationFailure.Verified -or $verificationFailure.VerificationState -ne 'Failed' -or $verificationFailure.ExecutionError){throw 'Verification failure was not kept separate from execution success.'}

    $verificationError=& $runner -FilePath $env:ComSpec -ArgumentList @('/d','/c','echo verification-error') -WorkingDirectory $tempRoot -ReportDirectory $tempRoot -StepId 'verification-error' -VerificationScope InstalledState -Verify {throw 'synthetic post-check error'} -NoThrow
    if(-not $verificationError.Succeeded -or $verificationError.ExecutionError -or $verificationError.VerificationState -ne 'Failed' -or $verificationError.VerificationError -ne 'synthetic post-check error'){throw 'Verification exception was not isolated from execution evidence.'}

    $executionFailure=& $runner -FilePath $env:ComSpec -ArgumentList @('/d','/c','echo native-error 1>&2 & exit /b 9') -WorkingDirectory $tempRoot -ReportDirectory $tempRoot -StepId 'execution-failure' -NoThrow
    if($executionFailure.Succeeded -or $executionFailure.ExitCode -ne 9 -or $executionFailure.ExecutionError -or $executionFailure.VerificationState -ne 'NotRun'){throw 'Native execution failure contract failed.'}
    if(-not((Get-Content -LiteralPath $executionFailure.TimelinePath -Raw) -match 'OUTPUT native-error')){throw 'Native stderr was not retained in the execution timeline.'}

    $missingVerifierSentinel=Join-Path $tempRoot 'missing-verifier-ran.txt';$missingVerifierRejected=$false
    try{& $runner -FilePath $env:ComSpec -ArgumentList @('/d','/c',"echo unexpected>$missingVerifierSentinel") -WorkingDirectory $tempRoot -ReportDirectory $tempRoot -StepId 'missing-verifier' -RequireVerification|Out-Null}catch{$missingVerifierRejected=$true}
    if(-not $missingVerifierRejected -or (Test-Path -LiteralPath $missingVerifierSentinel)){throw 'RequireVerification must fail closed before process execution when Verify is missing.'}

    $report=Get-Content -LiteralPath $run.ReportPath -Raw|ConvertFrom-Json
    if($report.Succeeded -ne $true -or $report.VerificationState -ne 'Passed' -or $report.VerificationScope -ne 'ProcessLaunch'){throw 'Persisted native command report did not preserve result semantics.'}
    $global:LASTEXITCODE=0
    'PowerShell Workbench native command contracts passed.'
}finally{Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue}
```

## File: `Tests/Test-OllamaAdapterContracts.ps1`

```powershell
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$adapter = Join-Path $root 'scripts\Invoke-PowerShellWorkbenchOllamaChat.ps1'
$validator = Join-Path $root 'scripts\Test-PowerShellWorkbenchOllamaEvidence.ps1'
$digest = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

function Assert-True { param([bool]$Condition,[string]$Message) if(-not $Condition){throw $Message} }
function Assert-Throw { param([scriptblock]$Action,[string]$Pattern) try{& $Action;throw 'Expected failure was not raised.'}catch{if($_.Exception.Message -notmatch $Pattern){throw "Unexpected failure: $($_.Exception.Message)"}} }

foreach($path in @($adapter,$validator)){
    $tokens=$null;$errors=$null
    $ast=[Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
    Assert-True ($errors.Count -eq 0) "$path has parser errors."
    $commands=@($ast.FindAll({param($node)$node -is [Management.Automation.Language.CommandAst]},$true)|ForEach-Object{$_.GetCommandName()}|Where-Object{$_})
    foreach($forbidden in @('Start-Process','Invoke-Expression','Set-Clipboard','git','gh')){Assert-True ($commands -notcontains $forbidden) "$path contains forbidden command $forbidden."}
    if($path -eq $validator){Assert-True ($commands -notcontains 'Get-FileHash' -and $commands -notcontains 'Get-Content') 'Evidence validator reintroduced separate hash and parse reads.'}
}

$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('pwb-ollama-contract-'+[guid]::NewGuid().ToString('N'))
$neverCreated=Join-Path $tempRoot 'analyze-output'
try{
    New-Item -ItemType Directory -Path $tempRoot|Out-Null
    $first=& $adapter -Prompt 'Explain the fixture.' -ModelId 'fixture-model' -ModelDigest $digest -OutputDirectory $neverCreated
    $second=& $adapter -Prompt 'Explain the fixture.' -ModelId 'fixture-model' -ModelDigest $digest -OutputDirectory $neverCreated
    Assert-True ($first.result -eq 'ANALYZE_ONLY' -and -not $first.networkPerformed -and -not $first.writePerformed -and -not $first.toolExecutionPerformed) 'AnalyzeOnly performed an effect.'
    Assert-True ($first.requestSha256 -eq $second.requestSha256) 'AnalyzeOnly request identity was not deterministic.'
    $withContext=& $adapter -Prompt 'Explain the fixture.' -ModelId 'fixture-model' -ModelDigest $digest -OutputDirectory $neverCreated -ContextTokens 8192
    Assert-True ($withContext.result -eq 'ANALYZE_ONLY' -and $withContext.requestedContextTokens -eq 8192 -and $null -eq $withContext.observedContextTokens -and $withContext.requestSha256 -ne $first.requestSha256) 'Explicit requested context was not bound into the analysis request while observation remained unknown.'
    Assert-True (-not(Test-Path -LiteralPath $neverCreated)) 'AnalyzeOnly created its output directory.'
    Assert-Throw {& $adapter -Prompt x -ModelId x -ModelDigest $digest -Endpoint 'https://127.0.0.1:11434/api/chat'} 'must use http'
    Assert-Throw {& $adapter -Prompt x -ModelId x -ModelDigest $digest -Endpoint 'http://127.0.0.1:11434/api/generate'} 'exact credential-free'
    Assert-Throw {& $adapter -Prompt x -ModelId x -ModelDigest $digest -Endpoint 'http://example.test:11434/api/chat'} 'literal loopback IP'
    Assert-Throw {& $adapter -Prompt x -ModelId x -ModelDigest $digest -Endpoint 'http://localhost:11434/api/chat'} 'literal loopback IP'
    $ipv6=& $adapter -Prompt x -ModelId x -ModelDigest $digest -Endpoint 'http://[::1]:11434/api/chat'
    Assert-True ($ipv6.result -eq 'ANALYZE_ONLY' -and -not $ipv6.networkPerformed) 'Literal IPv6 loopback preview failed.'

    $responseJson='{"model":"fixture-model","created_at":"2026-09-06T00:00:00Z","message":{"role":"assistant","content":"","tool_calls":[{"function":{"name":"read_fixture","arguments":{"path":"fixture.txt"}}}]},"done":true,"total_duration":123,"prompt_eval_count":4,"eval_count":2}'
    $fixturePath=Join-Path $tempRoot 'response-fixture.json'
    [IO.File]::WriteAllText($fixturePath,$responseJson,(New-Object Text.UTF8Encoding($false)))
    $capture=& $adapter -Prompt 'Propose a read only tool.' -ModelId 'fixture-model' -ModelDigest $digest -OutputDirectory (Join-Path $tempRoot 'capture') -FixtureResponsePath $fixturePath -Execute
    Assert-True ($capture.captureStatus -eq 'Completed') "Synthetic capture failed: $($capture.failure)"
    Assert-True ($capture.observation.toolCallCount -eq 1 -and $capture.observation.toolDisposition -eq 'PROPOSED_NOT_EXECUTED') 'Tool proposal was not preserved as non-executed.'
    Assert-True (-not $capture.effects.toolExecutionPerformed -and -not $capture.effects.transportPerformed -and -not $capture.effects.desktopLifecyclePerformed) 'Synthetic capture claimed a forbidden effect.'
    $metadataSha=(Get-FileHash -LiteralPath $capture.MetadataPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $valid=& $validator -MetadataPath $capture.MetadataPath -ExpectedMetadataSha256 $metadataSha -ExpectedModelId fixture-model -ExpectedModelDigest $digest -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow
    Assert-True $valid.Passed "Valid synthetic evidence failed: $($valid.FailedGates -join ', ')"
    $notAttested=& $validator -MetadataPath $capture.MetadataPath -ExpectedMetadataSha256 $metadataSha -ExpectedModelId fixture-model -ExpectedModelDigest $digest -AllowFixtureEvidence -NoThrow
    Assert-True (-not $notAttested.Passed -and $notAttested.FailedGates.Count -eq 1 -and $notAttested.FailedGates[0] -eq 'ModelDigestNotAttested') 'Unattested digest did not fail with the exact gate.'
    $fixtureNotRuntime=& $validator -MetadataPath $capture.MetadataPath -ExpectedMetadataSha256 $metadataSha -ExpectedModelId fixture-model -ExpectedModelDigest $digest -AcceptUnverifiedModelDigest -NoThrow
    Assert-True (-not $fixtureNotRuntime.Passed -and $fixtureNotRuntime.FailedGates.Count -eq 1 -and $fixtureNotRuntime.FailedGates[0] -eq 'FixtureEvidenceNotRuntime') 'Fixture evidence was mistaken for runtime evidence.'
    $typedMetadata=Get-Content -LiteralPath $capture.MetadataPath -Raw|ConvertFrom-Json
    $typedMetadata.effects.toolExecutionPerformed='False'
    $typedPath=Join-Path $tempRoot 'typed-metadata.json'
    [IO.File]::WriteAllText($typedPath,($typedMetadata|ConvertTo-Json -Depth 12),(New-Object Text.UTF8Encoding($false)))
    $typedSha=(Get-FileHash -LiteralPath $typedPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $typed=& $validator -MetadataPath $typedPath -ExpectedMetadataSha256 $typedSha -ExpectedModelId fixture-model -ExpectedModelDigest $digest -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow
    Assert-True (-not $typed.Passed -and $typed.FailedGates -contains 'Effects.toolExecutionPerformed') 'String False was coerced into a no-execution claim.'
    $deepPath=Join-Path $tempRoot 'deep-response.json'
    $deepJson='{"model":"fixture-model","done":true,"message":'+('['*70)+(']'*70)+'}'
    [IO.File]::WriteAllText($deepPath,$deepJson,(New-Object Text.UTF8Encoding($false)))
    $deepCapture=& $adapter -Prompt x -ModelId fixture-model -ModelDigest $digest -OutputDirectory (Join-Path $tempRoot 'deep-capture') -FixtureResponsePath $deepPath -Execute
    Assert-True ($deepCapture.captureStatus -eq 'RequestFailed' -and $deepCapture.failure -match 'JSON nesting limit') 'Deep JSON fixture was not rejected before parsing.'
    Add-Content -LiteralPath $capture.artifacts.responsePath -Value 'drift'
    $drift=& $validator -MetadataPath $capture.MetadataPath -ExpectedMetadataSha256 $metadataSha -ExpectedModelId fixture-model -ExpectedModelDigest $digest -AcceptUnverifiedModelDigest -AllowFixtureEvidence -NoThrow
    Assert-True (-not $drift.Passed -and $drift.FailedGates -contains 'Artifacts.response.Sha256') 'Response drift was not rejected by exact hash gate.'
}finally{
    if(Test-Path -LiteralPath $tempRoot){Remove-Item -LiteralPath $tempRoot -Recurse -Force}
}
'Ollama adapter contracts passed.'
```

## File: `Tests/Test-PatchContracts.ps1`

```powershell
[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$pluginRoot = Split-Path -Parent $PSScriptRoot
$validator = Join-Path $pluginRoot 'scripts\Test-PowerShellWorkbenchPatch.ps1'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-patch-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempRoot | Out-Null

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Assert-FailedGatesExactly {
    param($Result, [string[]]$Expected, [string]$Message)
    $actual = @($Result.FailedGates)
    Assert-True ($actual.Count -eq $Expected.Count) "$Message Expected $($Expected.Count) failed gates but received $($actual.Count): $($actual -join ', ')."
    for ($index = 0; $index -lt $Expected.Count; $index++) {
        Assert-True ($actual[$index] -eq $Expected[$index]) "$Message Expected failed gate '$($Expected[$index])' at index $index but received '$($actual[$index])'."
    }
}

try {
    $tokens = $null
    $errors = $null
    $ast = [Management.Automation.Language.Parser]::ParseFile($validator, [ref]$tokens, [ref]$errors)
    Assert-True (@($errors).Count -eq 0) 'Patch validator has parser errors.'
    $forbidden = @('apply_patch', 'applypatch', 'Invoke-Expression', 'Start-Process', 'Invoke-RestMethod', 'Invoke-WebRequest', 'Set-Clipboard', 'git', 'gh')
    $commands = @($ast.FindAll({ param($node) $node -is [Management.Automation.Language.CommandAst] }, $true) | ForEach-Object { $_.GetCommandName() } | Where-Object { $_ })
    foreach ($command in $forbidden) {
        Assert-True ($commands -notcontains $command) "Patch validator contains forbidden execution or transport command '$command'."
    }
    $validatorSource = Get-Content -LiteralPath $validator -Raw
    Assert-True ($validatorSource -notmatch 'ReadAllBytes') 'Patch validator regressed to an unbounded, separately reopened file read.'
    Assert-True ($validatorSource -match 'Read-BoundedPatchFile' -and $validatorSource -match 'PatchStableDuringRead') 'Patch validator does not expose its bounded stable-read contract.'

    $validPatch = @'
*** Begin Patch
*** Update File: scripts/example.ps1
@@
-Write-Output 'old'
+Write-Output 'new'
*** End Patch
'@.TrimEnd("`r", "`n")
    $safeTransport = @{ InvocationMode = 'DirectArgument'; HostAdapter = 'DedicatedTool' }

    $unknownTransport = & $validator -PatchText $validPatch
    Assert-FailedGatesExactly -Result $unknownTransport -Expected @('InvocationModeKnown', 'HostAdapterKnown') -Message 'Missing transport metadata did not fail closed.'

    $direct = & $validator -PatchText $validPatch @safeTransport
    Assert-True $direct.Eligible 'Valid direct-argument patch was rejected.'
    Assert-FailedGatesExactly -Result $direct -Expected @() -Message 'Valid direct-argument patch failed unexpectedly.'
    Assert-True ($direct.DetectedEncoding -eq 'Utf8NoBomReencodedText' -and $direct.EncodingEvidence -eq 'ReencodedText' -and $direct.OperationCount -eq 1) 'Valid patch metadata was not preserved.'
    Assert-True ($direct.TargetPaths.Count -eq 1 -and $direct.TargetPaths[0] -eq 'scripts/example.ps1') 'Valid patch target was not preserved.'
    Assert-True (-not $direct.ExecutionOccurred -and -not $direct.TransportPerformed -and -not $direct.TargetMutation) 'Patch validator violated its read-only contract.'
    Assert-True ($direct.PatchSha256 -match '^[0-9a-f]{64}$') 'Patch validator did not bind the payload to SHA-256.'

    foreach ($mode in @('Pipeline', 'StandardInput', 'ShellText')) {
        $rejectedMode = & $validator -PatchText $validPatch -InvocationMode $mode -HostAdapter DedicatedTool
        Assert-True (-not $rejectedMode.Eligible) "Invocation mode '$mode' did not fail closed."
        Assert-FailedGatesExactly -Result $rejectedMode -Expected @('InvocationModeDirectArgument') -Message "Invocation mode '$mode' propagated the wrong failed gate."
    }

    $batchWrapperResult = & $validator -PatchText $validPatch -InvocationMode DirectArgument -HostAdapter WindowsBatchWrapper
    Assert-True (-not $batchWrapperResult.Eligible) 'Windows batch wrapper did not fail closed.'
    Assert-FailedGatesExactly -Result $batchWrapperResult -Expected @('HostAdapterMultilineArgumentSafe') -Message 'Windows batch wrapper propagated the wrong failed gate.'

    $nativeResult = & $validator -PatchText $validPatch -InvocationMode DirectArgument -HostAdapter NativeExecutable
    Assert-True $nativeResult.Eligible 'Native executable direct-argument adapter was rejected.'
    Assert-FailedGatesExactly -Result $nativeResult -Expected @() -Message 'Native executable direct-argument adapter failed unexpectedly.'

    $missingEnvelope = $validPatch -replace '\*\*\* End Patch$', '*** End Patched'
    $envelopeResult = & $validator -PatchText $missingEnvelope @safeTransport
    Assert-FailedGatesExactly -Result $envelopeResult -Expected @('PatchEnvelope') -Message 'Malformed patch envelope propagated the wrong failed gate.'

    $noOperation = "*** Begin Patch`n`n*** End Patch"
    $noOperationResult = & $validator -PatchText $noOperation @safeTransport
    Assert-FailedGatesExactly -Result $noOperationResult -Expected @('PatchHasOperation') -Message 'Operation-free patch propagated the wrong failed gate.'

    $duplicateTarget = @'
*** Begin Patch
*** Update File: scripts/example.ps1
@@
-one
+two
*** Delete File: scripts/example.ps1
*** End Patch
'@.TrimEnd("`r", "`n")
    $duplicateResult = & $validator -PatchText $duplicateTarget @safeTransport
    Assert-FailedGatesExactly -Result $duplicateResult -Expected @('PatchSingleOperationPerTarget') -Message 'Duplicate patch target propagated the wrong failed gate.'

    $aliasedDuplicateTarget = @'
*** Begin Patch
*** Update File: scripts\example.ps1
@@
-one
+two
*** Delete File: scripts/./EXAMPLE.ps1
*** End Patch
'@.TrimEnd("`r", "`n")
    $aliasedDuplicateResult = & $validator -PatchText $aliasedDuplicateTarget @safeTransport
    Assert-FailedGatesExactly -Result $aliasedDuplicateResult -Expected @('PatchSingleOperationPerTarget') -Message 'Aliased Windows patch target did not fail closed.'

    $escapingTarget = @'
*** Begin Patch
*** Update File: ../outside.ps1
@@
-one
+two
*** End Patch
'@.TrimEnd("`r", "`n")
    $escapingTargetResult = & $validator -PatchText $escapingTarget @safeTransport
    Assert-FailedGatesExactly -Result $escapingTargetResult -Expected @('PatchTargetPathCanonical') -Message 'Escaping target path propagated the wrong failed gate.'

    $validPath = Join-Path $tempRoot 'valid.patch'
    [IO.File]::WriteAllText($validPath, $validPatch, (New-Object Text.UTF8Encoding($false)))
    $beforeHash = (Get-FileHash -LiteralPath $validPath -Algorithm SHA256).Hash
    $beforeFiles = @((Get-ChildItem -LiteralPath $tempRoot -File | Sort-Object Name).Name)
    $pathResult = & $validator -PatchPath $validPath @safeTransport
    $afterHash = (Get-FileHash -LiteralPath $validPath -Algorithm SHA256).Hash
    $afterFiles = @((Get-ChildItem -LiteralPath $tempRoot -File | Sort-Object Name).Name)
    Assert-True $pathResult.Eligible 'Valid UTF-8 no-BOM patch file was rejected.'
    Assert-True ($beforeHash -eq $afterHash) 'Patch validator modified the input patch file.'
    Assert-True (($beforeFiles -join '|') -eq ($afterFiles -join '|')) 'Patch validator created a file while validating a patch path.'

    $utf8BomPath = Join-Path $tempRoot 'utf8-bom.patch'
    [IO.File]::WriteAllText($utf8BomPath, $validPatch, (New-Object Text.UTF8Encoding($true)))
    $utf8BomResult = & $validator -PatchPath $utf8BomPath @safeTransport
    Assert-FailedGatesExactly -Result $utf8BomResult -Expected @('PatchEncodingUtf8NoBom') -Message 'UTF-8 BOM propagated the wrong failed gate.'

    $utf16Path = Join-Path $tempRoot 'utf16.patch'
    [IO.File]::WriteAllText($utf16Path, $validPatch, [Text.Encoding]::Unicode)
    $utf16Result = & $validator -PatchPath $utf16Path @safeTransport
    Assert-FailedGatesExactly -Result $utf16Result -Expected @('PatchEncodingUtf8NoBom') -Message 'UTF-16 propagated the wrong failed gate.'

    $missingPathResult = & $validator -PatchPath (Join-Path $tempRoot 'missing.patch') @safeTransport
    Assert-FailedGatesExactly -Result $missingPathResult -Expected @('PatchFileExists') -Message 'Missing patch file propagated the wrong failed gate.'

    $oversizedTextResult = & $validator -PatchText $validPatch -MaximumBytes 8 @safeTransport
    Assert-FailedGatesExactly -Result $oversizedTextResult -Expected @('PatchWithinByteLimit') -Message 'Oversized text patch propagated the wrong failed gate.'
    Assert-True ($null -eq $oversizedTextResult.PatchSha256) 'Oversized text patch was hashed after failing its byte limit.'

    $oversizedPath = Join-Path $tempRoot 'oversized.patch'
    [IO.File]::WriteAllBytes($oversizedPath, (New-Object byte[] 9))
    $oversizedPathResult = & $validator -PatchPath $oversizedPath -MaximumBytes 8 @safeTransport
    Assert-FailedGatesExactly -Result $oversizedPathResult -Expected @('PatchWithinByteLimit') -Message 'Oversized patch file propagated the wrong failed gate.'
    Assert-True ($null -eq $oversizedPathResult.PatchSha256 -and $oversizedPathResult.ByteLength -eq 9) 'Oversized patch file was read or lost its observed length.'

    'PowerShell Workbench patch contracts passed.'
} finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
```

## File: `Tests/Test-PortableMarketplaceContracts.ps1`

```powershell
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot
$packager=Join-Path $pluginRoot 'scripts\New-PortablePowerShellWorkbenchMarketplace.ps1'
$pluginValidator=Join-Path $pluginRoot 'scripts\Test-PowerShellWorkbenchPlugin.ps1'
$healthValidator=Join-Path $pluginRoot 'scripts\Test-PowerShellWorkbenchHealth.ps1'
$expectedVersion=[string]((Get-Content -LiteralPath (Join-Path $pluginRoot '.codex-plugin\plugin.json') -Raw|ConvertFrom-Json).version)
$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-portability-'+[guid]::NewGuid().ToString('N'))
function Assert-True{param([bool]$Condition,[string]$Message)if(-not$Condition){throw $Message}}
function Assert-Throw{param([scriptblock]$Action,[string]$Pattern,[string]$Message)$caught=$null;try{&$Action}catch{$caught=$_};if(-not$caught-or$caught.Exception.Message-notmatch$Pattern){throw $Message}}
function Get-Snapshot{param([string]$Root)if(-not(Test-Path -LiteralPath $Root)){return '<missing>'};@((Get-ChildItem -LiteralPath $Root -Recurse -Force|ForEach-Object{$length=if($_.PSIsContainer){0}else{$_.Length};$hash=if($_.PSIsContainer){''}else{(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash};"$($_.FullName)|$($_.PSIsContainer)|$length|$hash"}|Sort-Object))-join[Environment]::NewLine}

$tokens=$null;$errors=$null;$null=[Management.Automation.Language.Parser]::ParseFile($packager,[ref]$tokens,[ref]$errors)
Assert-True -Condition ($errors.Count-eq 0) -Message 'Portable marketplace packager has parser errors.'
try{
    New-Item -ItemType Directory -Path $tempRoot|Out-Null
    $destination=Join-Path $tempRoot 'portable-marketplace'
    $preview=&$packager -Destination $destination -WhatIf
    Assert-True -Condition ($preview.State-eq'PREVIEW'-and$preview.Mode-eq'CleanInstall'-and-not$preview.WritePerformed-and-not$preview.TransportPerformed) -Message 'Clean-install preview contract failed.'
    Assert-True -Condition (-not(Test-Path -LiteralPath $destination)) -Message 'Preview created the destination.'
    $installed=&$packager -Destination $destination -Confirm:$false
    Assert-True -Condition ($installed.State-eq'SUCCEEDED'-and$installed.Mode-eq'CleanInstall'-and$installed.WritePerformed-and-not$installed.RestorePerformed-and-not$installed.TransportPerformed) -Message 'Clean-install result contract failed.'
    &$pluginValidator -PluginRoot $installed.PluginPath|Out-Null
    $installedGovernance=& (Join-Path $installed.PluginPath 'Tests\Test-GovernanceContracts.ps1')
    Assert-True -Condition ($installedGovernance -match 'skipped: repository governance context is unavailable') -Message 'Installed plugin governance contract did not explicitly skip unavailable repository context.'
    $marketplace=Get-Content -LiteralPath $installed.MarketplacePath -Raw|ConvertFrom-Json
    Assert-True -Condition ([string]$marketplace.name-ceq'powershell-workbench') -Message 'Clean install marketplace name changed.'
    Assert-True -Condition ([string]$marketplace.plugins[0].source.path-ceq'./plugins/powershell-workbench') -Message 'Marketplace source path is not portable.'
    $health=&$healthValidator -Distribution ([pscustomobject]@{Name='fixture';SourcePath=$pluginRoot;CachePath=$installed.PluginPath}) -ExpectedVersion $expectedVersion -NoThrow
    Assert-True -Condition ($health.Passed) -Message "Clean install tree identity failed: $($health.FailedGates-join', ')."
    $beforeExisting=Get-Snapshot -Root $destination
    $existingPreview=&$packager -Destination $destination -WhatIf
    Assert-True -Condition ($existingPreview.State-eq'PREVIEW'-and$existingPreview.Mode-eq'Upgrade'-and-not$existingPreview.WritePerformed) -Message 'Existing-target non-force preview contract failed.'
    Assert-True -Condition ((Get-Snapshot -Root $destination)-ceq$beforeExisting) -Message 'Existing-target non-force preview changed the destination.'
    Assert-Throw -Action {&$packager -Destination $destination -Confirm:$false} -Pattern 'use -Force' -Message 'Existing targets did not require -Force.'
    Assert-True -Condition ((Get-Snapshot -Root $destination)-ceq$beforeExisting) -Message 'Rejected non-force upgrade changed the destination.'
    $manifestPath=Join-Path $installed.PluginPath '.codex-plugin\plugin.json'
    $oldManifest=Get-Content -LiteralPath $manifestPath -Raw|ConvertFrom-Json;$oldManifest.version='0.7.8';$oldManifest|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $manifestPath -Encoding UTF8
    $marketplace.name='personal';$marketplace|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $installed.MarketplacePath -Encoding UTF8
    Set-Content -LiteralPath (Join-Path $installed.PluginPath 'legacy-marker.txt') -Value 'remove-on-upgrade' -Encoding UTF8
    $beforeUpgrade=Get-Snapshot -Root $destination
    $upgradePreview=&$packager -Destination $destination -Force -WhatIf
    Assert-True -Condition ($upgradePreview.State-eq'PREVIEW'-and$upgradePreview.Mode-eq'Upgrade'-and$upgradePreview.MarketplaceName-ceq'personal'-and$upgradePreview.ExistingPlugin-and$upgradePreview.ExistingMarketplace) -Message 'Upgrade preview contract failed.'
    Assert-True -Condition ((Get-Snapshot -Root $destination)-ceq$beforeUpgrade) -Message 'Upgrade preview changed the destination.'
    $lock=[IO.File]::Open($installed.MarketplacePath,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None)
    try{Assert-Throw -Action {&$packager -Destination $destination -Force -Confirm:$false} -Pattern '.+' -Message 'Locked marketplace did not trigger rollback.'}finally{$lock.Dispose()}
    Assert-True -Condition ((Get-Snapshot -Root $destination)-ceq$beforeUpgrade) -Message 'Failed upgrade did not restore the exact destination snapshot.'
    Assert-True -Condition (@(Get-ChildItem -LiteralPath $destination -Filter '.pwb-tx-*' -Force).Count-eq 0) -Message 'Transaction residue remained after rollback.'
    $upgraded=&$packager -Destination $destination -Force -Confirm:$false
    Assert-True -Condition ($upgraded.State-eq'SUCCEEDED'-and$upgraded.Mode-eq'Upgrade'-and$upgraded.MarketplaceName-ceq'personal'-and-not$upgraded.RestorePerformed) -Message 'Upgrade result contract failed.'
    $upgradedMarketplace=Get-Content -LiteralPath $upgraded.MarketplacePath -Raw|ConvertFrom-Json
    Assert-True -Condition ([string]$upgradedMarketplace.name-ceq'personal') -Message 'Upgrade did not preserve the existing marketplace name.'
    Assert-True -Condition (-not(Test-Path -LiteralPath (Join-Path $upgraded.PluginPath 'legacy-marker.txt'))) -Message 'Upgrade retained an obsolete plugin file.'
    $health=&$healthValidator -Distribution ([pscustomobject]@{Name='fixture';SourcePath=$pluginRoot;CachePath=$upgraded.PluginPath}) -ExpectedVersion $expectedVersion -NoThrow
    Assert-True -Condition ($health.Passed) -Message "Upgrade tree identity failed: $($health.FailedGates-join', ')."
    Assert-True -Condition (@(Get-ChildItem -LiteralPath $destination -Filter '.pwb-tx-*' -Force).Count-eq 0) -Message 'Transaction residue remained after success.'
    $upgradedMarketplace.name='?';$upgradedMarketplace|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $upgraded.MarketplacePath -Encoding UTF8
    $invalidNameBefore=Get-Snapshot -Root $destination
    Assert-Throw -Action {&$packager -Destination $destination -Force -Confirm:$false} -Pattern 'name is missing or invalid' -Message 'Invalid existing marketplace name was accepted.'
    Assert-True -Condition ((Get-Snapshot -Root $destination)-ceq$invalidNameBefore) -Message 'Invalid marketplace-name preflight changed the destination.'
    Set-Content -LiteralPath $upgraded.MarketplacePath -Value '{invalid-json' -Encoding UTF8
    $invalidJsonBefore=Get-Snapshot -Root $destination
    Assert-Throw -Action {&$packager -Destination $destination -Force -Confirm:$false} -Pattern 'invalid JSON' -Message 'Invalid existing marketplace JSON was accepted.'
    Assert-True -Condition ((Get-Snapshot -Root $destination)-ceq$invalidJsonBefore) -Message 'Invalid marketplace-JSON preflight changed the destination.'
    $invalidDestination=Join-Path $tempRoot 'invalid-parent';New-Item -ItemType Directory -Path (Join-Path $invalidDestination '.agents') -Force|Out-Null;Set-Content -LiteralPath (Join-Path $invalidDestination '.agents\plugins') -Value 'blocking-file' -Encoding UTF8
    $invalidBefore=Get-Snapshot -Root $invalidDestination
    Assert-Throw -Action {&$packager -Destination $invalidDestination -Confirm:$false} -Pattern 'metadata parent is a file' -Message 'Invalid marketplace parent did not fail preflight.'
    Assert-True -Condition ((Get-Snapshot -Root $invalidDestination)-ceq$invalidBefore) -Message 'Failed preflight changed the destination.'
    Assert-Throw -Action {&$packager -Destination $pluginRoot -WhatIf} -Pattern 'disjoint' -Message 'Overlapping source and destination were accepted.'
}finally{if(Test-Path -LiteralPath $tempRoot){Remove-Item -LiteralPath $tempRoot -Recurse -Force}}
'PowerShell Workbench portable marketplace contracts passed.'
```

## File: `Tests/Test-ProjectAssessmentContracts.ps1`

```powershell
[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot
$assessmentScript=Join-Path $pluginRoot 'scripts\Get-PowerShellWorkbenchProjectAssessment.ps1'
$newAssessmentScript=Join-Path $pluginRoot 'scripts\New-PowerShellWorkbenchProjectAssessment.ps1'
$portalScript=Join-Path $pluginRoot 'scripts\Show-PowerShellWorkbenchProjectPortal.ps1'
$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-assessment-'+[guid]::NewGuid().ToString('N'))
$profileDirectory=Join-Path $tempRoot '.powershell-workbench'; $profilePath=Join-Path $profileDirectory 'project-profile.json'; $assessmentPath=Join-Path $profileDirectory 'project-assessment.json'
try{
    New-Item -ItemType Directory -Path $profileDirectory -Force|Out-Null
    @{schemaVersion='1.0';project=@{name='Fixture';root='..'};components=@();targets=@{windows=@('Windows 10 Home','Windows 10 Pro','Windows 11')};paths=@{reports='Reports'}}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $profilePath -Encoding UTF8
    $missing=& $assessmentScript -ProfilePath $profilePath
    if($missing.IsConfigured -or $missing.IsValid -or $missing.FailedGates -notcontains 'AssessmentProfilePresent' -or $missing.WritePerformed -or $missing.NetworkPerformed -or $missing.ProcessPerformed -or $missing.TransportPerformed){throw 'Missing assessment was not reported as a non-executing fail-closed state.'}
    $evidencePath=Join-Path $profileDirectory 'evidence.json'; [IO.File]::WriteAllText($evidencePath,'{"result":"pass"}',(New-Object Text.UTF8Encoding($false)))
    $evidenceHash=(Get-FileHash -LiteralPath $evidencePath -Algorithm SHA256).Hash.ToLowerInvariant()
    [ordered]@{schemaVersion='1.0';source=[ordered]@{commit='a3449c20f6b089259088cbf7f8712111989940d9'};host=[ordered]@{binding='fixture-host';sanitizationStatus='SANITIZED'};nextAllowedAction='Review the bounded report.';targets=@([ordered]@{name='Windows 10 Home';status='PASS';evidence=@([ordered]@{path='evidence.json';sha256=$evidenceHash})},[ordered]@{name='Windows 10 Pro';status='WAITING';evidence=@()},[ordered]@{name='Windows 11';status='NOT_RUN';evidence=@()})}|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $assessmentPath -Encoding UTF8
    $valid=& $assessmentScript -ProfilePath $profilePath -AssessmentPath $assessmentPath
    if(-not $valid.IsConfigured -or -not $valid.IsValid -or $valid.ReadinessStatus -ne 'WAITING' -or $valid.Targets.Count -ne 3 -or $valid.Targets[0].Evidence[0].State -ne 'VERIFIED' -or $valid.NextAllowedAction -ne 'Review the bounded report.'){throw 'Valid assessment did not preserve target, evidence, and next-action state.'}
    $json=& $assessmentScript -ProfilePath $profilePath -AssessmentPath $assessmentPath -AsJson|ConvertFrom-Json
    if(-not $json.IsValid -or $json.Targets[0].Status -ne 'PASS'){throw 'Assessment JSON did not preserve valid state.'}
    [IO.File]::WriteAllText($evidencePath,'{"result":"drift"}',(New-Object Text.UTF8Encoding($false)))
    $drifted=& $assessmentScript -ProfilePath $profilePath -AssessmentPath $assessmentPath
    if($drifted.IsValid -or $drifted.ReadinessStatus -ne 'BLOCKED' -or $drifted.Targets[0].FailedGates -notcontains 'EvidenceHash' -or $drifted.Targets[0].FailedGates -notcontains 'PassRequiresVerifiedEvidence'){throw 'Drifted PASS evidence did not fail with exact target gates.'}
    $portal=& $portalScript -ProfilePath $profilePath -AssessmentPath $assessmentPath
    if($portal.Assessment.Targets[0].Evidence[0].State -ne 'DRIFTED' -or $portal.WasUpdated){throw 'Portal did not expose assessment drift read-only.'}
    $previewPath=Join-Path $profileDirectory 'preview-assessment.json';$preview=& $newAssessmentScript -ProjectRoot $tempRoot -ProfilePath $profilePath -Destination $previewPath -NoWrite
    if($preview.Mode -ne 'PREVIEW' -or $preview.WritePerformed -or (Test-Path -LiteralPath $previewPath) -or $preview.AssessmentDocument.schemaVersion -ne '1.1' -or $preview.AssessmentDocument.targets[0].status -ne 'NOT_RUN'){throw 'Assessment generator did not produce a non-writing, non-PASS preview.'}
    $evidenceRoot=Join-Path $tempRoot 'KnowledgeBase';New-Item -ItemType Directory -Path $evidenceRoot -Force|Out-Null;$externalEvidence=Join-Path $evidenceRoot 'build.json';[IO.File]::WriteAllText($externalEvidence,'{"result":"pass"}',(New-Object Text.UTF8Encoding($false)))
    $profileHash=(Get-FileHash -LiteralPath $profilePath -Algorithm SHA256).Hash.ToLowerInvariant();$externalHash=(Get-FileHash -LiteralPath $externalEvidence -Algorithm SHA256).Hash.ToLowerInvariant()
    $nonGit=[ordered]@{schemaVersion='1.1';source=[ordered]@{kind='ledger';identity=[ordered]@{algorithm='SHA256';value=('b'*64)}};profileSha256=$profileHash;host=[ordered]@{binding='fixture-host';sanitizationStatus='SANITIZED'};nextAllowedAction='Review evidence.';targets=@([ordered]@{name='Windows 10 Home';status='PASS';applicability='APPLICABLE';freshness='FRESH';proofs=[ordered]@{safeOffline='VERIFIED';live='NOT_APPLICABLE';postcondition='VERIFIED'};evidence=@([ordered]@{path='KnowledgeBase/build.json';sha256=$externalHash})})}
    $nonGit|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $assessmentPath -Encoding UTF8
    $nonGitResult=& $assessmentScript -ProfilePath $profilePath -AssessmentPath $assessmentPath
    if(-not $nonGitResult.IsValid -or $nonGitResult.Source.Kind -ne 'ledger' -or $nonGitResult.Targets[0].Evidence[0].State -ne 'VERIFIED'){throw 'Assessment 1.1 did not accept hash-bound non-Git evidence inside the project root.'}
    $nonGit.profileSha256=('0'*64);$nonGit|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $assessmentPath -Encoding UTF8
    $profileDrift=& $assessmentScript -ProfilePath $profilePath -AssessmentPath $assessmentPath
    if($profileDrift.IsValid -or $profileDrift.FailedGates -notcontains 'ProfileHash'){throw 'Assessment 1.1 did not fail closed on profile hash drift.'}
}finally{Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue}
```

## File: `Tests/Test-ProjectPortalContracts.ps1`

```powershell
[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot
$portal=Join-Path $pluginRoot 'scripts\Show-PowerShellWorkbenchProjectPortal.ps1'
$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-portal-'+[guid]::NewGuid().ToString('N'))
$profileDirectory=Join-Path $tempRoot '.powershell-workbench'
$profilePath=Join-Path $profileDirectory 'project-profile.json'
try{
    New-Item -ItemType Directory -Path $profileDirectory -Force|Out-Null
    @{schemaVersion='1.0';project=@{name='Fixture';root='..'};components=@();targets=@{windows=@()};paths=@{reports='Reports'}}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $profilePath -Encoding UTF8
    $readOnly=& $portal -ProfilePath $profilePath
    if($readOnly.WasUpdated){throw 'Read-only portal view reported an update.'}
    $before=Get-Content -LiteralPath $profilePath -Raw
    $preview=& $portal -ProfilePath $profilePath -ProjectRoot '.' -ComponentRoot @{main='src'} -WorkingPath @{cache='.cache'} -WindowsTarget @('Windows 11') -NoWrite
    $after=Get-Content -LiteralPath $profilePath -Raw
    if($preview.WasUpdated -or $before -ne $after -or $preview.Components.Count -ne 1){throw 'NoWrite portal preview modified or failed to map the profile.'}
    $missingPath=Join-Path $tempRoot '.powershell-workbench\missing-project-profile.json'
    $missingPreview=& $portal -ProfilePath $missingPath -ProjectRoot $tempRoot -ComponentRoot @{addon='src'} -NoWrite
    if($missingPreview.WasUpdated -or $missingPreview.ProfilePath -ne $missingPath -or (Test-Path -LiteralPath $missingPath -PathType Leaf) -or @($missingPreview.Components | Where-Object { $_.id -eq 'main' }).Count -ne 1 -or @($missingPreview.Components | Where-Object { $_.id -eq 'addon' }).Count -ne 1 -or $missingPreview.ProjectRoot -ne $tempRoot){throw 'Missing-profile NoWrite preview lost generated components or used the wrong project name/root.'}
    $updated=& $portal -ProfilePath $profilePath -WorkingPath @{reports='Output'}
    $updatedBytes=[IO.File]::ReadAllBytes($profilePath)
    if(-not $updated.WasUpdated -or ($updatedBytes.Length -ge 3 -and $updatedBytes[0] -eq 0xEF -and $updatedBytes[1] -eq 0xBB -and $updatedBytes[2] -eq 0xBF)){throw 'Portal write did not report its update or was not deterministic UTF-8 without BOM.'}
}finally{Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue}
```

## File: `Tests/Test-ProjectProfileContracts.ps1`

```powershell
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot;$newProfile=Join-Path $pluginRoot 'scripts\New-PowerShellWorkbenchProjectProfile.ps1';$resolveProfile=Join-Path $pluginRoot 'scripts\Resolve-PowerShellWorkbenchProjectProfile.ps1';$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-profile-'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path (Join-Path $tempRoot 'src') -Force|Out-Null
try{
    $created=& $newProfile -ProjectRoot $tempRoot -Name 'FixtureProject' -Confirm:$false
    $createdBytes=[IO.File]::ReadAllBytes($created.ProfilePath)
    if($createdBytes.Length -ge 3 -and $createdBytes[0] -eq 0xEF -and $createdBytes[1] -eq 0xBB -and $createdBytes[2] -eq 0xBF){throw 'Generated profile was not deterministic UTF-8 without BOM.'}
    $resolved=& $resolveProfile -ProfilePath $created.ProfilePath
    if($resolved.ProjectName -ne 'FixtureProject' -or -not $resolved.ProjectRootExists -or $resolved.Components[0].ResolvedRoot -ne $tempRoot -or $resolved.PathDetails.reports.Exists -or -not $resolved.PathDetails.reports.WithinProject -or $resolved.PathDetails.reports.ConfiguredPath -ne 'Reports' -or $resolved.Quality.BlockingRules -notcontains 'PSReviewUnusedParameter'){throw 'Portable project profile did not resolve its relative root, quality plan, and path evidence.'}
    $profileDocument=Get-Content -LiteralPath $created.ProfilePath -Raw|ConvertFrom-Json
    $profileDocument.components+=([pscustomobject]@{id='outside';root='..\..\outside';role='shared'})
    $profileDocument|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $created.ProfilePath -Encoding UTF8
    $rejected=$false;try{& $resolveProfile -ProfilePath $created.ProfilePath|Out-Null}catch{$rejected=$true}
    if(-not $rejected){throw 'External component root was accepted without explicit authorization.'}
    $profileDocument.components=@([pscustomobject]@{id='main';root='..';role='primary'})
    $profileDocument.paths | Add-Member -MemberType NoteProperty -Name escaped -Value '..\Log'
    $profileDocument|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $created.ProfilePath -Encoding UTF8
    $escapedPathRejected=$false;try{& $resolveProfile -ProfilePath $created.ProfilePath|Out-Null}catch{$escapedPathRejected=$true}
    if(-not $escapedPathRejected){throw 'A working path outside the project root was accepted without explicit authorization.'}
    $externalPath=& $resolveProfile -ProfilePath $created.ProfilePath -AllowExternalPaths
    if($externalPath.PathDetails.escaped.WithinProject -or $externalPath.PathDetails.escaped.ResolvedPath -ne (Join-Path (Split-Path -Parent $tempRoot) 'Log')){throw 'Explicit external working path authorization did not preserve deterministic evidence.'}
    $previewProfilePath=Join-Path $tempRoot '.powershell-workbench\preview-project-profile.json'
    $preview=& $newProfile -ProjectRoot $tempRoot -Name 'FixtureProject' -Destination $previewProfilePath -NoWrite
    if(-not $preview.ProfilePath -or -not $preview.ProfileDocument -or $preview.ProfileDocument.project.name -ne 'FixtureProject' -or $preview.WasCreated -or -not $preview.WasPreview -or (Test-Path -LiteralPath $previewProfilePath -PathType Leaf)){throw 'NoWrite profile creation did not return a preview document only.'}
    'PowerShell Workbench project profile contracts passed.'
}finally{Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue}
```

## File: `Tests/Test-ReadOnlyToolContracts.ps1`

```powershell
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$resolver = Join-Path $root 'scripts\Resolve-PowerShellWorkbenchReadOnlyToolChain.ps1'
$executor = Join-Path $root 'scripts\Invoke-PowerShellWorkbenchReadOnlyTool.ps1'
$adapter = Join-Path $root 'scripts\Invoke-PowerShellWorkbenchOllamaChat.ps1'
$proposalGenerator = Join-Path $root 'scripts\New-PowerShellWorkbenchReadOnlyToolProposal.ps1'
$approvalGenerator = Join-Path $root 'scripts\New-PowerShellWorkbenchReadOnlyToolApproval.ps1'
$referenceTime = [datetimeoffset]'2026-09-06T12:05:00Z'
$utf8 = New-Object Text.UTF8Encoding($false)

function Assert-True { param([bool]$Condition,[string]$Message) if(-not $Condition){throw $Message} }
function Assert-GatesExactly { param($Result,[string[]]$Expected,[string]$Message) $actual=@($Result.FailedGates);if(($actual -join '|') -cne ($Expected -join '|')){throw "$Message Expected [$($Expected -join ', ')], got [$($actual -join ', ')]."} }
function Get-Sha256 { param([string]$LiteralPath) (Get-FileHash -LiteralPath $LiteralPath -Algorithm SHA256).Hash.ToLowerInvariant() }
function Write-Json { param([string]$LiteralPath,$Value) [IO.File]::WriteAllText($LiteralPath,($Value|ConvertTo-Json -Depth 10),$utf8) }
function Write-ProposalFixture {
    param([string]$LiteralPath,[string]$TargetPath,[string]$CreatedAt,[int64]$OffsetBytes,[int64]$MaximumBytes)
    if(-not $PSBoundParameters.ContainsKey('CreatedAt')){$CreatedAt='2026-09-06T12:00:00Z'}
    if(-not $PSBoundParameters.ContainsKey('OffsetBytes')){$OffsetBytes=2}
    if(-not $PSBoundParameters.ContainsKey('MaximumBytes')){$MaximumBytes=5}
    $value=[ordered]@{schemaVersion='1.0';proposalId='proposal-fixture';createdAt=$CreatedAt;source=[ordered]@{kind='ollama-tool-call';metadataSha256=('a'*64);responseSha256=('b'*64);toolCallIndex=0};tool=[ordered]@{name='read_file_slice';arguments=[ordered]@{path=$TargetPath;offsetBytes=$OffsetBytes;maximumBytes=$MaximumBytes}}}
    Write-Json -LiteralPath $LiteralPath -Value $value
    Get-Sha256 -LiteralPath $LiteralPath
}
function Write-ApprovalFixture {
    param([string]$LiteralPath,[string]$ProposalSha256,[string]$AllowedRoot,[string]$TargetPath,[string]$CreatedAt,[string]$ExpiresAt)
    if(-not $PSBoundParameters.ContainsKey('CreatedAt')){$CreatedAt='2026-09-06T12:01:00Z'}
    if(-not $PSBoundParameters.ContainsKey('ExpiresAt')){$ExpiresAt='2026-09-06T12:15:00Z'}
    $target=(Get-Item -LiteralPath $TargetPath)
    $value=[ordered]@{schemaVersion='1.0';approvalId='approval-fixture';createdAt=$CreatedAt;expiresAt=$ExpiresAt;decision='Approved';proposalSha256=$ProposalSha256;allowedRoot=$AllowedRoot;target=[ordered]@{path=$TargetPath;sha256=(Get-Sha256 -LiteralPath $TargetPath);bytes=$target.Length}}
    Write-Json -LiteralPath $LiteralPath -Value $value
    Get-Sha256 -LiteralPath $LiteralPath
}
function Resolve-Chain {
    param([string]$ProposalPath,[string]$ProposalSha256,[string]$ApprovalPath,[string]$ApprovalSha256,[string]$AllowedRoot,[datetimeoffset]$At=[datetimeoffset]'2026-09-06T12:05:00Z',[string]$ObservationPath,[string]$ObservationSha256,[string]$AllowedEvidenceRoot)
    $parameters=@{ProposalPath=$ProposalPath;ExpectedProposalSha256=$ProposalSha256;ApprovalPath=$ApprovalPath;ExpectedApprovalSha256=$ApprovalSha256;AllowedRoot=$AllowedRoot;ReferenceTimeUtc=$At;NoThrow=$true}
    if($ObservationPath){$parameters.ObservationPath=$ObservationPath}
    if($ObservationSha256){$parameters.ExpectedObservationSha256=$ObservationSha256}
    if($AllowedEvidenceRoot){$parameters.AllowedEvidenceRoot=$AllowedEvidenceRoot}
    & $resolver @parameters
}

foreach($path in @($resolver,$executor,$proposalGenerator,$approvalGenerator)){
    $tokens=$null;$errors=$null
    $ast=[Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
    Assert-True ($errors.Count -eq 0) "$path has parser errors."
    $commands=@($ast.FindAll({param($node)$node -is [Management.Automation.Language.CommandAst]},$true)|ForEach-Object{$_.GetCommandName()}|Where-Object{$_})
    foreach($forbidden in @('Start-Process','Invoke-Expression','Invoke-RestMethod','Invoke-WebRequest','Set-Clipboard','git','gh')){Assert-True ($commands -notcontains $forbidden) "$path contains forbidden command $forbidden."}
}

$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('pwb-read-tool-'+[guid]::NewGuid().ToString('N'))
try{
    $allowedRoot=Join-Path $tempRoot 'allowed';$evidenceRoot=Join-Path $tempRoot 'evidence';$outputDirectory=Join-Path $evidenceRoot 'run'
    New-Item -ItemType Directory -Path $allowedRoot,$evidenceRoot,$outputDirectory | Out-Null
    $targetPath=Join-Path $allowedRoot 'fixture.txt';[IO.File]::WriteAllText($targetPath,'0123456789abcdef',$utf8)
    $modelDigest='f'*64
    $responseFixturePath=Join-Path $tempRoot 'tool-response.json'
    $responseFixture=[ordered]@{model='fixture-model';created_at='2026-09-06T12:00:00Z';message=[ordered]@{role='assistant';content='';tool_calls=@([ordered]@{type='function';function=[ordered]@{index=0;name='read_file_slice';arguments=[ordered]@{path=$targetPath;offsetBytes=2;maximumBytes=5}}})};done=$true;total_duration=123;prompt_eval_count=4;eval_count=2}
    Write-Json -LiteralPath $responseFixturePath -Value $responseFixture
    $capture=& $adapter -Prompt 'Propose one bounded file slice.' -ModelId fixture-model -ModelDigest $modelDigest -OutputDirectory (Join-Path $tempRoot 'capture') -FixtureResponsePath $responseFixturePath -EnableReadFileSliceProposal -Execute
    $metadataSha=Get-Sha256 -LiteralPath $capture.MetadataPath
    $proposalPath=Join-Path $evidenceRoot 'proposal.json'
    $proposalPreview=& $proposalGenerator -MetadataPath $capture.MetadataPath -ExpectedMetadataSha256 $metadataSha -ExpectedResponseSha256 $capture.artifacts.responseSha256 -ExpectedModelId fixture-model -ExpectedModelDigest $modelDigest -CreatedAt ([datetimeoffset]'2026-09-06T12:00:00Z') -AllowedEvidenceRoot $evidenceRoot -OutputPath $proposalPath -AcceptUnverifiedModelDigest -AllowFixtureEvidence
    $proposalPreviewAgain=& $proposalGenerator -MetadataPath $capture.MetadataPath -ExpectedMetadataSha256 $metadataSha -ExpectedResponseSha256 $capture.artifacts.responseSha256 -ExpectedModelId fixture-model -ExpectedModelDigest $modelDigest -CreatedAt ([datetimeoffset]'2026-09-06T12:00:00Z') -AllowedEvidenceRoot $evidenceRoot -OutputPath $proposalPath -AcceptUnverifiedModelDigest -AllowFixtureEvidence
    Assert-True ($proposalPreview.State -eq 'PREVIEW' -and -not $proposalPreview.WritePerformed -and -not(Test-Path -LiteralPath $proposalPath)) 'Proposal preview performed a write.'
    Assert-True ($proposalPreview.ProposalSha256 -eq $proposalPreviewAgain.ProposalSha256 -and $proposalPreview.ProposalJson -ceq $proposalPreviewAgain.ProposalJson) 'Proposal generation was not deterministic.'
    $proposalWritten=& $proposalGenerator -MetadataPath $capture.MetadataPath -ExpectedMetadataSha256 $metadataSha -ExpectedResponseSha256 $capture.artifacts.responseSha256 -ExpectedModelId fixture-model -ExpectedModelDigest $modelDigest -CreatedAt ([datetimeoffset]'2026-09-06T12:00:00Z') -AllowedEvidenceRoot $evidenceRoot -OutputPath $proposalPath -AcceptUnverifiedModelDigest -AllowFixtureEvidence -Write
    $proposalSha=$proposalWritten.ProposalSha256
    $approvalPath=Join-Path $evidenceRoot 'approval.json'
    $approvalPreview=& $approvalGenerator -ProposalPath $proposalPath -ExpectedProposalSha256 $proposalSha -AllowedRoot $allowedRoot -CreatedAt ([datetimeoffset]'2026-09-06T12:01:00Z') -ExpiresAt ([datetimeoffset]'2026-09-06T12:15:00Z') -AllowedEvidenceRoot $evidenceRoot -OutputPath $approvalPath
    Assert-True ($approvalPreview.State -eq 'PREVIEW' -and -not $approvalPreview.WritePerformed -and -not(Test-Path -LiteralPath $approvalPath)) 'Approval preview performed a write.'
    $approvalWritten=& $approvalGenerator -ProposalPath $proposalPath -ExpectedProposalSha256 $proposalSha -AllowedRoot $allowedRoot -CreatedAt ([datetimeoffset]'2026-09-06T12:01:00Z') -ExpiresAt ([datetimeoffset]'2026-09-06T12:15:00Z') -AllowedEvidenceRoot $evidenceRoot -OutputPath $approvalPath -Approve
    $approvalSha=$approvalWritten.ApprovalSha256

    $ready=Resolve-Chain -ProposalPath $proposalPath -ProposalSha256 $proposalSha -ApprovalPath $approvalPath -ApprovalSha256 $approvalSha -AllowedRoot $allowedRoot
    Assert-True ($ready.State -eq 'READY' -and $ready.Eligible -and -not $ready.ExecutionPerformed) "Valid evidence did not produce READY: $($ready|ConvertTo-Json -Compress)."
    Assert-GatesExactly -Result $ready -Expected @() -Message 'READY gates changed.'

    $preview=& $executor -ProposalPath $proposalPath -ExpectedProposalSha256 $proposalSha -ApprovalPath $approvalPath -ExpectedApprovalSha256 $approvalSha -AllowedRoot $allowedRoot -ReferenceTimeUtc $referenceTime -AllowedEvidenceRoot $evidenceRoot -OutputDirectory $outputDirectory -NoThrow
    Assert-True ($preview.State -eq 'READY' -and -not $preview.ExecutionPerformed -and @(Get-ChildItem -LiteralPath $outputDirectory).Count -eq 0) 'Preview performed an effect.'
    $outsidePreview=& $executor -ProposalPath $proposalPath -ExpectedProposalSha256 $proposalSha -ApprovalPath $approvalPath -ExpectedApprovalSha256 $approvalSha -AllowedRoot $allowedRoot -ReferenceTimeUtc $referenceTime -AllowedEvidenceRoot $evidenceRoot -OutputDirectory (Join-Path $tempRoot 'outside-evidence') -NoThrow
    Assert-GatesExactly -Result $outsidePreview -Expected @('OutputDirectoryWithinEvidenceRoot') -Message 'Evidence-root escape gate changed.'

    $executed=& $executor -ProposalPath $proposalPath -ExpectedProposalSha256 $proposalSha -ApprovalPath $approvalPath -ExpectedApprovalSha256 $approvalSha -AllowedRoot $allowedRoot -ReferenceTimeUtc $referenceTime -AllowedEvidenceRoot $evidenceRoot -OutputDirectory $outputDirectory -Execute
    Assert-True ($executed.State -eq 'SUCCEEDED' -and $executed.ExecutionPerformed -and -not $executed.TargetWritePerformed -and -not $executed.NetworkPerformed -and -not $executed.ProcessPerformed -and -not $executed.TransportPerformed) 'Execution effects were reported incorrectly.'
    Assert-True ([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($executed.SlicePath)) -ceq '23456') 'Bounded slice content changed.'
    Assert-True ((Get-Sha256 -LiteralPath $targetPath) -eq (Get-Content -LiteralPath $approvalPath -Raw|ConvertFrom-Json).target.sha256) 'The approved target was mutated.'
    $observed=Resolve-Chain -ProposalPath $proposalPath -ProposalSha256 $proposalSha -ApprovalPath $approvalPath -ApprovalSha256 $approvalSha -AllowedRoot $allowedRoot -ObservationPath $executed.ObservationPath -ObservationSha256 $executed.ObservationSha256 -AllowedEvidenceRoot $evidenceRoot
    Assert-True ($observed.State -eq 'SUCCEEDED' -and $observed.Eligible -and -not $observed.ExecutionPerformed) 'Valid observation did not resolve to SUCCEEDED.'
    $missingEvidenceRoot=Resolve-Chain -ProposalPath $proposalPath -ProposalSha256 $proposalSha -ApprovalPath $approvalPath -ApprovalSha256 $approvalSha -AllowedRoot $allowedRoot -ObservationPath $executed.ObservationPath -ObservationSha256 $executed.ObservationSha256
    Assert-True ($missingEvidenceRoot.State -eq 'UNKNOWN') 'Missing evidence root was not UNKNOWN.';Assert-GatesExactly -Result $missingEvidenceRoot -Expected @('AllowedEvidenceRootPresent') -Message 'Missing evidence-root gate changed.'

    $missing=Resolve-Chain -ProposalPath $proposalPath -ProposalSha256 $proposalSha -ApprovalPath (Join-Path $tempRoot 'missing.json') -ApprovalSha256 ('c'*64) -AllowedRoot $allowedRoot
    Assert-True ($missing.State -eq 'UNKNOWN') 'Missing approval was not UNKNOWN.';Assert-GatesExactly -Result $missing -Expected @('ApprovalPresent') -Message 'Missing approval gate changed.'
    $wrongHash=Resolve-Chain -ProposalPath $proposalPath -ProposalSha256 ('d'*64) -ApprovalPath $approvalPath -ApprovalSha256 $approvalSha -AllowedRoot $allowedRoot
    Assert-True ($wrongHash.State -eq 'CONFLICT') 'Proposal hash drift was not CONFLICT.';Assert-GatesExactly -Result $wrongHash -Expected @('ProposalSha256') -Message 'Proposal hash gate changed.'

    $staleProposalPath=Join-Path $tempRoot 'stale-proposal.json';$staleProposalSha=Write-ProposalFixture -LiteralPath $staleProposalPath -TargetPath $targetPath -CreatedAt '2026-09-06T10:00:00Z'
    $staleApprovalPath=Join-Path $tempRoot 'stale-approval.json';$staleApprovalSha=Write-ApprovalFixture -LiteralPath $staleApprovalPath -ProposalSha256 $staleProposalSha -AllowedRoot $allowedRoot -TargetPath $targetPath
    $stale=Resolve-Chain -ProposalPath $staleProposalPath -ProposalSha256 $staleProposalSha -ApprovalPath $staleApprovalPath -ApprovalSha256 $staleApprovalSha -AllowedRoot $allowedRoot
    Assert-True ($stale.State -eq 'UNKNOWN') 'Stale proposal was not UNKNOWN.';Assert-GatesExactly -Result $stale -Expected @('ProposalFreshness') -Message 'Stale proposal gate changed.'

    $expiredApprovalPath=Join-Path $tempRoot 'expired-approval.json';$expiredApprovalSha=Write-ApprovalFixture -LiteralPath $expiredApprovalPath -ProposalSha256 $proposalSha -AllowedRoot $allowedRoot -TargetPath $targetPath -ExpiresAt '2026-09-06T12:04:00Z'
    $expired=Resolve-Chain -ProposalPath $proposalPath -ProposalSha256 $proposalSha -ApprovalPath $expiredApprovalPath -ApprovalSha256 $expiredApprovalSha -AllowedRoot $allowedRoot
    Assert-True ($expired.State -eq 'UNKNOWN') 'Expired approval was not UNKNOWN.';Assert-GatesExactly -Result $expired -Expected @('ApprovalFreshness') -Message 'Expired approval gate changed.'

    $futureApprovalPath=Join-Path $tempRoot 'future-approval.json';$futureApprovalSha=Write-ApprovalFixture -LiteralPath $futureApprovalPath -ProposalSha256 $proposalSha -AllowedRoot $allowedRoot -TargetPath $targetPath -CreatedAt '2026-09-06T12:10:00Z' -ExpiresAt '2026-09-06T12:15:00Z'
    $futureApproval=Resolve-Chain -ProposalPath $proposalPath -ProposalSha256 $proposalSha -ApprovalPath $futureApprovalPath -ApprovalSha256 $futureApprovalSha -AllowedRoot $allowedRoot
    Assert-True ($futureApproval.State -eq 'UNKNOWN') 'Future approval was not UNKNOWN.';Assert-GatesExactly -Result $futureApproval -Expected @('ApprovalFreshness') -Message 'Future approval gate changed.'

    $preProposalApprovalPath=Join-Path $tempRoot 'pre-proposal-approval.json';$preProposalApprovalSha=Write-ApprovalFixture -LiteralPath $preProposalApprovalPath -ProposalSha256 $proposalSha -AllowedRoot $allowedRoot -TargetPath $targetPath -CreatedAt '2026-09-06T11:59:00Z' -ExpiresAt '2026-09-06T12:15:00Z'
    $preProposalApproval=Resolve-Chain -ProposalPath $proposalPath -ProposalSha256 $proposalSha -ApprovalPath $preProposalApprovalPath -ApprovalSha256 $preProposalApprovalSha -AllowedRoot $allowedRoot
    Assert-True ($preProposalApproval.State -eq 'UNKNOWN') 'Approval before proposal was not UNKNOWN.';Assert-GatesExactly -Result $preProposalApproval -Expected @('ApprovalFreshness') -Message 'Pre-proposal approval gate changed.'

    $outsidePath=Join-Path $tempRoot 'outside.txt';[IO.File]::WriteAllText($outsidePath,'outside',$utf8)
    $outsideProposalPath=Join-Path $tempRoot 'outside-proposal.json';$outsideProposalSha=Write-ProposalFixture -LiteralPath $outsideProposalPath -TargetPath $outsidePath
    $outsideApprovalPath=Join-Path $tempRoot 'outside-approval.json';$outsideApprovalSha=Write-ApprovalFixture -LiteralPath $outsideApprovalPath -ProposalSha256 $outsideProposalSha -AllowedRoot $allowedRoot -TargetPath $outsidePath
    $outside=Resolve-Chain -ProposalPath $outsideProposalPath -ProposalSha256 $outsideProposalSha -ApprovalPath $outsideApprovalPath -ApprovalSha256 $outsideApprovalSha -AllowedRoot $allowedRoot
    Assert-True ($outside.State -eq 'CONFLICT') 'Root escape was not CONFLICT.';Assert-GatesExactly -Result $outside -Expected @('TargetWithinRoot') -Message 'Root escape gate changed.'

    $bindingApprovalPath=Join-Path $tempRoot 'binding-approval.json';$bindingApprovalSha=Write-ApprovalFixture -LiteralPath $bindingApprovalPath -ProposalSha256 ('e'*64) -AllowedRoot $allowedRoot -TargetPath $targetPath
    $binding=Resolve-Chain -ProposalPath $proposalPath -ProposalSha256 $proposalSha -ApprovalPath $bindingApprovalPath -ApprovalSha256 $bindingApprovalSha -AllowedRoot $allowedRoot
    Assert-True ($binding.State -eq 'CONFLICT') 'Approval binding mismatch was not CONFLICT.';Assert-GatesExactly -Result $binding -Expected @('ApprovalProposalBinding') -Message 'Approval binding gate changed.'

    $driftTargetPath=Join-Path $allowedRoot 'drift.txt';[IO.File]::WriteAllText($driftTargetPath,'before',$utf8)
    $driftProposalPath=Join-Path $tempRoot 'drift-proposal.json';$driftProposalSha=Write-ProposalFixture -LiteralPath $driftProposalPath -TargetPath $driftTargetPath
    $driftApprovalPath=Join-Path $tempRoot 'drift-approval.json';$driftApprovalSha=Write-ApprovalFixture -LiteralPath $driftApprovalPath -ProposalSha256 $driftProposalSha -AllowedRoot $allowedRoot -TargetPath $driftTargetPath
    [IO.File]::WriteAllText($driftTargetPath,'after',$utf8)
    $drift=Resolve-Chain -ProposalPath $driftProposalPath -ProposalSha256 $driftProposalSha -ApprovalPath $driftApprovalPath -ApprovalSha256 $driftApprovalSha -AllowedRoot $allowedRoot
    Assert-True ($drift.State -eq 'CONFLICT') 'Target drift was not CONFLICT.';Assert-GatesExactly -Result $drift -Expected @('TargetEvidence') -Message 'Target drift gate changed.'

    $reparseTarget=Join-Path $tempRoot 'reparse-target';New-Item -ItemType Directory -Path $reparseTarget | Out-Null
    $reparseFile=Join-Path $reparseTarget 'linked.txt';[IO.File]::WriteAllText($reparseFile,'linked',$utf8)
    $reparseLink=Join-Path $allowedRoot 'linked';New-Item -ItemType Junction -Path $reparseLink -Target $reparseTarget | Out-Null
    $linkedPath=Join-Path $reparseLink 'linked.txt';$reparseProposalPath=Join-Path $tempRoot 'reparse-proposal.json';$reparseProposalSha=Write-ProposalFixture -LiteralPath $reparseProposalPath -TargetPath $linkedPath
    $reparseApprovalPath=Join-Path $tempRoot 'reparse-approval.json';$reparseApprovalSha=Write-ApprovalFixture -LiteralPath $reparseApprovalPath -ProposalSha256 $reparseProposalSha -AllowedRoot $allowedRoot -TargetPath $linkedPath
    $reparse=Resolve-Chain -ProposalPath $reparseProposalPath -ProposalSha256 $reparseProposalSha -ApprovalPath $reparseApprovalPath -ApprovalSha256 $reparseApprovalSha -AllowedRoot $allowedRoot
    Assert-True ($reparse.State -eq 'CONFLICT') 'Reparse target was not CONFLICT.';Assert-GatesExactly -Result $reparse -Expected @('TargetReparseSafe') -Message 'Reparse target gate changed.'

    $tamperedObservation=Get-Content -LiteralPath $executed.ObservationPath -Raw|ConvertFrom-Json
    $tamperedObservation.effects.transportPerformed=$true
    $tamperedPath=Join-Path $tempRoot 'tampered-observation.json';Write-Json -LiteralPath $tamperedPath -Value $tamperedObservation;$tamperedSha=Get-Sha256 -LiteralPath $tamperedPath
    $tampered=Resolve-Chain -ProposalPath $proposalPath -ProposalSha256 $proposalSha -ApprovalPath $approvalPath -ApprovalSha256 $approvalSha -AllowedRoot $allowedRoot -ObservationPath $tamperedPath -ObservationSha256 $tamperedSha -AllowedEvidenceRoot $tempRoot
    Assert-True ($tampered.State -eq 'CONFLICT') 'Forbidden observation effect was not CONFLICT.';Assert-GatesExactly -Result $tampered -Expected @('ObservationEffects') -Message 'Observation effects gate changed.'
    $outsideSlicePath=Join-Path $tempRoot 'outside-slice.bin';[IO.File]::WriteAllBytes($outsideSlicePath,[byte[]](1,2,3))
    $outsideSliceObservation=Get-Content -LiteralPath $executed.ObservationPath -Raw|ConvertFrom-Json
    $outsideSliceObservation.slice.path=$outsideSlicePath;$outsideSliceObservation.slice.bytes=3;$outsideSliceObservation.slice.sha256=Get-Sha256 -LiteralPath $outsideSlicePath
    $outsideSliceObservationPath=Join-Path $evidenceRoot 'outside-slice-observation.json';Write-Json -LiteralPath $outsideSliceObservationPath -Value $outsideSliceObservation;$outsideSliceObservationSha=Get-Sha256 -LiteralPath $outsideSliceObservationPath
    $outsideSlice=Resolve-Chain -ProposalPath $proposalPath -ProposalSha256 $proposalSha -ApprovalPath $approvalPath -ApprovalSha256 $approvalSha -AllowedRoot $allowedRoot -ObservationPath $outsideSliceObservationPath -ObservationSha256 $outsideSliceObservationSha -AllowedEvidenceRoot $evidenceRoot
    Assert-True ($outsideSlice.State -eq 'CONFLICT') 'Outside slice was not CONFLICT.';Assert-GatesExactly -Result $outsideSlice -Expected @('SliceWithinEvidenceRoot') -Message 'Outside-slice gate changed.'
}finally{
    if(Test-Path -LiteralPath $tempRoot){Remove-Item -LiteralPath $tempRoot -Recurse -Force}
}
'PowerShell Workbench read-only tool contracts passed.'
```

## File: `Tests/Test-ScaffoldContracts.ps1`

```powershell
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot
$generator=Join-Path $pluginRoot 'scripts\New-PowerShellArtifact.ps1'
$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-scaffold-'+[guid]::NewGuid().ToString('N'))
try{
    New-Item -ItemType Directory -Path $tempRoot|Out-Null
    foreach($projectProfile in @('RecoveryToolkit','WingetDownloader')){
        $item=& $generator -Kind PesterContract -Name 'Fixture' -Destination $tempRoot -Profile $projectProfile -ProjectRoot $tempRoot -Confirm:$false
        if($item.Name -ne 'Test-Fixture.Contract.ps1'){throw "Profile $projectProfile generated a non-discoverable test name: $($item.Name)"}
        Remove-Item -LiteralPath $item.FullName -Force
    }
    $sourcePath=Join-Path $tempRoot 'Source.ps1'
    $templatePath=Join-Path $tempRoot 'fragments.json'
    $outputPath=Join-Path $tempRoot 'Composed.ps1'
    @'
function Get-Alpha {
    'alpha'
}

#region SharedBeta
function Get-Beta {
    'beta'
}
#endregion
'@ | Set-Content -LiteralPath $sourcePath -Encoding UTF8
    $fragmentGenerator=Join-Path $pluginRoot 'scripts\New-PowerShellWorkbenchFragmentTemplate.ps1'
    $composer=Join-Path $pluginRoot 'scripts\Join-PowerShellWorkbenchFragmentTemplate.ps1'
    $preview=& $fragmentGenerator -SourcePath $sourcePath -OutputPath $templatePath -ProjectRoot $tempRoot -FunctionName Get-Alpha -RegionName SharedBeta
    $previewItems=@($preview)
    if($previewItems.Count -ne 1 -or $preview.state -ne 'PREVIEW' -or $preview.writePerformed){throw "Fragment generator did not default to no-write preview. Count=$($previewItems.Count); State=$($preview.state -join ','); WritePerformed=$($preview.writePerformed -join ','); FailedGates=$($preview.failedGates -join ',')"}
    if(Test-Path -LiteralPath $templatePath){throw 'Fragment generator preview wrote a file.'}
    $written=& $fragmentGenerator -SourcePath $sourcePath -OutputPath $templatePath -ProjectRoot $tempRoot -FunctionName Get-Alpha -RegionName SharedBeta -Write
    if($written.state -ne 'SUCCEEDED' -or -not(Test-Path -LiteralPath $templatePath)){throw 'Fragment generator did not write the validated template.'}
    $composePreview=& $composer -TemplatePath $templatePath -OutputPath $outputPath -ProjectRoot $tempRoot
    $composePreviewItems=@($composePreview)
    if($composePreviewItems.Count -ne 1 -or $composePreview.state -ne 'PREVIEW' -or $composePreview.writePerformed){throw "Fragment composer did not default to no-write preview. Count=$($composePreviewItems.Count); State=$($composePreview.state -join ','); WritePerformed=$($composePreview.writePerformed -join ',')"}
    if(Test-Path -LiteralPath $outputPath){throw 'Fragment composer preview wrote a file.'}
    $composed=& $composer -TemplatePath $templatePath -OutputPath $outputPath -ProjectRoot $tempRoot -Write
    if($composed.state -ne 'SUCCEEDED' -or -not(Test-Path -LiteralPath $outputPath)){throw 'Fragment composer did not write the composed script.'}
    if($composed.executionPerformed -or $composed.transportPerformed){throw 'Fragment composer reported execution or transport.'}
    $tokens=$null;$errors=$null
    [void][Management.Automation.Language.Parser]::ParseFile($outputPath,[ref]$tokens,[ref]$errors)
    if(@($errors).Count -ne 0){throw 'Composed fragment script does not parse.'}
    $conflictSourcePath=Join-Path $tempRoot 'ConflictSource.ps1'
    $conflictTemplatePath=Join-Path $tempRoot 'conflict-fragments.json'
    @'
function Get-Alpha {
    'different'
}
'@ | Set-Content -LiteralPath $conflictSourcePath -Encoding UTF8
    $conflictTemplate=& $fragmentGenerator -SourcePath $conflictSourcePath -OutputPath $conflictTemplatePath -ProjectRoot $tempRoot -FunctionName Get-Alpha -Write
    if($conflictTemplate.state -ne 'SUCCEEDED'){throw 'Conflict fixture template was not written.'}
    $conflicted=& $composer -TemplatePath $templatePath,$conflictTemplatePath -OutputPath (Join-Path $tempRoot 'Conflicted.ps1') -ProjectRoot $tempRoot
    if($conflicted.state -ne 'BLOCKED' -or @($conflicted.failedGates) -notcontains 'DuplicateFragmentConflict'){throw 'Fragment composer did not fail closed on conflicting duplicate fragments.'}
    Add-Content -LiteralPath $sourcePath -Value '# drift'
    $drifted=& $composer -TemplatePath $templatePath -OutputPath (Join-Path $tempRoot 'Drifted.ps1') -ProjectRoot $tempRoot
    if($drifted.state -ne 'BLOCKED' -or @($drifted.failedGates) -notcontains 'SourceSha256'){throw 'Fragment composer did not fail closed on source drift.'}
    'PowerShell Workbench scaffold contracts passed.'
}finally{if(Test-Path -LiteralPath $tempRoot){Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue}}
```

## File: `Tests/Test-StatusDashboardContracts.ps1`

```powershell
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot;$dashboard=Join-Path $pluginRoot 'scripts\Get-PowerShellWorkbenchStatusDashboard.ps1';$utf8=New-Object Text.UTF8Encoding($false);$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-status-'+[guid]::NewGuid().ToString('N'))
function Assert-True{param([bool]$Condition,[string]$Message)if(-not$Condition){throw $Message}}
function Assert-GatesExactly{param($Result,[string[]]$Expected,[string]$Message)$actual=@($Result.FailedGates);if(($actual-join'|')-cne($Expected-join'|')){throw "$Message Expected [$($Expected-join', ')], got [$($actual-join', ')]."}}
function Write-Json{param([string]$LiteralPath,$Value)[IO.File]::WriteAllText($LiteralPath,($Value|ConvertTo-Json -Depth 10),$utf8)}
function Get-Sha{param([string]$LiteralPath)(Get-FileHash -LiteralPath $LiteralPath -Algorithm SHA256).Hash.ToLowerInvariant()}
function Initialize-Plugin{param([string]$Name)$root=Join-Path $tempRoot $Name;New-Item -ItemType Directory -Path (Join-Path $root '.codex-plugin'),(Join-Path $root 'scripts') -Force|Out-Null;Write-Json -LiteralPath (Join-Path $root '.codex-plugin\plugin.json') -Value ([ordered]@{name='powershell-workbench';version='0.7.9'});[IO.File]::WriteAllText((Join-Path $root 'scripts\fixture.ps1'),"'fixture'",$utf8);$root}
$tokens=$null;$errors=$null;$ast=[Management.Automation.Language.Parser]::ParseFile($dashboard,[ref]$tokens,[ref]$errors);Assert-True ($errors.Count-eq 0) 'Dashboard has parser errors.';$commands=@($ast.FindAll({param($node)$node-is[Management.Automation.Language.CommandAst]},$true)|ForEach-Object{$_.GetCommandName()}|Where-Object{$_});foreach($forbidden in @('Start-Process','Invoke-Expression','Invoke-RestMethod','Invoke-WebRequest','Set-Content','Add-Content','Out-File','Set-Clipboard','git','gh')){Assert-True ($commands-notcontains$forbidden) "Dashboard contains forbidden command $forbidden."}
try{
    New-Item -ItemType Directory -Path $tempRoot|Out-Null;$source=Initialize-Plugin source;$cache=Join-Path $tempRoot 'cache';Copy-Item -LiteralPath $source -Destination $cache -Recurse;$distribution=[pscustomobject]@{Name='personal';SourcePath=$source;CachePath=$cache}
    $health=& (Join-Path $pluginRoot 'scripts\Test-PowerShellWorkbenchHealth.ps1') -Distribution $distribution -ExpectedVersion '0.7.9' -NoThrow;$tree=$health.Distributions[0].SourceTreeSha256
    $provenancePath=Join-Path $tempRoot 'release.json';$provenance=[ordered]@{schemaVersion='1.0';pluginName='powershell-workbench';pluginVersion='0.7.9';commitSha='a'*40;sourceRef='feature/status-dashboard-provenance';sourceTreeSha256=$tree};Write-Json -LiteralPath $provenancePath -Value $provenance;$sha=Get-Sha $provenancePath
    $ready=&$dashboard -Distribution $distribution -ExpectedVersion '0.7.9' -ProvenancePath $provenancePath -ExpectedProvenanceSha256 $sha -AllowedProvenanceRoot $tempRoot -ReferenceTimeUtc ([datetimeoffset]'2026-09-06T10:30:00Z') -NoThrow
    Assert-True ($ready.State-eq'READY'-and$ready.Passed-and$ready.Stages.Declared-eq'DECLARED'-and$ready.Stages.Found-eq'FOUND'-and$ready.Stages.Validated-eq'VALIDATED') "Healthy release was not READY. State=$($ready.State); gates=$($ready.FailedGates-join', ')."
    Assert-True (-not$ready.WritePerformed-and-not$ready.ExecutionPerformed-and-not$ready.TransportPerformed) 'Dashboard reported an effect.'
    $json1=&$dashboard -Distribution $distribution -ExpectedVersion '0.7.9' -ProvenancePath $provenancePath -ExpectedProvenanceSha256 $sha -AllowedProvenanceRoot $tempRoot -ReferenceTimeUtc ([datetimeoffset]'2026-09-06T10:30:00Z') -NoThrow -AsJson;$json2=&$dashboard -Distribution $distribution -ExpectedVersion '0.7.9' -ProvenancePath $provenancePath -ExpectedProvenanceSha256 $sha -AllowedProvenanceRoot $tempRoot -ReferenceTimeUtc ([datetimeoffset]'2026-09-06T10:30:00Z') -NoThrow -AsJson;Assert-True (($json1-join"`n")-ceq($json2-join"`n")) 'Frozen dashboard JSON was not deterministic.'
    $hashDrift=&$dashboard -Distribution $distribution -ExpectedVersion '0.7.9' -ProvenancePath $provenancePath -ExpectedProvenanceSha256 ('f'*64) -AllowedProvenanceRoot $tempRoot -NoThrow;Assert-True ($hashDrift.State-eq'CONFLICT') 'Provenance hash drift was not CONFLICT.';Assert-GatesExactly -Result $hashDrift -Expected @('ReleaseProvenanceSha256') -Message 'Provenance hash gate changed.'
    $missingPath=Join-Path $tempRoot 'missing.json';$missing=&$dashboard -Distribution $distribution -ExpectedVersion '0.7.9' -ProvenancePath $missingPath -ExpectedProvenanceSha256 ('f'*64) -AllowedProvenanceRoot $tempRoot -NoThrow;Assert-True ($missing.State-eq'UNKNOWN') 'Missing provenance was not UNKNOWN.';Assert-GatesExactly -Result $missing -Expected @('ReleaseProvenancePresent') -Message 'Missing provenance gate changed.'
    $wrongVersion=($provenance|ConvertTo-Json -Depth 10|ConvertFrom-Json);$wrongVersion.pluginVersion='0.8.0';$wrongVersionPath=Join-Path $tempRoot 'wrong-version.json';Write-Json $wrongVersionPath $wrongVersion;$wrongVersionResult=&$dashboard -Distribution $distribution -ExpectedVersion '0.7.9' -ProvenancePath $wrongVersionPath -ExpectedProvenanceSha256 (Get-Sha $wrongVersionPath) -AllowedProvenanceRoot $tempRoot -NoThrow;Assert-GatesExactly -Result $wrongVersionResult -Expected @('ReleaseVersion') -Message 'Release version gate changed.'
    $outside=&$dashboard -Distribution $distribution -ExpectedVersion '0.7.9' -ProvenancePath $dashboard -ExpectedProvenanceSha256 (Get-Sha $dashboard) -AllowedProvenanceRoot $tempRoot -NoThrow;Assert-True ($outside.State-eq'CONFLICT') 'Outside provenance was not CONFLICT.';Assert-GatesExactly -Result $outside -Expected @('ReleaseProvenanceWithinRoot') -Message 'Outside-root gate changed.'
    $missingSource=&$dashboard -Distribution ([pscustomobject]@{Name='personal';SourcePath=(Join-Path $tempRoot 'absent');CachePath=$cache}) -ExpectedVersion '0.7.9' -ProvenancePath $provenancePath -ExpectedProvenanceSha256 $sha -AllowedProvenanceRoot $tempRoot -NoThrow;Assert-True ($missingSource.State-eq'UNKNOWN') 'Missing source was not UNKNOWN.';Assert-GatesExactly -Result $missingSource -Expected @('DistributionSourceExists') -Message 'Health gate propagation changed.'
    [IO.File]::WriteAllText((Join-Path $cache 'scripts\fixture.ps1'),"'drift'",$utf8);$treeDrift=&$dashboard -Distribution $distribution -ExpectedVersion '0.7.9' -ProvenancePath $provenancePath -ExpectedProvenanceSha256 $sha -AllowedProvenanceRoot $tempRoot -NoThrow;Assert-True ($treeDrift.State-eq'CONFLICT') 'Tree drift was not CONFLICT.';Assert-GatesExactly -Result $treeDrift -Expected @('DistributionTreeIdentity') -Message 'Tree drift gate changed.'
}finally{if(Test-Path -LiteralPath $tempRoot){Remove-Item -LiteralPath $tempRoot -Recurse -Force}}
'PowerShell Workbench status dashboard contracts passed.'
```

## File: `Tests/Test-TextIntegrityContracts.ps1`

```powershell
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot;$diagnostic=Join-Path $pluginRoot 'scripts\Get-PowerShellWorkbenchTextIntegrity.ps1';$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('powershell-workbench-text-integrity-'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path $tempRoot|Out-Null
function Assert-True{param([bool]$Condition,[string]$Message)if(-not $Condition){throw $Message}}
function Get-Snapshot{param([string]$Root)@((Get-ChildItem -LiteralPath $Root -Recurse -Force -File|ForEach-Object{"$($_.FullName)|$($_.Length)|$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)"})|Sort-Object)-join"`n"}
try{
    $lf=Join-Path $tempRoot 'lf.ps1';$crlf=Join-Path $tempRoot 'crlf.ps1';$bom=Join-Path $tempRoot 'bom.psm1';$invalid=Join-Path $tempRoot 'invalid.ps1';$ignored=Join-Path $tempRoot 'ignored.txt'
    [IO.File]::WriteAllText($lf,"function Test-Text {`n    'ok'`n}`n",(New-Object Text.UTF8Encoding($false)))
    [IO.File]::WriteAllText($crlf,"function Test-Text {`r`n    'ok'`r`n}`r`n",(New-Object Text.UTF8Encoding($false)))
    [IO.File]::WriteAllText($bom,"function Get-Bom {`r`n    'ok'`r`n}`r`n",(New-Object Text.UTF8Encoding($true)))
    [IO.File]::WriteAllBytes($invalid,[byte[]](0xff,0xfe,0xfd));Set-Content -LiteralPath $ignored -Value 'ignored' -Encoding UTF8
    [IO.File]::WriteAllText((Join-Path $tempRoot 'mixed.ps1'),"function Test-Mixed {`r`n    'one'`n}`r`n",(New-Object Text.UTF8Encoding($false)))
    $before=Get-Snapshot $tempRoot
    $lfResult=&$diagnostic -Path $lf -NoThrow
    Assert-True ($lfResult.Passed -and $lfResult.FileCount -eq 1 -and $lfResult.Files[0].Encoding -eq 'Utf8NoBom' -and $lfResult.Files[0].LineEndings.Style -eq 'LF') 'UTF-8 LF fixture was not classified correctly.'
    $crlfResult=&$diagnostic -Path $crlf -ExpectedNormalizedTextSha256 $lfResult.Files[0].NormalizedTextSha256 -NoThrow
    Assert-True ($crlfResult.Files[0].ComparisonState -eq 'BYTE_ONLY_DRIFT' -and $crlfResult.Files[0].LineEndings.Style -eq 'CRLF') 'CRLF byte-only drift was not distinguished from semantic drift.'
    $semantic=&$diagnostic -Path $crlf -ExpectedNormalizedTextSha256 ('0'*64) -NoThrow
    Assert-True ($semantic.Files[0].ComparisonState -eq 'SEMANTIC_DRIFT') 'Semantic drift was not reported.'
    $directory=&$diagnostic -Path $tempRoot -NoThrow
    Assert-True (-not $directory.Passed -and $directory.FileCount -eq 5 -and @($directory.Files.Path|Where-Object {$_ -eq 'ignored.txt'}).Count -eq 0) 'Directory extension filtering or fail-closed invalid-text handling failed.'
    Assert-True ((@($directory.Files|Where-Object {$_.Encoding -eq 'Utf8Bom'}).Count -eq 1)) 'UTF-8 BOM was not reported.'
    $encodingPolicy=&$diagnostic -Path $tempRoot -AllowedEncoding Utf8NoBom -NoThrow
    Assert-True (-not $encodingPolicy.Passed -and $encodingPolicy.FailedGates -contains 'EncodingPolicy') 'Encoding policy did not fail closed for UTF-8 BOM content.'
    $lineEndingPolicy=&$diagnostic -Path $tempRoot -AllowedLineEnding LF -NoThrow
    Assert-True (-not $lineEndingPolicy.Passed -and $lineEndingPolicy.FailedGates -contains 'LineEndingPolicy') 'Line ending policy did not fail closed for CRLF content.'
    $mixedPolicy=&$diagnostic -Path $tempRoot -DisallowMixedLineEndings -NoThrow
    Assert-True (-not $mixedPolicy.Passed -and $mixedPolicy.FailedGates -contains 'MixedLineEndingsPolicy') 'Mixed line endings did not fail the explicit policy gate.'
    $bad=&$diagnostic -Path $invalid -NoThrow
    Assert-True (-not $bad.Passed -and @($bad.FailedGates) -eq 'TextSnapshotReadable' -and $bad.Files[0].ComparisonState -eq 'UNKNOWN') 'Invalid UTF-8 did not fail closed.'
    $json=&$diagnostic -Path $lf -AsJson -NoThrow|ConvertFrom-Json
    Assert-True ($json.SchemaVersion -eq '1.0' -and $null -ne $json.Policy -and -not $json.WritePerformed -and -not $json.NetworkPerformed -and -not $json.TransportPerformed) 'JSON/no-execution contract failed.'
    Assert-True ((Get-Snapshot $tempRoot) -ceq $before) 'Read-only text diagnostic changed a fixture.'
    'PowerShell Workbench text integrity contracts passed.'
}finally{Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue}
```

## File: `Tests/test_workbench_components.py`

```python
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

WORKER = Path(__file__).resolve().parent.parent / 'scripts' / 'workbench_components.py'
spec = importlib.util.spec_from_file_location('worker', WORKER)
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)

class ComponentContracts(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.archive = self.root / 'archive'
        self.source = self.root / 'fixture.py'
        self.source.write_text('def meaning():\n    return 42\n')
        self.contract = dict(inputs=[], outputs=[], bindings=[], effects=[], unresolved=[], reviewed=True)

    def tearDown(self):
        self.temp.cleanup()

    def register(self, **kwargs):
        return w.register(self.archive, self.source, 'python', 'Return a number', 'function', self.contract, **kwargs)

    def test_python_valid_and_invalid(self):
        self.assertEqual('PASSED', w.parse('python', b'x = 1')['state'])
        self.assertEqual('FAILED', w.parse('python', b'def (')['state'])

    def test_python_body_not_executed(self):
        marker = self.root / 'must-not-exist'
        source = ('from pathlib import Path\nPath(' + repr(str(marker)) + ').touch()\n').encode()
        self.assertEqual('PASSED', w.parse('python', source)['state'])
        self.assertFalse(marker.exists())

    def test_json_strict(self):
        for data in (b'{"a":1,"a":2}', b'{"a":NaN}', b'{'):
            self.assertEqual('FAILED', w.parse('json', data)['state'])
        self.assertEqual('PASSED', w.parse('json', b'{"a":1}')['state'])

    def test_xml_rejects_dtd_and_entities(self):
        for data in (b'<!DOCTYPE a [<!ENTITY b "payload">]><a>&b;</a>',
                     '<!DOCTYPE a><a/>'.encode('utf-16')):
            self.assertEqual('FAILED', w.parse('xml', data)['state'])

    def test_xml_wellformed_and_invalid(self):
        self.assertEqual('PASSED', w.parse('xml', b'<a xmlns="urn:test"/>')['state'])
        self.assertEqual('FAILED', w.parse('xml', b'<a>')['state'])

    def test_batch_cmd_do_not_use_shell(self):
        with patch.object(w.subprocess, 'run', side_effect=AssertionError('Must not run')):
            for language in ('batch', 'cmd'):
                self.assertEqual('UNAVAILABLE', w.parse(language, b'del example')['state'])

    def test_missing_runtime_fails_closed(self):
        with patch.object(w.shutil, 'which', return_value=None):
            for language in ('powershell', 'lua', 'javascript'):
                self.assertEqual('UNAVAILABLE', w.parse(language, b'example')['state'])

    def test_adapter_ids_unique_stable(self):
        ids = [w.adapter_id(language) for language in w.LANGUAGES]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(ids[0], w.adapter_id(w.LANGUAGES[0]))

    def test_registered_snapshot_and_gate(self):
        record = self.register()
        report = w.gate(self.archive, record['componentId'], record['version'], self.source)
        self.assertTrue(report['passed'])
        self.assertFalse(report['executionAuthorized'])
        self.assertFalse(report['sourceExecutionPerformed'])

    def test_mutation_of_execution_source_blocks(self):
        record = self.register()
        self.source.write_text('print("changed")')
        report = w.gate(self.archive, record['componentId'], record['version'], self.source)
        self.assertFalse(report['passed'])

    def test_snapshot_tampering_rejected(self):
        record = self.register()
        target = w.location(self.archive, record['componentId'], record['version'])
        (target / record['entryPoint']).write_text('changed')
        with self.assertRaisesRegex(ValueError, 'hash mismatch'):
            w.gate(self.archive, record['componentId'], record['version'])

    def test_immutable_versions_and_new_revision(self):
        record = self.register()
        with self.assertRaisesRegex(ValueError, 'already exists'):
            self.register(component_id=record['componentId'])
        revised = self.register(component_id=record['componentId'], version='1.0.1')
        self.assertEqual(record['componentId'], revised['componentId'])

    def test_unreviewed_or_unresolved_blocks(self):
        self.contract['reviewed'] = False
        record = self.register()
        self.assertFalse(w.gate(self.archive, record['componentId'], record['version'])['passed'])
        self.contract['reviewed'] = True
        self.contract['unresolved'] = ['caller state unknown']
        record = self.register()
        self.assertFalse(w.gate(self.archive, record['componentId'], record['version'])['passed'])

    def test_dependency_pins_and_missing(self):
        child = self.register()
        pin = dict(componentId=child['componentId'], version=child['version'], sha256=child['sha256'])
        parent = self.register(dependencies=[pin])
        self.assertTrue(w.gate(self.archive, parent['componentId'], parent['version'])['passed'])
        pin['sha256'] = '0' * 64
        parent = self.register(dependencies=[pin])
        with self.assertRaisesRegex(ValueError, 'pin mismatch'):
            w.gate(self.archive, parent['componentId'], parent['version'])
        pin['componentId'] = str(w.uuid.uuid4())
        parent = self.register(dependencies=[pin])
        with self.assertRaises(ValueError):
            w.gate(self.archive, parent['componentId'], parent['version'])

    def test_cycle_rejected(self):
        record = self.register()
        target = w.location(self.archive, record['componentId'], record['version']) / 'component.json'
        record['dependencies'] = [dict(componentId=record['componentId'], version=record['version'], sha256=record['sha256'])]
        target.write_text(json.dumps(record))
        with self.assertRaisesRegex(ValueError, 'Cyclic'):
            w.gate(self.archive, record['componentId'], record['version'])

    def test_path_escape_rejected(self):
        with self.assertRaises(ValueError):
            w.location(self.archive, '../escape', '1.0.0')
        record = self.register()
        target = w.location(self.archive, record['componentId'], record['version']) / 'component.json'
        record['entryPoint'] = '../escape.py'
        target.write_text(json.dumps(record))
        with self.assertRaisesRegex(ValueError, 'contained'):
            w.load(self.archive, record['componentId'], record['version'])

    def test_lock_prevents_competing_registration(self):
        self.archive.mkdir()
        (self.archive / '.registration-lock').mkdir()
        with self.assertRaisesRegex(ValueError, 'locked'):
            self.register()

    def test_search_does_not_create_archive(self):
        self.assertEqual([], w.search(self.archive, 'number'))
        self.assertFalse(self.archive.exists())
        record = self.register()
        self.assertEqual(record['componentId'], w.search(self.archive, 'number')[0]['componentId'])

    def test_contract_type_validation(self):
        self.contract['reviewed'] = 'true'
        with self.assertRaisesRegex(ValueError, 'boolean'):
            self.register()

    def test_lineage_requires_exact_pins(self):
        with self.assertRaisesRegex(ValueError, 'arrays'):
            self.register(derived_from={'componentId': 'not-a-pin'})

    def test_packaged_parser_catalog_matches_sources(self):
        root = WORKER.parent.parent
        catalog = json.loads((root / 'assets' / 'component-parser-catalog.json').read_text())
        seen = set()
        for entry in catalog['components']:
            self.assertNotIn(entry['componentId'], seen)
            seen.add(entry['componentId'])
            if 'entryPoint' in entry:
                self.assertEqual(entry['sha256'], w.digest((root / entry['entryPoint']).read_bytes()))
            else:
                self.assertEqual('reserved-unavailable', entry['status'])

    def test_javascript_body_not_executed(self):
        if not w.shutil.which('node'):
            self.skipTest('Node unavailable')
        marker = self.root / 'node-must-not-exist'
        code = ('require("fs").writeFileSync(' + json.dumps(str(marker)) + ', "bad");').encode()
        self.assertEqual('PASSED', w.parse('javascript', code, '.cjs')['state'])
        self.assertFalse(marker.exists())
        self.assertEqual('FAILED', w.parse('javascript', b'function {', '.cjs')['state'])

if __name__ == '__main__':
    unittest.main()
```
