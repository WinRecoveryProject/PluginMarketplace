#Requires -Version 5.1
<#
.SYNOPSIS
    Regenerates the Gemini skill folders and copies the chosen ones to an upload folder.

.DESCRIPTION
    Runs scripts/build-gemini-skills.mjs (requires Node.js 18+) so gemini/skills matches
    the current plugins/ content, then copies the requested skill folders to -Destination.
    Each copied folder can be dragged straight into Gemini: Customize > Skills > Upload skill.
    With -Zip each folder is also packed as <name>.zip next to it.

.EXAMPLE
    .\gemini\Export-GeminiSkill.ps1 -List

.EXAMPLE
    .\gemini\Export-GeminiSkill.ps1 -Name plugin-marketplace, codex-dev-workflows -Destination "$env:USERPROFILE\Desktop\gemini-skills"

.EXAMPLE
    .\gemini\Export-GeminiSkill.ps1 -All -Zip
#>
[CmdletBinding(DefaultParameterSetName = 'Named')]
param(
    [Parameter(ParameterSetName = 'Named', Position = 0)]
    [string[]] $Name = @('plugin-marketplace'),

    [Parameter(ParameterSetName = 'All', Mandatory)]
    [switch] $All,

    [Parameter(ParameterSetName = 'List', Mandatory)]
    [switch] $List,

    [string] $Destination = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'gemini-skills'),

    [switch] $Zip,

    [switch] $SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot  = Split-Path -Parent $PSScriptRoot
$skillsDir = Join-Path $PSScriptRoot 'skills'
$builder   = Join-Path $repoRoot 'scripts\build-gemini-skills.mjs'

if (-not $SkipBuild) {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        throw 'Node.js was not found on PATH. Install Node.js 18+ or rerun with -SkipBuild to use the committed gemini\skills folders.'
    }
    & $node.Source $builder
    if ($LASTEXITCODE -ne 0) { throw "build-gemini-skills.mjs failed with exit code $LASTEXITCODE." }
}

if (-not (Test-Path -LiteralPath $skillsDir)) {
    throw "No generated skills found at '$skillsDir'."
}

$available = Get-ChildItem -LiteralPath $skillsDir -Directory | Sort-Object Name

if ($List) {
    $available | ForEach-Object {
        $files = Get-ChildItem -LiteralPath $_.FullName -Recurse -File
        [pscustomobject]@{
            Skill  = $_.Name
            Files  = $files.Count
            SizeKB = [math]::Round((($files | Measure-Object Length -Sum).Sum) / 1KB)
        }
    } | Format-Table -AutoSize
    return
}

$selected = if ($All) { $available } else {
    foreach ($n in $Name) {
        $match = $available | Where-Object Name -EQ $n
        if (-not $match) {
            throw "Unknown skill '$n'. Run with -List to see the available skills."
        }
        $match
    }
}

New-Item -ItemType Directory -Path $Destination -Force | Out-Null

foreach ($skill in $selected) {
    $target = Join-Path $Destination $skill.Name
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }
    Copy-Item -LiteralPath $skill.FullName -Destination $target -Recurse
    Write-Host "Ready for upload: $target"

    if ($Zip) {
        $zipPath = "$target.zip"
        if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
        Compress-Archive -Path (Join-Path $target '*') -DestinationPath $zipPath
        Write-Host "  Zip: $zipPath"
    }
}

Write-Host ''
Write-Host 'Gemini: Customize > Skills > Upload skill, then choose one folder at a time.'
