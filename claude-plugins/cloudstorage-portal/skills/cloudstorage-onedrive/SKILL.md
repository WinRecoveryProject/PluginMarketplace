---
name: cloudstorage-onedrive
description: "Use when the user wants to find or read OneDrive files from Claude. Works through the read-only OneDrive MCP of the onedrive plugin."
---
# OneDrive (Claude)

OneDrive access in Claude comes from the `onedrive` plugin in the
WinRecoveryProject Marketplace. It provides a read-only MCP with tools such as
`onedrive_account`, `onedrive_get_drive`, `onedrive_list_root`,
`onedrive_list_folder`, `onedrive_search`, `onedrive_get_item` and
`onedrive_read_text`.

1. If those tools are missing, tell the user to install the `onedrive` plugin
   and sign in to it. Do not substitute SharePoint, Microsoft 365 search or a
   local sync folder.
2. Call `onedrive_account` first and confirm the intended account. Bind every
   item ID and folder listing to that account.
3. Resolve names to item IDs before reading. If several items share a name,
   list them with their paths and ask which one.
4. Writes (upload, move, rename, delete, sharing) are not available in Claude.
   Say so and offer the read-only result or a transfer plan the user can run.
5. For a transfer from OneDrive to another provider, read the text content,
   write it with the destination connector and read back the result. Binary
   files cannot be transferred this way; report them as not transferred.
