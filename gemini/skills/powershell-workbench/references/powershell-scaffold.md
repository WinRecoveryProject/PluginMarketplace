# Skill: powershell-scaffold

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/powershell-scaffold/SKILL.md`

> Use when asked to generate, extract and compose registered PowerShell components and mixed-language artifacts through archive-first lookup, dependency contracts, parser IDs and a mandatory pre-execution checkpoint.

## Instructions

### PowerShell Scaffold

Use this skill when the user asks to create a PowerShell component or a supporting project artifact.

1. Confirm the artifact kind, name, destination, and project profile from the request or local context. Never assume a project lives at a machine-specific absolute path.
2. Read `references/artifact-catalog.md` to select the artifact and `references/project-profiles.md` when a project profile applies.
3. Search the selected project archive first using the component pipeline; compare purpose/contracts before choosing reuse, adaptation or new code. Run `../../scripts/New-PowerShellArtifact.ps1` with explicit arguments for whole artifacts. Treat `Destination` as a directory. Pass `-ProjectRoot` only when discovery cannot identify the intended project.
4. For reusable code fragments, use `../../scripts/New-PowerShellWorkbenchFragmentTemplate.ps1` to extract explicitly selected function or `#region` fragments, then `../../scripts/Join-PowerShellWorkbenchFragmentTemplate.ps1` to compose them. Both commands default to preview/no-write and must preserve source SHA-256 evidence.
5. Never overwrite an existing file unless the user explicitly requested replacement and `-Force` is passed.
6. Keep generated PowerShell valid in both Windows PowerShell 5.1 and PowerShell 7. Do not introduce PowerShell 7-only syntax unless requested and clearly documented.
7. Apply [component-pipeline.md](powershell-scaffold.md#file-referencescomponent-pipelinemd) to every generated executable artifact, including small fragments, adapted code, tests, functions, scripts and modules. This user-requested checkpoint is mandatory before execution; broader lint/security scans remain opt-in.
8. Read [language-docs.md](powershell-scaffold.md#file-referenceslanguage-docsmd) for language documentation and parser routing. Record unsupported and unavailable parsers honestly; never execute source as a syntax test.
9. Report component IDs, hashes, archive locations, unresolved dependencies and exact validation scope. No global OS/host interception is supplied: enforce the checkpoint in every Workbench-controlled generation/execution path.

Whole-artifact templates are packaged in `assets/templates/`. Code-fragment templates are PowerShell Workbench JSON artifacts generated from explicit local source selectors; do not use the generic Template Creator for executable code templates.

Executable whole-artifact generation and persisted fragment/composition helpers now register draft components. They require Python 3.10+ (`-PythonExecutable` selects the installed runtime), an explicit or project-local `.workbench/components` archive, and subsequent contract review plus the gate. Generation never authorizes execution. Existing fragments without component pins must be re-registered before a verified assembly can be used.

Read [file-types.md](powershell-scaffold.md#file-referencesfile-typesmd) for game-tooling/native file and dialect routing.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "PowerShell Scaffold"
  short_description: "Compose registered PowerShell components"
  icon_small: "./assets/skill-icon.png"
  icon_large: "./assets/skill-icon.png"
  brand_color: "#2671BE"
  default_prompt: "Use $powershell-scaffold to generate or compose registered PowerShell components with a pre-execution checkpoint."
```

### File: `assets/schemas/component.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PowerShell Workbench component record",
  "type": "object",
  "required": [
    "schemaVersion",
    "componentId",
    "version",
    "language",
    "kind",
    "purpose",
    "entryPoint",
    "sha256",
    "contract",
    "dependencies",
    "derivedFrom",
    "provenance",
    "validation"
  ],
  "properties": {
    "schemaVersion": {
      "const": "1.0"
    },
    "componentId": {
      "type": "string",
      "format": "uuid"
    },
    "version": {
      "type": "string",
      "pattern": "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$"
    },
    "language": {
      "enum": [
        "powershell",
        "xml",
        "batch",
        "cmd",
        "lua",
        "python",
        "javascript",
        "typescript",
        "csharp",
        "json",
        "yaml",
        "html",
        "css",
        "bash",
        "sql",
        "toc"
      ]
    },
    "kind": {
      "enum": [
        "fragment",
        "function",
        "script",
        "module",
        "assembly"
      ]
    },
    "purpose": {
      "type": "string",
      "minLength": 1
    },
    "entryPoint": {
      "type": "string",
      "pattern": "^code(\\.[a-z0-9]+)?$"
    },
    "sha256": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "contract": {
      "type": "object",
      "required": [
        "inputs",
        "outputs",
        "bindings",
        "effects",
        "unresolved",
        "reviewed"
      ],
      "properties": {
        "inputs": {
          "type": "array"
        },
        "outputs": {
          "type": "array"
        },
        "bindings": {
          "type": "array"
        },
        "effects": {
          "type": "array"
        },
        "unresolved": {
          "type": "array"
        },
        "reviewed": {
          "type": "boolean"
        }
      }
    },
    "dependencies": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/pin"
      }
    },
    "derivedFrom": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/pin"
      }
    },
    "provenance": {
      "type": "object"
    },
    "validation": {
      "type": "object"
    }
  },
  "$defs": {
    "pin": {
      "type": "object",
      "required": [
        "componentId",
        "version",
        "sha256"
      ],
      "properties": {
        "componentId": {
          "type": "string",
          "format": "uuid"
        },
        "version": {
          "type": "string"
        },
        "sha256": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        }
      }
    }
  }
}
```

### File: `assets/skill-icon.png`

_Binary asset, not embedded._

### File: `assets/templates/PSScriptAnalyzerSettings.psd1.tmpl`

```text
@{
    Severity = @('Error', 'Warning')
    IncludeDefaultRules = $true
    Rules = @{
        PSAvoidUsingCmdletAliases = @{
            Enable = $true
        }
        PSUseCompatibleSyntax = @{
            Enable = $true
            TargetVersions = @('5.1', '7.0')
        }
    }
}
```

### File: `assets/templates/advanced-function-private.ps1.tmpl`

```text
function {{NAME}} {
    [CmdletBinding()]
    param()

    Set-StrictMode -Version 2.0
    $ErrorActionPreference = 'Stop'

    # Private {{PROFILE}} helper. {{LOGGING_GUIDANCE}}
    [pscustomobject]@{
        Name = '{{NAME}}'
        Succeeded = $true
    }
}
```

### File: `assets/templates/advanced-function-public.ps1.tmpl`

```text
function {{NAME}} {
    <#
    .SYNOPSIS
    Performs the {{NAME}} operation.

    .DESCRIPTION
    Dual-compatible {{PROFILE}} function scaffold. {{PATH_HINT}}

    .OUTPUTS
    PSCustomObject
    #>
    [CmdletBinding()]
    param()

    Set-StrictMode -Version 2.0
    $ErrorActionPreference = 'Stop'

    # {{SAFETY_GUIDANCE}}
    [pscustomobject]@{
        Name = '{{NAME}}'
        Profile = '{{PROFILE}}'
        Succeeded = $true
    }
}
```

### File: `assets/templates/contract.json.tmpl`

```text
{
  "schemaVersion": 1,
  "name": "{{NAME}}",
  "profile": "{{PROFILE}}",
  "created": "{{DATE}}",
  "projectRoot": {{PROJECT_ROOT_JSON}},
  "executable": false,
  "inputs": [],
  "outputs": [],
  "safety": "{{SAFETY_GUIDANCE}}"
}
```

### File: `assets/templates/decision.md.tmpl`

```text
# ADR: {{NAME}}

