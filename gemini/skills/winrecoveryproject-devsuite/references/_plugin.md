# Plugin files: winrecoveryproject-devsuite — manifests and top-level files

Source: `plugins/winrecoveryproject-devsuite`. Files outside the `skills/*` folders, embedded as text.

## File: `.app.json`

```json
{
  "apps": {
    "github": {
      "id": "connector_76869538009648d5b282a4bb21c3d157",
      "required": false
    },
    "linear": {
      "id": "asdk_app_69a089a326dc8191b32a3f2553f5be2c",
      "required": false
    },
    "atlassian": {
      "id": "connector_692de805e3ec8191834719067174a384",
      "required": false
    },
    "cloud-environment": {
      "id": "connector_openai_cloud_environment",
      "required": false
    },
    "cloudconvert": {
      "id": "asdk_app_6a5767a72d2881919c2f45a7d6206298",
      "required": false
    }
  }
}
```

## File: `.gitattributes`

```text
# Preserve exact source and brand provenance bytes across platforms.
* -text
```

## File: `.gitignore`

```text
__pycache__/
*.pyc
dist/
.test-output/
```

## File: `AGENTS.md`

### DevSuite source instructions

This is the owned WinRecoveryProject DevSuite source, not an installed plugin cache.
Read README.md, references/policy.md and references/capability-matrix.json for the
product contract. Preserve existing App IDs and provider connections. Never copy
credentials or proprietary provider implementations into this source. Only original
code and explicitly permitted MIT adaptations belong in the redistributable package.

Run `python -m unittest discover -s tests -v` and `python scripts/devsuite.py doctor`
after changes. Test fixtures use temporary directories. No network or paid services
are required for local validation. Provider readiness is a separate, conditional
claim. Do not publish, install, mutate other packages or user settings from tests.

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

DevSuite's local helpers use standard-library file operations only and add no
telemetry, network transport, credential store or background process. The optional
board stores bounded task ownership metadata and compact receipts, never transcripts.
Evidence reports are explicitly written only to the chosen local output directory.

External provider operations use the user's existing authorized connections and the
provider's policies. Only task-required data is submitted after scope and cost checks.
No external operation is performed by package validation. Secrets remain in host
bindings; no credential values are copied into this package or reports.

## File: `README.md`

### WinRecoveryProject DevSuite 0.7.0

One owned development workflow combines planning/coordination, implementation,
debugging, testing, independent review, quality gates, security assessment/remediation,
handoff, local/cloud development and conversions. Fourteen focused skills replace
overlapping instruction triggers. MIT board/lifecycle helpers and original evidence
utilities are bundled; no old skill package is needed for local work.

Licensed Security backends and managed Cloud/CloudConvert services remain external
host capabilities. Their source is not redistributed. Existing provider packages and
connections are preserved where required. App bindings do not prove authentication,
tool availability or successful execution. Cost budget is 0 kr; no new keys, OAuth,
MCP servers, purchases, subscriptions or billable infrastructure are introduced.

