# Plugin files: component-forge — manifests and top-level files

Source: `plugins/component-forge`. Files outside the `skills/*` folders, embedded as text.

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

Component Forge runs through Codex against files and tools that the user explicitly makes available. Zilvereyes does not operate a separate hosted telemetry, credential-storage, or analytics service for this plugin.

The plugin may read or change workspace files only as part of an authorized task. Codex, GitHub, and any other connected services remain governed by their own privacy policies and account settings.

Do not place passwords, access tokens, private keys, or other secrets in source files, issues, prompts, or logs.

## File: `README.md`

### Component Forge

Archive-first PowerShell component extraction, dependency contracts, composition and evidence-based documentation workflows.

Component Forge helps an agent inventory bounded source material, preserve originals, extract reusable components with explicit dependencies and document what has actually been tested. It does not claim to be an automatic parser or Windows servicing engine.

#### Package layout

- `.codex-plugin/plugin.json` — Codex plugin manifest.
- `plugin.json` — portable plugin manifest.
- `skills/` — component archive and documentation workflows.
- `assets/` — plugin identity assets.

#### License

MIT. See `LICENSE`.

## File: `TERMS.md`

### Terms of Service

Component Forge is provided under the MIT License and on an "as is" basis, without warranty.

The user controls when the plugin is invoked and is responsible for reviewing generated files, proposed edits, commands, and destructive actions before they are accepted or executed.

Third-party platforms, tools, and services retain their own terms, availability, permissions, and usage limits.

## File: `plugin.json`

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "author": {
    "email": "zilver.muhlig.hansen@gmail.com",
    "name": "Zilvereyes"
  },
  "description": "Archive-first PowerShell component extraction, dependency contracts, composition and evidence-based documentation workflows.",
  "license": "MIT",
  "repository": "https://github.com/WinRecoveryProject/Component-Forge",
  "extensions": {
    "com.openai": {
      "interface": {
        "capabilities": [],
        "category": "Developer Tools",
        "defaultPrompt": "Brug komponentarkivet først. Undersøg afhængigheder, opret sporbare PowerShell-komponenter og registrér afprøvede varianter.",
        "developerName": "Zilvereyes",
        "displayName": "Component Forge",
        "websiteURL": "https://github.com/WinRecoveryProject/Component-Forge",
        "privacyPolicyURL": "https://github.com/WinRecoveryProject/Component-Forge/blob/main/PRIVACY.md",
        "termsOfServiceURL": "https://github.com/WinRecoveryProject/Component-Forge/blob/main/TERMS.md",
        "logo": "./assets/logo-512.png",
        "composerIcon": "./assets/composer-128.png",
        "longDescription": "Guide an agent through scoped source inventory, dependency-aware component extraction, archive-first generation and composition. Includes contracts and evaluation scenarios. Does not supply an automatic parser or servicing engine.",
        "shortDescription": "PowerShell komponentbyggesæt"
      }
    }
  },
  "name": "component-forge",
  "version": "0.1.3"
}
```