- Date: {{DATE}}
- Profile: {{PROFILE}}
- Status: Proposed

## Context

Describe the constraint or behavior that requires a durable decision.

## Decision

State the selected design and its compatibility boundary.

## Consequences

Record benefits, costs, migration needs, and rejected alternatives.

## Safety

{{SAFETY_GUIDANCE}}
```

### File: `assets/templates/help.md.tmpl`

```text
# about_{{NAME}}

## Short description

Explain the purpose of {{NAME}} for the {{PROFILE}} profile.

## Long description

Document inputs, outputs, expected files, compatibility, and failure behavior.

## Safety and compatibility

{{SAFETY_GUIDANCE}}

The implementation supports Windows PowerShell 5.1 and PowerShell 7.

## Examples

Provide read-only or `-WhatIf` examples before mutating examples.
```

### File: `assets/templates/manifest.psd1.tmpl`

```text
@{
    RootModule = '{{NAME}}.psm1'
    ModuleVersion = '0.1.0'
    GUID = '{{GUID}}'
    Author = 'Zilvereyes'
    CompanyName = 'Independent'
    Copyright = '(c) Zilvereyes. All rights reserved.'
    Description = '{{NAME}} PowerShell module.'
    PowerShellVersion = '5.1'
    FunctionsToExport = @()
    CmdletsToExport = @()
    VariablesToExport = @()
    AliasesToExport = @()
    PrivateData = @{
        PSData = @{
            Tags = @('PowerShell', '{{PROFILE}}')
        }
    }
}
```

### File: `assets/templates/mega-linter.yml.tmpl`

```text
APPLY_FIXES: none
ENABLE:
  - POWERSHELL
  - MARKDOWN
  - JSON
  - YAML
