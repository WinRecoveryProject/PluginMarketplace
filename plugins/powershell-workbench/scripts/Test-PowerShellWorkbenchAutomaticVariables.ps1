[CmdletBinding()]
param(
    [Parameter(Mandatory,ValueFromPipeline,ValueFromPipelineByPropertyName)][Alias('FullName')][string[]]$Path,
    [switch]$NoThrow,
    [switch]$AsJson
)

begin {
    Set-StrictMode -Version 2.0
    $ErrorActionPreference='Stop'
    $protected=@{home='homeEntry';host='hostInfo';pid='processId';error='parseError';args='arguments';input='inputValue';matches='matchResult';pshome='powerShellHome';executioncontext='executionContextInfo';myinvocation='invocationInfo'}
    $diagnostics=New-Object System.Collections.Generic.List[object]

    function Get-WorkbenchAssignmentVariable {
        param([Management.Automation.Language.Ast]$Node)
        if($Node -is [Management.Automation.Language.VariableExpressionAst]){$Node;return}
        if($Node -is [Management.Automation.Language.ConvertExpressionAst] -or $Node -is [Management.Automation.Language.AttributedExpressionAst]){
            Get-WorkbenchAssignmentVariable -Node $Node.Child
            return
        }
        if($Node -is [Management.Automation.Language.ArrayLiteralAst]){
            foreach($element in $Node.Elements){Get-WorkbenchAssignmentVariable -Node $element}
        }
        # Index/member expressions only read their child variables; do not treat
        # those children (or variables on the RHS) as assignment targets.
    }
    $candidatePaths=New-Object System.Collections.Generic.List[string]
}
process {
    foreach($candidate in $Path){$candidatePaths.Add($candidate)}
}
end {
    # Windows PowerShell 5.1 can skip process for -File with redirected empty
    # stdin. Explicitly bound paths must still be checked, never silently pass.
    if($candidatePaths.Count -eq 0 -and $PSBoundParameters.ContainsKey('Path')){
        foreach($candidate in $Path){$candidatePaths.Add($candidate)}
    }
    if($candidatePaths.Count -eq 0){throw 'No paths were supplied for automatic-variable checks.'}
    foreach($candidate in $candidatePaths){
        $resolved=(Resolve-Path -LiteralPath $candidate -ErrorAction Stop).Path;$tokens=$null;$errors=$null
        $ast=[Management.Automation.Language.Parser]::ParseFile($resolved,[ref]$tokens,[ref]$errors)
        foreach($assignment in $ast.FindAll({param($node)$node -is [Management.Automation.Language.AssignmentStatementAst]},$true)){
            foreach($variable in @(Get-WorkbenchAssignmentVariable -Node $assignment.Left)){
                $name=($variable.VariablePath.UserPath -replace '^(?i:(global|script|local|private):)','').ToLowerInvariant()
                if($protected.ContainsKey($name)){
                    $displayVariable = '$'+$name
                    $displayReplacement = '$'+[string]$protected[$name]
                    $message = "Assignment to protected automatic variable '{0}'. Use '{1}' instead." -f $displayVariable, $displayReplacement
                    $diagnostics.Add([pscustomobject]@{Path=$resolved;Line=$variable.Extent.StartLineNumber;Column=$variable.Extent.StartColumnNumber;Variable='$'+$variable.VariablePath.UserPath;SuggestedReplacement='$'+$protected[$name];Rule='PSWorkbench.ProtectedAutomaticVariable';Message=$message})
                }
            }
        }
    }
    $result=[pscustomobject]@{SchemaVersion='1.0';Passed=($diagnostics.Count -eq 0);Diagnostics=@($diagnostics.ToArray())}
    if($AsJson){$result|ConvertTo-Json -Depth 6}else{$result}
    if(-not $result.Passed -and -not $NoThrow){throw "Protected automatic-variable assignments were found: $($diagnostics.Count)"}
}
