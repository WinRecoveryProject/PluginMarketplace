# Plugin files: powershell-workbench — `scripts/` (part 2 of 2)

Source: `plugins/powershell-workbench`. Files outside the `skills/*` folders, embedded as text.

## File: `scripts/Test-PowerShellWorkbenchCodexEvidence.ps1`

```powershell
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$MetadataPath,
    [Parameter(Mandatory)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedExecutableSha256,
    [string]$JsonlPath,
    [ValidateRange(0, 100000)][int]$MinimumSuccessfulToolCalls = 0,
    [AllowEmptyString()][string]$ExpectedFinalText,
    [switch]$RequireExactFinalText,
    [switch]$FailOnToolRetry,
    [switch]$AllowRemoteEndpointEvidence,
    [switch]$AcceptUnverifiedRuntimeDeclarations,
    [Parameter(Mandatory)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedMetadataSha256,
    [ValidateRange(1024, 10485760)][long]$MaxMetadataBytes = 1048576,
    [ValidateRange(1024, 1073741824)][long]$MaxJsonlBytes = 52428800,
    [ValidateRange(1024, 1073741824)][long]$MaxStderrBytes = 10485760,
    [ValidateRange(2048, 2147483648)][long]$MaxTotalArtifactBytes = 62914560,
    [ValidateRange(256, 10485760)][int]$MaxLineCharacters = 1048576,
    [ValidateRange(1, 1000000)][int]$MaxEvents = 100000,
    [ValidateRange(1, 10000)][int]$MaxFailures = 100,
    [string[]]$AllowedStderrRegex = @(),
    [string[]]$AllowedAdvisoryRegex = @(),
    [string]$ExpectedCodexVersion,
    [string]$ExpectedModelId,
    [string]$ExpectedModelDigest,
    [ValidateRange(1,1048576)][int64]$ExpectedEffectiveContext,
    [ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedCatalogSha256,
    [switch]$NoThrow,
    [switch]$AsJson
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$script:MaximumFailures = $MaxFailures
function Get-PropertyValue { param($Object,[string]$Name,$Default=$null) if($null -eq $Object){return $Default};$p=$Object.PSObject.Properties[$Name];if($null -eq $p){return $Default};$p.Value }
function Get-LowerHash { param([string]$Path) (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Add-Failure { param([string]$Message) if($script:failures.Count -lt $script:MaximumFailures){$script:failures.Add($Message)} }
function Test-AllowedAdvisory {
    param([string]$EventType,$Item,[string]$Status,[string[]]$Patterns)
    if($Patterns.Count -eq 0 -or $EventType -ne 'item.completed' -or [string](Get-PropertyValue -Object $Item -Name 'type') -ne 'error'){return $false}
    if($Status -and $Status -notin @('completed','success','succeeded')){return $false}
    if($null -ne (Get-PropertyValue -Object $Item -Name 'error')){return $false}
    $text=[string](Get-PropertyValue -Object $Item -Name 'text' -Default (Get-PropertyValue -Object $Item -Name 'message'))
    if([string]::IsNullOrWhiteSpace($text) -or $text -match '(?i)\b(?:tool|policy|approval|schema|turn)\b'){return $false}
    foreach($pattern in $Patterns){
        try{if($text -match $pattern){return $true}}
        catch{Add-Failure "AllowedAdvisoryRegex is invalid: $pattern";return $false}
    }
    return $false
}
function Test-JsonNesting {
    param([Parameter(Mandatory)][string]$Text,[ValidateRange(1,256)][int]$MaximumDepth=64)
    $depth=0;$quoted=$false;$escaped=$false
    foreach($character in $Text.ToCharArray()){
        if($escaped){$escaped=$false;continue}
        if($quoted -and $character -eq '\'){$escaped=$true;continue}
        if($character -eq '"'){$quoted=-not $quoted;continue}
        if(-not $quoted -and $character -in @('{','[')){$depth++;if($depth -gt $MaximumDepth){return $false}}
        elseif(-not $quoted -and $character -in @('}',']')){$depth--;if($depth -lt 0){return $false}}
    }
    return $depth -eq 0 -and -not $quoted -and -not $escaped
}

$failures = New-Object System.Collections.Generic.List[string]
$metadataPathResolved = (Resolve-Path -LiteralPath $MetadataPath).Path
if((Get-Item -LiteralPath $metadataPathResolved).Length -gt $MaxMetadataBytes){throw 'Metadata exceeds MaxMetadataBytes.'}
$metadataText=[IO.File]::ReadAllText($metadataPathResolved)
if(-not (Test-JsonNesting -Text $metadataText)){throw 'Metadata JSON exceeds the nesting limit or is structurally incomplete.'}
try{$metadata=$metadataText|ConvertFrom-Json}catch{throw "Metadata is invalid JSON: $($_.Exception.Message)"}
if((Get-LowerHash $metadataPathResolved) -ne $ExpectedMetadataSha256.ToLowerInvariant()){Add-Failure 'Metadata SHA256 does not match the expected out-of-band digest.'}
if((Get-PropertyValue -Object $metadata -Name 'schemaVersion') -ne '2.0'){Add-Failure 'metadata.schemaVersion must be 2.0.'}
if((Get-PropertyValue -Object $metadata -Name 'timedOut' -Default $true) -ne $false){Add-Failure 'The process timed out.'}
if((Get-PropertyValue -Object $metadata -Name 'outputLimitExceeded' -Default $true) -ne $false){Add-Failure 'The process exceeded an output limit.'}
if((Get-PropertyValue -Object $metadata -Name 'captureStatus') -ne 'Completed'){Add-Failure 'Capture status is not Completed.'}
if((Get-PropertyValue -Object $metadata -Name 'processExitCode' -Default -1) -ne 0){Add-Failure 'Process exit code is not zero.'}

$launch=Get-PropertyValue -Object $metadata -Name 'launch'
$executablePath=[string](Get-PropertyValue -Object $launch -Name 'executablePath')
if(-not $executablePath -or -not(Test-Path -LiteralPath $executablePath -PathType Leaf)){Add-Failure 'Recorded executable is unavailable.'}
else{
    $observedExecutableHash=Get-LowerHash $executablePath
    if($observedExecutableHash -ne ([string](Get-PropertyValue -Object $launch -Name 'executableSha256')).ToLowerInvariant()){Add-Failure 'Executable changed after capture.'}
    if($observedExecutableHash -ne $ExpectedExecutableSha256.ToLowerInvariant()){Add-Failure 'Executable does not match the independently expected SHA256.'}
}
$recordedCodexVersion=[string](Get-PropertyValue -Object $launch -Name 'codexVersion')
if($ExpectedCodexVersion -and $recordedCodexVersion -cne $ExpectedCodexVersion){Add-Failure 'Recorded Codex version does not match ExpectedCodexVersion.'}
$declarations=Get-PropertyValue -Object $metadata -Name 'declarations'
if((Get-PropertyValue -Object $declarations -Name 'attestation') -ne 'unverified-caller-declaration'){Add-Failure 'Runtime declaration state is missing or unknown.'}
if(-not $AcceptUnverifiedRuntimeDeclarations){Add-Failure 'Runtime model/provider/context declarations are not independently attested.'}
$provider=Get-PropertyValue -Object $declarations -Name 'provider'
$recordedModel=Get-PropertyValue -Object $declarations -Name 'model'
$recordedRuntime=Get-PropertyValue -Object $declarations -Name 'runtime'
if($ExpectedModelId -and [string](Get-PropertyValue -Object $recordedModel -Name 'id') -cne $ExpectedModelId){Add-Failure 'Recorded model id does not match ExpectedModelId.'}
if($ExpectedModelDigest -and [string](Get-PropertyValue -Object $recordedModel -Name 'digest') -cne $ExpectedModelDigest){Add-Failure 'Recorded model digest does not match ExpectedModelDigest.'}
if($ExpectedEffectiveContext -and [int64](Get-PropertyValue -Object $recordedRuntime -Name 'effectiveContext' -Default 0) -ne $ExpectedEffectiveContext){Add-Failure 'Recorded effective context does not match ExpectedEffectiveContext.'}
$recordedCatalog=Get-PropertyValue -Object $declarations -Name 'catalog'
if($ExpectedCatalogSha256){
    if($null -eq $recordedCatalog -or [string](Get-PropertyValue -Object $recordedCatalog -Name 'catalogSha256') -ine $ExpectedCatalogSha256){Add-Failure 'Recorded catalog SHA256 does not match ExpectedCatalogSha256.'}
}
$providerEndpoint=[string](Get-PropertyValue -Object $provider -Name 'endpoint')
$derivedLoopback=$false
try{$providerUri=[uri]$providerEndpoint;$derivedLoopback=$providerUri.DnsSafeHost.ToLowerInvariant() -in @('localhost','127.0.0.1','::1','[::1]')}catch{Add-Failure 'Declared provider endpoint is not a valid URI.'}
if(-not $AllowRemoteEndpointEvidence -and -not $derivedLoopback){Add-Failure 'Provider endpoint is not loopback.'}

$artifacts=Get-PropertyValue -Object $metadata -Name 'artifacts'
$totalArtifactBytes=[long]0
$recordedJsonl=[string](Get-PropertyValue -Object $artifacts -Name 'stdoutJsonl')
if(-not $JsonlPath){$JsonlPath=$recordedJsonl}
if($JsonlPath -and $recordedJsonl -and [IO.Path]::GetFullPath($JsonlPath) -ne [IO.Path]::GetFullPath($recordedJsonl)){Add-Failure 'JsonlPath does not match the captured artifact path.'}
foreach($artifactName in @('stdout','stderr')){
    $pathProperty=if($artifactName -eq 'stdout'){'stdoutJsonl'}else{'stderr'}
    $path=[string](Get-PropertyValue -Object $artifacts -Name $pathProperty)
    if(-not $path -or -not(Test-Path -LiteralPath $path -PathType Leaf)){Add-Failure "$artifactName artifact is missing.";continue}
    $actualBytes=[long](Get-Item -LiteralPath $path).Length
    $artifactLimit=if($artifactName -eq 'stdout'){$MaxJsonlBytes}else{$MaxStderrBytes}
    if($actualBytes -gt $artifactLimit){Add-Failure "$artifactName artifact exceeds its validator-side byte limit.";continue}
    $totalArtifactBytes+=$actualBytes
    $expectedHash=[string](Get-PropertyValue -Object $artifacts -Name ($artifactName+'Sha256'))
    $expectedBytes=[long](Get-PropertyValue -Object $artifacts -Name ($artifactName+'Bytes') -Default -1)
    if($actualBytes -ne $expectedBytes){Add-Failure "$artifactName byte length does not match metadata."}
    if(-not $expectedHash -or (Get-LowerHash $path) -ne $expectedHash.ToLowerInvariant()){Add-Failure "$artifactName SHA256 does not match metadata."}
    if($artifactName -eq 'stderr'){
        $stderrLineNumber=0
        foreach($stderrLine in [IO.File]::ReadLines($path)){
            $stderrLineNumber++
            if($stderrLine -notmatch '(?i)\b(?:error|fatal|panic)\b|\b(?:policy|approval|schema)\b.*\b(?:error|failed|failure|denied|reject(?:ed|ion)?|violation|invalid)\b'){continue}
            $allowed=$false
            foreach($allowedPattern in $AllowedStderrRegex){
                try{if($stderrLine -match $allowedPattern){$allowed=$true;break}}
                catch{Add-Failure "AllowedStderrRegex is invalid: $allowedPattern";break}
            }
            if(-not $allowed){Add-Failure "stderr failure signal at line $stderrLineNumber."}
        }
    }
}
if($totalArtifactBytes -gt $MaxTotalArtifactBytes){Add-Failure 'Captured artifacts exceed MaxTotalArtifactBytes.'}

$successfulToolCalls=0;$finalText=$null;$toolAttempts=@{};$startedTools=@{};$completedTools=@{};$eventCount=0;$turnActive=$false;$turnCompleted=$false
if($JsonlPath -and (Test-Path -LiteralPath $JsonlPath -PathType Leaf)){
    if((Get-Item -LiteralPath $JsonlPath).Length -gt $MaxJsonlBytes){Add-Failure 'JSONL artifact exceeds MaxJsonlBytes.'}
    else{
        $lineNumber=0
        foreach($line in [IO.File]::ReadLines((Resolve-Path -LiteralPath $JsonlPath).Path)){
            $lineNumber++;if(-not $line.Trim()){continue}
            if($line.Length -gt $MaxLineCharacters){Add-Failure "JSONL line $lineNumber exceeds MaxLineCharacters.";break}
            if(-not (Test-JsonNesting -Text $line)){Add-Failure "JSONL line $lineNumber exceeds the nesting limit or is structurally incomplete.";continue}
            try{$jsonEvent=$line|ConvertFrom-Json}catch{Add-Failure "Malformed JSONL at line $lineNumber.";continue}
            $eventCount++;if($eventCount -gt $MaxEvents){Add-Failure 'JSONL event count exceeds MaxEvents.';break}
            $eventType=[string](Get-PropertyValue -Object $jsonEvent -Name 'type')
            if(-not $eventType){Add-Failure "Event at line $lineNumber has no type.";continue}
            if($eventType -match '(^|\.)(error|failed)$' -or $null -ne(Get-PropertyValue -Object $jsonEvent -Name 'error')){Add-Failure "Failure event at line $lineNumber."}
            if($eventType -eq 'turn.started'){if($turnActive){Add-Failure 'A turn started before the previous turn completed.'};$turnActive=$true}
            if($eventType -eq 'turn.completed'){if(-not $turnActive){Add-Failure 'A turn completed without a matching start.'};$turnActive=$false;$turnCompleted=$true}
            $item=Get-PropertyValue -Object $jsonEvent -Name 'item'
            if($eventType -like 'item.*' -and $null -eq $item){Add-Failure "Item event at line $lineNumber has no item.";continue}
            if($null -eq $item){continue}
            $itemType=[string](Get-PropertyValue -Object $item -Name 'type');$itemId=[string](Get-PropertyValue -Object $item -Name 'id');$status=([string](Get-PropertyValue -Object $item -Name 'status')).ToLowerInvariant();$allowedAdvisory=Test-AllowedAdvisory -EventType $eventType -Item $item -Status $status -Patterns $AllowedAdvisoryRegex
            if(-not $itemType){Add-Failure "Item event at line $lineNumber has no item type."}
            if($status -in @('failed','error','denied','rejected','cancelled') -or $null -ne(Get-PropertyValue -Object $item -Name 'error')){Add-Failure "Item '$itemType' failed."}
            if($itemType -match '(?i)(?:^|[._-])(?:error|failure|failed|policy|approval|schema)(?:$|[._-])' -and -not $allowedAdvisory){Add-Failure "Failure-class item '$itemType'."}
            $isTool=$itemType -in @('command_execution','mcp_tool_call','tool_call','web_search')
            if($isTool){
                if(-not $turnActive){Add-Failure "Tool event '$itemId' occurred outside an active turn."}
                if(-not $itemId){Add-Failure "Tool event at line $lineNumber has no id.";continue}
                $identity=@($itemType,[string](Get-PropertyValue -Object $item -Name 'command'),[string](Get-PropertyValue -Object $item -Name 'name'),[string](Get-PropertyValue -Object $item -Name 'tool'))-join '|'
                if($eventType -eq 'item.started'){
                    if($startedTools.ContainsKey($itemId) -or $completedTools.ContainsKey($itemId)){Add-Failure "Duplicate tool start '$itemId'.";continue}
                    $startedTools[$itemId]=$itemType
                    if(-not $toolAttempts.ContainsKey($identity)){$toolAttempts[$identity]=0};$toolAttempts[$identity]++
                }elseif($eventType -eq 'item.completed'){
                    if($completedTools.ContainsKey($itemId)){Add-Failure "Duplicate tool completion '$itemId'.";continue}
                    if(-not $startedTools.ContainsKey($itemId) -or $startedTools[$itemId] -ne $itemType){Add-Failure "Tool '$itemId' completed without a matching start.";continue}
                    if($status -notin @('completed','success','succeeded')){Add-Failure "Tool '$itemId' has no explicit success status.";continue}
                    $exitCode=Get-PropertyValue -Object $item -Name 'exit_code' -Default (Get-PropertyValue -Object $item -Name 'exitCode')
                    if($itemType -eq 'command_execution' -and ($null -eq $exitCode -or [int]$exitCode -ne 0)){Add-Failure "Command tool '$itemId' has no explicit zero exit code.";continue}
                    $successfulToolCalls++;$startedTools.Remove($itemId);$completedTools[$itemId]=$true
                }
            }
            if($eventType -eq 'item.completed' -and $itemType -eq 'agent_message'){
                if(-not $turnActive){Add-Failure 'Agent message completed outside an active turn.'}
                else{$finalText=[string](Get-PropertyValue -Object $item -Name 'text')}
            }
        }
        if($eventCount -eq 0){Add-Failure 'JSONL output is empty.'}
    }
}
if($startedTools.Count -gt 0){Add-Failure 'One or more tool calls never completed.'}
if($turnActive -or -not $turnCompleted){Add-Failure 'No complete turn lifecycle was recorded.'}
if($FailOnToolRetry -and @($toolAttempts.GetEnumerator()|Where-Object Value -gt 1).Count -gt 0){Add-Failure 'A tool fingerprint was attempted more than once.'}
if($successfulToolCalls -lt $MinimumSuccessfulToolCalls){Add-Failure "Successful tool calls $successfulToolCalls is below required minimum $MinimumSuccessfulToolCalls."}
if($RequireExactFinalText -and $finalText -cne $ExpectedFinalText){Add-Failure 'Final agent text does not exactly match expected text.'}

$result=[pscustomobject]@{SchemaVersion='2.0';Passed=$failures.Count -eq 0;FailureCount=$failures.Count;Failures=@($failures);EventCount=$eventCount;SuccessfulToolCalls=$successfulToolCalls;FinalText=$finalText;RuntimeAttested=$false;MetadataIntegrity='out-of-band-digest';MetadataPath=$metadataPathResolved;JsonlPath=$JsonlPath}
if($AsJson){$result|ConvertTo-Json -Depth 6}else{$result}
if(-not $result.Passed -and -not $NoThrow){throw "Codex JSONL evidence failed validation: $($failures -join ' ')"}
```

