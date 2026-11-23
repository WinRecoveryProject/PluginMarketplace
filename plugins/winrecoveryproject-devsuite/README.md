# WinRecoveryProject DevSuite 0.5.0

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

Read [policy](references/policy.md), [provider boundaries](references/providers.md),
[function coverage](references/capability-matrix.json),
[source hashes](references/source-provenance.json) and
[migration proposal](references/migration.md). All 39 inspected source skills map
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
artifacts. [Board operations](references/coordination.md) documents the optional local
state/lifecycle helpers and unregistered hook replacement blueprint.

The native `.codex-plugin/plugin.json` is authoritative; no root portable manifest
shadows Apps. Original DevSuite code is MIT. Adapted MIT components retain upstream
copyright/licenses in [notices](THIRD_PARTY_NOTICES.md). Codex Security and internal
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

See [execution routes](references/execution.md). The helpers plan and select only;
they do not launch commands, create remote tasks or certify provider execution.

Version 0.2.1 preserves explicit remote-task and background-job intent when the
workload contains test/fix/implement verbs. Code-maintenance requests keep their
normal development route; negated lifecycle clauses do not start an execution
workflow. Route suggestions never authorize execution.

Version 0.5.0 consolidates execution: `devsuite-implement` gains execute, subagent, implement, spec-run, parallel and durable modes whose files, including the subagent prompts, references and bash scripts under `modes/subagent/`, are byte-identical with Plugin-Skill-Studio `studio-execute`; its own implementation text becomes the `build` mode, and `references/consolidation/execute-matrix.json` maps every absorbed capability with none dropped. Version 0.4.0 consolidates planning: `devsuite-planning` gains discover, interview, spec, plan, tickets, questions, goal and map modes whose files are byte-identical with Plugin-Skill-Studio `studio-plan`, while its own planning and coordination text becomes the `project` mode; `references/consolidation/plan-matrix.json` maps every absorbed capability, and only Studio's Node browser companion is an approved drop. Version 0.3.0 consolidates review: `devsuite-review` absorbs `devsuite-quality` (now its `gate` mode) and adds `request`, `receive`, `decide` and `verify` modes whose files are byte-identical with Plugin-Skill-Studio `studio-review`; `references/consolidation/review-matrix.json` maps every absorbed capability. Version 0.2.7 lists available and unavailable saved environment configurations through the existing Codex Tasks connection. An unnamed selection requires one runnable candidate. The attached Cloud Environment desktop uses its own existing runtime access.

Version 0.3.1 adds platform guidance for PowerShell (Windows PowerShell 5.1 and PowerShell 7), Batch/CMD launchers, and Lua including World of Warcraft addons. The debug, implement and test workflows load them from `references/platforms.md`.

Version 0.2.6 routes requests for saved Codex cloud environments to the
read-only Codex Tasks listing, including Danish requests with gemte or
Codex-cloudmiljøer. Interactive Cloud Environment login still depends
on the host's Cloud Environment tools.
