# PowerShell guidance

Use this reference for PowerShell scripts and modules. First inspect `#Requires` lines, module manifests (`.psd1`), repository instructions, CI and existing tests. Establish which hosts must run the code: Windows PowerShell 5.1, PowerShell 7, or both.

## Implementation focus

- Keep both hosts working when both are supported: avoid PowerShell 7-only syntax (`??`, `?.`, ternary `? :`, `&&`/`||` pipeline chains, `ForEach-Object -Parallel`) in code that must run on 5.1.
- Start scripts with `Set-StrictMode -Version Latest` and `$ErrorActionPreference = 'Stop'` when the project does; non-terminating errors otherwise continue silently.
- Native commands do not throw on failure. Check `$LASTEXITCODE` after each one that matters.
- Use `-LiteralPath` for paths that can contain `[`, `]` or `*`, and resolve roots from parameters or `$PSScriptRoot`, never from the current directory or a hard-coded drive.
- Do not assign to automatic variables (`$input`, `$args`, `$PSItem`, `$Error`, `$host`, `$matches`).
- Be explicit about text encoding: Windows PowerShell 5.1 writes UTF-16 or ANSI by default and reads BOM-less files as ANSI; PowerShell 7 defaults to UTF-8 without BOM.
- Wrap single results in `@()` when the caller expects an array; a pipeline returning one item yields a scalar.
- Keep destructive actions behind `SupportsShouldProcess` (`-WhatIf`/`-Confirm`) and explicit parameters.

## Validation

Use the project's configured checks. A common baseline is a parser check of every script in each supported host, `Invoke-ScriptAnalyzer` with the project settings, and Pester or the repository's own `Test-*.ps1` scripts run in both hosts. Do not run scripts that change the system, install drivers or touch the registry as part of validation unless the user authorized that environment.

## QA watch list

- paths with spaces, brackets and non-ASCII characters; UNC and long paths
- 5.1 versus 7 differences in encoding, `ConvertTo-Json`/`ConvertFrom-Json`, and `Start-Process` argument quoting
- exit codes from native tools and from `exit` inside scripts called with `&`
- execution policy, elevation, and 32- versus 64-bit hosts
- scheduled-task or service contexts with a different user profile and working directory