## File: `scripts/Test-PowerShellWorkbenchDocumentationCatalog.ps1`

```powershell
[CmdletBinding()]
param(
    [string]$CatalogPath,
    [Parameter(Mandatory)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedCatalogSha256,
    [ValidateRange(1,3650)][int]$MaximumAgeDays = 90,
    [datetime]$ReferenceTimeUtc = [datetime]::UtcNow,
    [switch]$NoThrow
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
if (-not $CatalogPath) {
    $CatalogPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\documentation-source-catalog.json'
}

$failedGates = New-Object System.Collections.Generic.List[string]
$diagnostics = New-Object System.Collections.Generic.List[object]
function Add-FailedGate {
    param([string]$Gate,[string]$Subject,[string]$Message)
    if (-not $failedGates.Contains($Gate)) { $failedGates.Add($Gate) }
    $diagnostics.Add([pscustomobject][ordered]@{ Gate=$Gate; Subject=$Subject; Message=$Message })
}
function Test-AllowedProperty {
    param([object]$Value,[string[]]$Allowed,[string[]]$Required,[string]$Gate,[string]$Subject)
    foreach ($property in $Value.PSObject.Properties) {
        if ($Allowed -notcontains $property.Name) {
            Add-FailedGate -Gate $Gate -Subject $Subject -Message "Unknown property '$($property.Name)'."
        }
    }
    foreach ($name in $Required) {
        if ($null -eq $Value.PSObject.Properties[$name]) {
            Add-FailedGate -Gate $Gate -Subject $Subject -Message "Missing required property '$name'."
        }
    }
}
function Get-PropertyValue {
    param([object]$Value,[string]$Name)
    $property = $Value.PSObject.Properties[$Name]
    if ($null -eq $property) { return $null }
    $property.Value
}

$resolvedPath = $CatalogPath
$catalog = $null
$actualHash = $null
if (-not [IO.Path]::IsPathRooted($CatalogPath)) {
    Add-FailedGate -Gate 'CatalogPathAbsolute' -Subject $CatalogPath -Message 'Documentation catalog path must be absolute.'
} else {
    $resolvedPath = [IO.Path]::GetFullPath($CatalogPath)
    if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
        Add-FailedGate -Gate 'CatalogExists' -Subject $resolvedPath -Message 'Documentation catalog is missing.'
    } else {
        $actualHash = (Get-FileHash -LiteralPath $resolvedPath -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualHash -cne $ExpectedCatalogSha256.ToLowerInvariant()) {
            Add-FailedGate -Gate 'CatalogHash' -Subject $resolvedPath -Message 'Documentation catalog SHA-256 does not match the independently supplied digest.'
        } else {
            try { $catalog = Get-Content -LiteralPath $resolvedPath -Raw | ConvertFrom-Json }
            catch { Add-FailedGate -Gate 'CatalogValidJson' -Subject $resolvedPath -Message 'Documentation catalog is invalid JSON.' }
        }
    }
}

if ($null -ne $catalog) {
    Test-AllowedProperty -Value $catalog -Allowed @('schemaVersion','catalogId','verifiedAtUtc','domains') -Required @('schemaVersion','catalogId','verifiedAtUtc','domains') -Gate 'CatalogShape' -Subject $resolvedPath
    $schemaVersion = Get-PropertyValue -Value $catalog -Name 'schemaVersion'
    $catalogId = Get-PropertyValue -Value $catalog -Name 'catalogId'
    $verifiedAtText = Get-PropertyValue -Value $catalog -Name 'verifiedAtUtc'
    $domains = @(Get-PropertyValue -Value $catalog -Name 'domains' | Where-Object { $null -ne $_ })
    if ([string]$schemaVersion -cne '1.0') { Add-FailedGate -Gate 'SchemaVersionKnown' -Subject $resolvedPath -Message 'Documentation catalog schema must be 1.0.' }
    if ([string]$catalogId -cne 'powershell-workbench-authoritative-documentation') { Add-FailedGate -Gate 'CatalogIdentity' -Subject $resolvedPath -Message 'Documentation catalog identity is unknown.' }
    $verifiedAt = [datetime]::MinValue
    if (-not [datetime]::TryParse([string]$verifiedAtText,[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::AdjustToUniversal,[ref]$verifiedAt)) {
        Add-FailedGate -Gate 'CatalogVerifiedAt' -Subject $resolvedPath -Message 'Catalog verification time is invalid.'
    } else {
        $age = $ReferenceTimeUtc.ToUniversalTime() - $verifiedAt.ToUniversalTime()
        if ($age.TotalSeconds -lt 0) { Add-FailedGate -Gate 'CatalogVerifiedAtFuture' -Subject $resolvedPath -Message 'Catalog verification time is in the future.' }
        if ($age.TotalDays -gt $MaximumAgeDays) { Add-FailedGate -Gate 'CatalogStale' -Subject $resolvedPath -Message 'Catalog verification is older than policy allows.' }
    }

    $requiredDomains = @('powershell','microsoft-dism','microsoft-update','ollama')
    $canonicalSkills = @{ powershell='powershell-docs'; 'microsoft-dism'='microsoft-dism-docs'; 'microsoft-update'='microsoft-update-docs'; ollama='ollama-docs' }
    $domainIds = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)
    $sourceUrls = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)
    foreach ($domain in $domains) {
        if ($null -eq $domain) { Add-FailedGate -Gate 'DomainShape' -Subject $resolvedPath -Message 'Domain entries cannot be null.'; continue }
        $domainSubject = [string](Get-PropertyValue -Value $domain -Name 'id')
        Test-AllowedProperty -Value $domain -Allowed @('id','skill','allowedHosts','sources') -Required @('id','skill','allowedHosts','sources') -Gate 'DomainShape' -Subject $domainSubject
        if ([string]::IsNullOrWhiteSpace($domainSubject) -or -not $domainIds.Add($domainSubject)) { Add-FailedGate -Gate 'DomainIdUnique' -Subject $domainSubject -Message 'Domain ids must be nonempty and unique.' }
        if ($requiredDomains -notcontains $domainSubject) { Add-FailedGate -Gate 'DomainKnown' -Subject $domainSubject -Message 'Documentation domain is not recognized.' }
        $skill = [string](Get-PropertyValue -Value $domain -Name 'skill')
        if (-not $canonicalSkills.ContainsKey($domainSubject) -or $skill -cne [string]$canonicalSkills[$domainSubject]) {
            Add-FailedGate -Gate 'DomainSkillBinding' -Subject $domainSubject -Message 'Domain is not bound to its canonical skill.'
        }
        $hosts = @(Get-PropertyValue -Value $domain -Name 'allowedHosts' | Where-Object { $null -ne $_ })
        if ($hosts.Count -eq 0 -or @($hosts | Where-Object { [string]::IsNullOrWhiteSpace([string]$_) }).Count -gt 0) { Add-FailedGate -Gate 'AllowedHosts' -Subject $domainSubject -Message 'Each domain requires explicit authority hosts.' }
        $sources = @(Get-PropertyValue -Value $domain -Name 'sources' | Where-Object { $null -ne $_ })
        if ($sources.Count -eq 0) { Add-FailedGate -Gate 'DomainSources' -Subject $domainSubject -Message 'Each domain requires at least one source.' }
        $sourceIds = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)
        foreach ($source in $sources) {
            if ($null -eq $source) { Add-FailedGate -Gate 'SourceShape' -Subject $domainSubject -Message 'Source entries cannot be null.'; continue }
            $sourceId = [string](Get-PropertyValue -Value $source -Name 'id')
            $sourceUrl = [string](Get-PropertyValue -Value $source -Name 'url')
            $sourcePurpose = [string](Get-PropertyValue -Value $source -Name 'purpose')
            $sourceVersionScope = [string](Get-PropertyValue -Value $source -Name 'versionScope')
            $sourceSubject = "$domainSubject/$sourceId"
            Test-AllowedProperty -Value $source -Allowed @('id','url','purpose','versionScope') -Required @('id','url','purpose','versionScope') -Gate 'SourceShape' -Subject $sourceSubject
            if ([string]::IsNullOrWhiteSpace($sourceId) -or -not $sourceIds.Add($sourceId)) { Add-FailedGate -Gate 'SourceIdUnique' -Subject $sourceSubject -Message 'Source ids must be nonempty and unique within a domain.' }
            if ([string]::IsNullOrWhiteSpace($sourcePurpose) -or [string]::IsNullOrWhiteSpace($sourceVersionScope)) { Add-FailedGate -Gate 'SourceDescription' -Subject $sourceSubject -Message 'Every source needs purpose and version scope.' }
            $uri = $null
            if (-not [uri]::TryCreate($sourceUrl,[UriKind]::Absolute,[ref]$uri)) {
                Add-FailedGate -Gate 'SourceUrlAbsolute' -Subject $sourceSubject -Message 'Source URL must be absolute.'
            } elseif ($uri.Scheme -cne 'https' -or -not $uri.IsDefaultPort -or $uri.UserInfo -or $uri.Fragment) {
                Add-FailedGate -Gate 'SourceUrlSafe' -Subject $sourceSubject -Message 'Source URL must use HTTPS without user info, fragments, or custom ports.'
            } elseif ($hosts -cnotcontains $uri.DnsSafeHost) {
                Add-FailedGate -Gate 'SourceAuthorityHost' -Subject $sourceSubject -Message 'Source URL host is outside the domain authority allowlist.'
            }
            if (-not $sourceUrls.Add($sourceUrl)) { Add-FailedGate -Gate 'SourceUrlUnique' -Subject $sourceSubject -Message 'Source URLs must be globally unique.' }
        }
    }
    foreach ($required in $requiredDomains) {
        if (-not $domainIds.Contains($required)) { Add-FailedGate -Gate 'RequiredDomainPresent' -Subject $required -Message 'Required documentation domain is missing.' }
    }
}

$result = [pscustomobject][ordered]@{
    SchemaVersion = '1.0'
    CatalogPath = $resolvedPath
    CatalogSha256 = $actualHash
    ExpectedCatalogSha256 = $ExpectedCatalogSha256.ToLowerInvariant()
    MaximumAgeDays = $MaximumAgeDays
    ReferenceTimeUtc = $ReferenceTimeUtc.ToUniversalTime().ToString('o')
    Passed = ($failedGates.Count -eq 0)
    FailedGates = @($failedGates | ForEach-Object { $_ })
    Diagnostics = @($diagnostics | ForEach-Object { $_ })
    WritePerformed = $false
    ExecutionPerformed = $false
    NetworkPerformed = $false
    TransportPerformed = $false
}
if (-not $result.Passed -and -not $NoThrow) { throw "Documentation catalog validation failed: $($result.FailedGates -join ', ')." }
$result
```