FILTER_REGEX_EXCLUDE: '(^|[\\/])(vendor|generated|node_modules)([\\/]|$)'
PRINT_ALL_FILES: false
SHOW_ELAPSED_TIME: true
```

### File: `assets/templates/module.psm1.tmpl`

```text
Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$privatePath = Join-Path $PSScriptRoot 'Private'
$publicPath = Join-Path $PSScriptRoot 'Public'

if (Test-Path -LiteralPath $privatePath) {
    Get-ChildItem -LiteralPath $privatePath -Filter '*.ps1' -File | Sort-Object Name | ForEach-Object { . $_.FullName }
}

$publicFunctions = @()
if (Test-Path -LiteralPath $publicPath) {
    $publicFiles = @(Get-ChildItem -LiteralPath $publicPath -Filter '*.ps1' -File | Sort-Object Name)
    $publicFiles | ForEach-Object { . $_.FullName }
    $publicFunctions = @($publicFiles | ForEach-Object { $_.BaseName })
}

Export-ModuleMember -Function $publicFunctions
```

### File: `assets/templates/pester-basic.tests.ps1.tmpl`

```text
BeforeAll {
    $script:TargetName = '{{NAME}}'
}

Describe '{{NAME}} basic behavior' {
    It 'uses the expected project profile' {
        '{{PROFILE}}' | Should -Not -BeNullOrEmpty
    }

    It 'has no unresolved template tokens' {
        $script:TargetName | Should -Not -Match '\{\{.+\}\}'
    }
}
```

### File: `assets/templates/pester-contract.tests.ps1.tmpl`

```text
BeforeAll {
    $script:ContractName = '{{NAME}}'
    $script:ExpectedProfile = '{{PROFILE}}'
}

Describe '{{NAME}} source contract' {
    It 'declares a stable contract identity' {
        $script:ContractName | Should -Match '^[A-Za-z][A-Za-z0-9_.-]*$'
    }

    It 'declares a supported profile' {
        $script:ExpectedProfile | Should -BeIn @('Generic', 'RecoveryToolkit', 'WingetDownloader')
    }
}
```

### File: `assets/templates/pester-synthetic.tests.ps1.tmpl`

```text
BeforeAll {
    $script:TestRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('{{NAME}}-' + [guid]::NewGuid().Guid)
    $null = New-Item -ItemType Directory -Path $script:TestRoot -Force
}

AfterAll {
    if (Test-Path -LiteralPath $script:TestRoot) {
        Remove-Item -LiteralPath $script:TestRoot -Recurse -Force
    }
}

Describe '{{NAME}} synthetic behavior' {
    It 'keeps synthetic writes inside the temporary boundary' {
        [System.IO.Path]::GetFullPath($script:TestRoot).StartsWith([System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()), [System.StringComparison]::OrdinalIgnoreCase) | Should -BeTrue
    }
}
```

### File: `assets/templates/powershell-quality.yml.tmpl`

```text
name: PowerShell quality

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  powershell:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - name: Install quality modules
        shell: pwsh
        run: |
          Install-Module PSScriptAnalyzer -RequiredVersion 1.25.0 -Repository PSGallery -Scope CurrentUser
          Install-Module Pester -RequiredVersion 5.9.1 -Repository PSGallery -Scope CurrentUser
      - name: Analyze PowerShell
        shell: pwsh
        run: Invoke-ScriptAnalyzer -Path . -Recurse -Settings ./PSScriptAnalyzerSettings.psd1 -EnableExit
      - name: Test with PowerShell 7
        shell: pwsh
        run: Invoke-Pester -Path ./Tests -CI
      - name: Parse with Windows PowerShell 5.1
        shell: powershell
        run: |
          $errors = @()
          Get-ChildItem -Path . -Include *.ps1,*.psm1,*.psd1 -Recurse -File | ForEach-Object {
            $tokens = $null
            $parseErrors = $null
            [void][System.Management.Automation.Language.Parser]::ParseFile($_.FullName, [ref]$tokens, [ref]$parseErrors)
            $errors += $parseErrors
          }
          if ($errors.Count -gt 0) { $errors | Format-List; exit 1 }
