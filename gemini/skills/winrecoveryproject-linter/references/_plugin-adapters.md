# Plugin files: winrecoveryproject-linter — `adapters/`

Source: `plugins/winrecoveryproject-linter`. Files outside the `skills/*` folders, embedded as text.

## File: `adapters/extract-shellcheck.ps1`

```powershell
param([Parameter(Mandatory)][string]$Archive, [Parameter(Mandatory)][string]$Destination)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($Archive)
try {
    $entry = @($zip.Entries | Where-Object { $_.FullName -eq 'shellcheck.exe' })
    if ($entry.Count -ne 1) { throw 'Expected exactly one shellcheck.exe entry' }
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry[0], (Join-Path $Destination 'shellcheck.exe'), $true)
} finally { $zip.Dispose() }
```

## File: `adapters/powershell.ps1`

```powershell
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
```

## File: `adapters/python-syntax.py`

```python
"""Parse JSON text snapshots with Python's grammar, without imports from the target."""
import ast
import json
import re
import sys

results = []
# Node's snapshot protocol is UTF-8 regardless of Windows' default pipe text
# codec. Reading the text wrapper can introduce surrogateescape characters.
for item in json.loads(sys.stdin.buffer.read().decode("utf-8", errors="strict")):
    try:
        # JSON can carry lone surrogates even though Python source must be
        # encodable. Reject that snapshot without losing the rest of the batch.
        item["content"].encode("utf-8")
    except UnicodeEncodeError as error:
        before = item["content"][:error.start]
        lines = re.split(r"\r\n|\r|\n", before)
        results.append({"file": item["file"], "line": len(lines),
                        "column": len(lines[-1]) + 1, "rule": "python-encoding",
                        "severity": "error", "incomplete": True,
                        "message": "Source contains an unpaired Unicode surrogate; Python parsing was not completed."})
        continue
    try:
        ast.parse(item["content"], filename=item["file"])
    except UnicodeEncodeError:
        results.append({"file": item["file"], "line": 1, "column": 1,
                        "rule": "python-encoding", "severity": "error",
                        "incomplete": True,
                        "message": "Python could not encode this snapshot; parsing was not completed."})
    except SyntaxError as error:
        results.append({"file": item["file"], "line": error.lineno or 1,
                        "column": error.offset or 1, "rule": "python-syntax",
                        "severity": "error", "message": error.msg})
json.dump(results, sys.stdout, ensure_ascii=True)
```
