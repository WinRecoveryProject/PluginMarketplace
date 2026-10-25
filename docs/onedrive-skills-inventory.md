# OneDrive Skill Inventory

Source inspected: `C:\Users\zilve\.agents\skills` on 2026-10-25.

The source contains 19 folders: 18 OneDrive-, Graph- or cloud-OAuth-related candidates and the generic `find-skills` helper. They are skills, not independently installable plugins. Several declare the same internal skill name and must not be packaged together unchanged.

## Unique specialist skills

| Folder | Declared name | Role |
| --- | --- | --- |
| `dropbox-oauth-app` | `dropbox-oauth-app` | Dropbox developer-app and OAuth registration guidance |
| `google-drive-oauth-app` | `google-drive-oauth-app` | Google Drive scope and verification guidance |
| `m365-onedrive` | `m365-onedrive` | OneDrive work through the Microsoft 365 CLI |
| `microsoft-graph-gateway` | `microsoft-graph-gateway` | General Microsoft Graph routing and tooling |
| `microsoft-onedrive-oauth-app` | `microsoft-onedrive-oauth-app` | Microsoft Entra and OneDrive OAuth-app registration guidance |
| `ms-onedrive-personal-graph` | `ms-onedrive-personal-graph` | Personal OneDrive through Microsoft Graph device-code flow |
| `onedrive-search` | `onedrive-search` | Focused OneDrive search workflow |

## Duplicate-name families requiring consolidation

| Declared name | Folders | Finding |
| --- | --- | --- |
| `add-onedrive` | `add-onedrive`, `add-onedrive(1)` | Two Power Apps connector variants with overlapping purpose |
| `microsoft-onedrive` | `microsoft-onedrive`, `microsoft-onedrive(1)` | One lightweight Graph guide and one larger agent-tool package |
| `onedrive` | `onedrive`, `onedrive(1)` through `onedrive(6)` | Seven mutually conflicting implementations, including hosted, Graph and generic automation variants |

## Reusable capability findings

The following concepts are useful for the CloudStorage implementation, but only when an implemented MCP tool and granted scope support them:

- immutable account, tenant, drive and item identity on every operation;
- bounded pagination and cursors tied to the originating account and query;
- explicit conflict behavior for uploads, copies, moves and renames;
- upload sessions for large files, asynchronous copy monitoring and read-back verification;
- exact-file search, shared-link resolution, metadata, previews, conversion, permissions and version handling;
- delta queries for efficient synchronization and webhook-plus-delta semantics;
- separate confirmation gates for overwrite, delete, external sharing and permission changes;
- explicit handling of Graph 401, 403, 404, 409, 429 and retry-after responses;
- strict separation of personal Microsoft accounts, Entra work/school accounts, SharePoint libraries and local sync folders.

These are requirements and future candidates, not claims about the current backend. The dedicated hosted OneDrive MCP currently exposes four read-only tools. The local Portal runtime exposes bounded identity, selection, search, metadata, folder and text-read operations, but no cloud writes.

## Rejected execution dependencies

The inventory also contains mutually incompatible execution substrates. They are not copied into the Portal merely because their documentation mentions OneDrive:

- Power Apps connectors and generated Power Apps services;
- direct environment access tokens;
- m365 CLI, Zapier, Apideck, ClawLink and Refly workflows;
- Claude-specific plugin variables and commands;
- device-code implementations that would bypass the Portal's existing App and OAuth identities.

Their useful behavioral guidance may be rewritten as provider-neutral safety rules. Their commands, credentials, IDs and vendor dependencies are not imported.

## Packaging decision

- None of the duplicate folders are copied into the marketplace as standalone plugins.
- CloudStorage OneDrive remains the supported dedicated OneDrive plugin because it has an explicit MCP endpoint, a verified ChatGPT App ID and a unique skill name.
- CloudStorage Portal is the supported three-provider package. Its OneDrive skill may describe implemented operations and safely documented future gaps, but must not promise tools the current runtime does not expose.
- Useful material from the local skill collection may only be merged into uniquely named references after provenance, command safety, licensing and provider compatibility review.
- A Microsoft Entra application/client ID is not a Codex App ID. No `asdk_app_<Entra-ID>` binding is generated from this inventory.
