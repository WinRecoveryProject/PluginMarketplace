# Portable manifest references

This file preserves the Agent Plugins representation of CloudStorage Portal. It is a reference and is not an active manifest in this Git-marketplace package.

The active Codex package intentionally uses `.codex-plugin/plugin.json` and `.app.json`. Current Codex releases classify a package with a root `plugin.json` as an Agent Plugin and suppress its app declarations unless it comes from the remote global marketplace. Keeping the portable root manifest beside the Codex manifest would therefore hide Dropbox, Google Drive and OneDrive from the plugin detail page.

To build a separate portable distribution, copy `portable-plugin.json` to `plugin.json` in a separate package root. CloudStorage Portal Local owns the separate MCP manifest and runtime.
