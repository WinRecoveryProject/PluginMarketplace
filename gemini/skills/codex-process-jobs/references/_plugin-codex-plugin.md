# Plugin files: codex-process-jobs — `.codex-plugin/`

Source: `plugins/codex-process-jobs`. Files outside the `skills/*` folders, embedded as text.

## File: `.codex-plugin/plugin.json`

```json
{
  "interface": {
    "displayName": "Codex Process Jobs",
    "shortDescription": "Detached process jobs",
    "composerIcon": "./assets/icon.png",
    "logo": "./assets/icon.png",
    "longDescription": "Launch long-running local commands as tracked detached process groups, inspect bounded output, wait for completion, retrieve results, and cancel safely on macOS or Linux. On Windows, use the bundled host-managed execution fallback; the CPJ controller remains macOS/Linux-only.",
    "developerName": "Joel Farthing",
    "category": "Developer Tools",
    "websiteURL": "https://filamentlabs.io/CPJ/",
    "privacyPolicyURL": "https://filamentlabs.io/CPJ/privacy",
    "termsOfServiceURL": "https://filamentlabs.io/CPJ/terms",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "defaultPrompt": [
      "Run this build as a tracked background job.",
      "Show my active and recent process jobs.",
      "Open the result of the latest finished job."
    ]
  },
  "name": "codex-process-jobs",
  "version": "0.5.3-wrp.2",
  "description": "Launch and manage durable, detached local process jobs from Codex.",
  "author": {
    "name": "Joel Farthing"
  },
  "keywords": [
    "background-jobs",
    "detached-processes",
    "builds",
    "benchmarks",
    "codex"
  ],
  "homepage": "https://github.com/joelfarthing/codex-process-jobs#readme",
  "repository": "https://github.com/joelfarthing/codex-process-jobs",
  "license": "Apache-2.0",
  "skills": "./skills"
}
```