```

### File: `assets/templates/script.ps1.tmpl`

```text
<#
.SYNOPSIS
Runs the {{NAME}} workflow.

.DESCRIPTION
Dual-compatible {{PROFILE}} entry script created on {{DATE}}. {{SAFETY_GUIDANCE}}
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$OutputPath
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

[pscustomobject]@{
    Name = '{{NAME}}'
    Profile = '{{PROFILE}}'
    OutputPath = $OutputPath
    Changed = $false
}
```

### File: `references/artifact-catalog.md`

#### Artifact catalog

`New-PowerShellArtifact.ps1` accepts these `-Kind` values:

| Kind                     | Output                                                                                      |
|--------------------------|---------------------------------------------------------------------------------------------|
| `AdvancedFunction`       | `<Name>.ps1`; uses the private variant when the destination is inside a `Private` directory |
| `Script`                 | `<Name>.ps1`                                                                                |
| `Module`                 | `<Name>.psm1`                                                                               |
| `Manifest`               | `<Name>.psd1` with an explicit, empty export list                                           |
| `PesterBasic`            | Profile-appropriate basic test filename                                                     |
| `PesterSynthetic`        | Profile-appropriate synthetic test filename with temporary-path cleanup                     |
| `PesterContract`         | Profile-appropriate source-contract test filename                                           |
| `JsonContract`           | `<Name>.contract.json`                                                                      |
| `MarkdownDecision`       | `ADR-<Name>.md`                                                                             |
| `MarkdownHelp`           | `about_<Name>.md`                                                                           |
| `PSScriptAnalyzerConfig` | `PSScriptAnalyzerSettings.psd1`                                                             |
| `MegaLinterConfig`       | `.mega-linter.yml`                                                                          |
| `GitHubWorkflow`         | `powershell-quality.yml`                                                                    |

The generator replaces `NAME`, `PROFILE`, `DATE`, `GUID`, `PROJECT_ROOT`, `PROJECT_ROOT_JSON`, `PATH_HINT`, `TEST_STYLE`, `LOGGING_GUIDANCE`, and `SAFETY_GUIDANCE` tokens.
`PROJECT_ROOT_JSON` is a complete JSON string literal so Windows paths remain valid. It discovers a project root from the destination or optional per-machine registry; `-ProjectRoot` is an explicit override. Configuration artifact kinds still require `-Name` so generated metadata remains attributable.

##### Fragment templates

`New-PowerShellWorkbenchFragmentTemplate.ps1` creates hash-bound JSON templates from explicitly selected PowerShell functions and `#region` blocks. It defaults to preview/no-write and records the source relative path, source SHA-256, fragment line numbers, fragment text, and fragment SHA-256.

`Join-PowerShellWorkbenchFragmentTemplate.ps1` composes one or more fragment templates into a PowerShell script. It verifies that every source file still matches the recorded SHA-256, rejects conflicting duplicate fragments, validates the composed script with the PowerShell parser, and defaults to preview/no-write. Generation performs no execution or transport.

##### Registered components

Executable artifacts now require installed Python 3.10+ and register draft components, returning ComponentId, ComponentVersion and ComponentArchive with the FileInfo. Use -ComponentArchive to select the project archive and -PythonExecutable to select the runtime. Persisted fragments gain componentId/componentVersion/componentSha256; composed scripts register assembly IDs and known member pins. Preview remains no-write. Registration is not execution clearance. See component-pipeline.md.

### File: `references/component-pipeline.md`

#### Component pipeline v1

PowerShell Workbench is the owning tool. Do not route this workflow into a separate plugin.
Mutable project archives live in a chosen project, never in the plugin cache. Python 3.10+
is required for the packaged archive worker. Do not silently install missing runtimes.

