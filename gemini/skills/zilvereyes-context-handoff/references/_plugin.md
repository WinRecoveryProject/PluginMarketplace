# Plugin files: zilvereyes-context-handoff — manifests and top-level files

Source: `plugins/zilvereyes-context-handoff`. Files outside the `skills/*` folders, embedded as text.

## File: `COPY-COMPLETE.json`

```json
{
  "complete": true,
  "files": 22,
  "installedInHost": false
}
```

## File: `IMPORT-RECEIPT.json`

```json
{
  "schemaVersion": 1,
  "installer": "plugin-skill-studio",
  "source": "selected-source:zilvereyes-context-handoff",
  "sourceHash": "482f3a8503b3d354b7ea35115a6a44024b196a5c1a481b84c21327ee30aa0c73",
  "target": "marketplace:plugins/zilvereyes-context-handoff",
  "files": [
    {
      "path": ".codex-plugin/plugin.json",
      "bytes": 1181,
      "sha256": "54ac787207c1a9302677f4342f7e566a32dc16cb0f1665bb4f02a51006f05cc1"
    },
    {
      "path": "assets/icon.png",
      "bytes": 9657,
      "sha256": "7049b50d3cf30e220e588f8561ea42048b1618bfccef044fceac25ed05f85d60"
    },
    {
      "path": "assets/icon.svg",
      "bytes": 320,
      "sha256": "94b934ccf5f3225b8049706fa450967ff5cf546f9e1a851ca4171d67121a4dd3"
    },
    {
      "path": "assets/logo-dark.svg",
      "bytes": 320,
      "sha256": "c7019672f611b24a66bcea56c422b1e3f9040822497ee2f1d8e4b2dc3f93f2d4"
    },
    {
      "path": "assets/logo-light.svg",
      "bytes": 320,
      "sha256": "49360392d1ca665dd6119f768fb227cc289a3384277f5c586515ceed19337cab"
    },
    {
      "path": "assets/logo.png",
      "bytes": 21261,
      "sha256": "62d24e532821d7cac7cf6d8908ce3eeec485d59763b47a7eb1b2175073dc599e"
    },
    {
      "path": "assets/logo.svg",
      "bytes": 799,
      "sha256": "19df2a292113e48b72f92b1e45872bfb42af0ae9b5c2ff1a078b9c434440e98b"
    },
    {
      "path": "hooks/context_health.py",
      "bytes": 5027,
      "sha256": "70255308e21d6552e020ad13b6c2e2dceb4113e195dce717f53c33e4617ed753"
    },
    {
      "path": "hooks/hooks.json",
      "bytes": 1254,
      "sha256": "989ecd9d4775faaf4c3816acdd18dbe7cc8dc30d732ce0bbc1f42bd4ae95fab7"
    },
    {
      "path": "LICENSE",
      "bytes": 1063,
      "sha256": "bb15f59523a82aea324cc43a123d86d5cbe98b617bbedfcfe9b37a0453f8b91b"
    },
    {
      "path": "plugin.json",
      "bytes": 1181,
      "sha256": "54ac787207c1a9302677f4342f7e566a32dc16cb0f1665bb4f02a51006f05cc1"
    },
    {
      "path": "PRIVACY.md",
      "bytes": 305,
      "sha256": "7ad21def6d082ba37ac7dbffbcc245fc69faa2fad37adbd72a19a22dfee90ff9"
    },
    {
      "path": "PROVENANCE.json",
      "bytes": 3295,
      "sha256": "c9eebd1638aa8d65919874cd553c5ab23351d264555e43b8e82f61ae28c317b7"
    },
    {
      "path": "README.md",
      "bytes": 1315,
      "sha256": "31f43d8f5a3d2c472b9240fe8c98a1548a10f4c54f8d6c743bc55ac383f9652f"
    },
    {
      "path": "skills/zilvereyes-context-handoff/agents/openai.yaml",
      "bytes": 281,
      "sha256": "e7b0c4f6190616c01e4bff2b13d19694ba5a1b64daa302598fb074575f642495"
    },
    {
      "path": "skills/zilvereyes-context-handoff/scripts/context_handoff.py",
      "bytes": 18216,
      "sha256": "30a29f6124fe8b425d0d6c0f7327e66406faeaf176414624975158163b2b5f18"
    },
    {
      "path": "skills/zilvereyes-context-handoff/SKILL.md",
      "bytes": 16707,
      "sha256": "d779df24546db162be2eb5532faec2163b863cae5e948858d588110021ee2e73"
    },
    {
      "path": "SUPPORT.md",
      "bytes": 184,
      "sha256": "4570d4d2a96eedb4615609ee2a8085a13bc7c0ef5263efb8ed11d5aac7a55600"
    },
    {
      "path": "TERMS.md",
      "bytes": 232,
      "sha256": "d238b93f00829846e0e12ec676fd15b14da444c1f7d9cfa3f2858b51e279f19a"
    },
    {
      "path": "UPSTREAM-README.md",
      "bytes": 8925,
      "sha256": "a17d097a37bcf8307e1c07bde418a2b0d0e010223f274f703b73ae3f118d3929"
    },
    {
      "path": "ZILVEREYES-POLICY.md",
      "bytes": 1176,
      "sha256": "c364838f7996cdf8103700370ba5ba4d2b30aa7f5ab0716066e0dc52ff214697"
    }
  ],
  "createdAt": "2026-11-16T01:16:35.041Z",
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

Copyright (c) 2026 Tim Yu

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

Local candidate: no telemetry or network service is added. Host tools may read workspace files and handoff packets; hooks store per-session compaction counts in host-provided PLUGIN_DATA. Do not put secrets in packets. External host/service policies still apply. No public privacy-policy URL is verified.

## File: `PROVENANCE.json`

```json
{
  "derivative": "zilvereyes-context-handoff",
  "version": "0.3.5+zilvereyes.1",
  "sourceWorkspaceRelativePath": "context-handoff/0.3.4",
  "sourceLicense": "MIT",
  "sourceAuthor": {
    "email": "timyeou1234@users.noreply.github.com",
    "name": "Tim Yu",
    "url": "https://github.com/timyeou1234"
  },
  "sourceRepository": "https://github.com/timyeou1234/context-handoff",
  "sourceFileSHA256": {
    ".agents/plugins/marketplace.json": "2a4edbfbab38c234b586816f173f55183e4fd0a5b7ab8822f3e458ad99ac2688",
    ".codex-plugin/assets/composer-icon.png": "7049b50d3cf30e220e588f8561ea42048b1618bfccef044fceac25ed05f85d60",
    ".codex-plugin/assets/logo.png": "62d24e532821d7cac7cf6d8908ce3eeec485d59763b47a7eb1b2175073dc599e",
    ".codex-plugin/plugin.json": "7d2cc80d36552ee3e7e57edf35e11ca597be4625e5e20a4a63ad777f7eb99b47",
    ".github/workflows/release.yml": "4c8150dab12750ef2286b078b2681de3a87257a8d7895db0880c87ae2fe7cfa7",
    ".github/workflows/validate.yml": "123fa9a89fc9d86646b173a00cd359521ef779467e0a20ebc66bb5d62b9f4cdc",
    ".gitignore": "fa5b2d4433b835933b22140e01833a4972a0ee8532d76951286e3dd071994af0",
    "assets/icon.png": "7049b50d3cf30e220e588f8561ea42048b1618bfccef044fceac25ed05f85d60",
    "assets/icon.svg": "5f1265a23788f5fefc3396cad77ce17f13f9cc17d3a777bc1a5a1216c2978062",
    "assets/logo.png": "62d24e532821d7cac7cf6d8908ce3eeec485d59763b47a7eb1b2175073dc599e",
    "assets/logo.svg": "19df2a292113e48b72f92b1e45872bfb42af0ae9b5c2ff1a078b9c434440e98b",
    "docs/REVIEWER_TESTS.md": "c6f3028f1460bf24cd45aa5f0f232f13535c77ebd828c63cf06e83615d1cc0d4",
    "docs/SUBMISSION.md": "0715adada8d33fa60ea00eb8fc2a05817bacabbb6c5b83984ddfd7413b1ca3fb",
    "hooks/context_health.py": "9a3630413d25852b10512f2d3e170b0abff340cb77c560acf5ddf7d28d3e15a3",
    "hooks/hooks.json": "989ecd9d4775faaf4c3816acdd18dbe7cc8dc30d732ce0bbc1f42bd4ae95fab7",
    "LICENSE": "bb15f59523a82aea324cc43a123d86d5cbe98b617bbedfcfe9b37a0453f8b91b",
    "PRIVACY.md": "0234fbbbe25b7ce95d5bef03e24622b80786cd441daade36cb36f9b0082d436f",
    "README.md": "b9f545e9be834337c74851bbfd5fc23968e05f74ff1b6257634d78b41b7e2656",
    "skills/context-handoff/agents/openai.yaml": "29e4fa0d7c6410b22ef1b39d18fdc062a6946585aa4a5d5ae677836ac9e3e863",
    "skills/context-handoff/scripts/context_handoff.py": "9f48be0179d809a39cd5ebaaac6d2a10fc772e255807a0962abe52d4bdc735fa",
    "skills/context-handoff/SKILL.md": "aeb2dc212c3af77667ded3c68bd55a7bfe15aa199152d9bce4f1edc658e52a64",
    "SUPPORT.md": "c26a32740ce31e7b173e19b91090230cab41670c4d56f91a5e3a381764a7b105",
    "TERMS.md": "e5d2225f9e95c5ff9e2466039e14349fd061840380aa1d20b866626c6a06ca86",
    "tests/test_context_handoff.py": "f70531ab74f2d011badbbc176fec9ecbf6056b1e962fa8cc842b76034518be03"
  },
  "builtOn": "2026-11-02",
  "classification": {
    "source": "preserved upstream reference",
    "output": "editable local candidate",
    "installation": "not performed",
    "publication": "not performed"
  },
  "changes": [
    "Unique package and skill identities",
    "Zilvereyes policy and SVG branding",
    "Active-interpreter Windows subprocess support",
    "Independent local legal/support text; no invented public URLs",
    "Historical upstream docs retained; unrelated sample and submission snapshots excluded"
  ],
  "branding": {
    "logo": "assets/logo-512.png",
    "composer": "assets/composer-128.png",
    "origin": "Original Zilvereyes icon designed for this package in November 2026"
  }
}
```

## File: `README.md`

### Zilvereyes Context Handoff

Personal MIT-derived candidate, version `0.3.5+zilvereyes.1`, built with Zilvereyes Plugin Studio.

#### Features

One namespaced skill; deterministic context assessment and packet validation; compaction lifecycle hooks; checkpoint, recovery and destination verification workflow.

Read [ZILVEREYES-POLICY.md](_plugin.md#file-zilvereyes-policymd) and [PROVENANCE.json](_plugin.md#file-provenancejson). All original MIT attribution is preserved in LICENSE.

#### State and limits

Built locally; not installed, submitted or published. Public website, publisher privacy/terms and support URLs remain unset until verified. Studio's publication checks will report these three missing URL fields; do not invent URLs to pass them.

Handoff hooks need Python and separate host trust before execution. A new chat requires an explicit user request and real thread tools. Tool availability and installation are not established by local tests.

#### Development

Run `python -B -m unittest discover -s tests -v`. Commands are shown relative to this candidate root. Runtime scripts use the active Python interpreter for child processes on Windows.

The upstream README is retained only as historical documentation. Upstream CI files and marketplace metadata are source fixtures, not active publication or installation configuration.

## File: `SUPPORT.md`

For this personal candidate, report issues to its owner in the local project. Upstream authors are not the support channel for modifications. No public support endpoint is configured.

## File: `TERMS.md`

Software is provided under the included MIT license, without warranty. This is an independent Zilvereyes derivative, not an upstream-author or OpenAI endorsement. Public listing terms and publisher identity require separate review.

## File: `UPSTREAM-README.md`

### Historical upstream documentation

References describe the original project, not this derivative.

### Context Handoff for Codex

`zilvereyes-context-handoff` is a Codex plugin and skill for moving an in-progress task into a genuinely fresh thread when context pressure threatens continuity. The complete plugin uses a local lifecycle hook to detect root-session compaction before the next model continuation, then the skill preserves the reply language, acceptance criteria, verified evidence, workspace identity, open risks, and the next action instead of copying the full conversation.

The skill is designed to reduce token cost without lowering the quality floor. A destination thread must verify a small workspace and artifact sentinel before it continues. Any mismatch stops with `HANDOFF REGRESSION`.

#### What it does

- Uses proportional context thresholds instead of a fixed token count.
- Automatically records compaction through a plugin-bundled `SessionStart(source=compact)` hook.
- Repeats the context-health instruction on later user turns after compaction, so detailed summaries do not silently disable assessment.
- Creates checkpoints at 70% usage, one compaction, or one observed degradation signal.
- Prepares a fresh-thread handoff at 85% usage, two compactions, two degradation signals, or an explicit request.
- Defers transfer while mutations, tests, builds, uploads, or destructive actions are active.
- Preserves the reply language across the fresh-thread handshake without inventing locale or time-zone preferences.
- Validates required handoff sections, verification labels, size, and common secret patterns.
- Uses a fresh Codex thread rather than a full-history fork when thread tools and authorization are available.
- Preflights exact working-directory compatibility before creating a destination; another worktree or checkout is not treated as equivalent merely because it belongs to the same saved project.
- Treats workspace isolation as a routing boundary: it never loops on approval requests to read the source checkout or source-side recovery packet.
- Makes fresh destinations easier to find across desktop and mobile by assigning a concise handoff title, pinning the exact destination, and verifying its thread/host identity in the pinned list before source archival.
- Reports `HANDOFF MOBILE VISIBILITY UNVERIFIED` and keeps the source recoverable when sidebar read-back fails; pinning does not replace connecting mobile Remote to the computer that hosts a local checkout or worktree.
- Falls back to a validated, copyable packet when automatic thread creation is unavailable.
- Can optionally archive the source thread as a recoverable second phase, but only after `HANDOFF VERIFIED`, with real surface-provided IDs and explicit or standing user authorization.
- Records the source Goal state and confirms source archival, preventing an unfinished Goal from silently auto-resuming after a verified handoff.

The hook and skill run only during the Codex lifecycle; they do not run while Codex is idle. The hook detects and injects the health check, while the skill performs the safe checkpoint and verified transfer.

#### Install

For automatic compaction detection, install the complete plugin. From this repository checkout:

```bash
codex plugin marketplace add /absolute/path/to/zilvereyes-context-handoff
codex plugin add zilvereyes-context-handoff@context-handoff-local
```

Start a fresh Codex chat, open `/hooks`, and trust the Context Handoff hook definition. Codex intentionally skips new or changed non-managed hooks until the user reviews and trusts their exact hash.

The skill can also be installed without lifecycle hooks from:

```text
https://github.com/timyeou1234/context-handoff/tree/main/skills/context-handoff
```

Or use the bundled Codex installer:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo timyeou1234/zilvereyes-context-handoff \
  --path skills/zilvereyes-context-handoff
```

