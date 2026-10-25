# OneDrive App

Marketplace package for the registered OneDrive App used by CloudStorage Portal.

The active Codex package references the approved OneDrive App with ID `asdk_app_6ade0fe240408191bd087bff2df78e79` through `.app.json`. The App owns its connection flow and exposes the OneDrive tools. No token, refresh grant, client secret or copied connector credential is packaged.

The separate CloudStorage Portal Local package owns the local broker runtime. This package does not register a second MCP server and CloudStorage Portal remains the three-provider aggregation layer.

The earlier hosted MCP candidate is preserved under `references/hosted-mcp-0.1.5.json`. It is not an active `mcp.json`, because its legacy `extensions.com.openai.auth` shape is rejected by the current Codex MCP parser and its deployed OAuth metadata has not yet been verified as compatible with the current callback/resource contract.
