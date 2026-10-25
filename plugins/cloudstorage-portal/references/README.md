# Portable manifest references

These files preserve the Agent Plugins representation of CloudStorage Portal. They are references and are not active manifests in this Git-marketplace package.

The active Codex package intentionally uses `.codex-plugin/plugin.json`, `.app.json` and `.mcp.json`. Current Codex releases classify a package with a root `plugin.json` as an Agent Plugin and suppress its app declarations unless it comes from the remote global marketplace. Keeping the portable root manifest beside the Codex manifest would therefore hide Dropbox, Google Drive and OneDrive from the plugin detail page.

To build a separate portable distribution, copy `portable-plugin.json` to `plugin.json` and `portable-mcp.json` to `mcp.json` in a separate package root. Do not copy either file into this app-bearing Codex marketplace package.
