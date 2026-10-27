---
name: onedrive
description: "Read and manage OneDrive files through the OneDrive App: search, folders, download, upload, rename, move, copy, sharing, permissions, versions, restore and quota."
---
# OneDrive

Use the dedicated OneDrive App referenced by .app.json. CloudStorage Portal uses
this same App. Never substitute OneDrive Broker Staging, SharePoint or a local
Windows sync folder. No separate CloudStorage Portal Local installation is needed.

Discover actual host tools and call onedrive_account first. Bind all item, folder,
permission and version IDs to that observed account and drive. Resolve duplicate
names before a write. Package presence is not proof of loaded or working tools.

## Workflows

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

## Transfers and limits

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
