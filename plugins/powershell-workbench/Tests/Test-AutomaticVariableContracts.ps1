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
