# CloudStorage Portal for Claude

This is the Claude package of CloudStorage Portal. It is built from the same
repository as the Codex plugin by `scripts/build-claude-package.mjs`.

| Provider | Route in Claude |
| --- | --- |
| Dropbox | The Dropbox connector. The six Dropbox workflow skills are the Codex skills unchanged, because the tool names match. |
| Google Drive, Docs, Sheets, Slides | The Google Drive, Docs, Sheets and Slides connectors, through the `google-workspace` skill. |
| OneDrive | The `onedrive` plugin from the same Marketplace, which provides a read-only OneDrive MCP. |

The package declares no Apps, MCP servers or hooks. It uses only connectors
that are already authorized in Claude. A provider that is not connected is
reported as unavailable; the skills never ask for credentials in chat.

## Install

```text
/plugin install cloudstorage-portal --marketplace WinRecoveryProject/PluginMarketplace
```

For OneDrive, also install the `onedrive` plugin from the same marketplace.
