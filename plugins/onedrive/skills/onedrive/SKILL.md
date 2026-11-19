---
name: onedrive
description: "Use when reading or managing the authenticated OneDrive account through its existing App: files, folders, search, transfers, sharing, versions and quota."
---
# OneDrive

This plugin uses one registered OneDrive App mapping (`.app.json`) and the
existing hosted MCP behind that App. The native Desktop entrypoint
`.codex-plugin/plugin.json` declares the App and two skills. It does not create
an independent native MCP OAuth client or request a second OneDrive login.
Historical standalone MCP declarations are archived under `references/legacy`
and must not be copied back to the package root. The portable manifest remains
under `references/` for export; placing it at the Desktop package root shadows
the native entrypoint.

Use the connected OneDrive App's identity and tools as the authoritative session.
CloudStorage Portal refers to this same App. A remote catalog card generated
for the App and a Git Marketplace package can have different host menus; this
does not make them different Microsoft applications. Do not uninstall the
registered App as duplicate cleanup: that can break the shared connection.
Never present OneDrive Broker Staging or SharePoint as proof of this App's access.

## Authentication and identity

ChatGPT/App-to-MCP authorization and MCP-to-Microsoft Graph delegated authorization
are distinct boundaries. Use the App's Microsoft login chain and provider-managed
consent. The existing App's broker scopes `onedrive.read`/`onedrive.write` are
**not** Microsoft Graph scopes. This package reuses that App's existing OAuth
configuration; it does not declare a second client or change consent scopes.
Enforce read/write separation server-side; do not infer that a manifest scope
causes Graph consent. Never log, output, transmit, or persist account tokens in
plugin files. Validate audience, issuer, scopes, account/tenant binding, and
expiration server-side. For fresh scopes, require the provider's authorization
flow rather than treating a read-only grant as write authorization.

Inspect the current tool schemas before calling `onedrive_account`. For a tool
that accepts `link_id`, use only the exact selector advertised for the intended
linked account. If the intended link is absent or ambiguous, clarify before
accessing files. On a schema without `link_id`, omit it and verify the active
profile. Proceed only after `onedrive_account` confirms the intended identity.
Reuse the same verified link for calls that support it and bind all item,
folder, permission, version and cursor IDs to that account and drive. Resolve
duplicate names before a write.

If the host rejected a read before dispatch because `link_id` was missing,
recheck the schema and intended account, then retry only that exact read with
the verified selector. For an uncertain write, reconcile with read-only
metadata and never replay the write automatically.

If this package's OneDrive tools are unavailable, report the connection
limitation. In Business, if the Git Marketplace entry lacks those tools,
direct the user to the existing Workspace OneDrive entry in the Business
catalogue. Verify its intended App and connected Microsoft account before
accessing files there. Keep existing connections and avoid implicit account
or App switches.

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

## Resolve a known file or folder after an empty search

When a successful `onedrive_search` yields no match and the exact child name,
expected kind and its direct parent ID are already verified in this account:

1. Call `onedrive_list_folder` with that parent ID and the same verified
   `link_id` where required. List direct children only. Keep the parent and
   account fixed and follow that folder's returned cursors in order until
   `more: false`. Stop as incomplete on a failed call, missing or repeated next
   cursor, identity mismatch or unfinished pagination.
2. Compare the exact name, kind and returned parent ID. Collect distinct item
   IDs across the complete list before deciding. With zero matches, report
   that the child was absent from this completed parent listing. With multiple
   matches, report ambiguity and ask the user to identify the item. Never
   choose by position, timestamp or a similar name.
3. For a unique match, call `onedrive_get_item` for that exact ID on the same
   account. Verify its current name, kind and parent before using it. A read
   may then proceed as requested. A write still requires its own authorization
   and any current eTag required by the operation.

This fallback applies only to a known direct parent after a successful empty
search. Keep ordinary discovery on `onedrive_search`. Without a verified parent
or after an authorization or tool error, report what is unresolved. Do not
recursively traverse folders or switch accounts to recover a search miss.

If Node is available, `node skills/onedrive/scripts/resolve-onedrive-child.mjs` accepts JSON
with `account` (`subject`, `driveId` and `driveType`), `parentId`, `name`,
`kind` (`file` or `folder`) and `pages` on stdin. After fetching all pages
from the App, include only each request's `parentId` and the response's
`account` identity fields, `more` and `items` (`id`, `name`, `kind` and
`parentId`). Exclude credentials and cursors. Use the result before the same
exact-item metadata recheck in step 3. The helper only checks supplied results.

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

1. Confirm the package has the existing App mapping and no extra native MCP
   client; the registered App owns its hosted MCP connection.
2. Confirm the host actually exposes the registered OneDrive App and tools.
3. Connect and authorize with Microsoft through the App's supported flow.
4. Read authenticated account identity, drive details and root metadata.
5. Read a user-chosen small text file without modifying it.
6. Only after explicit approval, run isolated create/read/update/recycle-bin
   fixture tests and restore checks where supported.
7. Record each result separately as passed, failed or untested. Never infer
   a live Microsoft Graph success from static manifests or staging connectors.