##### Commands

Use argument arrays from PowerShell; Python commands below show the CLI surface. Paths are
examples to replace with actual project paths. The worker is scripts/workbench_components.py.

```text
python workbench_components.py search --archive <archive> --query "purpose keywords"
python workbench_components.py parse --source <file> --language powershell
python workbench_components.py register --archive <archive> --source <file> --language powershell --purpose "specific purpose" --kind function --contract <contract.json>
python workbench_components.py gate --archive <archive> --component-id <uuid> --version 1.0.0 --source <actual-file-to-be-run>
```

PowerShell entrypoint: `Invoke-PowerShellWorkbenchComponent.ps1 -Action <action>
-ArgumentList <string-array> -PythonExecutable <installed-python>`.

Search first. Compare compatible inputs/outputs, dependencies, side effects, runtime target,
provenance and checks; similarity scoring is keyword ranking, not semantic proof. Reuse an
unchanged registration; adapt a differing purpose with a new UUID and --derived-from JSON
pins. For a compatible revision use --component-id plus an increased --version. Never
rewrite a published ID/version. Source records are immutable snapshots with exact-byte hashes.
The registration lock serializes writes; an interrupted lock requires inspection, not automatic deletion.

##### Contract

Required JSON fields: inputs, outputs, bindings, effects, unresolved (arrays), reviewed (boolean).
A reviewed contract is an agent's explicit review declaration, not an automatic semantic proof.
Document each input's type/default/validation, output shape/stream, scope binding read/write,
external command/module, filesystem/registry/network effects, error/exit/return semantics,
elevation/reboot needs, target runtime and unresolved observations. Optional fields may add
provenance, license, tests, exports and version-specific details. Never store secrets.

Start generated templates with reviewed=false and unresolved items. After reviewing, register
a new version with a resolved contract. --dependencies and --derived-from accept paths to
JSON arrays of exact componentId/version/sha256 pins. Register both assembly and members;
missing member provenance or pins must remain unresolved, never silently asserted complete.

##### Dependency extraction

Use Get-PowerShellWorkbenchCodeAnalysis.ps1 for a non-executing AST inventory of variables,
assignments, functions and commands. It is not a complete scope/data-flow analyzer. Examine
callers, script/global/env/preference/automatic variables, aliases, splatting, closures,
reference mutation, dot-sourcing, dynamic invocation, pipeline and error streams and finally
blocks. Turn implicit inputs/outputs into explicit parameters/results only when behavior is
preserved. Keep inseparable statements as a composite unit. Record unknown dependencies.

Legacy fragment helpers preserve source hashes and now register persisted fragments. A
composition registers its own assembly ID and member pins. Legacy fragments without pins
remain draft; re-extract/register them before resolving the assembly contract. Assembly
ordering, exports, variable collisions and behavior require review/tests; syntax alone is
insufficient. Modules must not acquire import-time mutations.

##### Mandatory checkpoint before execution

For any generated or changed executable code: search -> adapt/generate -> register -> review
contract and dependency closure -> parser/test as applicable -> gate using exact current
source bytes -> authorized execution through the target project's existing runner. On any
edit, re-register and repeat. For multi-file modules check all executable members and assembly
pins, not just the entry point. Verify the gate's nonzero exit code blocks the caller.

Gate rehashes every snapshot, verifies exact dependency pins, rejects cycles and missing
records, requires reviewed/resolved declarations and reruns each native syntax adapter.
It compares the actual target file to its registered bytes. A gate is a point-in-time check;
freeze the execution artifact or recheck immediately before launch. It does not itself launch
code, grant operational authorization, prove behavioral safety or intercept external shells.
Unsupported/missing parsers remain UNAVAILABLE and block the checkpoint; no bypass flag exists.
Run target-specific behavior tests before operational reuse, mocking system mutations.

##### Parser components

Read ../../../assets/component-parser-catalog.json relative to the skill references folder.
Each of 15 language adapters has a stable UUID and exact implementation hash. PowerShell
uses the installed pwsh or powershell.exe AST parser; XML uses well-formedness parsing with
DTD/entities prohibited; Python uses ast.parse; JSON is strict; JavaScript uses Node --check
on frozen .cjs/.mjs input; Lua uses luac -p. Runtime versions differ from language coverage:
record the actual target version and repeat tests on each supported host. Batch/CMD,
TypeScript, C#, YAML, HTML, CSS, Bash and SQL have registered adapter contracts whose native
implementations are not yet bundled. Never mark these reserved contracts as working parsers.

