# Plugin files: powershell-workbench — manifests and top-level files

Source: `plugins/powershell-workbench`. Files outside the `skills/*` folders, embedded as text.

## File: `LICENSE`

```text
MIT License

Copyright (c) 2026 Zilvereyes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## File: `PRIVACY.md`

### Privacy

PowerShell Workbench runs through Codex against files and tools that the user explicitly makes available. Zilvereyes does not operate a separate hosted telemetry, credential-storage, or analytics service for this plugin.

The plugin may read or change workspace files only as part of an authorized task. Codex, GitHub, package providers, and any other connected services remain governed by their own privacy policies and account settings.

Do not place passwords, access tokens, private keys, or other secrets in source files, issues, prompts, or logs.

## File: `README.md`

### PowerShell Workbench

Portable Codex plugin for PowerShell-centered and mixed-language project development.

PowerShell Workbench provides reusable PowerShell scaffolding, discovery, refactoring, environment diagnosis, agent-harness development, documentation routing and opt-in quality workflows. Potentially mutating or expensive gates remain explicit rather than running automatically.

#### Package layout

- `.codex-plugin/plugin.json` — Codex plugin manifest.
- `plugin.json` — portable plugin manifest.
- `skills/` — PowerShell and mixed-language workflows.
- `scripts/` — bounded helper tools used by those workflows.
- `assets/` — plugin identity, privacy and terms assets.

#### License

MIT. See `LICENSE`.

Version 0.9.0-beta.3 makes skill activation conditions explicit and adds
research-only boundaries to language documentation skills. Runtime tooling and
provider connections are unchanged.

Version 0.9.0-beta.4 fixes explicit automatic-variable scan paths under Windows PowerShell 5.1 -File with redirected stdin. Direct invocation and pipeline inputs are tested in both supported PowerShell hosts.

Version 0.9.0-beta.5 also rejects typed, attributed and tuple assignments to
protected automatic variables. RHS/index/member reads remain allowed. Regression
contracts pass in Windows PowerShell 5.1 and PowerShell 7; no project source is executed.

## File: `TERMS.md`

### Terms of Service

PowerShell Workbench is provided under the MIT License and on an "as is" basis, without warranty.

The user controls when the plugin is invoked and is responsible for reviewing generated files, proposed edits, commands, dependency changes, and destructive actions before they are accepted or executed.

Third-party platforms, tools, packages, and services retain their own terms, availability, permissions, and usage limits.

## File: `plugin.json`

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "author": {
    "name": "Zilvereyes"
  },
  "description": "Portable PowerShell and mixed-language scaffolding, refactoring, discovery, agent harnesses, game tooling, and opt-in quality workflows.",
  "extensions": {
    "com.openai": {
      "interface": {
        "capabilities": [
          "Interactive",
          "Write"
        ],
        "category": "Productivity",
        "composerIcon": "./assets/composer-128.png",
        "defaultPrompt": [
          "Create a dual-compatible PowerShell function.",
          "Diagnose this project with the read-only Doctor, quality gate, and text-integrity checks.",
          "Preview a hash-bound project assessment before writing any project profile sidecar."
        ],
        "developerName": "Zilvereyes",
        "displayName": "PowerShell Workbench",
        "logo": "./assets/logo-512.png",
        "longDescription": "Generate reusable PowerShell artifacts, discover and refactor single or multi-project workspaces, diagnose toolchains and patch transport, build safe PowerShell agent harnesses, package the plugin for another machine, and run quality or security gates only when requested.",
        "privacyPolicyURL": "https://github.com/WinRecoveryProject/PowerShellWorkbench/blob/main/PRIVACY.md",
        "shortDescription": "Portable PowerShell tooling",
        "termsOfServiceURL": "https://github.com/WinRecoveryProject/PowerShellWorkbench/blob/main/TERMS.md",
        "websiteURL": "https://github.com/WinRecoveryProject/PowerShellWorkbench"
      }
    }
  },
  "homepage": "https://github.com/WinRecoveryProject/PowerShellWorkbench",
  "keywords": [
    "PowerShell",
    "Workbench",
    "Tooling"
  ],
  "license": "MIT",
  "name": "powershell-workbench",
  "repository": "https://github.com/WinRecoveryProject/PowerShellWorkbench.git",
  "version": "0.9.0-beta.6"
}
```