The skill-only installation becomes available on the next Codex turn but cannot automatically observe compaction. The local marketplace is for development and does not indicate acceptance in the public Plugins Directory.

#### Use

Invoke it directly:

```text
Use $zilvereyes-context-handoff to checkpoint this task and continue it in a fresh verified thread.
```

For automatic switching after detection, add standing authorization to the applicable global `AGENTS.md`. Detection never bypasses a safe checkpoint or destination validation.

Source task/chat archival is separately opt-in. Codex surfaces may call the source a task or chat; the skill records whether its Goal is active, complete, blocked, absent, or unknown, then uses the supported thread-level archival capability and the real surface-provided identity. It never runs on a regression, unsafe state, missing recovery packet, missing identifiers, unsupported API, unavailable confirmation, or failed verification. On unsupported surfaces, the skill reports `HANDOFF_VERIFIED_WITH_SOURCE_STILL_ACTIVE`, warns that an unfinished Goal may auto-resume, identifies the source when available, and leaves archival as a manual user action. Archival is recoverable and is never described as deletion.

The deterministic preflight can be inspected with `scripts/context_handoff.py archive-plan`; it requires `--goal-status` and reports `archive-ready` only when verification, recovery, identifiers, authorization, safe state, API availability, and confirmation capability all pass. After the surface archival call, `archive-result` maps observed confirmation to `SOURCE_ARCHIVED_CONFIRMED`; failure or missing confirmation maps to `HANDOFF_VERIFIED_WITH_SOURCE_STILL_ACTIVE`. The skill performs the actual archive through the surface's thread-management capability, not through this local script.