Built-in parser catalog is read-only package metadata; project components use the mutable
archive worker. Catalog hashes are integrity labels, not signatures or an untrusted-user sandbox.

### File: `references/file-types.md`

#### File-type routing

Read ../../../assets/file-type-routes.json from this skill reference directory. Extension routing selects a candidate adapter, not proof of validation. Do not run source or build projects to discover their types. Inspect file content, project manifests and native toolchain first. Dialects such as JSONC, JSX, TSX, XML project files and WoW TOC need their additional contracts; never substitute a nearby parser and report full support. Binary game assets stay scoped to native readers and exact game-build provenance.

### File: `references/language-docs.md`

#### Shared language documentation workflow

Keep PowerShell, DISM, update and Ollama research on the existing authoritative documentation
catalog. New language seeds are canonical in assets/language-documentation-catalog.json at
the plugin root; do not duplicate project topic notes inside the plugin. New seeds do not
refresh the older catalog's verifiedAtUtc timestamp.

Identify language/runtime version, host application, platform and intended operation. Open
relevant primary specifications or product docs before technical claims. Record exact URL,
check date, applicability, documented behavior, observation, inference, test evidence and
limitations. A source seed or opened index is not verification of all linked topics.

Separate XML well-formedness, namespaces, XSD and application behavior; C# XML-doc comments
are a different topic. Batch and interactive CMD share cmd.exe but percent variables,
expansion and quoting differ by context. Never use cmd /c to syntax-test arbitrary source.
For Lua distinguish 5.1-5.4, LuaJIT and embedded game APIs; Lua 5.4 parser success does not
prove WoW runtime compatibility. For JavaScript distinguish ESM/CommonJS and browser/Node.
For SQL identify the vendor before using the T-SQL seed. HTML/CSS parse acceptance is not
browser rendering verification. YAML custom constructors can execute code: do not use unsafe loaders.

Documentation records link to component UUID/version/hash. Language coverage is extensible;
new languages need a docs entry, adapter ID, non-executing parser contract, fixtures, runtime
version policy and validated behavior before their checkpoint can pass. Follow the current
Windows DISM Update Docs execution/research distinction for servicing questions without
copying its machine-specific library location.

### File: `references/project-profiles.md`

#### Project profiles

Resolve the active project with `../../scripts/Resolve-PowerShellWorkbenchContext.ps1`. It walks upward from the active path, then checks an optional registry at `%USERPROFILE%\.config\powershell-workbench\projects.json` or the path in `POWERSHELL_WORKBENCH_PROJECTS`. Do not require any path from another workstation.

##### Generic

Use portable paths, explicit exports, comment-based help, structured objects, and Pester 5 syntax. Keep implementation compatible with Windows PowerShell 5.1 and PowerShell 7. When PowerShell orchestrates Python, Node, .NET, native tools, web assets, or data files, preserve the native component boundary and pass structured data through files, streams, or explicit process arguments.

##### RecoveryToolkit

Identify this profile by `RecoveryToolkit.psd1` or explicit selection. Use split public functions in domain folders, private helpers under `Private`, discoverable `Test-<Name>.<Type>.ps1` names, explicit exports, local safe-path boundaries, contract-first behavior, and synthetic temporary data for write-oriented tests. Preserve non-executable servicing and staging contracts.

##### WingetDownloader

Identify this profile by `WingetDownloader.psd1` or explicit selection. Treat `WingetDownloader.psm1` and `WingetDownloader.psd1` as authoritative. Use `WD`-prefixed helpers, structured status and error objects, deterministic cache/hash handling, explicit exports, and Pester coverage. The chat knowledge base and backlog are secondary evidence only.

##### Optional project registry

Use this shape only when ancestor discovery is insufficient:

```json
{
  "projects": [
    { "name": "RecoveryToolkit", "profile": "RecoveryToolkit", "path": "D:\\Projects\\RecoveryToolkit" },
    { "name": "WingetDownloader", "profile": "WingetDownloader", "path": "D:\\Modules\\WingetDownloader" }
  ]
}
```
