---
name: google-workspace
description: "Use when the user wants to find, read, create, update, copy, share or export Google Drive files, Docs, Sheets or Slides in Claude through the Google connectors."
---
# Google Workspace (Claude)

Use the Google Drive, Docs, Sheets and Slides connectors that are authorized in
this account. Discover the tools first; names carry a host prefix.

## Find and read

- Search with the Drive search tool and narrow by name, type or folder. A hit
  is metadata: read the file before quoting it.
- Read Docs with the Docs read tool, Sheets with the values tool for an exact
  range, and Slides with the presentation or slide-page tools.
- Other files: read text content with the Drive read tool, or download the
  content when the user needs the file itself.
- Report title, file ID, owner and link for every file you use.

## Change

1. Confirm the exact file ID and the account before any write. Read the
   current content or range first.
2. Docs: send the smallest edit that does the job. Sheets: write to an exact
   A1 range; append only when the user asked to add rows. Slides: change the
   named slide or element only.
3. Read back the changed part and report what changed.
4. Copy, create and update need the user's request. Trashing a file and
   changing sharing need explicit confirmation for that file; report the
   resulting permissions.

## Limits

- Comments, revision history and permission inspection depend on which tools
  the connector exposes; if a tool is missing, say so instead of guessing.
- Moving a Google Doc, Sheet or Slides file to Dropbox or OneDrive means
  exporting it to a file format first. Say which format was used.
