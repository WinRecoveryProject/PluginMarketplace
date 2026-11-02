---
name: onedrive
description: "Manage the authenticated OneDrive account through the OneDrive App and associated MCP server: account, files, folders, search, transfers, sharing, versions and quota."
---
# OneDrive

This plugin combines one registered OneDrive App mapping (`.app.json`), one remote
OneDrive MCP server (`mcp.json` and `.mcp.json`), and this OneDrive skill.
The native Desktop entrypoint `.codex-plugin/plugin.json` declares `apps` and
`mcpServers`. The portable manifest is retained under `references/` for export;
placing it at the Desktop package root shadows the native entrypoint. An App
reference in a ZIP is not sufficient proof that the host activates that App.
Use the connected OneDrive App's account identity and associated tools as the
authoritative session. Do not assume that the registered App and independently
declared MCP URL share a login session until that has been proven end to end.
Do not request a second OneDrive sign-in merely to demonstrate functionality.
Do not present the unrelated OneDrive Broker Staging or SharePoint connector as
proof that this plugin's own MCP server is operational.

## Authentication and identity

ChatGPT/App-to-MCP authorization and MCP-to-Microsoft Graph delegated authorization
are distinct boundaries. Use the App's Microsoft login chain and provider-managed
consent. The MCP configuration declares DCR (`client.mode: dcr`) and the broker
scopes `onedrive.read`/`onedrive.write`; these are **not** Microsoft Graph scopes.
Enforce read/write separation server-side; do not infer that a manifest scope
causes Graph consent. Never log, output, transmit, or persist account tokens in
plugin files. Validate audience, issuer, scopes, account/tenant binding, and
expiration server-side. For fresh scopes, require the provider's authorization
flow rather than treating a read-only grant as write authorization.

Discover the actual available OneDrive tools. If they are not exposed by this
plugin, report the connection limitation and do not substitute a different app.
Call `onedrive_account` before item operations when that tool exists. Bind item,
folder, permission and version IDs to the observed drive/account. Detect ambiguous
names before writing. A package manifest is not a live connectivity test.

## Intended MCP capabilities (verify before use)

The source package describes these `onedrive_` tools:
- `account`, `get_drive`: account identity and quota.
- `list_root`, `list_folder`, `search`, `get_item`: discovery and metadata.
- `read_text`, `download_file`, `export_file`: file reads and conversion.
- `create_folder`, `upload_file`, `update_file_content`: creation and edits.
- `create_upload_session`, `upload_chunk`, `get_upload_status`, `cancel_upload`:
  resumable transfers.
- `rename_item`, `move_item`, `copy_item`, `get_copy_status`: organization.
- `list_permissions`, `create_share_link`, `invite_to_item`, `revoke_permission`:
  sharing.
- `list_versions`, `download_version`, `restore_version`: file history.
- `delete_item`: recycle-bin deletion.

These tools are specified by the archived source skill, **not confirmed** by
live discovery here. Inspect each actual tool schema and response. Continue
pagination until all requested pages are fetched. Do not edit opaque cursors,
copy jobs or upload session identifiers. Changing existing files requires a
current exact eTag where supported. Resolve version conflicts without silently
replaying writes. For asynchronous copies, poll completion and verify result.

## Safe operation rules

Reading metadata or content never implies user authorization to modify files.
Creating, overwriting, moving, sharing, revoking, restoring, or deleting must
follow user intent and any required host confirmation. Never share a file just
to test sharing. Require an explicit audience/recipient and role for invitations
and share links. Never permanently delete as part of verification. Avoid
side-effecting tests on user data; test writes only against explicitly approved
disposable fixtures. Respect the Microsoft Graph and broker rate limits.

## Transfer and format boundaries

The archived source specifies a 64 KiB UTF-8 `read_text` limit, a 2 MiB
simple-transfer ceiling, and resumable upload chunks up to 1280 KiB with
non-final chunks in multiples of 320 KiB. Treat these as source-claimed
broker limits pending live verification. Verify uploaded item ID, parent, size
and content/hash when available. Export is not native Office document editing.

CloudStorage Portal may invoke this OneDrive capability as a consumer but must
not create an independent OneDrive login identity or exchange OAuth tokens with
other cloud providers. For cross-provider transfers, read exact bytes from the
source provider using its own approved connector, verify integrity, upload via
the destination provider, and independently confirm completion. Do not delete
the source automatically.

## Required connection test sequence

1. Confirm plugin manifest advertises the App mapping and the OneDrive MCP URL.
2. Confirm the host actually exposes the registered OneDrive App and tools.
3. Connect and authorize with Microsoft through the App's supported flow.
4. Read authenticated account identity, drive details and root metadata.
5. Read a user-chosen small text file without modifying it.
6. Only after explicit approval, run isolated create/read/update/recycle-bin
   fixture tests and restore checks where supported.
7. Record each result separately as passed, failed or untested. Never infer
   a live Microsoft Graph success from static manifests or staging connectors.