Read [policy](_plugin-references.md#file-referencespolicymd), [provider boundaries](_plugin-references.md#file-referencesprovidersmd),
[function coverage](_plugin-references.md#file-referencescapability-matrixjson),
[source hashes](_plugin-references.md#file-referencessource-provenancejson) and
[migration proposal](_plugin-references.md#file-referencesmigrationmd). All 39 inspected source skills map
to 214 function-level rows, including the original source's non-triggered
orchestrate-work workflow. CloudConvert source is unavailable; its actual App ID is
verified and its original skill inventory remains UNKNOWN.

The Claude Code edition packages local development workflows with the same router
and separate host-native metadata. [Build and check the Claude package](https://github.com/WinRecoveryProject/WinRecoveryProject-DevSuite/tree/main/editors/claude)

```text
python scripts/devsuite.py route "review this patch"
python scripts/devsuite.py capabilities
python scripts/devsuite.py doctor
python -m unittest discover -s tests -v
python scripts/package.py --out <new-archive.zip>
python scripts/devsuite.py provider-check security-deep inventory.json
python scripts/devsuite.py conversion-plan request.json
python scripts/devsuite.py assessment-report assessment.json --source-root <repo> --out <new-directory>
```

The CLI never executes request text, uploads files, creates scans, installs packages
or changes user settings. Provider checks only verify supplied observed tool names;
Tool names present still returns NOT_VERIFIED and canExecute:false; access, consent
and free quota are separate. Conversion plans return executed:false. Local
assessment reports use a separate owned schema and never impersonate sealed provider
artifacts. [Board operations](_plugin-references.md#file-referencescoordinationmd) documents the optional local
state/lifecycle helpers and unregistered hook replacement blueprint.

The native `.codex-plugin/plugin.json` is authoritative; no root portable manifest
shadows Apps. Original DevSuite code is MIT. Adapted MIT components retain upstream
copyright/licenses in [notices](_plugin.md#file-third_party_noticesmd). Codex Security and internal
Cloud implementations retain their own provider licensing and are not bundled.

Local tests cover meaningful helper behavior plus static workflow contracts. Provider
scans/Deep workers, cloud sessions, conversions, auth/quota, live tracker writes and
project Linter execution are conditional and are not claimed as demonstrated by those
tests. Package tests, installation and publication are separate evidence states.

Version 0.1.1 fixes Danish quality/review routing and validates provider inventory containers before access. Invalid inputs return structured ERROR; provider execution and consent remain separate.

Version 0.2.0 integrates finite process jobs and registered Codex Tasks in the same
toolkit, with explicit Windows host-session routing and paginated environment
selection. Existing Security, Coordinator, Dev Workflows and Engineering Guardrails
remain covered. The new DevSuite identity refines the existing turquoise network and
violet shield; plugin identity, all five App bindings and connections are unchanged.

```text
python scripts/devsuite.py process-plan request.json
python scripts/devsuite.py task-environment environments.json
```

See [execution routes](_plugin-references.md#file-referencesexecutionmd). The helpers plan and select only;
they do not launch commands, create remote tasks or certify provider execution.

Version 0.2.1 preserves explicit remote-task and background-job intent when the
workload contains test/fix/implement verbs. Code-maintenance requests keep their
normal development route; negated lifecycle clauses do not start an execution
workflow. Route suggestions never authorize execution.

Version 0.7.0 extends `devsuite-debug` with diagnose, loop and triage modes, including their resources under `modes/diagnose/`, `modes/loop/` and `modes/triage/`, byte-identical with Plugin-Skill-Studio `studio-debug`. The existing investigation stays as the `investigate` mode. `references/consolidation/debug-matrix.json` maps every absorbed capability with none dropped, including `codex-dev-workflows:bug-investigation`, which stays unchanged in its own package. The workflow count stays at 14.

Version 0.6.0 adds `devsuite-git` (14 workflows): worktree, finish, conflicts and safety modes, including the git guardrail scripts under `modes/safety/`, byte-identical with Plugin-Skill-Studio `studio-git`; `references/consolidation/git-matrix.json` maps every absorbed capability with none dropped, and `devsuite-implement` now points to it for worktrees and branch finishing. Version 0.5.0 consolidates execution: `devsuite-implement` gains execute, subagent, implement, spec-run, parallel and durable modes whose files, including the subagent prompts, references and bash scripts under `modes/subagent/`, are byte-identical with Plugin-Skill-Studio `studio-execute`; its own implementation text becomes the `build` mode, and `references/consolidation/execute-matrix.json` maps every absorbed capability with none dropped. Version 0.4.0 consolidates planning: `devsuite-planning` gains discover, interview, spec, plan, tickets, questions, goal and map modes whose files are byte-identical with Plugin-Skill-Studio `studio-plan`, while its own planning and coordination text becomes the `project` mode; `references/consolidation/plan-matrix.json` maps every absorbed capability, and only Studio's Node browser companion is an approved drop. Version 0.3.0 consolidates review: `devsuite-review` absorbs `devsuite-quality` (now its `gate` mode) and adds `request`, `receive`, `decide` and `verify` modes whose files are byte-identical with Plugin-Skill-Studio `studio-review`; `references/consolidation/review-matrix.json` maps every absorbed capability. Version 0.2.7 lists available and unavailable saved environment configurations through the existing Codex Tasks connection. An unnamed selection requires one runnable candidate. The attached Cloud Environment desktop uses its own existing runtime access.

Version 0.3.1 adds platform guidance for PowerShell (Windows PowerShell 5.1 and PowerShell 7), Batch/CMD launchers, and Lua including World of Warcraft addons. The debug, implement and test workflows load them from `references/platforms.md`.

Version 0.2.6 routes requests for saved Codex cloud environments to the
read-only Codex Tasks listing, including Danish requests with gemte or
Codex-cloudmiljøer. Interactive Cloud Environment login still depends
on the host's Cloud Environment tools.

## File: `SUPPORT.md`

### Support

Report DevSuite source problems through the WinRecoveryProject PluginMarketplace
repository's existing support/issue route. Include package version, selected workflow,
sanitized reproduction, relevant command/exit status and expected versus observed
behavior. Exclude credentials, full private logs and confidential source.

For unavailable Security, Cloud or CloudConvert backends, include only the provider,
missing capability and sanitized error. Existing provider authentication, subscriptions
and managed runtime support remain with that provider. Never send API keys or create
new OAuth registrations as a troubleshooting step.

## File: `TERMS.md`

### Terms

Original DevSuite source is supplied under the MIT license in LICENSE. Adapted
components retain their upstream licenses and notices. No warranty or availability
guarantee is supplied. Existing external providers retain their own terms, access
rules and licensing; DevSuite does not grant provider access or free service quota.

Use only authorized repositories, environments, files and connections. The included
cost policy is 0 kr and does not authorize purchases, subscriptions or billable work.
Local validation is separate from live service execution and release publication.

## File: `THIRD_PARTY_NOTICES.md`

### Source and licensing notices

Original DevSuite code and original workflow descriptions: Copyright (c) 2026
Zilvereyes, MIT. [LICENSE](_plugin.md#file-license) covers this original work.

MIT adaptations retain complete notices:

- Codex Coordinator 0.4.0, Copyright (c) 2026 Six Ideas. State/lifecycle/session/stop
  helpers adapted into runtime/coordinator. [License](_plugin-licenses.md#file-licensescoordinatortxt).
- Codex Dev Workflows 0.4.2, Copyright (c) 2026 Codex Dev Workflows contributors.
  Workflow behavior merged and platform references adapted. [License](_plugin-licenses.md#file-licensesworkflowstxt).
- Codex Engineering Guardrails 1.1.1, copyright retained exactly in its per-skill MIT
  notices. Engineering decision/verification references retained; workflow behavior
  merged. [First license](_plugin-licenses.md#file-licensesguardrailstxt), [second license](_plugin-licenses.md#file-licensesguardrails-1txt).

Inspected but not redistributed:

- Codex Security 0.1.32 identifies its implementation as Proprietary. No proprietary
  skills, scripts, native binaries, compressed MCP bundles, schemas or source assets
  are copied. Original DevSuite security methods use existing licensed host tools
  conditionally. Existing provider installation/MCP must remain for that backend.
- Cloud Environment 0.2.1 is INTERNAL_ONLY and supplies no redistribution license.
  No source skills, references or installer script are copied. Original DevSuite
  environment guidance reuses the existing managed App/tools conditionally.
- CloudConvert exact selected package has metadata only; no source/license grant
  was available. Only the verified App ID and original conversion workflow are used.

[Provenance](_plugin-references.md#file-referencessource-provenancejson) lists 215 inspected source file hashes,
integration methods, licenses and source gaps. Source paths are audit citations, not
runtime dependencies. The capability matrix separates owned instructions, bundled
runtime and conditional external providers. No credentials or environment values
are included; source manifests were inspected as data, not adopted wholesale.

#### Codex Process Jobs and Codex Tasks contracts

Inspected Codex Process Jobs 0.5.3-wrp.1 (Joel Farthing, Apache-2.0) and Codex Tasks 0.1.1 (external host service; redistribution license unspecified). DevSuite Jobs/Tasks instructions and execution.py are independently written. No original controller or proprietary provider code is distributed; providers retain their own licenses and existing state.