## File: `scripts/Test-PowerShellWorkbenchHealth.ps1`

```powershell
[CmdletBinding()]
param(
    [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Distribution,
    [Parameter(Mandatory)][ValidatePattern('^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$')][string]$ExpectedVersion,
    [string[]]$CatalogManifestPath = @(),
    [ValidateRange(1, 8760)][int]$MaximumCatalogAgeHours = 24,
    [datetimeoffset]$ReferenceTimeUtc = [datetimeoffset]::UtcNow,
    [switch]$RequireCatalog,
    [switch]$NoThrow
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$failedGates = New-Object System.Collections.Generic.List[string]
$diagnostics = New-Object System.Collections.Generic.List[object]

function Add-FailedGate {
    param([string]$Gate,[string]$Subject,[string]$Message)
    if (-not $failedGates.Contains($Gate)) { $failedGates.Add($Gate) }
    $diagnostics.Add([pscustomobject][ordered]@{ Gate = $Gate; Subject = $Subject; Message = $Message })
}

function Get-PropertyValue {
    param([object]$InputObject,[string]$Name)
    if ($null -eq $InputObject) { return $null }
    if ($InputObject -is [Collections.IDictionary]) {
        if ($InputObject.Contains($Name)) { return $InputObject[$Name] }
        return $null
    }
    $property = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $property) { return $null }
    $property.Value
}

function Get-Sha256Text {
    param([string]$Text)
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.UTF8Encoding]::new($false).GetBytes($Text)
        ([BitConverter]::ToString($algorithm.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
    } finally { $algorithm.Dispose() }
}

function Get-CanonicalPath {
    param([string]$Path,[string]$BasePath)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $null }
    if ([IO.Path]::IsPathRooted($Path)) { return [IO.Path]::GetFullPath($Path) }
    [IO.Path]::GetFullPath((Join-Path $BasePath $Path))
}

function Get-TreeIdentity {
    param([string]$Root)
    $rootPath = [IO.Path]::GetFullPath($Root).TrimEnd('\','/')
    $items = @(Get-ChildItem -LiteralPath $rootPath -Recurse -Force)
    if (@($items | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count -gt 0) {
        throw 'Plugin tree contains a reparse point.'
    }
    $files = @($items | Where-Object { -not $_.PSIsContainer })
    $relativePaths = @($files | ForEach-Object { $_.FullName.Substring($rootPath.Length).TrimStart('\','/').Replace('\','/') })
    [Array]::Sort($relativePaths,[StringComparer]::Ordinal)
    $lines = foreach ($relativePath in $relativePaths) {
        $fullPath = Join-Path $rootPath $relativePath.Replace('/','\')
        $file = Get-Item -LiteralPath $fullPath
        '{0}|{1}|{2}' -f $relativePath,$file.Length,(Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    [pscustomobject][ordered]@{
        FileCount = $relativePaths.Count
        Sha256 = Get-Sha256Text -Text (@($lines) -join "`n")
    }
}

