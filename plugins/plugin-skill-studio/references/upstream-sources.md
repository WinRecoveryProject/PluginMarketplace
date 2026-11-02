# Upstream sources

The project portfolio currently includes the following reference families under `C:\Users\zilve\_GitRootArchive_\CodexPluginProject`:

| Family | Observed version | Role |
| --- | --- | --- |
| Plugin Creator | 0.1.28 | Proprietary behavior and format reference; do not copy implementation |
| Plugin Eval | 0.1.2 official / 0.1.3 Codex snapshot | MIT evaluation reference and comparison baseline; the 0.1.3 snapshot is preserved but not published as a Zilvereyes plugin while its manifest still identifies OpenAI |
| Skill Creator | local system source | Skill authoring reference |
| Skill Installer | local system source | Installation and discovery reference |
| Codex Security | 0.1.32 | Proprietary security workflow reference |
| OpenAI Developers | 1.3.6 | Proprietary OpenAI development workflow reference |
| Vercel | 0.54.1 | Apache-2.0 hosting and deployment reference |
| GitHub | 0.1.12-5f7cd798dc99 | MIT App-binding reference |
| Linear | 5.0.1 | MIT App/MCP packaging reference |
| Dropbox | 6.0.0 | App-backed provider packaging reference |
| Google Drive | 0.1.22 | MIT connector-backed provider reference |
| Old Dropbox and Google Drive | 5.0.1 / 0.1.15 | Historical comparison only |
| OpenAI Python SDK | 3.37.0 | API client and compatibility reference; not a plugin or marketplace source |
| OpenAI Node SDK | 7.43.0 | Node API client reference for separately scoped OpenAI API features; not required by the CloudStorage provider broker |
| OpenAI Ruby SDK | 0.111.0 | API client reference; not a plugin or marketplace source |
| OpenAI Java SDK | 4.91.0 | Java/Kotlin API client reference; not a plugin or marketplace source |
| OpenAI .NET SDK | current repository snapshot | .NET API client reference; not a plugin or marketplace source |
| OpenAI OpenAPI | 2.0.0 release | API schema and compatibility reference; not an executable plugin |
| OpenAI Agents JS | current repository snapshot | Agent and voice-workflow framework reference |
| OpenAI Cookbook | current repository snapshot | Examples and implementation reference |
| OpenAI Secure MCP Tunnel client | current repository snapshot | Candidate private transport for a separately evaluated local/remote MCP architecture; does not replace provider OAuth identity |
| OpenAI Codex | current repository snapshot | CLI and coding-agent implementation reference |
| OpenAI Codex Action | current repository snapshot | GitHub Actions integration and CI reference |
| OpenAI Terraform provider | current repository snapshot | OpenAI infrastructure-as-code reference |
| OpenAI Agents Python | current repository snapshot | Python agent-framework reference parallel to Agents JS |
| OpenAI Guardrails JS | current repository snapshot | JavaScript/TypeScript guardrail and validation reference |
| OpenAI php2shell checker | current repository snapshot | Specialized security-analysis reference; not a plugin source for CloudStorage |

This list is a work portfolio, not an installation request and not a deletion list. Add future candidates without removing existing rows.

## Source-selection rule

Material found in Codex is treated as a real observed source. A version that is newer than another snapshot must not be dismissed merely because its origin has not yet been reconstructed. Record its exact path, manifest identity, content differences and license first.

“Newest” and “canonical” are separate claims:

- newest describes the observed version ordering;
- canonical describes which source is authoritative for a specific build;
- publishable describes whether its identity, license and substantive changes support presenting it as a Zilvereyes package.

No one of those claims authorizes deleting, uninstalling or overwriting another source.
