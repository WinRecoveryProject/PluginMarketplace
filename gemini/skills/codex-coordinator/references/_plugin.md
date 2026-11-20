# Plugin files: codex-coordinator — manifests and top-level files

Source: `plugins/codex-coordinator`. Files outside the `skills/*` folders, embedded as text.

## File: `COPY-COMPLETE.json`

```json
{
  "complete": true,
  "files": 23,
  "installedInHost": false
}
```

## File: `IMPORT-RECEIPT.json`

```json
{
  "schemaVersion": 1,
  "installer": "plugin-skill-studio",
  "source": "selected-source:codex-coordinator",
  "sourceHash": "7b013748dce6dc70fd7ee737d2b48d941be13ac63ec1db611b8cd85d976c4d8c",
  "target": "marketplace:plugins/codex-coordinator",
  "files": [
    {
      "path": ".codex-plugin/assets/composer-icon.png",
      "bytes": 985047,
      "sha256": "ef2b0349121311cfdf5fee16e4d1c08a21726bd6c0d69415adc9e9e5cb6aeec4"
    },
    {
      "path": ".codex-plugin/assets/logo.png",
      "bytes": 985047,
      "sha256": "ef2b0349121311cfdf5fee16e4d1c08a21726bd6c0d69415adc9e9e5cb6aeec4"
    },
    {
      "path": ".codex-plugin/plugin.json",
      "bytes": 2096,
      "sha256": "14b95332a58d17d9b6aa6343b3ce9275fb6e22fbb75c45441ddd54605c3e589d"
    },
    {
      "path": "assets/logo.png",
      "bytes": 985047,
      "sha256": "ef2b0349121311cfdf5fee16e4d1c08a21726bd6c0d69415adc9e9e5cb6aeec4"
    },
    {
      "path": "hooks/hooks.json",
      "bytes": 844,
      "sha256": "f48f534a54a3d64a5101c7fb0722f33729f04d4fcbabdc688f54403630cf5b62"
    },
    {
      "path": "LICENSE",
      "bytes": 1066,
      "sha256": "4f1de84822d4984fb98347ee48c393378359f80feaa7b4cafc747a9113a57a07"
    },
    {
      "path": "scripts/codex_coordinator_doctor.py",
      "bytes": 13022,
      "sha256": "6ebc609f6666091cbaa3490878cbfc35bcde72413df67a83a76e726dfcd4895b"
    },
    {
      "path": "scripts/codex_coordinator_project.py",
      "bytes": 34602,
      "sha256": "4fba772f543f4513e65e50eedd1ba610224c5f648fedd1366ccf5edd869e38ab"
    },
    {
      "path": "scripts/codex_coordinator_session_start.py",
      "bytes": 4915,
      "sha256": "821ad8378f3e453f3ae11cfbb951721f330e53d4e55b414b4e6e771f98ec89b0"
    },
    {
      "path": "scripts/codex_coordinator_stop_guard.py",
      "bytes": 8435,
      "sha256": "d4ea75f4924a554c07b85aab5962ae37075f3c94fed4b8d842ebcffbf3e2e1cc"
    },
    {
      "path": "skills/codex-coordinator/agents/openai.yaml",
      "bytes": 302,
      "sha256": "eb71137148dd16ee2da5dd2de60844a52aa350fd661c115d46912b1ca0cffc98"
    },
    {
      "path": "skills/codex-coordinator/capabilities.json",
      "bytes": 1547,
      "sha256": "534426b0b68aacd94b6b58c6eb3ed60672b327f585a152194ad59363a23ca0be"
    },
    {
      "path": "skills/codex-coordinator/references/doctor.md",
      "bytes": 1110,
      "sha256": "930d72f8979f6bb1fd7ba20fddb9dc513e4f28d9b81118df73508a4b684f22ac"
    },
    {
      "path": "skills/codex-coordinator/references/execution.md",
      "bytes": 10287,
      "sha256": "600fa280c7923038455e0e98e313fdd8bec667b3c4f594cd09d5c5fa0fec9140"
    },
    {
      "path": "skills/codex-coordinator/references/installation.md",
      "bytes": 4064,
      "sha256": "79208900f0bcb673b75428e5d164787ff74d871c1d163335c8b411179a301350"
    },
    {
      "path": "skills/codex-coordinator/references/maintenance.md",
      "bytes": 2629,
      "sha256": "71d3b89f875876ea0e39d1e9cb67cfd7ebae6346a4b2e10da3fce4c99382c984"
    },
    {
      "path": "skills/codex-coordinator/references/messaging.md",
      "bytes": 3592,
      "sha256": "d63bc8c8fb6a16da365cd7c8e644461caea61c6362ac03931a29a75e0f5c0415"
    },
    {
      "path": "skills/codex-coordinator/references/operations.md",
      "bytes": 1183,
      "sha256": "3d92338f4dfd2014da876c91333d170e2e35b153d8998576c3fc423df40bce74"
    },
    {
      "path": "skills/codex-coordinator/references/recovery.md",
      "bytes": 1944,
      "sha256": "dfe866874dcf63b82d262c517b0b6324c8e7069014e6a28835d7e342f94b5179"
    },
    {
      "path": "skills/codex-coordinator/scripts/coordination_state.py",
      "bytes": 33167,
      "sha256": "466bd1bcffb8c9264ccf197db7eef183ba9daad5ada92e0342d42945de7c2d4c"
    },
    {
      "path": "skills/codex-coordinator/SKILL.md",
      "bytes": 11200,
      "sha256": "00724054da472442bdf65c965a6f9243dc226c04cda03bdd3f1a7f7c5b662964"
    }
  ],
  "createdAt": "2026-11-16T01:16:25.522Z",
  "state": "local-candidate",
  "installedInHost": false,
  "executedTarget": false,
  "pathDisclosure": "portable",
  "historicalReceipt": true
}
```

