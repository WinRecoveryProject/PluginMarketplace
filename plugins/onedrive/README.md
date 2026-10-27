# OneDrive

Marketplace package for the registered OneDrive connection used by CloudStorage Portal.

The active Codex package references the broker-backed OneDrive App with ID `asdk_app_6ae10ed9d63081a4be88686cc73078e9` through `.app.json`. This replaceable reference is shared with CloudStorage Portal; preserving an older App ID is not a product requirement. The production endpoint is `https://cloudstorage-onedrive-mcp.vercel.app/mcp`, with broker-owned authorize/token/register endpoints, DCR, PKCE S256 and `onedrive.read`. On 27 October 2026 the new connection completed Microsoft login and showed Connected accounts and Primary. The previous direct-Microsoft App is named OneDrive Legacy and is not the active package dependency. No token, refresh grant, client secret or copied connector credential is packaged.

ChatGPT maintains this App record separately from the marketplace package. In the App details UI, `dev mode` is the lifecycle label for the directly registered development App, `DEVELOPMENT` is its review state, `asdk_app_...` is the persistent App ID, and `asdk_app_v_...` identifies the generated App version. These values do not come from this package's `version` field or from the MCP server's implementation version.

The earlier App IDs `asdk_app_6ade0fe240408191bd087bff2df78e79` and `asdk_app_6ade878e235c8191b19c6f72fc31981a` were deleted and are retained only in `PROVENANCE.json` as replacement history. Neither is an active dependency.

The separate CloudStorage Portal Local package owns the local broker runtime. This package does not register a second MCP server and CloudStorage Portal remains the three-provider aggregation layer.

The earlier hosted MCP candidate is preserved under `references/hosted-mcp-0.1.5.json`. It is not an active `mcp.json`, because its legacy `extensions.com.openai.auth` shape is rejected by the current Codex MCP parser and its deployed OAuth metadata has not yet been verified as compatible with the current callback/resource contract.