Fresh-thread creation also has a workspace-routing preflight. If the surface cannot place the destination in the exact source directory without elevated approval—for example, when the source is in a different Codex worktree—the plugin leaves the source checkpoint intact and returns `HANDOFF NEEDS COMPATIBLE WORKSPACE` with a complete copyable packet. The temporary packet path is recovery information for the source only; the destination receives the packet inline and must not request approval to open that file or the source worktree.

After creation, the plugin gives the destination a recognizable `Handoff: <goal>` title, pins the exact returned thread, and confirms the same thread ID, host ID, and title through the sidebar inventory. If that confirmation is unavailable, it reports `HANDOFF MOBILE VISIBILITY UNVERIFIED`, preserves the source, and returns every known destination identifier for manual recovery. Local and worktree tasks still require mobile Remote to connect to the same computer; the plugin does not silently move repository work into an incompatible projectless or cloud task. See the official [worktree and mobile Remote documentation](https://learn.chatgpt.com/en/docs/environments/git-worktrees) and [project/sidebar documentation](https://learn.chatgpt.com/en/docs/projects).

```bash
python3 skills/zilvereyes-context-handoff/scripts/context_handoff.py archive-plan \
  --destination-verified --destination-discoverable --packet-available \
  --source-thread-id <real-id> --source-host-id <real-id> \
  --goal-status active --authorized \
  --api-available --confirmation-available
```

#### Release automation

The `Package and release plugin` GitHub Actions workflow runs the test suite, verifies that a `v*` tag matches `.codex-plugin/plugin.json`, creates a complete top-level `zilvereyes-context-handoff/` ZIP plus SHA-256 file, uploads both as workflow artifacts, and creates a GitHub Release for tag-triggered runs. It can also be started manually to build submission artifacts without creating a release.

OpenAI Plugins Directory updates still require a new version in the OpenAI Platform submission portal. Policy attestations, review, and the post-approval Publish action are intentionally not automated.

#### Contents

- `skills/zilvereyes-context-handoff/SKILL.md` — workflow and safety contract.
- `skills/zilvereyes-context-handoff/scripts/context_handoff.py` — deterministic assessment, packet template, and validator.
- `skills/zilvereyes-context-handoff/agents/openai.yaml` — Codex skill metadata.
- `hooks/hooks.json` and `hooks/context_health.py` — trusted local compaction detector and minimal per-session state.
- `.codex-plugin/plugin.json` — plugin manifest and listing metadata.
- `.agents/plugins/marketplace.json` — repo-local marketplace used for clean-install testing.
- `docs/SUBMISSION.md` and `docs/REVIEWER_TESTS.md` — portal copy, user-only steps, and reproducible reviewer cases.

#### License

MIT. This is an independent community project and is not an official OpenAI product.

## File: `ZILVEREYES-POLICY.md`

### Zilvereyes operating policy

This personal candidate extends the MIT upstream workflow. User and host instructions take precedence.

- Preserve upstream references, editable sources, candidates, marketplace entries, installed packages, caches and archives as separate states.
- Reply in the user's language; preserve accepted requirements and record evidence without inventing current state.
- Never delete, replace, install, upload, commit or publish merely because a candidate was requested.
- Continue reversible work already authorized. Ask only for missing authorization or information that blocks dependent work.
- Discover actual host tools before claiming capabilities. A skill does not create a tool or grant permission.
- Create a new chat only when the user explicitly asks for a new chat. Compaction permits checkpoint preparation, not automatic chat creation. Pinning, navigation and archival have separate authorization boundaries.
- Goal tools follow the current host contract. Never change Goal state just to silence a source chat.
- Keep upstream public URLs as historical references only. They are not the publisher or support channel for this derivative.

## File: `plugin.json`

```json
{
  "author": {
    "name": "Zilvereyes"
  },
  "description": "Zilvereyes Context Handoff: MIT-derived personal candidate with preserved provenance and evidence-led workflows.",
  "interface": {
    "brandColor": "#23786B",
    "brandColorDark": "#23786B",
    "capabilities": [
      "Workflow",
      "Continuity",
      "Lifecycle hooks"
    ],
    "category": "Productivity",
    "composerIcon": "./assets/composer-128.png",
    "defaultPrompt": [
      "Lav et verificerbart checkpoint for denne opgave.",
      "Forbered en handoff-pakke med alle accepterede krav."
    ],
    "developerName": "Zilvereyes",
    "displayName": "Zilvereyes Context Handoff",
    "logo": "./assets/logo-512.png",
    "longDescription": "Zilvereyes Context Handoff: MIT-derived personal candidate with preserved provenance and evidence-led workflows. Local validation, installation and publication are separate states.",
    "shortDescription": "Bevar kontekst og evidens"
  },
  "keywords": [
    "codex",
    "context",
    "handoff",
    "continuity",
    "productivity"
  ],
  "license": "MIT",
  "name": "zilvereyes-context-handoff",
  "skills": "./skills/",
  "version": "0.3.5+zilvereyes.1"
}
```
