# Skill: cloudstorage-onedrive

- Plugin: `cloudstorage-portal` (0.9.15)
- Source: `plugins/cloudstorage-portal/skills/cloudstorage-onedrive/SKILL.md`

> Use when the user wants to read or manage OneDrive files through the existing OneDrive App: search, folders, uploads, downloads, rename, move, copy, sharing, permissions, versions, restore and quota.

## Instructions

### OneDrive

Use the dedicated OneDrive App referenced by .app.json. CloudStorage Portal uses
this same App. Never substitute OneDrive Broker Staging, SharePoint or a local
Windows sync folder. No separate CloudStorage Portal Local installation is needed.

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

If the OneDrive tools are unavailable in Business, report that the Portal
route is unavailable and point to the existing Workspace OneDrive entry in
the Business catalogue. Preserve the current account and connections. Do not
switch accounts, reconnect, or create an App as a fallback.

#### Workflows

All tools have prefix onedrive_:
- account, get_drive: account identity and storage quota.
- list_root, list_folder, search, get_item: discovery and exact metadata.
- read_text, download_file, export_file: bounded file content and PDF/HTML export.
- create_folder, upload_file, update_file_content: file/folder creation and updates.
- create_upload_session, upload_chunk, get_upload_status, cancel_upload:
  resumable larger new-file uploads.
- rename_item, move_item, copy_item, get_copy_status: organization.
- list_permissions, create_share_link, invite_to_item, revoke_permission:
  sharing and access management.
- list_versions, download_version, restore_version: history.
- delete_item: recoverable deletion to the OneDrive recycle bin.

Read actual tool schemas. Continue lists using the returned cursor with the same
query/folder; partial pages are not complete inventories. Cursors and job/session
handles are encrypted and account-bound; never edit or transfer them.

Modifying existing items requires current exact eTag. Never replay uncertain or
conflicted writes automatically. Copy acceptance is not completion: poll the
exact job and inspect the final item. Copies inherit destination permissions.

Reads require onedrive.read. Writes require onedrive.read + onedrive.write.
Existing read grants cannot silently gain writes. An insufficient-scope challenge
starts OAuth; obtain the required Microsoft consent instead of retrying a read
token. New write grants use delegated User.Read, Files.ReadWrite and offline_access
through the existing confidential host. Never print or copy credentials.

Sharing requires explicit audience/recipient and role. Never send an invitation
or publish a link just to demonstrate capability. Delete only requested items or
explicitly disposable test items. No permanent-delete tool is provided.

#### Resolve a known file or folder after an empty search

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

If Node is available, `node scripts/resolve-onedrive-child.mjs` accepts JSON
with `account` (`subject`, `driveId` and `driveType`), `parentId`, `name`,
`kind` (`file` or `folder`) and `pages` on stdin. After fetching all pages
from the App, include only each request's `parentId` and the response's
`account` identity fields, `more` and `items` (`id`, `name`, `kind` and
`parentId`). Exclude credentials and cursors. Use the result before the same
exact-item metadata recheck in step 3. The helper only checks supplied results.

#### Transfers and limits

Simple uploads and binary download/export return at most 2 MiB per file.
read_text supports selected UTF-8 types up to 64 KiB. Larger new uploads use
sequential session chunks up to 1280 KiB: non-final chunks must be multiples of
320 KiB. Check server ranges, then verify final item ID, parent and size.
File storage/export does not mean native Word/Excel/PowerPoint editing.

For Portal transfers, fetch/export exact source bytes through that provider,
verify size/hash where possible, upload to the exact destination folder and
read back metadata/content. Keep the source. Never pass tokens or capability URLs
between providers. Report unsupported file sizes/formats explicitly.

Runtime 0.3.0 implements 28 tools. Local tests, discovery and App bindings do not
prove live writes for the current account. Report each actual operation and its
readback independently; never present staging evidence as OneDrive success.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "OneDrive (Portal)"
  short_description: "Route verified Microsoft OneDrive work"
  icon_small: "./assets/onedrive.png"
  icon_large: "./assets/onedrive.png"
  brand_color: "#0078D4"
  default_prompt: "Use $cloudstorage-onedrive to route this OneDrive request through the verified Microsoft App or the explicitly selected Portal connection."
```

### File: `assets/onedrive.png`

_Binary asset, not embedded._
