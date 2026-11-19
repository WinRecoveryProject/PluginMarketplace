param([switch]$Doctor)
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion -lt [version]'7.4.6') { throw 'PowerShell >=7.4.6 is required' }
Import-Module PSScriptAnalyzer -RequiredVersion 1.25.0 -ErrorAction Stop
if ($Doctor) { @{ powershell = $PSVersionTable.PSVersion.ToString(); analyzer = '1.25.0' } | ConvertTo-Json -Compress; exit 0 }
$items = [Console]::In.ReadToEnd() | ConvertFrom-Json
$results = [System.Collections.Generic.List[object]]::new()
foreach ($item in $items) {
    $tokens = $null; $errors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseInput($item.content, [ref]$tokens, [ref]$errors)
    foreach ($parseError in $errors) {
        $results.Add(@{ file=$item.file; rule=$parseError.ErrorId; message=$parseError.Message; line=$parseError.Extent.StartLineNumber; column=$parseError.Extent.StartColumnNumber; severity='error' })
    }
    if ($errors.Count -eq 0) {
        $rules = @('PSAvoidUsingCmdletAliases', 'PSUseApprovedVerbs', 'PSUseDeclaredVarsMoreThanAssignments', 'PSAvoidUsingWriteHost', 'PSAvoidUsingInvokeExpression', 'PSAvoidUsingPlainTextForPassword')
        foreach ($finding in @(Invoke-ScriptAnalyzer -ScriptDefinition $item.content -IncludeRule $rules -ErrorAction Stop)) {
            $results.Add(@{ file=$item.file; rule=$finding.RuleName; message=$finding.Message; line=$finding.Line; column=$finding.Column; severity=$finding.Severity.ToString().ToLowerInvariant() })
        }
    }
}
ConvertTo-Json -InputObject @($results.ToArray()) -Depth 6 -Compress
