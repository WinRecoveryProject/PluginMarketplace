---
name: cloudstorage-portal
description: "Use when the user wants to search, read, upload, organize, share or transfer files across Dropbox, Google Drive and OneDrive in Claude through connectors that are already authorized."
---
# CloudStorage Portal (Claude)

Coordinate Dropbox, Google Drive and OneDrive through the connectors already
authorized in this Claude account. This package declares no Apps, MCP servers
or hooks. A connector that is not available is reported as unavailable; never
ask for passwords, tokens or API keys in chat.

## Routes

| Request | Skill |
| --- | --- |
| Which providers are connected, and as whom | [cloudstorage-connections](../cloudstorage-connections/SKILL.md) |
| Dropbox search | [find-dropbox-content](../find-dropbox-content/SKILL.md) |
| Dropbox metadata and content | [inspect-dropbox-file](../inspect-dropbox-file/SKILL.md) |
| Dropbox folders, copy, move and rename | [organize-dropbox-folder](../organize-dropbox-folder/SKILL.md) |
| Dropbox sharing | [share-dropbox-content](../share-dropbox-content/SKILL.md) |
| Save text from this conversation to Dropbox | [upload-to-dropbox](../upload-to-dropbox/SKILL.md) |
| Collect uploads with a Dropbox file request | [collect-files-with-request](../collect-files-with-request/SKILL.md) |
| Dropbox cleanup | [clean-up-dropbox-content](../clean-up-dropbox-content/SKILL.md) |
| Google Drive, Docs, Sheets and Slides | [google-workspace](../google-workspace/SKILL.md) |
| OneDrive | [cloudstorage-onedrive](../cloudstorage-onedrive/SKILL.md) |

## Rules for every provider

1. Discover the tools that are actually available before acting. Tool names
   carry a host prefix (for example `mcp__Dropbox__list_folder`); match on the
   final name. A skill in this package is not a granted permission.
2. Confirm the account before reading or writing, using the connector's own
   identity or profile tool where it has one. Never infer an account from a
   remembered email.
3. Attach provider, account, item ID or path, and the returned URL to every
   result. Use `(provider, account, item-id)` as identity and do not merge
   files that only share a name. A search hit is metadata, not read content.
4. Before a write, resolve the exact source and destination. Ask only when the
   target is ambiguous. Moves, deletes, sharing changes and file requests need
   the user's explicit go-ahead for that item.
5. For a transfer between providers, read the exact source, write it through
   the destination connector, read back the destination metadata and report
   both sides. Never delete the source unless asked. Never replay a write whose
   outcome is unknown; check first.
6. Google Docs, Sheets and Slides have no automatic Dropbox or OneDrive
   equivalent. Export to a file format first and say so.
7. Report each provider's state separately: not connected, connected but not
   verified, read verified, write verified. Do not claim a provider works
   because the package is installed.
