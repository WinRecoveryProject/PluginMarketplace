---
name: cloudstorage-portal
description: "CloudStorage Portal: Coordinate Dropbox, Google Drive and OneDrive through existing authorized App or MCP connections and a unified skill layer. Use when the user asks for clean-up-dropbox-content, cloudstorage-connections, cloudstorage-portal, cloudstorage-setup-docs, collect-files-with-request, find-dropbox-content, google-docs, google-drive, google-drive-comments, google-sheets, google-slides, inspect-dropbox-file work, or names the cloudstorage-portal plugin."
---

# CloudStorage Portal

Gemini export of the `cloudstorage-portal` plugin from WinRecoveryProject/PluginMarketplace, version `0.9.14`. Source: `plugins/cloudstorage-portal`.

Dropbox, Google Drive and OneDrive workflows through existing authorized connections. Discover each available App or MCP route without duplicate login.

## How to use this skill

1. Pick the sub-skill below whose description matches the request.
2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.
3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.
4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.
5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.
6. Instructions sometimes name another file by its original path (for example `../../shared/x.md` or `references/y.md`). Those paths do not exist in this upload: resolve them against the `Source:`/`File:` path of the text you are reading and look them up in `references/_index.md`, which says which reference file and section holds the content.

## Sub-skills

| Skill | When to use | Reference |
| --- | --- | --- |
| `clean-up-dropbox-content` | Clean up Dropbox content by identifying obsolete, duplicate, temporary, or unwanted files and deleting only after explicit review. Use when the user explicitly asks to delete, remove, or clean up Dropbox files or folders. | `references/clean-up-dropbox-content.md` |
| `cloudstorage-connections` | Configure or inspect unified connection management for Dropbox, Google Drive and OneDrive. Use for OAuth, login, account IDs, token lifecycle, scopes, linking accounts and three-provider readiness. | `references/cloudstorage-connections.md` |
| `cloudstorage-portal` | Use when the user wants to search, read, upload, organize, share, inspect file history or transfer files across Dropbox, Google Drive and OneDrive through their existing App or MCP connections. | `references/cloudstorage-portal.md` |
| `cloudstorage-setup-docs` | Explain and reproduce the documented zero-cost CloudStorage Portal setup, Microsoft Entra app roles, hosted OneDrive broker, callbacks, DCR and secret-field mapping; use for setup documentation, onboarding and login troubleshooting. | `references/cloudstorage-setup-docs.md` |
| `collect-files-with-request` | Create, inspect, and manage Dropbox file requests for collecting uploads from other people. Use when the user asks to collect files, request uploads, create an upload portal, check a file request, or list existing file requests. | `references/collect-files-with-request.md` |
| `find-dropbox-content` | Find Dropbox files and folders relevant to a user request. Use when the user asks to search Dropbox, find a document, locate recent files, browse a folder, identify likely source files, or narrow down where content lives before reading, sharing, organizing, or restoring it. | `references/find-dropbox-content.md` |
| `google-docs` | Use when the user wants to create, read or edit a native Google Docs document through a connected Google Drive account. | `references/google-docs.md` |
| `google-drive` | Use connected Google Drive as the single entrypoint for Drive, Docs, Sheets, and Slides work. Use when the user wants to find, fetch, organize, share, export, copy, or delete Drive files, or summarize and edit Google Docs, Google Sheets, and Google Slides through one unified Google Drive plugin. | `references/google-drive.md` |
| `google-drive-comments` | Write, reply to, and resolve Google Drive comments on Docs, Sheets, Slides, and Drive files with evidence-backed location context. Use when the user asks to leave comments, review a file with comments, respond to comment threads, or resolve Drive comments. | `references/google-drive-comments.md` |
| `google-sheets` | Analyze and edit connected Google Sheets with range precision. Use when the user wants to create Google Sheets, find a spreadsheet, inspect tabs or ranges, search rows, plan formulas, create or repair charts, clean or restructure tables, write concise summaries, or make explicit cell-range updates. | `references/google-sheets.md` |
| `google-slides` | Route Google Slides authoring requests and derive a design system from a native template or reference deck. Use this skill when the user provides an existing native Google Slides deck as a template, reference, or prior-period source, or asks to edit, update, repair, restyle, or clean up an existing native Google Slides deck. Use the Presentations skill instead for net-new presentation creation when no existing native Google Slides deck must be followed. | `references/google-slides.md` |
| `inspect-dropbox-file` | Inspect a Dropbox file or folder by checking metadata, shared links, and file content when needed. Use when the user asks what a file is, whether it is shared, when it changed, what access links exist, or asks to read/analyze a Dropbox file. | `references/inspect-dropbox-file.md` |
| `onedrive` | Use when the user wants to read or manage OneDrive files through the existing OneDrive App: search, folders, uploads, downloads, rename, move, copy, sharing, permissions, versions, restore and quota. | `references/onedrive.md` |
| `organize-dropbox-folder` | Organize Dropbox files and folders by creating folders, copying content, or moving content into a cleaner structure. Use when the user asks to organize, archive, consolidate, restructure, copy, or move Dropbox content. | `references/organize-dropbox-folder.md` |
| `share-dropbox-content` | Share Dropbox files or folders by creating shared links, inspecting existing shared links, or explaining current shared-link state. Use only when the user explicitly asks to create a shared link, check access, or inspect a Dropbox shared link. | `references/share-dropbox-content.md` |
| `upload-to-dropbox` | Use when the user asks to save an attachment, generated file, or file-library selection from this conversation to Dropbox. Use the packaged file-request workflow for uploads from other people. | `references/upload-to-dropbox.md` |

## Example prompts

- Vis mine tilgængelige cloudforbindelser og søg på tværs af de tilsluttede konti.

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
- `references/_plugin-references.md`
- `references/_plugin-scripts.md`
- `references/_index.md`