function Read-JsonFile {
    param([string]$Path)
    Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

$distributionResults = New-Object System.Collections.Generic.List[object]
$distributionNames = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
$sourcePaths = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
$cachePaths = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
if (@($Distribution).Count -eq 0) { Add-FailedGate -Gate 'DistributionEvidenceRequired' -Subject '<distribution>' -Message 'At least one distribution is required.' }

foreach ($entry in @($Distribution)) {
    $name = [string](Get-PropertyValue -InputObject $entry -Name 'Name')
    $sourceInput = [string](Get-PropertyValue -InputObject $entry -Name 'SourcePath')
    $cacheInput = [string](Get-PropertyValue -InputObject $entry -Name 'CachePath')
    $subject = if ([string]::IsNullOrWhiteSpace($name)) { '<unnamed>' } else { $name }
    if ([string]::IsNullOrWhiteSpace($name)) { Add-FailedGate -Gate 'DistributionNamePresent' -Subject $subject -Message 'Distribution name is missing.' }
    elseif (-not $distributionNames.Add($name)) { Add-FailedGate -Gate 'DistributionNameUnique' -Subject $subject -Message 'Distribution name is duplicated.' }

    $sourcePath = $null
    $cachePath = $null
    if ([string]::IsNullOrWhiteSpace($sourceInput) -or -not [IO.Path]::IsPathRooted($sourceInput)) {
        Add-FailedGate -Gate 'DistributionSourcePathAbsolute' -Subject $subject -Message 'SourcePath must be absolute.'
    } else {
        $sourcePath = [IO.Path]::GetFullPath($sourceInput)
        if (-not $sourcePaths.Add($sourcePath)) { Add-FailedGate -Gate 'DistributionSourcePathUnique' -Subject $subject -Message 'SourcePath is duplicated.' }
    }
    if ([string]::IsNullOrWhiteSpace($cacheInput) -or -not [IO.Path]::IsPathRooted($cacheInput)) {
        Add-FailedGate -Gate 'DistributionCachePathAbsolute' -Subject $subject -Message 'CachePath must be absolute.'
    } else {
        $cachePath = [IO.Path]::GetFullPath($cacheInput)
        if (-not $cachePaths.Add($cachePath)) { Add-FailedGate -Gate 'DistributionCachePathUnique' -Subject $subject -Message 'CachePath is duplicated.' }
    }
    if ($sourcePath -and $cachePath -and $sourcePath -ieq $cachePath) {
        Add-FailedGate -Gate 'DistributionSourceCacheDistinct' -Subject $subject -Message 'SourcePath and CachePath must be distinct.'
    } elseif (($sourcePath -and $cachePaths.Contains($sourcePath)) -or ($cachePath -and $sourcePaths.Contains($cachePath))) {
        Add-FailedGate -Gate 'DistributionRootUnique' -Subject $subject -Message 'A plugin root cannot be reused across source and cache roles.'
    }

    $sourceVersion = $null
    $cacheVersion = $null
    $sourceTree = $null
    $cacheTree = $null
    foreach ($side in @([pscustomobject]@{ Kind='Source'; Path=$sourcePath },[pscustomobject]@{ Kind='Cache'; Path=$cachePath })) {
        if (-not $side.Path) { continue }
        $existsGate = 'Distribution{0}Exists' -f $side.Kind
        if (-not (Test-Path -LiteralPath $side.Path -PathType Container)) {
            Add-FailedGate -Gate $existsGate -Subject $subject -Message "$($side.Kind) plugin root is missing."
            continue
        }
        $manifestPath = Join-Path $side.Path '.codex-plugin\plugin.json'
        $manifestGate = 'Distribution{0}ManifestValid' -f $side.Kind
        if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
            Add-FailedGate -Gate $manifestGate -Subject $subject -Message "$($side.Kind) plugin manifest is missing."
            continue
        }
        try { $manifest = Read-JsonFile -Path $manifestPath }
        catch { Add-FailedGate -Gate $manifestGate -Subject $subject -Message "$($side.Kind) plugin manifest is invalid JSON."; continue }
        if ([string](Get-PropertyValue -InputObject $manifest -Name 'name') -cne 'powershell-workbench') {
            Add-FailedGate -Gate ('Distribution{0}Identity' -f $side.Kind) -Subject $subject -Message "$($side.Kind) plugin name is not powershell-workbench."
        }
        $version = [string](Get-PropertyValue -InputObject $manifest -Name 'version')
        if ($version -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$') {
            Add-FailedGate -Gate ('Distribution{0}VersionValid' -f $side.Kind) -Subject $subject -Message "$($side.Kind) plugin version is missing or unknown."
        } elseif ($version -cne $ExpectedVersion) {
            Add-FailedGate -Gate ('Distribution{0}VersionExpected' -f $side.Kind) -Subject $subject -Message "$($side.Kind) plugin version '$version' does not match '$ExpectedVersion'."
        }
        if ($side.Kind -eq 'Source') { $sourceVersion = $version } else { $cacheVersion = $version }
        try {
            $tree = Get-TreeIdentity -Root $side.Path
            if ($side.Kind -eq 'Source') { $sourceTree = $tree } else { $cacheTree = $tree }
        } catch { Add-FailedGate -Gate ('Distribution{0}TreeReadable' -f $side.Kind) -Subject $subject -Message $_.Exception.Message }
    }
    if ($sourceTree -and $cacheTree -and ($sourceTree.FileCount -ne $cacheTree.FileCount -or $sourceTree.Sha256 -cne $cacheTree.Sha256)) {
        Add-FailedGate -Gate 'DistributionTreeIdentity' -Subject $subject -Message 'Source and installed cache trees differ.'
    }
    $distributionResults.Add([pscustomobject][ordered]@{
        Name=$name;SourcePath=$sourcePath;CachePath=$cachePath;SourceVersion=$sourceVersion;CacheVersion=$cacheVersion
        SourceFileCount=if($sourceTree){$sourceTree.FileCount}else{$null};CacheFileCount=if($cacheTree){$cacheTree.FileCount}else{$null}
        SourceTreeSha256=if($sourceTree){$sourceTree.Sha256}else{$null};CacheTreeSha256=if($cacheTree){$cacheTree.Sha256}else{$null}
    })
}

