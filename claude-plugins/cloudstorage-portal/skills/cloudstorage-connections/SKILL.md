---
name: cloudstorage-connections
description: "Use when the user asks which of Dropbox, Google Drive and OneDrive are connected in Claude, as which account, and what each connection can read or write."
---
# CloudStorage connections (Claude)

Produce one readiness list with three providers. Check each one independently
and leave unknown values unknown.

1. **Dropbox.** Look for the Dropbox connector tools (for example
   `who_am_i`, `list_folder`). Call the identity tool and record the account
   and team context it returns.
2. **Google Drive.** Look for the Google Drive, Docs, Sheets and Slides
   connector tools. Confirm the account with a metadata or recent-files call
   and record the owner email the response shows.
3. **OneDrive.** Look for the `onedrive` MCP tools from the `onedrive` plugin
   (for example `onedrive_account`). Call the account tool. These tools are
   read-only; report writes as unavailable. SharePoint, Microsoft 365 search
   and a local sync folder are not OneDrive personal access.

For each provider report: tools found (yes/no), account verified (yes/no and
which account), read verified, write available. A provider with no tools is
"not connected": tell the user to connect it in Claude's connector settings,
or to install the `onedrive` plugin for OneDrive. Never ask for credentials in
chat and never copy credentials between providers.
