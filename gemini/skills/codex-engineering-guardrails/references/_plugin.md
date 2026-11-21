# Plugin files: codex-engineering-guardrails — manifests and top-level files

Source: `plugins/codex-engineering-guardrails`. Files outside the `skills/*` folders, embedded as text.

## File: `COPY-COMPLETE.json`

```json
{
  "complete": true,
  "files": 17,
  "installedInHost": false
}
```

## File: `IMPORT-RECEIPT.json`

```json
{
  "schemaVersion": 1,
  "installer": "plugin-skill-studio",
  "source": "selected-source:codex-engineering-guardrails",
  "sourceHash": "e0a04382e5f19afe44a7830014ff5941723040f0ce00c50fb6933e9fd08d9b1d",
  "target": "marketplace:plugins/codex-engineering-guardrails",
  "files": [
    {
      "path": ".codex-plugin/assets/composer-icon.png",
      "bytes": 272230,
      "sha256": "281f62a3e8aa1b4b73a811c34c653cf99da69e795eb78af9015e51f944b3e49a"
    },
    {
      "path": ".codex-plugin/assets/logo-dark.png",
      "bytes": 272230,
      "sha256": "281f62a3e8aa1b4b73a811c34c653cf99da69e795eb78af9015e51f944b3e49a"
    },
    {
      "path": ".codex-plugin/assets/logo.png",
      "bytes": 272230,
      "sha256": "281f62a3e8aa1b4b73a811c34c653cf99da69e795eb78af9015e51f944b3e49a"
    },
    {
      "path": ".codex-plugin/plugin.json",
      "bytes": 1924,
      "sha256": "6810f755a6592221324d5d177709752ccc1b0237b53511755b7add6133533dec"
    },
    {
      "path": "assets/icon.png",
      "bytes": 272230,
      "sha256": "281f62a3e8aa1b4b73a811c34c653cf99da69e795eb78af9015e51f944b3e49a"
    },
    {
      "path": "assets/README.md",
      "bytes": 194,
      "sha256": "f51fdd667d0f6451ad94bb8019732264afc3001f709a546fdb852d1f678f3c62"
    },
    {
      "path": "assets/social-preview.png",
      "bytes": 676135,
      "sha256": "720e9def96a4f835a93da88e283c8e720fe361d7c3c01cc058b310163c2c6d98"
    },
    {
      "path": "skills/code-verification/agents/openai.yaml",
      "bytes": 266,
      "sha256": "ce3ad75d9e775c1a27943281bccc2b70d955af2fe498a3e8489ec92518bd02bb"
    },
    {
      "path": "skills/code-verification/LICENSE",
      "bytes": 1064,
      "sha256": "18243ef04dab2a237601e84950cbf8983f16a161aa2c38002e336887e2dc4628"
    },
    {
      "path": "skills/code-verification/references/verification-matrix.md",
      "bytes": 6433,
      "sha256": "81c8db337f17078a3985875822508cdc24ed568824fe3d9ddeb4ab0cb8cc5675"
    },
    {
      "path": "skills/code-verification/SKILL.md",
      "bytes": 8063,
      "sha256": "4aab85003f547ac6e1ee12e3ceb3f89d5744af56f3b22a3643e545007474fc87"
    },
    {
      "path": "skills/code-work/agents/openai.yaml",
      "bytes": 238,
      "sha256": "3ee0d40bcff8d0e29113606f8259d9a0dd3b13a789758ef3639e5f2fb6f1d416"
    },
    {
      "path": "skills/code-work/LICENSE",
      "bytes": 1064,
      "sha256": "18243ef04dab2a237601e84950cbf8983f16a161aa2c38002e336887e2dc4628"
    },
    {
      "path": "skills/code-work/references/engineering-decisions.md",
      "bytes": 4610,
      "sha256": "31e4c184813853420432cee29cd5b16b439f284e169135134bb773cc5a34cd9d"
    },
    {
      "path": "skills/code-work/SKILL.md",
      "bytes": 7302,
      "sha256": "a3727efa825ff26a2ce67ff60379ad0e3a4bfcfc498c3632514fd662e7a0f3a6"
    }
  ],
  "createdAt": "2026-11-16T01:16:30.266Z",
  "state": "local-candidate",
  "installedInHost": false,
  "executedTarget": false,
  "pathDisclosure": "portable",
  "historicalReceipt": true
}
```

## File: `plugin.json`

```json
{
  "author": {
    "name": "Сергей Гусев",
    "url": "https://github.com/Comdir2/Codex-engineering-guardrails"
  },
  "description": "Skills-only bundle for scoped software implementation and independent code verification in Codex.",
  "homepage": "https://github.com/Comdir2/Codex-engineering-guardrails",
  "interface": {
    "brandColor": "#2563EB",
    "brandColorDark": "#2563EB",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "category": "Developer Tools",
    "composerIcon": "./.codex-plugin/assets/composer-icon.png",
    "defaultPrompt": [
      "Implement this change with strict scope control and fresh verification.",
      "Review this code independently and report evidence-backed findings.",
      "Plan safe parallel work, then verify the integrated result."
    ],
    "developerName": "Сергей Гусев",
    "displayName": "Codex Engineering Guardrails",
    "logo": "./.codex-plugin/assets/logo.png",
    "logoDark": "./.codex-plugin/assets/logo-dark.png",
    "longDescription": "Pairs code-work and code-verification for strict scope control, test-backed changes, adaptive parallelism, and fresh independent evidence.",
    "privacyPolicyURL": "https://github.com/Comdir2/Codex-engineering-guardrails/blob/main/PRIVACY.md",
    "shortDescription": "Implement and verify code",
    "supportURL": "https://github.com/Comdir2/Codex-engineering-guardrails/blob/main/SUPPORT.md",
    "termsOfServiceURL": "https://github.com/Comdir2/Codex-engineering-guardrails/blob/main/TERMS.md",
    "websiteURL": "https://github.com/Comdir2/Codex-engineering-guardrails"
  },
  "keywords": [
    "codex",
    "software-engineering",
    "code-review",
    "testing",
    "verification"
  ],
  "license": "MIT",
  "name": "codex-engineering-guardrails",
  "repository": "https://github.com/Comdir2/Codex-engineering-guardrails",
  "skills": "./skills/",
  "version": "1.1.1"
}
```
