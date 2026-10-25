# CloudStorage OneDrive

Private standalone plugin for the dedicated OneDrive component of CloudStorage Portal.

The active Codex package references the approved OneDrive App with ID `asdk_app_6ade0fe240408191bd087bff2df78e79` through `.app.json`. The App owns its connection flow and exposes the OneDrive tools. No token, refresh grant, client secret or copied connector credential is packaged.

The main CloudStorage Portal continues to own the separate local broker server named `onedrive`. That broker is responsible for local sync-folder access and the portal's own provider connections; this package does not register another MCP server with the same or a competing identity.

The earlier hosted MCP candidate is preserved under `references/hosted-mcp-0.1.5.json`. It is not an active `mcp.json`, because its legacy `extensions.com.openai.auth` shape is rejected by the current Codex MCP parser and its deployed OAuth metadata has not yet been verified as compatible with the current callback/resource contract.