$catalogResults = New-Object System.Collections.Generic.List[object]
$catalogPaths = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
if ($RequireCatalog -and @($CatalogManifestPath).Count -eq 0) { Add-FailedGate -Gate 'CatalogEvidenceRequired' -Subject '<catalog>' -Message 'At least one catalog manifest is required.' }
foreach ($manifestInput in @($CatalogManifestPath)) {
    $manifestPath = Get-CanonicalPath -Path $manifestInput -BasePath (Get-Location).Path
    $subject = if ($manifestPath) { $manifestPath } else { '<catalog>' }
    if (-not $manifestPath -or -not $catalogPaths.Add($manifestPath)) {
        Add-FailedGate -Gate 'CatalogManifestPathUnique' -Subject $subject -Message 'Catalog manifest path is empty or duplicated.'
        continue
    }
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        Add-FailedGate -Gate 'CatalogManifestExists' -Subject $subject -Message 'Catalog manifest is missing.'
        continue
    }
    try { $manifest = Read-JsonFile -Path $manifestPath }
    catch { Add-FailedGate -Gate 'CatalogManifestValid' -Subject $subject -Message 'Catalog manifest is invalid JSON.'; continue }
    $schemaVersion = [string](Get-PropertyValue -InputObject $manifest -Name 'schemaVersion')
    $generatedAtText = [string](Get-PropertyValue -InputObject $manifest -Name 'generatedAtUtc')
    $model = [string](Get-PropertyValue -InputObject $manifest -Name 'model')
    $contextWindowText = [string](Get-PropertyValue -InputObject $manifest -Name 'contextWindow')
    $codexVersion = [string](Get-PropertyValue -InputObject $manifest -Name 'codexVersion')
    if ($schemaVersion -cne '1.1') { Add-FailedGate -Gate 'CatalogSchemaVersion' -Subject $subject -Message 'Catalog schema version is unknown.' }
    $generatedAt = [datetimeoffset]::MinValue
    if (-not [datetimeoffset]::TryParse($generatedAtText,[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::RoundtripKind,[ref]$generatedAt)) {
        Add-FailedGate -Gate 'CatalogGeneratedAtValid' -Subject $subject -Message 'Catalog generation time is invalid.'
    } else {
        $age = $ReferenceTimeUtc.ToUniversalTime() - $generatedAt.ToUniversalTime()
        if ($age.TotalSeconds -lt 0 -or $age.TotalHours -gt $MaximumCatalogAgeHours) { Add-FailedGate -Gate 'CatalogFreshness' -Subject $subject -Message 'Catalog evidence is stale or from the future.' }
    }
    $contextWindow = [int64]0
    if ([string]::IsNullOrWhiteSpace($model) -or -not [int64]::TryParse($contextWindowText,[ref]$contextWindow) -or $contextWindow -le 0) { Add-FailedGate -Gate 'CatalogModelIdentity' -Subject $subject -Message 'Catalog model or context identity is invalid.' }
    if ([string]::IsNullOrWhiteSpace($codexVersion)) { Add-FailedGate -Gate 'CatalogCodexIdentity' -Subject $subject -Message 'Catalog Codex version is missing.' }
    $manifestDirectory = Split-Path -Parent $manifestPath
    $artifactPath = Get-CanonicalPath -Path ([string](Get-PropertyValue -InputObject $manifest -Name 'catalogPath')) -BasePath $manifestDirectory
    $codexPath = Get-CanonicalPath -Path ([string](Get-PropertyValue -InputObject $manifest -Name 'codexPath')) -BasePath $manifestDirectory
    foreach ($artifact in @([pscustomobject]@{Kind='Artifact';Path=$artifactPath;Expected=[string](Get-PropertyValue -InputObject $manifest -Name 'catalogSha256')},[pscustomobject]@{Kind='Codex';Path=$codexPath;Expected=[string](Get-PropertyValue -InputObject $manifest -Name 'codexSha256')})) {
        if (-not $artifact.Path -or -not (Test-Path -LiteralPath $artifact.Path -PathType Leaf)) {
            Add-FailedGate -Gate ('Catalog{0}Exists' -f $artifact.Kind) -Subject $subject -Message "$($artifact.Kind) evidence file is missing."
        } elseif ($artifact.Expected -notmatch '^[a-fA-F0-9]{64}$' -or (Get-FileHash -LiteralPath $artifact.Path -Algorithm SHA256).Hash -ine $artifact.Expected) {
            Add-FailedGate -Gate ('Catalog{0}Hash' -f $artifact.Kind) -Subject $subject -Message "$($artifact.Kind) evidence hash does not match."
        }
    }
    if ($artifactPath -and (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
        try {
            $catalog = Read-JsonFile -Path $artifactPath
            $models = @(Get-PropertyValue -InputObject $catalog -Name 'models')
            if (@($models | Where-Object { [string](Get-PropertyValue -InputObject $_ -Name 'slug') -ceq $model }).Count -ne 1) { Add-FailedGate -Gate 'CatalogModelEntry' -Subject $subject -Message 'Catalog does not contain exactly one matching model entry.' }
        } catch { Add-FailedGate -Gate 'CatalogArtifactValid' -Subject $subject -Message 'Catalog artifact is invalid JSON.' }
    }
    $catalogResults.Add([pscustomobject][ordered]@{ManifestPath=$manifestPath;SchemaVersion=$schemaVersion;GeneratedAtUtc=$generatedAtText;Model=$model;ContextWindow=$contextWindow;CatalogPath=$artifactPath;CodexPath=$codexPath})
}

$result = [pscustomobject][ordered]@{
    SchemaVersion='1.0';Passed=($failedGates.Count -eq 0);ExpectedVersion=$ExpectedVersion
    ReferenceTimeUtc=$ReferenceTimeUtc.ToUniversalTime().ToString('o',[Globalization.CultureInfo]::InvariantCulture)
    MaximumCatalogAgeHours=$MaximumCatalogAgeHours;WritePerformed=$false
    FailedGates=@($failedGates.ToArray());Diagnostics=@($diagnostics.ToArray())
    Distributions=@($distributionResults.ToArray());Catalogs=@($catalogResults.ToArray())
}
if (-not $result.Passed -and -not $NoThrow) { throw "PowerShell Workbench health validation failed: $($result.FailedGates -join ', ')" }
$result
```

## File: `scripts/Test-PowerShellWorkbenchOllamaEvidence.ps1`

```powershell
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$MetadataPath,
    [Parameter(Mandatory)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedMetadataSha256,
    [Parameter(Mandatory)][string]$ExpectedModelId,
    [Parameter(Mandatory)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedModelDigest,
    [ValidateRange(1024, 10485760)][long]$MaxMetadataBytes = 1048576,
    [ValidateRange(1024, 10485760)][long]$MaxRequestBytes = 1048576,
    [ValidateRange(1024, 1073741824)][long]$MaxResponseBytes = 16777216,
    [ValidateRange(1, 1048576)][int]$ReadFileSliceMaximumBytes = 65536,
    [switch]$ExpectReadFileSliceProposal,
    [switch]$AcceptUnverifiedModelDigest,
    [switch]$AllowFixtureEvidence,
    [switch]$NoThrow,
    [switch]$AsJson
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
function Get-Value { param($Object,[string]$Name,$Default=$null) if($null -eq $Object){return $Default};$property=$Object.PSObject.Properties[$Name];if($null -eq $property){return $Default};$property.Value }
$failures = New-Object Collections.Generic.List[string]
function Add-Failure { param([string]$Name) if(-not $failures.Contains($Name)){$failures.Add($Name)} }
function Read-BoundedSnapshot {
    param([string]$LiteralPath,[long]$MaximumBytes)
    $resolved = (Resolve-Path -LiteralPath $LiteralPath).Path
    $stream = [IO.File]::Open($resolved, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
    try {
        $memory = [IO.MemoryStream]::new()
        try {
            $buffer = New-Object byte[] 8192
            while (($readCount = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                if ($memory.Length -gt ($MaximumBytes - $readCount)) { throw 'Snapshot exceeds its validator-side byte limit.' }
                $memory.Write($buffer, 0, $readCount)
            }
            $bytes = $memory.ToArray()
        } finally { $memory.Dispose() }
    } finally { $stream.Dispose() }
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { $sha256 = ([BitConverter]::ToString($algorithm.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose() }
    $decoder = New-Object Text.UTF8Encoding($false, $true)
    [pscustomobject]@{ Path = $resolved; Bytes = $bytes.Length; Sha256 = $sha256; Text = $decoder.GetString($bytes) }
}
function Test-ExactBoolean { param($Value,[bool]$Expected) $Value -is [bool] -and $Value -eq $Expected }
function Test-IntegerValue { param($Value) $Value -is [byte] -or $Value -is [sbyte] -or $Value -is [int16] -or $Value -is [uint16] -or $Value -is [int32] -or $Value -is [uint32] -or $Value -is [int64] -or $Value -is [uint64] }
function Test-Allowlist {
    param($Object,[string[]]$Allowed,[string]$Gate)
    if($null -eq $Object){Add-Failure $Gate;return}
    foreach($property in $Object.PSObject.Properties){if($Allowed -notcontains $property.Name){Add-Failure $Gate;return}}
}
function Test-JsonNesting {
    param([string]$Text,[ValidateRange(1,256)][int]$MaximumDepth = 64)
    $depth=0;$quoted=$false;$escaped=$false
    foreach($character in $Text.ToCharArray()){
        if($escaped){$escaped=$false;continue}
        if($quoted -and $character -eq '\'){$escaped=$true;continue}
        if($character -eq '"'){$quoted=-not $quoted;continue}
        if(-not $quoted -and $character -in @('{','[')){$depth++;if($depth -gt $MaximumDepth){return $false}}
        elseif(-not $quoted -and $character -in @('}',']')){$depth--;if($depth -lt 0){return $false}}
    }
    $depth -eq 0 -and -not $quoted -and -not $escaped
}
$requestPath = $null
$responsePath = $null

$metadataSnapshot = Read-BoundedSnapshot -LiteralPath $MetadataPath -MaximumBytes $MaxMetadataBytes
$resolvedMetadata = $metadataSnapshot.Path
if ($metadataSnapshot.Sha256 -ne $ExpectedMetadataSha256.ToLowerInvariant()) { Add-Failure 'MetadataSha256' }
if (-not(Test-JsonNesting -Text $metadataSnapshot.Text)) { throw 'Metadata exceeds the JSON nesting limit or is structurally incomplete.' }
try { $metadata = $metadataSnapshot.Text | ConvertFrom-Json }
catch { throw "Metadata is invalid JSON: $($_.Exception.Message)" }
if ([string](Get-Value $metadata 'schemaVersion') -cne '1.0') { Add-Failure 'SchemaVersion' }
if ([string](Get-Value $metadata 'captureStatus') -cne 'Completed') { Add-Failure 'CaptureStatus' }
$captureMode = [string](Get-Value $metadata 'captureMode')
if ($captureMode -notin @('LiveLoopback','Fixture')) { Add-Failure 'CaptureMode' }
if ($captureMode -eq 'Fixture' -and -not $AllowFixtureEvidence) { Add-Failure 'FixtureEvidenceNotRuntime' }
$fixture = Get-Value $metadata 'fixture'
if ($captureMode -eq 'Fixture') {
    $fixturePath = [string](Get-Value $fixture 'path')
    $fixtureSha256 = [string](Get-Value $fixture 'sha256')
    if (-not $fixturePath -or -not(Test-Path -LiteralPath $fixturePath -PathType Leaf) -or -not $fixtureSha256) { Add-Failure 'FixtureSha256' }
    else {
        try { $fixtureSnapshot = Read-BoundedSnapshot -LiteralPath $fixturePath -MaximumBytes $MaxResponseBytes }
        catch { Add-Failure 'FixtureSha256'; $fixtureSnapshot = $null }
        if ($null -ne $fixtureSnapshot -and $fixtureSnapshot.Sha256 -ne $fixtureSha256.ToLowerInvariant()) { Add-Failure 'FixtureSha256' }
    }
}

$endpoint = Get-Value $metadata 'endpoint'
try {
    $uri = [uri][string](Get-Value $endpoint 'uri')
    $endpointAddress = $null
    $endpointHost = $uri.DnsSafeHost.Trim('[',']')
    $isLoopback = [Net.IPAddress]::TryParse($endpointHost,[ref]$endpointAddress) -and [Net.IPAddress]::IsLoopback($endpointAddress)
    if (-not $isLoopback -or $uri.Scheme -cne 'http' -or $uri.AbsolutePath -cne '/api/chat' -or $uri.Query -or $uri.Fragment -or $uri.UserInfo) { Add-Failure 'Endpoint' }
} catch { Add-Failure 'Endpoint' }
if (-not(Test-ExactBoolean (Get-Value $endpoint 'isLoopback') $true) -or [string](Get-Value $endpoint 'wireApi') -cne 'ollama-chat') { Add-Failure 'EndpointEvidence' }

$model = Get-Value $metadata 'model'
if ([string](Get-Value $model 'requestedId') -cne $ExpectedModelId -or [string](Get-Value $model 'observedId') -cne $ExpectedModelId) { Add-Failure 'ModelId' }
if ([string](Get-Value $model 'expectedDigest') -ine $ExpectedModelDigest) { Add-Failure 'ModelDigest' }
if ([string](Get-Value $model 'digestAttestation') -cne 'unverified-caller-declaration') { Add-Failure 'ModelDigestAttestationState' }
elseif (-not $AcceptUnverifiedModelDigest) { Add-Failure 'ModelDigestNotAttested' }

$effects = Get-Value $metadata 'effects'
foreach ($name in @('toolExecutionPerformed','desktopLifecyclePerformed','providerSwitchPerformed','transportPerformed')) {
    if (-not(Test-ExactBoolean (Get-Value $effects $name) $false)) { Add-Failure "Effects.$name" }
}
if (-not(Test-ExactBoolean (Get-Value $effects 'writePerformed') $true)) { Add-Failure 'Effects.Capture' }
if ($captureMode -eq 'LiveLoopback' -and -not(Test-ExactBoolean (Get-Value $effects 'networkPerformed') $true)) { Add-Failure 'Effects.Network' }
if ($captureMode -eq 'Fixture' -and -not(Test-ExactBoolean (Get-Value $effects 'networkPerformed') $false)) { Add-Failure 'Effects.Network' }
$toolProposal=Get-Value $metadata 'toolProposal'
if(-not(Test-ExactBoolean (Get-Value $toolProposal 'readFileSliceEnabled') ([bool]$ExpectReadFileSliceProposal)) -or -not(Test-IntegerValue (Get-Value $toolProposal 'maximumBytes')) -or [int64](Get-Value $toolProposal 'maximumBytes') -ne $ReadFileSliceMaximumBytes){Add-Failure 'ToolProposal'}
$observation = Get-Value $metadata 'observation'
$statusCodeValue = Get-Value $observation 'httpStatusCode'
$statusCode = if(Test-IntegerValue $statusCodeValue){[int]$statusCodeValue}else{0}
if(-not(Test-IntegerValue $statusCodeValue)){Add-Failure 'HttpStatusCodeType'}
if ($statusCode -lt 200 -or $statusCode -ge 300) { Add-Failure 'HttpStatusCode' }
if (-not(Test-ExactBoolean (Get-Value $observation 'done') $true)) { Add-Failure 'Done' }
$toolCallCountValue = Get-Value $observation 'toolCallCount'
$toolCallCount = if(Test-IntegerValue $toolCallCountValue){[int]$toolCallCountValue}else{-1}
if(-not(Test-IntegerValue $toolCallCountValue)){Add-Failure 'ToolCallCountType'}
$expectedDisposition = if ($toolCallCount -gt 0) { 'PROPOSED_NOT_EXECUTED' } elseif ($toolCallCount -eq 0) { 'NONE' } else { 'UNKNOWN' }
if ([string](Get-Value $observation 'toolDisposition') -cne $expectedDisposition) { Add-Failure 'ToolDisposition' }

$artifacts = Get-Value $metadata 'artifacts'
$artifactSnapshots = @{}
foreach ($name in @('request','response')) {
    $path = [string](Get-Value $artifacts ($name + 'Path'))
    if (-not $path -or -not (Test-Path -LiteralPath $path -PathType Leaf)) { Add-Failure "Artifacts.$name.Missing"; continue }
    $limit = if ($name -eq 'request') { $MaxRequestBytes } else { $MaxResponseBytes }
    try { $snapshot = Read-BoundedSnapshot -LiteralPath $path -MaximumBytes $limit }
    catch { Add-Failure "Artifacts.$name.Limit"; continue }
    $actualBytes = [long]$snapshot.Bytes
    if ($actualBytes -ne [long](Get-Value -Object $artifacts -Name ($name + 'Bytes') -Default -1)) { Add-Failure "Artifacts.$name.Bytes" }
    if ($snapshot.Sha256 -ne ([string](Get-Value $artifacts ($name + 'Sha256'))).ToLowerInvariant()) { Add-Failure "Artifacts.$name.Sha256" }
    $artifactSnapshots[$name] = $snapshot
    if ($name -eq 'request') { $requestPath = $path } else { $responsePath = $path }
}
if ($requestPath) {
    if (-not(Test-JsonNesting -Text $artifactSnapshots['request'].Text)) { Add-Failure 'Request.JsonNesting'; $request = $null }
    else { try { $request = $artifactSnapshots['request'].Text | ConvertFrom-Json } catch { Add-Failure 'Request.Json'; $request = $null } }
    if ($request) {
        Test-Allowlist -Object $request -Allowed @('model','messages','stream','think','keep_alive','options','tools') -Gate 'Request.Properties'
        if ([string](Get-Value $request 'model') -cne $ExpectedModelId) { Add-Failure 'Request.ModelId' }
        if (-not(Test-ExactBoolean (Get-Value $request 'stream') $false)) { Add-Failure 'Request.Stream' }
        if (-not(Test-ExactBoolean (Get-Value $request 'think') $false)) { Add-Failure 'Request.Think' }
        if ([string](Get-Value $request 'keep_alive') -notmatch '^(0|[1-9][0-9]*[smh])$') { Add-Failure 'Request.KeepAlive' }
        $messages = @(Get-Value -Object $request -Name 'messages' -Default @())
        if ($messages.Count -ne 1 -or [string](Get-Value $messages[0] 'role') -cne 'user' -or [string]::IsNullOrWhiteSpace([string](Get-Value $messages[0] 'content'))) { Add-Failure 'Request.Messages' }
        else { Test-Allowlist -Object $messages[0] -Allowed @('role','content') -Gate 'Request.MessageProperties' }
        $options = Get-Value $request 'options'
        Test-Allowlist -Object $options -Allowed @('temperature','num_predict','seed') -Gate 'Request.OptionsProperties'
        $numPredict = Get-Value $options 'num_predict'
        if(-not(Test-IntegerValue $numPredict) -or [int64]$numPredict -lt 1 -or [int64]$numPredict -gt 1048576){Add-Failure 'Request.MaxOutputTokens'}
        $requestTools=Get-Value $request 'tools'
        if($ExpectReadFileSliceProposal){
            $expectedTools=@([ordered]@{type='function';function=[ordered]@{name='read_file_slice';description='Propose a bounded byte slice from one file. The client does not execute the proposal automatically.';parameters=[ordered]@{type='object';required=@('path','offsetBytes','maximumBytes');properties=[ordered]@{path=[ordered]@{type='string';description='Fully qualified file path inside the separately approved root.'};offsetBytes=[ordered]@{type='integer';minimum=0};maximumBytes=[ordered]@{type='integer';minimum=1;maximum=$ReadFileSliceMaximumBytes}}}}})
            if(@($requestTools).Count -ne 1 -or ($requestTools|ConvertTo-Json -Depth 10 -Compress) -cne ($expectedTools|ConvertTo-Json -Depth 10 -Compress)){Add-Failure 'Request.Tools'}
        }elseif($null -ne $requestTools){Add-Failure 'Request.Tools'}
    }
}
if ($responsePath) {
    if (-not(Test-JsonNesting -Text $artifactSnapshots['response'].Text)) { Add-Failure 'Response.JsonNesting'; $response = $null }
    else { try { $response = $artifactSnapshots['response'].Text | ConvertFrom-Json } catch { Add-Failure 'Response.Json'; $response = $null } }
    if ($response) {
        if ([string](Get-Value $response 'model') -cne $ExpectedModelId) { Add-Failure 'Response.ModelId' }
        if (-not(Test-ExactBoolean (Get-Value $response 'done') $true)) { Add-Failure 'Response.Done' }
        $responseMessage = Get-Value $response 'message'
        $responseToolCalls = Get-Value $responseMessage 'tool_calls'
        $responseToolCount = if ($null -ne $responseToolCalls) { @($responseToolCalls).Count } else { 0 }
        if ($responseToolCount -ne $toolCallCount) { Add-Failure 'Response.ToolCallCount' }
    }
}

$result = [pscustomobject][ordered]@{
    SchemaVersion = '1.0'
    Passed = $failures.Count -eq 0
    FailureCount = $failures.Count
    FailedGates = @($failures)
    MetadataIntegrity = 'out-of-band-digest'
    ModelIdObserved = [string](Get-Value $model 'observedId')
    ModelDigestAttested = $false
    ToolCallCount = $toolCallCount
    ToolExecutionPerformed = $false
    MetadataPath = $resolvedMetadata
}
if ($AsJson) { $result | ConvertTo-Json -Depth 5 -Compress } else { $result }
if (-not $result.Passed -and -not $NoThrow) { throw "Ollama evidence failed validation: $($failures -join ', ')." }
```

## File: `scripts/Test-PowerShellWorkbenchPatch.ps1`

```powershell
[CmdletBinding(DefaultParameterSetName = 'Text')]
param(
    [Parameter(Mandatory = $true, ParameterSetName = 'Text')]
    [AllowEmptyString()]
    [string]$PatchText,

    [Parameter(Mandatory = $true, ParameterSetName = 'Path')]
    [string]$PatchPath,

    [ValidateSet('Unknown', 'DirectArgument', 'Pipeline', 'StandardInput', 'ShellText')]
    [string]$InvocationMode = 'Unknown',

    [ValidateSet('Unknown', 'DedicatedTool', 'NativeExecutable', 'WindowsBatchWrapper')]
    [string]$HostAdapter = 'Unknown',

    [ValidateRange(1, 67108864)]
    [long]$MaximumBytes = 4194304
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$failedGates = New-Object System.Collections.Generic.List[string]
$resolvedPatchPath = $null
$sourceKind = $PSCmdlet.ParameterSetName
$detectedEncoding = $null
$bytes = $null
$text = $null
$sha256 = $null
$targetPaths = @()
$targetIdentities = @()
$byteLength = 0
$encodingEvidence = $null

function ConvertTo-PatchTargetIdentity {
    param([string]$Path)

    $segments = @($Path.Trim().Replace('\', '/').Split('/'))
    $stack = New-Object System.Collections.Generic.List[string]
    foreach ($segment in $segments) {
        if (-not $segment -or $segment -eq '.') { continue }
        if ($segment -eq '..') {
            if ($stack.Count -eq 0) { return $null }
            $stack.RemoveAt($stack.Count - 1)
            continue
        }
        $stack.Add($segment)
    }
    if ($stack.Count -eq 0) { return $null }
    return (($stack -join '/').ToLowerInvariant())
}

function Read-BoundedPatchFile {
    param(
        [string]$LiteralPath,
        [long]$ByteLimit
    )

    $stream = New-Object IO.FileStream($LiteralPath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
    try {
        $initialLength = $stream.Length
        if ($initialLength -gt $ByteLimit) {
            return [pscustomobject]@{ Bytes = $null; ByteLength = $initialLength; OverLimit = $true; Stable = $true }
        }

        $buffer = New-Object byte[] ([int]($ByteLimit + 1))
        $totalRead = 0
        while ($totalRead -lt $buffer.Length) {
            $read = $stream.Read($buffer, $totalRead, $buffer.Length - $totalRead)
            if ($read -eq 0) { break }
            $totalRead += $read
        }

        if ($totalRead -gt $ByteLimit) {
            return [pscustomobject]@{ Bytes = $null; ByteLength = $totalRead; OverLimit = $true; Stable = $false }
        }

        $finalLength = $stream.Length
        if ($initialLength -ne $finalLength -or $totalRead -ne $finalLength) {
            return [pscustomobject]@{ Bytes = $null; ByteLength = $totalRead; OverLimit = $false; Stable = $false }
        }

        $snapshot = New-Object byte[] $totalRead
        if ($totalRead -gt 0) { [Array]::Copy($buffer, $snapshot, $totalRead) }
        return [pscustomobject]@{ Bytes = $snapshot; ByteLength = $totalRead; OverLimit = $false; Stable = $true }
    } finally {
        $stream.Dispose()
    }
}

if ($sourceKind -eq 'Path') {
    try {
        $resolvedPatchPath = [IO.Path]::GetFullPath($PatchPath)
    } catch {
        $failedGates.Add('PatchFileExists')
    }

    if ($resolvedPatchPath -and (Test-Path -LiteralPath $resolvedPatchPath -PathType Leaf)) {
        try {
            $readResult = Read-BoundedPatchFile -LiteralPath $resolvedPatchPath -ByteLimit $MaximumBytes
            $byteLength = $readResult.ByteLength
            if ($readResult.OverLimit) {
                $failedGates.Add('PatchWithinByteLimit')
            } elseif (-not $readResult.Stable) {
                $failedGates.Add('PatchStableDuringRead')
            } else {
                $bytes = $readResult.Bytes
            }
        } catch {
            $failedGates.Add('PatchReadable')
        }
    } elseif (-not $failedGates.Contains('PatchFileExists')) {
        $failedGates.Add('PatchFileExists')
    }
} else {
    $text = $PatchText
    $textEncoder = New-Object Text.UTF8Encoding($false, $true)
    $byteLength = $textEncoder.GetByteCount($text)
    $detectedEncoding = 'Utf8NoBomReencodedText'
    $encodingEvidence = 'ReencodedText'
    if ($byteLength -gt $MaximumBytes) {
        $failedGates.Add('PatchWithinByteLimit')
    } else {
        $bytes = $textEncoder.GetBytes($text)
    }
}

if ($null -ne $bytes) {
    $hasUtf8Bom = $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF
    $hasUtf16LeBom = $bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE
    $hasUtf16BeBom = $bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF
    $hasUtf32LeBom = $bytes.Length -ge 4 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE -and $bytes[2] -eq 0x00 -and $bytes[3] -eq 0x00
    $hasUtf32BeBom = $bytes.Length -ge 4 -and $bytes[0] -eq 0x00 -and $bytes[1] -eq 0x00 -and $bytes[2] -eq 0xFE -and $bytes[3] -eq 0xFF

    if ($sourceKind -eq 'Path') {
        if ($hasUtf32LeBom) { $detectedEncoding = 'Utf32LittleEndianBom' }
        elseif ($hasUtf32BeBom) { $detectedEncoding = 'Utf32BigEndianBom' }
        elseif ($hasUtf8Bom) { $detectedEncoding = 'Utf8Bom' }
        elseif ($hasUtf16LeBom) { $detectedEncoding = 'Utf16LittleEndianBom' }
        elseif ($hasUtf16BeBom) { $detectedEncoding = 'Utf16BigEndianBom' }
        else {
            try {
                $text = (New-Object Text.UTF8Encoding($false, $true)).GetString($bytes)
                $detectedEncoding = 'Utf8NoBom'
                $encodingEvidence = 'SourceBytes'
            } catch {
                $detectedEncoding = 'UnknownOrInvalidUtf8'
            }
        }

        if ($detectedEncoding -ne 'Utf8NoBom') {
            $failedGates.Add('PatchEncodingUtf8NoBom')
        }
    }

    if ($detectedEncoding -eq 'Utf8NoBom' -or $detectedEncoding -eq 'Utf8NoBomReencodedText') {
        if ($null -eq $text) {
            $text = (New-Object Text.UTF8Encoding($false, $true)).GetString($bytes)
        }

        if ([Array]::IndexOf($bytes, [byte]0) -ge 0) {
            $failedGates.Add('PatchNoNulBytes')
        }

        $envelopePattern = '\A\*\*\* Begin Patch\r?\n(?s:.*?)\r?\n\*\*\* End Patch(?:\r?\n)?\z'
        if (-not [regex]::IsMatch($text, $envelopePattern)) {
            $failedGates.Add('PatchEnvelope')
        }

        $operationMatches = [regex]::Matches($text, '(?m)^\*\*\* (?:Add|Update|Delete) File: (?<path>.+?)\r?$')
        if ($operationMatches.Count -eq 0) {
            $failedGates.Add('PatchHasOperation')
        } else {
            $targetCounts = @{}
            foreach ($operationMatch in $operationMatches) {
                $targetPath = $operationMatch.Groups['path'].Value.Trim()
                $targetPaths += $targetPath
                $targetIdentity = ConvertTo-PatchTargetIdentity -Path $targetPath
                if (-not $targetIdentity) {
                    if (-not $failedGates.Contains('PatchTargetPathCanonical')) { $failedGates.Add('PatchTargetPathCanonical') }
                    continue
                }
                $targetIdentities += $targetIdentity
                if ($targetCounts.ContainsKey($targetIdentity)) { $targetCounts[$targetIdentity]++ }
                else { $targetCounts[$targetIdentity] = 1 }
            }
            if (@($targetCounts.GetEnumerator() | Where-Object { $_.Value -gt 1 }).Count -gt 0) {
                $failedGates.Add('PatchSingleOperationPerTarget')
            }
        }
    }

    $hashAlgorithm = [Security.Cryptography.SHA256]::Create()
    try {
        $sha256 = ([BitConverter]::ToString($hashAlgorithm.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
    } finally {
        $hashAlgorithm.Dispose()
    }
}

if ($InvocationMode -eq 'Unknown') {
    $failedGates.Add('InvocationModeKnown')
} elseif ($InvocationMode -ne 'DirectArgument') {
    $failedGates.Add('InvocationModeDirectArgument')
}

if ($HostAdapter -eq 'Unknown') {
    $failedGates.Add('HostAdapterKnown')
} elseif ($HostAdapter -eq 'WindowsBatchWrapper') {
    $failedGates.Add('HostAdapterMultilineArgumentSafe')
}

[pscustomobject][ordered]@{
    SchemaVersion = '1.0'
    SourceKind = $sourceKind
    PatchPath = $resolvedPatchPath
    InvocationMode = $InvocationMode
    HostAdapter = $HostAdapter
    Eligible = ($failedGates.Count -eq 0)
    FailedGates = @($failedGates)
    DetectedEncoding = $detectedEncoding
    EncodingEvidence = $encodingEvidence
    ByteLength = $byteLength
    MaximumBytes = $MaximumBytes
    PatchSha256 = $sha256
    OperationCount = $targetPaths.Count
    TargetPaths = @($targetPaths)
    TargetIdentities = @($targetIdentities)
    ExecutionOccurred = $false
    TransportPerformed = $false
    TargetMutation = $false
    Recommendation = 'Submit the complete validated patch through a dedicated tool or native executable as one direct argument; do not use a Windows batch wrapper, pipeline, stdin, or shell evaluation.'
}
```

## File: `scripts/Test-PowerShellWorkbenchPlugin.ps1`

```powershell
[CmdletBinding()]
param(
    [string]$PluginRoot
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
if (-not $PluginRoot) { $PluginRoot = Split-Path -Parent $PSScriptRoot }

$failures = New-Object System.Collections.Generic.List[string]
$manifestPath = Join-Path $PluginRoot '.codex-plugin\plugin.json'
try {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.name -ne 'powershell-workbench') { $failures.Add('Unexpected plugin name.') }
    if (-not $manifest.version) { $failures.Add('Plugin version is missing.') }
    if (-not (Test-Path -LiteralPath (Join-Path $PluginRoot 'skills'))) { $failures.Add('Skills directory is missing.') }
} catch { $failures.Add("Invalid plugin manifest: $($_.Exception.Message)") }

Get-ChildItem -LiteralPath (Join-Path $PluginRoot 'skills') -Filter 'SKILL.md' -File -Recurse | ForEach-Object {
    $text = Get-Content -LiteralPath $_.FullName -Raw
    if ($text -notmatch '(?s)^---\s*\r?\nname:\s*[a-z0-9-]+\s*\r?\ndescription:\s*.+?\r?\n---') {
        $failures.Add("Invalid skill frontmatter: $($_.FullName)")
    }
}

@(Get-ChildItem -LiteralPath (Join-Path $PluginRoot 'scripts') -Filter '*.ps1' -File) +
@(Get-ChildItem -LiteralPath (Join-Path $PluginRoot 'Tests') -Filter '*.ps1' -File -Recurse -ErrorAction SilentlyContinue) | ForEach-Object {
    $tokens=$null; $errors=$null
    [void][Management.Automation.Language.Parser]::ParseFile($_.FullName,[ref]$tokens,[ref]$errors)
    foreach($parseError in @($errors)) { $failures.Add("Parser error in $($_.Name): $($parseError.Message)") }
}

if ($failures.Count) { $failures | ForEach-Object { Write-Error $_ }; exit 1 }
Write-Output "PowerShell Workbench structural validation passed for $($manifest.version). Contract tests and optional quality gates are separate."
```

## File: `scripts/workbench_components.py`

```python
#!/usr/bin/env python3
"""Workbench archive and syntax preflight. Never execute registered source code."""
import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from xml.parsers import expat

ROOT = Path(__file__).resolve().parent.parent
NAMESPACE = uuid.UUID('80ade983-e156-4eec-b7f1-f972fa3e5b16')
LANGUAGES = ('powershell', 'xml', 'batch', 'cmd', 'lua', 'python', 'javascript',
             'typescript', 'csharp', 'json', 'yaml', 'html', 'css', 'bash', 'sql', 'toc')
MAX_BYTES = 4 * 1024 * 1024

def digest(data):
    return hashlib.sha256(data).hexdigest()

def adapter_id(language):
    return str(uuid.uuid5(NAMESPACE, 'parser:' + language))

def read_bytes(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > MAX_BYTES:
        raise ValueError('Expected a regular file of at most 4 MiB')
    with path.open('rb') as source:
        data = source.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError('Source exceeds 4 MiB')
    return data

def strict_json(text):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('Duplicate JSON key: ' + key)
            result[key] = value
        return result
    def invalid(value):
        raise ValueError('Non-finite JSON value: ' + value)
    return json.loads(text, object_pairs_hook=pairs, parse_constant=invalid)

def parse(language, data, suffix=''):
    result = {'parserComponentId': adapter_id(language), 'language': language,
              'state': 'UNAVAILABLE', 'sourceSha256': digest(data),
              'scope': 'syntax-only', 'sourceExecutionPerformed': False,
              'diagnostics': []}
    if language not in LANGUAGES:
        raise ValueError('Unknown language')
    try:
        if language == 'python':
            ast.parse(data, filename='<component>')
            result.update(state='PASSED', runtime=sys.version.split()[0])
        elif language == 'json':
            strict_json(data.decode('utf-8-sig'))
            result.update(state='PASSED', runtime=sys.version.split()[0])
        elif language == 'xml':
            parser = expat.ParserCreate()
            def reject(*unused):
                raise ValueError('DTD/entity declarations are outside the XML adapter policy')
            parser.StartDoctypeDeclHandler = reject
            parser.EntityDeclHandler = reject
            parser.ExternalEntityRefHandler = reject
            parser.Parse(data, True)
            result.update(state='PASSED', runtime=expat.EXPAT_VERSION,
                          scope='XML well-formedness; DTD/entities prohibited; not XSD validation')
        elif language in ('powershell', 'lua', 'javascript'):
            executable = shutil.which({'powershell': 'pwsh', 'lua': 'luac',
                                       'javascript': 'node'}[language])
            if language == 'powershell' and not executable:
                executable = shutil.which('powershell.exe')
            if not executable:
                result['diagnostics'] = ['Required parser runtime is not installed']
                return result
            with tempfile.TemporaryDirectory(prefix='workbench-parse-') as folder:
                ext = {'powershell': '.ps1', 'lua': '.lua', 'javascript': '.mjs' if suffix == '.mjs' else '.cjs'}[language]
                snapshot = Path(folder) / ('snapshot' + ext)
                snapshot.write_bytes(data)
                if language == 'powershell':
                    command = [executable, '-NoLogo', '-NoProfile', '-NonInteractive',
                               '-File', str(ROOT / 'scripts' / 'Get-PowerShellWorkbenchCodeAnalysis.ps1'),
                               '-Path', str(snapshot)]
                elif language == 'lua':
                    command = [executable, '-p', str(snapshot)]
                else:
                    command = [executable, '--check', str(snapshot)]
                # Inherited runtime startup injection is not part of source parsing.
                env = {k: v for k, v in os.environ.items()
                       if k.upper() not in ('NODE_OPTIONS', 'NODE_PATH', 'LUA_INIT', 'LUA_INIT_5_4', 'LUA_INIT_5_3')}
                completed = subprocess.run(command, capture_output=True, text=True,
                                           timeout=20, cwd=folder, env=env, shell=False)
                result['state'] = 'PASSED' if completed.returncode == 0 else 'FAILED'
                result['runtime'] = executable
                if language == 'powershell' and completed.returncode == 0:
                    analysis = strict_json(completed.stdout.lstrip('\ufeff'))
                    result['analysis'] = analysis
                    result['state'] = 'PASSED' if analysis['passed'] else 'FAILED'
                elif completed.returncode:
                    result['diagnostics'] = [(completed.stderr or completed.stdout)[-4000:]]
        else:
            result['diagnostics'] = ['Adapter contract reserved; no trusted syntax-only implementation bundled. Never run source to validate syntax.']
    except (ValueError, SyntaxError, UnicodeError, expat.ExpatError) as error:
        result.update(state='FAILED', diagnostics=[str(error)])
    except (OSError, subprocess.TimeoutExpired) as error:
        result.update(state='UNAVAILABLE', diagnostics=[str(error)])
    return result

def uuid_text(value):
    normalized = str(uuid.UUID(value))
    if value != normalized:
        raise ValueError('Component ID must be a canonical UUID')
    return normalized

def version_text(value):
    if not re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)', value):
        raise ValueError('Version must be an explicit x.y.z release')
    return value

def location(archive, component_id, version):
    archive = Path(archive).resolve()
    target = archive / uuid_text(component_id) / version_text(version)
    if any(item.is_symlink() for item in (target.parent, target)):
        raise ValueError('Symlinked component directory')
    return target

@contextmanager
def locked(archive):
    archive = Path(archive).resolve()
    archive.mkdir(parents=True, exist_ok=True)
    lock = archive / '.registration-lock'
    try:
        lock.mkdir()
    except FileExistsError:
        raise ValueError('Archive is locked; inspect the owning registration before retrying')
    try:
        yield archive
    finally:
        lock.rmdir()

def register(archive, source, language, purpose, kind, contract, component_id=None,
             version='1.0.0', dependencies=None, derived_from=None):
    if not purpose.strip():
        raise ValueError('A component purpose is required')
    if language not in LANGUAGES or kind not in ('fragment', 'function', 'script', 'module', 'assembly'):
        raise ValueError('Unknown language or component kind')
    data = read_bytes(source)
    component_id = uuid_text(component_id or str(uuid.uuid4()))
    version_text(version)
    required = {'inputs', 'outputs', 'bindings', 'effects', 'unresolved', 'reviewed'}
    if not isinstance(contract, dict) or not required.issubset(contract):
        raise ValueError('Contract requires inputs, outputs, bindings, effects, unresolved and reviewed')
    if any(not isinstance(contract[key], list) for key in required - {'reviewed'}):
        raise ValueError('Contract collections must be arrays')
    if not isinstance(contract['reviewed'], bool):
        raise ValueError('Contract reviewed must be boolean')
    dependencies = dependencies or []
    derived_from = derived_from or []
    if not isinstance(dependencies, list) or not isinstance(derived_from, list):
        raise ValueError('Dependencies and lineage must be arrays of exact pins')
    for pin in dependencies + derived_from:
        location(archive, pin['componentId'], pin['version'])
        if not re.fullmatch('[0-9a-f]{64}', pin['sha256']):
            raise ValueError('Dependency pin requires SHA-256')
    metadata = {'schemaVersion': '1.0', 'componentId': component_id, 'version': version,
                'language': language, 'kind': kind, 'purpose': purpose,
                'entryPoint': 'code' + Path(source).suffix.lower(), 'sha256': digest(data),
                'contract': contract, 'dependencies': dependencies,
                'derivedFrom': derived_from,
                'provenance': {'source': str(Path(source).resolve()), 'sha256': digest(data),
                               'registeredAtUtc': datetime.now(timezone.utc).isoformat()},
                'validation': parse(language, data, Path(source).suffix.lower())}
    with locked(archive) as archive_path:
        target = location(archive_path, component_id, version)
        if target.exists():
            raise ValueError('Immutable component ID/version already exists')
        target.parent.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='.draft-', dir=archive_path) as temporary:
            stage = Path(temporary) / 'record'
            stage.mkdir()
            (stage / metadata['entryPoint']).write_bytes(data)
            (stage / 'component.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
            stage.rename(target)
    return metadata

def load(archive, component_id, version):
    target = location(archive, component_id, version)
    metadata = strict_json(read_bytes(target / 'component.json').decode('utf-8'))
    if metadata['componentId'] != component_id or metadata['version'] != version or metadata['schemaVersion'] != '1.0':
        raise ValueError('Component identity mismatch')
    name = metadata['entryPoint']
    if not isinstance(name, str) or not re.fullmatch(r'code(?:\.[a-z0-9]+)?', name):
        raise ValueError('Component entry point must be a contained code snapshot')
    data = read_bytes(target / name)
    if digest(data) != metadata['sha256']:
        raise ValueError('Component content hash mismatch')
    return metadata, data

def gate(archive, component_id, version, source=None):
    visited, active, checks, failures = set(), set(), [], []
    def visit(cid, ver, expected=None):
        key = (cid, ver)
        if key in active:
            raise ValueError('Cyclic component dependencies')
        metadata, data = load(archive, cid, ver)
        if expected is not None and metadata['sha256'] != expected:
            raise ValueError('Dependency pin mismatch')
        if key in visited:
            return
        active.add(key)
        contract = metadata['contract']
        if not contract['reviewed'] or contract['unresolved']:
            failures.append({'componentId': cid, 'gate': 'ContractReviewedAndResolved'})
        check = parse(metadata['language'], data, Path(metadata['entryPoint']).suffix)
        checks.append({'componentId': cid, 'version': ver, **check})
        if check['state'] != 'PASSED':
            failures.append({'componentId': cid, 'gate': 'ParserAvailableAndPassed'})
        for pin in metadata['dependencies']:
            visit(pin['componentId'], pin['version'], pin['sha256'])
        active.remove(key)
        visited.add(key)
    visit(component_id, version)
    metadata, data = load(archive, component_id, version)
    if source is not None and read_bytes(source) != data:
        failures.append({'componentId': component_id, 'gate': 'ExecutionSourceMatchesSnapshot'})
    return {'schemaVersion': '1.0', 'passed': not failures, 'componentId': component_id,
            'version': version, 'sha256': metadata['sha256'], 'checks': checks,
            'failedGates': failures, 'sourceExecutionPerformed': False,
            'executionAuthorized': False, 'scope': 'registered bytes, declared dependency pins, syntax and declared contract review; not behavioral proof'}

def search(archive, query):
    archive = Path(archive).resolve()
    results = []
    if not archive.exists():
        return results
    for item in archive.glob('*/*/component.json'):
        metadata, unused = load(archive, item.parent.parent.name, item.parent.name)
        score = sum(word in (metadata['purpose'] + ' ' + metadata['language']).lower()
                    for word in query.lower().split())
        if score:
            results.append({'componentId': metadata['componentId'], 'version': metadata['version'],
                            'purpose': metadata['purpose'], 'score': score,
                            'parserStateAtRegistration': metadata['validation']['state']})
    return sorted(results, key=lambda row: (-row['score'], row['componentId'], row['version']))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    syntax = sub.add_parser('parse')
    syntax.add_argument('--source', required=True)
    syntax.add_argument('--language', choices=LANGUAGES, required=True)
    find = sub.add_parser('search')
    find.add_argument('--archive', required=True)
    find.add_argument('--query', required=True)
    new = sub.add_parser('register')
    for flag in ('archive', 'source', 'language', 'purpose', 'kind', 'contract'):
        new.add_argument('--' + flag, required=True)
    new.add_argument('--component-id')
    new.add_argument('--version', default='1.0.0')
    new.add_argument('--dependencies')
    new.add_argument('--derived-from')
    check = sub.add_parser('gate')
    for flag in ('archive', 'component-id', 'version', 'source'):
        check.add_argument('--' + flag, required=True)
    args = parser.parse_args()
    try:
        if args.command == 'parse':
            result = parse(args.language, read_bytes(args.source), Path(args.source).suffix.lower())
        elif args.command == 'search':
            result = search(args.archive, args.query)
        elif args.command == 'gate':
            result = gate(args.archive, args.component_id, args.version, args.source)
        else:
            read_json = lambda path: strict_json(read_bytes(path).decode('utf-8-sig')) if path else None
            result = register(args.archive, args.source, args.language, args.purpose, args.kind,
                              read_json(args.contract), args.component_id, args.version,
                              read_json(args.dependencies), read_json(args.derived_from))
        print(json.dumps(result, indent=2))
        if isinstance(result, dict) and (result.get('passed') is False or result.get('state') in ('FAILED', 'UNAVAILABLE')):
            return 2
        return 0
    except (ValueError, KeyError, TypeError, OSError, RecursionError) as error:
        print(json.dumps({'passed': False, 'error': str(error), 'sourceExecutionPerformed': False}))
        return 2

if __name__ == '__main__':
    sys.exit(main())
```