## File: `LICENSE`

```text
MIT License

Copyright (c) 2026 Six Ideas

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

## File: `plugin.json`

```json
{
  "author": {
    "name": "Six Ideas",
    "url": "https://github.com/eyeinthesky6"
  },
  "description": "Coordinate parallel Codex tasks in one shared checkout with a small active-only boundary board.",
  "homepage": "https://eyeinthesky6.github.io/codex-coordinator/",
  "interface": {
    "brandColor": "#06142F",
    "brandColorDark": "#D0DEF9",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "category": "Productivity",
    "composerIcon": "./.codex-plugin/assets/composer-icon.png",
    "defaultPrompt": [
      "Help my Codex tasks move in parallel with less duplicate work and fewer crossed edits",
      "Show me who is working on what and flag work that may collide",
      "Coordinate this goal across the right existing tasks and keep each task focused"
    ],
    "developerName": "Six Ideas",
    "displayName": "Codex Coordinator",
    "logo": "./.codex-plugin/assets/logo.png",
    "longDescription": "Keep parallel Codex tasks moving in one shared checkout without duplicate work or crossed edits. Codex Coordinator gives each task a visible, bounded lane, reuses related tasks before creating new ones, and stays lightweight—no background manager, polling loop, transcript store, extra worktrees, or required pull requests. An optional manual, read-only Doctor checks package compatibility and recommends update or reinstall when something is broken.",
    "privacyPolicyURL": "https://github.com/eyeinthesky6/codex-coordinator/blob/main/PRIVACY.md",
    "shortDescription": "Coordinate parallel Codex work",
    "supportURL": "https://github.com/eyeinthesky6/codex-coordinator/blob/main/SUPPORT.md",
    "termsOfServiceURL": "https://github.com/eyeinthesky6/codex-coordinator/blob/main/TERMS.md",
    "websiteURL": "https://eyeinthesky6.github.io/codex-coordinator/"
  },
  "keywords": [
    "codex",
    "coordination",
    "parallel-work",
    "multi-agent",
    "repository"
  ],
  "license": "MIT",
  "name": "codex-coordinator",
  "repository": "https://github.com/eyeinthesky6/codex-coordinator",
  "skills": "./skills/",
  "version": "0.4.0"
}
```
