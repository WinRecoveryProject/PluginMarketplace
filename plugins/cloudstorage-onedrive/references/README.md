# Portable manifest reference

`portable-plugin.json` preserves the Agent Plugins representation of CloudStorage OneDrive. It is not an active manifest in this Git-marketplace package.

The active Codex package intentionally uses `.codex-plugin/plugin.json` and `.app.json`. Current Codex releases suppress app declarations from non-global marketplace packages when a root `plugin.json` selects the Agent Plugin format. To build a separate portable distribution, copy this file to `plugin.json` in a separate package root; do not copy it into this app-bearing Codex package.
