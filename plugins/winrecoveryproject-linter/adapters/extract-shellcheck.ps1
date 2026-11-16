param([Parameter(Mandatory)][string]$Archive, [Parameter(Mandatory)][string]$Destination)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($Archive)
try {
    $entry = @($zip.Entries | Where-Object { $_.FullName -eq 'shellcheck.exe' })
    if ($entry.Count -ne 1) { throw 'Expected exactly one shellcheck.exe entry' }
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry[0], (Join-Path $Destination 'shellcheck.exe'), $true)
} finally { $zip.Dispose() }
