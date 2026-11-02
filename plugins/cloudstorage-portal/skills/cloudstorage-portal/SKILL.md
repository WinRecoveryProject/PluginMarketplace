---
name: cloudstorage-portal
description: Coordinate Dropbox, Google Drive and OneDrive file search, reads, uploads, organization, sharing, history and transfers through their dedicated App connections.
---
# CloudStorage Portal

Use the three App bindings in .app.json. OneDrive is the canonical hosted OneDrive App, not OneDrive Broker Staging. No separate CloudStorage Portal Local runtime is required. A specific App-ID or Business workspace is not a product requirement. Preserve the existing names and icons.

Discover the actual provider tools and confirm account identity before operations. Read the relevant provider skill. Tool discovery, OAuth consent, actual operations and successful readback are separate evidence; do not claim a complete integration from login or package validation alone. Missing write scopes require the host OAuth flow, not a silent token substitution.

## Workflow routing

Use the full provider workflows included in this package; do not limit the portal to search and read.

| Request | Packaged skill |
| --- | --- |
| Setup documentation, 0 kr. architecture, callbacks and matching credential fields | [cloudstorage-setup-docs](../cloudstorage-setup-docs/SKILL.md) |
| Dropbox search | [find-dropbox-content](../find-dropbox-content/SKILL.md) |
| Dropbox metadata and content | [inspect-dropbox-file](../inspect-dropbox-file/SKILL.md) |
| Dropbox folders, copy, move and rename | [organize-dropbox-folder](../organize-dropbox-folder/SKILL.md) |
| Dropbox sharing | [share-dropbox-content](../share-dropbox-content/SKILL.md) |
| Dropbox upload requests | [collect-files-with-request](../collect-files-with-request/SKILL.md) |
| Dropbox cleanup | [clean-up-dropbox-content](../clean-up-dropbox-content/SKILL.md) |
| Google Drive files, folders, import, export and versions | [google-drive](../google-drive/SKILL.md) |
| Google Docs | [google-docs](../google-docs/SKILL.md) |
| Google Sheets | [google-sheets](../google-sheets/SKILL.md) |
| Google Slides | [google-slides](../google-slides/SKILL.md) |
| Google Drive comments | [google-drive-comments](../google-drive-comments/SKILL.md) |
| Three-provider OAuth and connection setup | [cloudstorage-connections](../cloudstorage-connections/SKILL.md) |
| OneDrive operations and adapter readiness | [onedrive](../onedrive/SKILL.md) |

Skills contain workflows; executable tools, granted scopes and resource permissions determine actual access. Never report a copied skill as a newly granted permission. Provider tools remain provider-specific. Google Docs, Sheets and Slides operations have no automatic OneDrive or Dropbox equivalent.

1. Discover available provider tools and their current account selectors. Treat dependency installation, an advertised account, successful reads, write capability and current consent as separate states. Never infer a connected account from a remembered email.
2. For Google Drive, inspect each current tool schema before choosing an account. If it exposes link_id, pass only an exact currently allowed selector. If it has no account selector, do not send a remembered link_id: verify the current profile, bind the operation to that observed identity, and report native multi-account selection as unavailable. Never treat removal of a selector as permission to write to a default account. After an argument-binding failure, re-read the schema and reconcile identity/resources with read-only calls before any retry; never replay uncertain writes. For supported cross-account reads, issue the same bounded query independently for all intended accounts; aggregate only after every result settles. A failed account is a partial failure, never an empty successful result. Keep each provider's pagination cursor bound to the account and original query.
3. Attach provider, account identity, item ID, returned URL and read status to each result. Use `(provider, account-selector, item-id)` as identity. Do not collapse equal file names across accounts. A search hit is metadata, not read content.
4. Before writes, resolve both source and destination accounts and resources. Ask only when the intended target is ambiguous. Apply the provider's existing consent and permission rules. This plugin cannot transfer, elevate or permanently preserve permissions. Do not change plugin permissions unless the user requests an exact mode and target.
5. For Dropbox, reuse its current authorized connection and returned paths/IDs. Follow the Dropbox workflow for sharing, uploads, moves and deletion. Preserve sharing state unless the user asks to change it.
6. Include OneDrive in every three-provider readiness report. Discover a supported integration or the configured Microsoft Graph adapter, verify account identity and drive access, and report the precise missing dependency when unavailable. Never treat SharePoint eligibility or a local OneDrive folder as proof of personal OneDrive API access. Do not fabricate account IDs, credentials or connected status. Follow the packaged OneDrive workflow.
7. For a transfer, read the exact source version, materialize through supported provider tools, verify bytes/hash where possible, write to the resolved destination and read back metadata. Record a receipt. Do not delete the source unless explicitly requested. Never replay uncertain writes automatically.
8. Keep credentials in provider-managed authentication. Do not put tokens, refresh tokens, passwords, permission grants or consent assertions into configuration, SQL, source code, logs or component archives.

The Portal routes to native provider Apps. Its OneDrive skill documents the current hosted read/write contract and limits. Historical Local-runtime evidence remains reference material; never use it as proof for the active App.