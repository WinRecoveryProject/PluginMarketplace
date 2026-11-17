# Real provider boundaries

| Provider | Exact existing binding | Scope and availability |
| --- | --- | --- |
| GitHub | connector_76869538009648d5b282a4bb21c3d157 | Optional repository/findings/tracking; verify actual current tools/access |
| Linear | asdk_app_69a089a326dc8191b32a3f2553f5be2c | Optional issue tracking; explicit write authority required |
| Atlassian | connector_692de805e3ec8191834719067174a384 | Optional Jira tracking; no new connection/auth required |
| Cloud Environment | connector_openai_cloud_environment | Optional managed machine/desktop/network tools; status per selected instance |
| CloudConvert | asdk_app_6a5767a72d2881919c2f45a7d6206298 | Verified App ID; tools/auth/free quota unverified |
| Codex Security | Existing licensed host MCP/provider | Standard/Deep workbench, artifacts, sealing, indexes, saved results, feedback, usage and remediation API remain external |
| Linter/MegaLinter | Existing project runner/CI | Optional check layer; no extra plugin installation or new credentials |

App declarations use `required:false`; this declares optional intent, not proof of
the host parser's behavior. Native plugin/read staging observed 12 skills, five real
Apps, zero added MCP servers and authPolicy ON_USE. Its response did not expose the
required field, so optionality interpretation remains unverified.
These fields never establish user consent. Local workflows/helpers independently
avoid initiating authentication and require actual tools/access before external work.
No OAuth registration, MCP server, endpoint, credential or environment value is added.
The native manifest is the only plugin manifest; no portable root manifest shadows
native Apps. Existing provider packages may need to remain installed to expose their
backends even after overlapping skills are disabled. Never uninstall them for this merge.

Codex Security 0.1.32 identifies its implementation as Proprietary. Cloud Environment
0.2.1 is INTERNAL_ONLY and provides no redistribution license. They are inspected as
provenance, not copied implementations. DevSuite's security/cloud workflow descriptions
and local evidence helper are independently owned. Original provider state schemas and
runtime completion guarantees are not reimplemented or falsely certified.

CloudConvert evidence on 2026-11-16: `get_plugin_dependencies` for
`app-6a5767a72d2881919c2f45a7d6206298@openai-curated-remote` resolves canonical
`plugin_asdk_app_6a5767a72d2881919c2f45a7d6206298`, display name CloudConvert,
optional App binding above, enabled/available, installed false. Local cache search
found no source; plugin search returned no match. These observations do not override
current runtime status or imply a connected conversion route.

`provider-check` consumes a caller-supplied inventory of tools actually observed now.
Missing tools return UNAVAILABLE and a nonzero exit. It checks names only, not service
credentials, quota, authorization, successful execution or provider health. Tool names
present returns NOT_VERIFIED, never readiness. Observed access denial/insufficiency
returns ACCESS_INSUFFICIENT separately; a grant still proves no consent or free quota.
All results set canExecute:false. Recheck real schemas, access, authority and cost
before independently calling any provider; the CLI never executes those operations.

## Jobs and Tasks integration (0.2.0)

Codex Process Jobs: Windows uses host sessions; POSIX detached work may reuse the existing Apache-2.0 controller, with its own lifecycle and release boundary. No controller code or private job state is copied.

Codex Tasks: discover the existing optional native App/provider at runtime. No fixed App ID or new connection is added. Environment discovery, selection, task creation, free quota and successful completion are independent observations. The installed Business provider exposes a ready managed configuration; this does not imply Personal availability or free remote execution. See [execution routes](execution.md).
